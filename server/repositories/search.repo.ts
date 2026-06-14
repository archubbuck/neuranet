import { like, or } from 'drizzle-orm';
import * as s from '../db/schema.js';
import type { Dialect } from '../lib/sql-helpers.js';

type Db = any;

const SNIPPET_PAD = 80;

function makeSnippet(text: string, needle: string): string {
  if (!text) return '';
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return text.slice(0, 160);
  const start = Math.max(0, idx - SNIPPET_PAD);
  const end = Math.min(text.length, idx + needle.length + SNIPPET_PAD);
  return (start > 0 ? '\u2026' : '') + text.slice(start, end) + (end < text.length ? '\u2026' : '');
}

interface SearchResult {
  type: 'node' | 'doc';
  id: string | number;
  label: string;
  snippet: string;
  meta: string;
  score: number;
}

export class SearchRepo {
  constructor(
    private readonly db: Db,
    private readonly dialect: Dialect,
  ) {}

  search(q: string): SearchResult[] {
    if (q.length < 2) return [];

    const likePattern = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;

    const nodeRows = this.db
      .select({
        id: s.derivedNodes.slug,
        label: s.derivedNodes.label,
        desc: s.derivedNodes.description,
        cluster: s.derivedNodes.clusterSlug,
      })
      .from(s.derivedNodes)
      .where(
        or(like(s.derivedNodes.label, likePattern), like(s.derivedNodes.description, likePattern)),
      )
      .limit(25)
      .all();

    const docRows = this.db
      .select({
        id: s.docs.id,
        title: s.docs.title,
        text: s.docs.text,
      })
      .from(s.docs)
      .where(or(like(s.docs.title, likePattern), like(s.docs.text, likePattern)))
      .limit(25)
      .all();

    const results: SearchResult[] = [];

    for (const row of nodeRows) {
      let score = 0;
      if (row.label.toLowerCase().includes(q.toLowerCase())) score += 2;
      if (row.desc.toLowerCase().includes(q.toLowerCase())) score += 1;
      results.push({
        type: 'node',
        id: row.id,
        label: row.label,
        snippet: makeSnippet(row.desc, q),
        meta: row.cluster,
        score,
      });
    }

    for (const row of docRows) {
      let score = 0;
      if (row.title.toLowerCase().includes(q.toLowerCase())) score += 2;
      if (row.text.toLowerCase().includes(q.toLowerCase())) score += 1;
      results.push({
        type: 'doc',
        id: row.id,
        label: row.title,
        snippet: makeSnippet(row.text, q),
        meta: `${row.text.length} chars`,
        score,
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 25);
  }
}
