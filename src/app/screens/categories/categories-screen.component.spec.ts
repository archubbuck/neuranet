import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CategoriesScreenComponent } from './categories-screen.component';
import {
  FIXTURE_CLUSTERS,
  FIXTURE_DOCS,
  FIXTURE_EDGES,
  FIXTURE_NODES,
  seedAppStore,
} from '../spec-helpers';

describe('CategoriesScreenComponent', () => {
  beforeEach(async () => {
    await seedAppStore({
      network: {
        derivedClusters: FIXTURE_CLUSTERS,
        derivedNodes: FIXTURE_NODES,
        derivedEdges: FIXTURE_EDGES,
      },
      docs: FIXTURE_DOCS,
    });
  });

  it('renders category rows with labels and counts', () => {
    const fixture = TestBed.createComponent(CategoriesScreenComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Manage categories');
    expect(text).toContain('Climate');
    expect(text).toContain('Genomics');
  });

  it('filters categories by search', () => {
    const fixture = TestBed.createComponent(CategoriesScreenComponent);
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector(
      '.search-input',
    ) as HTMLInputElement;
    input.value = 'Climate';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('.tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Climate');
  });

  it('shows the New Category modal on button click', () => {
    const fixture = TestBed.createComponent(CategoriesScreenComponent);
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector(
      'app-page-header app-button button',
    ) as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('New category');
    expect(text).toContain('Create category');
  });

  it('switches to Analytics tab and shows charts', () => {
    const fixture = TestBed.createComponent(CategoriesScreenComponent);
    fixture.detectChanges();
    // Click the Analytics tab
    const tabs = (fixture.nativeElement as HTMLElement).querySelectorAll('.tab');
    expect(tabs.length).toBe(2);
    (tabs[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Nodes per category');
    expect(text).toContain('Document share');
    expect(text).toContain('Nodes mapped');
  });

  it('selects rows via checkboxes', () => {
    const fixture = TestBed.createComponent(CategoriesScreenComponent);
    fixture.detectChanges();
    // Click first row's checkbox
    const checkboxes = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'app-checkbox button',
    );
    // First checkbox is the select-all, second is first row
    expect(checkboxes.length).toBeGreaterThan(1);
    (checkboxes[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('category selected');
  });

  it('sorts by column on header click', () => {
    const fixture = TestBed.createComponent(CategoriesScreenComponent);
    fixture.detectChanges();

    // Click the "Topics" column header to sort ascending
    const headers = (fixture.nativeElement as HTMLElement).querySelectorAll('.th-sort');
    expect(headers.length).toBe(4);
    // "Topics" is the second sortable header (label, nodeCount, docCount, avgSent)
    (headers[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    // Verify visible rows are sorted by nodeCount ascending
    const cmp = fixture.componentInstance as any;
    const rows: readonly { nodeCount: number }[] = cmp.visibleRows();
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].nodeCount).toBeGreaterThanOrEqual(rows[i - 1].nodeCount);
    }

    // Click again to toggle descending
    (headers[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    const rows2: readonly { nodeCount: number }[] = cmp.visibleRows();
    for (let i = 1; i < rows2.length; i++) {
      expect(rows2[i].nodeCount).toBeLessThanOrEqual(rows2[i - 1].nodeCount);
    }

    // Third click removes sort (desc → none)
    (headers[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(cmp.sortBy().length).toBe(0);
  });

  it('cycles sort asc → desc → none on repeated clicks', () => {
    const fixture = TestBed.createComponent(CategoriesScreenComponent);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    const btn = (fixture.nativeElement as HTMLElement).querySelector(
      '.th-sort',
    ) as HTMLButtonElement;

    // 1st click: asc
    btn.click();
    fixture.detectChanges();
    expect(cmp.sortBy().length).toBe(1);
    expect(cmp.sortBy()[0].dir).toBe('asc');

    // 2nd click: desc
    btn.click();
    fixture.detectChanges();
    expect(cmp.sortBy()[0].dir).toBe('desc');

    // 3rd click: removed
    btn.click();
    fixture.detectChanges();
    expect(cmp.sortBy().length).toBe(0);
  });

  it('filters rows by column filter input', () => {
    const fixture = TestBed.createComponent(CategoriesScreenComponent);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;

    // Set a column filter on the label column
    cmp.setColumnFilter('label', 'Climate');
    fixture.detectChanges();

    const rows: readonly { label: string }[] = cmp.visibleRows();
    expect(rows.length).toBe(1);
    expect(rows[0].label).toContain('Climate');
  });

  it('supports multi-column sort with Shift+click', () => {
    const fixture = TestBed.createComponent(CategoriesScreenComponent);
    fixture.detectChanges();

    const headers = (fixture.nativeElement as HTMLElement).querySelectorAll('.th-sort');

    // Sort by Topics (asc) as primary
    (headers[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    // Shift+click Sources to add secondary sort key
    const shiftEvent = new MouseEvent('click', { shiftKey: true, bubbles: true });
    headers[2].dispatchEvent(shiftEvent);
    fixture.detectChanges();

    const cmp = fixture.componentInstance as any;
    expect(cmp.sortBy().length).toBe(2);
    expect(cmp.sortBy()[0].column).toBe('nodeCount');
    expect(cmp.sortBy()[1].column).toBe('docCount');
  });

  it('shows sort indicator icon on sorted column', () => {
    const fixture = TestBed.createComponent(CategoriesScreenComponent);
    fixture.detectChanges();

    const headers = (fixture.nativeElement as HTMLElement).querySelectorAll('.th-sort');
    (headers[0] as HTMLButtonElement).click(); // Sort by Category
    fixture.detectChanges();

    // Sorted header should have an app-icon inside it
    const firstIcon = headers[0].querySelector('app-icon');
    expect(firstIcon).toBeTruthy();

    // Verify sort state is correct
    const cmp = fixture.componentInstance as any;
    expect(cmp.sortBy().length).toBe(1);
    expect(cmp.sortBy()[0]).toEqual({ column: 'label', dir: 'asc' });
  });
});
