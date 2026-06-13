/**
 * Data source CRUD + Reddit fetch/derivation.
 */
import express, { type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import db from '../db';
import config from '../config';
import { fetcher as redditFetcher } from '../reddit-fetcher';
import * as schemas from '../schemas';
import { validateBody } from '../middleware/validate';
import {
  slugify,
  titleCase,
  colorFromSlug,
  tokenize,
  topKeywords,
  scoreTopicMatch,
} from '../lib/derivation';

const router = express.Router();

interface SourceRow {
  id: number;
  source_type: string;
  config_json: string;
  status: string;
  status_message: string | null;
  created_at: string;
  config?: unknown;
}

// Strict per-source limiter: the fetch route hits an external API and
// performs heavy derivation writes.
const fetchLimiter = rateLimit({
  windowMs: 60_000,
  limit: config.rateLimits.fetchPerSourcePerMinute,
  keyGenerator: (req: Request) => `source-${req.params['sourceId']}`,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { message: 'too many fetch requests for this source' },
});

router.post('/sources', validateBody(schemas.createSource), (req: Request, res: Response) => {
  const { sourceType, config: sourceConfig } = req.body as {
    sourceType: string;
    config: Record<string, unknown>;
  };

  const result = db
    .prepare('INSERT INTO data_sources (source_type, config_json) VALUES (?, ?)')
    .run(sourceType, JSON.stringify(sourceConfig));
  const source = db
    .prepare('SELECT * FROM data_sources WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as SourceRow;
  source.config = JSON.parse(source.config_json);
  res.status(201).json(source);
});

router.get('/sources', (_req: Request, res: Response) => {
  const sources = (db.prepare('SELECT * FROM data_sources ORDER BY created_at DESC').all() as SourceRow[]).map(
    (row) => ({ ...row, config: JSON.parse(row.config_json) }),
  );
  res.json(sources);
});

router.delete('/sources/:sourceId', (req: Request, res: Response) => {
  const source = db
    .prepare('SELECT * FROM data_sources WHERE id = ?')
    .get(req.params['sourceId']) as SourceRow | undefined;
  if (!source) {
    res.status(404).json({ message: 'data source not found' });
    return;
  }
  db.prepare('DELETE FROM data_sources WHERE id = ?').run(req.params['sourceId']);
  res.json({ deleted: true });
});

router.post('/sources/:sourceId/fetch', fetchLimiter, async (req: Request, res: Response) => {
  const source = db
    .prepare('SELECT * FROM data_sources WHERE id = ?')
    .get(req.params['sourceId']) as SourceRow | undefined;
  if (!source) {
    res.status(404).json({ message: 'data source not found' });
    return;
  }
  if (source.source_type !== 'reddit') {
    res.status(400).json({ message: `fetch not supported for source type: ${source.source_type}` });
    return;
  }

  db.prepare('UPDATE data_sources SET status = ?, status_message = NULL WHERE id = ?').run(
    'fetching',
    source.id,
  );

  try {
    const sourceConfig = JSON.parse(source.config_json) as { threadUrl: string };
    const threadData = await redditFetcher.fetchThread(sourceConfig.threadUrl);

    // All derivation writes are atomic: a mid-write failure must not leave
    // partial clusters/nodes/edges behind.
    const { nodeCount, edgeCount } = db.transaction(() => {
      // Central node
      const centralSlug = `reddit-${threadData.threadId}`;
      const centralLabel = threadData.title.substring(0, 120);
      const centralDesc = `Reddit thread: ${threadData.title.substring(0, 200)}`;
      const centralClusterSlug = `reddit-${threadData.threadId}`;
      const centralClusterLabel = `${centralLabel.substring(0, 40)} Discussion`;

      db.prepare(
        'INSERT INTO derived_clusters (slug, label, color) VALUES (?, ?, ?) ON CONFLICT(slug) DO NOTHING',
      ).run(centralClusterSlug, centralClusterLabel, colorFromSlug(centralClusterSlug));
      db.prepare(
        'INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, depth, is_central) VALUES (?, ?, ?, ?, ?, ?, 0, 1) ON CONFLICT(slug) DO UPDATE SET label=excluded.label',
      ).run(centralSlug, centralLabel, centralDesc, centralClusterSlug, 36, 10);

      // Depth-1 topics from title + body
      const combinedText = `${threadData.title} ${threadData.body || ''}`;
      const depth1Keywords = topKeywords(combinedText, config.derivation.threadKeywordCount);

      let nodes = 1;
      let edges = 0;
      const depth1Slugs: string[] = [];

      const insertNode = db.prepare(
        'INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, depth) VALUES (?, ?, ?, ?, ?, ?, 1) ON CONFLICT(slug) DO NOTHING',
      );
      const insertEdge = db.prepare(
        'INSERT INTO node_links (source_slug, target_slug, link_kind) VALUES (?, ?, ?) ON CONFLICT(source_slug, target_slug) DO NOTHING',
      );

      for (let i = 0; i < depth1Keywords.length; i += 1) {
        const kw = depth1Keywords[i]!;
        const nodeSlug = `reddit-${threadData.threadId}-d1-${slugify(kw)}`;
        insertNode.run(
          nodeSlug,
          titleCase(kw),
          `Topic from Reddit thread: ${titleCase(kw)}`,
          centralClusterSlug,
          Math.max(14, 24 - i * 2),
          Math.max(5, 9 - i),
        );
        depth1Slugs.push(nodeSlug);
        nodes += 1;
        insertEdge.run(centralSlug, nodeSlug, 'central-topic');
        edges += 1;
      }

      // Depth-2 from comments
      const topLevelComments = threadData.comments.filter((c) => c.depth === 0);
      const insertD2Node = db.prepare(
        'INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, depth) VALUES (?, ?, ?, ?, ?, ?, 2) ON CONFLICT(slug) DO NOTHING',
      );
      const getD1Label = db.prepare('SELECT label FROM derived_nodes WHERE slug = ?');

      for (const comment of topLevelComments.slice(0, config.derivation.maxTopLevelComments)) {
        const commentKeywords = topKeywords(comment.body, config.derivation.commentKeywordCount);
        const commentTokenSet = new Set(tokenize(comment.body));
        for (const kw of commentKeywords) {
          let bestParent = depth1Slugs[0];
          let bestScore = 0;
          for (const d1Slug of depth1Slugs) {
            const d1Node = getD1Label.get(d1Slug) as { label: string } | undefined;
            if (!d1Node) continue;
            const s = scoreTopicMatch(commentTokenSet, d1Node.label);
            if (s > bestScore) {
              bestScore = s;
              bestParent = d1Slug;
            }
          }
          if (bestScore === 0) continue;

          const nodeSlug = `reddit-${threadData.threadId}-d2-${slugify(kw)}`;
          insertD2Node.run(
            nodeSlug,
            titleCase(kw),
            `Sub-topic from discussion: ${titleCase(kw)}`,
            centralClusterSlug,
            12,
            4,
          );
          nodes += 1;
          insertEdge.run(bestParent, nodeSlug, 'topic-subtopic');
          edges += 1;
        }
      }

      // Cross-link depth-1
      for (let i = 1; i < depth1Slugs.length; i += 1) {
        insertEdge.run(depth1Slugs[i - 1], depth1Slugs[i], 'related-topic');
        edges += 1;
      }

      db.prepare('UPDATE data_sources SET status = ?, status_message = ? WHERE id = ?').run(
        'done',
        `Extracted ${nodes} nodes and ${edges} edges`,
        source.id,
      );

      return { nodeCount: nodes, edgeCount: edges };
    })();

    const updated = db.prepare('SELECT * FROM data_sources WHERE id = ?').get(source.id) as SourceRow;
    updated.config = JSON.parse(updated.config_json);
    res.json({ source: updated, nodeCount, edgeCount });
  } catch (err) {
    db.prepare('UPDATE data_sources SET status = ?, status_message = ? WHERE id = ?').run(
      'error',
      (err as Error).message,
      source.id,
    );
    // Log internally; never leak raw error details to the client.
    console.error(`[fetch] source ${source.id} failed:`, err);
    res.status(500).json({ message: 'failed to fetch or derive from source' });
  }
});

export default router;
