import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ManageScreenComponent } from './manage-screen.component';
import {
	FIXTURE_CLUSTERS,
	FIXTURE_EDGES,
	FIXTURE_NODES,
	FIXTURE_SOURCES,
	seedAppStore,
} from './spec-helpers';

describe('ManageScreenComponent', () => {
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

	it('lists clusters with their member counts', () => {
		const fixture = TestBed.createComponent(ManageScreenComponent);
		fixture.componentRef.setInput('kind', 'clusters');
		fixture.detectChanges();
		const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
		expect(text).toContain('Manage clusters');
		expect(text).toContain('Climate');
		expect(text).toContain('Genomics');
	});

	it('lists nodes with metadata and category badge', () => {
		const fixture = TestBed.createComponent(ManageScreenComponent);
		fixture.componentRef.setInput('kind', 'nodes');
		fixture.detectChanges();
		const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
		expect(text).toContain('Manage nodes');
		expect(text).toContain('Climate');
		expect(text).toMatch(/degree\s+\d/);
		expect(text).toContain('Climate');
	});
});
