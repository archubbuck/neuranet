import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ReportsScreenComponent } from './reports-screen.component';
import {
	FIXTURE_CLUSTERS,
	FIXTURE_DOCS,
	FIXTURE_EDGES,
	FIXTURE_NODES,
	FIXTURE_SOURCES,
	seedAppStore,
} from './spec-helpers';

describe('ReportsScreenComponent', () => {
	beforeEach(async () => {
		await seedAppStore({
			sources: FIXTURE_SOURCES,
			network: {
				derivedClusters: FIXTURE_CLUSTERS,
				derivedNodes: FIXTURE_NODES,
				derivedEdges: FIXTURE_EDGES,
			},
			docs: FIXTURE_DOCS,
		});
	});

	it('renders KPI counts matching the seeded data', () => {
		const fixture = TestBed.createComponent(ReportsScreenComponent);
		fixture.detectChanges();
		const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
		// KPI cards render as "<count><label>" with no separator, so match
		// directly on the concatenated string.
		expect(text).toContain('3nodes');
		expect(text).toContain('2clusters');
		expect(text).toContain('1edges');
		expect(text).toContain('1sources');
		expect(text).toContain('1documents');
	});

	it('renders one bar per cluster in the distribution section', () => {
		const fixture = TestBed.createComponent(ReportsScreenComponent);
		fixture.detectChanges();
		const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
		expect(text).toContain('Cluster distribution');
		expect(text).toContain('Climate');
		expect(text).toContain('Genomics');
	});
});
