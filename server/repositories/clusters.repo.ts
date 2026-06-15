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
      .orderBy(s.derivedClusters.id);
  }

  async getBySlug(slug: string) {
    const [row] = await this.db
      .select()
      .from(s.derivedClusters)
      .where(eq(s.derivedClusters.slug, slug));
    return row;
  }

  async create(input: { slug: string; label: string; color: string }) {
    const [row] = await this.db.insert(s.derivedClusters).values(input).returning();
    return row;
  }

  async update(slug: string, patch: { label: string; color: string }) {
    const [row] = await this.db
      .update(s.derivedClusters)
      .set(patch)
      .where(eq(s.derivedClusters.slug, slug))
      .returning();
    return row;
  }

  /**
   * Deletes a cluster and cascades to its child nodes, edges, and
   * doc-node links — all within a single transaction.
   */
  async deleteCascade(slug: string): Promise<void> {
    await this.db.transaction(async (tx: Db) => {
      const nodeSlugs = await tx
        .select({ slug: s.derivedNodes.slug })
        .from(s.derivedNodes)
        .where(eq(s.derivedNodes.clusterSlug, slug));

      for (const node of nodeSlugs) {
        await tx.delete(s.nodeLinks).where(eq(s.nodeLinks.sourceSlug, node.slug));
        await tx.delete(s.nodeLinks).where(eq(s.nodeLinks.targetSlug, node.slug));
        await tx.delete(s.docNodeLinks).where(eq(s.docNodeLinks.nodeSlug, node.slug));
      }

      await tx.delete(s.derivedNodes).where(eq(s.derivedNodes.clusterSlug, slug));
      await tx.delete(s.derivedClusters).where(eq(s.derivedClusters.slug, slug));
    });
  }

  /**
   * Atomically reassigns all nodes from source clusters to a target
   * cluster and deletes the source clusters.
   */
  async dissolve(sourceSlugs: string[], targetSlug: string): Promise<number> {
    return await this.db.transaction(async (tx: Db) => {
      const updated = await tx
        .update(s.derivedNodes)
        .set({ clusterSlug: targetSlug })
        .where(inArray(s.derivedNodes.clusterSlug, sourceSlugs))
        .returning({ slug: s.derivedNodes.slug });

      await tx.delete(s.derivedClusters).where(inArray(s.derivedClusters.slug, sourceSlugs));

      return updated.length;
    });
  }
}
