import { sql } from 'drizzle-orm';

export type Dialect = 'postgres';

/**
 * Returns a Postgres JSON array aggregation SQL fragment.
 */
export function jsonGroupAgg(col: string, _dialect: Dialect) {
  return sql`COALESCE(json_agg(${sql.raw(col)})::text, '[]')`.mapWith(String);
}

/** Always true — kept for API compatibility with repos that still check. */
export function isPostgres(_dialect: Dialect): boolean {
  return true;
}

/**
 * Builds a parameterised recursive CTE that traverses `node_links`
 * bidirectionally from a given starting node slug up to `maxDepth` hops.
 *
 * Returns a SQL fragment suitable for use in a Drizzle `.from()` clause.
 * The fragment selects `{ source_slug, target_slug, link_kind, weight, depth }`.
 *
 * Usage:
 *   const cte = subgraphCte('my-node', 3);
 *   const rows = await db.execute(cte);
 */
export function subgraphCte(nodeSlug: string, maxDepth = 2) {
  return sql`
    WITH RECURSIVE subgraph AS (
      SELECT
        source_slug,
        target_slug,
        link_kind,
        weight,
        1::int AS depth
      FROM node_links
      WHERE source_slug = ${nodeSlug} OR target_slug = ${nodeSlug}

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
    )
    SELECT DISTINCT ON (slug)
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
    FROM subgraph sg
    JOIN derived_nodes dn
      ON dn.slug = sg.source_slug OR dn.slug = sg.target_slug
    WHERE dn.slug != ${nodeSlug}
    ORDER BY slug, sg.min_depth ASC
  `.mapWith((rows: any[]) =>
    rows.map((r: any) => ({
      slug: r.slug,
      label: r.label,
      description: r.description,
      clusterSlug: r.cluster_slug,
      radius: r.radius,
      importance: r.importance,
      depth: r.node_depth,
      isCentral: r.is_central,
      sentiment: r.sentiment,
      metadata: r.metadata,
      hopDistance: r.hop_distance,
    })),
  );
}

/**
 * Produces a SQL fragment for cosine-similarity vector search.
 *
 * Returns rows ordered by distance (nearest first), limited to `limit`.
 * The embedding must be a 1536-dimensional float array.
 *
 * Usage:
 *   const results = await db.execute(vectorSearch('derived_nodes', embedding, 10));
 */
export function vectorSearch(table: 'docs' | 'derived_nodes', embedding: number[], limit = 10) {
  const vectorStr = `[${embedding.join(',')}]`;
  return sql`
    SELECT
      id,
      slug,
      label,
      description,
      1.0 - (embedding <=> ${sql.raw(vectorStr)}::vector) AS similarity
    FROM ${sql.raw(table)}
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${sql.raw(vectorStr)}::vector
    LIMIT ${limit}
  `;
}
