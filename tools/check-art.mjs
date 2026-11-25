#!/usr/bin/env node
/**
 * Art bounds check: finds symbols whose drawing is cut off by the sprite bitmap (a hard flat edge in the editor).
 *
 * Every variant of every symbol is drawn into an oversized canvas through the running Vite dev server and the pixels
 * outside the design box are measured. The renderer keeps a small margin around the box (`overdraw` in
 * `illustrations/kit/bounds.ts`); art that spills farther than that gets cut, and fails this check.
 *
 *   npm run dev -w client                       # in another terminal
 *   npm run check:art -- [--url http://localhost:5173] [--filter castle.] [--all]
 *
 * `--all` also lists the symbols that spill but stay inside the margin (harmless, but worth knowing about).
 */
import { fileURLToPath } from 'node:url';
import { parseArgs } from './lib/args.mjs';
import { launchBrowser } from './lib/browser.mjs';

const { opts } = parseArgs(process.argv.slice(2));

const url = String(opts.url ?? 'http://localhost:5173');
const filter = opts.filter ? String(opts.filter) : '';
const root = fileURLToPath(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '');
const fs = `/@fs/${root.replace(/^\//, '')}`;
const PROBE = 64; // design units of room drawn around each box
const ALPHA = 60; // ignore the faintest antialiasing

const browser = await launchBrowser();
const page = await (await browser.newContext()).newPage();
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
try {
  await page.goto(url, { waitUntil: 'load' });
} catch {
  console.error(`Cannot open ${url}. Start the client first: npm run dev -w client`);
  await browser.close();
  process.exit(2);
}

const report = await page.evaluate(
  async ({ fs, probe, alpha, filter }) => {
    const { symbols } = await import(`${fs}/illustrations/index.ts`);
    const kit = await import(`${fs}/illustrations/kit/index.ts`);
    const out = [];
    for (const def of symbols) {
      if (filter && !def.id.startsWith(filter)) continue;
      const [w, h] = def.size;
      const margin = kit.overdraw(def.size);
      let worst = null;
      for (let variant = 0; variant < def.variants; variant++) {
        const canvas = document.createElement('canvas');
        canvas.width = w + probe * 2;
        canvas.height = h + probe * 2;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.translate(probe, probe);
        const seed = kit.combineSeed(def.id, variant);
        try {
          def.draw({ ctx, w, h, rand: kit.createRng(seed), variant, seed });
        } catch (error) {
          out.push({ id: def.id, variant, error: String(error), margin });
          continue;
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const side = { left: 0, right: 0, top: 0, bottom: 0 };
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            if (data[(y * canvas.width + x) * 4 + 3] < alpha) continue;
            if (x < probe) side.left = Math.max(side.left, probe - x);
            else if (x >= probe + w) side.right = Math.max(side.right, x - (probe + w) + 1);
            if (y < probe) side.top = Math.max(side.top, probe - y);
            else if (y >= probe + h) side.bottom = Math.max(side.bottom, y - (probe + h) + 1);
          }
        }
        const over = Math.max(side.left, side.right, side.top, side.bottom);
        if (over > 0 && (!worst || over > worst.over)) worst = { id: def.id, variant, over, margin, ...side };
      }
      if (worst) out.push(worst);
    }
    return { out, total: symbols.length };
  },
  { fs, probe: PROBE, alpha: ALPHA, filter },
);
await browser.close();

const errors = report.out.filter((r) => r.error);
const cut = report.out.filter((r) => !r.error && r.over > r.margin).sort((a, b) => b.over - b.margin - (a.over - a.margin));
const spill = report.out.filter((r) => !r.error && r.over <= r.margin).sort((a, b) => b.over - a.over);
const sides = (r) => ['left', 'right', 'top', 'bottom'].filter((k) => r[k] > 0).map((k) => `${k} ${r[k]}`).join(', ');

for (const r of errors) console.log(`ERROR  ${r.id} v${r.variant}: ${r.error}`);
for (const r of cut) console.log(`CUT    ${r.id} v${r.variant}: ${r.over}px outside the box, margin ${r.margin}px (${sides(r)})`);
if (opts.all) for (const r of spill) console.log(`spill  ${r.id} v${r.variant}: ${r.over}px (${sides(r)})`);
console.log(`${report.total} symbols checked: ${cut.length} cut, ${spill.length} spill inside the margin, ${errors.length} failed to draw`);
process.exit(cut.length || errors.length ? 1 : 0);
