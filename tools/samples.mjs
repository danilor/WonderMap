#!/usr/bin/env node
/**
 * Makes the example maps: the files in client/public/samples/ that the title screen offers.
 *
 * The maps are written as code (client/src/devtools/samples/maps/*.ts), not drawn by hand. This script runs that code,
 * saves the maps as .wondermap.json and draws their thumbnails with the same engine as the editor, in a headless browser.
 *
 *   npm run samples                                  # build every map, then redo every thumbnail
 *   npm run samples -- build [slug...]               # only the .wondermap.json files
 *   npm run samples -- thumbs [slug...]              # only the .jpg thumbnails (also for maps that are not generated)
 *   npm run samples -- preview <slug> [options]      # a picture of one map for looking at while you work on it
 *       --scale 1                                    #   bitmap pixels per map pixel (multiples of 0.5, default 0.5)
 *       --crop 1200,600,1400,900                     #   only this part of the map: x,y,width,height in map pixels
 *       --width 1600                                 #   shrink the picture to this width (default 1600)
 *       --out some/where.png                         #   default: the temp folder
 *       --format jpeg --quality 0.85                 #   save a JPEG (smaller) instead of a PNG
 *       --file map.wondermap.json                    #   show this file instead of generating the map
 *       --names                                      #   also list how wide each name really is next to what the generator guessed
 *       --theme parchment --frame ornate             #   try another look (the saved map keeps its own)
 *
 * A unit test (client/src/devtools/samples/samples.test.ts) fails while a saved map differs from what its code makes,
 * so after changing a map or anything it uses, run `npm run samples` and commit the result.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer as createNetServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from './lib/args.mjs';
import { launchBrowser } from './lib/browser.mjs';

const SAMPLES_DIR = 'client/public/samples';
const COMMANDS = ['all', 'build', 'thumbs', 'preview'];

const root = fileURLToPath(new URL('..', import.meta.url));
const { positional, opts } = parseArgs(process.argv.slice(2));
const command = COMMANDS.includes(positional[0] ?? '') ? positional[0] : 'all';
const slugs = positional.slice(COMMANDS.includes(positional[0] ?? '') ? 1 : 0);

function fail(message) {
  console.error(message);
  process.exit(2);
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

/** Writes a file only when its content changed, so a rerun leaves unchanged files (and their git status) alone. */
function save(file, bytes) {
  const target = resolve(root, file);
  const before = existsSync(target) ? readFileSync(target) : null;
  if (before?.equals(bytes)) return 'unchanged';
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  return before ? 'updated' : 'created';
}

/** A blank page of the dev server with the browser-side module of the samples loaded. */
async function openPage(origin) {
  const browser = await launchBrowser();
  const page = await (await browser.newContext()).newPage();
  page.on('pageerror', (error) => console.error(`[page error] ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    // The page has no HMR socket on purpose, which makes the Vite client complain.
    if (/favicon|WebSocket connection to|\[vite\] failed to connect|Failed to send error to Vite server/i.test(text + (message.location().url ?? ''))) return;
    console.error(`[browser] ${text}`);
  });
  await page.route(`${origin}/__samples__`, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>WonderMap samples</title>' }),
  );
  await page.goto(`${origin}/__samples__`);
  // A cold dev server may reload the page once while it settles.
  for (let attempt = 1; ; attempt++) {
    try {
      await page.evaluate(async () => {
        window.__samples = await import('/src/devtools/samples/preview.ts');
      });
      break;
    } catch (error) {
      if (attempt >= 3 || !/context was destroyed|navigation/i.test(String(error))) throw error;
      await page.waitForLoadState('load');
    }
  }
  return { browser, page };
}

function pick(list) {
  if (slugs.length === 0) return list;
  const unknown = slugs.filter((slug) => !list.some((entry) => entry.slug === slug));
  if (unknown.length) fail(`Unknown map: ${unknown.join(', ')}. The maps are: ${list.map((entry) => entry.slug).join(', ')}.`);
  return list.filter((entry) => slugs.includes(entry.slug));
}

const started = Date.now();
let server = null;
let browser = null;
try {
  let origin;
  ({ server, origin } = await startServer());
  const samples = await server.ssrLoadModule('/src/devtools/samples/index.ts');
  const examples = await server.ssrLoadModule('/src/pages/home/examples.ts');
  let page = null;
  const browse = async () => {
    if (!page) ({ browser, page } = await openPage(origin));
    return page;
  };

  if (command === 'build' || command === 'all') {
    for (const entry of pick(samples.sampleGenerators)) {
      const t0 = Date.now();
      const { json, warnings } = samples.generateSample(entry.slug);
      const file = `${SAMPLES_DIR}/${entry.slug}.wondermap.json`;
      console.log(`${file}: ${save(file, Buffer.from(json, 'utf8'))} (${(json.length / 1024).toFixed(0)} KB, ${Date.now() - t0} ms)`);
      for (const warning of warnings) console.warn(`  warning: ${warning}`);
      if (warnings.length) process.exitCode = 1;
    }
  }

  if (command === 'thumbs' || command === 'all') {
    const width = Number(opts.width) || 720;
    for (const entry of pick(examples.exampleMaps)) {
      const json = readFileSync(resolve(root, SAMPLES_DIR, `${entry.slug}.wondermap.json`), 'utf8');
      const base64 = await (await browse()).evaluate(
        ([text, w]) => window.__samples.renderPreview(text, { scale: 0.5, maxWidth: w, format: 'jpeg', quality: 0.82 }),
        [json, width],
      );
      const file = `${SAMPLES_DIR}/${entry.slug}.jpg`;
      console.log(`${file}: ${save(file, Buffer.from(base64, 'base64'))}`);
    }
  }

  if (command === 'preview') {
    const slug = slugs[0];
    if (!slug && typeof opts.file !== 'string') fail('Say which map to show: npm run samples -- preview <slug>');
    let json;
    if (typeof opts.file === 'string') json = readFileSync(resolve(opts.file), 'utf8');
    else if (samples.sampleGenerators.some((entry) => entry.slug === slug)) {
      const made = samples.generateSample(slug);
      json = made.json;
      console.log(`${made.warnings.length} warnings`);
      for (const warning of made.warnings) console.log(`  ${warning}`);
    } else json = readFileSync(resolve(root, SAMPLES_DIR, `${slug}.wondermap.json`), 'utf8');
    if (typeof opts.theme === 'string' || typeof opts.frame === 'string') {
      const doc = JSON.parse(json);
      if (typeof opts.theme === 'string') doc.themeId = opts.theme;
      if (typeof opts.frame === 'string') doc.frameId = opts.frame;
      json = JSON.stringify(doc);
    }
    const crop = typeof opts.crop === 'string' ? opts.crop.split(',').map(Number) : undefined;
    if (crop && (crop.length !== 4 || crop.some((v) => !Number.isFinite(v)))) fail('--crop needs four numbers: x,y,width,height');
    const tab = await browse();
    const report = await tab.evaluate((text) => window.__samples.inspectMap(text), json);
    console.log(`${report.symbols} symbols (${report.assets} kinds), ${report.labels} names, ${report.paths} paths, ${(report.land * 100).toFixed(0)}% land`);
    for (const problem of report.problems) console.log(`  name: ${problem}`);
    if (opts.names) for (const fit of report.fits) console.log(`  ${fit.style.padEnd(9)} ${String(Math.round(fit.size)).padStart(3)} px  ${String(fit.measured).padStart(5)} real  ${String(fit.estimated).padStart(5)} guessed  ${fit.text}`);
    const jpeg = opts.format === 'jpeg';
    const base64 = await tab.evaluate(
      ([text, o]) => window.__samples.renderPreview(text, o),
      [json, { scale: Number(opts.scale) || 0.5, crop, maxWidth: Number(opts.width) || 1600, format: jpeg ? 'jpeg' : 'png', quality: Number(opts.quality) || undefined }],
    );
    const name = `${slug ?? 'map'}${crop ? `-${crop.join('_')}` : ''}.${jpeg ? 'jpg' : 'png'}`;
    const out = typeof opts.out === 'string' ? resolve(opts.out) : join(tmpdir(), 'wondermap-samples', name);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, Buffer.from(base64, 'base64'));
    console.log(`Picture: ${out}`);
  }
  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)} s.`);
} finally {
  await browser?.close();
  await server?.close();
}
