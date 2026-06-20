/**
 * AI-powered GraphRAG endpoints: context-bounded chat and structured
 * actions (summarize, explain, best practices, compare).
 *
 * Each endpoint fetches the selected node's local subgraph + source
 * documents, constructs a system prompt with that context, and calls
 * the LLM via Vercel AI SDK.
 */
import { Router } from 'express';
import { streamText, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { networkRepo, docsRepo, nodesRepo } from '../db.js';
import config from '../config.js';
import * as schemas from '../schemas.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../lib/async-handler.js';
import { logger } from '../lib/logger.js';

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────

interface SubgraphContext {
  nodeLabel: string;
  nodeDescription: string;
  nodeMetadata: Record<string, unknown>;
  connectedNodes: { label: string; description: string; hopDistance: number }[];
  sourceDocs: { title: string; text: string }[];
}

async function buildContext(nodeSlug: string, maxDepth: number): Promise<SubgraphContext> {
  const detail = await nodesRepo.getNodeWithMetadata(nodeSlug);
  const subgraph = await networkRepo.getSubgraph(nodeSlug, maxDepth);
  const docs = await docsRepo.listAll();

  // Match docs to nodes in the subgraph via node slugs
  const subgraphNodeSlugs = new Set(subgraph.derivedNodes.map((n: { id: string }) => n.id));
  subgraphNodeSlugs.add(nodeSlug);

  const relevantDocs = docs.filter((d: { derivedNodeSlugs: readonly string[] }) =>
    d.derivedNodeSlugs.some((s: string) => subgraphNodeSlugs.has(s)),
  );

  return {
    nodeLabel: detail?.label ?? nodeSlug,
    nodeDescription: detail?.description ?? '',
    nodeMetadata: (detail?.metadata ?? {}) as Record<string, unknown>,
    connectedNodes: subgraph.derivedNodes.map(
      (n: { label: string; desc: string; hopDistance: number }) => ({
        label: n.label,
        description: n.desc ?? '',
        hopDistance: n.hopDistance,
      }),
    ),
    sourceDocs: relevantDocs.map((d: { title: string; text: string }) => ({
      title: d.title,
      text: d.text.slice(0, 2000),
    })),
  };
}

function buildSystemPrompt(ctx: SubgraphContext, action: string): string {
  const communityReport = ctx.nodeMetadata['communityReport']
    ? `\nCommunity Report: ${JSON.stringify(ctx.nodeMetadata['communityReport'])}`
    : '';

  const connectedNodes = ctx.connectedNodes
    .slice(0, 15)
    .map(
      (n) =>
        `- ${n.label} (${n.hopDistance} hop${n.hopDistance > 1 ? 's' : ''} away): ${n.description.slice(0, 120)}`,
    )
    .join('\n');

  const sourceContext = ctx.sourceDocs.length
    ? `\n\nSource Documents:\n${ctx.sourceDocs
        .slice(0, 5)
        .map((d) => `--- ${d.title} ---\n${d.text.slice(0, 800)}`)
        .join('\n\n')}`
    : '';

  return `You are an expert knowledge graph analyst helping a user explore a topic network.

The user selected the topic: "${ctx.nodeLabel}"
Description: ${ctx.nodeDescription}${communityReport}

Connected topics in the local neighborhood:
${connectedNodes || '(none)'}${sourceContext}

${action}

Keep responses concise, factual, and grounded in the provided context. If the context doesn't contain enough information, say so honestly.`;
}

// ── POST /api/ai/chat ─────────────────────────────────────────────────
// Streaming chat bounded to the selected node's subgraph context.

router.post(
  '/ai/chat',
  validateBody(schemas.aiChatBody),
  asyncHandler(async (req, res) => {
    if (!config.ai.enabled) {
      res.status(503).json({ message: 'AI features are not configured' });
      return;
    }

    const { nodeSlug, messages, contextDepth } = req.body as {
      nodeSlug: string;
      messages: { role: 'user' | 'assistant'; content: string }[];
      contextDepth: number;
    };

    const ctx = await buildContext(nodeSlug, contextDepth);
    const systemPrompt = buildSystemPrompt(
      ctx,
      "Answer the user's question using only the provided context about this topic network.",
    );

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    try {
      const result = streamText({
        model: openai(config.ai.chatModel),
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        maxTokens: 1000,
        temperature: 0.3,
      });

      for await (const chunk of result.textStream) {
        res.write(chunk);
      }
      res.end();
    } catch (err) {
      logger.error({ err, nodeSlug }, '[ai] chat stream failed');
      if (!res.headersSent) {
        res.status(500).json({ message: 'AI chat failed' });
      } else {
        res.end('\n\n[Error: AI response interrupted]');
      }
    }
  }),
);

// ── POST /api/ai/action ───────────────────────────────────────────────
// Non-streaming structured actions: summarize, explain, best_practices, compare.

const ACTION_PROMPTS: Record<string, string> = {
  summarize:
    'Provide a concise 3-5 sentence summary of this topic based on the connected topics and source documents. Focus on the most important relationships and themes.',
  explain:
    'Explain this concept clearly as if teaching someone encountering it for the first time. Use the connected topics and source documents as reference. Keep it under 250 words.',
  best_practices:
    'Based on the source documents and connected topics, extract and list 3-7 actionable best practices or key takeaways related to this topic. Format as a bulleted list.',
  compare:
    'Compare and contrast the two specified topics. Highlight key differences, similarities, and how they relate to each other in the knowledge graph.',
};

router.post(
  '/ai/action',
  validateBody(schemas.aiActionBody),
  asyncHandler(async (req, res) => {
    if (!config.ai.enabled) {
      res.status(503).json({ message: 'AI features are not configured' });
      return;
    }

    const { nodeSlug, action, targetSlug } = req.body as {
      nodeSlug: string;
      action: 'summarize' | 'explain' | 'best_practices' | 'compare';
      targetSlug?: string;
    };

    const ctx = await buildContext(nodeSlug, 2);
    let actionPrompt = ACTION_PROMPTS[action] ?? ACTION_PROMPTS['summarize'];

    if (action === 'compare' && targetSlug) {
      const targetCtx = await buildContext(targetSlug, 2);
      actionPrompt = `Compare "${ctx.nodeLabel}" with "${targetCtx.nodeLabel}".

Topic A — ${ctx.nodeLabel}: ${ctx.nodeDescription}
Connected to: ${ctx.connectedNodes.map((n) => n.label).join(', ')}

Topic B — ${targetCtx.nodeLabel}: ${targetCtx.nodeDescription}
Connected to: ${targetCtx.connectedNodes.map((n) => n.label).join(', ')}

Highlight key differences, similarities, and how they relate.`;
    }

    const systemPrompt = buildSystemPrompt(ctx, actionPrompt);

    try {
      const result = await generateText({
        model: openai(config.ai.chatModel),
        system: systemPrompt,
        prompt: actionPrompt,
        maxTokens: 800,
        temperature: 0.3,
      });

      res.json({
        action,
        nodeSlug,
        result: result.text,
      });
    } catch (err) {
      logger.error({ err, nodeSlug, action }, '[ai] action failed');
      res.status(500).json({ message: 'AI action failed' });
    }
  }),
);

export default router;
