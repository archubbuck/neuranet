import { sql, eq } from 'drizzle-orm';
import * as s from '../db/schema.js';
import type { Dialect } from '../lib/sql-helpers.js';

type Db = any;

/** Helper: builds a parameterized IN (...) fragment. */
function sqlIn(values: string[]) {
  return sql.join(
    values.map((v) => sql`${v}`),
    sql`, `,
  );
}

/**
 * Node CRUD, merge, bulk-delete, and bulk-reassign — all transactional
 * where multi-write integrity matters.
 */
export class NodesRepo {
  constructor(
    private readonly db: Db,
    private readonly dialect: Dialect,
  ) {}

  /** Full node row with computed degree. */
  private nodeFields() {
    return {
      id: s.derivedNodes.slug,
      label: s.derivedNodes.label,
      desc: s.derivedNodes.description,
      cluster: s.derivedNodes.clusterSlug,
      r: s.derivedNodes.radius,
      importance: s.derivedNodes.importance,
      depth: s.derivedNodes.depth,
      isCentral: s.derivedNodes.isCentral,
      sentiment: s.derivedNodes.sentiment,
      degree:
        sql<number>`COALESCE((SELECT COUNT(*) FROM node_links nl WHERE nl.source_slug = derived_nodes.slug OR nl.target_slug = derived_nodes.slug), 0)`.as(
          'degree',
        ),
    };
  }

  listAll() {
    return this.db.select(this.nodeFields()).from(s.derivedNodes).orderBy(s.derivedNodes.id).all();
  }

  async getBySlug(slug: string) {
    const [row] = await this.db
      .select(this.nodeFields())
      .from(s.derivedNodes)
      .where(eq(s.derivedNodes.slug, slug));
    return row;
  }

  async getRawBySlug(slug: string) {
    const [row] = await this.db.select().from(s.derivedNodes).where(eq(s.derivedNodes.slug, slug));
    return row;
  }

  create(input: {
    slug: string;
    label: string;
    description: string;
    clusterSlug: string;
    radius: number;
    importance: number;
    depth: number;
  }) {
    const [row] = await this.db.insert(s.derivedNodes).values(input).returning();
    return row;
  }

  update(
    slug: string,
    patch: {
      label?: string;
      description?: string;
      clusterSlug?: string;
    },
  ) {
    const [row] = await this.db
      .update(s.derivedNodes)
      .set(patch)
      .where(eq(s.derivedNodes.slug, slug))
      .returning();
    return row;
  }

  async delete(slug: string): Promise<void> {
    this.db.transaction((tx: Db) => {
      tx.run(sql`DELETE FROM node_links WHERE source_slug = ${slug} OR target_slug = ${slug}`);
      tx.run(sql`DELETE FROM doc_node_links WHERE node_slug = ${slug}`);
      tx.run(sql`DELETE FROM derived_nodes WHERE slug = ${slug}`);
    });
  }

  async bulkDelete(nodeSlugs: string[]): Promise<number> {
    return await this.db.transaction(async (tx: Db) => {
      const slugs = sqlIn(nodeSlugs);
      tx.run(
        sql`DELETE FROM node_links WHERE source_slug IN (${slugs}) OR target_slug IN (${slugs})`,
      );
      await tx.execute(sql`DELETE FROM doc_node_links WHERE node_slug IN (${slugs})`);
      const result = await tx.execute(
        sql`DELETE FROM derived_nodes WHERE slug IN (${slugs}) RETURNING slug`,
      );
      return result.rows.length;
    });
  }

  bulkReassign(nodeSlugs: string[], clusterSlug: string) {
    const slugs = sqlIn(nodeSlugs);
    return this.db.run(
      sql`UPDATE derived_nodes SET cluster_slug = ${clusterSlug} WHERE slug IN (${slugs})`,
    );
  }

  async merge(
    targetSlug: string,
    sourceSlugs: string[],
  ): Promise<Record<string, unknown> | undefined> {
    return await this.db.transaction(async (tx: Db) => {
      const srcList = sqlIn(sourceSlugs);

      // Drop edges between target ↔ sources and between sources.
      tx.run(
        sql`DELETE FROM node_links WHERE source_slug = ${targetSlug} AND target_slug IN (${srcList})`,
      );
      tx.run(
        sql`DELETE FROM node_links WHERE target_slug = ${targetSlug} AND source_slug IN (${srcList})`,
      );
      tx.run(
        sql`DELETE FROM node_links WHERE source_slug IN (${srcList}) AND target_slug IN (${srcList})`,
      );

      // Reassign edges, skipping any that would violate the unique constraint
      // (Postgres equivalent of SQLite's UPDATE OR IGNORE).
      await tx.execute(
        sql`UPDATE node_links SET source_slug = ${targetSlug}
            WHERE source_slug IN (${srcList})
            AND NOT EXISTS (
              SELECT 1 FROM node_links dup
              WHERE dup.source_slug = ${targetSlug} AND dup.target_slug = node_links.target_slug
            )`,
      );
      await tx.execute(
        sql`UPDATE node_links SET target_slug = ${targetSlug}
            WHERE target_slug IN (${srcList})
            AND NOT EXISTS (
              SELECT 1 FROM node_links dup
              WHERE dup.target_slug = ${targetSlug} AND dup.source_slug = node_links.source_slug
            )`,
      );
      await tx.execute(
        sql`UPDATE doc_node_links SET node_slug = ${targetSlug}
            WHERE node_slug IN (${srcList})
            AND NOT EXISTS (
              SELECT 1 FROM doc_node_links dup
              WHERE dup.doc_id = doc_node_links.doc_id AND dup.node_slug = ${targetSlug}
            )`,
      );

      // Delete source nodes and their remaining edges.
      for (const src of sourceSlugs) {
        tx.run(sql`DELETE FROM node_links WHERE source_slug = ${src} OR target_slug = ${src}`);
        tx.run(sql`DELETE FROM doc_node_links WHERE node_slug = ${src}`);
        tx.run(sql`DELETE FROM derived_nodes WHERE slug = ${src}`);
      }

      const [node] = await tx
        .select(this.nodeFields())
        .from(s.derivedNodes)
        .where(eq(s.derivedNodes.slug, targetSlug));
      return node;
    });
  }
}
