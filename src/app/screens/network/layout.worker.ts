/**
 * Web Worker: runs ForceAtlas2 layout algorithm off the main thread.
 *
 * Communication protocol:
 *   Main → Worker: { type: 'start', graph: SerializedGraph, settings?: Fa2Settings }
 *   Main → Worker: { type: 'stop' }
 *   Worker → Main: { type: 'tick', positions: Array<{key: string, x: number, y: number}> }
 *   Worker → Main: { type: 'done' }
 */

interface SerializedGraph {
  nodes: { key: string; x: number; y: number; size: number }[];
  edges: { source: string; target: string; weight: number }[];
}

let running = false;
let timeoutId: ReturnType<typeof setTimeout> | null = null;

// Dynamic imports don't work cleanly in web workers with Angular's build.
// Instead we implement a simple force-directed iteration loop that yields
// positions back to the main thread every N iterations.
//
// The algorithm is a simplified Barnes-Hut force simulation:
//   - Repulsion between all node pairs (approximated)
//   - Attraction along edges
//   - Gravity toward center

function step(
  nodes: { key: string; x: number; y: number; size: number }[],
  edges: { source: string; target: string; weight: number }[],
  settings: { gravity: number; scalingRatio: number; slowDown: number },
): { key: string; x: number; y: number }[] {
  const forces = new Map<string, { dx: number; dy: number }>();
  for (const n of nodes) {
    forces.set(n.key, { dx: 0, dy: 0 });
  }

  // Repulsion (approximate: O(n²) — suitable for <1000 nodes)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (!a || !b) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (settings.scalingRatio * (a.size + b.size)) / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fa = forces.get(a.key)!;
      const fb = forces.get(b.key)!;
      fa.dx += fx;
      fa.dy += fy;
      fb.dx -= fx;
      fb.dy -= fy;
    }
  }

  // Attraction along edges
  for (const e of edges) {
    const s = nodes.find((n) => n.key === e.source);
    const t = nodes.find((n) => n.key === e.target);
    if (!s || !t) continue;
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const force = (dist * e.weight) / settings.scalingRatio;
    const fs = forces.get(s.key)!;
    const ft = forces.get(t.key)!;
    fs.dx += (dx / dist) * force;
    fs.dy += (dy / dist) * force;
    ft.dx -= (dx / dist) * force;
    ft.dy -= (dy / dist) * force;
  }

  // Gravity toward center
  for (const n of nodes) {
    const f = forces.get(n.key)!;
    f.dx -= n.x * settings.gravity * 0.01;
    f.dy -= n.y * settings.gravity * 0.01;
  }

  // Apply forces with slowdown
  const positions: { key: string; x: number; y: number }[] = [];
  for (const n of nodes) {
    const f = forces.get(n.key)!;
    const swing = Math.sqrt(f.dx * f.dx + f.dy * f.dy);
    const factor = Math.min(swing, 10) / (swing || 1);
    n.x += (f.dx * factor) / settings.slowDown;
    n.y += (f.dy * factor) / settings.slowDown;
    positions.push({ key: n.key, x: n.x, y: n.y });
  }

  return positions;
}

self.onmessage = (ev: MessageEvent) => {
  const msg = ev.data;

  if (msg.type === 'start') {
    running = true;
    const graph: SerializedGraph = msg.graph;
    const settings = {
      gravity: msg.settings?.gravity ?? 1,
      scalingRatio: msg.settings?.scalingRatio ?? 10,
      slowDown: msg.settings?.slowDown ?? 5,
    };
    const maxIterations = msg.settings?.maxIterations ?? 200;
    const tickEvery = msg.settings?.tickEvery ?? 10;

    let iteration = 0;

    function run() {
      if (!running) {
        self.postMessage({ type: 'done' });
        return;
      }

      for (let t = 0; t < tickEvery && iteration < maxIterations; t++, iteration++) {
        step(graph.nodes, graph.edges, settings);
      }

      self.postMessage({
        type: 'tick',
        iteration,
        maxIterations,
        positions: graph.nodes.map((n) => ({ key: n.key, x: n.x, y: n.y })),
      });

      if (iteration >= maxIterations) {
        running = false;
        self.postMessage({ type: 'done' });
        return;
      }

      timeoutId = setTimeout(run, 0);
    }

    run();
  }

  if (msg.type === 'stop') {
    running = false;
    if (timeoutId != null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }
};
