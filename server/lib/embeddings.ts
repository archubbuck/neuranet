/**
 * Embedding generation via Vercel AI SDK / OpenAI.
 * All embedding calls flow through this module so the rest of the
 * codebase never imports provider-specific SDKs directly.
 */
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { logger } from './logger.js';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const DEFAULT_BATCH_SIZE = 20;

/** Single text → embedding vector. */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('cannot generate embedding for empty text');
  }

  try {
    const result = await embed({
      model: openai.embedding(EMBEDDING_MODEL),
      value: text.slice(0, 8191), // text-embedding-3-small max input tokens
    });
    return result.embedding as number[];
  } catch (err) {
    logger.error({ err }, '[embeddings] single embedding generation failed');
    throw err;
  }
}

/**
 * Batch generate embeddings. Chunks large arrays into batches to avoid
 * provider rate limits and reduce memory pressure.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  const nonEmpty = texts.filter((t) => t.trim().length > 0);

  for (let i = 0; i < nonEmpty.length; i += DEFAULT_BATCH_SIZE) {
    const batch = nonEmpty.slice(i, i + DEFAULT_BATCH_SIZE);
    const results = await Promise.all(
      batch.map((text) =>
        generateEmbedding(text.slice(0, 8191)).catch((err) => {
          logger.error({ err }, '[embeddings] batch item failed, using zero vector');
          return new Array(EMBEDDING_DIMENSIONS).fill(0);
        }),
      ),
    );
    embeddings.push(...results);
  }

  return embeddings;
}

/**
 * Builds a normalized text string from a node or document for embedding
 * purposes. Combines label + description for nodes, title + text for docs.
 */
export function embeddingText(input: {
  label?: string;
  description?: string;
  title?: string;
  text?: string;
}): string {
  const parts: string[] = [];
  if (input.title) parts.push(input.title);
  if (input.label) parts.push(input.label);
  if (input.description) parts.push(input.description);
  if (input.text) parts.push(input.text.slice(0, 2000));
  return parts.join('\n\n');
}
