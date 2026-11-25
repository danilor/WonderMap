import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests: a real browser drives the production build, served by the real Node server.
 *
 *   npm run test:e2e                 builds, starts the server on a throw-away data folder, runs the tests
 *   WM_URL=http://localhost:5173 npm run test:e2e -- --grep sample    use a server that is already running
 *   E2E_CHANNEL=chrome npm run test:e2e                               pick another installed browser (default: msedge;
 *                                                                     "chromium" = the one from `npx playwright install`)
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.E2E_PORT ?? 4100);
const external = process.env.WM_URL;
const channel = process.env.E2E_CHANNEL ?? 'msedge';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  // The tests share one server (and one library of maps), so they run one after the other.
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: external ?? `http://127.0.0.1:${port}`,
    channel: channel === 'chromium' ? undefined : channel,
    viewport: { width: 1600, height: 1000 },
    acceptDownloads: true,
    trace: 'retain-on-failure',
  },
  webServer: external
    ? undefined
    : {
        command: 'node server/dist/index.js',
        cwd: root,
        url: `http://127.0.0.1:${port}/api/health`,
        reuseExistingServer: false,
        env: {
          PORT: String(port),
          DATA_DIR: path.join(tmpdir(), 'wondermap-e2e-data'),
          CLIENT_DIST: path.join(root, 'client', 'dist'),
        },
      },
});
