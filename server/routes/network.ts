/**
 * Network overlay: clusters, nodes (with computed degree), and edges.
 */
import express, { type Request, type Response } from 'express';
import db from '../db';

const router = express.Router();

interface NodeRow {
  id: string;
  label: string;
  desc: string;
  cluster: string;
  r: number;
  importance: number;
  depth: number;
  isCentral: number;
  sentiment: number | null;
  degree: number;
}

router.get('/network', (_req: Request, res: Response) => {
  const derivedClusters = db
    .prepare('SELECT slug AS id, label, color FROM derived_clusters ORDER BY id ASC')
    .all();
  const derivedNodes = (
    db
      .prepare(
        `SELECT dn.slug AS id, dn.label, dn.description AS desc, dn.cluster_slug AS cluster,
              dn.radius AS r, dn.importance, dn.depth, dn.is_central AS isCentral, dn.sentiment,
              COALESCE((SELECT COUNT(*) FROM node_links nl WHERE nl.source_slug = dn.slug OR nl.target_slug = dn.slug), 0) AS degree
       FROM derived_nodes dn ORDER BY dn.id ASC`,
      )
      .all() as NodeRow[]
  ).map((row) => ({
    ...row,
    isCentral: Boolean(row.isCentral),
    sentiment: row.sentiment ?? undefined,
  }));
  const derivedEdges = db
    .prepare(
      'SELECT source_slug AS source, target_slug AS target, link_kind AS kind FROM node_links ORDER BY id ASC',
    )
    .all();
  res.json({ derivedClusters, derivedNodes, derivedEdges });
});

export default router;
