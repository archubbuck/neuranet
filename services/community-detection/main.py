"""
Community detection microservice for the Neuranet topic visualizer.

Runs Leiden algorithm on topic clusters and generates community summaries
via LLM. Exposed as a FastAPI HTTP service, called from the Express backend.

POST /detect          — run Leiden on a cluster's subgraph
POST /generate-report — generate an LLM summary for a detected community
GET  /health           — health check
"""

import os
import json
import logging
from typing import Optional

import psycopg2
import psycopg2.extras
import networkx as nx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="neuranet-community-detection")

POSTGRES_URL = os.getenv(
    "POSTGRES_URL", "postgres://postgres:postgres@postgres:5432/neuranet_dev"
)


def get_db():
    """Create a new database connection."""
    return psycopg2.connect(POSTGRES_URL)


class DetectRequest(BaseModel):
    cluster_slug: str


class GenerateReportRequest(BaseModel):
    cluster_slug: str
    community_nodes: list[str]


class CommunityInfo(BaseModel):
    id: int
    nodes: list[str]
    central_node: Optional[str] = None
    size: int


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/detect")
def detect_communities(req: DetectRequest):
    """
    Fetch all nodes and edges for a given cluster, build a networkx graph,
    run Leiden community detection, and return the partition.
    """
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Fetch nodes in this cluster
            cur.execute(
                "SELECT slug, label, is_central FROM derived_nodes WHERE cluster_slug = %s",
                (req.cluster_slug,),
            )
            nodes = cur.fetchall()
            if not nodes:
                return {"communities": [], "node_count": 0}

            node_slugs = [n["slug"] for n in nodes]

            # Fetch edges between these nodes
            cur.execute(
                """
                SELECT source_slug, target_slug, weight
                FROM node_links
                WHERE source_slug = ANY(%s) AND target_slug = ANY(%s)
                """,
                (node_slugs, node_slugs),
            )
            edges = cur.fetchall()
    finally:
        conn.close()

    # Build networkx graph
    G = nx.Graph()
    for n in nodes:
        G.add_node(n["slug"], is_central=n.get("is_central", False), label=n.get("label", n["slug"]))

    for e in edges:
        G.add_edge(e["source_slug"], e["target_slug"], weight=e.get("weight", 1.0))

    if G.number_of_edges() == 0:
        # No edges — each node is its own community
        communities = [
            {"id": i, "nodes": [n["slug"]], "central_node": n["slug"], "size": 1}
            for i, n in enumerate(nodes)
        ]
        return {"communities": communities, "node_count": len(nodes)}

    # Run Leiden (using networkx's community_louvain as fallback if leidenalg unavailable)
    try:
        import leidenalg
        import igraph as ig

        # Convert to igraph for leidenalg
        ig_graph = ig.Graph.TupleList(
            [(e["source_slug"], e["target_slug"], e.get("weight", 1.0)) for e in edges],
            weights=True,
        )
        partition = leidenalg.find_partition(
            ig_graph, leidenalg.ModularityVertexPartition, weights="weight"
        )
        community_map = {}
        for i, community in enumerate(partition):
            community_map[i] = [ig_graph.vs[v]["name"] for v in community]
    except ImportError:
        # Fallback: use networkx's greedy modularity communities
        from networkx.algorithms.community import greedy_modularity_communities

        communities_list = list(greedy_modularity_communities(G, weight="weight"))
        community_map = {i: list(c) for i, c in enumerate(communities_list)}

    # Build response
    communities = []
    for cid, member_slugs in community_map.items():
        # Find central node (by degree within community)
        subgraph = G.subgraph(member_slugs)
        central = max(member_slugs, key=lambda s: subgraph.degree(s)) if member_slugs else None

        communities.append(
            {
                "id": cid,
                "nodes": member_slugs,
                "central_node": central,
                "size": len(member_slugs),
            }
        )

    logger.info(
        "Detected %d communities in cluster '%s' (%d nodes)",
        len(communities),
        req.cluster_slug,
        len(nodes),
    )

    return {"communities": communities, "node_count": len(nodes)}


@app.post("/generate-report")
def generate_report(req: GenerateReportRequest):
    """
    Generate a community summary. In production, this would call an LLM.
    For now, generates a structural summary based on graph metrics.
    """
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Fetch node details
            cur.execute(
                "SELECT slug, label, description, importance, is_central FROM derived_nodes WHERE slug = ANY(%s)",
                (req.community_nodes,),
            )
            nodes = cur.fetchall()

            # Fetch edge count within community
            cur.execute(
                """
                SELECT COUNT(*) as edge_count
                FROM node_links
                WHERE source_slug = ANY(%s) AND target_slug = ANY(%s)
                """,
                (req.community_nodes, req.community_nodes),
            )
            edge_count = cur.fetchone()["edge_count"]
    finally:
        conn.close()

    node_labels = [n["label"] for n in nodes]
    central_nodes = [n["label"] for n in nodes if n.get("is_central")]
    avg_importance = sum(n.get("importance", 0) for n in nodes) / max(len(nodes), 1)

    summary = (
        f"Community of {len(nodes)} topics with {edge_count} connections. "
        f"Key topics: {', '.join(node_labels[:5])}"
        f"{'...' if len(node_labels) > 5 else ''}. "
    )
    if central_nodes:
        summary += f" Central themes: {', '.join(central_nodes)}. "
    summary += f"Average importance: {avg_importance:.1f}."

    return {
        "cluster_slug": req.cluster_slug,
        "node_count": len(nodes),
        "edge_count": edge_count,
        "summary": summary,
    }
