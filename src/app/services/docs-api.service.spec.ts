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

    service.listDocs().subscribe((docs) => {
      docsLength = docs.length;
    });

    const req = httpMock.expectOne('/api/docs');
    expect(req.request.method).toBe('GET');
    req.flush([
      { id: 1, title: 'Doc A', text: 'Text', status: 'done' },
      { id: 2, title: 'Doc B', text: 'Text', status: 'done' },
    ]);

    expect(docsLength).toBe(2);
  });

  it('creates a new doc through the API', () => {
    let createdId = 0;

    service.createDoc({ title: 'Created', text: 'Body', status: 'done' }).subscribe((doc) => {
      createdId = doc.id;
    });

    const req = httpMock.expectOne('/api/docs');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'Created', text: 'Body', status: 'done' });
    req.flush({ id: 7, title: 'Created', text: 'Body', status: 'done' });

    expect(createdId).toBe(7);
  });
});
