import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SourcesScreenComponent } from './sources-screen.component';
import {
	FIXTURE_CLUSTERS,
	FIXTURE_EDGES,
	FIXTURE_NODES,
	FIXTURE_SOURCES,
	seedAppStore,
} from '../spec-helpers';

describe('SourcesScreenComponent', () => {
	beforeEach(async () => {
		await seedAppStore({
			sources: FIXTURE_SOURCES,
			network: {
				derivedClusters: FIXTURE_CLUSTERS,
				derivedNodes: FIXTURE_NODES,
				derivedEdges: FIXTURE_EDGES,
			},
		});
	});

	it('renders the empty state when there are no sources', async () => {
		TestBed.resetTestingModule();
		await seedAppStore({ sources: [], network: { derivedClusters: [], derivedNodes: [], derivedEdges: [] } });
		const fixture = TestBed.createComponent(SourcesScreenComponent);
		fixture.detectChanges();
		expect((fixture.nativeElement as HTMLElement).textContent).toContain('No sources');
	});

	it('lists configured sources by URL', () => {
		const fixture = TestBed.createComponent(SourcesScreenComponent);
		fixture.detectChanges();
		const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
		// FIXTURE_SOURCES has a web source with example.com URL — the new
		// displayName extracts the hostname from the URL.
		expect(text).toContain('example.com');
	});

	it('renders the Records and Analytics tabs', () => {
		const fixture = TestBed.createComponent(SourcesScreenComponent);
		fixture.detectChanges();
		const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
		expect(text).toContain('Records');
		expect(text).toContain('Analytics');
	});

	it('shows table column headers', () => {
		const fixture = TestBed.createComponent(SourcesScreenComponent);
		fixture.detectChanges();
		const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
		expect(text).toContain('Default cluster');
		expect(text).toContain('Documents');
		expect(text).toContain('Last ingest');
		expect(text).toContain('Status');
	});

	it('filters sources by search query', () => {
		const fixture = TestBed.createComponent(SourcesScreenComponent);
		fixture.detectChanges();
		const comp = fixture.componentInstance as unknown as {
			searchQuery: { set: (v: string) => void };
			visibleRows: () => readonly { name: string }[];
		};
		comp.searchQuery.set('nonexistent');
		fixture.detectChanges();
		expect(comp.visibleRows().length).toBe(0);
	});

	it('shows the New source button', () => {
		const fixture = TestBed.createComponent(SourcesScreenComponent);
		fixture.detectChanges();
		const btn = (fixture.nativeElement as HTMLElement).querySelector('app-page-header app-button button');
		expect(btn).toBeTruthy();
		expect(btn?.querySelector('app-icon[name="plus"]')).toBeTruthy();
	});

	it('sorts by column on header click', () => {
		const fixture = TestBed.createComponent(SourcesScreenComponent);
		fixture.detectChanges();

		const headers = (fixture.nativeElement as HTMLElement).querySelectorAll('.th-sort');
		expect(headers.length).toBe(5);

		// Click "Source" header to sort by name ascending
		(headers[0] as HTMLButtonElement).click();
		fixture.detectChanges();

		const cmp = fixture.componentInstance as any;
		expect(cmp.sortBy().length).toBe(1);
		expect(cmp.sortBy()[0].column).toBe('name');
		expect(cmp.sortBy()[0].dir).toBe('asc');
	});

	it('toggles sort direction on second click', () => {
		const fixture = TestBed.createComponent(SourcesScreenComponent);
		fixture.detectChanges();

		const headers = (fixture.nativeElement as HTMLElement).querySelectorAll('.th-sort');

		// First click: ascending
		(headers[0] as HTMLButtonElement).click();
		fixture.detectChanges();
		const cmp = fixture.componentInstance as any;
		expect(cmp.sortBy()[0].dir).toBe('asc');

		// Second click: descending
		(headers[0] as HTMLButtonElement).click();
		fixture.detectChanges();
		expect(cmp.sortBy()[0].dir).toBe('desc');

		// Third click: removed (desc → none)
		(headers[0] as HTMLButtonElement).click();
		fixture.detectChanges();
		expect(cmp.sortBy().length).toBe(0);
	});

	it('shows sort indicator icon', () => {
		const fixture = TestBed.createComponent(SourcesScreenComponent);
		fixture.detectChanges();

		const headers = (fixture.nativeElement as HTMLElement).querySelectorAll('.th-sort');
		(headers[3] as HTMLButtonElement).click(); // Sort by "Last ingest"
		fixture.detectChanges();

		// Sorted header should have an app-icon inside it
		const icon = headers[3].querySelector('app-icon');
		expect(icon).toBeTruthy();

		// Verify sort state is correct
		const cmp = fixture.componentInstance as any;
		expect(cmp.sortBy().length).toBe(1);
		expect(cmp.sortBy()[0]).toEqual({ column: 'lastIngest', dir: 'asc' });
	});
});
