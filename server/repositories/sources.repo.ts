import { sql, eq } from 'drizzle-orm';
import * as s from '../db/schema.js';
import type { Dialect } from '../lib/sql-helpers.js';

type Db = any;

export interface DeriveResult {
  nodeCount: number;
  edgeCount: number;
}

export class SourcesRepo {
  constructor(
    private readonly db: Db,
    private readonly dialect: Dialect,
  ) {}

  listAll() {
    return this.db.select().from(s.dataSources).orderBy(s.dataSources.createdAt);
  }

  async getById(id: number) {
    const [row] = await this.db.select().from(s.dataSources).where(eq(s.dataSources.id, id));
    return row;
  }

  async create(input: { sourceType: string; configJson: string }) {
    const [row] = await this.db
      .insert(s.dataSources)
      .values({
        sourceType: input.sourceType,
        configJson: input.configJson,
      })
      .returning();
    return row;
  }

  async delete(id: number) {
    await this.db.delete(s.dataSources).where(eq(s.dataSources.id, id));
  }

  async updateStatus(id: number, status: string, message: string | null = null) {
    await this.db
      .update(s.dataSources)
      .set({ status, statusMessage: message })
      .where(eq(s.dataSources.id, id));
  }

  /**
   * Derives clusters, nodes, and edges from a Reddit thread within a
   * single atomic transaction. Returns node and edge counts.
   */
  async deriveFromThread(
    sourceId: number,
    threadData: {
      threadId: string;
      title: string;
      body: string;
      comments: { body: string; depth: number }[];
    },
    helpers: {
      slugify: (s: string) => string;
      titleCase: (s: string) => string;
      colorFromSlug: (s: string) => string;
      tokenize: (s: string) => string[];
      topKeywords: (s: string, n: number) => string[];
      scoreTopicMatch: (tokens: Set<string>, label: string) => number;
    },
    config: {
      threadKeywordCount: number;
      commentKeywordCount: number;
      maxTopLevelComments: number;
    },
  ): Promise<DeriveResult> {
    const { slugify, titleCase, colorFromSlug, tokenize, topKeywords, scoreTopicMatch } = helpers;

    return await this.db.transaction(async (tx: Db) => {
      // Central node.
      const centralSlug = `reddit-${threadData.threadId}`;
      const centralLabel = threadData.title.substring(0, 120);
      const centralDesc = `Reddit thread: ${threadData.title.substring(0, 200)}`;
      const centralClusterSlug = `reddit-${threadData.threadId}`;
      const centralClusterLabel = `${centralLabel.substring(0, 40)} Discussion`;

      await tx.execute(
        sql`INSERT INTO derived_clusters (slug, label, color) VALUES (${centralClusterSlug}, ${centralClusterLabel}, ${colorFromSlug(centralClusterSlug)}) ON CONFLICT(slug) DO NOTHING`,
      );
      await tx.execute(
        sql`INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, depth, is_central) VALUES (${centralSlug}, ${centralLabel}, ${centralDesc}, ${centralClusterSlug}, 36, 10, 0, ${true}) ON CONFLICT(slug) DO UPDATE SET label=excluded.label`,
      );

      // Depth-1 keywords.
      const combinedText = `${threadData.title} ${threadData.body || ''}`;
      const depth1Keywords = topKeywords(combinedText, config.threadKeywordCount);

      let nodes = 1;
      let edges = 0;
      const depth1Slugs: string[] = [];

      for (let i = 0; i < depth1Keywords.length; i += 1) {
        const kw = depth1Keywords[i];
        const nodeSlug = `reddit-${threadData.threadId}-d1-${slugify(kw)}`;
        await tx.execute(
          sql`INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, depth) VALUES (${nodeSlug}, ${titleCase(kw)}, ${'Topic from Reddit thread: ' + titleCase(kw)}, ${centralClusterSlug}, ${Math.max(14, 24 - i * 2)}, ${Math.max(5, 9 - i)}, 1) ON CONFLICT(slug) DO NOTHING`,
        );
        depth1Slugs.push(nodeSlug);
        nodes += 1;
        await tx.execute(
          sql`INSERT INTO node_links (source_slug, target_slug, link_kind) VALUES (${centralSlug}, ${nodeSlug}, 'central-topic') ON CONFLICT(source_slug, target_slug) DO NOTHING`,
        );
        edges += 1;
      }

      // Depth-2 from comments.
      const topLevelComments = threadData.comments.filter((c) => c.depth === 0);

      for (const comment of topLevelComments.slice(0, config.maxTopLevelComments)) {
        const commentKeywords = topKeywords(comment.body, config.commentKeywordCount);
        const commentTokenSet = new Set(tokenize(comment.body));
        for (const kw of commentKeywords) {
          let bestParent = depth1Slugs[0];
          let bestScore = 0;
          for (const d1Slug of depth1Slugs) {
            // Look up D1 node label from within transaction.
            const [d1Node] = await tx
              .select({ label: s.derivedNodes.label })
              .from(s.derivedNodes)
              .where(eq(s.derivedNodes.slug, d1Slug));
            if (!d1Node) continue;
            const s2 = scoreTopicMatch(commentTokenSet, d1Node.label);
            if (s2 > bestScore) {
              bestScore = s2;
              bestParent = d1Slug;
            }
          }
          if (bestScore === 0) continue;

          const nodeSlug = `reddit-${threadData.threadId}-d2-${slugify(kw)}`;
          await tx.execute(
            sql`INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, depth) VALUES (${nodeSlug}, ${titleCase(kw)}, ${'Sub-topic from discussion: ' + titleCase(kw)}, ${centralClusterSlug}, 12, 4, 2) ON CONFLICT(slug) DO NOTHING`,
          );
          nodes += 1;
          await tx.execute(
            sql`INSERT INTO node_links (source_slug, target_slug, link_kind) VALUES (${bestParent}, ${nodeSlug}, 'topic-subtopic') ON CONFLICT(source_slug, target_slug) DO NOTHING`,
          );
          edges += 1;
        }
      }

      // Cross-link depth-1.
      for (let i = 1; i < depth1Slugs.length; i += 1) {
        await tx.execute(
          sql`INSERT INTO node_links (source_slug, target_slug, link_kind) VALUES (${depth1Slugs[i - 1]}, ${depth1Slugs[i]}, 'related-topic') ON CONFLICT(source_slug, target_slug) DO NOTHING`,
        );
        edges += 1;
      }

      await tx
        .update(s.dataSources)
        .set({
          status: 'done',
          statusMessage: `Extracted ${nodes} nodes and ${edges} edges`,
        })
        .where(eq(s.dataSources.id, sourceId));

      return { nodeCount: nodes, edgeCount: edges };
    });
  }

  /**
   * Derives clusters, nodes, and edges from a web page within a
   * single atomic transaction. Returns node and edge counts.
   */
  async deriveFromWebPage(
    sourceId: number,
    pageData: { title: string; body: string },
    helpers: {
      slugify: (s: string) => string;
      titleCase: (s: string) => string;
      colorFromSlug: (s: string) => string;
      tokenize: (s: string) => string[];
      topKeywords: (s: string, n: number) => string[];
    },
    config: { keywordCount: number },
  ): Promise<DeriveResult> {
    const { slugify, titleCase, colorFromSlug, topKeywords } = helpers;

    return await this.db.transaction(async (tx: Db) => {
      // Generate a stable slug from the title.
      const pageSlug = slugify(pageData.title).substring(0, 60);
      const centralSlug = `web-${pageSlug}`;
      const centralLabel = pageData.title.substring(0, 120);
      const centralDesc = `Article: ${pageData.title.substring(0, 200)}`;
      const centralClusterSlug = `web-${pageSlug}`;
      const centralClusterLabel = `${centralLabel.substring(0, 40)}`;

      await tx.execute(
        sql`INSERT INTO derived_clusters (slug, label, color) VALUES (${centralClusterSlug}, ${centralClusterLabel}, ${colorFromSlug(centralClusterSlug)}) ON CONFLICT(slug) DO NOTHING`,
      );
      await tx.execute(
        sql`INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, depth, is_central) VALUES (${centralSlug}, ${centralLabel}, ${centralDesc}, ${centralClusterSlug}, 36, 10, 0, ${true}) ON CONFLICT(slug) DO UPDATE SET label=excluded.label`,
      );

      // Depth-1 keywords from title + body.
      const combinedText = `${pageData.title} ${pageData.body || ''}`;
      const keywords = topKeywords(combinedText, config.keywordCount);

      let nodes = 1;
      let edges = 0;
      const depth1Slugs: string[] = [];

      for (let i = 0; i < keywords.length; i += 1) {
        const kw = keywords[i];
        const nodeSlug = `web-${pageSlug}-d1-${slugify(kw)}`;
        await tx.execute(
          sql`INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, depth) VALUES (${nodeSlug}, ${titleCase(kw)}, ${'Topic from article: ' + titleCase(kw)}, ${centralClusterSlug}, ${Math.max(14, 24 - i * 2)}, ${Math.max(5, 9 - i)}, 1) ON CONFLICT(slug) DO NOTHING`,
        );
        depth1Slugs.push(nodeSlug);
        nodes += 1;
        await tx.execute(
          sql`INSERT INTO node_links (source_slug, target_slug, link_kind) VALUES (${centralSlug}, ${nodeSlug}, 'central-topic') ON CONFLICT(source_slug, target_slug) DO NOTHING`,
        );
        edges += 1;
      }

      // Cross-link depth-1 nodes.
      for (let i = 1; i < depth1Slugs.length; i += 1) {
        await tx.execute(
          sql`INSERT INTO node_links (source_slug, target_slug, link_kind) VALUES (${depth1Slugs[i - 1]}, ${depth1Slugs[i]}, 'related-topic') ON CONFLICT(source_slug, target_slug) DO NOTHING`,
        );
        edges += 1;
      }

      await tx
        .update(s.dataSources)
        .set({
          status: 'done',
          statusMessage: `Extracted ${nodes} nodes and ${edges} edges`,
        })
        .where(eq(s.dataSources.id, sourceId));

      return { nodeCount: nodes, edgeCount: edges };
    });
  }
}
