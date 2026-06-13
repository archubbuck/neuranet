import { sql } from 'drizzle-orm';
import * as s from '../db/schema';
import type { Dialect } from '../lib/sql-helpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export class ReportsRepo {
  constructor(
    private readonly db: Db,
    private readonly dialect: Dialect,
  ) {}

  getTotals() {
    return {
      nodes: this.db
        .select({ n: sql<number>`COUNT(*)` })
        .from(s.derivedNodes)
        .get()!.n,
      clusters: this.db
        .select({ n: sql<number>`COUNT(*)` })
        .from(s.derivedClusters)
        .get()!.n,
      edges: this.db
        .select({ n: sql<number>`COUNT(*)` })
        .from(s.nodeLinks)
        .get()!.n,
      sources: this.db
        .select({ n: sql<number>`COUNT(*)` })
        .from(s.dataSources)
        .get()!.n,
      docs: this.db
        .select({ n: sql<number>`COUNT(*)` })
        .from(s.docs)
        .get()!.n,
    };
  }

  getClusterDistribution() {
    return this.db
      .select({
        id: s.derivedClusters.slug,
        label: s.derivedClusters.label,
        color: s.derivedClusters.color,
        count:
          sql<number>`COALESCE((SELECT COUNT(*) FROM derived_nodes dn WHERE dn.cluster_slug = derived_clusters.slug), 0)`.as(
            'count',
          ),
      })
      .from(s.derivedClusters)
      .orderBy(sql`count DESC`, s.derivedClusters.label)
      .all();
  }
}
