import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { DocsApiService } from './docs-api.service';

describe('DocsApiService', () => {
  let service: DocsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(DocsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads docs from the API', () => {
    let docsLength = 0;

    service.listDocs(1).subscribe((docs) => {
      docsLength = docs.length;
    });

    const req = httpMock.expectOne('/api/workspaces/1/docs');
    expect(req.request.method).toBe('GET');
    req.flush([
      { id: 1, title: 'Doc A', text: 'Text', status: 'done' },
      { id: 2, title: 'Doc B', text: 'Text', status: 'done' },
    ]);

    expect(docsLength).toBe(2);
  });

  it('creates a new doc through the API', () => {
    let createdId = 0;

    service.createDoc(1, { title: 'Created', text: 'Body', status: 'done' }).subscribe((doc) => {
      createdId = doc.id;
    });

    const req = httpMock.expectOne('/api/workspaces/1/docs');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'Created', text: 'Body', status: 'done' });
    req.flush({ id: 7, title: 'Created', text: 'Body', status: 'done' });

    expect(createdId).toBe(7);
  });

  it('loads derived network overlay from the API', () => {
    let nodeCount = 0;

    service.getNetworkOverlay(1).subscribe((overlay) => {
      nodeCount = overlay.derivedNodes.length;
    });

    const req = httpMock.expectOne('/api/workspaces/1/network');
    expect(req.request.method).toBe('GET');
    req.flush({
      derivedClusters: [{ id: 'derived-vision', label: 'Vision Concepts', color: '#33aabb', count: 2 }],
      derivedNodes: [{ id: 'user-1-vision', label: 'Vision', cluster: 'derived-vision', r: 14, importance: 6, degree: 1, desc: 'Derived node' }],
      derivedEdges: [{ source: 'user-1-vision', target: 'cv', kind: 'related-base' }],
    });

    expect(nodeCount).toBe(1);
  });

  it('returns empty overlay when network API fails', () => {
    let edgeCount = -1;

    service.getNetworkOverlay(1).subscribe((overlay) => {
      edgeCount = overlay.derivedEdges.length;
    });

    const req = httpMock.expectOne('/api/workspaces/1/network');
    req.flush({ message: 'failed' }, { status: 500, statusText: 'Server Error' });

    expect(edgeCount).toBe(0);
  });
});
