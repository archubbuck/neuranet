import { sql } from 'drizzle-orm';
import * as s from '../db/schema.js';
import type { Dialect } from '../lib/sql-helpers.js';

type Db = any;

export class NetworkRepo {
  constructor(
    private readonly db: Db,
    private readonly dialect: Dialect,
  ) {}

  getFullNetwork() {
    const clusters = this.db
      .select({
        id: s.derivedClusters.slug,
        label: s.derivedClusters.label,
        color: s.derivedClusters.color,
      })
      .from(s.derivedClusters)
      .orderBy(s.derivedClusters.id)
      .all();

    const nodes = this.db
      .select({
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
      })
      .from(s.derivedNodes)
      .orderBy(s.derivedNodes.id)
      .all();

    const edges = this.db
      .select({
        source: s.nodeLinks.sourceSlug,
        target: s.nodeLinks.targetSlug,
        kind: s.nodeLinks.linkKind,
      })
      .from(s.nodeLinks)
      .orderBy(s.nodeLinks.id)
      .all();

    return { derivedClusters: clusters, derivedNodes: nodes, derivedEdges: edges };
  }
}
