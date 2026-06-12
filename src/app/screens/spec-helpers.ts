import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AppStore } from '../data/app.store';
import { ViewportService } from '../core/viewport.service';
import type { Cluster, DataSource, Doc, Edge, NetworkPayload, Node } from '../data/types';

/**
 * Spec helpers — hide the boilerplate of priming an `AppStore` with fixture
 * data via the same load path the app uses at runtime (`loadAll()`).
 */
export interface SeedOptions {
  readonly sources?: readonly DataSource[];
  readonly network?: Partial<NetworkPayload>;
  readonly docs?: readonly Doc[];
}

export const FIXTURE_CLUSTERS: readonly Cluster[] = [
  { id: 'c1', label: 'Climate', color: '#22D3EE' },
  { id: 'c2', label: 'Genomics', color: '#A78BFA' },
];

export const FIXTURE_NODES: readonly Node[] = [
  {
    id: 'n1',
    label: 'Climate',
    desc: 'climate change overview',
    cluster: 'c1',
    r: 14,
    importance: 8,
    depth: 0,
    isCentral: true,
    degree: 2,
  },
  {
    id: 'n2',
    label: 'Renewable',
    desc: 'solar and wind',
    cluster: 'c1',
    r: 12,
    importance: 6,
    depth: 1,
    isCentral: false,
    degree: 1,
  },
  {
    id: 'n3',
    label: 'Genomics',
    desc: 'gene sequencing',
    cluster: 'c2',
    r: 14,
    importance: 8,
    depth: 0,
    isCentral: true,
    degree: 1,
  },
];

export const FIXTURE_EDGES: readonly Edge[] = [{ source: 'n1', target: 'n2', kind: 'same-doc' }];

export const FIXTURE_DOCS: readonly Doc[] = [
  {
    id: 1,
    title: 'Climate Brief',
    text: 'Climate change requires renewable energy.',
    status: 'derived',
    derivedNodeSlugs: ['n1', 'n2'],
  },
];

export const FIXTURE_SOURCES: readonly DataSource[] = [
  {
    id: 10,
    source_type: 'web',
    status: 'done',
    status_message: null,
    created_at: '2026-01-01',
    config: { url: 'https://example.com/article' },
  },
];

/**
 * Configures TestBed with HttpClient + Router providers and seeds the
 * `AppStore` by walking the `loadAll()` request triplet the app issues at
 * bootstrap. Resolves once the store is fully populated.
 */
export async function seedAppStore(opts: SeedOptions = {}): Promise<{
  store: AppStore;
  http: HttpTestingController;
}> {
  localStorage.removeItem('neuranet_v2');
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      ViewportService,
    ],
  });

  const store = TestBed.inject(AppStore);
  const http = TestBed.inject(HttpTestingController);

  const promise = store.loadAll();
  http.expectOne('/api/sources').flush(opts.sources ?? []);
  http.expectOne('/api/network').flush({
    derivedClusters: opts.network?.derivedClusters ?? [],
    derivedNodes: opts.network?.derivedNodes ?? [],
    derivedEdges: opts.network?.derivedEdges ?? [],
  });
  http.expectOne('/api/docs').flush(opts.docs ?? []);
  await promise;
  return { store, http };
}
