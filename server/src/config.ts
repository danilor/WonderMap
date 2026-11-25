import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ServerConfig {
  port: number;
  /** Folder that holds `maps/*.json`. */
  dataDir: string;
  /** Built client served in production, or `null` when it does not exist (development uses the Vite server). */
  clientDist: string | null;
  /** Largest accepted request body (maps with big terrain layers and thumbnails are a few MB at most). */
  bodyLimit: string;
}

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Reads the configuration from environment variables (`PORT`, `DATA_DIR`, `CLIENT_DIST`). */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = Number(env.PORT ?? 4000);
  const dist = path.resolve(env.CLIENT_DIST ?? path.join(serverRoot, '..', 'client', 'dist'));
  return {
    port: Number.isInteger(port) && port > 0 && port < 65536 ? port : 4000,
    dataDir: path.resolve(env.DATA_DIR ?? path.join(serverRoot, 'data')),
    clientDist: existsSync(path.join(dist, 'index.html')) ? dist : null,
    bodyLimit: env.BODY_LIMIT ?? '40mb',
  };
}
