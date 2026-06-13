/**
 * Document upload + keyword-based cluster/node derivation.
 */
import express, { type Request, type Response } from 'express';
import db from '../db';
import config from '../config';
import * as schemas from '../schemas';
import { validateBody } from '../middleware/validate';
import { slugify, titleCase, colorFromSlug, topKeywords } from '../lib/derivation';

const router = express.Router();

interface DocRow {
  id: number;
  title: string;
  text: string;
  status: string;
  derivedNodeSlugs?: string[] | string;
}

router.get('/docs', (_req: Request, res: Response) => {
  const docs = (
    db
      .prepare(
        `SELECT d.id, d.title, d.text, d.status,
       COALESCE((SELECT json_group_array(node_slug) FROM doc_node_links dnl WHERE dnl.doc_id = d.id), '[]') AS derivedNodeSlugs
       FROM docs d ORDER BY d.id ASC`,
      )
      .all() as Array<DocRow & { derivedNodeSlugs: string }>
  ).map((row) => ({
    ...row,
    derivedNodeSlugs: JSON.parse(row.derivedNodeSlugs) as string[],
  }));
  res.json(docs);
});

router.post('/docs', validateBody(schemas.createDoc), (req: Request, res: Response) => {
  const { title, text, status } = req.body as { title: string; text: string; status: string };

  const normalizedTitle = title || 'Untitled document';

  // Doc insert + derivation are atomic: a failure mid-derivation must not
  // leave an orphaned doc row or partial nodes behind.
  let created: DocRow;
  try {
    created = db.transaction(() => {
      const result = db
        .prepare('INSERT INTO docs (title, text, status) VALUES (?, ?, ?)')
        .run(normalizedTitle, text, status);
      const docId = Number(result.lastInsertRowid);

      const keywords = topKeywords(`${normalizedTitle} ${text}`, config.derivation.docKeywordCount);
      const primaryKeyword = keywords[0] ?? 'general';
      const clusterSlug = `derived-${slugify(primaryKeyword)}`;
      db.prepare(
        'INSERT INTO derived_clusters (slug, label, color) VALUES (?, ?, ?) ON CONFLICT(slug) DO NOTHING',
      ).run(clusterSlug, `${titleCase(primaryKeyword)} Concepts`, colorFromSlug(clusterSlug));

      const createdNodeSlugs: string[] = [];
      const insertNode = db.prepare(
        'INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(slug) DO NOTHING',
      );
      const linkDocNode = db.prepare(
        'INSERT INTO doc_node_links (doc_id, node_slug, score) VALUES (?, ?, ?) ON CONFLICT(doc_id, node_slug) DO NOTHING',
      );
      const createEdge = db.prepare(
        'INSERT INTO node_links (source_slug, target_slug, link_kind) VALUES (?, ?, ?) ON CONFLICT(source_slug, target_slug) DO NOTHING',
      );

      for (let i = 0; i < keywords.length; i += 1) {
        const kw = keywords[i]!;
        const nodeSlug = `user-${docId}-${slugify(kw)}`;
        insertNode.run(
          nodeSlug,
          titleCase(kw),
          `Derived from document ${docId}: ${titleCase(kw)}`,
          clusterSlug,
          Math.max(12, 18 - i * 2),
          Math.max(4, 8 - i),
        );
        linkDocNode.run(docId, nodeSlug, Math.max(0.2, 1 - i * 0.15));
        createdNodeSlugs.push(nodeSlug);
      }

      for (let i = 1; i < createdNodeSlugs.length; i += 1) {
        createEdge.run(createdNodeSlugs[i - 1], createdNodeSlugs[i], 'same-doc');
      }

      const doc = db
        .prepare('SELECT id, title, text, status FROM docs WHERE id = ?')
        .get(docId) as DocRow;
      doc.derivedNodeSlugs = createdNodeSlugs;
      return doc;
    })();
  } catch (err) {
    console.error('[docs] create failed:', err);
    res.status(500).json({ message: 'failed to create document' });
    return;
  }
  res.status(201).json(created);
});

export default router;
