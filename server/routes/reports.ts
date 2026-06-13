/**
 * Aggregate reporting: entity totals + per-cluster node distribution.
 */
import express, { type Request, type Response } from 'express';
import { getReportsSnapshot } from '../db/read-repository';

const router = express.Router();

router.get('/reports', (_req: Request, res: Response) => {
  res.json(getReportsSnapshot());
});

export default router;
