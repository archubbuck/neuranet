import db from '../db';

interface ClusterRow {
  id?: number;
  slug: string;
  label: string;
  color: string;
  created_at?: string;
}

interface NodeRow {
  id?: number;
  slug: string;
  label: string;
  description: string;
  cluster_slug: string;
  radius: number;
  importance: number;
  depth: number;
  is_central: number;
  sentiment: number | null;
  created_at?: string;
}

interface NodeSummary {
  id: string;
  label: string;
  desc: string;
  cluster: string;
  r: number;
  importance: number;
  depth: number;
  isCentral: boolean;
  degree: number;
}

export function findClusterBySlug(slug: string) {
  return db.prepare('SELECT * FROM derived_clusters WHERE slug = ?').get(slug) as
    | ClusterRow
    | undefined;
}

export function createCluster(slug: string, label: string, color: string) {
  db.prepare('INSERT INTO derived_clusters (slug, label, color) VALUES (?, ?, ?)').run(
    slug,
    label,
    color,
  );
}

export function updateCluster(slug: string, label: string, color: string) {
  db.prepare('UPDATE derived_clusters SET label = ?, color = ? WHERE slug = ?').run(
    label,
    color,
    slug,
  );
}

export function deleteCluster(slug: string) {
  db.transaction(() => {
    const nodeSlugs = (
      db.prepare('SELECT slug FROM derived_nodes WHERE cluster_slug = ?').all(slug) as Array<{
        slug: string;
      }>
    ).map((row) => row.slug);
    if (nodeSlugs.length > 0) {
      const placeholders = nodeSlugs.map(() => '?').join(',');
      db.prepare(
        `DELETE FROM node_links WHERE source_slug IN (${placeholders}) OR target_slug IN (${placeholders})`,
      ).run(...nodeSlugs, ...nodeSlugs);
      db.prepare(`DELETE FROM doc_node_links WHERE node_slug IN (${placeholders})`).run(
        ...nodeSlugs,
      );
      db.prepare(`DELETE FROM derived_nodes WHERE slug IN (${placeholders})`).run(...nodeSlugs);
    }
    db.prepare('DELETE FROM derived_clusters WHERE slug = ?').run(slug);
  })();
}

export function dissolveClusters(targetSlug: string, sourceSlugs: string[]) {
  const placeholders = sourceSlugs.map(() => '?').join(',');
  return db.transaction(() => {
    const reassigned = db
      .prepare(`UPDATE derived_nodes SET cluster_slug = ? WHERE cluster_slug IN (${placeholders})`)
      .run(targetSlug, ...sourceSlugs).changes;
    const deletedClusters = db
      .prepare(`DELETE FROM derived_clusters WHERE slug IN (${placeholders})`)
      .run(...sourceSlugs).changes;
    return { reassigned, deletedClusters };
  })();
}

export function findNodeBySlug(slug: string) {
  return db.prepare('SELECT * FROM derived_nodes WHERE slug = ?').get(slug) as NodeRow | undefined;
}

export function createNode(
  slug: string,
  label: string,
  description: string,
  clusterSlug: string,
  radius: number,
  importance: number,
  depth: number,
) {
  db.prepare(
    'INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, depth) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(slug, label, description, clusterSlug, radius, importance, depth);
}

export function updateNode(slug: string, label: string, description: string, clusterSlug: string) {
  db.prepare(
    'UPDATE derived_nodes SET label = ?, description = ?, cluster_slug = ? WHERE slug = ?',
  ).run(label, description, clusterSlug, slug);
}

export function deleteNode(slug: string) {
  db.transaction(() => {
    db.prepare('DELETE FROM node_links WHERE source_slug = ? OR target_slug = ?').run(slug, slug);
    db.prepare('DELETE FROM doc_node_links WHERE node_slug = ?').run(slug);
    db.prepare('DELETE FROM derived_nodes WHERE slug = ?').run(slug);
  })();
}

export function bulkDeleteNodes(nodeSlugs: string[]) {
  const placeholders = nodeSlugs.map(() => '?').join(',');
  return db.transaction(() => {
    db.prepare(
      `DELETE FROM node_links WHERE source_slug IN (${placeholders}) OR target_slug IN (${placeholders})`,
    ).run(...nodeSlugs, ...nodeSlugs);
    db.prepare(`DELETE FROM doc_node_links WHERE node_slug IN (${placeholders})`).run(...nodeSlugs);
    return db.prepare(`DELETE FROM derived_nodes WHERE slug IN (${placeholders})`).run(...nodeSlugs)
      .changes;
  })();
}

function getNodeSummary(slug: string) {
  const row = db
    .prepare(
      `SELECT slug AS id, label, description AS desc, cluster_slug AS cluster,
            radius AS r, importance, depth, is_central AS isCentral,
            COALESCE((SELECT COUNT(*) FROM node_links nl WHERE nl.source_slug = dn.slug OR nl.target_slug = dn.slug), 0) AS degree
       FROM derived_nodes dn WHERE dn.slug = ?`,
    )
    .get(slug) as
    | {
        id: string;
        label: string;
        desc: string;
        cluster: string;
        r: number;
        importance: number;
        depth: number;
        isCentral: number;
        degree: number;
      }
    | undefined;
  if (!row) {
    return undefined;
  }
  return {
    ...row,
    isCentral: Boolean(row.isCentral),
  } satisfies NodeSummary;
}

export function mergeNodes(targetSlug: string, sourceSlugs: string[]) {
  db.transaction(() => {
    const placeholders = sourceSlugs.map(() => '?').join(',');

    db.prepare(
      `DELETE FROM node_links WHERE source_slug = ? AND target_slug IN (${placeholders})`,
    ).run(targetSlug, ...sourceSlugs);
    db.prepare(
      `DELETE FROM node_links WHERE target_slug = ? AND source_slug IN (${placeholders})`,
    ).run(targetSlug, ...sourceSlugs);
    db.prepare(
      `DELETE FROM node_links WHERE source_slug IN (${placeholders}) AND target_slug IN (${placeholders})`,
    ).run(...sourceSlugs, ...sourceSlugs);

    db.prepare(
      `UPDATE OR IGNORE node_links SET source_slug = ? WHERE source_slug IN (${placeholders})`,
    ).run(targetSlug, ...sourceSlugs);
    db.prepare(
      `UPDATE OR IGNORE node_links SET target_slug = ? WHERE target_slug IN (${placeholders})`,
    ).run(targetSlug, ...sourceSlugs);
    db.prepare(
      `UPDATE OR IGNORE doc_node_links SET node_slug = ? WHERE node_slug IN (${placeholders})`,
    ).run(targetSlug, ...sourceSlugs);

    for (const slug of sourceSlugs) {
      db.prepare('DELETE FROM node_links WHERE source_slug = ? OR target_slug = ?').run(slug, slug);
      db.prepare('DELETE FROM doc_node_links WHERE node_slug = ?').run(slug);
      db.prepare('DELETE FROM derived_nodes WHERE slug = ?').run(slug);
    }
  })();

  return getNodeSummary(targetSlug)!;
}

export function bulkReassignNodes(nodeSlugs: string[], clusterSlug: string) {
  const placeholders = nodeSlugs.map(() => '?').join(',');
  db.prepare(`UPDATE derived_nodes SET cluster_slug = ? WHERE slug IN (${placeholders})`).run(
    clusterSlug,
    ...nodeSlugs,
  );
  return { reassigned: nodeSlugs.length, clusterSlug };
}
