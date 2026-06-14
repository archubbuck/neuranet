/**
 * Aggregate reporting: entity totals + per-cluster node distribution.
 */
import { Router } from 'express';
import { reportsRepo } from '../db.js';
import { asyncHandler } from '../lib/async-handler.js';

const router = Router();

router.get(
  '/reports',
  asyncHandler(async (_req, res) => {
    const totals = reportsRepo.getTotals();
    const clusterDistribution = reportsRepo.getClusterDistribution();
    res.json({ totals, clusterDistribution });
  }),
);

export default router;
