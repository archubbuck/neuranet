import { sql, eq } from 'drizzle-orm';
import * as s from '../db/schema';
import type { Dialect } from '../lib/sql-helpers';

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
        sql<number>`COALESCE((SELECT COUNT(*)::int FROM node_links nl WHERE nl.source_slug = derived_nodes.slug OR nl.target_slug = derived_nodes.slug), 0)`.as(
          'degree',
        ),
    };
  }

  async listAll() {
    return this.db.select(this.nodeFields()).from(s.derivedNodes).orderBy(s.derivedNodes.id);
  }

  async getBySlug(slug: string) {
    const rows = await this.db
      .select(this.nodeFields())
      .from(s.derivedNodes)
      .where(eq(s.derivedNodes.slug, slug));
    return rows[0];
  }

  async getRawBySlug(slug: string) {
    const rows = await this.db.select().from(s.derivedNodes).where(eq(s.derivedNodes.slug, slug));
    return rows[0];
  }

  async create(input: {
    slug: string;
    label: string;
    description: string;
    clusterSlug: string;
    radius: number;
    importance: number;
    depth: number;
  }) {
    const rows = await this.db.insert(s.derivedNodes).values(input).returning();
    return rows[0];
  }

  async update(
    slug: string,
    patch: {
      label?: string;
      description?: string;
      clusterSlug?: string;
    },
  ) {
    const rows = await this.db
      .update(s.derivedNodes)
      .set(patch)
      .where(eq(s.derivedNodes.slug, slug))
      .returning();
    return rows[0];
  }

  async delete(slug: string): Promise<void> {
    await this.db.transaction(async (tx: Db) => {
      await tx.execute(
        sql`DELETE FROM node_links WHERE source_slug = ${slug} OR target_slug = ${slug}`,
      );
      await tx.execute(sql`DELETE FROM doc_node_links WHERE node_slug = ${slug}`);
      await tx.execute(sql`DELETE FROM derived_nodes WHERE slug = ${slug}`);
    });
  }

  async bulkDelete(nodeSlugs: string[]): Promise<number> {
    return this.db.transaction(async (tx: Db) => {
      const slugs = sqlIn(nodeSlugs);
      await tx.execute(
        sql`DELETE FROM node_links WHERE source_slug IN (${slugs}) OR target_slug IN (${slugs})`,
      );
      await tx.execute(sql`DELETE FROM doc_node_links WHERE node_slug IN (${slugs})`);
      const result = await tx.execute(sql`DELETE FROM derived_nodes WHERE slug IN (${slugs})`);
      return (result as any).rowCount ?? 0;
    });
  }

  async bulkReassign(nodeSlugs: string[], clusterSlug: string): Promise<void> {
    const slugs = sqlIn(nodeSlugs);
    await this.db.execute(
      sql`UPDATE derived_nodes SET cluster_slug = ${clusterSlug} WHERE slug IN (${slugs})`,
    );
  }

  async merge(
    targetSlug: string,
    sourceSlugs: string[],
  ): Promise<Record<string, unknown> | undefined> {
    return this.db.transaction(async (tx: Db) => {
      const srcList = sqlIn(sourceSlugs);

      // Drop edges between target ↔ sources and between sources.
      await tx.execute(
        sql`DELETE FROM node_links WHERE source_slug = ${targetSlug} AND target_slug IN (${srcList})`,
      );
      await tx.execute(
        sql`DELETE FROM node_links WHERE target_slug = ${targetSlug} AND source_slug IN (${srcList})`,
      );
      await tx.execute(
        sql`DELETE FROM node_links WHERE source_slug IN (${srcList}) AND target_slug IN (${srcList})`,
      );

      // Reassign edges — skip rows that would violate the unique constraint
      // (PostgreSQL equivalent of SQLite's UPDATE OR IGNORE).
      await tx.execute(
        sql`UPDATE node_links SET source_slug = ${targetSlug} WHERE source_slug IN (${srcList}) AND NOT EXISTS (SELECT 1 FROM node_links nl2 WHERE nl2.source_slug = ${targetSlug} AND nl2.target_slug = node_links.target_slug)`,
      );
      await tx.execute(
        sql`UPDATE node_links SET target_slug = ${targetSlug} WHERE target_slug IN (${srcList}) AND NOT EXISTS (SELECT 1 FROM node_links nl2 WHERE nl2.target_slug = ${targetSlug} AND nl2.source_slug = node_links.source_slug)`,
      );
      await tx.execute(
        sql`UPDATE doc_node_links SET node_slug = ${targetSlug} WHERE node_slug IN (${srcList}) AND NOT EXISTS (SELECT 1 FROM doc_node_links dl2 WHERE dl2.node_slug = ${targetSlug} AND dl2.doc_id = doc_node_links.doc_id)`,
      );

      // Delete empty source nodes and leftover duplicate edges.
      for (const src of sourceSlugs) {
        await tx.execute(
          sql`DELETE FROM node_links WHERE source_slug = ${src} OR target_slug = ${src}`,
        );
        await tx.execute(sql`DELETE FROM doc_node_links WHERE node_slug = ${src}`);
        await tx.execute(sql`DELETE FROM derived_nodes WHERE slug = ${src}`);
      }

      const rows = await tx
        .select(this.nodeFields())
        .from(s.derivedNodes)
        .where(eq(s.derivedNodes.slug, targetSlug));
      return rows[0];
    });
  }
}
