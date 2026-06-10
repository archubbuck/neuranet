import { DeferBlockState, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppStore } from '../../data/app.store';
import { NetworkScreenComponent } from './network-screen.component';
import { FIXTURE_CLUSTERS, FIXTURE_EDGES, FIXTURE_NODES, seedAppStore } from '../spec-helpers';

describe('NetworkScreenComponent', () => {
	let fixture: ReturnType<typeof TestBed.createComponent<NetworkScreenComponent>>;
	let store: AppStore;

	beforeEach(async () => {
		const seeded = await seedAppStore({
			network: {
				derivedClusters: FIXTURE_CLUSTERS,
				derivedNodes: FIXTURE_NODES,
				derivedEdges: FIXTURE_EDGES,
			},
		});
		store = seeded.store;
		fixture = TestBed.createComponent(NetworkScreenComponent);
		fixture.detectChanges();
		// The graph + overlays render inside a @defer block — complete it.
		for (const block of await fixture.getDeferBlocks()) {
			await block.render(DeferBlockState.Complete);
		}
		fixture.detectChanges();
	});

	it('renders the canvas with overlays', () => {
		const el = fixture.nativeElement as HTMLElement;
		expect(el.querySelector('app-network-graph')).not.toBeNull();
		expect(el.querySelector('app-stats-bar')).not.toBeNull();
		expect(el.querySelector('app-zoom-controls')).not.toBeNull();
		expect(el.querySelector('app-slide-in-detail')).not.toBeNull();
	});

	it('shows the idle hint when no node is selected', () => {
		const el = fixture.nativeElement as HTMLElement;
		expect(el.textContent).toContain('Select a node to explore');
	});

	it('opens the slide-in detail when a node is selected', () => {
		store.selectNode('n1');
		fixture.detectChanges();
		const panel = (fixture.nativeElement as HTMLElement).querySelector('app-slide-in-detail .panel');
		expect(panel?.classList.contains('open')).toBe(true);
	});

	it('renders one row per cluster in the panel', () => {
		const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('app-clusters-panel .row:not(.all)');
		expect(buttons.length).toBe(2);
	});
});
