import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { SearchInputComponent } from './search-input.component';

describe('SearchInputComponent', () => {
  async function create() {
    await TestBed.configureTestingModule({ imports: [SearchInputComponent] }).compileComponents();
    const fixture = TestBed.createComponent(SearchInputComponent);
    fixture.componentRef.setInput('placeholder', 'Filter things…');
    fixture.detectChanges();
    return fixture;
  }

  it('renders the placeholder', async () => {
    const fixture = await create();
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input');
    expect(input?.placeholder).toBe('Filter things…');
  });

  it('typing updates the value model', async () => {
    const fixture = await create();
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input')!;
    input.value = 'climate';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('climate');
  });
});
