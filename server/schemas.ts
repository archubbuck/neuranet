/**
 * Zod schemas for every mutating endpoint. Parsed (and trimmed) values
 * replace `req.body` via the `validateBody` middleware, so route handlers
 * can assume well-formed input.
 */
import { z } from 'zod';

const trimmedString = z.string().trim();
const requiredSlug = trimmedString.min(1);
const slugArray = z.array(requiredSlug).min(1);

export const createSource = z
  .object({
    sourceType: requiredSlug,
    config: z.record(z.string(), z.unknown()).default({}),
  })
  .superRefine((val, ctx) => {
    if (val.sourceType === 'reddit' && !val.config['threadUrl']) {
      ctx.addIssue({
        code: 'custom',
        path: ['config', 'threadUrl'],
        message: 'config.threadUrl is required for reddit sources',
      });
    }
    if (val.sourceType === 'web' && !val.config['url']) {
      ctx.addIssue({
        code: 'custom',
        path: ['config', 'url'],
        message: 'config.url is required for web sources',
      });
    }
  });

export const createDoc = z.object({
  title: trimmedString.default(''),
  text: requiredSlug,
  status: trimmedString.default('done'),
});

export const createCluster = z.object({
  label: requiredSlug,
  color: trimmedString.min(1).optional(),
});

export const updateCluster = z.object({
  label: requiredSlug.optional(),
  color: trimmedString.min(1).optional(),
});

export const createNode = z.object({
  label: requiredSlug,
  clusterSlug: requiredSlug,
  desc: trimmedString.optional(),
});

export const updateNode = z.object({
  label: requiredSlug.optional(),
  description: trimmedString.optional(),
  clusterSlug: requiredSlug.optional(),
});

export const mergeNodes = z.object({
  targetSlug: requiredSlug,
  sourceSlugs: slugArray,
});

export const bulkReassignNodes = z.object({
  nodeSlugs: slugArray,
  clusterSlug: requiredSlug,
});

export const bulkDeleteNodes = z.object({
  nodeSlugs: slugArray,
});

export const dissolveClusters = z.object({
  sourceSlugs: slugArray,
  targetSlug: requiredSlug,
});

export const joinWaitlist = z.object({
  email: trimmedString.email('invalid email address'),
});

/**
 * Email/password sign-in schema. The frontend login form posts email +
 * password; the backend delegates to Better Auth's `signInEmail` API.
 */
export const signInEmail = z.object({
  email: trimmedString.email('invalid email address'),
  password: z.string().min(1, 'password is required'),
});

/**
 * Email/password sign-up schema. Registers a new user with Better Auth.
 * Passwords are hashed server-side by Better Auth; the client never sees
 * the raw hash.
 */
export const signUpEmail = z.object({
  email: trimmedString.email('invalid email address'),
  password: z.string().min(8, 'password must be at least 8 characters'),
  name: trimmedString.min(1, 'name is required'),
});

// ── Vector search ────────────────────────────────────────────────────

export const vectorSearchQuery = z.object({
  q: trimmedString.min(1, 'query is required'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// ── AI chat & actions ────────────────────────────────────────────────

export const aiChatBody = z.object({
  nodeSlug: requiredSlug,
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: trimmedString.min(1),
      }),
    )
    .min(1),
  contextDepth: z.coerce.number().int().min(1).max(5).default(2),
});

export const aiActionBody = z.object({
  nodeSlug: requiredSlug,
  action: z.enum(['summarize', 'explain', 'best_practices', 'compare']),
  targetSlug: requiredSlug.optional(),
});
