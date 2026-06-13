/**
 * Network overlay: clusters, nodes (with computed degree), and edges.
 */
import { Router } from 'express';
import { networkRepo } from '../db';
import { asyncHandler } from '../lib/async-handler';

const router = Router();

router.get(
  '/network',
  asyncHandler(async (_req, res) => {
    const data = networkRepo.getFullNetwork();
    res.json(data);
  }),
);

export default router;
