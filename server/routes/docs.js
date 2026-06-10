/**
 * Document upload + keyword-based cluster/node derivation.
 */
const express = require('express');
const db = require('../db');
const config = require('../config');
const schemas = require('../schemas');
const { validateBody } = require('../middleware/validate');
const { slugify, titleCase, colorFromSlug, topKeywords } = require('../lib/derivation');

const router = express.Router();

router.get('/docs', (_req, res) => {
  const docs = db
    .prepare(
      `SELECT d.id, d.title, d.text, d.status,
     COALESCE((SELECT json_group_array(node_slug) FROM doc_node_links dnl WHERE dnl.doc_id = d.id), '[]') AS derivedNodeSlugs
     FROM docs d ORDER BY d.id ASC`,
    )
    .all()
    .map((row) => ({ ...row, derivedNodeSlugs: JSON.parse(row.derivedNodeSlugs) }));
  res.json(docs);
});

router.post('/docs', validateBody(schemas.createDoc), (req, res) => {
  const { title, text, status } = req.body;

  const normalizedTitle = title || 'Untitled document';

  // Doc insert + derivation are atomic: a failure mid-derivation must not
  // leave an orphaned doc row or partial nodes behind.
  let created;
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

      const createdNodeSlugs = [];
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
        const kw = keywords[i];
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

      const doc = db.prepare('SELECT id, title, text, status FROM docs WHERE id = ?').get(docId);
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

module.exports = router;
