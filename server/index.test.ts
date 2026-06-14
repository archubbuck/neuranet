/**
 * Integration tests for the Express API. Requires a running Postgres
 * instance specified by POSTGRES_URL. In CI this is provided by the
 * postgres service container; for local dev set POSTGRES_URL or run
 * `vercel env pull .env.local`.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { and, eq, sql, or } from 'drizzle-orm';

// ESM hoists static imports above module code. Use vi.hoisted() to set
// the env var before any module in the import chain reads it.
vi.hoisted(() => {
  process.env.POSTGRES_URL =
    process.env['POSTGRES_URL'] || 'postgres://postgres:postgres@localhost:5432/neuranet_test';
});

import { app } from './index';
import { drizzle } from './db';
import * as s from './db/schema';
import { fetchThread } from './reddit-fetcher';

// Mock reddit-fetcher for tests that override fetchThread behaviour.
vi.mock('./reddit-fetcher', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./reddit-fetcher')>();
  return { ...mod, fetchThread: vi.fn(mod.fetchThread) };
});

let server: ReturnType<typeof app.listen>;
let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(resolve));
});

beforeEach(async () => {
  // Reset all tables to keep tests isolated.
  await drizzle.delete(s.docNodeLinks);
  await drizzle.delete(s.nodeLinks);
  await drizzle.delete(s.derivedNodes);
  await drizzle.delete(s.derivedClusters);
  await drizzle.delete(s.docs);
  await drizzle.delete(s.dataSources);
  await drizzle.delete(s.waitlistEntries);
});

/** Minimal JSON request helper — avoids a supertest dependency. */
async function request(
  method: string,
  pathname: string,
  body?: unknown,
): Promise<{ status: number; body: any }> {
  const url = baseUrl + pathname;
  const init: RequestInit = { method, headers: {} };
  if (body !== undefined) {
    (init.headers as Record<string, string>)['content-type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { status: res.status, body: data };
}

/**
 * Seed the global dataset with two clusters, three nodes, one edge, and
 * one doc so search/reports/CRUD tests have something to act on.
 */
async function seedFixture() {
  await drizzle.insert(s.derivedClusters).values([
    { slug: 'c-alpha', label: 'Alpha', color: '#22D3EE' },
    { slug: 'c-beta', label: 'Beta', color: '#A78BFA' },
  ]);
  await drizzle.insert(s.derivedNodes).values([
    {
      slug: 'n-alpha-1',
      label: 'Climate',
      description: 'Climate change discussion',
      clusterSlug: 'c-alpha',
      radius: 14,
      importance: 8,
    },
    {
      slug: 'n-alpha-2',
      label: 'Renewable',
      description: 'Solar and wind power',
      clusterSlug: 'c-alpha',
      radius: 12,
      importance: 6,
    },
    {
      slug: 'n-beta-1',
      label: 'Genomics',
      description: 'Gene sequencing techniques',
      clusterSlug: 'c-beta',
      radius: 14,
      importance: 8,
    },
  ]);
  await drizzle.insert(s.nodeLinks).values({
    sourceSlug: 'n-alpha-1',
    targetSlug: 'n-alpha-2',
    linkKind: 'same-doc',
  });
  await drizzle.insert(s.docs).values({
    title: 'Climate Brief',
    text: 'Climate change requires renewable energy and carbon capture.',
    status: 'derived',
  });
}

describe('GET /api/search', () => {
  it('returns empty results for queries shorter than 2 chars', async () => {
    await seedFixture();
    const res = await request('GET', '/api/search?q=a');
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
  });

  it('matches node labels and ranks them above body-only hits', async () => {
    await seedFixture();
    const res = await request('GET', '/api/search?q=climate');
    expect(res.status).toBe(200);
    const hits = res.body.results;
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].type).toBe('node');
    expect(hits[0].label).toBe('Climate');
  });

  it('returns doc hits with snippets including the needle', async () => {
    await seedFixture();
    const res = await request('GET', '/api/search?q=carbon');
    expect(res.status).toBe(200);
    const docHit = res.body.results.find((r: any) => r.type === 'doc');
    expect(docHit).toBeDefined();
    expect(docHit.snippet.toLowerCase()).toContain('carbon');
  });
});

describe('GET /api/reports', () => {
  it('returns totals and per-cluster counts', async () => {
    await seedFixture();
    const res = await request('GET', '/api/reports');
    expect(res.status).toBe(200);
    expect(res.body.totals).toEqual({
      nodes: 3,
      clusters: 2,
      edges: 1,
      sources: 0,
      docs: 1,
    });
    const dist = res.body.clusterDistribution;
    expect(dist).toHaveLength(2);
    expect(dist[0]).toMatchObject({ id: 'c-alpha', count: 2 });
    expect(dist[1]).toMatchObject({ id: 'c-beta', count: 1 });
  });
});

describe('POST /api/clusters', () => {
  it('creates a new cluster with a slug derived from the label', async () => {
    await seedFixture();
    const res = await request('POST', '/api/clusters', { label: 'Gamma' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('gamma');
    expect(res.body.label).toBe('Gamma');
    expect(res.body.color).toMatch(/^hsl\(/);
    const [row] = await drizzle
      .select()
      .from(s.derivedClusters)
      .where(eq(s.derivedClusters.slug, 'gamma'));
    expect(row).toBeTruthy();
    expect(row.label).toBe('Gamma');
  });

  it('accepts an explicit color', async () => {
    await seedFixture();
    const res = await request('POST', '/api/clusters', { label: 'Delta', color: '#FF00FF' });
    expect(res.status).toBe(201);
    expect(res.body.color).toBe('#FF00FF');
  });

  it('rejects an empty label with 400', async () => {
    const res = await request('POST', '/api/clusters', { label: '' });
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate slug with 409', async () => {
    await seedFixture();
    const res = await request('POST', '/api/clusters', { label: 'c-alpha' });
    expect(res.status).toBe(409);
  });
});

describe('PUT /api/clusters/:slug', () => {
  it('renames the cluster and persists the change', async () => {
    await seedFixture();
    const res = await request('PUT', '/api/clusters/c-alpha', {
      label: 'Alpha Renamed',
      color: '#FFFFFF',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'c-alpha', label: 'Alpha Renamed', color: '#FFFFFF' });
    const [row] = await drizzle
      .select({ label: s.derivedClusters.label, color: s.derivedClusters.color })
      .from(s.derivedClusters)
      .where(eq(s.derivedClusters.slug, 'c-alpha'));
    expect(row.label).toBe('Alpha Renamed');
  });

  it('rejects an empty label with 400', async () => {
    await seedFixture();
    const res = await request('PUT', '/api/clusters/c-alpha', { label: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown cluster', async () => {
    await seedFixture();
    const res = await request('PUT', '/api/clusters/nope', { label: 'x' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/clusters/:slug', () => {
  it('removes the cluster and its child nodes + edges', async () => {
    await seedFixture();
    const res = await request('DELETE', '/api/clusters/c-alpha');
    expect(res.status).toBe(200);
    const [{ n: clusterCount }] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.derivedClusters);
    expect(clusterCount).toBe(1);
    const [{ n: nodeCount }] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.derivedNodes);
    expect(nodeCount).toBe(1);
    const [{ n: edgeCount }] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.nodeLinks);
    expect(edgeCount).toBe(0);
  });
});

describe('PUT /api/nodes/:slug', () => {
  it('renames a node and reassigns its cluster', async () => {
    await seedFixture();
    const res = await request('PUT', '/api/nodes/n-alpha-1', {
      label: 'Climate (renamed)',
      clusterSlug: 'c-beta',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 'n-alpha-1',
      label: 'Climate (renamed)',
      cluster: 'c-beta',
    });
  });

  it('rejects reassignment to a cluster that does not exist', async () => {
    await seedFixture();
    const res = await request('PUT', '/api/nodes/n-alpha-1', {
      clusterSlug: 'does-not-exist',
    });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/nodes/:slug', () => {
  it('removes the node and its incident edges', async () => {
    await seedFixture();
    const res = await request('DELETE', '/api/nodes/n-alpha-1');
    expect(res.status).toBe(200);
    const [{ n: nodeCount }] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.derivedNodes);
    expect(nodeCount).toBe(2);
    const [{ n: edgeCount }] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.nodeLinks);
    expect(edgeCount).toBe(0);
  });
});

describe('POST /api/nodes', () => {
  it('creates a new node in an existing cluster', async () => {
    await seedFixture();
    const res = await request('POST', '/api/nodes', {
      label: 'Neural Networks',
      clusterSlug: 'c-alpha',
      desc: 'Deep learning topic',
    });
    expect(res.status).toBe(201);
    expect(res.body.label).toBe('Neural Networks');
    expect(res.body.cluster).toBe('c-alpha');
    expect(res.body.id).toBe('neural-networks');
    const [row] = await drizzle
      .select()
      .from(s.derivedNodes)
      .where(eq(s.derivedNodes.slug, 'neural-networks'));
    expect(row).toBeTruthy();
    expect(row.label).toBe('Neural Networks');
  });

  it('rejects creation when label is empty', async () => {
    await seedFixture();
    const res = await request('POST', '/api/nodes', { label: '', clusterSlug: 'c-alpha' });
    expect(res.status).toBe(400);
  });

  it('rejects creation when clusterSlug is missing', async () => {
    await seedFixture();
    const res = await request('POST', '/api/nodes', { label: 'Test' });
    expect(res.status).toBe(400);
  });

  it('rejects creation when cluster does not exist', async () => {
    await seedFixture();
    const res = await request('POST', '/api/nodes', {
      label: 'Test',
      clusterSlug: 'no-such-cluster',
    });
    expect(res.status).toBe(400);
  });

  it('rejects duplicate slug with 409', async () => {
    await seedFixture();
    await request('POST', '/api/nodes', { label: 'Unique Node', clusterSlug: 'c-alpha' });
    const res = await request('POST', '/api/nodes', {
      label: 'Unique Node',
      clusterSlug: 'c-beta',
    });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/nodes/merge', () => {
  it('merges source nodes into the target, reassigning edges', async () => {
    await seedFixture();
    await drizzle.insert(s.nodeLinks).values({
      sourceSlug: 'n-alpha-2',
      targetSlug: 'n-beta-1',
      linkKind: 'related-topic',
    });

    const res = await request('POST', '/api/nodes/merge', {
      targetSlug: 'n-alpha-1',
      sourceSlugs: ['n-alpha-2'],
    });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('n-alpha-1');

    const [deleted] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.derivedNodes)
      .where(eq(s.derivedNodes.slug, 'n-alpha-2'));
    expect(deleted.n).toBe(0);
    const [kept] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.derivedNodes)
      .where(eq(s.derivedNodes.slug, 'n-alpha-1'));
    expect(kept.n).toBe(1);

    const [edge] = await drizzle
      .select()
      .from(s.nodeLinks)
      .where(
        and(
          eq(s.nodeLinks.sourceSlug, 'n-alpha-1'),
          eq(s.nodeLinks.targetSlug, 'n-beta-1'),
          eq(s.nodeLinks.linkKind, 'related-topic'),
        ),
      );
    expect(edge).toBeTruthy();
  });

  it('rejects merge when target is in sourceSlugs', async () => {
    await seedFixture();
    const res = await request('POST', '/api/nodes/merge', {
      targetSlug: 'n-alpha-1',
      sourceSlugs: ['n-alpha-1', 'n-alpha-2'],
    });
    expect(res.status).toBe(400);
  });

  it('merges nodes that share a common neighbour without violating edge uniqueness', async () => {
    await seedFixture();
    await drizzle.insert(s.nodeLinks).values({
      sourceSlug: 'n-alpha-1',
      targetSlug: 'n-beta-1',
      linkKind: 'related-topic',
    });
    await drizzle.insert(s.nodeLinks).values({
      sourceSlug: 'n-alpha-2',
      targetSlug: 'n-beta-1',
      linkKind: 'related-topic',
    });

    const res = await request('POST', '/api/nodes/merge', {
      targetSlug: 'n-alpha-1',
      sourceSlugs: ['n-alpha-2'],
    });
    expect(res.status).toBe(200);

    const [dupes] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.nodeLinks)
      .where(and(eq(s.nodeLinks.sourceSlug, 'n-alpha-1'), eq(s.nodeLinks.targetSlug, 'n-beta-1')));
    expect(dupes.n).toBe(1);
    const [stale] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.nodeLinks)
      .where(or(eq(s.nodeLinks.sourceSlug, 'n-alpha-2'), eq(s.nodeLinks.targetSlug, 'n-alpha-2')));
    expect(stale.n).toBe(0);
  });

  it('drops edges between target and source instead of leaving self-loops', async () => {
    await seedFixture();
    const res = await request('POST', '/api/nodes/merge', {
      targetSlug: 'n-alpha-1',
      sourceSlugs: ['n-alpha-2'],
    });
    expect(res.status).toBe(200);

    const [{ n: selfLoops }] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.nodeLinks)
      .where(eq(s.nodeLinks.sourceSlug, s.nodeLinks.targetSlug));
    expect(selfLoops).toBe(0);
  });

  it('drops edges between two merged sources instead of leaving self-loops', async () => {
    await seedFixture();
    await drizzle.insert(s.nodeLinks).values({
      sourceSlug: 'n-alpha-2',
      targetSlug: 'n-beta-1',
      linkKind: 'same-doc',
    });

    const res = await request('POST', '/api/nodes/merge', {
      targetSlug: 'n-alpha-1',
      sourceSlugs: ['n-alpha-2', 'n-beta-1'],
    });
    expect(res.status).toBe(200);

    const [{ n: selfLoops }] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.nodeLinks)
      .where(eq(s.nodeLinks.sourceSlug, s.nodeLinks.targetSlug));
    expect(selfLoops).toBe(0);
    const [{ n: nodeCount }] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.derivedNodes);
    expect(nodeCount).toBe(1);
  });

  it('rejects merge when target does not exist', async () => {
    await seedFixture();
    const res = await request('POST', '/api/nodes/merge', {
      targetSlug: 'no-such',
      sourceSlugs: ['n-alpha-1'],
    });
    expect(res.status).toBe(404);
  });

  it('rejects merge when a source does not exist', async () => {
    await seedFixture();
    const res = await request('POST', '/api/nodes/merge', {
      targetSlug: 'n-alpha-1',
      sourceSlugs: ['no-such-node'],
    });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/nodes/bulk-reassign', () => {
  it('reassigns multiple nodes to a different cluster', async () => {
    await seedFixture();
    const res = await request('POST', '/api/nodes/bulk-reassign', {
      nodeSlugs: ['n-alpha-1', 'n-alpha-2'],
      clusterSlug: 'c-beta',
    });
    expect(res.status).toBe(200);
    expect(res.body.reassigned).toBe(2);
    expect(res.body.clusterSlug).toBe('c-beta');

    const [n1] = await drizzle
      .select({ clusterSlug: s.derivedNodes.clusterSlug })
      .from(s.derivedNodes)
      .where(eq(s.derivedNodes.slug, 'n-alpha-1'));
    expect(n1.clusterSlug).toBe('c-beta');
    const [n2] = await drizzle
      .select({ clusterSlug: s.derivedNodes.clusterSlug })
      .from(s.derivedNodes)
      .where(eq(s.derivedNodes.slug, 'n-alpha-2'));
    expect(n2.clusterSlug).toBe('c-beta');
  });

  it('rejects empty nodeSlugs', async () => {
    await seedFixture();
    const res = await request('POST', '/api/nodes/bulk-reassign', {
      nodeSlugs: [],
      clusterSlug: 'c-beta',
    });
    expect(res.status).toBe(400);
  });

  it('rejects missing clusterSlug', async () => {
    await seedFixture();
    const res = await request('POST', '/api/nodes/bulk-reassign', {
      nodeSlugs: ['n-alpha-1'],
    });
    expect(res.status).toBe(400);
  });

  it('rejects if the target cluster does not exist', async () => {
    await seedFixture();
    const res = await request('POST', '/api/nodes/bulk-reassign', {
      nodeSlugs: ['n-alpha-1'],
      clusterSlug: 'no-such',
    });
    expect(res.status).toBe(400);
  });
});

describe('Source CRUD', () => {
  it('creates a source via POST /api/sources', async () => {
    const res = await request('POST', '/api/sources', {
      sourceType: 'reddit',
      config: { threadUrl: 'https://www.reddit.com/r/x/comments/abc/' },
    });
    expect(res.status).toBe(201);
    expect(res.body.source_type).toBe('reddit');
    expect(res.body.config.threadUrl).toContain('reddit.com');
  });

  it('lists sources via GET /api/sources', async () => {
    await request('POST', '/api/sources', {
      sourceType: 'reddit',
      config: { threadUrl: 'https://www.reddit.com/r/x/comments/abc/' },
    });
    const res = await request('GET', '/api/sources');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('deletes a source via DELETE /api/sources/:id', async () => {
    const created = await request('POST', '/api/sources', {
      sourceType: 'reddit',
      config: { threadUrl: 'https://www.reddit.com/r/x/comments/abc/' },
    });
    const res = await request('DELETE', `/api/sources/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
  });
});

describe('POST /api/clusters/dissolve', () => {
  it('atomically reassigns nodes to the target and deletes source clusters', async () => {
    await seedFixture();
    const res = await request('POST', '/api/clusters/dissolve', {
      sourceSlugs: ['c-alpha'],
      targetSlug: 'c-beta',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ reassigned: 2, targetSlug: 'c-beta' });

    const [{ n: reassignedCount }] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.derivedNodes)
      .where(eq(s.derivedNodes.clusterSlug, 'c-beta'));
    expect(reassignedCount).toBe(3);
    const [{ n: alphaGone }] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.derivedClusters)
      .where(eq(s.derivedClusters.slug, 'c-alpha'));
    expect(alphaGone).toBe(0);
    const [{ n: edgeCount }] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.nodeLinks);
    expect(edgeCount).toBe(1);
  });

  it('supports dissolving multiple source clusters at once (merge)', async () => {
    await seedFixture();
    await drizzle.insert(s.derivedClusters).values({
      slug: 'c-gamma',
      label: 'Gamma',
      color: '#FFFFFF',
    });
    const res = await request('POST', '/api/clusters/dissolve', {
      sourceSlugs: ['c-alpha', 'c-beta'],
      targetSlug: 'c-gamma',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ reassigned: 3, targetSlug: 'c-gamma' });
    const [{ n: clusterCount }] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.derivedClusters);
    expect(clusterCount).toBe(1);
  });

  it('rejects when the target is among the sources', async () => {
    await seedFixture();
    const res = await request('POST', '/api/clusters/dissolve', {
      sourceSlugs: ['c-alpha', 'c-beta'],
      targetSlug: 'c-alpha',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when the target cluster does not exist', async () => {
    await seedFixture();
    const res = await request('POST', '/api/clusters/dissolve', {
      sourceSlugs: ['c-alpha'],
      targetSlug: 'no-such',
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when a source cluster does not exist', async () => {
    await seedFixture();
    const res = await request('POST', '/api/clusters/dissolve', {
      sourceSlugs: ['no-such'],
      targetSlug: 'c-beta',
    });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/nodes/bulk-delete', () => {
  it('deletes multiple nodes and their incident edges atomically', async () => {
    await seedFixture();
    const res = await request('POST', '/api/nodes/bulk-delete', {
      nodeSlugs: ['n-alpha-1', 'n-alpha-2'],
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ deleted: 2 });
    const [{ n: nodeCount }] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.derivedNodes);
    expect(nodeCount).toBe(1);
    const [{ n: edgeCount }] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.nodeLinks);
    expect(edgeCount).toBe(0);
  });

  it('rejects an empty nodeSlugs array', async () => {
    await seedFixture();
    const res = await request('POST', '/api/nodes/bulk-delete', { nodeSlugs: [] });
    expect(res.status).toBe(400);
  });

  it('returns 404 when any node does not exist (and deletes nothing)', async () => {
    await seedFixture();
    const res = await request('POST', '/api/nodes/bulk-delete', {
      nodeSlugs: ['n-alpha-1', 'no-such'],
    });
    expect(res.status).toBe(404);
    const [{ n: nodeCount }] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.derivedNodes);
    expect(nodeCount).toBe(3);
  });
});

describe('GET /api/network', () => {
  it('returns clusters, nodes (with degree), and edges', async () => {
    await seedFixture();
    const res = await request('GET', '/api/network');
    expect(res.status).toBe(200);

    expect(res.body.derivedClusters).toHaveLength(2);
    expect(res.body.derivedClusters[0]).toMatchObject({
      id: 'c-alpha',
      label: 'Alpha',
      color: '#22D3EE',
    });

    expect(res.body.derivedNodes).toHaveLength(3);
    const n1 = res.body.derivedNodes.find((n: any) => n.id === 'n-alpha-1');
    expect(n1).toMatchObject({ label: 'Climate', cluster: 'c-alpha', degree: 1 });
    expect(typeof n1.isCentral).toBe('boolean');

    expect(res.body.derivedEdges).toEqual([
      { source: 'n-alpha-1', target: 'n-alpha-2', kind: 'same-doc' },
    ]);
  });

  it('returns empty arrays when the database is empty', async () => {
    const res = await request('GET', '/api/network');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ derivedClusters: [], derivedNodes: [], derivedEdges: [] });
  });
});

describe('POST /api/docs (derivation)', () => {
  it('creates the doc and derives a cluster, nodes, links, and chain edges', async () => {
    const res = await request('POST', '/api/docs', {
      title: 'Solar Energy Brief',
      text: 'Solar power adoption is accelerating. Solar panels and battery storage costs are falling while grid demand for renewable energy keeps growing.',
    });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Solar Energy Brief');
    expect(res.body.derivedNodeSlugs.length).toBeGreaterThan(0);
    expect(res.body.derivedNodeSlugs.length).toBeLessThanOrEqual(4);

    const [{ n: clusterCount }] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.derivedClusters);
    expect(clusterCount).toBe(1);
    const [{ n: linkCount }] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.docNodeLinks)
      .where(eq(s.docNodeLinks.docId, res.body.id));
    expect(linkCount).toBe(res.body.derivedNodeSlugs.length);
    const [{ n: edgeCount }] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.nodeLinks);
    expect(edgeCount).toBe(res.body.derivedNodeSlugs.length - 1);
  });

  it('defaults the title when omitted', async () => {
    const res = await request('POST', '/api/docs', {
      text: 'renewable energy policy and carbon pricing mechanisms',
    });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Untitled document');
  });

  it('rejects when text is empty', async () => {
    const res = await request('POST', '/api/docs', { title: 'x', text: '   ' });
    expect(res.status).toBe(400);
  });

  it('lists created docs with derived node slugs via GET /api/docs', async () => {
    await request('POST', '/api/docs', {
      title: 'Doc A',
      text: 'machine learning models require quality training data pipelines',
    });
    const res = await request('GET', '/api/docs');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Doc A');
    expect(Array.isArray(res.body[0].derivedNodeSlugs)).toBe(true);
    expect(res.body[0].derivedNodeSlugs.length).toBeGreaterThan(0);
  });
});

describe('write atomicity', () => {
  afterEach(async () => {
    await drizzle.execute(sql`DROP TRIGGER IF EXISTS boom_doc_node_links ON doc_node_links`);
    await drizzle.execute(sql`DROP TRIGGER IF EXISTS boom_node_links ON node_links`);
    await drizzle.execute(sql`DROP FUNCTION IF EXISTS boom`);
    vi.mocked(fetchThread).mockReset();
  });

  it('POST /api/docs rolls back the doc row when node derivation fails', async () => {
    await drizzle.execute(sql`
      CREATE OR REPLACE FUNCTION boom() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'injected failure';
      END;
      $$ LANGUAGE plpgsql
    `);
    await drizzle.execute(sql`
      CREATE TRIGGER boom_doc_node_links BEFORE INSERT ON doc_node_links
      FOR EACH ROW EXECUTE FUNCTION boom()
    `);

    const res = await request('POST', '/api/docs', {
      title: 'Atomicity probe',
      text: 'climate renewable solar wind energy policy carbon capture',
    });
    expect(res.status).toBe(500);

    const [{ n: docCount }] = await drizzle.select({ n: sql<number>`COUNT(*)::int` }).from(s.docs);
    expect(docCount).toBe(0);
    const [{ n: clusterCount }] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.derivedClusters);
    expect(clusterCount).toBe(0);
    const [{ n: nodeCount }] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.derivedNodes);
    expect(nodeCount).toBe(0);
  });

  it('POST /api/sources/:id/fetch rolls back derived rows when edge insert fails', async () => {
    vi.mocked(fetchThread).mockResolvedValue({
      threadId: 'tx1',
      title: 'Transaction probe thread about solar power and climate',
      body: 'renewable energy storage grid batteries',
      comments: [],
    });
    await drizzle.execute(sql`
      CREATE OR REPLACE FUNCTION boom() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'injected failure';
      END;
      $$ LANGUAGE plpgsql
    `);
    await drizzle.execute(sql`
      CREATE TRIGGER boom_node_links BEFORE INSERT ON node_links
      FOR EACH ROW EXECUTE FUNCTION boom()
    `);

    const created = await request('POST', '/api/sources', {
      sourceType: 'reddit',
      config: { threadUrl: 'https://www.reddit.com/r/x/comments/tx1/' },
    });
    const res = await request('POST', `/api/sources/${created.body.id}/fetch`);
    expect(res.status).toBe(500);

    const [{ n: clusterCount }] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.derivedClusters);
    expect(clusterCount).toBe(0);
    const [{ n: nodeCount }] = await drizzle
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(s.derivedNodes);
    expect(nodeCount).toBe(0);
    const [src] = await drizzle
      .select({ status: s.dataSources.status })
      .from(s.dataSources)
      .where(eq(s.dataSources.id, created.body.id));
    expect(src.status).toBe('error');
    expect(res.body.message).not.toContain('injected failure');
  });
});

describe('input validation', () => {
  it('rejects POST /api/docs with a non-string text', async () => {
    const res = await request('POST', '/api/docs', { title: 'x', text: 123 });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    const [{ n: docCount }] = await drizzle.select({ n: sql<number>`COUNT(*)::int` }).from(s.docs);
    expect(docCount).toBe(0);
  });

  it('rejects POST /api/clusters with a non-string label', async () => {
    const res = await request('POST', '/api/clusters', { label: 42 });
    expect(res.status).toBe(400);
  });

  it('rejects POST /api/nodes/merge with a non-array sourceSlugs', async () => {
    await seedFixture();
    const res = await request('POST', '/api/nodes/merge', {
      targetSlug: 'n-alpha-1',
      sourceSlugs: 'n-alpha-2',
    });
    expect(res.status).toBe(400);
  });

  it('rejects POST /api/sources with a non-object config', async () => {
    const res = await request('POST', '/api/sources', { sourceType: 'reddit', config: 'nope' });
    expect(res.status).toBe(400);
  });

  it('rejects PUT /api/nodes/:slug with a non-string clusterSlug', async () => {
    await seedFixture();
    const res = await request('PUT', '/api/nodes/n-alpha-1', { clusterSlug: 99 });
    expect(res.status).toBe(400);
  });
});

describe('rate limiting', () => {
  it('throttles repeated fetches of the same source with 429', async () => {
    let last: { status: number; body: any };
    for (let i = 0; i < 6; i += 1) {
      last = await request('POST', '/api/sources/999999/fetch');
    }
    expect(last!.status).toBe(429);
  });
});
