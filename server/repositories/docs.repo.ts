import { sql, eq } from 'drizzle-orm';
import * as s from '../db/schema.js';
import type { Dialect } from '../lib/sql-helpers.js';

type Db = any;

export class DocsRepo {
  constructor(
    private readonly db: Db,
    private readonly dialect: Dialect,
  ) {}

  listAll() {
    return this.db
      .select({
        id: s.docs.id,
        title: s.docs.title,
        text: s.docs.text,
        status: s.docs.status,
        derivedNodeSlugs:
          sql<string>`COALESCE((SELECT json_agg(node_slug) FROM doc_node_links dnl WHERE dnl.doc_id = docs.id), '[]')`.as(
            'derivedNodeSlugs',
          ),
      })
      .from(s.docs)
      .orderBy(s.docs.id)
      .all();
  }

  getById(id: number) {
    return this.db.select().from(s.docs).where(eq(s.docs.id, id)).get();
  }

  /**
   * Creates a document and derives cluster, nodes, edges, and doc-node
   * links — all within a single atomic transaction.
   */
  async createWithDerivation(params: {
    title: string;
    text: string;
    status: string;
    keywords: string[];
    slugify: (s: string) => string;
    titleCase: (s: string) => string;
    colorFromSlug: (s: string) => string;
  }): Promise<Record<string, unknown>> {
    const { title, text, status, keywords, slugify, titleCase, colorFromSlug } = params;

    return this.db.transaction((tx: Db) => {
      // Insert doc.
      const doc = tx.insert(s.docs).values({ title, text, status }).returning().get();

      const primaryKeyword = keywords[0] ?? 'general';
      const clusterSlug = `derived-${slugify(primaryKeyword)}`;

      // Create cluster (ON CONFLICT DO NOTHING).
      tx.run(
        sql`INSERT INTO derived_clusters (slug, label, color) VALUES (${clusterSlug}, ${titleCase(primaryKeyword) + ' Concepts'}, ${colorFromSlug(clusterSlug)}) ON CONFLICT(slug) DO NOTHING`,
      );

      const createdNodeSlugs: string[] = [];

      for (let i = 0; i < keywords.length; i += 1) {
        const kw = keywords[i];
        const nodeSlug = `user-${doc.id}-${slugify(kw)}`;
        tx.run(
          sql`INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance) VALUES (${nodeSlug}, ${titleCase(kw)}, ${'Derived from document ' + doc.id + ': ' + titleCase(kw)}, ${clusterSlug}, ${Math.max(12, 18 - i * 2)}, ${Math.max(4, 8 - i)}) ON CONFLICT(slug) DO NOTHING`,
        );
        tx.run(
          sql`INSERT INTO doc_node_links (doc_id, node_slug, score) VALUES (${doc.id}, ${nodeSlug}, ${Math.max(0.2, 1 - i * 0.15)}) ON CONFLICT(doc_id, node_slug) DO NOTHING`,
        );
        createdNodeSlugs.push(nodeSlug);
      }

      // Chain edges between consecutive nodes.
      for (let i = 1; i < createdNodeSlugs.length; i += 1) {
        tx.run(
          sql`INSERT INTO node_links (source_slug, target_slug, link_kind) VALUES (${createdNodeSlugs[i - 1]}, ${createdNodeSlugs[i]}, 'same-doc') ON CONFLICT(source_slug, target_slug) DO NOTHING`,
        );
      }

      return { ...doc, derivedNodeSlugs: createdNodeSlugs };
    });
  }
}
