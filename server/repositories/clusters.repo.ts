import { eq, inArray } from 'drizzle-orm';
import * as s from '../db/schema.js';
import type { Dialect } from '../lib/sql-helpers.js';

type Db = any;

/**
 * Cluster CRUD and transactional dissolve/delete-cascade operations.
 */
export class ClustersRepo {
  constructor(
    private readonly db: Db,
    private readonly dialect: Dialect,
  ) {}

  listAll() {
    return this.db
      .select({
        id: s.derivedClusters.slug,
        label: s.derivedClusters.label,
        color: s.derivedClusters.color,
      })
      .from(s.derivedClusters)
      .orderBy(s.derivedClusters.id)
      .all();
  }

  getBySlug(slug: string) {
    return this.db.select().from(s.derivedClusters).where(eq(s.derivedClusters.slug, slug)).get();
  }

  create(input: { slug: string; label: string; color: string }) {
    return this.db.insert(s.derivedClusters).values(input).returning().get();
  }

  update(slug: string, patch: { label: string; color: string }) {
    return this.db
      .update(s.derivedClusters)
      .set(patch)
      .where(eq(s.derivedClusters.slug, slug))
      .returning()
      .get();
  }

  /**
   * Deletes a cluster and cascades to its child nodes, edges, and
   * doc-node links — all within a single transaction.
   */
  async deleteCascade(slug: string): Promise<void> {
    this.db.transaction((tx: Db) => {
      const nodeSlugs = tx
        .select({ slug: s.derivedNodes.slug })
        .from(s.derivedNodes)
        .where(eq(s.derivedNodes.clusterSlug, slug))
        .all();

      for (const node of nodeSlugs) {
        tx.delete(s.nodeLinks).where(eq(s.nodeLinks.sourceSlug, node.slug)).run();
        tx.delete(s.nodeLinks).where(eq(s.nodeLinks.targetSlug, node.slug)).run();
        tx.delete(s.docNodeLinks).where(eq(s.docNodeLinks.nodeSlug, node.slug)).run();
      }

      tx.delete(s.derivedNodes).where(eq(s.derivedNodes.clusterSlug, slug)).run();
      tx.delete(s.derivedClusters).where(eq(s.derivedClusters.slug, slug)).run();
    });
  }

  /**
   * Atomically reassigns all nodes from source clusters to a target
   * cluster and deletes the source clusters.
   */
  async dissolve(sourceSlugs: string[], targetSlug: string): Promise<number> {
    return this.db.transaction((tx: Db) => {
      const result = tx
        .update(s.derivedNodes)
        .set({ clusterSlug: targetSlug })
        .where(inArray(s.derivedNodes.clusterSlug, sourceSlugs))
        .run();

      tx.delete(s.derivedClusters).where(inArray(s.derivedClusters.slug, sourceSlugs)).run();

      return result.changes;
    });
  }
}
