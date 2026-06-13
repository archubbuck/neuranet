/**
 * Ranked search across nodes (label + description) and docs (title + text).
 * Uses parameterised LIKE rather than FTS5 because the SQLite build shipped
 * with `better-sqlite3` doesn't always include FTS5 and our corpora are
 * small (hundreds of rows, not millions).
 */
import express, { type Request, type Response } from 'express';
import db from '../db';

const router = express.Router();

const SNIPPET_PAD = 80;

function makeSnippet(text: string, needle: string): string {
  if (!text) return '';
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return text.slice(0, 160);
  const start = Math.max(0, idx - SNIPPET_PAD);
  const end = Math.min(text.length, idx + needle.length + SNIPPET_PAD);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

interface NodeSearchRow {
  id: string;
  label: string | null;
  desc: string | null;
  cluster: string;
}

interface DocSearchRow {
  id: number;
  title: string | null;
  text: string | null;
}

interface SearchResult {
  type: 'node' | 'doc';
  id: string;
  label: string | null;
  snippet: string;
  meta: string;
  score: number;
}

router.get('/search', (req: Request, res: Response) => {
  const q = typeof req.query['q'] === 'string' ? (req.query['q'] as string).trim() : '';
  if (q.length < 2) {
    res.json({ results: [] });
    return;
  }

  const like = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
  const nodeRows = db
    .prepare(
      `SELECT slug AS id, label, description AS desc, cluster_slug AS cluster
     FROM derived_nodes
     WHERE lower(label) LIKE lower(?) ESCAPE '\\' OR lower(description) LIKE lower(?) ESCAPE '\\'
     LIMIT 25`,
    )
    .all(like, like) as NodeSearchRow[];

  const docRows = db
    .prepare(
      `SELECT id, title, text
     FROM docs
     WHERE lower(title) LIKE lower(?) ESCAPE '\\' OR lower(text) LIKE lower(?) ESCAPE '\\'
     LIMIT 25`,
    )
    .all(like, like) as DocSearchRow[];

  const results: SearchResult[] = [];
  for (const row of nodeRows) {
    const labelMatch = (row.label ?? '').toLowerCase().includes(q.toLowerCase());
    results.push({
      type: 'node',
      id: row.id,
      label: row.label,
      snippet: makeSnippet(row.desc ?? '', q),
      meta: `cluster: ${row.cluster}`,
      score: labelMatch ? 2 : 1,
    });
  }
  for (const row of docRows) {
    const titleMatch = (row.title ?? '').toLowerCase().includes(q.toLowerCase());
    results.push({
      type: 'doc',
      id: String(row.id),
      label: row.title,
      snippet: makeSnippet(row.text ?? '', q),
      meta: `doc #${row.id}`,
      score: titleMatch ? 2 : 1,
    });
  }
  results.sort((a, b) => b.score - a.score);
  res.json({ results: results.slice(0, 40) });
});

export default router;
