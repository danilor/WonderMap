import { frameById, labelStyleById, pathStyleById, symbolById, terrainById, themeById } from '@wondermap/illustrations';
import { beforeAll, describe, expect, it } from 'vitest';
import { documentFromJson, documentToJson } from '../../model/document';
import type { MapDocument } from '../../model/types';
import { exampleMaps } from '../../pages/home/examples';
import { generateSample, sampleGenerators } from './index';
import type { GeneratedSample } from './index';

const FOLDER = '../../../public/samples/';
const files = import.meta.glob('../../../public/samples/*.wondermap.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const pictures = new Set(Object.keys(import.meta.glob('../../../public/samples/*.jpg')));

const fileOf = (slug: string) => `${FOLDER}${slug}.wondermap.json`;
const textOf = (slug: string) => files[fileOf(slug)] ?? '';
const slugOf = (key: string) => key.slice(FOLDER.length).replace(/\.(wondermap\.json|jpg)$/, '');

describe('the example maps on the title screen', () => {
  it('lists each map once, with a file to open and a picture', () => {
    const slugs = exampleMaps.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(exampleMaps.map((e) => e.name)).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(fileOf(slug) in files, `${slug}.wondermap.json is missing (run npm run samples)`).toBe(true);
      expect(pictures.has(`${FOLDER}${slug}.jpg`), `${slug}.jpg is missing (run npm run samples)`).toBe(true);
    }
  });

  it('keeps no file or picture that the title screen does not offer', () => {
    const offered = new Set(exampleMaps.map((e) => e.slug));
    for (const key of [...Object.keys(files), ...pictures]) expect(offered.has(slugOf(key)), `${key} is not listed in pages/home/examples.ts`).toBe(true);
  });

  it('opens every file under the name on its card', () => {
    for (const example of exampleMaps) expect(documentFromJson(textOf(example.slug)).name, example.slug).toBe(example.name);
  });

  it('makes every map but the hand-painted Aldoria with code', () => {
    const generated = sampleGenerators.map((g) => g.slug).sort();
    expect(exampleMaps.map((e) => e.slug).filter((slug) => slug !== 'aldoria').sort()).toEqual(generated);
  });

  it('gives every map its own id, so that opening two of them never mixes them up', () => {
    const ids = exampleMaps.map((e) => documentFromJson(textOf(e.slug)).id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe.each(sampleGenerators.map((g) => g.slug))('the example map "%s", made with code', (slug) => {
  let made: GeneratedSample;
  let doc: MapDocument;

  beforeAll(() => {
    made = generateSample(slug);
    doc = documentFromJson(textOf(slug));
  }, 60_000);

  it('has nothing in the wrong place', () => {
    expect(made.warnings).toEqual([]);
  });

  it('is the file that npm run samples writes', () => {
    expect(textOf(slug) === made.json, `${slug}.wondermap.json is not what the code makes: run npm run samples and keep the result`).toBe(true);
  });

  it('opens as a valid document', () => {
    expect(doc.width).toBeGreaterThanOrEqual(2000);
    expect(doc.height).toBeGreaterThanOrEqual(1500);
    expect(themeById.has(doc.themeId)).toBe(true);
    expect(frameById.has(doc.frameId)).toBe(true);
    expect(textOf(slug).length).toBeLessThan(1_000_000);
  });

  it('is a rich showcase', () => {
    expect(doc.symbols.length).toBeGreaterThan(500);
    expect(doc.paths.length).toBeGreaterThan(3);
    expect(doc.labels.length).toBeGreaterThan(10);
    const landCells = doc.terrain.data.reduce((n, v) => n + (v > 0 ? 1 : 0), 0);
    const landShare = landCells / doc.terrain.data.length;
    expect(landShare).toBeGreaterThan(0.15);
    expect(landShare).toBeLessThan(0.85);
    expect(new Set(doc.symbols.map((s) => s.asset)).size).toBeGreaterThan(30);
  });

  it('only uses art that exists in the catalog', () => {
    const unknown = (ids: Iterable<string>, known: ReadonlyMap<string, unknown>) => [...new Set(ids)].filter((id) => !known.has(id));
    expect(unknown(doc.symbols.map((s) => s.asset), symbolById)).toEqual([]);
    expect(unknown(doc.paths.map((p) => p.style), pathStyleById)).toEqual([]);
    expect(unknown(doc.labels.map((l) => l.style), labelStyleById)).toEqual([]);
    expect(unknown(doc.terrain.ids, terrainById)).toEqual([]);
  });

  it('keeps every symbol, name and road on the map and uses valid variants', () => {
    const inside = (x: number, y: number) => x >= 0 && x <= doc.width && y >= 0 && y <= doc.height;
    for (const s of doc.symbols) {
      expect(inside(s.x, s.y), `${s.asset} at ${s.x}, ${s.y}`).toBe(true);
      expect(s.variant).toBeLessThan(symbolById.get(s.asset)!.variants);
    }
    for (const l of doc.labels) {
      expect(inside(l.x, l.y), l.text).toBe(true);
      expect(l.text.trim()).not.toBe('');
    }
    for (const p of doc.paths) for (const [x, y] of p.points) expect(inside(x, y), `${p.style} at ${x}, ${y}`).toBe(true);
  });

  it('gives every item its own id', () => {
    const ids = [...doc.symbols, ...doc.paths, ...doc.labels].map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('loses nothing when it is opened, saved and opened again', () => {
    const raw = JSON.parse(textOf(slug)) as { symbols: unknown[]; paths: unknown[]; labels: unknown[] };
    expect(doc.symbols).toHaveLength(raw.symbols.length);
    expect(doc.paths).toHaveLength(raw.paths.length);
    expect(doc.labels).toHaveLength(raw.labels.length);
    const again = documentFromJson(documentToJson(doc));
    expect(again.symbols).toEqual(doc.symbols);
    expect(again.paths).toEqual(doc.paths);
    expect(again.labels).toEqual(doc.labels);
    expect(again.terrain.ids).toEqual(doc.terrain.ids);
    expect(again.terrain.data).toEqual(doc.terrain.data);
  });
});
