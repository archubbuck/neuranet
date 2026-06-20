import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  NgZone,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import Graph from 'graphology';
import Sigma from 'sigma';
import { AppStore } from '../../data/app.store';
import { C } from '../../ui/tokens';

const MIN_CAMERA_RATIO = 0.15;
const MAX_CAMERA_RATIO = 4.0;
const ZOOM_IN_FACTOR = 1.15;
const ZOOM_OUT_FACTOR = 0.87;

/** LOD thresholds — sigma renders labels when node size on screen >= this. */
const LABEL_RENDERED_SIZE_THRESHOLD = 6;

/**
 * WebGL network graph — sigma.js v3 + graphology.
 *
 * Replaces the previous SVG radial-layout renderer with a WebGL-accelerated
 * force-directed graph. Initialized entirely inside `ngZone.runOutsideAngular()`
 * so the rendering loop never triggers Angular change detection.
 *
 * Interactions:
 *   • scroll — zoom (clamped)
 *   • drag — pan
 *   • click node — select (re-enters Angular zone via ngZone.run)
 *   • Escape — deselect
 */
@Component({
  selector: 'app-network-graph',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #container class="absolute inset-0 overflow-hidden" [style.background]="'#060912'"></div>
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      display: block;
    }
  `,
})
export class NetworkGraphComponent {
  private readonly store = inject(AppStore);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly containerEl = viewChild<ElementRef<HTMLDivElement>>('container');

  private graph: Graph | null = null;
  private sigma: Sigma | null = null;
  private renderFrameId = 0;
  private layoutWorker: Worker | null = null;

  // ── public API (called by sibling overlays) ─────────────────────────

  zoom(factor: number): void {
    this.sigma?.getCamera().animatedZoom(factor);
  }

  zoomIn(): void {
    this.zoom(ZOOM_IN_FACTOR);
  }

  zoomOut(): void {
    this.zoom(ZOOM_OUT_FACTOR);
  }

  resetView(): void {
    this.sigma?.getCamera().animatedReset({ duration: 300 });
    this.store.selectNode(null);
  }

  // ── lifecycle ───────────────────────────────────────────────────────

  constructor() {
    afterNextRender(() => {
      const ref = this.containerEl();
      if (ref?.nativeElement) {
        this.zone.runOutsideAngular(() => this.initSigma(ref.nativeElement));
      }
    });

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(this.renderFrameId);
      this.layoutWorker?.terminate();
      this.layoutWorker = null;
      this.sigma?.kill();
      this.graph = null;
      this.sigma = null;
    });
  }

  // ── sigma initialization ────────────────────────────────────────────

  private initSigma(container: HTMLDivElement): void {
    const graph = new Graph({ multi: false, type: 'undirected' });
    this.graph = graph;

    const sigma = new Sigma(graph, container, {
      labelRenderedSizeThreshold: LABEL_RENDERED_SIZE_THRESHOLD,
      stagePadding: 40,
      defaultNodeColor: C.fg3,
      defaultEdgeColor: 'rgba(255,255,255,0.13)',
      defaultEdgeType: 'line',
      labelFont: 'Inter, system-ui, sans-serif',
      labelColor: { color: C.fg2 },
      labelSize: 12,
      minCameraRatio: MIN_CAMERA_RATIO,
      maxCameraRatio: MAX_CAMERA_RATIO,
      hideEdgesOnMove: true,
      hideLabelsOnMove: true,
      autoCenter: true,
    });
    this.sigma = sigma;

    // ── Event: node click → Angular zone ──────────────────────
    sigma.on('clickNode', ({ node }) => {
      this.zone.run(() => {
        const current = this.store.selectedNodeId();
        this.store.selectNode(current === node ? null : node);
      });
    });

    sigma.on('doubleClickNode', ({ node }) => {
      this.zone.run(() => {
        this.store.selectNode(node);
        this.store.setDetailView('slide');
      });
    });

    sigma.on('clickStage', () => {
      this.zone.run(() => this.store.selectNode(null));
    });

    // ── Populate the graph from store signals ─────────────────
    // We use an effect-like pattern: re-sync graph when store data changes.
    this.syncGraphToStore();

    // ── Render loop: sync visual state from store → sigma ─────
    const render = () => {
      this.syncVisualState();
      this.renderFrameId = requestAnimationFrame(render);
    };
    this.renderFrameId = requestAnimationFrame(render);
  }

  // ── graph ↔ store sync ──────────────────────────────────────────────

  /** Full rebuild of graphology graph from store nodes + edges. */
  private syncGraphToStore(): void {
    const graph = this.graph;
    if (!graph) return;

    // Clear and rebuild
    graph.clear();

    const clusters = this.store.clusters();
    const nodes = this.store.nodes();
    const edges = this.store.edges();

    const clusterColor = new Map(clusters.map((c) => [c.id, c.color]));

    for (const n of nodes) {
      graph.addNode(n.id, {
        label: n.label,
        size: Math.max(3, n.r * 0.8),
        color: clusterColor.get(n.cluster) ?? C.fg3,
        x: n.cx ?? Math.random() * 400 - 200,
        y: n.cy ?? Math.random() * 400 - 200,
        cluster: n.cluster,
        isCentral: n.isCentral,
      });
    }

    for (const e of edges) {
      if (graph.hasNode(e.source) && graph.hasNode(e.target)) {
        graph.addEdge(e.source, e.target, {
          size: 0.5,
          color: 'rgba(255,255,255,0.13)',
          kind: e.kind,
        });
      }
    }

    // Start force-directed layout in web worker
    this.startLayout();
  }

  /** Offloads ForceAtlas2 layout to a Web Worker. */
  private startLayout(): void {
    const graph = this.graph;
    if (!graph) return;

    // Stop previous worker if any
    this.layoutWorker?.terminate();

    try {
      this.layoutWorker = new Worker(new URL('./layout.worker.ts', import.meta.url));
    } catch {
      // Worker creation failed (e.g., SSR or test environment) — skip layout
      return;
    }

    // Serialize graph for the worker
    const serialized = {
      nodes: graph.mapNodes((node, attrs) => ({
        key: node,
        x: (attrs['x'] as number) ?? Math.random() * 400 - 200,
        y: (attrs['y'] as number) ?? Math.random() * 400 - 200,
        size: (attrs['size'] as number) ?? 5,
      })),
      edges: graph.mapEdges((_edge, _attrs, source, target) => ({
        source,
        target,
        weight: 1,
      })),
    };

    this.layoutWorker.onmessage = (ev: MessageEvent) => {
      const msg = ev.data;
      if ((msg.type === 'tick' || msg.type === 'done') && msg.positions && this.graph) {
        for (const p of msg.positions) {
          if (this.graph.hasNode(p.key)) {
            this.graph.setNodeAttribute(p.key, 'x', p.x);
            this.graph.setNodeAttribute(p.key, 'y', p.y);
          }
        }
        this.sigma?.refresh();
      }
    };

    this.layoutWorker.postMessage({
      type: 'start',
      graph: serialized,
      settings: { gravity: 1, scalingRatio: 10, slowDown: 5, maxIterations: 200, tickEvery: 20 },
    });
  }

  /** Per-frame visual update based on store selection/filter state. */
  private syncVisualState(): void {
    const graph = this.graph;
    const sigma = this.sigma;
    if (!graph || !sigma) return;

    const selectedId = this.store.selectedNodeId();
    const filterClusters = this.store.filterClusters();
    const hasFilter = filterClusters.size > 0;

    // Batch attribute updates
    graph.forEachNode((node, attrs) => {
      const filtered = hasFilter && !filterClusters.has(attrs['cluster'] as string);
      const isSelected = node === selectedId;

      graph.setNodeAttribute(node, 'hidden', filtered);
      graph.setNodeAttribute(
        node,
        'size',
        isSelected ? (attrs['size'] as number) * 1.8 : (attrs['size'] as number),
      );
      graph.setNodeAttribute(node, 'color', isSelected ? C.amber : (attrs['color'] as string));
      graph.setNodeAttribute(
        node,
        'label',
        isSelected || !hasFilter ? (attrs['label'] as string) : '',
      );
    });

    graph.forEachEdge((edge, _attrs, source, target) => {
      const sHidden = graph.getNodeAttribute(source, 'hidden');
      const tHidden = graph.getNodeAttribute(target, 'hidden');
      const visible = !sHidden && !tHidden;
      graph.setEdgeAttribute(edge, 'hidden', !visible);

      if (visible && selectedId) {
        const lit = source === selectedId || target === selectedId;
        graph.setEdgeAttribute(
          edge,
          'color',
          lit ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.06)',
        );
        graph.setEdgeAttribute(edge, 'size', lit ? 1.2 : 0.3);
      }
    });

    // Refresh rendering
    sigma.refresh();
  }

  // ── keyboard ────────────────────────────────────────────────────────

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.store.selectedNodeId() != null) {
      this.store.selectNode(null);
    }
  }
}
