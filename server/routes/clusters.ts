/**
 * Cluster CRUD + atomic dissolve/merge.
 */
import express, { type Request, type Response } from 'express';
import * as schemas from '../schemas';
import { validateBody } from '../middleware/validate';
import { slugify, colorFromSlug } from '../lib/derivation';
import {
  createCluster,
  deleteCluster,
  dissolveClusters,
  findClusterBySlug,
  updateCluster,
} from '../db/write-repository';

const router = express.Router();

router.post('/clusters', validateBody(schemas.createCluster), (req: Request, res: Response) => {
  const { label } = req.body as { label: string; color?: string };

  const slug = slugify(label);
  const exists = findClusterBySlug(slug);
  if (exists) {
    res.status(409).json({ message: 'a cluster with this name already exists' });
    return;
  }

  const color = (req.body as { color?: string }).color ?? colorFromSlug(slug);

  createCluster(slug, label, color);
  res.status(201).json({ id: slug, label, color });
});

router.put(
  '/clusters/:slug',
  validateBody(schemas.updateCluster),
  (req: Request, res: Response) => {
    const slug = req.params['slug'] as string;
    const cluster = findClusterBySlug(slug);
    if (!cluster) {
      res.status(404).json({ message: 'cluster not found' });
      return;
    }

    const body = req.body as { label?: string; color?: string };
    const label = body.label ?? cluster.label;
    const color = body.color ?? cluster.color;

    updateCluster(slug, label, color);
    res.json({ id: slug, label, color });
  },
);

router.delete('/clusters/:slug', (req: Request, res: Response) => {
  const slug = req.params['slug'] as string;
  const cluster = findClusterBySlug(slug);
  if (!cluster) {
    res.status(404).json({ message: 'cluster not found' });
    return;
  }

  deleteCluster(slug);
  res.json({ deleted: true });
});

router.post(
  '/clusters/dissolve',
  validateBody(schemas.dissolveClusters),
  (req: Request, res: Response) => {
    const { targetSlug, sourceSlugs } = req.body as {
      targetSlug: string;
      sourceSlugs: string[];
    };

    if (sourceSlugs.includes(targetSlug)) {
      res.status(400).json({ message: 'target cluster cannot be in sourceSlugs' });
      return;
    }

    if (!findClusterBySlug(targetSlug)) {
      res.status(404).json({ message: 'target cluster not found' });
      return;
    }
    for (const src of sourceSlugs) {
      if (!findClusterBySlug(src)) {
        res.status(404).json({ message: `source cluster not found: ${src}` });
        return;
      }
    }

    res.json(dissolveClusters(targetSlug, sourceSlugs));
  },
);

export default router;
