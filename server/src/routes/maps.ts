import { Router } from 'express';
import type { MapStorage } from '../storage.ts';
import { isValidId, parseSavePayload } from '../validation.ts';

/** `/api/maps`: the library of saved maps. */
export function mapsRouter(storage: MapStorage): Router {
  const router = Router();

  router.param('id', (_req, res, next, id: string) => {
    if (!isValidId(id)) {
      res.status(400).json({ error: 'Invalid map id' });
      return;
    }
    next();
  });

  router.get('/', async (_req, res) => {
    res.json(await storage.list());
  });

  router.get('/:id', async (req, res) => {
    const json = await storage.read(req.params.id);
    if (json === null) {
      res.status(404).json({ error: 'Map not found' });
      return;
    }
    res.type('application/json').send(json);
  });

  router.put('/:id', async (req, res) => {
    const parsed = parseSavePayload(req.body, req.params.id);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    res.json(await storage.write(req.params.id, parsed.value));
  });

  router.delete('/:id', async (req, res) => {
    const existed = await storage.remove(req.params.id);
    if (!existed) {
      res.status(404).json({ error: 'Map not found' });
      return;
    }
    res.status(204).end();
  });

  return router;
}
