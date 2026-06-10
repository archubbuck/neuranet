import { describe, expect, it } from 'vitest';
import {
  VIEW_HEIGHT,
  VIEW_WIDTH,
  buildAdjacency,
  layoutEdges,
  layoutNodes,
} from './network-layout';
import type { Cluster, Edge, Node } from '../../data/types';

function node(partial: Partial<Node> & { id: string; cluster: string }): Node {
  return {
    label: partial.id,
    desc: null,
    r: 14,
    importance: 4,
    depth: 1,
    isCentral: false,
    degree: 0,
    ...partial,
  };
}

describe('network-layout', () => {
  const clusters: readonly Cluster[] = [
    { id: 'c1', label: 'C1', color: '#22D3EE' },
    { id: 'c2', label: 'C2', color: '#A78BFA' },
  ];

  it('returns no nodes for an empty graph', () => {
    expect(layoutNodes([], clusters)).toEqual([]);
  });

  it('places central nodes at their cluster centre', () => {
    const central = node({ id: 'c1-hub', cluster: 'c1', isCentral: true });
    const placed = layoutNodes([central], clusters);
    expect(placed).toHaveLength(1);
    const p = placed[0];
    // Cluster c1 sits at angle -90deg from canvas centre.
    expect(p.cx).toBeCloseTo(VIEW_WIDTH / 2, 1);
    expect(p.cy).toBeLessThan(VIEW_HEIGHT / 2);
  });

  it('honours pre-supplied coordinates verbatim', () => {
    const pinned = node({ id: 'pin', cluster: 'c1', cx: 100, cy: 200, isCentral: true });
    const placed = layoutNodes([pinned], clusters);
    expect(placed[0].cx).toBe(100);
    expect(placed[0].cy).toBe(200);
  });

  it('rings non-central nodes around the cluster centre', () => {
    const ring = [
      node({ id: 'a', cluster: 'c1' }),
      node({ id: 'b', cluster: 'c1' }),
      node({ id: 'c', cluster: 'c1' }),
    ];
    const placed = layoutNodes(ring, clusters);
    // All 3 should land on the same ring radius around the cluster centre,
    // so distances from centre should match.
    const distances = placed.map((p) => Math.hypot(p.cx - placed[0].cx, p.cy - placed[0].cy));
    // At least two have non-zero distance from the first (i.e. they spread out).
    expect(distances.filter((d) => d > 0).length).toBeGreaterThanOrEqual(2);
  });

  it('drops edges referencing unknown nodes', () => {
    const nodes = layoutNodes([node({ id: 'a', cluster: 'c1', isCentral: true })], clusters);
    const edges: Edge[] = [{ source: 'a', target: 'missing', kind: 'same-doc' }];
    expect(layoutEdges(edges, nodes)).toEqual([]);
  });

  it('builds a symmetric adjacency index', () => {
    const edges: Edge[] = [
      { source: 'a', target: 'b', kind: 'same-doc' },
      { source: 'b', target: 'c', kind: 'same-doc' },
    ];
    const adj = buildAdjacency(edges);
    expect(adj.get('a')?.has('b')).toBe(true);
    expect(adj.get('b')?.has('a')).toBe(true);
    expect(adj.get('b')?.has('c')).toBe(true);
    expect(adj.get('c')?.has('b')).toBe(true);
    expect(adj.get('c')?.has('a') ?? false).toBe(false);
  });
});
