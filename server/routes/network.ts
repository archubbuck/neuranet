/**
 * Network overlay: clusters, nodes (with computed degree), and edges.
 */
import express, { type Request, type Response } from 'express';
import { getNetworkSnapshot } from '../db/read-repository';

const router = express.Router();

router.get('/network', (_req: Request, res: Response) => {
  res.json(getNetworkSnapshot());
});

export default router;
