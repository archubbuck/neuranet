/**
 * Ranked search across nodes (label + description) and docs (title + text).
 * Also exposes vector-based semantic search when embeddings are available.
 */
import { Router } from 'express';
import { searchRepo } from '../db.js';
import { asyncHandler } from '../lib/async-handler.js';
import { generateEmbedding } from '../lib/embeddings.js';
import { logger } from '../lib/logger.js';

const router = Router();

router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = typeof req.query['q'] === 'string' ? req.query['q'].trim() : '';
    const results = await searchRepo.search(q);
    res.json({ results });
  }),
);

router.get(
  '/search/vector',
  asyncHandler(async (req, res) => {
    const q = typeof req.query['q'] === 'string' ? req.query['q'].trim() : '';
    if (!q) {
      res.status(400).json({ message: 'query parameter "q" is required' });
      return;
    }

    const limit = Math.min(Math.max(Number(req.query['limit']) || 10, 1), 50);

    try {
      const embedding = await generateEmbedding(q);
      const results = await searchRepo.vectorSearch(embedding, limit);
      res.json({ results, searchType: 'vector' });
    } catch (err) {
      logger.error({ err }, '[search] vector search failed, falling back to ILIKE');
      const results = await searchRepo.search(q);
      res.json({ results, searchType: 'fallback' });
    }
  }),
);

export default router;
