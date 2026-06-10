import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppStore } from '../../data/app.store';
import { NetworkGraphComponent } from './network-graph.component';
import { FIXTURE_CLUSTERS, FIXTURE_EDGES, FIXTURE_NODES, seedAppStore } from '../spec-helpers';

describe('NetworkGraphComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<NetworkGraphComponent>>;
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
    fixture = TestBed.createComponent(NetworkGraphComponent);
    fixture.detectChanges();
  });

  function nodeGroups(): NodeListOf<SVGGElement> {
    return (fixture.nativeElement as HTMLElement).querySelectorAll('g.node');
  }

  it('renders one accessible group per node and one line per edge', () => {
    const groups = nodeGroups();
    expect(groups).toHaveLength(3);
    for (const g of groups) {
      expect(g.getAttribute('role')).toBe('button');
      expect(g.getAttribute('tabindex')).toBe('0');
      expect(g.getAttribute('aria-label')).toMatch(/^Topic: /);
    }
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('line')).toHaveLength(1);
  });

  it('clicking a node selects it in the store; clicking again deselects', () => {
    const first = nodeGroups()[0];
    first.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(store.selectedNodeId()).not.toBeNull();

    first.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(store.selectedNodeId()).toBeNull();
  });

  it('selects a node via the keyboard (Enter)', () => {
    const first = nodeGroups()[0];
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(store.selectedNodeId()).not.toBeNull();
    expect(first.getAttribute('aria-pressed')).toBe('true');
  });

  it('clamps zoom within bounds', () => {
    const graph = fixture.componentInstance;
    for (let i = 0; i < 50; i += 1) graph.zoom(1.5);
    expect(graph.view().scale).toBeLessThanOrEqual(2.4);
    for (let i = 0; i < 50; i += 1) graph.zoom(0.5);
    expect(graph.view().scale).toBeGreaterThanOrEqual(0.5);
    graph.resetView();
    expect(graph.view().scale).toBe(1);
  });

  it('dims non-neighbour nodes when one is selected', () => {
    store.selectNode('n1'); // n1 — n2 edge exists; n3 is unrelated
    fixture.detectChanges();
    const groups = nodeGroups();
    const opacities = [...groups].map((g) => g.style.opacity);
    expect(opacities).toContain('0.28'); // the non-neighbour
    expect(opacities.filter((o) => o === '1')).toHaveLength(2); // n1 + n2
  });
});
