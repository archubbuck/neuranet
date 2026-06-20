import { sql } from 'drizzle-orm';
import * as s from '../db/schema.js';
import type { Dialect } from '../lib/sql-helpers.js';

type Db = any;

export class NetworkRepo {
  constructor(
    private readonly db: Db,
    private readonly dialect: Dialect,
  ) {}

  async getFullNetwork() {
    const [clusters, nodes, edges] = await Promise.all([
      this.db
        .select({
          id: s.derivedClusters.slug,
          label: s.derivedClusters.label,
          color: s.derivedClusters.color,
        })
        .from(s.derivedClusters)
        .orderBy(s.derivedClusters.id),
      this.db
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
            sql<number>`COALESCE((SELECT COUNT(*)::int FROM node_links nl WHERE nl.source_slug = derived_nodes.slug OR nl.target_slug = derived_nodes.slug), 0)`.as(
              'degree',
            ),
        })
        .from(s.derivedNodes)
        .orderBy(s.derivedNodes.id),
      this.db
        .select({
          source: s.nodeLinks.sourceSlug,
          target: s.nodeLinks.targetSlug,
          kind: s.nodeLinks.linkKind,
        })
        .from(s.nodeLinks)
        .orderBy(s.nodeLinks.id),
    ]);

    return { derivedClusters: clusters, derivedNodes: nodes, derivedEdges: edges };
  }

  /**
   * Retrieves the local subgraph around a node by traversing `node_links`
   * bidirectionally up to `maxDepth` hops. Returns the nodes, their
   * connecting edges, and the clusters they belong to.
   *
   * The anchor node itself is included so the caller always has the centre.
   */
  async getSubgraph(nodeSlug: string, maxDepth = 2) {
    const nodeResult = await this.db.execute(
      sql`
        WITH RECURSIVE subgraph AS (
          SELECT
            nl.source_slug,
            nl.target_slug,
            nl.link_kind,
            nl.weight,
            1::int AS depth
          FROM node_links nl
          WHERE nl.source_slug = ${nodeSlug} OR nl.target_slug = ${nodeSlug}

          UNION

          SELECT
            nl.source_slug,
            nl.target_slug,
            nl.link_kind,
            nl.weight,
            s.depth + 1
          FROM node_links nl
          JOIN subgraph s
            ON nl.source_slug = s.target_slug
            OR nl.target_slug = s.source_slug
            OR nl.source_slug = s.source_slug
            OR nl.target_slug = s.target_slug
          WHERE s.depth < ${maxDepth}
        ),
        ranked AS (
          SELECT DISTINCT ON (dn.slug)
            dn.slug,
            dn.label,
            dn.description,
            dn.cluster_slug,
            dn.radius,
            dn.importance,
            dn.depth AS node_depth,
            dn.is_central,
            dn.sentiment,
            dn.metadata,
            COALESCE(sg.min_depth, 0)::int AS hop_distance
          FROM (
            SELECT
              source_slug AS slug,
              MIN(depth) AS min_depth
            FROM subgraph
            WHERE source_slug != ${nodeSlug}
            GROUP BY source_slug
            UNION
            SELECT
              target_slug AS slug,
              MIN(depth) AS min_depth
            FROM subgraph
            WHERE target_slug != ${nodeSlug}
            GROUP BY target_slug
          ) sg
          JOIN derived_nodes dn ON dn.slug = sg.slug
          ORDER BY dn.slug, sg.min_depth ASC
        )
        SELECT * FROM ranked
        ORDER BY hop_distance ASC, importance DESC
      `,
    );

    const nodes = nodeResult.rows as {
      slug: string;
      label: string;
      description: string;
      cluster_slug: string;
      radius: number;
      importance: number;
      node_depth: number;
      is_central: boolean;
      sentiment: number | null;
      metadata: Record<string, unknown>;
      hop_distance: number;
    }[];

    // Fetch the anchor node separately
    const [anchor] = await this.db
      .select({
        slug: s.derivedNodes.slug,
        label: s.derivedNodes.label,
        description: s.derivedNodes.description,
        clusterSlug: s.derivedNodes.clusterSlug,
        radius: s.derivedNodes.radius,
        importance: s.derivedNodes.importance,
        depth: s.derivedNodes.depth,
        isCentral: s.derivedNodes.isCentral,
        sentiment: s.derivedNodes.sentiment,
        metadata: s.derivedNodes.metadata,
      })
      .from(s.derivedNodes)
      .where(sql`${s.derivedNodes.slug} = ${nodeSlug}`);

    const allSlugs = [...(anchor ? [anchor.slug] : []), ...(nodes as any[]).map((n) => n.slug)];

    // Fetch edges between all nodes in the subgraph
    const edges = allSlugs.length
      ? await this.db
          .select({
            source: s.nodeLinks.sourceSlug,
            target: s.nodeLinks.targetSlug,
            kind: s.nodeLinks.linkKind,
            weight: s.nodeLinks.weight,
          })
          .from(s.nodeLinks)
          .where(
            sql`${s.nodeLinks.sourceSlug} IN ${sql.raw(
              `(${allSlugs.map((s) => `'${s}'`).join(',')})`,
            )} AND ${s.nodeLinks.targetSlug} IN ${sql.raw(
              `(${allSlugs.map((s) => `'${s}'`).join(',')})`,
            )}`,
          )
      : [];

    // Fetch clusters for all nodes
    const clusterSlugs = [
      ...new Set([
        ...(anchor ? [anchor.clusterSlug] : []),
        ...(nodes as any[]).map((n) => n.cluster_slug),
      ]),
    ];

    const clusters = clusterSlugs.length
      ? await this.db
          .select({
            id: s.derivedClusters.slug,
            label: s.derivedClusters.label,
            color: s.derivedClusters.color,
          })
          .from(s.derivedClusters)
          .where(
            sql`${s.derivedClusters.slug} IN ${sql.raw(
              `(${clusterSlugs.map((s) => `'${s}'`).join(',')})`,
            )}`,
          )
      : [];

    return {
      anchor: anchor
        ? {
            id: anchor.slug,
            label: anchor.label,
            desc: anchor.description,
            cluster: anchor.clusterSlug,
            r: anchor.radius,
            importance: anchor.importance,
            depth: anchor.depth,
            isCentral: anchor.isCentral,
            sentiment: anchor.sentiment,
            metadata: anchor.metadata,
            degree: 0, // computed below
          }
        : null,
      derivedNodes: nodes.map((n) => ({
        id: n.slug,
        label: n.label,
        desc: n.description,
        cluster: n.cluster_slug,
        r: n.radius,
        importance: n.importance,
        depth: n.node_depth,
        isCentral: n.is_central,
        sentiment: n.sentiment,
        metadata: n.metadata,
        degree: edges.filter(
          (e: { source: string; target: string; kind: string; weight: number }) =>
            e.source === n.slug || e.target === n.slug,
        ).length,
        hopDistance: n.hop_distance,
      })),
      derivedEdges: edges.map(
        (e: { source: string; target: string; kind: string; weight: number }) => ({
          source: e.source,
          target: e.target,
          kind: e.kind,
          weight: e.weight,
        }),
      ),
      derivedClusters: clusters,
    };
  }
}
