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
import { AppStore } from '../data/app.store';
import { C, FONT } from '../ui/tokens';
import {
	VIEW_HEIGHT,
	VIEW_WIDTH,
	buildAdjacency,
	layoutEdges,
	layoutNodes,
	type PositionedNode,
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
					@for (e of edges(); track e.key) {
						<line
							[attr.x1]="e.from.cx"
							[attr.y1]="e.from.cy"
							[attr.x2]="e.to.cx"
							[attr.y2]="e.to.cy"
							[attr.stroke]="edgeStroke(e.from.id, e.to.id, e.from.cluster)"
							[attr.stroke-width]="edgeStrokeWidth(e.from.id, e.to.id)"
							[attr.opacity]="edgeOpacity(e.from, e.to)"
						/>
					}

					@for (n of nodes(); track n.id) {
						<g
							class="node"
							(click)="onNodeClick($event, n.id)"
							(pointerenter)="hover.set(n.id)"
							(pointerleave)="hover.set(null)"
							[style.opacity]="nodeOpacity(n)"
						>
							@if (selectedId() === n.id) {
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
								[attr.r]="haloRadius(n)"
								[attr.fill]="clusterColor(n.cluster)"
								[attr.opacity]="haloOpacity(n)"
							/>
							<circle
								[attr.cx]="n.cx"
								[attr.cy]="n.cy"
								[attr.r]="n.r"
								[attr.fill]="clusterColor(n.cluster)"
								fill-opacity="0.92"
								[attr.stroke]="clusterColor(n.cluster)"
								stroke-width="1.5"
								stroke-opacity="0.5"
							/>
							<circle
								[attr.cx]="n.cx - n.r * 0.32"
								[attr.cy]="n.cy - n.r * 0.32"
								[attr.r]="n.r * 0.28"
								fill="rgba(255,255,255,0.35)"
							/>
							@if (showLabel(n)) {
								<text
									[attr.x]="n.cx"
									[attr.y]="n.cy + n.r + 13"
									text-anchor="middle"
									[attr.font-size]="labelSize(n)"
									[attr.font-family]="FONT"
									[attr.font-weight]="selectedId() === n.id ? 600 : 400"
									[attr.fill]="labelFill(n)"
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

	protected readonly hover = signal<string | null>(null);
	protected readonly dragging = signal<boolean>(false);
	private dragOrigin: { x: number; y: number; ox: number; oy: number } | null = null;
	private pinchOrigin: { distance: number; scale: number } | null = null;
	private readonly activePointers = new Map<number, { x: number; y: number }>();

	// ── derived layout ─────────────────────────────────────────────────

	protected readonly selectedId = this.store.selectedNodeId;
	protected readonly visibleIds = this.store.visibleNodeIds;
	protected readonly clusters = this.store.clusters;

	protected readonly nodes = computed(() =>
		layoutNodes(this.store.nodes(), this.store.clusters()),
	);
	protected readonly edges = computed(() =>
		layoutEdges(this.store.edges(), this.nodes()),
	);
	private readonly adjacency = computed(() => buildAdjacency(this.store.edges()));
	private readonly clusterColorMap = computed<Map<string, string>>(() => {
		const m = new Map<string, string>();
		for (const c of this.store.clusters()) m.set(c.id, c.color);
		return m;
	});

	protected readonly layerTransform = computed(() => {
		const v = this._view();
		// Scale around the canvas centre so zoom feels anchored.
		const tx = (VIEW_WIDTH * (1 - v.scale)) / 2 / v.scale;
		const ty = (VIEW_HEIGHT * (1 - v.scale)) / 2 / v.scale;
		return `translate(${v.x} ${v.y}) scale(${v.scale}) translate(${tx} ${ty})`;
	});

	// ── public zoom api (called by sibling overlays) ───────────────────

	zoom(factor: number): void {
		this._view.update((v) => ({
			...v,
			scale: clamp(v.scale * factor, MIN_SCALE, MAX_SCALE),
		}));
	}

	resetView(): void {
		this._view.set({ scale: 1, x: 0, y: 0 });
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

	// ── node click ─────────────────────────────────────────────────────

	onNodeClick(ev: MouseEvent, id: string): void {
		ev.stopPropagation();
		this.store.selectNode(this.selectedId() === id ? null : id);
	}

	// ── render helpers ─────────────────────────────────────────────────

	protected clusterColor(clusterId: string): string {
		return this.clusterColorMap().get(clusterId) ?? C.fg3;
	}

	private focusId(): string | null {
		return this.hover() ?? this.selectedId();
	}

	private isNeighbour(id: string): boolean {
		const focus = this.focusId();
		if (focus == null) return false;
		if (focus === id) return true;
		const adj = this.adjacency().get(focus);
		return !!adj && adj.has(id);
	}

	private anyFocus(): boolean {
		return this.focusId() != null;
	}

	private isFiltered(n: PositionedNode): boolean {
		const filter = this.store.filterClusters();
		if (filter.size === 0) return false;
		return !filter.has(n.cluster);
	}

	protected nodeOpacity(n: PositionedNode): number {
		if (this.isFiltered(n)) return 0.08;
		if (this.anyFocus() && !this.isNeighbour(n.id)) return 0.28;
		return 1;
	}

	protected haloRadius(n: PositionedNode): number {
		const focused =
			this.selectedId() === n.id || this.hover() === n.id;
		return n.r + (focused ? 12 : 8);
	}

	protected haloOpacity(n: PositionedNode): number {
		const focused =
			this.selectedId() === n.id || this.hover() === n.id;
		return focused ? 0.2 : 0.09;
	}

	protected edgeStroke(fromId: string, toId: string, fromCluster: string): string {
		if (!this.edgeLit(fromId, toId)) return 'rgba(255,255,255,0.13)';
		return this.clusterColor(fromCluster);
	}

	protected edgeStrokeWidth(fromId: string, toId: string): number {
		return this.edgeLit(fromId, toId) ? 1.4 : 1;
	}

	protected edgeOpacity(
		from: PositionedNode,
		to: PositionedNode,
	): number {
		const faded = this.isFiltered(from) || this.isFiltered(to);
		if (faded) return 0.04;
		if (!this.anyFocus()) return 0.5;
		return this.edgeLit(from.id, to.id) ? 0.65 : 0.1;
	}

	private edgeLit(fromId: string, toId: string): boolean {
		const focus = this.focusId();
		if (focus == null) return false;
		return focus === fromId || focus === toId;
	}

	protected showLabel(n: PositionedNode): boolean {
		if (this.isFiltered(n)) return false;
		if (!this.anyFocus()) return true;
		return this.isNeighbour(n.id);
	}

	protected labelSize(n: PositionedNode): number {
		return Math.max(9.5, Math.min(12, n.r * 0.62));
	}

	protected labelFill(n: PositionedNode): string {
		const focused =
			this.selectedId() === n.id || this.hover() === n.id;
		return focused ? C.fg1 : C.fg2;
	}
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}
