/**
 * Network overlay: clusters, nodes (with computed degree), and edges.
 */
import { Router } from 'express';
import { networkRepo } from '../db.js';
import { asyncHandler } from '../lib/async-handler.js';

const router = Router();

router.get(
  '/network',
  asyncHandler(async (_req, res) => {
    const data = networkRepo.getFullNetwork();
    res.json(data);
  }),
);

export default router;
