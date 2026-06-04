import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DataSource, NetworkOverlay, TopicDoc, TopicEdge, Workspace } from '../topicnet-data';

/** @deprecated Workspaces now start empty — all topics come from data sources. */
const FALLBACK_DOCS: TopicDoc[] = [];

export interface CreateTopicDocInput {
  title: string;
  text: string;
  status: string;
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
}

export interface CreateSourceInput {
  sourceType: string;
  config: Record<string, unknown>;
}

export interface FetchResult {
  source: DataSource;
  nodeCount: number;
  edgeCount: number;
}

@Injectable({ providedIn: 'root' })
export class DocsApiService {
  private readonly http = inject(HttpClient);

  // ── Workspace endpoints ──

  listWorkspaces(): Observable<Workspace[]> {
    return this.http.get<Workspace[]>('/api/workspaces');
  }

  getWorkspace(id: number): Observable<Workspace> {
    return this.http.get<Workspace>(`/api/workspaces/${id}`);
  }

  createWorkspace(input: CreateWorkspaceInput): Observable<Workspace> {
    return this.http.post<Workspace>('/api/workspaces', input);
  }

  updateWorkspace(id: number, input: CreateWorkspaceInput): Observable<Workspace> {
    return this.http.put<Workspace>(`/api/workspaces/${id}`, input);
  }

  deleteWorkspace(id: number): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`/api/workspaces/${id}`);
  }

  // ── Data source endpoints ──

  listSources(workspaceId: number): Observable<DataSource[]> {
    return this.http.get<DataSource[]>(`/api/workspaces/${workspaceId}/sources`);
  }

  createSource(workspaceId: number, input: CreateSourceInput): Observable<DataSource> {
    return this.http.post<DataSource>(`/api/workspaces/${workspaceId}/sources`, input);
  }

  deleteSource(workspaceId: number, sourceId: number): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`/api/workspaces/${workspaceId}/sources/${sourceId}`);
  }

  fetchSource(workspaceId: number, sourceId: number): Observable<FetchResult> {
    return this.http.post<FetchResult>(`/api/workspaces/${workspaceId}/sources/${sourceId}/fetch`, {});
  }

  // ── Workspace-scoped network ──

  getNetworkOverlay(workspaceId: number): Observable<NetworkOverlay> {
    return this.http.get<NetworkOverlay>(`/api/workspaces/${workspaceId}/network`).pipe(
      catchError(() =>
        of({
          derivedClusters: [],
          derivedNodes: [],
          derivedEdges: [] as TopicEdge[],
        }),
      ),
    );
  }

  // ── Workspace-scoped docs ──

  listDocs(workspaceId: number): Observable<TopicDoc[]> {
    return this.http.get<TopicDoc[]>(`/api/workspaces/${workspaceId}/docs`).pipe(catchError(() => of(FALLBACK_DOCS)));
  }

  createDoc(workspaceId: number, input: CreateTopicDocInput): Observable<TopicDoc> {
    return this.http.post<TopicDoc>(`/api/workspaces/${workspaceId}/docs`, input);
  }

  // ── Legacy (non-workspace, deprecated) ──

  /** @deprecated Use listDocs(workspaceId) instead. */
  legacyListDocs(): Observable<TopicDoc[]> {
    return this.http.get<TopicDoc[]>('/api/docs').pipe(catchError(() => of(FALLBACK_DOCS)));
  }

  /** @deprecated Use getNetworkOverlay(workspaceId) instead. */
  legacyGetNetworkOverlay(): Observable<NetworkOverlay> {
    return this.http.get<NetworkOverlay>('/api/network').pipe(
      catchError(() =>
        of({
          derivedClusters: [],
          derivedNodes: [],
          derivedEdges: [] as TopicEdge[],
        }),
      ),
    );
  }

  /** @deprecated Use createDoc(workspaceId, input) instead. */
  legacyCreateDoc(input: CreateTopicDocInput): Observable<TopicDoc> {
    return this.http.post<TopicDoc>('/api/docs', input);
  }
}
