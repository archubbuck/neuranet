process.env.NEURANET_DB_PATH = ':memory:';

import { beforeEach, describe, expect, it } from 'vitest';

const { default: db } = await import('../db.ts');
const { dissolveClusters, mergeNodes } = await import('./write-repository.ts');

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
    'INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, depth, is_central) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run('n-alpha-1', 'Climate', 'Climate change discussion', 'c-alpha', 14, 8, 0, 1);
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
    'n-alpha-2',
    'n-beta-1',
    'related-topic',
  );
}

describe('write repository', () => {
  it('dissolves source clusters into the target cluster', () => {
    seedFixture();

    const result = dissolveClusters('c-beta', ['c-alpha']);

    expect(result).toEqual({ reassigned: 2, deletedClusters: 1 });
    expect(
      db.prepare("SELECT COUNT(*) AS n FROM derived_nodes WHERE cluster_slug = 'c-beta'").get().n,
    ).toBe(3);
    expect(
      db.prepare("SELECT COUNT(*) AS n FROM derived_clusters WHERE slug = 'c-alpha'").get().n,
    ).toBe(0);
  });

  it('merges source nodes into the target without leaving stale links behind', () => {
    seedFixture();
    db.prepare('INSERT INTO node_links (source_slug, target_slug, link_kind) VALUES (?, ?, ?)').run(
      'n-alpha-1',
      'n-beta-1',
      'related-topic',
    );

    const merged = mergeNodes('n-alpha-1', ['n-alpha-2']);

    expect(merged).toMatchObject({
      id: 'n-alpha-1',
      label: 'Climate',
      cluster: 'c-alpha',
      isCentral: true,
      degree: 1,
    });
    expect(
      db.prepare('SELECT COUNT(*) AS n FROM derived_nodes WHERE slug = ?').get('n-alpha-2').n,
    ).toBe(0);
    expect(
      db
        .prepare('SELECT COUNT(*) AS n FROM node_links WHERE source_slug = ? OR target_slug = ?')
        .get('n-alpha-2', 'n-alpha-2').n,
    ).toBe(0);
    expect(
      db
        .prepare('SELECT COUNT(*) AS n FROM node_links WHERE source_slug = ? AND target_slug = ?')
        .get('n-alpha-1', 'n-beta-1').n,
    ).toBe(1);
  });
});
