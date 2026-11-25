import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// The dev server proxies /api to the Node backend (see server/). In production the backend serves
// the built client itself, so no proxy is needed.
const API_TARGET = process.env.WONDERMAP_API ?? 'http://localhost:4000';

const illustrationsDir = fileURLToPath(new URL('../illustrations', import.meta.url));

/** The art lives outside the client root: watch it so NEW illustration files are discovered without a restart. */
function watchIllustrations(): Plugin {
  return {
    name: 'wondermap:watch-illustrations',
    configureServer(server) {
      server.watcher.add(illustrationsDir);
    },
  };
}

export default defineConfig({
  plugins: [react(), watchIllustrations()],
  server: {
    port: 5173,
    proxy: { '/api': { target: API_TARGET, changeOrigin: true } },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
