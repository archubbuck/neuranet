import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ReportsScreenComponent } from './reports-screen.component';
import { seedAppStore } from './spec-helpers';

const REPORTS_FIXTURE = {
	totals: { nodes: 3, clusters: 2, edges: 1, sources: 1, docs: 1 },
	clusterDistribution: [
		{ id: 'c1', label: 'Climate', color: '#22D3EE', count: 2 },
		{ id: 'c2', label: 'Genomics', color: '#A78BFA', count: 1 },
	],
};

describe('ReportsScreenComponent', () => {
	beforeEach(async () => {
		await seedAppStore({});
	});

	function createWithReports() {
		const fixture = TestBed.createComponent(ReportsScreenComponent);
		fixture.detectChanges();
		const http = TestBed.inject(HttpTestingController);
		http.expectOne('/api/reports').flush(REPORTS_FIXTURE);
		return fixture;
	}

	/** Let the awaited getReports() promise resolve and re-render. */
	async function settle(fixture: ReturnType<typeof TestBed.createComponent>) {
		await new Promise((resolve) => setTimeout(resolve, 0));
		fixture.detectChanges();
	}

	it('renders KPI counts from the reports endpoint', async () => {
		const fixture = createWithReports();
		await settle(fixture);
		const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
		// KPI cards render as "<count><label>" with no separator, so match
		// directly on the concatenated string.
		expect(text).toContain('3nodes');
		expect(text).toContain('2clusters');
		expect(text).toContain('1edges');
		expect(text).toContain('1sources');
		expect(text).toContain('1documents');
	});

	it('renders one bar per cluster in the distribution section', async () => {
		const fixture = createWithReports();
		await settle(fixture);
		const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
		expect(text).toContain('Cluster distribution');
		expect(text).toContain('Climate');
		expect(text).toContain('Genomics');
	});

	it('shows an error message when the endpoint fails', async () => {
		const fixture = TestBed.createComponent(ReportsScreenComponent);
		fixture.detectChanges();
		const http = TestBed.inject(HttpTestingController);
		http.expectOne('/api/reports').flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
		await settle(fixture);
		expect((fixture.nativeElement as HTMLElement).textContent).toContain('Failed to load reports');
	});
});
