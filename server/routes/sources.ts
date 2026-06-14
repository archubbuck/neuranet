/**
 * Data source CRUD + Reddit fetch/derivation.
 */
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { sourcesRepo } from '../db.js';
import config from '../config.js';
import { fetchThread } from '../reddit-fetcher.js';
import * as schemas from '../schemas.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../lib/async-handler.js';
import {
  slugify,
  titleCase,
  colorFromSlug,
  tokenize,
  topKeywords,
  scoreTopicMatch,
} from '../lib/derivation.js';
import { logger } from '../lib/logger.js';

const router = Router();

// Strict per-source limiter: the fetch route hits an external API and
// performs heavy derivation writes.
const fetchLimiter = rateLimit({
  windowMs: 60_000,
  limit: config.rateLimits.fetchPerSourcePerMinute,
  keyGenerator: (req) => `source-${req.params['sourceId']}`,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { message: 'too many fetch requests for this source' },
});

router.post(
  '/sources',
  validateBody(schemas.createSource),
  asyncHandler(async (req, res) => {
    const { sourceType, config: sourceConfig } = req.body as {
      sourceType: string;
      config: Record<string, unknown>;
    };

    const created = sourcesRepo.create({
      sourceType,
      configJson: JSON.stringify(sourceConfig),
    });
    res.status(201).json({
      id: created.id,
      source_type: created.sourceType,
      status: created.status,
      status_message: created.statusMessage,
      config_json: created.configJson,
      created_at: created.createdAt,
      config: sourceConfig,
    });
  }),
);

router.get(
  '/sources',
  asyncHandler(async (_req, res) => {
    const sources = sourcesRepo.listAll().map((row: Record<string, unknown>) => ({
      id: row['id'],
      source_type: row['sourceType'],
      config: JSON.parse(row['configJson'] as string),
      config_json: row['configJson'],
      status: row['status'],
      status_message: row['statusMessage'],
      created_at: row['createdAt'],
    }));
    res.json(sources);
  }),
);

router.delete(
  '/sources/:sourceId',
  asyncHandler(async (req, res) => {
    const source = sourcesRepo.getById(Number(req.params['sourceId']));
    if (!source) {
      res.status(404).json({ message: 'data source not found' });
      return;
    }
    sourcesRepo.delete(source.id);
    res.json({ deleted: true });
  }),
);

router.post(
  '/sources/:sourceId/fetch',
  fetchLimiter,
  asyncHandler(async (req, res) => {
    const source = sourcesRepo.getById(Number(req.params['sourceId']));
    if (!source) {
      res.status(404).json({ message: 'data source not found' });
      return;
    }
    if (source.sourceType !== 'reddit') {
      res.status(400).json({
        message: `fetch not supported for source type: ${source.sourceType}`,
      });
      return;
    }

    sourcesRepo.updateStatus(source.id, 'fetching');

    try {
      const sourceConfig = JSON.parse(source.configJson) as {
        threadUrl: string;
      };
      const threadData = await fetchThread(sourceConfig.threadUrl);

      const { nodeCount, edgeCount } = await sourcesRepo.deriveFromThread(
        source.id,
        threadData,
        {
          slugify,
          titleCase,
          colorFromSlug,
          tokenize,
          topKeywords,
          scoreTopicMatch,
        },
        {
          threadKeywordCount: config.derivation.threadKeywordCount,
          commentKeywordCount: config.derivation.commentKeywordCount,
          maxTopLevelComments: config.derivation.maxTopLevelComments,
        },
      );

      const updated = sourcesRepo.getById(source.id)!;
      res.json({
        source: {
          id: updated.id,
          source_type: updated.sourceType,
          config: JSON.parse(updated.configJson),
          config_json: updated.configJson,
          status: updated.status,
          status_message: updated.statusMessage,
          created_at: updated.createdAt,
        },
        nodeCount,
        edgeCount,
      });
    } catch (err) {
      sourcesRepo.updateStatus(source.id, 'error', (err as Error).message);
      logger.error({ err, sourceId: source.id }, '[fetch] source failed');
      res.status(500).json({ message: 'failed to fetch or derive from source' });
    }
  }),
);

export default router;
