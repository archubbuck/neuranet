import { asc, sql } from 'drizzle-orm';
import { orm, schema } from '../db';

interface NetworkNodeRow {
  id: string;
  label: string;
  desc: string;
  cluster: string;
  r: number;
  importance: number;
  depth: number;
  isCentral: number;
  sentiment: number | null;
  degree: number;
}

interface NetworkNode {
  id: string;
  label: string;
  desc: string;
  cluster: string;
  r: number;
  importance: number;
  depth: number;
  isCentral: boolean;
  sentiment?: number;
  degree: number;
}

const nodeDegree = sql<number>`coalesce(
  (
    select count(*)
    from node_links nl
    where nl.source_slug = ${schema.derivedNodes.slug}
      or nl.target_slug = ${schema.derivedNodes.slug}
  ),
  0
)`;

export function getNetworkSnapshot() {
  const derivedClusters = orm
    .select({
      id: schema.derivedClusters.slug,
      label: schema.derivedClusters.label,
      color: schema.derivedClusters.color,
    })
    .from(schema.derivedClusters)
    .orderBy(asc(schema.derivedClusters.slug))
    .all();

  const derivedNodes = (
    orm
      .select({
        id: schema.derivedNodes.slug,
        label: schema.derivedNodes.label,
        desc: schema.derivedNodes.description,
        cluster: schema.derivedNodes.clusterSlug,
        r: schema.derivedNodes.radius,
        importance: schema.derivedNodes.importance,
        depth: schema.derivedNodes.depth,
        isCentral: schema.derivedNodes.isCentral,
        sentiment: schema.derivedNodes.sentiment,
        degree: nodeDegree,
      })
      .from(schema.derivedNodes)
      .orderBy(asc(schema.derivedNodes.id))
      .all() as NetworkNodeRow[]
  ).map<NetworkNode>((row) => ({
    ...row,
    isCentral: Boolean(row.isCentral),
    sentiment: row.sentiment ?? undefined,
  }));

  const derivedEdges = orm
    .select({
      source: schema.nodeLinks.sourceSlug,
      target: schema.nodeLinks.targetSlug,
      kind: schema.nodeLinks.linkKind,
    })
    .from(schema.nodeLinks)
    .orderBy(asc(schema.nodeLinks.id))
    .all();

  return { derivedClusters, derivedNodes, derivedEdges };
}

function getCount(table: typeof schema.derivedNodes | typeof schema.derivedClusters | typeof schema.nodeLinks | typeof schema.dataSources | typeof schema.docs) {
  return orm
    .select({ n: sql<number>`count(*)` })
    .from(table)
    .get().n;
}

export function getReportsSnapshot() {
  const totals = {
    nodes: getCount(schema.derivedNodes),
    clusters: getCount(schema.derivedClusters),
    edges: getCount(schema.nodeLinks),
    sources: getCount(schema.dataSources),
    docs: getCount(schema.docs),
  };

  const clusterDistribution = orm
    .select({
      id: schema.derivedClusters.slug,
      label: schema.derivedClusters.label,
      color: schema.derivedClusters.color,
    })
    .from(schema.derivedClusters)
    .all()
    .map((cluster) => ({
      ...cluster,
      count: orm
        .select({ n: sql<number>`count(*)` })
        .from(schema.derivedNodes)
        .where(sql`${schema.derivedNodes.clusterSlug} = ${cluster.id}`)
        .get().n,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return { totals, clusterDistribution };
}
