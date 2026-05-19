const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const port = Number(process.env.API_PORT || 3000);
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'topic-visualizer.db');

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
  const docs = db.prepare('SELECT id, title, text, status FROM docs ORDER BY id ASC').all();
  res.json(docs);
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

  const created = db
    .prepare('SELECT id, title, text, status FROM docs WHERE id = ?')
    .get(result.lastInsertRowid);

  res.status(201).json(created);
});

app.listen(port, () => {
  console.log(`SQLite API listening on http://localhost:${port}`);
});
