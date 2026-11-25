#!/usr/bin/env node
/**
 * Headless screenshot helper for visual checks (uses the system Edge/Chrome via playwright-core).
 *
 *   npm run shot -- <url> <out.png> [--size 1600x1000] [--wait 800] [--selector "#id"] [--dpr 1]
 *                                   [--ready "window.__ready === true"] [--click "css"] [--logs]
 *
 * Browser console errors and uncaught exceptions are always printed so rendering bugs are visible.
 */
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseArgs } from './lib/args.mjs';
import { launchBrowser } from './lib/browser.mjs';

const { positional, opts } = parseArgs(process.argv.slice(2));

const [url, out = '.screenshots/shot.png'] = positional;
if (!url) {
  console.error('usage: node tools/screenshot.mjs <url> <out.png> [--size WxH] [--wait ms] [--selector css] [--dpr n] [--ready expr] [--click css] [--logs]');
  process.exit(2);
}

const [width, height] = String(opts.size ?? '1600x1000').split('x').map(Number);

const browser = await launchBrowser();
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: Number(opts.dpr ?? 1),
});
const page = await context.newPage();
let errors = 0;
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning' || opts.logs) console.log(`[console.${m.type()}] ${m.text()}`);
  if (m.type() === 'error') errors++;
});
page.on('pageerror', (e) => {
  errors++;
  console.log(`[pageerror] ${e.message}`);
});

await page.goto(url, { waitUntil: 'load' });
if (opts.ready) await page.waitForFunction(String(opts.ready), undefined, { timeout: 60000 });
if (opts.click) await page.click(String(opts.click));
await page.waitForTimeout(Number(opts.wait ?? 800));

const file = resolve(out);
mkdirSync(dirname(file), { recursive: true });
if (opts.selector) await page.locator(String(opts.selector)).first().screenshot({ path: file });
else await page.screenshot({ path: file });
console.log(`saved ${file} (${errors} error${errors === 1 ? '' : 's'})`);
await browser.close();
process.exit(errors ? 1 : 0);
