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
        sql<number>`COALESCE((SELECT COUNT(*) FROM node_links nl WHERE nl.source_slug = derived_nodes.slug OR nl.target_slug = derived_nodes.slug), 0)`.as(
          'degree',
        ),
    };
  }

  listAll() {
    return this.db.select(this.nodeFields()).from(s.derivedNodes).orderBy(s.derivedNodes.id).all();
  }

  getBySlug(slug: string) {
    return this.db
      .select(this.nodeFields())
      .from(s.derivedNodes)
      .where(eq(s.derivedNodes.slug, slug))
      .get();
  }

  getRawBySlug(slug: string) {
    return this.db.select().from(s.derivedNodes).where(eq(s.derivedNodes.slug, slug)).get();
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
    return this.db.insert(s.derivedNodes).values(input).returning().get();
  }

  update(
    slug: string,
    patch: {
      label?: string;
      description?: string;
      clusterSlug?: string;
    },
  ) {
    return this.db
      .update(s.derivedNodes)
      .set(patch)
      .where(eq(s.derivedNodes.slug, slug))
      .returning()
      .get();
  }

  async delete(slug: string): Promise<void> {
    this.db.transaction((tx: Db) => {
      tx.run(sql`DELETE FROM node_links WHERE source_slug = ${slug} OR target_slug = ${slug}`);
      tx.run(sql`DELETE FROM doc_node_links WHERE node_slug = ${slug}`);
      tx.run(sql`DELETE FROM derived_nodes WHERE slug = ${slug}`);
    });
  }

  async bulkDelete(nodeSlugs: string[]): Promise<number> {
    return this.db.transaction((tx: Db) => {
      const slugs = sqlIn(nodeSlugs);
      tx.run(
        sql`DELETE FROM node_links WHERE source_slug IN (${slugs}) OR target_slug IN (${slugs})`,
      );
      tx.run(sql`DELETE FROM doc_node_links WHERE node_slug IN (${slugs})`);
      const result = tx.run(sql`DELETE FROM derived_nodes WHERE slug IN (${slugs})`);
      return result.changes;
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
    return this.db.transaction((tx: Db) => {
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

      // Reassign edges (UPDATE OR IGNORE for UNIQUE constraint).
      tx.run(
        sql`UPDATE OR IGNORE node_links SET source_slug = ${targetSlug} WHERE source_slug IN (${srcList})`,
      );
      tx.run(
        sql`UPDATE OR IGNORE node_links SET target_slug = ${targetSlug} WHERE target_slug IN (${srcList})`,
      );
      tx.run(
        sql`UPDATE OR IGNORE doc_node_links SET node_slug = ${targetSlug} WHERE node_slug IN (${srcList})`,
      );

      // Delete empty source nodes and leftover duplicate edges.
      for (const src of sourceSlugs) {
        tx.run(sql`DELETE FROM node_links WHERE source_slug = ${src} OR target_slug = ${src}`);
        tx.run(sql`DELETE FROM doc_node_links WHERE node_slug = ${src}`);
        tx.run(sql`DELETE FROM derived_nodes WHERE slug = ${src}`);
      }

      return tx
        .select(this.nodeFields())
        .from(s.derivedNodes)
        .where(eq(s.derivedNodes.slug, targetSlug))
        .get();
    });
  }
}
