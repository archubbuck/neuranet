const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const port = Number(process.env.API_PORT || 3000);
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'topic-visualizer.db');

const BASE_TOPICS = [
  { id: 'ml', label: 'Machine Learning' },
  { id: 'dl', label: 'Deep Learning' },
  { id: 'nn', label: 'Neural Networks' },
  { id: 'rl', label: 'Reinforcement Learning' },
  { id: 'sl', label: 'Supervised Learning' },
  { id: 'ul', label: 'Unsupervised Learning' },
  { id: 'tl', label: 'Transfer Learning' },
  { id: 'ds', label: 'Data Science' },
  { id: 'fe', label: 'Feature Engineering' },
  { id: 'stat', label: 'Statistics' },
  { id: 'bi', label: 'Business Intelligence' },
  { id: 'etl', label: 'Data Pipelines' },
  { id: 'nlp', label: 'NLP' },
  { id: 'llm', label: 'Large Language Models' },
  { id: 'trans', label: 'Transformers' },
  { id: 'embed', label: 'Word Embeddings' },
  { id: 'sent', label: 'Sentiment Analysis' },
  { id: 'cv', label: 'Computer Vision' },
  { id: 'obj', label: 'Object Detection' },
  { id: 'seg', label: 'Segmentation' },
  { id: 'gan', label: 'GANs' },
  { id: 'la', label: 'Linear Algebra' },
  { id: 'prob', label: 'Probability Theory' },
  { id: 'opt', label: 'Optimization' },
  { id: 'auto', label: 'Automation' },
  { id: 'rob', label: 'Robotics' },
  { id: 'hci', label: 'Human-AI Interaction' },
  { id: 'bc', label: 'Blockchain' },
  { id: 'crypto', label: 'Cryptography' },
  { id: 'dist', label: 'Distributed Systems' },
  { id: 'p2p', label: 'P2P Networks' },
  { id: 'bio', label: 'Bioinformatics' },
  { id: 'genomics', label: 'Genomics' },
  { id: 'protein', label: 'Protein Folding' },
];

const STOPWORDS = new Set([
  'about', 'above', 'after', 'again', 'against', 'almost', 'also', 'among', 'and', 'another', 'any',
  'are', 'around', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'can',
  'cannot', 'could', 'data', 'does', 'done', 'each', 'either', 'enough', 'from', 'have', 'into', 'its',
  'just', 'like', 'many', 'more', 'most', 'much', 'must', 'need', 'only', 'other', 'our', 'over',
  'same', 'should', 'some', 'such', 'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'under', 'using', 'very', 'was', 'were', 'what', 'when', 'which',
  'while', 'with', 'within', 'would', 'your',
]);

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function tokenize(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function titleCase(value) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function colorFromSlug(slug) {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = slug.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 72% 62%)`;
}

function topKeywords(text, maxCount) {
  const counts = new Map();
  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCount)
    .map(([token]) => token);
}

function scoreTopicMatch(tokens, topicLabel) {
  const topicTokens = tokenize(topicLabel);
  let score = 0;
  for (const token of topicTokens) {
    if (tokens.has(token)) {
      score += 2;
    }
    for (const candidate of tokens) {
      if (candidate.startsWith(token) || token.startsWith(candidate)) {
        score += 1;
      }
    }
  }
  return score;
}

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS docs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'done',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS derived_clusters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS derived_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    description TEXT NOT NULL,
    cluster_slug TEXT NOT NULL,
    radius INTEGER NOT NULL,
    importance INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (cluster_slug) REFERENCES derived_clusters(slug)
  );

  CREATE TABLE IF NOT EXISTS node_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_slug TEXT NOT NULL,
    target_slug TEXT NOT NULL,
    link_kind TEXT NOT NULL DEFAULT 'related',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(source_slug, target_slug)
  );

  CREATE TABLE IF NOT EXISTS doc_node_links (
    doc_id INTEGER NOT NULL,
    node_slug TEXT NOT NULL,
    score REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (doc_id, node_slug),
    FOREIGN KEY (doc_id) REFERENCES docs(id),
    FOREIGN KEY (node_slug) REFERENCES derived_nodes(slug)
  );
`);

const countRow = db.prepare('SELECT COUNT(*) AS total FROM docs').get();
if (countRow.total === 0) {
  const seed = db.prepare('INSERT INTO docs (title, text, status) VALUES (?, ?, ?)');
  seed.run('Brain-Computer Interfaces', 'demo', 'done');
  seed.run('Neural Networks Overview', 'demo', 'done');
}

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/docs', (_req, res) => {
  const docs = db
    .prepare(`
      SELECT d.id, d.title, d.text, d.status,
      COALESCE((
        SELECT json_group_array(node_slug)
        FROM doc_node_links dnl
        WHERE dnl.doc_id = d.id
      ), '[]') AS derivedNodeSlugs
      FROM docs d
      ORDER BY d.id ASC
    `)
    .all()
    .map((row) => ({
      id: row.id,
      title: row.title,
      text: row.text,
      status: row.status,
      derivedNodeSlugs: JSON.parse(row.derivedNodeSlugs),
    }));
  res.json(docs);
});

app.get('/api/network', (_req, res) => {
  const derivedClusters = db
    .prepare('SELECT slug AS id, label, color FROM derived_clusters ORDER BY id ASC')
    .all();
  const derivedNodes = db
    .prepare(`
      SELECT dn.slug AS id, dn.label, dn.description AS desc, dn.cluster_slug AS cluster,
             dn.radius AS r, dn.importance,
             COALESCE((
               SELECT COUNT(*) FROM node_links nl
               WHERE nl.source_slug = dn.slug OR nl.target_slug = dn.slug
             ), 0) AS degree
      FROM derived_nodes dn
      ORDER BY dn.id ASC
    `)
    .all();
  const derivedEdges = db
    .prepare('SELECT source_slug AS source, target_slug AS target, link_kind AS kind FROM node_links ORDER BY id ASC')
    .all();

  res.json({ derivedClusters, derivedNodes, derivedEdges });
});

app.post('/api/docs', (req, res) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  const status = typeof req.body.status === 'string' && req.body.status.trim() ? req.body.status.trim() : 'done';

  if (!text) {
    res.status(400).json({ message: 'text is required' });
    return;
  }

  const normalizedTitle = title || 'Untitled document';
  const insert = db.prepare('INSERT INTO docs (title, text, status) VALUES (?, ?, ?)');
  const result = insert.run(normalizedTitle, text, status);
  const docId = Number(result.lastInsertRowid);

  const keywords = topKeywords(`${normalizedTitle} ${text}`, 4);
  const primaryKeyword = keywords[0] ?? 'general';
  const clusterSlug = `derived-${slugify(primaryKeyword)}`;
  const clusterLabel = `${titleCase(primaryKeyword)} Concepts`;
  const clusterColor = colorFromSlug(clusterSlug);

  db.prepare(
    'INSERT INTO derived_clusters (slug, label, color) VALUES (?, ?, ?) ON CONFLICT(slug) DO NOTHING',
  ).run(clusterSlug, clusterLabel, clusterColor);

  const createNode = db.prepare(
    `
      INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO NOTHING
    `,
  );
  const linkDocNode = db.prepare(
    'INSERT INTO doc_node_links (doc_id, node_slug, score) VALUES (?, ?, ?) ON CONFLICT(doc_id, node_slug) DO NOTHING',
  );
  const createEdge = db.prepare(
    'INSERT INTO node_links (source_slug, target_slug, link_kind) VALUES (?, ?, ?) ON CONFLICT(source_slug, target_slug) DO NOTHING',
  );

  const createdNodeSlugs = [];
  const tokenSet = new Set(tokenize(`${normalizedTitle} ${text}`));

  keywords.forEach((keyword, index) => {
    const nodeSlug = `user-${docId}-${slugify(keyword)}`;
    const nodeLabel = titleCase(keyword);
    const nodeDesc = `Derived from document ${docId}: ${nodeLabel}`;
    const radius = Math.max(12, 18 - index * 2);
    const importance = Math.max(4, 8 - index);

    createNode.run(nodeSlug, nodeLabel, nodeDesc, clusterSlug, radius, importance);
    linkDocNode.run(docId, nodeSlug, Math.max(0.2, 1 - index * 0.15));
    createdNodeSlugs.push(nodeSlug);

    const relatedBaseNodes = BASE_TOPICS
      .map((topic) => ({ topicId: topic.id, score: scoreTopicMatch(tokenSet, topic.label) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);

    for (const related of relatedBaseNodes) {
      createEdge.run(nodeSlug, related.topicId, 'related-base');
    }
  });

  for (let i = 1; i < createdNodeSlugs.length; i += 1) {
    createEdge.run(createdNodeSlugs[i - 1], createdNodeSlugs[i], 'same-doc');
  }

  const created = db
    .prepare('SELECT id, title, text, status FROM docs WHERE id = ?')
    .get(docId);

  created.derivedNodeSlugs = createdNodeSlugs;

  res.status(201).json(created);
});

app.listen(port, () => {
  console.log(`SQLite API listening on http://localhost:${port}`);
});
