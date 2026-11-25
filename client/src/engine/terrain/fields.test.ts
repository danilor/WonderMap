import { describe, expect, it } from 'vitest';
import { createTerrainLayer, fillTerrain, paintStroke, withTerrainId } from '../../model/terrainLayer';
import type { TerrainLayer } from '../../model/types';
import { BLUR, diffRect, FIELD_REACH, TerrainFields } from './fields';

/** Paints a round blob of `id` into `layer` (which may get a new id list) and returns the layer plus the changed cells. */
function paint(layer: TerrainLayer, id: string, x: number, y: number, radius: number, mode: 'paint' | 'erase' = 'paint') {
  const t = withTerrainId(layer, id);
  const rect = paintStroke(t.layer, { points: [[x, y]], radius, value: t.value, mode, roughness: 0 });
  return { layer: t.layer, rect };
}

/** 480 × 360 px (120 × 90 cells): a grass island and a sand island with a gap of sea between them. */
function twoIslands(): TerrainLayer {
  let layer = createTerrainLayer(480, 360);
  layer = paint(layer, 'grass', 150, 160, 90).layer;
  layer = paint(layer, 'sand', 360, 200, 60).layer;
  return layer;
}

const build = (layer: TerrainLayer) => {
  const fields = new TerrainFields();
  fields.rebuild(layer);
  return fields;
};

describe('rebuild', () => {
  it('finds no coast and no terrain in an empty sea', () => {
    const f = build(createTerrainLayer(480, 360));
    expect([f.cols, f.rows]).toEqual([120, 90]);
    for (const field of [f.coast, f.mid, f.big]) expect(field.every((v) => v === 0)).toBe(true);
    expect(f.values()).toEqual([]);
  });

  it('does not invent a coast where land runs off the map edge', () => {
    let layer = createTerrainLayer(480, 360);
    const t = withTerrainId(layer, 'grass');
    layer = t.layer;
    fillTerrain(layer, t.value);
    const f = build(layer);
    for (const field of [f.coast, f.mid, f.big, f.weights.get(1)!]) expect(field.every((v) => v === 255)).toBe(true);
  });

  it('fades smoothly from the land into the sea', () => {
    const f = build(paint(createTerrainLayer(960, 720), 'grass', 480, 360, 100).layer); // 240 × 180 cells
    const row = 90 * f.cols; // through the middle of the island
    const centre = 120;
    const shore = 145; // first sea cell east of the island
    for (const field of [f.coast, f.mid, f.big]) {
      expect(field[row + centre]).toBe(255);
      expect(field[row + f.cols - 1]).toBe(0);
      for (let x = centre; x < f.cols - 1; x++) expect(field[row + x + 1]!).toBeLessThanOrEqual(field[row + x]!);
    }
    // The wider the blur, the further it reaches out into the sea.
    expect(f.coast[row + 144]!).toBeGreaterThan(0);
    expect(f.coast[row + 144]!).toBeLessThan(255);
    expect(f.coast[row + shore + 4]!).toBe(0);
    expect(f.mid[row + shore + 8]!).toBe(0);
    expect(f.big[row + shore + 8]!).toBeGreaterThan(0);
    expect(f.big[row + shore + FIELD_REACH + 2]!).toBe(0);
  });

  it('keeps one blurred weight array per terrain in use', () => {
    const layer = twoIslands();
    const f = build(layer);
    expect(f.values()).toEqual([1, 2]);
    const at = (x: number, y: number) => Math.floor(y / 4) * f.cols + Math.floor(x / 4);
    expect(f.weights.get(1)![at(150, 160)]).toBe(255);
    expect(f.weights.get(2)![at(150, 160)]).toBe(0);
    expect(f.weights.get(2)![at(360, 200)]).toBe(255);
    expect(f.weights.get(1)![at(360, 200)]).toBe(0);
  });

  it('adapts to a map of another size', () => {
    const f = build(twoIslands());
    f.rebuild(createTerrainLayer(800, 600));
    expect([f.cols, f.rows]).toEqual([200, 150]);
    expect(f.coast).toHaveLength(200 * 150);
    expect(f.values()).toEqual([]);
  });
});

describe('incremental update', () => {
  /** Applies `edit` to the layer, updates `inc` with the changed cells and compares it with a full rebuild. */
  function expectSameAsRebuild(inc: TerrainFields, layer: TerrainLayer, rect: ReturnType<typeof paint>['rect']) {
    expect(rect).not.toBeNull();
    inc.update(layer, rect!);
    const full = build(layer);
    expect(inc.coast).toEqual(full.coast);
    expect(inc.mid).toEqual(full.mid);
    expect(inc.big).toEqual(full.big);
    for (const [v, weight] of full.weights) expect(inc.weights.get(v)).toEqual(weight);
    // A terrain that vanished may linger as an all-zero array, but must never have weight.
    for (const [v, weight] of inc.weights) if (!full.weights.has(v)) expect(weight.every((w) => w === 0)).toBe(true);
  }

  it('matches a full rebuild after painting, erasing and recolouring', () => {
    let layer = twoIslands();
    const inc = build(layer);

    const stroke1 = paint(layer, 'snow', 250, 120, 50); // new terrain overlapping the grass island
    layer = stroke1.layer;
    expectSameAsRebuild(inc, layer, stroke1.rect);

    const stroke2 = paint(layer, 'grass', 215, 225, 40, 'erase'); // carve a bay into the island's south-east rim
    layer = stroke2.layer;
    expectSameAsRebuild(inc, layer, stroke2.rect);

    const stroke3 = paint(layer, 'sand', 420, 330, 70); // runs off the bottom-right corner
    layer = stroke3.layer;
    expectSameAsRebuild(inc, layer, stroke3.rect);

    const stroke4 = paint(layer, 'earth', 10, 10, 60); // runs off the top-left corner
    layer = stroke4.layer;
    expectSameAsRebuild(inc, layer, stroke4.rect);
  });

  it('only changes cells within FIELD_REACH of the edit', () => {
    const layer = twoIslands();
    const before = build(layer);
    const edit = paint(layer, 'grass', 150, 90, 6); // a small blob in the north of the island's rim
    const after = build(edit.layer);
    const rect = edit.rect!;
    const { cols, rows } = before;
    for (const name of ['coast', 'mid', 'big'] as const) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (before[name][y * cols + x] === after[name][y * cols + x]) continue;
          expect(x).toBeGreaterThanOrEqual(rect.x0 - FIELD_REACH);
          expect(x).toBeLessThan(rect.x1 + FIELD_REACH);
          expect(y).toBeGreaterThanOrEqual(rect.y0 - FIELD_REACH);
          expect(y).toBeLessThan(rect.y1 + FIELD_REACH);
        }
      }
    }
  });

  it('reaches further than the widest blur', () => {
    for (const spec of Object.values(BLUR)) expect(FIELD_REACH).toBeGreaterThan(spec.radius * spec.passes);
  });
});

describe('diffRect', () => {
  const cols = 10;
  const rows = 8;
  const blank = () => new Uint8Array(cols * rows);

  it('is null when nothing differs', () => {
    expect(diffRect(blank(), blank(), cols, rows)).toBeNull();
  });

  it('boxes a single changed cell, max exclusive', () => {
    const b = blank();
    b[3 * cols + 4] = 9;
    expect(diffRect(blank(), b, cols, rows)).toEqual({ x0: 4, y0: 3, x1: 5, y1: 4 });
  });

  it('boxes all the changed cells, including the corners of the grid', () => {
    const b = blank();
    b[0] = 1;
    b[rows * cols - 1] = 1;
    expect(diffRect(blank(), b, cols, rows)).toEqual({ x0: 0, y0: 0, x1: cols, y1: rows });
    const c = blank();
    c[2 * cols + 7] = 5;
    c[5 * cols + 3] = 5;
    expect(diffRect(blank(), c, cols, rows)).toEqual({ x0: 3, y0: 2, x1: 8, y1: 6 });
  });

  it('works for an edit made by paintStroke', () => {
    const layer = createTerrainLayer(480, 360);
    const snapshot = layer.data.slice();
    const edit = paint(layer, 'grass', 100, 100, 30);
    expect(diffRect(snapshot, edit.layer.data, layer.cols, layer.rows)).toEqual(edit.rect);
  });
});
