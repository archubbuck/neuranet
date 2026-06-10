/**
 * Aggregate reporting: entity totals + per-cluster node distribution.
 */
const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/reports', (_req, res) => {
  const totals = {
    nodes: db.prepare('SELECT COUNT(*) AS n FROM derived_nodes').get().n,
    clusters: db.prepare('SELECT COUNT(*) AS n FROM derived_clusters').get().n,
    edges: db.prepare('SELECT COUNT(*) AS n FROM node_links').get().n,
    sources: db.prepare('SELECT COUNT(*) AS n FROM data_sources').get().n,
    docs: db.prepare('SELECT COUNT(*) AS n FROM docs').get().n,
  };

  const clusterDistribution = db.prepare(
    `SELECT dc.slug AS id, dc.label, dc.color,
            COALESCE((SELECT COUNT(*) FROM derived_nodes dn WHERE dn.cluster_slug = dc.slug), 0) AS count
     FROM derived_clusters dc
     ORDER BY count DESC, dc.label ASC`,
  ).all();

  res.json({ totals, clusterDistribution });
});

module.exports = router;
