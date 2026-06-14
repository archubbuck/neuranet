/**
 * Document upload + keyword-based cluster/node derivation.
 */
import { Router } from 'express';
import { docsRepo } from '../db.js';
import config from '../config.js';
import * as schemas from '../schemas.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../lib/async-handler.js';
import { slugify, titleCase, colorFromSlug, topKeywords } from '../lib/derivation.js';
import { logger } from '../lib/logger.js';

const router = Router();

router.get(
  '/docs',
  asyncHandler(async (_req, res) => {
    const docs = docsRepo.listAll().map((row: Record<string, unknown>) => ({
      ...row,
      derivedNodeSlugs: JSON.parse(row['derivedNodeSlugs'] as string),
    }));
    res.json(docs);
  }),
);

router.post(
  '/docs',
  validateBody(schemas.createDoc),
  asyncHandler(async (req, res) => {
    const { title, text, status } = req.body as {
      title?: string;
      text: string;
      status?: string;
    };

    const normalizedTitle = title || 'Untitled document';
    const keywords = topKeywords(`${normalizedTitle} ${text}`, config.derivation.docKeywordCount);

    try {
      const created = await docsRepo.createWithDerivation({
        title: normalizedTitle,
        text,
        status: status ?? 'done',
        keywords,
        slugify,
        titleCase,
        colorFromSlug,
      });
      res.status(201).json(created);
    } catch (err) {
      logger.error({ err }, '[docs] create failed');
      res.status(500).json({ message: 'failed to create document' });
    }
  }),
);

export default router;
