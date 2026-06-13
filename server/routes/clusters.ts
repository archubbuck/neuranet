/**
 * Cluster CRUD + atomic dissolve/merge.
 */
import express, { type Request, type Response } from 'express';
import db from '../db';
import * as schemas from '../schemas';
import { validateBody } from '../middleware/validate';
import { slugify, colorFromSlug } from '../lib/derivation';

const router = express.Router();

interface ClusterRow {
  id?: number;
  slug: string;
  label: string;
  color: string;
  created_at?: string;
}

router.post('/clusters', validateBody(schemas.createCluster), (req: Request, res: Response) => {
  const { label } = req.body as { label: string; color?: string };

  const slug = slugify(label);
  const exists = db.prepare('SELECT slug FROM derived_clusters WHERE slug = ?').get(slug);
  if (exists) {
    res.status(409).json({ message: 'a cluster with this name already exists' });
    return;
  }

  const color = (req.body as { color?: string }).color ?? colorFromSlug(slug);

  db.prepare('INSERT INTO derived_clusters (slug, label, color) VALUES (?, ?, ?)').run(
    slug,
    label,
    color,
  );
  res.status(201).json({ id: slug, label, color });
});

router.put('/clusters/:slug', validateBody(schemas.updateCluster), (req: Request, res: Response) => {
  const slug = req.params['slug']!;
  const cluster = db.prepare('SELECT * FROM derived_clusters WHERE slug = ?').get(slug) as
    | ClusterRow
    | undefined;
  if (!cluster) {
    res.status(404).json({ message: 'cluster not found' });
    return;
  }

  const body = req.body as { label?: string; color?: string };
  const label = body.label ?? cluster.label;
  const color = body.color ?? cluster.color;

  db.prepare('UPDATE derived_clusters SET label = ?, color = ? WHERE slug = ?').run(
    label,
    color,
    slug,
  );
  res.json({ id: slug, label, color });
});

router.delete('/clusters/:slug', (req: Request, res: Response) => {
  const slug = req.params['slug']!;
  const cluster = db.prepare('SELECT * FROM derived_clusters WHERE slug = ?').get(slug);
  if (!cluster) {
    res.status(404).json({ message: 'cluster not found' });
    return;
  }

  // Cascade: drop the cluster's nodes (and their links), then the cluster.
  const tx = db.transaction(() => {
    const nodeSlugs = (
      db.prepare('SELECT slug FROM derived_nodes WHERE cluster_slug = ?').all(slug) as Array<{
        slug: string;
      }>
    ).map((r) => r.slug);
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
  });
  tx();
  res.json({ deleted: true });
});

router.post(
  '/clusters/dissolve',
  validateBody(schemas.dissolveClusters),
  (req: Request, res: Response) => {
    const { targetSlug, sourceSlugs } = req.body as {
      targetSlug: string;
      sourceSlugs: string[];
    };

    if (sourceSlugs.includes(targetSlug)) {
      res.status(400).json({ message: 'target cluster cannot be in sourceSlugs' });
      return;
    }

    if (!db.prepare('SELECT slug FROM derived_clusters WHERE slug = ?').get(targetSlug)) {
      res.status(404).json({ message: 'target cluster not found' });
      return;
    }
    for (const src of sourceSlugs) {
      if (!db.prepare('SELECT slug FROM derived_clusters WHERE slug = ?').get(src)) {
        res.status(404).json({ message: `source cluster not found: ${src}` });
        return;
      }
    }

    const placeholders = sourceSlugs.map(() => '?').join(',');
    const result = db.transaction(() => {
      const reassigned = db
        .prepare(
          `UPDATE derived_nodes SET cluster_slug = ? WHERE cluster_slug IN (${placeholders})`,
        )
        .run(targetSlug, ...sourceSlugs).changes;
      const deletedClusters = db
        .prepare(`DELETE FROM derived_clusters WHERE slug IN (${placeholders})`)
        .run(...sourceSlugs).changes;
      return { reassigned, deletedClusters };
    })();

    res.json(result);
  },
);

export default router;
