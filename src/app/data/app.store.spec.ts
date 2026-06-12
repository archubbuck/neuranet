import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppStore } from './app.store';

describe('AppStore', () => {
  let store: AppStore;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('neuranet_v2');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(AppStore);
    http = TestBed.inject(HttpTestingController);
  });

  it('starts empty', () => {
    expect(store.sources()).toEqual([]);
    expect(store.nodes()).toEqual([]);
    expect(store.docs()).toEqual([]);
    expect(store.hasData()).toBe(false);
  });

  it('loadAll fetches sources, network, and docs in parallel', async () => {
    const promise = store.loadAll();
    http.expectOne('/api/sources').flush([]);
    http.expectOne('/api/network').flush({
      derivedClusters: [{ id: 'c1', label: 'A', color: '#fff' }],
      derivedNodes: [
        {
          id: 'n1',
          label: 'Node 1',
          desc: null,
          cluster: 'c1',
          r: 10,
          importance: 5,
          depth: 0,
          isCentral: true,
          degree: 2,
        },
      ],
      derivedEdges: [],
    });
    http.expectOne('/api/docs').flush([]);
    await promise;
    expect(store.clusters()).toHaveLength(1);
    expect(store.nodes()).toHaveLength(1);
    expect(store.hasData()).toBe(true);
  });

  it('selectNode flips detailView to slide and back to closed', () => {
    store.selectNode('node-a');
    expect(store.selectedNodeId()).toBe('node-a');
    expect(store.detailView()).toBe('slide');

    store.setDetailView('full');
    expect(store.detailView()).toBe('full');

    store.selectNode(null);
    expect(store.selectedNodeId()).toBeNull();
    expect(store.detailView()).toBe('closed');
  });

  it('cluster filter toggles set membership', () => {
    expect(store.filterClusters().size).toBe(0);
    store.toggleClusterFilter('c1');
    expect(store.filterClusters().has('c1')).toBe(true);
    store.toggleClusterFilter('c1');
    expect(store.filterClusters().has('c1')).toBe(false);
  });

  it('persists collapsed to localStorage', () => {
    store.toggleCollapsed();
    TestBed.tick();
    const raw = localStorage.getItem('neuranet_v2');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.collapsed).toBe(true);
  });

  it('renameCluster updates the clusters signal after API success', async () => {
    // Seed network state.
    const seedPromise = store.loadAll();
    http.expectOne('/api/sources').flush([]);
    http.expectOne('/api/network').flush({
      derivedClusters: [{ id: 'c1', label: 'Old', color: '#fff' }],
      derivedNodes: [],
      derivedEdges: [],
    });
    http.expectOne('/api/docs').flush([]);
    await seedPromise;

    const renamePromise = store.renameCluster('c1', 'New');
    http.expectOne('/api/clusters/c1').flush({ id: 'c1', label: 'New', color: '#fff' });
    await renamePromise;

    expect(store.clusters()[0].label).toBe('New');
  });

  async function seedTwoClusters(): Promise<void> {
    const seedPromise = store.loadAll();
    http.expectOne('/api/sources').flush([]);
    http.expectOne('/api/network').flush({
      derivedClusters: [
        { id: 'c1', label: 'Alpha', color: '#fff' },
        { id: 'c2', label: 'Beta', color: '#000' },
      ],
      derivedNodes: [
        {
          id: 'n1',
          label: 'One',
          desc: null,
          cluster: 'c1',
          r: 10,
          importance: 5,
          depth: 0,
          isCentral: false,
          degree: 1,
        },
        {
          id: 'n2',
          label: 'Two',
          desc: null,
          cluster: 'c1',
          r: 10,
          importance: 5,
          depth: 0,
          isCentral: false,
          degree: 1,
        },
      ],
      derivedEdges: [{ source: 'n1', target: 'n2', kind: 'same-doc' }],
    });
    http.expectOne('/api/docs').flush([]);
    await seedPromise;
  }

  function flushLoadAll(): void {
    http.expectOne('/api/sources').flush([]);
    http
      .expectOne('/api/network')
      .flush({ derivedClusters: [], derivedNodes: [], derivedEdges: [] });
    http.expectOne('/api/docs').flush([]);
  }

  /** Let the awaited API promise resolve so the follow-up loadAll() fires. */
  function settle(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  it('dissolveCluster issues a single atomic dissolve request', async () => {
    await seedTwoClusters();

    const promise = store.dissolveCluster('c1', 'c2');
    const req = http.expectOne('/api/clusters/dissolve');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ sourceSlugs: ['c1'], targetSlug: 'c2' });
    req.flush({ reassigned: 2, deletedClusters: 1 });
    await settle();
    flushLoadAll();
    await promise;

    // No per-node PUTs were issued.
    http.verify();
  });

  it('mergeCategories issues a single atomic dissolve request', async () => {
    await seedTwoClusters();

    const promise = store.mergeCategories(['c1'], 'c2');
    const req = http.expectOne('/api/clusters/dissolve');
    expect(req.request.body).toEqual({ sourceSlugs: ['c1'], targetSlug: 'c2' });
    req.flush({ reassigned: 2, deletedClusters: 1 });
    await settle();
    flushLoadAll();
    await promise;
    http.verify();
  });

  it('bulkDeleteNodes issues a single bulk request and prunes local state', async () => {
    await seedTwoClusters();

    const promise = store.bulkDeleteNodes(['n1', 'n2']);
    const req = http.expectOne('/api/nodes/bulk-delete');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nodeSlugs: ['n1', 'n2'] });
    req.flush({ deleted: 2 });
    await promise;

    expect(store.nodes()).toHaveLength(0);
    http.verify();
  });
});
