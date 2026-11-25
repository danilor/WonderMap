import path from 'node:path';
import express from 'express';
import type { ErrorRequestHandler } from 'express';
import type { ServerConfig } from './config.ts';
import { mapsRouter } from './routes/maps.ts';
import { MapStorage } from './storage.ts';

export interface AppOptions {
  dataDir: ServerConfig['dataDir'];
  clientDist?: ServerConfig['clientDist'];
  bodyLimit?: ServerConfig['bodyLimit'];
}

/** Builds the Express app. Kept separate from `index.ts` so tests can use it without opening a port. */
export function createApp(options: AppOptions): express.Express {
  const storage = new MapStorage(options.dataDir);
  const app = express();
  app.disable('x-powered-by');

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    next();
  });
  app.use('/api', express.json({ limit: options.bodyLimit ?? '40mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, name: 'wondermap' });
  });
  app.use('/api/maps', mapsRouter(storage));
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  if (options.clientDist) {
    const dist = options.clientDist;
    app.use(
      express.static(dist, {
        index: 'index.html',
        // Vite puts a content hash in every file name under /assets, so those files never change. Everything else,
        // above all the app shell, is revalidated so a new build is picked up on the next load.
        setHeaders(res, filePath) {
          const hashed = path.relative(dist, filePath).split(path.sep)[0] === 'assets';
          res.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'no-cache');
        },
      }),
    );
    // Single-page app: every other path serves the app shell.
    app.get('/{*splat}', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  const onError: ErrorRequestHandler = (error: { type?: string; status?: number; message?: string }, _req, res, _next) => {
    if (error.type === 'entity.too.large') {
      res.status(413).json({ error: 'Map is too large to save' });
      return;
    }
    if (error.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Body is not valid JSON' });
      return;
    }
    console.error(error);
    res.status(error.status && error.status >= 400 && error.status < 600 ? error.status : 500).json({ error: 'Internal server error' });
  };
  app.use(onError);

  return app;
}
