import { sql } from 'drizzle-orm';
import * as s from '../db/schema';
import type { Dialect } from '../lib/sql-helpers';

type Db = any;

export class ReportsRepo {
  constructor(
    private readonly db: Db,
    private readonly dialect: Dialect,
  ) {}

  async getTotals() {
    const [[nodes], [clusters], [edges], [sources], [docs]] = await Promise.all([
      this.db.select({ n: sql<number>`COUNT(*)::int` }).from(s.derivedNodes),
      this.db.select({ n: sql<number>`COUNT(*)::int` }).from(s.derivedClusters),
      this.db.select({ n: sql<number>`COUNT(*)::int` }).from(s.nodeLinks),
      this.db.select({ n: sql<number>`COUNT(*)::int` }).from(s.dataSources),
      this.db.select({ n: sql<number>`COUNT(*)::int` }).from(s.docs),
    ]);
    return {
      nodes: nodes.n,
      clusters: clusters.n,
      edges: edges.n,
      sources: sources.n,
      docs: docs.n,
    };
  }

  async getClusterDistribution() {
    return this.db
      .select({
        id: s.derivedClusters.slug,
        label: s.derivedClusters.label,
        color: s.derivedClusters.color,
        count:
          sql<number>`COALESCE((SELECT COUNT(*)::int FROM derived_nodes dn WHERE dn.cluster_slug = derived_clusters.slug), 0)`.as(
            'count',
          ),
      })
      .from(s.derivedClusters)
      .orderBy(sql`count DESC`, s.derivedClusters.label);
  }
}
