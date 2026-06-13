process.env.NEURANET_DB_PATH = ':memory:';

import { beforeEach, describe, expect, it } from 'vitest';

const { default: db } = await import('../db.ts');
const { getNetworkSnapshot, getReportsSnapshot } = await import('./read-repository.ts');

beforeEach(() => {
  db.exec(`
    DELETE FROM doc_node_links;
    DELETE FROM node_links;
    DELETE FROM derived_nodes;
    DELETE FROM derived_clusters;
    DELETE FROM docs;
    DELETE FROM data_sources;
  `);
});

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
    'INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, depth, is_central, sentiment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run('n-alpha-1', 'Climate', 'Climate change discussion', 'c-alpha', 14, 8, 0, 1, 0.4);
  db.prepare(
    'INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, depth, is_central) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run('n-alpha-2', 'Renewable', 'Solar and wind power', 'c-alpha', 12, 6, 1, 0);
  db.prepare(
    'INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, depth, is_central) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run('n-beta-1', 'Genomics', 'Gene sequencing techniques', 'c-beta', 14, 8, 0, 0);
  db.prepare('INSERT INTO node_links (source_slug, target_slug, link_kind) VALUES (?, ?, ?)').run(
    'n-alpha-1',
    'n-alpha-2',
    'same-doc',
  );
  db.prepare('INSERT INTO node_links (source_slug, target_slug, link_kind) VALUES (?, ?, ?)').run(
    'n-alpha-1',
    'n-beta-1',
    'related',
  );
  db.prepare('INSERT INTO docs (title, text, status) VALUES (?, ?, ?)').run(
    'Climate Brief',
    'Climate change requires renewable energy and carbon capture.',
    'derived',
  );
  db.prepare(
    'INSERT INTO data_sources (source_type, config_json, status, status_message) VALUES (?, ?, ?, ?)',
  ).run('reddit', '{"subreddit":"science"}', 'ready', null);
}

describe('read repository', () => {
  it('returns the network snapshot with computed degrees and boolean flags', () => {
    seedFixture();

    const snapshot = getNetworkSnapshot();

    expect(snapshot.derivedClusters).toEqual([
      { id: 'c-alpha', label: 'Alpha', color: '#22D3EE' },
      { id: 'c-beta', label: 'Beta', color: '#A78BFA' },
    ]);
    expect(snapshot.derivedEdges).toEqual([
      { source: 'n-alpha-1', target: 'n-alpha-2', kind: 'same-doc' },
      { source: 'n-alpha-1', target: 'n-beta-1', kind: 'related' },
    ]);
    expect(snapshot.derivedNodes).toEqual([
      {
        id: 'n-alpha-1',
        label: 'Climate',
        desc: 'Climate change discussion',
        cluster: 'c-alpha',
        r: 14,
        importance: 8,
        depth: 0,
        isCentral: true,
        sentiment: 0.4,
        degree: 2,
      },
      {
        id: 'n-alpha-2',
        label: 'Renewable',
        desc: 'Solar and wind power',
        cluster: 'c-alpha',
        r: 12,
        importance: 6,
        depth: 1,
        isCentral: false,
        sentiment: undefined,
        degree: 1,
      },
      {
        id: 'n-beta-1',
        label: 'Genomics',
        desc: 'Gene sequencing techniques',
        cluster: 'c-beta',
        r: 14,
        importance: 8,
        depth: 0,
        isCentral: false,
        sentiment: undefined,
        degree: 1,
      },
    ]);
  });

  it('returns report totals and cluster distribution sorted by count then label', () => {
    seedFixture();

    const report = getReportsSnapshot();

    expect(report.totals).toEqual({
      nodes: 3,
      clusters: 2,
      edges: 2,
      sources: 1,
      docs: 1,
    });
    expect(report.clusterDistribution).toEqual([
      { id: 'c-alpha', label: 'Alpha', color: '#22D3EE', count: 2 },
      { id: 'c-beta', label: 'Beta', color: '#A78BFA', count: 1 },
    ]);
  });
});
