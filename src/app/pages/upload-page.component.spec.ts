import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { TopicDoc } from '../topicnet-data';
import { DocsApiService } from '../services/docs-api.service';
import { UploadPageComponent } from './upload-page.component';

describe('UploadPageComponent', () => {
  const baseDocs: TopicDoc[] = [
    { id: 1, title: 'Doc A', text: 'A', status: 'done', derivedNodeSlugs: [] },
  ];

  function setup(createDocImpl: () => Observable<TopicDoc>) {
    const docsApiMock = {
      listDocs: () => of(baseDocs),
      createDoc: createDocImpl,
      legacyListDocs: () => of(baseDocs),
      legacyCreateDoc: createDocImpl,
    };

    TestBed.configureTestingModule({
      imports: [UploadPageComponent],
      providers: [provideRouter([]), { provide: DocsApiService, useValue: docsApiMock }],
    });

    const fixture = TestBed.createComponent(UploadPageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    return { component };
  }

  it('appends saved docs on successful create', () => {
    const savedDoc: TopicDoc = {
      id: 2,
      title: 'Doc B',
      text: 'B',
      status: 'done',
      derivedNodeSlugs: [],
    };
    const { component } = setup(() => of(savedDoc));

    component.handleAddDoc({ id: 2, title: 'Doc B', text: 'B', status: 'done', derivedNodeSlugs: [] });

    expect(component.saveError).toBe('');
    expect(component.docs).toEqual([...baseDocs, savedDoc]);
  });

  it('sets saveError when create fails', () => {
    const { component } = setup(() => throwError(() => new Error('network')));

    component.handleAddDoc({ id: 2, title: 'Doc B', text: 'B', status: 'done', derivedNodeSlugs: [] });

    expect(component.saveError).toBe('Unable to save document. Check that the API server is running and try again.');
    expect(component.docs).toEqual(baseDocs);
  });
});
