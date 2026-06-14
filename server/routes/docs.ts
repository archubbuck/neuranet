/**
 * Document upload + keyword-based cluster/node derivation.
 */
import { Router } from 'express';
import { docsRepo } from '../db';
import config from '../config';
import * as schemas from '../schemas';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../lib/async-handler';
import { slugify, titleCase, colorFromSlug, topKeywords } from '../lib/derivation';
import { logger } from '../lib/logger';

const router = Router();

router.get(
  '/docs',
  asyncHandler(async (_req, res) => {
    const docs = await docsRepo.listAll();
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
