import { defineSymbol } from '../../kit/define';
import type { Ctx2D, Rng } from '../../kit/types';
import { INK } from '../../parts/nature-common';
import { drawPyramid, drift, PYRAMID, type PyramidOptions } from '../../parts/nature-pyramid';
import { sandRock } from '../../parts/nature-sand';

type PyramidSpec = Omit<PyramidOptions, 'f' | 'ink' | 'rand'>;
type Placed = PyramidSpec & { x: number; y: number };

const GOLD = '#e9c34c';

const pyramid = defineSymbol({
  id: 'desert.pyramid',
  name: 'Pyramid',
  category: 'desert',
  size: [104, 88],
  anchor: [0.5, 0.88],
  order: 120,
  tags: ['pyramid', 'tomb', 'egypt', 'ancient', 'ruin', 'ziggurat', 'monument', 'desert', 'temple'],
  placement: 'land',
  variants: 6,
  draw({ ctx, w, h, rand, variant }) {
    const f: [number, number] = [w / 2, h * 0.88];
    const specs: PyramidSpec[] = [
      { a: 48, b: 48, height: 44, palette: PYRAMID.sand, cap: GOLD, door: true },
      { a: 46, b: 46, height: 38, palette: PYRAMID.lime, steps: 5, temple: true },
      { a: 50, b: 50, height: 44, palette: PYRAMID.sand, trunc: 0.62, door: true },
      { a: 38, b: 38, height: 50, palette: PYRAMID.rose, cap: GOLD, door: true },
      { a: 52, b: 52, height: 34, palette: PYRAMID.lime, door: true },
      { a: 50, b: 50, height: 42, palette: PYRAMID.dusk },
    ];
    const v = variant % specs.length;
    drawPyramid(ctx, { ...specs[v]!, f, ink: INK, rand });
    if (v === 5) {
      drift(ctx, rand, f[0] - 42, f[1] - 21, 15, 10);
      drift(ctx, rand, f[0] + 40, f[1] - 23, 14, 9);
      drift(ctx, rand, f[0] + 2, f[1] + 2, 42, 24);
    }
  },
});

function placeAll(ctx: Ctx2D, rand: Rng, list: readonly Placed[]): void {
  for (const p of [...list].sort((m, n) => m.y - n.y)) {
    const { x, y, ...spec } = p;
    drawPyramid(ctx, { ...spec, f: [x, y], ink: INK, rand });
  }
}

const pyramids = defineSymbol({
  id: 'desert.pyramids',
  name: 'Pyramids',
  category: 'desert',
  size: [150, 100],
  anchor: [0.5, 0.88],
  order: 130,
  tags: ['pyramid', 'pyramids', 'tomb', 'necropolis', 'egypt', 'ancient', 'ruin', 'monument', 'desert'],
  placement: 'land',
  variants: 6,
  draw({ ctx, w, h, rand, variant }) {
    const gy = h * 0.88;
    const mid = w / 2;
    const v = variant % 6;
    if (v === 0) {
      placeAll(ctx, rand, [
        { x: mid + 8, y: gy - 22, a: 40, b: 40, height: 40, palette: PYRAMID.sand, cap: GOLD, door: true },
        { x: mid + 52, y: gy - 8, a: 20, b: 20, height: 20, palette: PYRAMID.sand },
        { x: mid - 38, y: gy, a: 28, b: 28, height: 28, palette: PYRAMID.sand, door: true },
      ]);
    } else if (v === 1) {
      placeAll(ctx, rand, [
        { x: mid - 4, y: gy - 20, a: 38, b: 38, height: 38, palette: PYRAMID.lime, steps: 5, temple: true },
        { x: mid + 46, y: gy - 6, a: 22, b: 22, height: 20, palette: PYRAMID.dusk, steps: 4 },
        { x: mid - 46, y: gy - 2, a: 22, b: 22, height: 20, palette: PYRAMID.sand, steps: 4 },
      ]);
    } else if (v === 2) {
      placeAll(ctx, rand, [
        { x: mid - 12, y: gy - 14, a: 46, b: 46, height: 42, palette: PYRAMID.sand, trunc: 0.56 },
        { x: mid + 42, y: gy - 2, a: 26, b: 26, height: 26, palette: PYRAMID.sand, door: true },
      ]);
      for (let i = 0; i < 5; i++) sandRock(ctx, rand, mid - 56 + rand.range(0, 30), gy + rand.range(-8, 6), rand.range(1.8, 3), '#c4a77c');
    } else if (v === 3) {
      placeAll(ctx, rand, [
        { x: mid - 58, y: gy - 36, a: 15, b: 15, height: 15, palette: PYRAMID.rose },
        { x: mid - 28, y: gy - 24, a: 19, b: 19, height: 19, palette: PYRAMID.sand },
        { x: mid + 6, y: gy - 12, a: 23, b: 23, height: 23, palette: PYRAMID.rose },
        { x: mid + 44, y: gy, a: 28, b: 28, height: 28, palette: PYRAMID.sand, cap: GOLD, door: true },
      ]);
    } else if (v === 4) {
      placeAll(ctx, rand, [
        { x: mid + 6, y: gy - 20, a: 44, b: 44, height: 40, palette: PYRAMID.rose, cap: GOLD, door: true },
        { x: mid - 44, y: gy - 4, a: 30, b: 30, height: 28, palette: PYRAMID.lime, door: true },
        { x: mid + 54, y: gy - 2, a: 18, b: 18, height: 18, palette: PYRAMID.sand },
      ]);
    } else {
      placeAll(ctx, rand, [
        { x: mid + 2, y: gy - 24, a: 40, b: 40, height: 40, palette: PYRAMID.dusk },
        { x: mid - 46, y: gy - 6, a: 26, b: 26, height: 24, palette: PYRAMID.sand },
      ]);
      drift(ctx, rand, mid - 44, gy - 3, 26, 15);
      drift(ctx, rand, mid + 6, gy - 4, 36, 18);
      drift(ctx, rand, mid + 50, gy - 14, 22, 11);
    }
  },
});

export default [pyramid, pyramids];
