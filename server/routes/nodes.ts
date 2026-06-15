/**
 * Node CRUD + merge, bulk reassign, bulk delete.
 */
import { Router } from 'express';
import { nodesRepo, clustersRepo } from '../db.js';
import * as schemas from '../schemas.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../lib/async-handler.js';
import { slugify } from '../lib/derivation.js';

const router = Router();

router.post(
  '/nodes',
  validateBody(schemas.createNode),
  asyncHandler(async (req, res) => {
    const { label, clusterSlug } = req.body as {
      label: string;
      clusterSlug: string;
      desc?: string;
    };
    const desc = (req.body as { desc?: string }).desc ?? (label || 'Manually created topic');

    const cluster = await clustersRepo.getBySlug(clusterSlug);
    if (!cluster) {
      res.status(400).json({ message: 'target cluster does not exist' });
      return;
    }

    const slug = slugify(label);
    const existing = await nodesRepo.getRawBySlug(slug);
    if (existing) {
      res.status(409).json({ message: 'a node with this name already exists' });
      return;
    }

    await nodesRepo.create({
      slug,
      label,
      description: desc,
      clusterSlug,
      radius: 14,
      importance: 5,
      depth: 0,
    });
    res.status(201).json({ id: slug, label, desc, cluster: clusterSlug });
  }),
);

router.put(
  '/nodes/:slug',
  validateBody(schemas.updateNode),
  asyncHandler(async (req, res) => {
    const slug = req.params['slug'] as string;
    const node = await nodesRepo.getRawBySlug(slug);
    if (!node) {
      res.status(404).json({ message: 'node not found' });
      return;
    }

    const body = req.body as {
      label?: string;
      description?: string;
      clusterSlug?: string;
    };
    const label = body.label ?? node.label;
    const description = body.description ?? node.description;
    let clusterSlug = node.clusterSlug;
    if (body.clusterSlug) {
      const target = await clustersRepo.getBySlug(body.clusterSlug);
      if (!target) {
        res.status(400).json({ message: 'target cluster does not exist' });
        return;
      }
      clusterSlug = body.clusterSlug;
    }

    await nodesRepo.update(slug, { label, description, clusterSlug });
    res.json({ id: slug, label, desc: description, cluster: clusterSlug });
  }),
);

router.delete(
  '/nodes/:slug',
  asyncHandler(async (req, res) => {
    const slug = req.params['slug'] as string;
    const node = await nodesRepo.getRawBySlug(slug);
    if (!node) {
      res.status(404).json({ message: 'node not found' });
      return;
    }

    await nodesRepo.delete(slug);
    res.json({ deleted: true });
  }),
);

router.post(
  '/nodes/bulk-delete',
  validateBody(schemas.bulkDeleteNodes),
  asyncHandler(async (req, res) => {
    const { nodeSlugs } = req.body as { nodeSlugs: string[] };

    for (const slug of nodeSlugs) {
      if (!(await nodesRepo.getRawBySlug(slug))) {
        res.status(404).json({ message: `node not found: ${slug}` });
        return;
      }
    }

    const deleted = await nodesRepo.bulkDelete(nodeSlugs);
    res.json({ deleted });
  }),
);

router.post(
  '/nodes/merge',
  validateBody(schemas.mergeNodes),
  asyncHandler(async (req, res) => {
    const { targetSlug, sourceSlugs } = req.body as {
      targetSlug: string;
      sourceSlugs: string[];
    };

    const target = await nodesRepo.getRawBySlug(targetSlug);
    if (!target) {
      res.status(404).json({ message: 'target node not found' });
      return;
    }

    for (const src of sourceSlugs) {
      if (src === targetSlug) {
        res.status(400).json({ message: 'target node cannot be in sourceSlugs' });
        return;
      }
      if (!(await nodesRepo.getRawBySlug(src))) {
        res.status(404).json({ message: `source node not found: ${src}` });
        return;
      }
    }

    const updated = await nodesRepo.merge(targetSlug, sourceSlugs);
    res.json({ ...updated, isCentral: Boolean((updated as Record<string, unknown>)['isCentral']) });
  }),
);

router.post(
  '/nodes/bulk-reassign',
  validateBody(schemas.bulkReassignNodes),
  asyncHandler(async (req, res) => {
    const { nodeSlugs, clusterSlug } = req.body as {
      nodeSlugs: string[];
      clusterSlug: string;
    };

    const cluster = await clustersRepo.getBySlug(clusterSlug);
    if (!cluster) {
      res.status(400).json({ message: 'target cluster does not exist' });
      return;
    }

    for (const slug of nodeSlugs) {
      if (!(await nodesRepo.getRawBySlug(slug))) {
        res.status(404).json({ message: `node not found: ${slug}` });
        return;
      }
    }

    await nodesRepo.bulkReassign(nodeSlugs, clusterSlug);
    res.json({ reassigned: nodeSlugs.length, clusterSlug });
  }),
);

export default router;
