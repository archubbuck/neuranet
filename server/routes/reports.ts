/**
 * Aggregate reporting: entity totals + per-cluster node distribution.
 */
import express, { type Request, type Response } from 'express';
import db from '../db';

const router = express.Router();

interface CountRow {
  n: number;
}

router.get('/reports', (_req: Request, res: Response) => {
  const totals = {
    nodes: (db.prepare('SELECT COUNT(*) AS n FROM derived_nodes').get() as CountRow).n,
    clusters: (db.prepare('SELECT COUNT(*) AS n FROM derived_clusters').get() as CountRow).n,
    edges: (db.prepare('SELECT COUNT(*) AS n FROM node_links').get() as CountRow).n,
    sources: (db.prepare('SELECT COUNT(*) AS n FROM data_sources').get() as CountRow).n,
    docs: (db.prepare('SELECT COUNT(*) AS n FROM docs').get() as CountRow).n,
  };

  const clusterDistribution = db
    .prepare(
      `SELECT dc.slug AS id, dc.label, dc.color,
            COALESCE((SELECT COUNT(*) FROM derived_nodes dn WHERE dn.cluster_slug = dc.slug), 0) AS count
     FROM derived_clusters dc
     ORDER BY count DESC, dc.label ASC`,
    )
    .all();

  res.json({ totals, clusterDistribution });
});

export default router;
