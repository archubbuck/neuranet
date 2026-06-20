/**
 * Network overlay: clusters, nodes (with computed degree), and edges.
 * Also exposes subgraph retrieval for GraphRAG local-neighborhood queries.
 */
import { Router } from 'express';
import { networkRepo } from '../db.js';
import { asyncHandler } from '../lib/async-handler.js';

const router = Router();

router.get(
  '/network',
  asyncHandler(async (_req, res) => {
    const data = await networkRepo.getFullNetwork();
    res.json(data);
  }),
);

router.get(
  '/network/subgraph/:nodeSlug',
  asyncHandler(async (req, res) => {
    const nodeSlug = req.params['nodeSlug'] as string;
    const maxDepth = Math.min(Math.max(Number(req.query['depth']) || 2, 1), 5);
    const data = await networkRepo.getSubgraph(nodeSlug, maxDepth);
    res.json(data);
  }),
);

export default router;
