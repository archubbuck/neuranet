import { ilike, or, sql } from 'drizzle-orm';
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

  async search(q: string): Promise<SearchResult[]> {
    if (q.length < 2) return [];

    const likePattern = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;

    const [nodeRows, docRows] = await Promise.all([
      this.db
        .select({
          id: s.derivedNodes.slug,
          label: s.derivedNodes.label,
          desc: s.derivedNodes.description,
          cluster: s.derivedNodes.clusterSlug,
        })
        .from(s.derivedNodes)
        .where(
          or(
            ilike(s.derivedNodes.label, likePattern),
            ilike(s.derivedNodes.description, likePattern),
          ),
        )
        .limit(25),
      this.db
        .select({
          id: s.docs.id,
          title: s.docs.title,
          text: s.docs.text,
        })
        .from(s.docs)
        .where(or(ilike(s.docs.title, likePattern), ilike(s.docs.text, likePattern)))
        .limit(25),
    ]);

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

  /**
   * Cosine-similarity vector search across derived_nodes.
   * Returns nodes ranked by semantic proximity to the query embedding,
   * with a similarity score between 0 and 1.
   */
  async vectorSearch(embedding: number[], limit = 10): Promise<SearchResult[]> {
    const vectorStr = `[${embedding.join(',')}]`;

    const result = await this.db.execute(
      sql`
        SELECT
          dn.slug,
          dn.label,
          dn.description,
          dn.cluster_slug,
          1.0 - (dn.embedding <=> ${sql.raw(vectorStr)}::vector) AS similarity
        FROM derived_nodes dn
        WHERE dn.embedding IS NOT NULL
        ORDER BY dn.embedding <=> ${sql.raw(vectorStr)}::vector
        LIMIT ${limit}
      `,
    );

    const rows = result.rows as {
      slug: string;
      label: string;
      description: string;
      cluster_slug: string;
      similarity: number;
    }[];

    return rows.map((r) => ({
      type: 'node' as const,
      id: r.slug,
      label: r.label,
      snippet: (r.description || '').slice(0, 200),
      meta: `cluster: ${r.cluster_slug} · ${(r.similarity * 100).toFixed(0)}% match`,
      score: r.similarity,
    }));
  }

  /**
   * Vector search across docs table by embedding similarity.
   */
  async vectorSearchDocs(embedding: number[], limit = 10): Promise<SearchResult[]> {
    const vectorStr = `[${embedding.join(',')}]`;

    const result = await this.db.execute(
      sql`
        SELECT
          d.id,
          d.title,
          d.text,
          1.0 - (d.embedding <=> ${sql.raw(vectorStr)}::vector) AS similarity
        FROM docs d
        WHERE d.embedding IS NOT NULL
        ORDER BY d.embedding <=> ${sql.raw(vectorStr)}::vector
        LIMIT ${limit}
      `,
    );

    const rows = result.rows as {
      id: number;
      title: string;
      text: string;
      similarity: number;
    }[];

    return rows.map((r) => ({
      type: 'doc' as const,
      id: r.id,
      label: r.title,
      snippet: (r.text || '').slice(0, 200),
      meta: `${r.text?.length || 0} chars · ${(r.similarity * 100).toFixed(0)}% match`,
      score: r.similarity,
    }));
  }
}
