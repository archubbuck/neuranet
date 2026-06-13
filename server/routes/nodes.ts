/**
 * Node CRUD + merge, bulk reassign, bulk delete.
 */
import express, { type Request, type Response } from 'express';
import * as schemas from '../schemas';
import { validateBody } from '../middleware/validate';
import { slugify } from '../lib/derivation';
import {
  bulkDeleteNodes,
  bulkReassignNodes,
  createNode,
  deleteNode,
  findClusterBySlug,
  findNodeBySlug,
  mergeNodes,
  updateNode,
} from '../db/write-repository';

const router = express.Router();

router.post('/nodes', validateBody(schemas.createNode), (req: Request, res: Response) => {
  const body = req.body as { label: string; clusterSlug: string; desc?: string };
  const { label, clusterSlug } = body;
  const desc = body.desc ?? (label || 'Manually created topic');

  const cluster = findClusterBySlug(clusterSlug);
  if (!cluster) {
    res.status(400).json({ message: 'target cluster does not exist' });
    return;
  }

  const slug = slugify(label);
  const existing = findNodeBySlug(slug);
  if (existing) {
    res.status(409).json({ message: 'a node with this name already exists' });
    return;
  }

  createNode(slug, label, desc, clusterSlug, 14, 5, 0);

  res.status(201).json({ id: slug, label, desc, cluster: clusterSlug });
});

router.put('/nodes/:slug', validateBody(schemas.updateNode), (req: Request, res: Response) => {
  const slug = req.params['slug'] as string;
  const node = findNodeBySlug(slug);
  if (!node) {
    res.status(404).json({ message: 'node not found' });
    return;
  }

  const body = req.body as { label?: string; description?: string; clusterSlug?: string };
  const label = body.label ?? node.label;
  const description = body.description ?? node.description;
  let clusterSlug = node.cluster_slug;
  if (body.clusterSlug) {
    const target = body.clusterSlug;
    if (!findClusterBySlug(target)) {
      res.status(400).json({ message: 'target cluster does not exist' });
      return;
    }
    clusterSlug = target;
  }

  updateNode(slug, label, description, clusterSlug);
  res.json({ id: slug, label, desc: description, cluster: clusterSlug });
});

router.delete('/nodes/:slug', (req: Request, res: Response) => {
  const slug = req.params['slug'] as string;
  const node = findNodeBySlug(slug);
  if (!node) {
    res.status(404).json({ message: 'node not found' });
    return;
  }

  deleteNode(slug);
  res.json({ deleted: true });
});

router.post(
  '/nodes/bulk-delete',
  validateBody(schemas.bulkDeleteNodes),
  (req: Request, res: Response) => {
    const { nodeSlugs } = req.body as { nodeSlugs: string[] };

    for (const slug of nodeSlugs) {
      if (!findNodeBySlug(slug)) {
        res.status(404).json({ message: `node not found: ${slug}` });
        return;
      }
    }

    res.json({ deleted: bulkDeleteNodes(nodeSlugs) });
  },
);

router.post('/nodes/merge', validateBody(schemas.mergeNodes), (req: Request, res: Response) => {
  const { targetSlug, sourceSlugs } = req.body as {
    targetSlug: string;
    sourceSlugs: string[];
  };

  const target = findNodeBySlug(targetSlug);
  if (!target) {
    res.status(404).json({ message: 'target node not found' });
    return;
  }

  // Reject if any source node doesn't exist, or if target is in sources.
  for (const src of sourceSlugs) {
    if (src === targetSlug) {
      res.status(400).json({ message: 'target node cannot be in sourceSlugs' });
      return;
    }
    if (!findNodeBySlug(src)) {
      res.status(404).json({ message: `source node not found: ${src}` });
      return;
    }
  }

  res.json(mergeNodes(targetSlug, sourceSlugs));
});

router.post(
  '/nodes/bulk-reassign',
  validateBody(schemas.bulkReassignNodes),
  (req: Request, res: Response) => {
    const { nodeSlugs, clusterSlug } = req.body as {
      nodeSlugs: string[];
      clusterSlug: string;
    };

    const cluster = findClusterBySlug(clusterSlug);
    if (!cluster) {
      res.status(400).json({ message: 'target cluster does not exist' });
      return;
    }

    // Reject if any node doesn't exist.
    for (const slug of nodeSlugs) {
      if (!findNodeBySlug(slug)) {
        res.status(404).json({ message: `node not found: ${slug}` });
        return;
      }
    }

    res.json(bulkReassignNodes(nodeSlugs, clusterSlug));
  },
);

export default router;
