import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { TopicsScreenComponent } from './topics-screen.component';
import {
  FIXTURE_CLUSTERS,
  FIXTURE_DOCS,
  FIXTURE_EDGES,
  FIXTURE_NODES,
  seedAppStore,
} from '../spec-helpers';

describe('TopicsScreenComponent', () => {
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

  it('renders the records tab with topic rows', () => {
    const fixture = TestBed.createComponent(TopicsScreenComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Manage topics');
    expect(text).toContain('Climate');
    expect(text).toContain('Renewable');
    expect(text).toContain('Genomics');
  });

  it('filters topics by search text', () => {
    const fixture = TestBed.createComponent(TopicsScreenComponent);
    fixture.detectChanges();

    // Set the search filter signal directly.
    (fixture.componentInstance as any).searchFilter.set('Renew');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Renewable');
    // Counter should show only 1 visible out of 3 total.
    expect(text).toContain('1 of 3');
  });

  it('shows the analytics tab with stats', () => {
    const fixture = TestBed.createComponent(TopicsScreenComponent);
    // Switch to analytics tab by setting the signal directly.
    (fixture.componentInstance as any).tab.set('analytics');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Nodes');
    // 3 from fixture
    expect(text).toMatch(/3/);
    expect(text).toContain('Category distribution');
  });

  it('selects rows and shows bulk bar', () => {
    const fixture = TestBed.createComponent(TopicsScreenComponent);
    fixture.detectChanges();

    // Select a row via the component's toggleSelect method.
    const cmp = fixture.componentInstance as any;
    const firstRow = cmp.visibleRows()[0];
    cmp.toggleSelect(firstRow.id);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('topic selected');
    expect(text).toContain('Reassign');
    expect(text).toContain('Merge');
    expect(text).toContain('Remove');
  });

  it('sorts by column on header click', () => {
    const fixture = TestBed.createComponent(TopicsScreenComponent);
    fixture.detectChanges();

    const headers = (fixture.nativeElement as HTMLElement).querySelectorAll('.th-sort');
    expect(headers.length).toBe(5);

    // Click "Sources" header (index 2: title, cluster, docCount, linkCount, sentiment)
    (headers[2] as HTMLButtonElement).click();
    fixture.detectChanges();

    const cmp = fixture.componentInstance as any;
    const rows: readonly { docCount: number }[] = cmp.visibleRows();
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].docCount).toBeGreaterThanOrEqual(rows[i - 1].docCount);
    }

    // Click again to toggle descending
    (headers[2] as HTMLButtonElement).click();
    fixture.detectChanges();
    const rows2: readonly { docCount: number }[] = cmp.visibleRows();
    for (let i = 1; i < rows2.length; i++) {
      expect(rows2[i].docCount).toBeLessThanOrEqual(rows2[i - 1].docCount);
    }

    // Third click removes sort (desc → none)
    (headers[2] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(cmp.sortBy().length).toBe(0);
  });

  it('sort indicator appears on sorted column', () => {
    const fixture = TestBed.createComponent(TopicsScreenComponent);
    fixture.detectChanges();

    const headers = (fixture.nativeElement as HTMLElement).querySelectorAll('.th-sort');
    // Click "Topic" header to sort by title ascending
    (headers[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    // Sorted header should have an app-icon inside it
    const icon = headers[0].querySelector('app-icon');
    expect(icon).toBeTruthy();

    // Verify sort state is correct
    const cmp = fixture.componentInstance as any;
    expect(cmp.sortBy().length).toBe(1);
    expect(cmp.sortBy()[0]).toEqual({ column: 'title', dir: 'asc' });
  });
});
