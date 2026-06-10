import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ApiService],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  it('lists sources via GET /api/sources', async () => {
    const promise = api.listSources();
    const req = http.expectOne('/api/sources');
    expect(req.request.method).toBe('GET');
    req.flush([]);
    const list = await promise;
    expect(list).toEqual([]);
  });

  it('fetches a source via POST /api/sources/:id/fetch', async () => {
    const promise = api.fetchSource(9);
    const req = http.expectOne('/api/sources/9/fetch');
    expect(req.request.method).toBe('POST');
    req.flush({
      source: {
        id: 9,
        source_type: 'reddit',
        status: 'done',
        status_message: 'ok',
        created_at: '',
        config: {},
      },
      nodeCount: 5,
      edgeCount: 4,
    });
    const result = await promise;
    expect(result.nodeCount).toBe(5);
    expect(result.source.status).toBe('done');
  });

  it('returns the network payload from GET /api/network', async () => {
    const promise = api.getNetwork();
    const req = http.expectOne('/api/network');
    req.flush({
      derivedClusters: [{ id: 'c1', label: 'C1', color: '#fff' }],
      derivedNodes: [],
      derivedEdges: [],
    });
    const net = await promise;
    expect(net.derivedClusters[0].id).toBe('c1');
  });

  it('searches via GET /api/search', async () => {
    const promise = api.search('climate');
    const req = http.expectOne('/api/search?q=climate');
    req.flush({ results: [] });
    const res = await promise;
    expect(res.results).toEqual([]);
  });
});
