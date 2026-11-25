import { describe, expect, it } from 'vitest';
import {
  createDocument,
  documentFromJson,
  documentToJson,
  expandDocument,
  makeId,
  NO_EXPANSION,
  parseDocument,
  serializeDocument,
  snapSize,
  validateExpansion,
} from './document';
import { addLabel, addPath, addSymbols } from './ops';
import { paintStroke, terrainAt, withTerrainId } from './terrainLayer';
import { CELL, LIMITS, SCHEMA_VERSION } from './types';
import type { MapDocument } from './types';

/** A small map with one island and one of everything on it. */
function sampleDocument(): MapDocument {
  let doc = createDocument({ id: 'sample', name: 'Sample', width: 800, height: 600, seed: 42 });
  const { layer, value } = withTerrainId(doc.terrain, 'grass');
  paintStroke(layer, { points: [[400, 300]], radius: 100, value, mode: 'paint', roughness: 0 });
  doc = { ...doc, terrain: layer };
  doc = addSymbols(doc, [{ id: 'sym', asset: 'mountain.brown', x: 400, y: 300, scale: 1.5, rotation: 0.5, flip: true, variant: 3 }]);
  doc = addLabel(doc, { id: 'lab', text: 'Aldoria', x: 400, y: 200, style: 'region', size: 40, rotation: 0, curve: 0.3, spacing: 0.1, color: '#112233' }).doc;
  doc = addPath(doc, { id: 'pth', style: 'river', points: [[100, 100], [200, 150], [300, 130]], width: 8 }).doc;
  return doc;
}

describe('createDocument', () => {
  it('fills in sensible defaults', () => {
    const doc = createDocument();
    expect(doc.schema).toBe(SCHEMA_VERSION);
    expect(doc.kind).toBe('world');
    expect([doc.width, doc.height]).toEqual([3200, 2000]);
    expect(doc.name).toBe('Untitled World');
    expect(doc.id).toMatch(/^[0-9a-z]{12}$/);
    expect(doc.terrain.cols).toBe(3200 / CELL);
    expect(doc.symbols).toEqual([]);
    expect(doc.settings.beaches).toBe(true);
  });

  it('snaps and clamps the size, and trims the name', () => {
    const doc = createDocument({ width: 1001, height: 99999, name: '  Mid-earth  ' });
    expect(doc.width % CELL).toBe(0);
    expect(doc.height).toBe(LIMITS.maxSize);
    expect(doc.name).toBe('Mid-earth');
    expect(createDocument({ width: 10, height: 10 }).width).toBe(LIMITS.minSize);
    expect(createDocument({ name: '   ' }).name).toBe('Untitled World');
  });

  it('falls back to the default theme for an unknown one', () => {
    expect(createDocument({ themeId: 'no-such-theme' }).themeId).toBe('wonder');
    expect(createDocument({ themeId: 'parchment' }).themeId).toBe('parchment');
  });
});

describe('ids and sizes', () => {
  it('makeId is short, url-safe and practically unique', () => {
    const ids = new Set(Array.from({ length: 2000 }, () => makeId()));
    expect(ids.size).toBe(2000);
    for (const id of ids) expect(id).toMatch(/^[0-9a-z]{12}$/);
    expect(makeId(5)).toHaveLength(5);
  });

  it('snapSize rounds to whole cells and never goes below one cell', () => {
    expect(snapSize(1001)).toBe(1000);
    expect(snapSize(1002)).toBe(1004);
    expect(snapSize(0)).toBe(CELL);
  });
});

describe('expansion', () => {
  it('rejects maps that would be too small or too large', () => {
    const doc = { width: 2000, height: 2000 };
    expect(validateExpansion(doc, NO_EXPANSION)).toBeNull();
    expect(validateExpansion(doc, { left: 400, top: 0, right: 0, bottom: 0 })).toBeNull();
    expect(validateExpansion(doc, { left: -1800, top: 0, right: 0, bottom: 0 })).toMatch(/smaller/);
    expect(validateExpansion(doc, { left: 9000, top: 0, right: 0, bottom: 0 })).toMatch(/exceed/);
    expect(validateExpansion({ width: 9000, height: 9000 }, { left: 100, top: 0, right: 0, bottom: 0 })).toMatch(/too large/);
  });

  it('adds sea around the map and keeps every item in the same place relative to the land', () => {
    const doc = sampleDocument();
    const out = expandDocument(doc, { left: 200, top: 100, right: 48, bottom: 400 });
    expect([out.width, out.height]).toEqual([1048, 1100]);
    expect([out.terrain.cols, out.terrain.rows]).toEqual([1048 / CELL, 1100 / CELL]);
    expect(terrainAt(out.terrain, 400 + 200, 300 + 100)).toBe('grass');
    expect(terrainAt(out.terrain, 100, 100)).toBeNull();
    expect(out.symbols[0]).toMatchObject({ x: 600, y: 400 });
    expect(out.labels[0]).toMatchObject({ x: 600, y: 300 });
    expect(out.paths[0]!.points[0]).toEqual([300, 200]);
    expect(out.paths[0]!.points[2]).toEqual([500, 230]);
    // The input is untouched.
    expect([doc.width, doc.symbols[0]!.x]).toEqual([800, 400]);
  });

  it('snaps odd amounts to whole cells and refuses illegal ones', () => {
    const doc = sampleDocument();
    expect(expandDocument(doc, { left: 10, top: 0, right: 0, bottom: 0 }).width).toBe(800 + 12);
    expect(() => expandDocument(doc, { left: 20_000, top: 0, right: 0, bottom: 0 })).toThrow(/exceed/);
    expect(() => expandDocument(doc, { left: -600, top: 0, right: 0, bottom: 0 })).toThrow(/smaller/);
  });
});

describe('save and load', () => {
  it('round-trips a whole map through JSON', () => {
    const doc = sampleDocument();
    const back = documentFromJson(documentToJson(doc));
    expect(back.terrain.data).toEqual(doc.terrain.data);
    expect(back.terrain.ids).toEqual(['grass']);
    expect({ ...back, terrain: null }).toEqual({ ...doc, terrain: null });
  });

  it('stores the terrain as compact run-length text and drops unused terrain ids', () => {
    const doc = sampleDocument();
    doc.terrain.ids = [...doc.terrain.ids, 'ice'];
    const saved = serializeDocument(doc);
    expect(typeof saved.terrain.rle).toBe('string');
    expect(saved.terrain.ids).toEqual(['grass']);
    expect(JSON.stringify(saved).length).toBeLessThan(5000);
  });

  it('rejects files that are not maps', () => {
    expect(() => documentFromJson('{ nope')).toThrow(/not valid JSON/);
    expect(() => parseDocument(null)).toThrow(/not a WonderMap file/);
    expect(() => parseDocument([])).toThrow(/not a WonderMap file/);
    expect(() => parseDocument({ name: 'x' })).toThrow(/newer version/);
    expect(() => parseDocument({ schema: SCHEMA_VERSION + 1 })).toThrow(/newer version/);
  });

  it('rejects terrain that does not match the map size, and maps that are too large', () => {
    const saved = JSON.parse(documentToJson(sampleDocument()));
    expect(() => parseDocument({ ...saved, terrain: { ...saved.terrain, cols: 3 } })).toThrow(/does not match/);
    expect(() => parseDocument({ ...saved, width: 10_000, height: 10_000 })).toThrow(/too large/);
  });

  it('cleans up untrusted data instead of trusting it', () => {
    const saved = JSON.parse(documentToJson(sampleDocument()));
    const doc = parseDocument({
      ...saved,
      name: 'x'.repeat(500),
      themeId: 'no-such-theme',
      settings: { beaches: 'yes', roughness: 9, gridSize: 1 },
      symbols: [
        { asset: 'mountain.brown', x: 1, y: 2, scale: 999, variant: -4.7 },
        { x: 1, y: 2 },
        'garbage',
      ],
      paths: [{ style: 'river', points: [[1, 1]] }, { style: 'road', points: [[0, 0], [5, 5], ['a', 1]], width: 99999 }],
      labels: [{ text: 'a'.repeat(900), size: 1, curve: 5, spacing: 99 }, { text: 5 }],
    });
    expect(doc.name).toHaveLength(120);
    expect(doc.themeId).toBe('wonder');
    expect(doc.settings).toMatchObject({ beaches: true, roughness: 1, gridSize: 10 });
    expect(doc.symbols).toHaveLength(1);
    expect(doc.symbols[0]).toMatchObject({ x: 1, y: 2, scale: 20, variant: 0, rotation: 0, flip: false });
    expect(doc.symbols[0]!.id).toMatch(/^[0-9a-z]{12}$/);
    expect(doc.paths).toHaveLength(1);
    expect(doc.paths[0]!.points).toEqual([[0, 0], [5, 5]]);
    expect(doc.paths[0]!.width).toBe(400);
    expect(doc.labels).toHaveLength(1);
    expect(doc.labels[0]).toMatchObject({ size: 4, curve: 1, spacing: 4, color: null, style: 'region' });
    expect(doc.labels[0]!.text).toHaveLength(200);
  });

  it('turns terrain cells that point at an unknown terrain into sea', () => {
    const saved = JSON.parse(documentToJson(sampleDocument()));
    const doc = parseDocument({ ...saved, terrain: { ...saved.terrain, ids: [] } });
    expect(doc.terrain.data.every((v) => v === 0)).toBe(true);
  });

  it('accepts a minimal file and gives it a blank sea', () => {
    const doc = parseDocument({ schema: 1, width: 800, height: 600 });
    expect(doc.name).toBe('Untitled World');
    expect(doc.terrain.data).toHaveLength((800 / CELL) * (600 / CELL));
    expect(doc.id).toMatch(/^[0-9a-z]{12}$/);
  });
});
