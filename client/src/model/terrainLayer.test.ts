import { describe, expect, it } from 'vitest';
import {
  cloneTerrainLayer,
  compactTerrainIds,
  createTerrainLayer,
  decodeRle,
  encodeRle,
  expandTerrainLayer,
  fillTerrain,
  landRatio,
  paintStroke,
  terrainAt,
  valueOfTerrain,
  withTerrainId,
} from './terrainLayer';
import { CELL } from './types';
import type { TerrainLayer } from './types';

const layer = (w = 400, h = 300): TerrainLayer => createTerrainLayer(w, h);
const count = (l: TerrainLayer, value: number) => l.data.reduce((n, v) => n + (v === value ? 1 : 0), 0);

describe('createTerrainLayer', () => {
  it('uses one cell per CELL map px, rounding up', () => {
    const l = layer(400, 300);
    expect([l.cell, l.cols, l.rows, l.data.length]).toEqual([CELL, 100, 75, 7500]);
    const odd = createTerrainLayer(402, 301);
    expect([odd.cols, odd.rows]).toEqual([101, 76]);
    expect(count(l, 0)).toBe(l.data.length);
  });
});

describe('terrain ids', () => {
  it('registers an id once and reuses its value', () => {
    const l = layer();
    const a = withTerrainId(l, 'grass');
    expect(a.value).toBe(1);
    expect(a.layer.ids).toEqual(['grass']);
    expect(l.ids).toEqual([]);
    const b = withTerrainId(a.layer, 'sand');
    expect(b.value).toBe(2);
    expect(withTerrainId(b.layer, 'grass')).toEqual({ layer: b.layer, value: 1 });
    expect(valueOfTerrain(b.layer, 'sand')).toBe(2);
    expect(valueOfTerrain(b.layer, 'ice')).toBe(-1);
  });

  it('shares the data array (registering an id never copies the grid)', () => {
    const l = layer();
    expect(withTerrainId(l, 'grass').layer.data).toBe(l.data);
  });

  it('refuses more than 250 different terrains', () => {
    let l = layer();
    for (let i = 0; i < 250; i++) l = withTerrainId(l, `t${i}`).layer;
    expect(() => withTerrainId(l, 'one-too-many')).toThrow(/Too many/);
  });
});

describe('paintStroke', () => {
  const smooth = { roughness: 0, seed: 1 } as const;

  it('paints a disc under a single point and reports what it touched', () => {
    const l = layer(800, 600);
    const rect = paintStroke(l, { points: [[400, 300]], radius: 60, value: 1, mode: 'paint', ...smooth });
    expect(rect).not.toBeNull();
    const painted = count(l, 1);
    const expected = (Math.PI * 60 * 60) / (CELL * CELL);
    expect(painted).toBeGreaterThan(expected * 0.93);
    expect(painted).toBeLessThan(expected * 1.07);
    expect(terrainAt({ ...l, ids: ['grass'] }, 400, 300)).toBe('grass');
    expect(terrainAt({ ...l, ids: ['grass'] }, 400 + 80, 300)).toBeNull();
    // The reported rectangle (cell units, max exclusive) contains every painted cell and nothing far away.
    expect(rect!.x0).toBeGreaterThanOrEqual(Math.floor((400 - 60) / CELL) - 1);
    expect(rect!.x1).toBeLessThanOrEqual(Math.ceil((400 + 60) / CELL) + 1);
    expect(rect!.y0).toBeGreaterThanOrEqual(Math.floor((300 - 60) / CELL) - 1);
    expect(rect!.y1).toBeLessThanOrEqual(Math.ceil((300 + 60) / CELL) + 1);
  });

  it('paints a capsule along a stroke', () => {
    const l = layer(800, 600);
    paintStroke(l, { points: [[100, 300], [700, 300]], radius: 20, value: 1, mode: 'paint', ...smooth });
    const expected = (Math.PI * 20 * 20 + 600 * 40) / (CELL * CELL);
    expect(count(l, 1)).toBeGreaterThan(expected * 0.93);
    expect(count(l, 1)).toBeLessThan(expected * 1.07);
  });

  it('bumps the revision only when something changed', () => {
    const l = layer();
    const stroke = { points: [[200, 150]] as [number, number][], radius: 30, value: 1, mode: 'paint' as const, ...smooth };
    expect(paintStroke(l, stroke)).not.toBeNull();
    expect(l.rev).toBe(1);
    expect(paintStroke(l, stroke)).toBeNull();
    expect(l.rev).toBe(1);
  });

  it('erases to sea and recolors land only', () => {
    const l = layer();
    paintStroke(l, { points: [[200, 150]], radius: 60, value: 1, mode: 'paint', ...smooth });
    const land = count(l, 1);

    paintStroke(l, { points: [[200, 150], [300, 150]], radius: 40, value: 2, mode: 'recolor', ...smooth });
    expect(count(l, 2)).toBeGreaterThan(0);
    expect(count(l, 1) + count(l, 2)).toBe(land);
    expect(landRatio(l)).toBeCloseTo(land / l.data.length, 10);

    paintStroke(l, { points: [[200, 150]], radius: 200, value: 1, mode: 'erase', ...smooth });
    expect(landRatio(l)).toBe(0);
  });

  it('stays inside the map when the brush hangs over the edge', () => {
    const l = layer(400, 300);
    const rect = paintStroke(l, { points: [[-30, -30], [20, 20]], radius: 50, value: 1, mode: 'paint', ...smooth })!;
    expect(rect.x0).toBe(0);
    expect(rect.y0).toBe(0);
    expect(count(l, 1)).toBeGreaterThan(0);
    expect(paintStroke(l, { points: [[5000, 5000]], radius: 50, value: 1, mode: 'paint', ...smooth })).toBeNull();
  });

  it('gives the same irregular edge for the same seed', () => {
    const rough = (seed: number) => {
      const l = layer(800, 600);
      paintStroke(l, { points: [[400, 300]], radius: 90, value: 1, mode: 'paint', roughness: 1, seed });
      return l.data;
    };
    expect(rough(5)).toEqual(rough(5));
    expect(rough(5)).not.toEqual(rough(6));
  });
});

describe('fillTerrain / cloneTerrainLayer', () => {
  it('fills everything, or only the land', () => {
    const l = layer(100, 100);
    paintStroke(l, { points: [[50, 50]], radius: 20, value: 1, mode: 'paint', roughness: 0 });
    const land = count(l, 1);
    fillTerrain(l, 2, true);
    expect(count(l, 2)).toBe(land);
    expect(count(l, 0)).toBe(l.data.length - land);
    fillTerrain(l, 3);
    expect(count(l, 3)).toBe(l.data.length);
  });

  it('clones into an independent grid (undo snapshots must stay untouched)', () => {
    const l = layer(100, 100);
    const copy = cloneTerrainLayer(l);
    fillTerrain(copy, 1);
    expect(count(l, 0)).toBe(l.data.length);
    expect(copy.rev).toBeGreaterThan(l.rev);
  });
});

describe('expandTerrainLayer', () => {
  const marked = () => {
    const l = layer(40, 40); // 10 x 10 cells
    l.ids = ['grass'];
    l.data[2 * l.cols + 3] = 1; // cell (3, 2)
    return l;
  };

  it('moves the contents when canvas is added on the left or top', () => {
    const out = expandTerrainLayer(marked(), { left: 8, top: 4, right: 0, bottom: 0 });
    expect([out.cols, out.rows]).toEqual([12, 11]);
    expect(out.data[(2 + 1) * 12 + (3 + 2)]).toBe(1);
    expect(count(out, 1)).toBe(1);
    expect(out.ids).toEqual(['grass']);
  });

  it('only grows the sea when canvas is added on the right or bottom', () => {
    const out = expandTerrainLayer(marked(), { left: 0, top: 0, right: 12, bottom: 20 });
    expect([out.cols, out.rows]).toEqual([13, 15]);
    expect(out.data[2 * 13 + 3]).toBe(1);
    expect(count(out, 1)).toBe(1);
  });

  it('crops with negative amounts', () => {
    const out = expandTerrainLayer(marked(), { left: -8, top: 0, right: 0, bottom: -16 });
    expect([out.cols, out.rows]).toEqual([8, 6]);
    expect(out.data[2 * 8 + 1]).toBe(1);
  });
});

describe('queries', () => {
  it('terrainAt is null for sea and outside the map', () => {
    const l = layer(40, 40);
    l.ids = ['sand'];
    l.data[0] = 1;
    expect(terrainAt(l, 1, 1)).toBe('sand');
    expect(terrainAt(l, 6, 1)).toBeNull();
    expect(terrainAt(l, -1, 1)).toBeNull();
    expect(terrainAt(l, 41, 1)).toBeNull();
  });
});

describe('compactTerrainIds', () => {
  it('drops unused ids and renumbers the cells', () => {
    const l = layer(40, 40);
    l.ids = ['grass', 'sand', 'ice'];
    l.data[0] = 3;
    l.data[1] = 1;
    l.data[2] = 3;
    const out = compactTerrainIds(l);
    expect(out.ids).toEqual(['grass', 'ice']);
    expect([out.data[0], out.data[1], out.data[2]]).toEqual([2, 1, 2]);
    expect(l.ids).toEqual(['grass', 'sand', 'ice']);
  });

  it('returns the very same layer when every id is used', () => {
    const l = layer(40, 40);
    l.ids = ['grass'];
    l.data[5] = 1;
    expect(compactTerrainIds(l)).toBe(l);
  });
});

describe('run-length encoding', () => {
  const roundTrip = (data: Uint8Array) => decodeRle(encodeRle(data), data.length);

  it('round-trips empty, uniform, alternating and random grids', () => {
    expect(roundTrip(new Uint8Array(0))).toEqual(new Uint8Array(0));
    expect(roundTrip(new Uint8Array(1000))).toEqual(new Uint8Array(1000));
    expect(roundTrip(new Uint8Array(1000).fill(7))).toEqual(new Uint8Array(1000).fill(7));
    const alternating = Uint8Array.from({ length: 999 }, (_, i) => i % 2);
    expect(roundTrip(alternating)).toEqual(alternating);
    let state = 12345;
    const random = Uint8Array.from({ length: 5000 }, () => {
      state = (Math.imul(state, 1103515245) + 12345) >>> 0;
      return (state >>> 16) % 6;
    });
    expect(roundTrip(random)).toEqual(random);
  });

  it('handles runs that need several length bytes', () => {
    for (const run of [127, 128, 129, 16383, 16384, 16385, 300_000]) {
      const data = new Uint8Array(run + 2);
      data[0] = 1;
      data.fill(2, 1, run + 1);
      data[run + 1] = 3;
      expect(roundTrip(data), `run of ${run}`).toEqual(data);
    }
  });

  it('keeps an almost empty world tiny', () => {
    const l = createTerrainLayer(3200, 2000);
    paintStroke(l, { points: [[1600, 1000]], radius: 200, value: 1, mode: 'paint', roughness: 0 });
    expect(encodeRle(l.data).length).toBeLessThan(6000);
  });

  it('pads with sea when the text is shorter than the grid', () => {
    const out = decodeRle(encodeRle(new Uint8Array(10).fill(4)), 25);
    expect(Array.from(out.slice(0, 10))).toEqual(new Array(10).fill(4));
    expect(Array.from(out.slice(10))).toEqual(new Array(15).fill(0));
  });
});
