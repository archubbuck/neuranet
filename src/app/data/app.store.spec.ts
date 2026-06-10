import { TestBed } from '@angular/core/testing';
import {
	HttpTestingController,
	provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppStore } from './app.store';

describe('AppStore', () => {
	let store: AppStore;
	let http: HttpTestingController;

	beforeEach(() => {
		localStorage.removeItem('topicnet_v2');
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
			],
		});
		store = TestBed.inject(AppStore);
		http = TestBed.inject(HttpTestingController);
	});

	it('starts empty', () => {
		expect(store.sources()).toEqual([]);
		expect(store.nodes()).toEqual([]);
		expect(store.docs()).toEqual([]);
		expect(store.hasData()).toBe(false);
	});

	it('loadAll fetches sources, network, and docs in parallel', async () => {
		const promise = store.loadAll();
		http.expectOne('/api/sources').flush([]);
		http.expectOne('/api/network').flush({
			derivedClusters: [{ id: 'c1', label: 'A', color: '#fff' }],
			derivedNodes: [
				{ id: 'n1', label: 'Node 1', desc: null, cluster: 'c1', r: 10, importance: 5, depth: 0, isCentral: true, degree: 2 },
			],
			derivedEdges: [],
		});
		http.expectOne('/api/docs').flush([]);
		await promise;
		expect(store.clusters()).toHaveLength(1);
		expect(store.nodes()).toHaveLength(1);
		expect(store.hasData()).toBe(true);
	});

	it('selectNode flips detailView to slide and back to closed', () => {
		store.selectNode('node-a');
		expect(store.selectedNodeId()).toBe('node-a');
		expect(store.detailView()).toBe('slide');

		store.setDetailView('full');
		expect(store.detailView()).toBe('full');

		store.selectNode(null);
		expect(store.selectedNodeId()).toBeNull();
		expect(store.detailView()).toBe('closed');
	});

	it('cluster filter toggles set membership', () => {
		expect(store.filterClusters().size).toBe(0);
		store.toggleClusterFilter('c1');
		expect(store.filterClusters().has('c1')).toBe(true);
		store.toggleClusterFilter('c1');
		expect(store.filterClusters().has('c1')).toBe(false);
	});

	it('persists screen and collapsed to localStorage', () => {
		store.setScreen('sources');
		store.toggleCollapsed();
		TestBed.tick();
		const raw = localStorage.getItem('topicnet_v2');
		expect(raw).not.toBeNull();
		const parsed = JSON.parse(raw!);
		expect(parsed.screen).toBe('sources');
		expect(parsed.collapsed).toBe(true);
	});

	it('renameCluster updates the clusters signal after API success', async () => {
		// Seed network state.
		const seedPromise = store.loadAll();
		http.expectOne('/api/sources').flush([]);
		http.expectOne('/api/network').flush({
			derivedClusters: [{ id: 'c1', label: 'Old', color: '#fff' }],
			derivedNodes: [],
			derivedEdges: [],
		});
		http.expectOne('/api/docs').flush([]);
		await seedPromise;

		const renamePromise = store.renameCluster('c1', 'New');
		http.expectOne('/api/clusters/c1').flush({ id: 'c1', label: 'New', color: '#fff' });
		await renamePromise;

		expect(store.clusters()[0].label).toBe('New');
	});
});
