import { symbolById } from '@wondermap/illustrations';
import { describe, expect, it } from 'vitest';
import { documentFromJson, documentToJson } from '../../model/document';
import { landRatio, terrainAt } from '../../model/terrainLayer';
import { distanceField } from './distanceField';
import { circle, rectangle } from './geometry';
import { MapBuilder } from './MapBuilder';
import type { BuilderOptions } from './MapBuilder';

const OPTIONS: BuilderOptions = { id: 'test-map-0001', name: 'Test land', width: 800, height: 600, themeId: 'wonder', frameId: 'none', seed: 7, unit: 1 };
const WHOLE_MAP = rectangle(0, 0, 800, 600);
const HILLS = { items: [{ asset: 'hill.green' }], area: WHOLE_MAP, spacing: 50 } as const;

/** A plain block of grass with the sea around it. */
function mainland(options: Partial<BuilderOptions> = {}): MapBuilder {
  const b = new MapBuilder({ ...OPTIONS, ...options });
  b.land(rectangle(150, 120, 650, 480), 'grass', { amp: 0 });
  return b;
}

describe('MapBuilder land and water', () => {
  it('only makes maps that fit the terrain grid', () => {
    expect(() => new MapBuilder({ ...OPTIONS, width: 802 })).toThrow(/multiple of/);
  });

  it('raises land, cuts water out of it and tells the two apart', () => {
    const b = mainland();
    expect(b.isLand(400, 300)).toBe(true);
    expect(b.isLand(30, 30)).toBe(false);
    b.lake(rectangle(300, 200, 500, 400), { amp: 0 });
    expect(b.isLand(400, 300)).toBe(false);
    expect(b.isLand(180, 300)).toBe(true);
  });

  it('changes the terrain of the land only, never of the sea', () => {
    const b = mainland();
    b.paint(WHOLE_MAP, 'snow', { amp: 0 });
    expect(b.isLand(30, 30)).toBe(false);
    const { terrain } = b.build().doc;
    expect(terrainAt(terrain, 400, 300)).toBe('snow');
    expect(landRatio(terrain)).toBeGreaterThan(0.3);
    expect(landRatio(terrain)).toBeLessThan(0.7);
  });

  it('changes the terrain along a line', () => {
    const b = mainland();
    b.band([[150, 300], [650, 300]], 30, 'sand');
    const { terrain } = b.build().doc;
    expect(terrainAt(terrain, 400, 300)).toBe('sand');
    expect(terrainAt(terrain, 400, 450)).toBe('grass');
  });

  it('refuses a terrain, symbol, name style, road style or brush that does not exist', () => {
    const b = mainland();
    expect(() => b.land(rectangle(0, 0, 10, 10), 'nowhere')).toThrow(/Unknown terrain/);
    expect(() => b.place('nothing', 10, 10)).toThrow(/Unknown symbol/);
    expect(() => b.label('Name', 10, 10, { style: 'nothing' })).toThrow(/Unknown label style/);
    expect(() => b.path('nothing', [[0, 0], [10, 10]], 5)).toThrow(/Unknown path style/);
    expect(() => b.scatter({ brush: 'nothing', area: WHOLE_MAP })).toThrow(/Unknown brush/);
    expect(() => b.scatter({ area: WHOLE_MAP })).toThrow(/needs a brush or items/);
  });
});

describe('MapBuilder warnings', () => {
  it('is quiet when everything is where it belongs', () => {
    const b = mainland();
    b.site('castle.keep', 400, 300, 'The Keep');
    b.place('ship.cog', 50, 50);
    expect(b.build().warnings).toEqual([]);
  });

  it('tells about a town in the sea, a ship on land and things off the map', () => {
    const b = mainland();
    b.place('castle.keep', 50, 580);
    b.place('ship.cog', 400, 320);
    b.place('castle.keep', -5, 10);
    b.label('Nowhere', 900, 100);
    const { warnings } = b.build();
    expect(warnings).toHaveLength(4);
    expect(warnings.join('\n')).toMatch(/castle\.keep stands in the sea at \(50, 580\)/);
    expect(warnings.join('\n')).toMatch(/ship\.cog floats on land at \(400, 320\)/);
    expect(warnings.join('\n')).toMatch(/castle\.keep is off the map/);
    expect(warnings.join('\n')).toMatch(/"Nowhere" is off the map/);
  });
});

describe('MapBuilder scatter', () => {
  it('keeps land symbols on land, and sea symbols in the sea when asked', () => {
    const b = mainland();
    b.scatter(HILLS);
    b.scatter({ items: [{ asset: 'sea.rock' }], area: WHOLE_MAP, spacing: 50, where: 'sea' });
    const { doc, warnings } = b.build();
    const onHills = doc.symbols.filter((s) => s.asset === 'hill.green');
    const onRocks = doc.symbols.filter((s) => s.asset === 'sea.rock');
    expect(onHills.length).toBeGreaterThan(15);
    expect(onRocks.length).toBeGreaterThan(15);
    expect(onHills.every((s) => terrainAt(doc.terrain, s.x, s.y) !== null)).toBe(true);
    expect(onRocks.every((s) => terrainAt(doc.terrain, s.x, s.y) === null)).toBe(true);
    expect(warnings).toEqual([]);
  });

  it('keeps its distance from the coast with inset and stays on the wanted terrain with on', () => {
    const b = mainland();
    b.paint(rectangle(300, 200, 500, 400), 'sand', { amp: 0 });
    b.scatter({ ...HILLS, inset: 60 });
    b.scatter({ items: [{ asset: 'hill.brown' }], area: WHOLE_MAP, spacing: 50, on: ['sand'], mix: 1 });
    const { doc } = b.build();
    const inland = distanceField(doc.terrain, 'sea');
    const reach = (x: number, y: number) => inland[Math.floor(y / doc.terrain.cell) * doc.terrain.cols + Math.floor(x / doc.terrain.cell)]!;
    const green = doc.symbols.filter((s) => s.asset === 'hill.green');
    const brown = doc.symbols.filter((s) => s.asset === 'hill.brown');
    expect(green.length).toBeGreaterThan(20);
    expect(green.every((s) => reach(s.x, s.y) >= 60)).toBe(true);
    expect(brown.length).toBeGreaterThan(5);
    expect(brown.every((s) => terrainAt(doc.terrain, s.x, s.y) === 'sand')).toBe(true);
  });

  it('keeps clear of a town and a road', () => {
    const dense = { ...HILLS, spacing: 16 };
    const inside = (x: number, y: number, cx: number, cy: number, halfW: number, halfH: number) => Math.abs(x - cx) <= halfW && Math.abs(y - cy) <= halfH;
    const crowded = mainland();
    crowded.scatter(dense);
    const free = crowded.build().doc.symbols;

    const b = mainland();
    b.scatter(dense);
    b.site('castle.keep', 400, 300, null, { clear: 1 });
    b.path('road', [[120, 450], [680, 450]], 10, { clear: 1 });
    const kept = b.build().doc.symbols.filter((s) => s.asset === 'hill.green');

    const def = symbolById.get('castle.keep')!;
    const [w, h] = def.size;
    const cx = 400 + (0.5 - def.anchor[0]) * w;
    const cy = 300 + (0.5 - def.anchor[1]) * h;
    const core = (s: { x: number; y: number }) => inside(s.x, s.y, cx, cy, w * 0.2, h * 0.2);
    const road = (s: { x: number; y: number }) => Math.abs(s.y - 450) < 8;
    expect(free.some(core)).toBe(true);
    expect(free.some(road)).toBe(true);
    expect(kept.some(core)).toBe(false);
    expect(kept.some(road)).toBe(false);
  });
});

describe('MapBuilder output', () => {
  function describeIsland(seed: number): string {
    const b = new MapBuilder({ ...OPTIONS, seed });
    b.island(400, 300, 260, 180, 'grass');
    b.scatter({ ...HILLS, area: circle(400, 300, 250) });
    b.site('castle.keep', 400, 300, 'The Keep');
    b.path('river', [[150, 300], [650, 320]], 12);
    return documentToJson(b.build().doc);
  }

  it('makes the same map from the same description, and another from another seed', () => {
    expect(describeIsland(7)).toBe(describeIsland(7));
    expect(describeIsland(7)).not.toBe(describeIsland(8));
  });

  it('makes a document that opens, with a fixed date and numbered items', () => {
    const b = mainland();
    b.scatter(HILLS);
    b.site('castle.keep', 400, 300, 'The Keep');
    b.path('river', [[150, 300], [650, 320]], 12);
    const { doc } = b.build();
    expect(doc.createdAt).toBe('2025-01-01T00:00:00.000Z');
    expect(doc.updatedAt).toBe(doc.createdAt);
    const ids = [...doc.symbols, ...doc.paths, ...doc.labels].map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    const again = documentFromJson(documentToJson(doc));
    expect(again.symbols).toEqual(doc.symbols);
    expect(again.labels.map((l) => l.text)).toEqual(['The Keep']);
    expect(again.paths).toHaveLength(1);
    expect(again.name).toBe('Test land');
  });
});
