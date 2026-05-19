import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NetworkOverlay, TopicDoc, TopicEdge } from '../topicnet-data';

const FALLBACK_DOCS: TopicDoc[] = [
  { id: 1, title: 'Brain-Computer Interfaces', text: 'demo', status: 'done' },
  { id: 2, title: 'Neural Networks Overview', text: 'demo', status: 'done' },
];

export interface CreateTopicDocInput {
  title: string;
  text: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class DocsApiService {
  private readonly http = inject(HttpClient);
  private readonly docsUrl = '/api/docs';
  private readonly networkUrl = '/api/network';

  listDocs(): Observable<TopicDoc[]> {
    return this.http.get<TopicDoc[]>(this.docsUrl).pipe(catchError(() => of(FALLBACK_DOCS)));
  }

  createDoc(input: CreateTopicDocInput): Observable<TopicDoc> {
    return this.http.post<TopicDoc>(this.docsUrl, input);
  }

  getNetworkOverlay(): Observable<NetworkOverlay> {
    return this.http.get<NetworkOverlay>(this.networkUrl).pipe(
      catchError(() =>
        of({
          derivedClusters: [],
          derivedNodes: [],
          derivedEdges: [] as TopicEdge[],
        }),
      ),
    );
  }
}
