#!/usr/bin/env node
/**
 * Makes ASSETS.md and the pictures it shows (docs/assets/**).
 *
 * The app draws every asset itself. This script starts the Vite server of the client, opens a blank page in a headless
 * browser, imports the modules of client/src/devtools from that server and has them draw every entry of the catalog
 * (illustrations/) with the same engine as the editor. Then it saves the pictures, writes ASSETS.md and removes the
 * pictures of assets that no longer exist.
 *
 *   npm run assets                                  # everything
 *   npm run assets -- --only symbol,brush           # just these kinds: terrain symbol brush path label font theme frame
 *   npm run assets -- --filter mountain             # just the assets whose id contains this text
 *   npm run assets -- --url http://localhost:5173   # use a dev server that is already running
 *
 * Partial runs (--only, --filter) only redraw those pictures: they never delete anything and never rewrite ASSETS.md, because
 * the file vouches that every picture is current. A unit test (client/src/devtools/assetsDoc.test.ts) fails while it is out of date.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer as createNetServer } from 'node:net';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from './lib/args.mjs';
import { launchBrowser } from './lib/browser.mjs';

const KINDS = ['terrain', 'symbol', 'brush', 'path', 'label', 'font', 'theme', 'frame'];
const ASSETS_DIR = 'docs/assets';
const DOC_FILE = 'ASSETS.md';

const root = fileURLToPath(new URL('..', import.meta.url));
const { opts } = parseArgs(process.argv.slice(2));
const only = parseKinds(opts.only);
const filter = typeof opts.filter === 'string' ? opts.filter.toLowerCase() : '';
const partial = only.size > 0 || filter !== '';

function fail(message) {
  console.error(message);
  process.exit(2);
}

function parseKinds(value) {
  const kinds = new Set();
  if (typeof value !== 'string') return kinds;
  for (const word of value.toLowerCase().split(',').map((w) => w.trim()).filter(Boolean)) {
    const kind = KINDS.find((k) => word === k || word === `${k}s` || word === `${k}es`);
    if (!kind) fail(`Unknown kind "${word}". The kinds are: ${KINDS.join(', ')}.`);
    kinds.add(kind);
  }
  return kinds;
}

function freePort() {
  return new Promise((done, reject) => {
    const probe = createNetServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => done(port));
    });
  });
}

/** Vite for the client, in this process: no HMR, no file watching, and no dependency pre-bundling (nothing here needs it). */
async function startServer() {
  let createServer;
  try {
    ({ createServer } = await import('vite'));
  } catch {
    fail('Vite is not installed. Run `npm install` first.');
  }
  const port = await freePort();
  const server = await createServer({
    root: join(root, 'client'),
    appType: 'custom',
    logLevel: 'error',
    clearScreen: false,
    cacheDir: join(root, 'client/node_modules/.vite-assets'),
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { host: '127.0.0.1', port, strictPort: true, hmr: false, watch: null },
  });
  await server.listen();
  return { server, origin: `http://127.0.0.1:${port}` };
}

/** Writes a file only when its content changed, so a rerun leaves unchanged pictures (and their git status) alone. */
function save(file, bytes) {
  const target = resolve(root, file);
  const before = existsSync(target) ? readFileSync(target) : null;
  if (before?.equals(bytes)) return 'unchanged';
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  return before ? 'updated' : 'created';
}

/** Deletes everything in docs/assets that the catalog no longer asks for, and the folders that this empties. */
function removeStale(keep) {
  const removed = [];
  const walk = (dir) => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, item.name);
      if (item.isDirectory()) {
        walk(path);
        if (readdirSync(path).length === 0) rmdirSync(path);
      } else if (!keep.has(relative(root, path).split(sep).join('/'))) {
        rmSync(path);
        removed.push(relative(root, path).split(sep).join('/'));
      }
    }
  };
  const base = resolve(root, ASSETS_DIR);
  if (existsSync(base)) walk(base);
  return removed;
}

/** Imports the devtools modules from the server. A cold dev server may reload the page once while it settles. */
async function loadTools(page) {
  for (let attempt = 1; ; attempt++) {
    try {
      await page.evaluate(async () => {
        const [images, doc, hash, catalog] = await Promise.all([
          import('/src/devtools/assetImages.ts'),
          import('/src/devtools/assetsDoc.ts'),
          import('/src/devtools/artHash.ts'),
          import('/src/devtools/assetCatalog.ts'),
        ]);
        window.__assets = {
          renderAsset: images.renderAsset,
          buildAssetsDoc: doc.buildAssetsDoc,
          artHash: hash.artHash,
          listAssets: () => catalog.listAssets().map((entry) => ({ ...entry, file: catalog.assetFile(entry) })),
        };
      });
      return;
    } catch (error) {
      if (attempt >= 3 || !/context was destroyed|navigation/i.test(String(error))) throw error;
      await page.waitForLoadState('load');
    }
  }
}

const started = Date.now();
let server = null;
let browser = null;
try {
  let origin;
  if (opts.url) origin = String(opts.url).replace(/\/$/, '');
  else ({ server, origin } = await startServer());

  browser = await launchBrowser();
  const page = await (await browser.newContext()).newPage();
  page.on('pageerror', (error) => console.error(`[page error] ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    // The page has no HMR socket on purpose, which makes the Vite client complain.
    if (/favicon|WebSocket connection to|\[vite\] failed to connect|Failed to send error to Vite server/i.test(text + (message.location().url ?? ''))) return;
    console.error(`[browser] ${text}`);
  });
  await page.route(`${origin}/__assets__`, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>WonderMap assets</title>' }),
  );
  try {
    await page.goto(`${origin}/__assets__`);
  } catch {
    fail(`Cannot open ${origin}. Leave out --url to let this script start the app by itself.`);
  }
  await loadTools(page);

  const catalog = await page.evaluate(() => window.__assets.listAssets());
  const wanted = catalog.filter(
    (entry) => (only.size === 0 || only.has(entry.kind)) && (!filter || entry.id.toLowerCase().includes(filter) || (entry.themeId ?? '').toLowerCase().includes(filter)),
  );
  if (wanted.length === 0) fail('Nothing matches --only/--filter.');
  console.log(`Drawing ${wanted.length}${partial ? ` of ${catalog.length}` : ''} pictures...`);

  const failures = [];
  const files = new Set();
  const tally = {};
  for (const entry of wanted) {
    const label = entry.themeId ? `${entry.themeId}-${entry.id}` : entry.id;
    try {
      const picture = await page.evaluate((e) => window.__assets.renderAsset(e), entry);
      files.add(picture.file);
      const counts = (tally[entry.kind] ??= { created: 0, updated: 0, unchanged: 0 });
      counts[save(picture.file, Buffer.from(picture.base64, 'base64'))]++;
    } catch (error) {
      failures.push(`${entry.kind} ${label}: ${String(error).split('\n')[0]}`);
    }
  }
  for (const [kind, c] of Object.entries(tally)) {
    console.log(`  ${kind.padEnd(8)} ${String(c.created + c.updated + c.unchanged).padStart(4)}   new ${c.created}, changed ${c.updated}, same ${c.unchanged}`);
  }
  if (failures.length) {
    for (const line of failures) console.error(`FAILED ${line}`);
    console.error(`${failures.length} pictures could not be drawn: ${DOC_FILE} was left as it was.`);
    process.exitCode = 1;
  } else if (partial) {
    console.log(`Partial run: ${DOC_FILE} was not touched and nothing was removed. Run \`npm run assets\` without --only/--filter to finish.`);
    console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)} s.`);
  } else {
    const hash = await page.evaluate(() => window.__assets.artHash());
    const markdown = await page.evaluate((h) => window.__assets.buildAssetsDoc(h), hash);
    console.log(`${DOC_FILE}: ${save(DOC_FILE, Buffer.from(markdown, 'utf8'))}`);
    const removed = removeStale(new Set(catalog.map((entry) => entry.file)));
    if (removed.length) console.log(`Removed ${removed.length} stale pictures:\n  ${removed.join('\n  ')}`);
    console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)} s.`);
  }
} finally {
  await browser?.close();
  await server?.close();
}
