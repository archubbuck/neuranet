import type { Cluster, Edge, Node } from '../../data/types';

/**
 * Geometry helpers for the network view.
 *
 * The backend doesn't currently emit `cx`/`cy` coordinates per node, so we
 * compute a stable radial layout client-side:
 *
 *   • Clusters get evenly-spaced angular slots around the canvas centre.
 *   • Central nodes (`isCentral`) sit at the cluster centre.
 *   • Non-central nodes ring their cluster at a radius proportional to
 *     `depth` and `importance`.
 *
 * The layout is **pure** — same input always produces same output — so it
 * plays well with signals (computed never re-runs the same calculation).
 */

export interface PositionedNode extends Node {
	readonly cx: number;
	readonly cy: number;
}

export interface PositionedEdge {
	readonly key: string;
	readonly from: PositionedNode;
	readonly to: PositionedNode;
	readonly kind: string;
}

export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 560;

const CX = VIEW_WIDTH / 2;
const CY = VIEW_HEIGHT / 2;
const CLUSTER_RING_RADIUS = 200;
const NODE_RING_BASE = 70;
const NODE_RING_STEP = 30;

/**
 * Compute a deterministic radial layout for the given nodes + clusters.
 *
 * Honours pre-supplied `cx`/`cy` (some seed datasets ship coordinates).
 */
export function layoutNodes(
	nodes: readonly Node[],
	clusters: readonly Cluster[],
): readonly PositionedNode[] {
	if (nodes.length === 0) return [];

	// Order clusters deterministically. Use the order returned by the API so
	// the same dataset renders the same way across reloads.
	const clusterOrder = clusters.map((c) => c.id);
	const clusterCount = Math.max(1, clusterOrder.length);

	// Polar slot per cluster.
	const slotAngle = (2 * Math.PI) / clusterCount;
	const clusterCentres = new Map<string, { x: number; y: number }>();
	clusterOrder.forEach((id, idx) => {
		const a = idx * slotAngle - Math.PI / 2;
		clusterCentres.set(id, {
			x: CX + Math.cos(a) * CLUSTER_RING_RADIUS,
			y: CY + Math.sin(a) * CLUSTER_RING_RADIUS,
		});
	});

	// Group nodes by cluster, preserving incoming order.
	const byCluster = new Map<string, Node[]>();
	for (const n of nodes) {
		const list = byCluster.get(n.cluster);
		if (list) list.push(n);
		else byCluster.set(n.cluster, [n]);
	}

	const out: PositionedNode[] = [];
	for (const [clusterId, members] of byCluster) {
		const centre = clusterCentres.get(clusterId) ?? { x: CX, y: CY };
		// Central nodes go to the centre; ring the rest around them.
		const centrals = members.filter((m) => m.isCentral);
		const others = members.filter((m) => !m.isCentral);

		centrals.forEach((n) => {
			out.push({
				...n,
				cx: n.cx ?? centre.x,
				cy: n.cy ?? centre.y,
			});
		});

		// Ring others: split by depth, each depth gets its own ring radius.
		const byDepth = new Map<number, Node[]>();
		for (const n of others) {
			const list = byDepth.get(n.depth) ?? [];
			list.push(n);
			byDepth.set(n.depth, list);
		}
		for (const [depth, ring] of byDepth) {
			const radius = NODE_RING_BASE + Math.max(0, depth - 1) * NODE_RING_STEP;
			const step = (2 * Math.PI) / Math.max(1, ring.length);
			ring.forEach((n, i) => {
				const a = i * step;
				out.push({
					...n,
					cx: n.cx ?? centre.x + Math.cos(a) * radius,
					cy: n.cy ?? centre.y + Math.sin(a) * radius,
				});
			});
		}
	}
	return out;
}

/**
 * Pair edges with their positioned endpoints. Edges referencing unknown
 * nodes are dropped silently (data can lag a tick during refreshes).
 */
export function layoutEdges(
	edges: readonly Edge[],
	positioned: readonly PositionedNode[],
): readonly PositionedEdge[] {
	const byId = new Map<string, PositionedNode>();
	for (const n of positioned) byId.set(n.id, n);
	const out: PositionedEdge[] = [];
	for (const e of edges) {
		const from = byId.get(e.source);
		const to = byId.get(e.target);
		if (!from || !to) continue;
		out.push({ key: `${e.source}->${e.target}`, from, to, kind: e.kind });
	}
	return out;
}

/**
 * Build a quick "id → connected ids" index for hover/select highlighting.
 */
export function buildAdjacency(
	edges: readonly Edge[],
): ReadonlyMap<string, ReadonlySet<string>> {
	const out = new Map<string, Set<string>>();
	const ensure = (id: string): Set<string> => {
		const cur = out.get(id);
		if (cur) return cur;
		const fresh = new Set<string>();
		out.set(id, fresh);
		return fresh;
	};
	for (const e of edges) {
		ensure(e.source).add(e.target);
		ensure(e.target).add(e.source);
	}
	return out;
}
