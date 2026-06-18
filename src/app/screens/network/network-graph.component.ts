import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { AppStore } from '../../data/app.store';
import { C, FONT } from '../../ui/tokens';
import {
  VIEW_HEIGHT,
  VIEW_WIDTH,
  buildAdjacency,
  layoutEdges,
  layoutNodes,
} from './network-layout';

interface ViewTransform {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.4;
const ZOOM_IN_FACTOR = 1.08;
const ZOOM_OUT_FACTOR = 0.926;

/**
 * Pan-/zoom-able SVG network graph. Reads from `AppStore` signals
 * and the API-computed layout helpers in `network-layout.ts`.
 *
 * Interactions:
 *   • mouse wheel — zoom (clamped to [0.5, 2.4])
 *   • drag — pan
 *   • single-finger touch — pan
 *   • two-finger pinch — zoom
 *   • click node — select (toggles `AppStore.selectNode`)
 *   • hover node — local highlight ring + neighbourhood emphasis
 *
 * Zoom controls and stats overlays are sibling components on the parent
 * `NetworkScreenComponent`; they call `zoom()` / `resetView()` directly via
 * a public API to avoid global window hooks.
 */
@Component({
  selector: 'app-network-graph',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="canvas"
      (wheel)="onWheel($event)"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="onPointerUp($event)"
      (pointerleave)="onPointerUp($event)"
      [style.cursor]="dragging() ? 'grabbing' : 'grab'"
    >
      <svg
        #svg
        width="100%"
        height="100%"
        [attr.viewBox]="'0 0 ' + VIEW_WIDTH + ' ' + VIEW_HEIGHT"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="tn-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.7" fill="rgba(255,255,255,0.045)" />
          </pattern>
          <radialGradient id="tn-vignette" cx="50%" cy="46%" r="65%">
            <stop offset="60%" stop-color="transparent" />
            <stop offset="100%" stop-color="rgba(6,9,15,0.55)" />
          </radialGradient>
        </defs>

        <rect x="-2000" y="-2000" width="6000" height="6000" fill="url(#tn-grid)" />

        <g [attr.transform]="layerTransform()">
          @for (e of edgeVms(); track e.key) {
            <line
              [attr.x1]="e.x1"
              [attr.y1]="e.y1"
              [attr.x2]="e.x2"
              [attr.y2]="e.y2"
              [attr.stroke]="e.stroke"
              [attr.stroke-width]="e.width"
              [attr.opacity]="e.opacity"
            />
          }

          @for (n of nodeVms(); track n.id) {
            <g
              class="node"
              role="button"
              tabindex="0"
              [attr.aria-label]="'Topic: ' + n.label"
              [attr.aria-pressed]="n.selected"
              (click)="onNodeClick($event, n.id)"
              (keydown.enter)="onNodeKeySelect($event, n.id)"
              (keydown.space)="onNodeKeySelect($event, n.id)"
              (pointerenter)="hover.set(n.id)"
              (pointerleave)="hover.set(null)"
              (focus)="hover.set(n.id)"
              (blur)="hover.set(null)"
              [style.opacity]="n.opacity"
            >
              @if (n.selected) {
                <circle
                  [attr.cx]="n.cx"
                  [attr.cy]="n.cy"
                  [attr.r]="n.r + 11"
                  fill="none"
                  [attr.stroke]="amber"
                  stroke-width="1.5"
                  stroke-dasharray="5 4"
                  opacity="0.85"
                />
              }
              <circle
                [attr.cx]="n.cx"
                [attr.cy]="n.cy"
                [attr.r]="n.haloRadius"
                [attr.fill]="n.color"
                [attr.opacity]="n.haloOpacity"
              />
              <circle
                [attr.cx]="n.cx"
                [attr.cy]="n.cy"
                [attr.r]="n.r"
                [attr.fill]="n.color"
                fill-opacity="0.92"
                [attr.stroke]="n.color"
                stroke-width="1.5"
                stroke-opacity="0.5"
              />
              <circle
                [attr.cx]="n.cx - n.r * 0.32"
                [attr.cy]="n.cy - n.r * 0.32"
                [attr.r]="n.r * 0.28"
                fill="rgba(255,255,255,0.35)"
              />
              @if (n.showLabel) {
                <text
                  [attr.x]="n.cx"
                  [attr.y]="n.cy + n.r + 13"
                  text-anchor="middle"
                  [attr.font-size]="n.labelSize"
                  [attr.font-family]="FONT"
                  [attr.font-weight]="n.selected ? 600 : 400"
                  [attr.fill]="n.labelFill"
                >
                  {{ n.label }}
                </text>
              }
            </g>
          }
        </g>

        <rect
          x="0"
          y="0"
          [attr.width]="VIEW_WIDTH"
          [attr.height]="VIEW_HEIGHT"
          fill="url(#tn-vignette)"
          pointer-events="none"
        />
      </svg>
    </div>
  `,
  styles: [
    `
      :host {
        position: absolute;
        inset: 0;
        display: block;
      }
      .canvas {
        position: absolute;
        inset: 0;
        overflow: hidden;
        touch-action: none;
        background: #060912;
      }
      svg {
        display: block;
      }
      g.node {
        cursor: pointer;
        transition: opacity 200ms ease-out;
        outline: none;
      }
      text {
        pointer-events: none;
        user-select: none;
      }
    `,
  ],
})
export class NetworkGraphComponent {
  protected readonly VIEW_WIDTH = VIEW_WIDTH;
  protected readonly VIEW_HEIGHT = VIEW_HEIGHT;
  protected readonly FONT = FONT;
  protected readonly amber = C.amber;

  private readonly store = inject(AppStore);
  private readonly svgRef = viewChild<ElementRef<SVGSVGElement>>('svg');

  // ── view / interaction state ───────────────────────────────────────

  private readonly _view = signal<ViewTransform>({ scale: 1, x: 0, y: 0 });
  readonly view = this._view.asReadonly();

  /** User-adjustable node spacing (0–100).  Maps to minGap 2–42. */
  private readonly _spacing = signal<number>(50);
  readonly spacing = this._spacing.asReadonly();

  protected readonly hover = signal<string | null>(null);
  protected readonly dragging = signal<boolean>(false);
  private dragOrigin: { x: number; y: number; ox: number; oy: number } | null = null;
  private pinchOrigin: { distance: number; scale: number } | null = null;
  private readonly activePointers = new Map<number, { x: number; y: number }>();

  // ── derived layout ─────────────────────────────────────────────────

  protected readonly selectedId = this.store.selectedNodeId;
  protected readonly visibleIds = this.store.visibleNodeIds;
  protected readonly clusters = this.store.clusters;

  protected readonly nodes = computed(() => {
    // Map spacing (0–100) → minGap (2–42)
    const gap = 2 + (this._spacing() / 100) * 40;
    return layoutNodes(this.store.nodes(), this.store.clusters(), gap);
  });
  protected readonly edges = computed(() => layoutEdges(this.store.edges(), this.nodes()));
  private readonly adjacency = computed(() => buildAdjacency(this.store.edges()));
  private readonly clusterColorMap = computed<Map<string, string>>(() => {
    const m = new Map<string, string>();
    for (const c of this.store.clusters()) m.set(c.id, c.color);
    return m;
  });

  // ── precomputed view-models ──────────────────────────────────
  // All per-element presentation values are computed once per state
  // change instead of via method calls in the template (which would run
  // for every SVG element on every change-detection cycle).

  protected readonly nodeVms = computed(() => {
    const selected = this.selectedId();
    const hover = this.hover();
    const focus = hover ?? selected;
    const adj = focus != null ? this.adjacency().get(focus) : undefined;
    const filter = this.store.filterClusters();
    const colors = this.clusterColorMap();

    const isNeighbour = (id: string) => focus != null && (focus === id || !!adj?.has(id));

    return this.nodes().map((n) => {
      const filtered = filter.size > 0 && !filter.has(n.cluster);
      const focused = selected === n.id || hover === n.id;
      const showLabel = !filtered && (focus == null || isNeighbour(n.id));
      return {
        ...n,
        selected: selected === n.id,
        color: colors.get(n.cluster) ?? C.fg3,
        opacity: filtered ? 0.08 : focus != null && !isNeighbour(n.id) ? 0.28 : 1,
        haloRadius: n.r + (focused ? 12 : 8),
        haloOpacity: focused ? 0.2 : 0.09,
        showLabel,
        labelSize: Math.max(9.5, Math.min(12, n.r * 0.62)),
        labelFill: focused ? C.fg1 : C.fg2,
      };
    });
  });

  protected readonly edgeVms = computed(() => {
    const focus = this.hover() ?? this.selectedId();
    const filter = this.store.filterClusters();
    const colors = this.clusterColorMap();

    return this.edges().map((e) => {
      const lit = focus != null && (focus === e.from.id || focus === e.to.id);
      const faded = filter.size > 0 && (!filter.has(e.from.cluster) || !filter.has(e.to.cluster));
      return {
        key: e.key,
        x1: e.from.cx,
        y1: e.from.cy,
        x2: e.to.cx,
        y2: e.to.cy,
        stroke: lit ? (colors.get(e.from.cluster) ?? C.fg3) : 'rgba(255,255,255,0.13)',
        width: lit ? 1.4 : 1,
        opacity: faded ? 0.04 : focus == null ? 0.5 : lit ? 0.65 : 0.1,
      };
    });
  });

  protected readonly layerTransform = computed(() => {
    const v = this._view();
    // Scale around the canvas centre so zoom feels anchored.
    const tx = (VIEW_WIDTH * (1 - v.scale)) / 2 / v.scale;
    const ty = (VIEW_HEIGHT * (1 - v.scale)) / 2 / v.scale;
    return `translate(${v.x} ${v.y}) scale(${v.scale}) translate(${tx} ${ty})`;
  });

  // ── public zoom / spacing api (called by sibling overlays) ─────────

  zoom(factor: number): void {
    this._view.update((v) => ({
      ...v,
      scale: clamp(v.scale * factor, MIN_SCALE, MAX_SCALE),
    }));
  }

  /** Adjust node spacing by `delta` (clamped to 0–100). */
  adjustSpacing(delta: number): void {
    this._spacing.update((s) => clamp(s + delta, 0, 100));
  }

  resetView(): void {
    this._view.set({ scale: 1, x: 0, y: 0 });
    this._spacing.set(50);
    this.store.selectNode(null);
  }

  // ── pointer / wheel handlers ───────────────────────────────────────

  onWheel(ev: WheelEvent): void {
    ev.preventDefault();
    this.zoom(ev.deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR);
  }

  onPointerDown(ev: PointerEvent): void {
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
    this.activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

    if (this.activePointers.size === 1) {
      this.dragging.set(true);
      const v = this._view();
      this.dragOrigin = { x: ev.clientX, y: ev.clientY, ox: v.x, oy: v.y };
    } else if (this.activePointers.size === 2) {
      this.dragging.set(false);
      this.dragOrigin = null;
      const [a, b] = [...this.activePointers.values()];
      this.pinchOrigin = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        scale: this._view().scale,
      };
    }
  }

  onPointerMove(ev: PointerEvent): void {
    if (!this.activePointers.has(ev.pointerId)) return;
    this.activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

    if (this.activePointers.size === 2 && this.pinchOrigin) {
      const [a, b] = [...this.activePointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const factor = d / Math.max(1, this.pinchOrigin.distance);
      this._view.update((v) => ({
        ...v,
        scale: clamp(this.pinchOrigin!.scale * factor, MIN_SCALE, MAX_SCALE),
      }));
      return;
    }

    if (this.dragging() && this.dragOrigin) {
      this._view.update((v) => ({
        ...v,
        x: this.dragOrigin!.ox + (ev.clientX - this.dragOrigin!.x),
        y: this.dragOrigin!.oy + (ev.clientY - this.dragOrigin!.y),
      }));
    }
  }

  onPointerUp(ev: PointerEvent): void {
    this.activePointers.delete(ev.pointerId);
    if (this.activePointers.size === 0) {
      this.dragging.set(false);
      this.dragOrigin = null;
      this.pinchOrigin = null;
    } else if (this.activePointers.size < 2) {
      this.pinchOrigin = null;
    }
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.selectedId() != null) {
      this.store.selectNode(null);
    }
  }

  // ── node click / keyboard ───────────────────────────────────

  onNodeClick(ev: MouseEvent, id: string): void {
    ev.stopPropagation();
    this.store.selectNode(this.selectedId() === id ? null : id);
  }

  onNodeKeySelect(ev: Event, id: string): void {
    ev.preventDefault();
    this.store.selectNode(this.selectedId() === id ? null : id);
  }

  // ── render helpers ─────────────────────────────────────────────────

  protected clusterColor(clusterId: string): string {
    return this.clusterColorMap().get(clusterId) ?? C.fg3;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
