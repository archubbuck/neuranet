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
