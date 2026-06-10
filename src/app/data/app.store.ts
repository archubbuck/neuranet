import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import type {
  Cluster,
  DataSource,
  DataSourceCreateInput,
  DetailView,
  Doc,
  Edge,
  Job,
  NetworkPayload,
  Node,
  SourceType,
} from './types';

/**
 * Single source of truth for the TopicNet client. After the workspace
 * concept was removed, the store models one global dataset: every screen
 * reads from these signals and every mutation flows through one of the
 * action methods, which in turn round-trip through `ApiService`.
 *
 * Layout:
 *   - private `_*` signals hold raw state and are mutated only inside this
 *     class
 *   - `public readonly` computed signals expose derived views
 *   - action methods (`addSource`, `renameCluster`, …) update local state
 *     after the API call succeeds, so the UI never lies if the server
 *     rejects a write
 *
 * Persistence: a tiny slice of UI state (`collapsed`) is mirrored
 * to `localStorage['topicnet_v2']` via an `effect` so the shell remembers
 * its layout across reloads. Data signals are intentionally **not**
 * persisted — they are re-fetched on every app load via `loadAll()`.
 */
@Injectable({ providedIn: 'root' })
export class AppStore {
  private readonly api = inject(ApiService);

  // ── core data ──────────────────────────────────────────────────────

  private readonly _sources = signal<readonly DataSource[]>([]);
  private readonly _network = signal<NetworkPayload>({
    derivedClusters: [],
    derivedNodes: [],
    derivedEdges: [],
  });
  private readonly _docs = signal<readonly Doc[]>([]);

  readonly sources = this._sources.asReadonly();
  readonly clusters = computed<readonly Cluster[]>(() => this._network().derivedClusters);
  readonly nodes = computed<readonly Node[]>(() => this._network().derivedNodes);
  readonly edges = computed<readonly Edge[]>(() => this._network().derivedEdges);
  readonly docs = this._docs.asReadonly();

  // ── loading + ingest indicators ────────────────────────────────────

  private readonly _loading = signal(false);
  private readonly _ingesting = signal(false);
  private readonly _sessionJobs = signal<readonly Job[]>([]);

  readonly loading = this._loading.asReadonly();
  readonly ingesting = this._ingesting.asReadonly();
  readonly sessionJobs = this._sessionJobs.asReadonly();

  // ── selection + filters ────────────────────────────────────────────

  private readonly _selectedNodeId = signal<string | null>(null);
  private readonly _detailView = signal<DetailView>('closed');
  private readonly _filterClusters = signal<ReadonlySet<string>>(new Set());

  readonly selectedNodeId = this._selectedNodeId.asReadonly();
  readonly detailView = this._detailView.asReadonly();
  readonly filterClusters = this._filterClusters.asReadonly();

  readonly selectedNode = computed<Node | null>(() => {
    const id = this._selectedNodeId();
    if (id == null) return null;
    return this.nodes().find((n) => n.id === id) ?? null;
  });

  readonly visibleNodeIds = computed<ReadonlySet<string>>(() => {
    const filter = this._filterClusters();
    const ids = new Set<string>();
    for (const n of this.nodes()) {
      if (filter.size === 0 || filter.has(n.cluster)) {
        ids.add(n.id);
      }
    }
    return ids;
  });

  readonly hasData = computed(() => this.nodes().length > 0);

  /** Per-node document count (how many docs link to each node). */
  readonly nodeDocCount = computed(() => {
    const m = new Map<string, number>();
    for (const doc of this.docs()) {
      for (const slug of doc.derivedNodeSlugs) {
        m.set(slug, (m.get(slug) ?? 0) + 1);
      }
    }
    return m;
  });

  /** Per-node link count (= degree in the graph). */
  readonly nodeLinkCount = computed(() => {
    const m = new Map<string, number>();
    for (const e of this.edges()) {
      m.set(e.source, (m.get(e.source) ?? 0) + 1);
      m.set(e.target, (m.get(e.target) ?? 0) + 1);
    }
    return m;
  });

  /** Per-cluster analytics: node count, doc count, avg sentiment. */
  readonly clusterStats = computed(() => {
    const nodes = this.nodes();
    const docs = this.docs();
    const stats = new Map<
      string,
      { count: number; docs: number; sentSum: number; sentCount: number }
    >();
    for (const c of this.clusters()) {
      stats.set(c.id, { count: 0, docs: 0, sentSum: 0, sentCount: 0 });
    }
    for (const n of nodes) {
      const s = stats.get(n.cluster);
      if (s) {
        s.count++;
        if (n.sentiment != null) {
          s.sentSum += n.sentiment;
          s.sentCount++;
        }
      }
    }
    for (const doc of docs) {
      for (const slug of doc.derivedNodeSlugs) {
        const n = nodes.find((x) => x.id === slug);
        if (n && stats.has(n.cluster)) {
          stats.get(n.cluster)!.docs++;
        }
      }
    }
    return stats;
  });

  /** Total document count across all nodes. */
  readonly totalDocs = computed(() => {
    let d = 0;
    for (const [, s] of this.clusterStats()) d += s.docs;
    return d;
  });

  /** Average sentiment across all nodes that have a sentiment value. */
  readonly avgSentiment = computed(() => {
    let sum = 0;
    let count = 0;
    for (const n of this.nodes()) {
      if (n.sentiment != null) {
        sum += n.sentiment;
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  });

  // ── shell UI state (persisted) ─────────────────────────────────────

  private readonly _collapsed = signal(false);

  readonly collapsed = this._collapsed.asReadonly();

  // Keep a small UI slice in localStorage so reloads feel sticky.
  private static readonly STORAGE_KEY = 'topicnet_v2';

  constructor() {
    this.hydrate();
    // Persist a small slice of UI state. Wrapping the read in `effect`
    // re-runs whenever any tracked signal changes.
    effect(() => {
      const payload = {
        collapsed: this._collapsed(),
      };
      try {
        localStorage.setItem(AppStore.STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // ignore quota/storage-disabled errors — persistence is best-effort
      }
    });
  }

  private hydrate(): void {
    try {
      const raw = localStorage.getItem(AppStore.STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { collapsed?: boolean };
      if (typeof parsed.collapsed === 'boolean') this._collapsed.set(parsed.collapsed);
    } catch {
      // corrupted payload — start fresh
    }
  }

  // ── lifecycle / data loading ───────────────────────────────────────

  /**
   * Fetch sources, network, and docs in parallel. Idempotent: safe to
   * call from app bootstrap and after destructive operations.
   */
  async loadAll(): Promise<void> {
    this._loading.set(true);
    try {
      const [sources, network, docs] = await Promise.all([
        this.api.listSources(),
        this.api.getNetwork(),
        this.api.listDocs(),
      ]);
      this._sources.set(sources);
      this._network.set(network);
      this._docs.set(docs);
    } finally {
      this._loading.set(false);
    }
  }

  // ── source ingestion ───────────────────────────────────────────────

  async addSource(input: DataSourceCreateInput): Promise<DataSource> {
    const created = await this.api.createSource(input);
    this._sources.update((list) => [created, ...list]);
    this.pushJob({
      id: `src-${created.id}`,
      sourceType: created.source_type,
      label: this.describeSource(created),
      status: 'idle',
      createdAt: Date.now(),
    });
    return created;
  }

  async fetchSource(sourceId: number): Promise<void> {
    this._ingesting.set(true);
    this.updateJob(sourceId, { status: 'fetching' });
    try {
      const { source } = await this.api.fetchSource(sourceId);
      // Sync the source row + refresh the rest of the dataset.
      this._sources.update((list) => list.map((s) => (s.id === sourceId ? source : s)));
      this.updateJob(sourceId, {
        status: source.status,
        message: source.status_message ?? undefined,
      });
      const [network, docs] = await Promise.all([this.api.getNetwork(), this.api.listDocs()]);
      this._network.set(network);
      this._docs.set(docs);
    } catch (err) {
      this.updateJob(sourceId, { status: 'error', message: (err as Error).message });
      throw err;
    } finally {
      this._ingesting.set(false);
    }
  }

  async deleteSource(sourceId: number): Promise<void> {
    await this.api.deleteSource(sourceId);
    this._sources.update((list) => list.filter((s) => s.id !== sourceId));
    this._sessionJobs.update((jobs) => jobs.filter((j) => j.id !== `src-${sourceId}`));
  }

  // ── cluster + node CRUD ────────────────────────────────────────────

  async createCluster(label: string, color?: string): Promise<void> {
    const created = await this.api.createCluster({ label, color });
    this._network.update((net) => ({
      ...net,
      derivedClusters: [
        ...net.derivedClusters,
        { id: created.id, label: created.label, color: created.color },
      ],
    }));
  }

  /**
   * Reassign all nodes from `fromSlug` to `toSlug`, then delete the
   * source cluster. Atomic on the server (`POST /api/clusters/dissolve`);
   * we re-fetch afterwards so the UI shows server truth.
   */
  async dissolveCluster(fromSlug: string, toSlug: string): Promise<void> {
    try {
      await this.api.dissolveClusters({ sourceSlugs: [fromSlug], targetSlug: toSlug });
      await this.loadAll();
    } catch {
      await this.loadAll();
      throw new Error(`Failed to dissolve cluster. The data has been refreshed.`);
    }
  }

  async renameCluster(slug: string, label: string): Promise<void> {
    const updated = await this.api.updateCluster(slug, { label });
    this._network.update((net) => ({
      ...net,
      derivedClusters: net.derivedClusters.map((c) =>
        c.id === slug ? { ...c, label: updated.label, color: updated.color } : c,
      ),
    }));
  }

  async recolorCluster(slug: string, color: string): Promise<void> {
    const updated = await this.api.updateCluster(slug, { color });
    this._network.update((net) => ({
      ...net,
      derivedClusters: net.derivedClusters.map((c) =>
        c.id === slug ? { ...c, color: updated.color } : c,
      ),
    }));
  }

  /**
   * Merge multiple categories into one target. Atomic on the server:
   * all nodes are reassigned and the empty source clusters deleted in
   * a single transaction.
   */
  async mergeCategories(sourceSlugs: string[], targetSlug: string): Promise<void> {
    try {
      await this.api.dissolveClusters({ sourceSlugs, targetSlug });
      await this.loadAll();
    } catch {
      await this.loadAll();
      throw new Error('Failed to merge categories. The data has been refreshed.');
    }
  }

  /**
   * Split a category: create a new cluster and move selected nodes into it.
   */
  async splitCategory(
    sourceSlug: string,
    nodeSlugs: string[],
    newLabel: string,
    newColor: string,
  ): Promise<void> {
    try {
      const created = await this.api.createCluster({ label: newLabel, color: newColor });
      await this.api.bulkReassignNodes({ nodeSlugs, clusterSlug: created.id });
      await this.loadAll();
    } catch {
      await this.loadAll();
      throw new Error('Failed to split category. The data has been refreshed.');
    }
  }

  async deleteCluster(slug: string): Promise<void> {
    await this.api.deleteCluster(slug);
    this._network.update((net) => ({
      ...net,
      derivedClusters: net.derivedClusters.filter((c) => c.id !== slug),
      derivedNodes: net.derivedNodes.filter((n) => n.cluster !== slug),
      derivedEdges: net.derivedEdges.filter((e) => {
        const remainingNodeIds = new Set(
          net.derivedNodes.filter((n) => n.cluster !== slug).map((n) => n.id),
        );
        return remainingNodeIds.has(e.source) && remainingNodeIds.has(e.target);
      }),
    }));
    if (
      this._selectedNodeId() != null &&
      !this.nodes().some((n) => n.id === this._selectedNodeId())
    ) {
      this.selectNode(null);
    }
  }

  async renameNode(slug: string, label: string): Promise<void> {
    const updated = await this.api.updateNode(slug, { label });
    this._network.update((net) => ({
      ...net,
      derivedNodes: net.derivedNodes.map((n) =>
        n.id === slug
          ? { ...n, label: updated.label, desc: updated.desc, cluster: updated.cluster }
          : n,
      ),
    }));
  }

  async reassignNode(slug: string, label: string, clusterSlug: string): Promise<void> {
    const updated = await this.api.updateNode(slug, { label, clusterSlug });
    this._network.update((net) => ({
      ...net,
      derivedNodes: net.derivedNodes.map((n) =>
        n.id === slug
          ? { ...n, label: updated.label, desc: updated.desc, cluster: updated.cluster }
          : n,
      ),
    }));
  }

  async deleteNode(slug: string): Promise<void> {
    await this.api.deleteNode(slug);
    this._network.update((net) => ({
      ...net,
      derivedNodes: net.derivedNodes.filter((n) => n.id !== slug),
      derivedEdges: net.derivedEdges.filter((e) => e.source !== slug && e.target !== slug),
    }));
    if (this._selectedNodeId() === slug) {
      this.selectNode(null);
    }
  }

  async createNode(label: string, clusterSlug: string, desc?: string): Promise<void> {
    await this.api.createNode({ label, clusterSlug, desc });
    // Refresh so degree, doc-links etc. are consistent.
    await this.loadAll();
  }

  async mergeNodes(targetSlug: string, sourceSlugs: string[]): Promise<void> {
    await this.api.mergeNodes({ targetSlug, sourceSlugs });
    await this.loadAll();
  }

  async bulkReassignNodes(nodeSlugs: string[], clusterSlug: string): Promise<void> {
    await this.api.bulkReassignNodes({ nodeSlugs, clusterSlug });
    await this.loadAll();
  }

  async bulkDeleteNodes(slugs: string[]): Promise<void> {
    await this.api.bulkDeleteNodes({ nodeSlugs: slugs });
    this._network.update((net) => ({
      ...net,
      derivedNodes: net.derivedNodes.filter((n) => !slugs.includes(n.id)),
      derivedEdges: net.derivedEdges.filter(
        (e) => !slugs.includes(e.source) && !slugs.includes(e.target),
      ),
    }));
    if (this._selectedNodeId() && slugs.includes(this._selectedNodeId()!)) {
      this.selectNode(null);
    }
  }

  // ── selection / UI ─────────────────────────────────────────────────

  selectNode(id: string | null): void {
    this._selectedNodeId.set(id);
    this._detailView.set(id == null ? 'closed' : 'slide');
  }

  setDetailView(view: DetailView): void {
    this._detailView.set(view);
  }

  toggleCollapsed(): void {
    this._collapsed.update((v) => !v);
  }

  toggleClusterFilter(id: string): void {
    this._filterClusters.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  clearClusterFilter(): void {
    this._filterClusters.set(new Set());
  }

  // ── session-job tracker (transient, in-memory only) ────────────────

  private pushJob(job: Job): void {
    this._sessionJobs.update((jobs) => [job, ...jobs.filter((j) => j.id !== job.id)]);
  }

  private updateJob(sourceId: number, patch: Partial<Job>): void {
    const id = `src-${sourceId}`;
    this._sessionJobs.update((jobs) => jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }

  private describeSource(source: DataSource): string {
    const cfg = source.config as Record<string, unknown>;
    return (
      (cfg['threadUrl'] as string | undefined) ??
      (cfg['url'] as string | undefined) ??
      (cfg['filename'] as string | undefined) ??
      `Source ${source.id}`
    );
  }

  /** Reset every in-memory data signal. Used by destructive flows. */
  resetData(): void {
    this._sources.set([]);
    this._network.set({ derivedClusters: [], derivedNodes: [], derivedEdges: [] });
    this._docs.set([]);
    this._selectedNodeId.set(null);
    this._detailView.set('closed');
    this._filterClusters.set(new Set());
    this._sessionJobs.set([]);
  }

  // `SourceType` re-export so call-sites that import only `AppStore`
  // don't need to also import from `data/types`.
  declare readonly SourceType: SourceType;
}
