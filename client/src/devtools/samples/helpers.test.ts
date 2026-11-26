import { describe, expect, it } from 'vitest';
import { createTerrainLayer } from '../../model/terrainLayer';
import { distanceField } from './distanceField';
import { circle, distanceToOutline, distanceToPolyline, ellipse, meander, organicLoop, rectangle } from './geometry';
import { estimateLabel, labelStyleOrThrow } from './labelExtent';
import { PointHash, keepoutAt, makeKeepout } from './occupancy';
import { areaRegion, ridgeRegion } from './regions';
import { fillPolygon } from './terrainFill';

describe('geometry', () => {
  it('measures the distance to a line and to an outline', () => {
    expect(distanceToPolyline(5, 5, [[0, 0], [10, 0]])).toBe(5);
    expect(distanceToPolyline(15, 0, [[0, 0], [10, 0]])).toBe(5);
    expect(distanceToOutline(5, 3, rectangle(0, 0, 10, 10))).toBe(3);
  });

  it('draws ellipses with the wanted number of corners on the wanted curve', () => {
    const corners = ellipse(100, 50, 40, 20, 0, 12);
    expect(corners).toHaveLength(12);
    for (const [x, y] of corners) expect(((x - 100) / 40) ** 2 + ((y - 50) / 20) ** 2).toBeCloseTo(1, 6);
  });

  it('wobbles an outline the same way for the same seed, and differently for another', () => {
    const wobble = (seed: number) => organicLoop(circle(200, 200, 100), { amp: 10, scale: 60, seed });
    expect(wobble(3)).toEqual(wobble(3));
    expect(wobble(3)).not.toEqual(wobble(4));
    for (const [x, y] of wobble(3)) expect(Math.abs(Math.hypot(x - 200, y - 200) - 100)).toBeLessThan(30);
  });

  it('bends a line sideways but leaves its two ends where they are', () => {
    const line = meander([[0, 0], [600, 0]], 40, 120, 5);
    const first = line[0]!;
    const last = line[line.length - 1]!;
    expect(first[0]).toBeCloseTo(0, 3);
    expect(first[1]).toBeCloseTo(0, 3);
    expect(last[0]).toBeCloseTo(600, 3);
    expect(last[1]).toBeCloseTo(0, 3);
    const sway = Math.max(...line.map(([, y]) => Math.abs(y)));
    expect(sway).toBeGreaterThan(2);
    expect(sway).toBeLessThanOrEqual(40.5);
    expect(meander([[0, 0], [600, 0]], 0, 120, 5).every(([, y]) => Math.abs(y) < 1e-6)).toBe(true);
  });
});

describe('terrain fill', () => {
  it('visits the cells whose centre is inside the polygon', () => {
    const layer = createTerrainLayer(40, 40);
    const seen: number[] = [];
    fillPolygon(layer, rectangle(8, 8, 28, 28), (i) => seen.push(i));
    expect(seen).toHaveLength(25);
    expect(new Set(seen).size).toBe(25);
    expect(seen).toContain(2 * layer.cols + 2);
    expect(seen).toContain(6 * layer.cols + 6);
    expect(seen).not.toContain(7 * layer.cols + 7);
  });

  it('ignores a polygon with fewer than three corners and stays on the map', () => {
    const layer = createTerrainLayer(40, 40);
    let count = 0;
    fillPolygon(layer, [[0, 0], [30, 30]], () => count++);
    expect(count).toBe(0);
    fillPolygon(layer, rectangle(-100, -100, 500, 500), () => count++);
    expect(count).toBe(layer.cols * layer.rows);
  });
});

describe('distance field', () => {
  const layer = createTerrainLayer(800, 600);
  for (let row = 0; row < layer.rows; row++) for (let col = 50; col < 150; col++) layer.data[row * layer.cols + col] = 1;
  const at = (field: Float32Array, x: number, y: number) => field[Math.floor(y / layer.cell) * layer.cols + Math.floor(x / layer.cell)]!;

  it('measures how far inland a cell is, and how far out at sea', () => {
    const inland = distanceField(layer, 'sea');
    expect(at(inland, 100, 300)).toBe(0);
    expect(at(inland, 400, 300)).toBe(200);
    expect(at(inland, 210, 300)).toBeLessThan(20);
    const offshore = distanceField(layer, 'land');
    expect(at(offshore, 400, 300)).toBe(0);
    expect(at(offshore, 100, 300)).toBe(100);
  });

  it('knows when there is nothing of the other kind', () => {
    expect(distanceField(createTerrainLayer(40, 40), 'land')[0]).toBe(Infinity);
  });
});

describe('keeping things apart', () => {
  it('finds points of other owners that are too close, and never those of the same owner', () => {
    const hash = new PointHash(64);
    hash.add(100, 100, 20, 1);
    expect(hash.collides(130, 100, 20, 2)).toBe(true);
    expect(hash.collides(150, 100, 20, 2)).toBe(false);
    expect(hash.collides(110, 100, 20, 1)).toBe(false);
  });

  it('finds the strongest keepout at a point, tilted ones included', () => {
    const flat = makeKeepout(100, 100, 50, 10);
    expect(keepoutAt([flat], 140, 105)).toBe(1);
    expect(keepoutAt([flat], 140, 120)).toBe(0);
    const upright = makeKeepout(100, 100, 50, 10, Math.PI / 2);
    expect(keepoutAt([upright], 105, 140)).toBe(1);
    expect(keepoutAt([upright], 140, 105)).toBe(0);
    expect(keepoutAt([makeKeepout(0, 0, 10, 10, 0, 0.3), makeKeepout(0, 0, 10, 10, 0, 0.8)], 1, 1)).toBe(0.8);
  });
});

describe('regions', () => {
  it('weighs an area 1 inside and 0 outside, and thins out its fringe', () => {
    const square = rectangle(100, 100, 300, 300);
    const crisp = areaRegion(square, { warp: 0 });
    expect(crisp.weight(200, 200)).toBe(1);
    expect(crisp.weight(50, 200)).toBe(0);
    const soft = areaRegion(square, { warp: 0, soft: 60 });
    expect(soft.weight(110, 200)).toBeCloseTo(10 / 60, 6);
    expect(soft.weight(200, 200)).toBe(1);
  });

  it('weighs a ridge most on its line and nothing far from it', () => {
    const ridge = ridgeRegion([[100, 300], [700, 300]], 100);
    expect(ridge.weight(400, 300)).toBe(1);
    expect(ridge.weight(400, 330)).toBeLessThan(1);
    expect(ridge.weight(400, 420)).toBe(0);
    expect(ridge.y0).toBeLessThan(300 - 50);
    expect(ridge.y1).toBeGreaterThan(300 + 50);
  });
});

describe('name sizes', () => {
  const style = labelStyleOrThrow('region');

  it('grows with the size and the length of the name', () => {
    const small = estimateLabel('Aldoria', style, 20);
    expect(estimateLabel('Aldoria', style, 40).width).toBeCloseTo(small.width * 2, 6);
    expect(estimateLabel('Aldoria Aldoria', style, 20).width).toBeGreaterThan(small.width);
    expect(estimateLabel('Aldoria', style, 20, 0.3).width).toBeGreaterThan(small.width);
  });

  it('knows the styles of the catalog only', () => {
    expect(() => labelStyleOrThrow('nothing')).toThrow(/Unknown label style/);
  });
});
