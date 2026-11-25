import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDocument } from './document';
import {
  addLabel,
  addPath,
  addSymbols,
  duplicateItems,
  floodTerrain,
  kindOf,
  moveItems,
  refsOf,
  removeItems,
  renameDocument,
  reorderItems,
  setLook,
  updateLabels,
  updatePaths,
  updateSettings,
  updateSymbols,
} from './ops';
import type { NewLabel, NewPath, NewSymbol } from './ops';
import { paintStroke, terrainAt, withTerrainId } from './terrainLayer';
import type { MapDocument } from './types';

const symbol = (id: string, x = 100, y = 100): NewSymbol => ({ id, asset: 'mountain.brown', x, y, scale: 1, rotation: 0, flip: false, variant: 0 });
const label = (id: string): NewLabel => ({ id, text: 'Label', x: 50, y: 60, style: 'region', size: 32, rotation: 0, curve: 0, spacing: 0, color: null });
const path = (id: string): NewPath => ({ id, style: 'river', points: [[0, 0], [10, 10], [20, 0]], width: 6 });

/** Three symbols (s1..s3), one label (l1) and one path (p1) on an 800 × 600 sea. */
function populated(): MapDocument {
  let doc = createDocument({ id: 'doc', width: 800, height: 600, seed: 1 });
  doc = addSymbols(doc, [symbol('s1', 100, 100), symbol('s2', 200, 200), symbol('s3', 300, 300)]);
  doc = addLabel(doc, label('l1')).doc;
  doc = addPath(doc, path('p1')).doc;
  return doc;
}

const ids = (list: { id: string }[]) => list.map((i) => i.id);

afterEach(() => vi.useRealTimers());

describe('adding items', () => {
  it('appends items, creating ids when none are given, without touching the input', () => {
    const doc = createDocument({ width: 800, height: 600 });
    const out = addSymbols(doc, [symbol('keep'), { ...symbol('x'), id: undefined }]);
    expect(doc.symbols).toHaveLength(0);
    expect(out.symbols).toHaveLength(2);
    expect(out.symbols[0]!.id).toBe('keep');
    expect(out.symbols[1]!.id).toMatch(/^[0-9a-z]{12}$/);
  });

  it('returns the very same document for an empty list', () => {
    const doc = populated();
    expect(addSymbols(doc, [])).toBe(doc);
  });

  it('returns the id of a new label or path', () => {
    const doc = createDocument({ width: 800, height: 600 });
    const withLabel = addLabel(doc, { ...label('x'), id: undefined });
    expect(withLabel.doc.labels[0]!.id).toBe(withLabel.id);
    const withPath = addPath(withLabel.doc, path('road'));
    expect(withPath.id).toBe('road');
    expect(withPath.doc.paths).toHaveLength(1);
  });

  it('shares everything that did not change with the previous document', () => {
    const doc = populated();
    const out = addSymbols(doc, [symbol('s4')]);
    expect(out.labels).toBe(doc.labels);
    expect(out.paths).toBe(doc.paths);
    expect(out.terrain).toBe(doc.terrain);
    expect(out.symbols.slice(0, 3)).toEqual(doc.symbols);
  });
});

describe('finding items', () => {
  it('knows what kind an id is', () => {
    const doc = populated();
    expect(kindOf(doc, 's2')).toBe('symbol');
    expect(kindOf(doc, 'l1')).toBe('label');
    expect(kindOf(doc, 'p1')).toBe('path');
    expect(kindOf(doc, 'nope')).toBeNull();
  });

  it('turns ids into references and skips unknown ids', () => {
    expect(refsOf(populated(), ['p1', 'ghost', 's1'])).toEqual([
      { kind: 'path', id: 'p1' },
      { kind: 'symbol', id: 's1' },
    ]);
  });
});

describe('updating items', () => {
  it('applies a patch object to the chosen items only', () => {
    const doc = populated();
    const out = updateSymbols(doc, ['s2'], { scale: 3, flip: true });
    expect(out.symbols[1]).toMatchObject({ id: 's2', scale: 3, flip: true, x: 200 });
    expect(out.symbols[0]).toBe(doc.symbols[0]);
    expect(out.symbols[2]).toBe(doc.symbols[2]);
    expect(doc.symbols[1]!.scale).toBe(1);
  });

  it('accepts a function patch and a Set of ids', () => {
    const out = updateSymbols(populated(), new Set(['s1', 's3']), (s) => ({ scale: s.x / 100 }));
    expect(out.symbols.map((s) => s.scale)).toEqual([1, 1, 3]);
  });

  it('updates labels and paths', () => {
    const doc = populated();
    expect(updateLabels(doc, ['l1'], { text: 'Renamed', curve: 0.5 }).labels[0]).toMatchObject({ text: 'Renamed', curve: 0.5, size: 32 });
    expect(updatePaths(doc, ['p1'], (p) => ({ width: p.width * 2 })).paths[0]!.width).toBe(12);
  });
});

describe('moving, removing and duplicating', () => {
  it('moves symbols, labels and every point of a path', () => {
    const doc = populated();
    const out = moveItems(doc, ['s1', 'l1', 'p1'], 10, -5);
    expect(out.symbols[0]).toMatchObject({ x: 110, y: 95 });
    expect(out.symbols[1]).toMatchObject({ x: 200, y: 200 });
    expect(out.labels[0]).toMatchObject({ x: 60, y: 55 });
    expect(out.paths[0]!.points).toEqual([[10, -5], [20, 5], [30, -5]]);
    expect(doc.paths[0]!.points[0]).toEqual([0, 0]);
  });

  it('removes items of every kind', () => {
    const out = removeItems(populated(), ['s2', 'l1', 'p1', 'ghost']);
    expect(ids(out.symbols)).toEqual(['s1', 's3']);
    expect(out.labels).toEqual([]);
    expect(out.paths).toEqual([]);
  });

  it('duplicates with an offset and reports the new ids', () => {
    const doc = populated();
    const out = duplicateItems(doc, ['s1', 'p1'], [30, 40]);
    expect(out.ids).toHaveLength(2);
    expect(out.doc.symbols).toHaveLength(4);
    expect(out.doc.paths).toHaveLength(2);
    const copy = out.doc.symbols.find((s) => out.ids.includes(s.id))!;
    expect(copy).toMatchObject({ asset: 'mountain.brown', x: 130, y: 140 });
    expect(out.doc.paths.find((p) => out.ids.includes(p.id))!.points[0]).toEqual([30, 40]);
    expect(new Set([...ids(out.doc.symbols), ...ids(out.doc.paths)]).size).toBe(6);
    expect(out.doc.symbols[0]).toBe(doc.symbols[0]); // the originals stay put
  });

  it('uses a small default offset and does nothing for an empty or unknown selection', () => {
    const doc = populated();
    const out = duplicateItems(doc, ['l1']);
    expect(out.doc.labels[1]).toMatchObject({ x: 74, y: 84 });
    expect(duplicateItems(doc, [])).toEqual({ doc, ids: [] });
    expect(duplicateItems(doc, ['ghost']).doc).toBe(doc);
  });
});

describe('stacking order', () => {
  it('brings items to the front or sends them to the back, keeping their relative order', () => {
    const doc = populated();
    expect(ids(reorderItems(doc, ['s1', 's2'], 'front').symbols)).toEqual(['s3', 's1', 's2']);
    expect(ids(reorderItems(doc, ['s3'], 'back').symbols)).toEqual(['s3', 's1', 's2']);
    expect(ids(reorderItems(doc, ['s2', 's3'], 'back').symbols)).toEqual(['s2', 's3', 's1']);
  });
});

describe('floodTerrain', () => {
  function island(): MapDocument {
    const doc = createDocument({ width: 800, height: 600, seed: 3 });
    const { layer, value } = withTerrainId(doc.terrain, 'grass');
    paintStroke(layer, { points: [[400, 300]], radius: 120, value, mode: 'paint', roughness: 0 });
    return { ...doc, terrain: layer };
  }

  it('covers the whole map without changing the original grid', () => {
    const doc = island();
    const snapshot = Uint8Array.from(doc.terrain.data);
    const out = floodTerrain(doc, 'sand');
    expect(terrainAt(out.terrain, 10, 10)).toBe('sand');
    expect(terrainAt(out.terrain, 400, 300)).toBe('sand');
    expect(out.terrain.data).not.toBe(doc.terrain.data);
    expect(doc.terrain.data).toEqual(snapshot);
  });

  it('can repaint just the land and leave the sea alone', () => {
    const out = floodTerrain(island(), 'snow', true);
    expect(terrainAt(out.terrain, 400, 300)).toBe('snow');
    expect(terrainAt(out.terrain, 10, 10)).toBeNull();
  });

  it('turns everything into sea for null', () => {
    const out = floodTerrain(island(), null);
    expect(out.terrain.data.every((v) => v === 0)).toBe(true);
  });
});

describe('map properties', () => {
  it('renames, ignoring blank or unchanged names', () => {
    const doc = createDocument({ name: 'Old', width: 800, height: 600 });
    expect(renameDocument(doc, '  New  ').name).toBe('New');
    expect(renameDocument(doc, '   ')).toBe(doc);
    expect(renameDocument(doc, 'Old')).toBe(doc);
  });

  it('merges settings and switches the look', () => {
    const doc = createDocument({ width: 800, height: 600 });
    const out = updateSettings(doc, { grid: true, gridSize: 250 });
    expect(out.settings).toMatchObject({ grid: true, gridSize: 250, beaches: true });
    expect(doc.settings.grid).toBe(false);
    expect(setLook(doc, { themeId: 'parchment', frameId: 'ornate' })).toMatchObject({ themeId: 'parchment', frameId: 'ornate' });
    expect(setLook(doc, { frameId: 'none' })).toMatchObject({ themeId: doc.themeId, frameId: 'none' });
  });
});

describe('time stamps', () => {
  it('every edit refreshes updatedAt', () => {
    const doc = populated();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2031-05-06T07:08:09.000Z'));
    const edits = [
      addSymbols(doc, [symbol('x')]),
      addLabel(doc, label('x')).doc,
      addPath(doc, path('x')).doc,
      updateSymbols(doc, ['s1'], { scale: 2 }),
      moveItems(doc, ['s1'], 1, 1),
      removeItems(doc, ['s1']),
      reorderItems(doc, ['s1'], 'front'),
      floodTerrain(doc, 'grass'),
      updateSettings(doc, { grid: true }),
      setLook(doc, { frameId: 'none' }),
      renameDocument(doc, 'Another name'),
    ];
    for (const out of edits) expect(out.updatedAt).toBe('2031-05-06T07:08:09.000Z');
    expect(doc.updatedAt).not.toBe('2031-05-06T07:08:09.000Z');
  });
});
