/**
 * Node CRUD + merge, bulk reassign, bulk delete.
 */
import express, { type Request, type Response } from 'express';
import db from '../db';
import * as schemas from '../schemas';
import { validateBody } from '../middleware/validate';
import { slugify } from '../lib/derivation';

const router = express.Router();

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

router.post('/nodes', validateBody(schemas.createNode), (req: Request, res: Response) => {
  const body = req.body as { label: string; clusterSlug: string; desc?: string };
  const { label, clusterSlug } = body;
  const desc = body.desc ?? (label || 'Manually created topic');

  const cluster = db.prepare('SELECT slug FROM derived_clusters WHERE slug = ?').get(clusterSlug);
  if (!cluster) {
    res.status(400).json({ message: 'target cluster does not exist' });
    return;
  }

  const slug = slugify(label);
  const existing = db.prepare('SELECT slug FROM derived_nodes WHERE slug = ?').get(slug);
  if (existing) {
    res.status(409).json({ message: 'a node with this name already exists' });
    return;
  }

  db.prepare(
    'INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, depth) VALUES (?, ?, ?, ?, ?, ?, 0)',
  ).run(slug, label, desc, clusterSlug, 14, 5);

  res.status(201).json({ id: slug, label, desc, cluster: clusterSlug });
});

router.put('/nodes/:slug', validateBody(schemas.updateNode), (req: Request, res: Response) => {
  const slug = req.params['slug']!;
  const node = db.prepare('SELECT * FROM derived_nodes WHERE slug = ?').get(slug) as
    | NodeRow
    | undefined;
  if (!node) {
    res.status(404).json({ message: 'node not found' });
    return;
  }

  const body = req.body as { label?: string; description?: string; clusterSlug?: string };
  const label = body.label ?? node.label;
  const description = body.description ?? node.description;
  let clusterSlug = node.cluster_slug;
  if (body.clusterSlug) {
    const target = body.clusterSlug;
    if (!db.prepare('SELECT slug FROM derived_clusters WHERE slug = ?').get(target)) {
      res.status(400).json({ message: 'target cluster does not exist' });
      return;
    }
    clusterSlug = target;
  }

  db.prepare(
    'UPDATE derived_nodes SET label = ?, description = ?, cluster_slug = ? WHERE slug = ?',
  ).run(label, description, clusterSlug, slug);
  res.json({ id: slug, label, desc: description, cluster: clusterSlug });
});

router.delete('/nodes/:slug', (req: Request, res: Response) => {
  const slug = req.params['slug']!;
  const node = db.prepare('SELECT * FROM derived_nodes WHERE slug = ?').get(slug);
  if (!node) {
    res.status(404).json({ message: 'node not found' });
    return;
  }

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM node_links WHERE source_slug = ? OR target_slug = ?').run(slug, slug);
    db.prepare('DELETE FROM doc_node_links WHERE node_slug = ?').run(slug);
    db.prepare('DELETE FROM derived_nodes WHERE slug = ?').run(slug);
  });
  tx();
  res.json({ deleted: true });
});

router.post(
  '/nodes/bulk-delete',
  validateBody(schemas.bulkDeleteNodes),
  (req: Request, res: Response) => {
    const { nodeSlugs } = req.body as { nodeSlugs: string[] };

    for (const slug of nodeSlugs) {
      if (!db.prepare('SELECT slug FROM derived_nodes WHERE slug = ?').get(slug)) {
        res.status(404).json({ message: `node not found: ${slug}` });
        return;
      }
    }

    const placeholders = nodeSlugs.map(() => '?').join(',');
    const deleted = db.transaction(() => {
      db.prepare(
        `DELETE FROM node_links WHERE source_slug IN (${placeholders}) OR target_slug IN (${placeholders})`,
      ).run(...nodeSlugs, ...nodeSlugs);
      db.prepare(`DELETE FROM doc_node_links WHERE node_slug IN (${placeholders})`).run(
        ...nodeSlugs,
      );
      return db
        .prepare(`DELETE FROM derived_nodes WHERE slug IN (${placeholders})`)
        .run(...nodeSlugs).changes;
    })();

    res.json({ deleted });
  },
);

router.post('/nodes/merge', validateBody(schemas.mergeNodes), (req: Request, res: Response) => {
  const { targetSlug, sourceSlugs } = req.body as {
    targetSlug: string;
    sourceSlugs: string[];
  };

  const target = db.prepare('SELECT * FROM derived_nodes WHERE slug = ?').get(targetSlug);
  if (!target) {
    res.status(404).json({ message: 'target node not found' });
    return;
  }

  // Reject if any source node doesn't exist, or if target is in sources.
  for (const src of sourceSlugs) {
    if (src === targetSlug) {
      res.status(400).json({ message: 'target node cannot be in sourceSlugs' });
      return;
    }
    if (!db.prepare('SELECT slug FROM derived_nodes WHERE slug = ?').get(src)) {
      res.status(404).json({ message: `source node not found: ${src}` });
      return;
    }
  }

  const tx = db.transaction(() => {
    const placeholders = sourceSlugs.map(() => '?').join(',');

    // Drop edges directly between the target and a source, or between two
    // sources — reassigning them would create self-loops.
    db.prepare(
      `DELETE FROM node_links WHERE source_slug = ? AND target_slug IN (${placeholders})`,
    ).run(targetSlug, ...sourceSlugs);
    db.prepare(
      `DELETE FROM node_links WHERE target_slug = ? AND source_slug IN (${placeholders})`,
    ).run(targetSlug, ...sourceSlugs);
    db.prepare(
      `DELETE FROM node_links WHERE source_slug IN (${placeholders}) AND target_slug IN (${placeholders})`,
    ).run(...sourceSlugs, ...sourceSlugs);

    // Reassign all edges pointing to/from source nodes to the target.
    // OR IGNORE skips rows that would duplicate an edge the target already
    // has (UNIQUE(source_slug, target_slug)); leftovers are swept below.
    db.prepare(
      `UPDATE OR IGNORE node_links SET source_slug = ? WHERE source_slug IN (${placeholders})`,
    ).run(targetSlug, ...sourceSlugs);
    db.prepare(
      `UPDATE OR IGNORE node_links SET target_slug = ? WHERE target_slug IN (${placeholders})`,
    ).run(targetSlug, ...sourceSlugs);

    // Reassign all doc-node links from sources to target.
    db.prepare(
      `UPDATE OR IGNORE doc_node_links SET node_slug = ? WHERE node_slug IN (${placeholders})`,
    ).run(targetSlug, ...sourceSlugs);

    // Delete the now-empty source nodes (and any duplicate edges OR IGNORE left behind).
    for (const src of sourceSlugs) {
      db.prepare('DELETE FROM node_links WHERE source_slug = ? OR target_slug = ?').run(src, src);
      db.prepare('DELETE FROM doc_node_links WHERE node_slug = ?').run(src);
      db.prepare('DELETE FROM derived_nodes WHERE slug = ?').run(src);
    }
  });
  tx();

  // Return the updated target node.
  const updated = db
    .prepare(
      `SELECT slug AS id, label, description AS desc, cluster_slug AS cluster,
            radius AS r, importance, depth, is_central AS isCentral,
            COALESCE((SELECT COUNT(*) FROM node_links nl WHERE nl.source_slug = dn.slug OR nl.target_slug = dn.slug), 0) AS degree
     FROM derived_nodes dn WHERE dn.slug = ?`,
    )
    .get(targetSlug) as {
    id: string;
    label: string;
    desc: string;
    cluster: string;
    r: number;
    importance: number;
    depth: number;
    isCentral: number;
    degree: number;
  };
  res.json({ ...updated, isCentral: Boolean(updated.isCentral) });
});

router.post(
  '/nodes/bulk-reassign',
  validateBody(schemas.bulkReassignNodes),
  (req: Request, res: Response) => {
    const { nodeSlugs, clusterSlug } = req.body as {
      nodeSlugs: string[];
      clusterSlug: string;
    };

    const cluster = db.prepare('SELECT slug FROM derived_clusters WHERE slug = ?').get(clusterSlug);
    if (!cluster) {
      res.status(400).json({ message: 'target cluster does not exist' });
      return;
    }

    // Reject if any node doesn't exist.
    for (const slug of nodeSlugs) {
      if (!db.prepare('SELECT slug FROM derived_nodes WHERE slug = ?').get(slug)) {
        res.status(404).json({ message: `node not found: ${slug}` });
        return;
      }
    }

    const placeholders = nodeSlugs.map(() => '?').join(',');
    db.prepare(`UPDATE derived_nodes SET cluster_slug = ? WHERE slug IN (${placeholders})`).run(
      clusterSlug,
      ...nodeSlugs,
    );

    res.json({ reassigned: nodeSlugs.length, clusterSlug });
  },
);

export default router;
