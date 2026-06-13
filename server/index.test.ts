/**
 * Integration tests for the Express API. Uses an in-memory SQLite database
 * and ephemeral ports so tests are fully isolated.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// ESM hoists static imports above module code. Use vi.hoisted() to set
// the env var before any module in the import chain reads it.
vi.hoisted(() => {
  process.env.NEURANET_DB_PATH = ':memory:';
});

import { app } from './index';
import { db } from './db';
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

beforeEach(() => {
  // Reset all tables to keep tests isolated. The schema lives in
  // `:memory:` so we just truncate rather than re-create.
  db.exec(`
		DELETE FROM doc_node_links;
		DELETE FROM node_links;
		DELETE FROM derived_nodes;
		DELETE FROM derived_clusters;
		DELETE FROM docs;
		DELETE FROM data_sources;
	`);
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
function seedFixture() {
  db.prepare('INSERT INTO derived_clusters (slug, label, color) VALUES (?, ?, ?)').run(
    'c-alpha',
    'Alpha',
    '#22D3EE',
  );
  db.prepare('INSERT INTO derived_clusters (slug, label, color) VALUES (?, ?, ?)').run(
    'c-beta',
    'Beta',
    '#A78BFA',
  );
  db.prepare(
    'INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance) VALUES (?, ?, ?, ?, ?, ?)',
  ).run('n-alpha-1', 'Climate', 'Climate change discussion', 'c-alpha', 14, 8);
  db.prepare(
    'INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance) VALUES (?, ?, ?, ?, ?, ?)',
  ).run('n-alpha-2', 'Renewable', 'Solar and wind power', 'c-alpha', 12, 6);
  db.prepare(
    'INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance) VALUES (?, ?, ?, ?, ?, ?)',
  ).run('n-beta-1', 'Genomics', 'Gene sequencing techniques', 'c-beta', 14, 8);
  db.prepare('INSERT INTO node_links (source_slug, target_slug, link_kind) VALUES (?, ?, ?)').run(
    'n-alpha-1',
    'n-alpha-2',
    'same-doc',
  );
  db.prepare('INSERT INTO docs (title, text, status) VALUES (?, ?, ?)').run(
    'Climate Brief',
    'Climate change requires renewable energy and carbon capture.',
    'derived',
  );
}

describe('GET /api/search', () => {
  it('returns empty results for queries shorter than 2 chars', async () => {
    seedFixture();
    const res = await request('GET', '/api/search?q=a');
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
  });

  it('matches node labels and ranks them above body-only hits', async () => {
    seedFixture();
    const res = await request('GET', '/api/search?q=climate');
    expect(res.status).toBe(200);
    const hits = res.body.results;
    expect(hits.length).toBeGreaterThan(0);
    // First hit should be a node whose label matches.
    expect(hits[0].type).toBe('node');
    expect(hits[0].label).toBe('Climate');
  });

  it('returns doc hits with snippets including the needle', async () => {
    seedFixture();
    const res = await request('GET', '/api/search?q=carbon');
    expect(res.status).toBe(200);
    const docHit = res.body.results.find((r: any) => r.type === 'doc');
    expect(docHit).toBeDefined();
    expect(docHit.snippet.toLowerCase()).toContain('carbon');
  });
});

describe('GET /api/reports', () => {
  it('returns totals and per-cluster counts', async () => {
    seedFixture();
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
    seedFixture();
    const res = await request('POST', '/api/clusters', { label: 'Gamma' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('gamma');
    expect(res.body.label).toBe('Gamma');
    expect(res.body.color).toMatch(/^hsl\(/);
    const row = db.prepare('SELECT * FROM derived_clusters WHERE slug = ?').get('gamma') as any;
    expect(row).toBeTruthy();
    expect(row.label).toBe('Gamma');
  });

  it('accepts an explicit color', async () => {
    seedFixture();
    const res = await request('POST', '/api/clusters', { label: 'Delta', color: '#FF00FF' });
    expect(res.status).toBe(201);
    expect(res.body.color).toBe('#FF00FF');
  });

  it('rejects an empty label with 400', async () => {
    const res = await request('POST', '/api/clusters', { label: '' });
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate slug with 409', async () => {
    seedFixture();
    const res = await request('POST', '/api/clusters', { label: 'c-alpha' });
    expect(res.status).toBe(409);
  });
});

describe('PUT /api/clusters/:slug', () => {
  it('renames the cluster and persists the change', async () => {
    seedFixture();
    const res = await request('PUT', '/api/clusters/c-alpha', {
      label: 'Alpha Renamed',
      color: '#FFFFFF',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'c-alpha', label: 'Alpha Renamed', color: '#FFFFFF' });
    const row = db
      .prepare('SELECT label, color FROM derived_clusters WHERE slug = ?')
      .get('c-alpha') as any;
    expect(row.label).toBe('Alpha Renamed');
  });

  it('rejects an empty label with 400', async () => {
    seedFixture();
    const res = await request('PUT', '/api/clusters/c-alpha', { label: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown cluster', async () => {
    seedFixture();
    const res = await request('PUT', '/api/clusters/nope', { label: 'x' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/clusters/:slug', () => {
  it('removes the cluster and its child nodes + edges', async () => {
    seedFixture();
    const res = await request('DELETE', '/api/clusters/c-alpha');
    expect(res.status).toBe(200);
    expect((db.prepare('SELECT COUNT(*) AS n FROM derived_clusters').get() as any).n).toBe(1);
    expect((db.prepare('SELECT COUNT(*) AS n FROM derived_nodes').get() as any).n).toBe(1);
    expect((db.prepare('SELECT COUNT(*) AS n FROM node_links').get() as any).n).toBe(0);
  });
});

describe('PUT /api/nodes/:slug', () => {
  it('renames a node and reassigns its cluster', async () => {
    seedFixture();
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
    seedFixture();
    const res = await request('PUT', '/api/nodes/n-alpha-1', {
      clusterSlug: 'does-not-exist',
    });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/nodes/:slug', () => {
  it('removes the node and its incident edges', async () => {
    seedFixture();
    const res = await request('DELETE', '/api/nodes/n-alpha-1');
    expect(res.status).toBe(200);
    expect((db.prepare('SELECT COUNT(*) AS n FROM derived_nodes').get() as any).n).toBe(2);
    expect((db.prepare('SELECT COUNT(*) AS n FROM node_links').get() as any).n).toBe(0);
  });
});

describe('POST /api/nodes', () => {
  it('creates a new node in an existing cluster', async () => {
    seedFixture();
    const res = await request('POST', '/api/nodes', {
      label: 'Neural Networks',
      clusterSlug: 'c-alpha',
      desc: 'Deep learning topic',
    });
    expect(res.status).toBe(201);
    expect(res.body.label).toBe('Neural Networks');
    expect(res.body.cluster).toBe('c-alpha');
    expect(res.body.id).toBe('neural-networks');
    const row = db
      .prepare('SELECT * FROM derived_nodes WHERE slug = ?')
      .get('neural-networks') as any;
    expect(row).toBeTruthy();
    expect(row.label).toBe('Neural Networks');
  });

  it('rejects creation when label is empty', async () => {
    seedFixture();
    const res = await request('POST', '/api/nodes', { label: '', clusterSlug: 'c-alpha' });
    expect(res.status).toBe(400);
  });

  it('rejects creation when clusterSlug is missing', async () => {
    seedFixture();
    const res = await request('POST', '/api/nodes', { label: 'Test' });
    expect(res.status).toBe(400);
  });

  it('rejects creation when cluster does not exist', async () => {
    seedFixture();
    const res = await request('POST', '/api/nodes', {
      label: 'Test',
      clusterSlug: 'no-such-cluster',
    });
    expect(res.status).toBe(400);
  });

  it('rejects duplicate slug with 409', async () => {
    seedFixture();
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
    seedFixture();
    db.prepare('INSERT INTO node_links (source_slug, target_slug, link_kind) VALUES (?, ?, ?)').run(
      'n-alpha-2',
      'n-beta-1',
      'related-topic',
    );

    const res = await request('POST', '/api/nodes/merge', {
      targetSlug: 'n-alpha-1',
      sourceSlugs: ['n-alpha-2'],
    });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('n-alpha-1');

    expect(
      (db.prepare('SELECT COUNT(*) AS n FROM derived_nodes WHERE slug = ?').get('n-alpha-2') as any)
        .n,
    ).toBe(0);
    expect(
      (db.prepare('SELECT COUNT(*) AS n FROM derived_nodes WHERE slug = ?').get('n-alpha-1') as any)
        .n,
    ).toBe(1);

    const edge = db
      .prepare(
        "SELECT * FROM node_links WHERE source_slug = ? AND target_slug = ? AND link_kind = 'related-topic'",
      )
      .get('n-alpha-1', 'n-beta-1') as any;
    expect(edge).toBeTruthy();
  });

  it('rejects merge when target is in sourceSlugs', async () => {
    seedFixture();
    const res = await request('POST', '/api/nodes/merge', {
      targetSlug: 'n-alpha-1',
      sourceSlugs: ['n-alpha-1', 'n-alpha-2'],
    });
    expect(res.status).toBe(400);
  });

  it('merges nodes that share a common neighbour without violating edge uniqueness', async () => {
    seedFixture();
    db.prepare('INSERT INTO node_links (source_slug, target_slug, link_kind) VALUES (?, ?, ?)').run(
      'n-alpha-1',
      'n-beta-1',
      'related-topic',
    );
    db.prepare('INSERT INTO node_links (source_slug, target_slug, link_kind) VALUES (?, ?, ?)').run(
      'n-alpha-2',
      'n-beta-1',
      'related-topic',
    );

    const res = await request('POST', '/api/nodes/merge', {
      targetSlug: 'n-alpha-1',
      sourceSlugs: ['n-alpha-2'],
    });
    expect(res.status).toBe(200);

    const dupes = db
      .prepare('SELECT COUNT(*) AS n FROM node_links WHERE source_slug = ? AND target_slug = ?')
      .get('n-alpha-1', 'n-beta-1') as any;
    expect(dupes.n).toBe(1);
    const stale = db
      .prepare('SELECT COUNT(*) AS n FROM node_links WHERE source_slug = ? OR target_slug = ?')
      .get('n-alpha-2', 'n-alpha-2') as any;
    expect(stale.n).toBe(0);
  });

  it('drops edges between target and source instead of leaving self-loops', async () => {
    seedFixture();
    const res = await request('POST', '/api/nodes/merge', {
      targetSlug: 'n-alpha-1',
      sourceSlugs: ['n-alpha-2'],
    });
    expect(res.status).toBe(200);

    const selfLoops = db
      .prepare('SELECT COUNT(*) AS n FROM node_links WHERE source_slug = target_slug')
      .get() as any;
    expect(selfLoops.n).toBe(0);
  });

  it('drops edges between two merged sources instead of leaving self-loops', async () => {
    seedFixture();
    db.prepare('INSERT INTO node_links (source_slug, target_slug, link_kind) VALUES (?, ?, ?)').run(
      'n-alpha-2',
      'n-beta-1',
      'same-doc',
    );

    const res = await request('POST', '/api/nodes/merge', {
      targetSlug: 'n-alpha-1',
      sourceSlugs: ['n-alpha-2', 'n-beta-1'],
    });
    expect(res.status).toBe(200);

    const selfLoops = db
      .prepare('SELECT COUNT(*) AS n FROM node_links WHERE source_slug = target_slug')
      .get() as any;
    expect(selfLoops.n).toBe(0);
    expect((db.prepare('SELECT COUNT(*) AS n FROM derived_nodes').get() as any).n).toBe(1);
  });

  it('rejects merge when target does not exist', async () => {
    seedFixture();
    const res = await request('POST', '/api/nodes/merge', {
      targetSlug: 'no-such',
      sourceSlugs: ['n-alpha-1'],
    });
    expect(res.status).toBe(404);
  });

  it('rejects merge when a source does not exist', async () => {
    seedFixture();
    const res = await request('POST', '/api/nodes/merge', {
      targetSlug: 'n-alpha-1',
      sourceSlugs: ['no-such-node'],
    });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/nodes/bulk-reassign', () => {
  it('reassigns multiple nodes to a different cluster', async () => {
    seedFixture();
    const res = await request('POST', '/api/nodes/bulk-reassign', {
      nodeSlugs: ['n-alpha-1', 'n-alpha-2'],
      clusterSlug: 'c-beta',
    });
    expect(res.status).toBe(200);
    expect(res.body.reassigned).toBe(2);
    expect(res.body.clusterSlug).toBe('c-beta');

    const n1 = db
      .prepare('SELECT cluster_slug FROM derived_nodes WHERE slug = ?')
      .get('n-alpha-1') as any;
    expect(n1.cluster_slug).toBe('c-beta');
    const n2 = db
      .prepare('SELECT cluster_slug FROM derived_nodes WHERE slug = ?')
      .get('n-alpha-2') as any;
    expect(n2.cluster_slug).toBe('c-beta');
  });

  it('rejects empty nodeSlugs', async () => {
    seedFixture();
    const res = await request('POST', '/api/nodes/bulk-reassign', {
      nodeSlugs: [],
      clusterSlug: 'c-beta',
    });
    expect(res.status).toBe(400);
  });

  it('rejects missing clusterSlug', async () => {
    seedFixture();
    const res = await request('POST', '/api/nodes/bulk-reassign', {
      nodeSlugs: ['n-alpha-1'],
    });
    expect(res.status).toBe(400);
  });

  it('rejects if the target cluster does not exist', async () => {
    seedFixture();
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
    seedFixture();
    const res = await request('POST', '/api/clusters/dissolve', {
      sourceSlugs: ['c-alpha'],
      targetSlug: 'c-beta',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ reassigned: 2, targetSlug: 'c-beta' });

    expect(
      (
        db
          .prepare("SELECT COUNT(*) AS n FROM derived_nodes WHERE cluster_slug = 'c-beta'")
          .get() as any
      ).n,
    ).toBe(3);
    expect(
      (db.prepare("SELECT COUNT(*) AS n FROM derived_clusters WHERE slug = 'c-alpha'").get() as any)
        .n,
    ).toBe(0);
    expect((db.prepare('SELECT COUNT(*) AS n FROM node_links').get() as any).n).toBe(1);
  });

  it('supports dissolving multiple source clusters at once (merge)', async () => {
    seedFixture();
    db.prepare('INSERT INTO derived_clusters (slug, label, color) VALUES (?, ?, ?)').run(
      'c-gamma',
      'Gamma',
      '#FFFFFF',
    );
    const res = await request('POST', '/api/clusters/dissolve', {
      sourceSlugs: ['c-alpha', 'c-beta'],
      targetSlug: 'c-gamma',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ reassigned: 3, targetSlug: 'c-gamma' });
    expect((db.prepare('SELECT COUNT(*) AS n FROM derived_clusters').get() as any).n).toBe(1);
  });

  it('rejects when the target is among the sources', async () => {
    seedFixture();
    const res = await request('POST', '/api/clusters/dissolve', {
      sourceSlugs: ['c-alpha', 'c-beta'],
      targetSlug: 'c-alpha',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when the target cluster does not exist', async () => {
    seedFixture();
    const res = await request('POST', '/api/clusters/dissolve', {
      sourceSlugs: ['c-alpha'],
      targetSlug: 'no-such',
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when a source cluster does not exist', async () => {
    seedFixture();
    const res = await request('POST', '/api/clusters/dissolve', {
      sourceSlugs: ['no-such'],
      targetSlug: 'c-beta',
    });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/nodes/bulk-delete', () => {
  it('deletes multiple nodes and their incident edges atomically', async () => {
    seedFixture();
    const res = await request('POST', '/api/nodes/bulk-delete', {
      nodeSlugs: ['n-alpha-1', 'n-alpha-2'],
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ deleted: 2 });
    expect((db.prepare('SELECT COUNT(*) AS n FROM derived_nodes').get() as any).n).toBe(1);
    expect((db.prepare('SELECT COUNT(*) AS n FROM node_links').get() as any).n).toBe(0);
  });

  it('rejects an empty nodeSlugs array', async () => {
    seedFixture();
    const res = await request('POST', '/api/nodes/bulk-delete', { nodeSlugs: [] });
    expect(res.status).toBe(400);
  });

  it('returns 404 when any node does not exist (and deletes nothing)', async () => {
    seedFixture();
    const res = await request('POST', '/api/nodes/bulk-delete', {
      nodeSlugs: ['n-alpha-1', 'no-such'],
    });
    expect(res.status).toBe(404);
    expect((db.prepare('SELECT COUNT(*) AS n FROM derived_nodes').get() as any).n).toBe(3);
  });
});

describe('GET /api/network', () => {
  it('returns clusters, nodes (with degree), and edges', async () => {
    seedFixture();
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

    expect((db.prepare('SELECT COUNT(*) AS n FROM derived_clusters').get() as any).n).toBe(1);
    const links = (
      db
        .prepare('SELECT COUNT(*) AS n FROM doc_node_links WHERE doc_id = ?')
        .get(res.body.id) as any
    ).n;
    expect(links).toBe(res.body.derivedNodeSlugs.length);
    expect((db.prepare('SELECT COUNT(*) AS n FROM node_links').get() as any).n).toBe(
      res.body.derivedNodeSlugs.length - 1,
    );
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
  afterEach(() => {
    db.exec('DROP TRIGGER IF EXISTS boom_doc_node_links; DROP TRIGGER IF EXISTS boom_node_links;');
    vi.mocked(fetchThread).mockReset();
  });

  it('POST /api/docs rolls back the doc row when node derivation fails', async () => {
    db.exec(`CREATE TRIGGER boom_doc_node_links BEFORE INSERT ON doc_node_links
			BEGIN SELECT RAISE(ABORT, 'injected failure'); END;`);

    const res = await request('POST', '/api/docs', {
      title: 'Atomicity probe',
      text: 'climate renewable solar wind energy policy carbon capture',
    });
    expect(res.status).toBe(500);

    expect((db.prepare('SELECT COUNT(*) AS n FROM docs').get() as any).n).toBe(0);
    expect((db.prepare('SELECT COUNT(*) AS n FROM derived_clusters').get() as any).n).toBe(0);
    expect((db.prepare('SELECT COUNT(*) AS n FROM derived_nodes').get() as any).n).toBe(0);
  });

  it('POST /api/sources/:id/fetch rolls back derived rows when edge insert fails', async () => {
    vi.mocked(fetchThread).mockResolvedValue({
      threadId: 'tx1',
      title: 'Transaction probe thread about solar power and climate',
      body: 'renewable energy storage grid batteries',
      comments: [],
    });
    db.exec(`CREATE TRIGGER boom_node_links BEFORE INSERT ON node_links
			BEGIN SELECT RAISE(ABORT, 'injected failure'); END;`);

    const created = await request('POST', '/api/sources', {
      sourceType: 'reddit',
      config: { threadUrl: 'https://www.reddit.com/r/x/comments/tx1/' },
    });
    const res = await request('POST', `/api/sources/${created.body.id}/fetch`);
    expect(res.status).toBe(500);

    expect((db.prepare('SELECT COUNT(*) AS n FROM derived_clusters').get() as any).n).toBe(0);
    expect((db.prepare('SELECT COUNT(*) AS n FROM derived_nodes').get() as any).n).toBe(0);
    const src = db
      .prepare('SELECT status FROM data_sources WHERE id = ?')
      .get(created.body.id) as any;
    expect(src.status).toBe('error');
    expect(res.body.message).not.toContain('injected failure');
  });
});

describe('input validation', () => {
  it('rejects POST /api/docs with a non-string text', async () => {
    const res = await request('POST', '/api/docs', { title: 'x', text: 123 });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect((db.prepare('SELECT COUNT(*) AS n FROM docs').get() as any).n).toBe(0);
  });

  it('rejects POST /api/clusters with a non-string label', async () => {
    const res = await request('POST', '/api/clusters', { label: 42 });
    expect(res.status).toBe(400);
  });

  it('rejects POST /api/nodes/merge with a non-array sourceSlugs', async () => {
    seedFixture();
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
    seedFixture();
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
