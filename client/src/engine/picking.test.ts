import { getTheme, symbols } from '@wondermap/illustrations';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createDocument } from '../model/document';
import { addLabel, addPath, addSymbols } from '../model/ops';
import type { MapDocument } from '../model/types';
import { stubTextMeasuring } from '../testing/fakeDom';
import { labelBounds } from './labels';
import { boundsOfItem, boundsOfItems, pickAt, pickInCircle, pickInRect, pickStack, unionBounds } from './picking';
import { symbolBounds } from './symbols';

// Symbols are picked by their drawn pixels, which needs a real canvas (covered by the browser tests).
// Everything below therefore keeps the pointer away from symbol boxes; marquee selection and bounds only use geometry.

beforeAll(stubTextMeasuring);
afterAll(() => vi.unstubAllGlobals());

const theme = getTheme('wonder');
const plain = symbols.find((s) => s.layer === 'object' && s.anchor[0] === 0.5)!;

function world(): MapDocument {
  let doc = createDocument({ id: 'pick', width: 2000, height: 1500, seed: 1 });
  doc = addPath(doc, { id: 'road', style: 'road', points: [[100, 300], [400, 300], [700, 300]], width: 10 }).doc;
  doc = addPath(doc, { id: 'river', style: 'river', points: [[400, 100], [400, 300], [420, 500]], width: 20 }).doc;
  doc = addLabel(doc, { id: 'title', text: 'Aldoria', x: 400, y: 300, style: 'region', size: 40, rotation: 0, curve: 0, spacing: 0, color: null }).doc;
  doc = addLabel(doc, { id: 'faraway', text: 'Farland', x: 1500, y: 1200, style: 'city', size: 30, rotation: 0, curve: 0, spacing: 0, color: null }).doc;
  doc = addSymbols(doc, [
    { id: 'near', asset: plain.id, x: 1200, y: 400, scale: 1, rotation: 0, flip: false, variant: 0 },
    { id: 'far', asset: plain.id, x: 1800, y: 1300, scale: 1, rotation: 0, flip: false, variant: 0 },
  ]);
  return doc;
}

describe('pickStack / pickAt', () => {
  const doc = world();

  it('lists what is under the pointer from top to bottom: labels, then paths', () => {
    const stack = pickStack(doc, 400, 300, 0);
    expect(stack.map((r) => `${r.kind}:${r.id}`)).toEqual(['label:title', 'path:river', 'path:road']);
  });

  it('tells overlapping paths apart', () => {
    const paths = pickStack(doc, 410, 330, 0, ['path']);
    expect(paths.map((r) => r.id)).toEqual(['river']);
    expect(pickStack(doc, 250, 300, 0, ['path']).map((r) => r.id)).toEqual(['road']);
  });

  it('can be limited to some kinds of items', () => {
    expect(pickStack(doc, 400, 300, 0, ['path']).map((r) => r.kind)).toEqual(['path', 'path']);
    expect(pickStack(doc, 400, 300, 0, ['label']).map((r) => r.id)).toEqual(['title']);
    expect(pickStack(doc, 400, 300, 0, [])).toEqual([]);
  });

  it('misses empty map', () => {
    expect(pickStack(doc, 900, 900, 0)).toEqual([]);
    expect(pickAt(doc, 900, 900, 0)).toBeNull();
  });

  it('is more forgiving with `slop`', () => {
    // 12 px from the road centre line: outside its 5 px half-width, inside with 10 px of slop
    expect(pickAt(doc, 250, 312, 0, ['path'])).toBeNull();
    expect(pickAt(doc, 250, 312, 10, ['path'])).toEqual({ kind: 'path', id: 'road' });
  });

  it('pickAt returns the top-most item', () => {
    expect(pickAt(doc, 400, 300, 0)).toEqual({ kind: 'label', id: 'title' });
  });
});

describe('pickInCircle (eraser)', () => {
  const doc = world();

  it('finds the labels and paths the circle touches', () => {
    const hit = pickInCircle(doc, 400, 300, 12, ['label', 'path']).map((r) => r.id);
    expect(hit.sort()).toEqual(['river', 'road', 'title']);
  });

  it('ignores items that are out of reach', () => {
    expect(pickInCircle(doc, 900, 900, 30, ['label', 'path'])).toEqual([]);
    expect(pickInCircle(doc, 250, 340, 10, ['path'])).toEqual([]);
    expect(pickInCircle(doc, 250, 340, 40, ['path']).map((r) => r.id)).toEqual(['road']);
  });

  it('honours the kinds filter', () => {
    expect(pickInCircle(doc, 400, 300, 12, ['label']).map((r) => r.id)).toEqual(['title']);
  });
});

describe('pickInRect (marquee)', () => {
  const doc = world();

  it('selects everything of every kind that is inside', () => {
    const ids = pickInRect(doc, { x0: 50, y0: 50, x1: 1300, y1: 600 }).map((r) => r.id);
    expect(ids.sort()).toEqual(['near', 'river', 'road', 'title']);
  });

  it('only selects what overlaps the rectangle', () => {
    expect(pickInRect(doc, { x0: 1400, y0: 1100, x1: 1900, y1: 1400 }).map((r) => r.id).sort()).toEqual(['far', 'faraway']);
    expect(pickInRect(doc, { x0: 900, y0: 700, x1: 1000, y1: 800 })).toEqual([]);
  });

  it('selects a path only when the marquee covers part of its line', () => {
    expect(pickInRect(doc, { x0: 150, y0: 280, x1: 250, y1: 320 }, ['path']).map((r) => r.id)).toEqual(['road']);
    expect(pickInRect(doc, { x0: 480, y0: 290, x1: 520, y1: 310 }, ['path']).map((r) => r.id)).toEqual(['road']);
    // Inside the padded box of the road, but clear of the line itself.
    expect(pickInRect(doc, { x0: 150, y0: 305, x1: 250, y1: 314 }, ['path'])).toEqual([]);
  });

  it('does not select a symbol just because the marquee clips an empty corner of its box', () => {
    const near = doc.symbols.find((s) => s.id === 'near')!;
    const b = symbolBounds(near, plain);
    const w = b.x1 - b.x0;
    const corner = { x0: b.x1 - w * 0.1, y0: b.y0, x1: b.x1 + 400, y1: b.y1 };
    expect(pickInRect(doc, corner, ['symbol'])).toEqual([]);
    const over = { x0: b.x0 + w * 0.3, y0: b.y0, x1: b.x1 + 400, y1: b.y1 };
    expect(pickInRect(doc, over, ['symbol']).map((r) => r.id)).toEqual(['near']);
  });
});

describe('bounds', () => {
  const doc = world();

  it('are known for every kind of item', () => {
    expect(boundsOfItem(doc, { kind: 'symbol', id: 'near' })).toEqual(symbolBounds(doc.symbols[0]!, plain));
    expect(boundsOfItem(doc, { kind: 'label', id: 'title' })).toEqual(labelBounds(doc.labels[0]!, theme));
    const road = boundsOfItem(doc, { kind: 'path', id: 'road' })!;
    expect(road.x0).toBeLessThan(100);
    expect(road.x1).toBeGreaterThan(700);
  });

  it('are null for items that do not exist', () => {
    expect(boundsOfItem(doc, { kind: 'symbol', id: 'ghost' })).toBeNull();
    expect(boundsOfItem(doc, { kind: 'label', id: 'near' })).toBeNull();
  });

  it('can be combined into one box', () => {
    expect(unionBounds([])).toBeNull();
    expect(unionBounds([{ x0: 1, y0: 2, x1: 3, y1: 4 }])).toEqual({ x0: 1, y0: 2, x1: 3, y1: 4 });
    expect(unionBounds([{ x0: 0, y0: 5, x1: 10, y1: 6 }, { x0: -4, y0: 0, x1: 2, y1: 20 }])).toEqual({ x0: -4, y0: 0, x1: 10, y1: 20 });
    const all = boundsOfItems(doc, [{ kind: 'label', id: 'title' }, { kind: 'label', id: 'faraway' }, { kind: 'path', id: 'ghost' }])!;
    expect(all.x0).toBeLessThan(400);
    expect(all.x1).toBeGreaterThan(1500);
    expect(boundsOfItems(doc, [{ kind: 'path', id: 'ghost' }])).toBeNull();
  });
});
