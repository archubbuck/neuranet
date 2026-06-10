import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
	DataSource,
	DataSourceCreateInput,
	Doc,
	FetchSourceResult,
	NetworkPayload,
} from './types';

const API = '/api';

/**
 * Typed HTTP client for the TopicNet Express + SQLite backend. One method per
 * endpoint, returning the canonical client types from `data/types.ts`.
 *
 * Returns Promises (via `firstValueFrom`) so callers can `await` in `effect`s
 * and resolvers without bringing RxJS into every component. The underlying
 * `HttpClient` is still observable-based, so cancellation can be added later
 * by switching individual methods back to `Observable<T>` if needed.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
	private readonly http = inject(HttpClient);

	// ── data sources ───────────────────────────────────────────────────

	async listSources(): Promise<DataSource[]> {
		return firstValueFrom(this.http.get<DataSource[]>(`${API}/sources`));
	}

	async createSource(input: DataSourceCreateInput): Promise<DataSource> {
		return firstValueFrom(this.http.post<DataSource>(`${API}/sources`, input));
	}

	async deleteSource(sourceId: number): Promise<{ deleted: true }> {
		return firstValueFrom(
			this.http.delete<{ deleted: true }>(`${API}/sources/${sourceId}`),
		);
	}

	async fetchSource(sourceId: number): Promise<FetchSourceResult> {
		return firstValueFrom(
			this.http.post<FetchSourceResult>(`${API}/sources/${sourceId}/fetch`, {}),
		);
	}

	// ── network + docs ─────────────────────────────────────────────────

	async getNetwork(): Promise<NetworkPayload> {
		return firstValueFrom(this.http.get<NetworkPayload>(`${API}/network`));
	}

	async listDocs(): Promise<Doc[]> {
		return firstValueFrom(this.http.get<Doc[]>(`${API}/docs`));
	}

	// ── search, reports, cluster + node CRUD ───────────────────────────

	async search(q: string): Promise<SearchResponse> {
		const params = new URLSearchParams({ q });
		return firstValueFrom(
			this.http.get<SearchResponse>(`${API}/search?${params.toString()}`),
		);
	}

	async getReports(): Promise<ReportsResponse> {
		return firstValueFrom(this.http.get<ReportsResponse>(`${API}/reports`));
	}

	async createCluster(
		input: { label: string; color?: string },
	): Promise<{ id: string; label: string; color: string }> {
		return firstValueFrom(
			this.http.post<{ id: string; label: string; color: string }>(
				`${API}/clusters`,
				input,
			),
		);
	}

	async updateCluster(
		slug: string,
		patch: { label?: string; color?: string },
	): Promise<{ id: string; label: string; color: string }> {
		return firstValueFrom(
			this.http.put<{ id: string; label: string; color: string }>(
				`${API}/clusters/${encodeURIComponent(slug)}`,
				patch,
			),
		);
	}

	async deleteCluster(slug: string): Promise<{ deleted: true }> {
		return firstValueFrom(
			this.http.delete<{ deleted: true }>(
				`${API}/clusters/${encodeURIComponent(slug)}`,
			),
		);
	}

	async updateNode(
		slug: string,
		patch: { label?: string; description?: string; clusterSlug?: string },
	): Promise<{ id: string; label: string; desc: string; cluster: string }> {
		return firstValueFrom(
			this.http.put<{ id: string; label: string; desc: string; cluster: string }>(
				`${API}/nodes/${encodeURIComponent(slug)}`,
				patch,
			),
		);
	}

	async deleteNode(slug: string): Promise<{ deleted: true }> {
		return firstValueFrom(
			this.http.delete<{ deleted: true }>(
				`${API}/nodes/${encodeURIComponent(slug)}`,
			),
		);
	}

	async createNode(input: {
		label: string;
		clusterSlug: string;
		desc?: string;
	}): Promise<{ id: string; label: string; desc: string; cluster: string }> {
		return firstValueFrom(
			this.http.post<{ id: string; label: string; desc: string; cluster: string }>(
				`${API}/nodes`,
				input,
			),
		);
	}

	async mergeNodes(input: {
		targetSlug: string;
		sourceSlugs: string[];
	}): Promise<{ id: string; label: string; desc: string; cluster: string }> {
		return firstValueFrom(
			this.http.post<{ id: string; label: string; desc: string; cluster: string }>(
				`${API}/nodes/merge`,
				input,
			),
		);
	}

	async bulkReassignNodes(input: {
		nodeSlugs: string[];
		clusterSlug: string;
	}): Promise<{ reassigned: number; clusterSlug: string }> {
		return firstValueFrom(
			this.http.post<{ reassigned: number; clusterSlug: string }>(
				`${API}/nodes/bulk-reassign`,
				input,
			),
		);
	}

	/** Atomically reassign all nodes from source clusters to the target, then delete the sources. */
	async dissolveClusters(input: {
		sourceSlugs: string[];
		targetSlug: string;
	}): Promise<{ reassigned: number; deletedClusters: number }> {
		return firstValueFrom(
			this.http.post<{ reassigned: number; deletedClusters: number }>(
				`${API}/clusters/dissolve`,
				input,
			),
		);
	}

	/** Atomically delete several nodes and their incident edges. */
	async bulkDeleteNodes(input: {
		nodeSlugs: string[];
	}): Promise<{ deleted: number }> {
		return firstValueFrom(
			this.http.post<{ deleted: number }>(`${API}/nodes/bulk-delete`, input),
		);
	}
}

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
