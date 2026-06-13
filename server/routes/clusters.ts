/**
 * Cluster CRUD + atomic dissolve/merge.
 */
import { Router } from 'express';
import { clustersRepo } from '../db';
import * as schemas from '../schemas';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../lib/async-handler';
import { slugify, colorFromSlug } from '../lib/derivation';

const router = Router();

router.post(
  '/clusters',
  validateBody(schemas.createCluster),
  asyncHandler(async (req, res) => {
    const { label } = req.body as { label: string; color?: string };

    const slug = slugify(label);
    const exists = clustersRepo.getBySlug(slug);
    if (exists) {
      res.status(409).json({ message: 'a cluster with this name already exists' });
      return;
    }

    const color = (req.body as { color?: string }).color ?? colorFromSlug(slug);

    const created = clustersRepo.create({ slug, label, color });
    res.status(201).json({ id: created.slug, label: created.label, color: created.color });
  }),
);

router.put(
  '/clusters/:slug',
  validateBody(schemas.updateCluster),
  asyncHandler(async (req, res) => {
    const slug = req.params['slug'] as string;
    const cluster = clustersRepo.getBySlug(slug);
    if (!cluster) {
      res.status(404).json({ message: 'cluster not found' });
      return;
    }

    const body = req.body as { label?: string; color?: string };
    const label = body.label ?? cluster.label;
    const color = body.color ?? cluster.color;

    clustersRepo.update(slug, { label, color });
    res.json({ id: slug, label, color });
  }),
);

router.delete(
  '/clusters/:slug',
  asyncHandler(async (req, res) => {
    const slug = req.params['slug'] as string;
    const cluster = clustersRepo.getBySlug(slug);
    if (!cluster) {
      res.status(404).json({ message: 'cluster not found' });
      return;
    }

    await clustersRepo.deleteCascade(slug);
    res.json({ deleted: true });
  }),
);

router.post(
  '/clusters/dissolve',
  validateBody(schemas.dissolveClusters),
  asyncHandler(async (req, res) => {
    const { sourceSlugs, targetSlug } = req.body as {
      sourceSlugs: string[];
      targetSlug: string;
    };

    const target = clustersRepo.getBySlug(targetSlug);
    if (!target) {
      res.status(400).json({ message: 'target cluster does not exist' });
      return;
    }

    for (const src of sourceSlugs) {
      if (src === targetSlug) {
        res.status(400).json({ message: 'target cluster cannot be in sourceSlugs' });
        return;
      }
      if (!clustersRepo.getBySlug(src)) {
        res.status(404).json({ message: `source cluster not found: ${src}` });
        return;
      }
    }

    const reassigned = await clustersRepo.dissolve(sourceSlugs, targetSlug);

    res.json({ reassigned, targetSlug });
  }),
);

export default router;
