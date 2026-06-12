/**
 * Canonical client-side types for Neuranet. These shape the JSON returned by
 * the Express API plus the in-memory state managed by `AppStore`.
 *
 * Notes:
 *   - `sourceType` is a discriminated union even though the backend currently
 *     only fulfils `'reddit'`. Other variants are accepted by the UI but
 *     `AddSourceModal` keeps them disabled until Phase 5.
 *   - `Node.cx` / `Node.cy` are optional. When absent the network view falls
 *     back to a radial layout computed from cluster membership + depth.
 */

// ───────────────────────────── Data Source ─────────────────────────────

export type SourceType = 'reddit' | 'web' | 'pdf' | 'docx' | 'txt';

export type SourceStatus = 'idle' | 'fetching' | 'done' | 'error';

export interface DataSourceConfigReddit {
  readonly threadUrl: string;
}

export interface DataSourceConfigWeb {
  readonly url: string;
}

export interface DataSourceConfigFile {
  readonly filename: string;
  readonly sizeBytes?: number;
}

export type DataSourceConfig =
  | ({ readonly sourceType: 'reddit' } & DataSourceConfigReddit)
  | ({ readonly sourceType: 'web' } & DataSourceConfigWeb)
  | ({ readonly sourceType: 'pdf' | 'docx' | 'txt' } & DataSourceConfigFile);

export interface DataSource {
  readonly id: number;
  readonly source_type: SourceType;
  readonly status: SourceStatus;
  readonly status_message: string | null;
  readonly created_at: string;
  readonly config: Record<string, unknown>;
  /** Optional — provided by backend when source has a default cluster. */
  readonly defaultClusterId?: string;
  /** Optional — document count for this source (provided by backend). */
  readonly documentCount?: number;
  /** Optional — ISO timestamp of most recent successful ingest. */
  readonly lastIngestAt?: string;
}

export interface DataSourceCreateInput {
  readonly sourceType: SourceType;
  readonly config: Record<string, unknown>;
}

export interface FetchSourceResult {
  readonly source: DataSource;
  readonly nodeCount: number;
  readonly edgeCount: number;
}

// ───────────────────────────── Network graph ─────────────────────────────

export interface Cluster {
  readonly id: string;
  readonly label: string;
  readonly color: string;
}

export interface Node {
  readonly id: string;
  readonly label: string;
  readonly desc: string | null;
  readonly cluster: string;
  readonly r: number;
  readonly importance: number;
  readonly depth: number;
  readonly isCentral: boolean;
  readonly degree: number;
  readonly cx?: number;
  readonly cy?: number;
  readonly sentiment?: number;
}

export interface Edge {
  readonly source: string;
  readonly target: string;
  readonly kind: string;
}

export interface NetworkPayload {
  readonly derivedClusters: readonly Cluster[];
  readonly derivedNodes: readonly Node[];
  readonly derivedEdges: readonly Edge[];
}

// ───────────────────────────── Docs ─────────────────────────────

export interface Doc {
  readonly id: number;
  readonly title: string;
  readonly text: string;
  readonly status: string;
  readonly derivedNodeSlugs: readonly string[];
}

// ───────────────────────────── Search & Reports ─────────────────────────────

export interface SearchHit {
  readonly type: 'node' | 'doc';
  readonly id: string;
  readonly label: string;
  readonly snippet: string;
  readonly meta: string;
  readonly score: number;
}

export interface SearchResponse {
  readonly results: readonly SearchHit[];
}

export interface ReportsResponse {
  readonly totals: {
    readonly nodes: number;
    readonly clusters: number;
    readonly edges: number;
    readonly sources: number;
    readonly docs: number;
  };
  readonly clusterDistribution: readonly {
    readonly id: string;
    readonly label: string;
    readonly color: string;
    readonly count: number;
  }[];
}

// ───────────────────────────── UI state ─────────────────────────────

export type DetailView = 'closed' | 'slide' | 'full';

export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  readonly kind: ToastKind;
  readonly message: string;
}

export interface Job {
  readonly id: string;
  readonly sourceType: SourceType;
  readonly label: string;
  readonly status: SourceStatus;
  readonly message?: string;
  readonly createdAt: number;
}
