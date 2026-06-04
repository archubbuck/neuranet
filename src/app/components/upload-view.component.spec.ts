import { SimpleChange } from '@angular/core';
import { vi } from 'vitest';
import { UploadViewComponent } from './upload-view.component';
import { TopicDoc } from '../topicnet-data';

describe('UploadViewComponent', () => {
  let component: UploadViewComponent;

  beforeEach(() => {
    component = new UploadViewComponent();
  });

  it('keeps title and text while document save is pending', () => {
    component.title = 'My Doc';
    component.text = 'Some content';
    const emitSpy = vi.spyOn(component.add, 'emit');

    component.addDocument();

    expect(emitSpy).toHaveBeenCalledWith({
      id: expect.any(Number),
      title: 'My Doc',
      text: 'Some content',
      status: 'done',
    });
    expect(component.processing).toBe(true);
    expect(component.title).toBe('My Doc');
    expect(component.text).toBe('Some content');
  });

  it('clears form fields after docs input grows from a successful save', () => {
    component.title = 'Saved Doc';
    component.text = 'Saved content';
    component.addDocument();

    const savedDoc: TopicDoc = {
      id: 101,
      title: 'Saved Doc',
      text: 'Saved content',
      status: 'done',
      derivedNodeSlugs: [],
    };

    component.docs = [savedDoc];
    component.ngOnChanges({
      docs: new SimpleChange([], component.docs, false),
    });

    expect(component.processing).toBe(false);
    expect(component.title).toBe('');
    expect(component.text).toBe('');
  });

  it('stops processing when a save error is provided', () => {
    component.title = 'Failed Doc';
    component.text = 'Will fail';
    component.addDocument();

    component.saveError = 'Unable to save';
    component.ngOnChanges({
      saveError: new SimpleChange('', component.saveError, false),
    });

    expect(component.processing).toBe(false);
  });
});
