import { brushes, fontList, frames, labelStyles, pathStyles, symbols, terrains, themes } from '@wondermap/illustrations';
import { describe, expect, it } from 'vitest';
import { artHash, artSourceFiles } from './artHash';
import { ASSETS_DIR, assetFile, listAssets } from './assetCatalog';
import { ART_HASH_PATTERN, buildAssetsDoc, headingSlug } from './assetsDoc';

const FIX = 'Run `npm run assets` and commit ASSETS.md together with docs/assets/.';

/* ------------------------------------------------------------------------------------------- */
/* The committed ASSETS.md and its pictures: the guard that keeps them in step with the art     */
/* ------------------------------------------------------------------------------------------- */

const REPO = '../../../';
const docs = import.meta.glob('../../../ASSETS.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
// Only the names are needed, so the pictures themselves are never loaded.
const pictures = Object.keys(import.meta.glob('../../../docs/assets/**/*')).map((key) => key.slice(REPO.length));
const committed = (Object.values(docs)[0] ?? '').replace(/\r\n/g, '\n');
const recordedHash = ART_HASH_PATTERN.exec(committed)?.[1];

/** Where two texts first differ: enough to find the fault without printing a 90 KB diff. */
function firstDifference(actual: string, expected: string): string | undefined {
  if (actual === expected) return undefined;
  const a = actual.split('\n');
  const e = expected.split('\n');
  const found = a.findIndex((line, i) => line !== e[i]);
  const at = found === -1 ? a.length : found;
  return `line ${at + 1}\n  committed: ${a[at] ?? '(end of file)'}\n  generated: ${e[at] ?? '(end of file)'}`;
}

describe('ASSETS.md', () => {
  it('exists', () => {
    expect(committed, `ASSETS.md is missing. ${FIX}`).not.toBe('');
  });

  it('is the text the illustrations catalog produces', () => {
    const difference = firstDifference(committed, buildAssetsDoc(recordedHash ?? ''));
    expect(difference, `ASSETS.md no longer matches the catalog. ${FIX}`).toBeUndefined();
  });

  it('shows the art as it is now', async () => {
    expect(recordedHash, 'ASSETS.md records no art fingerprint').toBeDefined();
    expect(await artHash(), `The art, or the code that draws it, changed since the pictures were made. ${FIX}`).toBe(recordedHash);
  });

  it('has a picture for every asset and none for assets that are gone', () => {
    const wanted = new Set(listAssets().map(assetFile));
    const present = new Set(pictures);
    expect([...wanted].filter((file) => !present.has(file)), `Pictures are missing. ${FIX}`).toEqual([]);
    expect([...present].filter((file) => !wanted.has(file)), `Pictures of assets that no longer exist. ${FIX}`).toEqual([]);
  });

  it('only shows pictures that exist', () => {
    const present = new Set(pictures);
    const shown = [...committed.matchAll(/src="([^"]+)"/g)].map((match) => match[1]!);
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.filter((file) => !present.has(file))).toEqual([]);
  });
});

describe('the art fingerprint', () => {
  const files = artSourceFiles();
  const covered = (path: string) => files.includes(path);

  it('is a SHA-256 digest', async () => {
    expect(await artHash()).toMatch(/^[0-9a-f]{64}$/);
  });

  it('covers the art, the code that draws it and the sample world', () => {
    for (const path of [
      '../../../illustrations/catalog.ts',
      '../../../illustrations/index.ts',
      '../engine/exportMap.ts',
      '../engine/terrain/chunkPainter.ts',
      '../model/terrainLayer.ts',
      '../tools/scatter.ts',
      '../utils/backdrop.ts',
      './assetCatalog.ts',
      './assetImages.ts',
      '../../public/samples/aldoria.wondermap.json',
    ]) {
      expect(covered(path), `${path} is not covered`).toBe(true);
    }
    expect(files.filter((path) => path.includes('illustrations/symbols') || path.includes('illustrations/terrain')).length).toBeGreaterThan(10);
  });

  it('leaves out what cannot change a picture', () => {
    expect(files.filter((path) => /\.test\.ts$|\/tests\/|node_modules/.test(path))).toEqual([]);
    for (const path of ['../engine/camera.ts', '../engine/picking.ts', '../engine/MapRenderer.ts']) {
      expect(covered(path), `${path} should not be covered`).toBe(false);
    }
  });
});

/* ------------------------------------------------------------------------------------------- */
/* The list of pictures and the writer of the Markdown                                           */
/* ------------------------------------------------------------------------------------------- */

describe('listAssets', () => {
  const list = listAssets();

  it('has one picture for every asset of the catalog', () => {
    const count = (kind: string) => list.filter((entry) => entry.kind === kind).length;
    expect(count('terrain')).toBe(terrains.length);
    expect(count('symbol')).toBe(symbols.length);
    expect(count('brush')).toBe(brushes.length);
    expect(count('path')).toBe(pathStyles.length);
    expect(count('label')).toBe(labelStyles.length);
    expect(count('font')).toBe(fontList.length);
    expect(count('theme')).toBe(themes.length);
    expect(count('frame')).toBe(themes.length * frames.length);
  });

  it('gives every picture its own file under docs/assets', () => {
    const files = list.map(assetFile);
    expect(new Set(files).size).toBe(files.length);
    for (const file of files) expect(file, file).toMatch(new RegExp(`^${ASSETS_DIR}/[a-z]+(?:/[a-z]+)?/[a-z0-9.-]+\\.webp$`));
  });

  it('files the symbols by category', () => {
    for (const symbol of symbols) expect(assetFile({ kind: 'symbol', id: symbol.id })).toBe(`${ASSETS_DIR}/symbols/${symbol.category}/${symbol.id}.webp`);
  });
});

describe('buildAssetsDoc', () => {
  const hash = 'ab'.repeat(32);
  const doc = buildAssetsDoc(hash);

  it('records the fingerprint it is given', () => {
    expect(ART_HASH_PATTERN.exec(doc)?.[1]).toBe(hash);
  });

  it('writes the same text every time, with LF line ends and one newline at the end', () => {
    expect(buildAssetsDoc(hash)).toBe(doc);
    expect(doc).not.toContain('\r');
    expect(doc.endsWith('\n')).toBe(true);
    expect(doc.endsWith('\n\n')).toBe(false);
  });

  it('shows every asset exactly once', () => {
    const shown = new Map<string, number>();
    for (const match of doc.matchAll(/src="([^"]+)"/g)) shown.set(match[1]!, (shown.get(match[1]!) ?? 0) + 1);
    for (const entry of listAssets()) expect(shown.get(assetFile(entry)), `${entry.kind} ${entry.id}`).toBe(1);
    expect(shown.size).toBe(listAssets().length);
  });

  it('keeps every HTML table in one piece (a blank line would end it in Markdown)', () => {
    const tables = doc.match(/<table>[\s\S]*?<\/table>/g) ?? [];
    expect(tables.length).toBeGreaterThan(10);
    for (const table of tables) expect(table).not.toContain('\n\n');
  });

  it('lists every heading in its contents, with the anchor GitHub gives it', () => {
    const headings = [...doc.matchAll(/^#{1,3} (.+)$/gm)].map((match) => match[1]!);
    const taken = new Map<string, number>();
    const anchors = headings.map((text) => {
      const base = headingSlug(text);
      const seen = taken.get(base) ?? 0;
      taken.set(base, seen + 1);
      return seen ? `${base}-${seen}` : base;
    });
    // The title and the heading of the list itself are not in the list.
    const listed = [...doc.matchAll(/^ *- \[(.+?)\]\(#([^)]+)\)/gm)].map((match) => ({ text: match[1]!, anchor: match[2]! }));
    expect(listed.map((item) => item.text)).toEqual(headings.slice(2));
    expect(listed.map((item) => item.anchor)).toEqual(anchors.slice(2));
  });
});

describe('headingSlug', () => {
  it('follows the rule GitHub uses for the anchor of a heading', () => {
    expect(headingSlug('Terrains')).toBe('terrains');
    expect(headingSlug('How this file is made')).toBe('how-this-file-is-made');
    expect(headingSlug('Forests & Trees')).toBe('forests--trees');
    expect(headingSlug('Volcanoes & Caverns')).toBe('volcanoes--caverns');
  });
});
