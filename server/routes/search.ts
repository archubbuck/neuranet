/**
 * Ranked search across nodes (label + description) and docs (title + text).
 */
import { Router } from 'express';
import { searchRepo } from '../db';
import { asyncHandler } from '../lib/async-handler';

const router = Router();

router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = typeof req.query['q'] === 'string' ? req.query['q'].trim() : '';
    const results = await searchRepo.search(q);
    res.json({ results });
  }),
);

export default router;
