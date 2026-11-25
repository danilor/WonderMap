import { defineSymbol } from '../../kit/define';
import { ellipse, line } from '../../kit/draw';
import { rgba } from '../../kit/colors';
import { TAU } from '../../kit/math';
import type { Ctx2D, Rng } from '../../kit/types';
import { INK, drawTuft, pebble } from '../../parts/nature-common';
import { lilyPad, drawPool, WATER, type WaterPalette } from '../../parts/nature-water';

const GRASS = { dark: '#2f4426', base: '#547a3b', light: '#86a95a' };

function edgeTufts(ctx: Ctx2D, rand: Rng, cx: number, cy: number, rx: number, ry: number, angles: number[], h = 7): void {
  for (const a of angles) {
    drawTuft(ctx, rand, {
      x: cx + Math.cos(a) * rx * 1.04,
      y: cy + Math.sin(a) * ry * 1.02,
      h: h * rand.range(0.8, 1.15),
      spread: h * 0.5,
      count: 5,
      ...GRASS,
      ink: INK,
      inkW: 0.7,
    });
  }
}

/** A bubble breaking the surface of a bog. */
function bubble(ctx: Ctx2D, x: number, y: number, r: number, pal: WaterPalette): void {
  ellipse(ctx, x, y, r, r * 0.9, { fill: rgba(pal.glint, 0.28), stroke: rgba(pal.line, 0.85), width: Math.max(0.6, r * 0.28) });
  ellipse(ctx, x - r * 0.3, y - r * 0.32, r * 0.28, r * 0.2, { fill: rgba('#ffffff', 0.85), rotation: -0.5 });
}

function bubbles(ctx: Ctx2D, rand: Rng, cx: number, cy: number, rx: number, ry: number, count: number, pal: WaterPalette): void {
  for (let i = 0; i < count; i++) {
    const a = rand.range(0, TAU);
    const d = Math.sqrt(rand.next()) * 0.62;
    bubble(ctx, cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, rand.range(0.9, 2.3), pal);
  }
}

const pool = defineSymbol({
  id: 'swamp.pool',
  name: 'Murky pool',
  category: 'swamp',
  size: [72, 44],
  anchor: [0.5, 0.5],
  layer: 'ground',
  order: 10,
  tags: ['pool', 'puddle', 'pond', 'water', 'murky', 'swamp', 'marsh', 'mere'],
  placement: 'land',
  rotatable: true,
  variants: 6,
  draw({ ctx, rand, variant }) {
    switch (variant % 6) {
      case 0:
        drawPool(ctx, rand, { cx: 36, cy: 22, rx: 28, ry: 15, pal: WATER.murk, lumpy: 0.7, ripples: 5, glints: 2 });
        edgeTufts(ctx, rand, 36, 22, 28, 15, [2.5, 0.5, 1.5], 7);
        break;
      case 1:
        drawPool(ctx, rand, { cx: 36, cy: 23, rx: 17, ry: 11, pal: WATER.dark, lumpy: 0.5, ripples: 3, glints: 2 });
        pebble(ctx, rand, 17, 33, 2.6, '#8c8470', INK);
        pebble(ctx, rand, 56, 14, 2.1, '#8c8470', INK);
        edgeTufts(ctx, rand, 36, 23, 17, 11, [0.3, 2.6], 6);
        break;
      case 2:
        drawPool(ctx, rand, { cx: 36, cy: 22, rx: 31, ry: 10, pal: WATER.murk, lumpy: 0.8, ripples: 4, glints: 2, rotation: -0.18 });
        edgeTufts(ctx, rand, 36, 22, 31, 10, [1.9, 0.7, 3.5], 6);
        break;
      case 3:
        drawPool(ctx, rand, { cx: 36, cy: 22, rx: 26, ry: 16, pal: WATER.dark, lumpy: 0.9, ripples: 5, glints: 3 });
        pebble(ctx, rand, 20, 34, 3, '#7e7864', INK);
        pebble(ctx, rand, 26, 36, 2, '#8c8470', INK);
        pebble(ctx, rand, 57, 31, 2.6, '#7e7864', INK);
        break;
      case 4:
        drawPool(ctx, rand, { cx: 34, cy: 24, rx: 27, ry: 13, pal: WATER.murk, lumpy: 0.6, ripples: 6, glints: 2 });
        edgeTufts(ctx, rand, 34, 24, 27, 13, [0.2, 1.2, 2.9, 4.3], 8);
        break;
      default:
        drawPool(ctx, rand, { cx: 36, cy: 22, rx: 30, ry: 17, pal: WATER.dark, lumpy: 0.4, ripples: 6, glints: 3 });
        for (let i = 0; i < 3; i++) line(ctx, [[18 + i * 14, 24 + (i % 2) * 5], [24 + i * 14, 26 + (i % 2) * 5]], rgba('#c3dca0', 0.5), 0.8, { cap: 'round' });
        break;
    }
  },
});

const bog = defineSymbol({
  id: 'swamp.bog',
  name: 'Bubbling bog',
  category: 'swamp',
  size: [68, 42],
  anchor: [0.5, 0.5],
  layer: 'ground',
  order: 20,
  tags: ['bog', 'mud', 'peat', 'tar', 'bubbles', 'quagmire', 'swamp', 'marsh', 'mire'],
  placement: 'land',
  rotatable: true,
  variants: 5,
  draw({ ctx, rand, variant }) {
    switch (variant % 5) {
      case 0:
        drawPool(ctx, rand, { cx: 34, cy: 21, rx: 26, ry: 14, pal: WATER.bog, lumpy: 0.9, ripples: 2, glints: 1 });
        bubbles(ctx, rand, 34, 21, 26, 14, 7, WATER.bog);
        break;
      case 1:
        drawPool(ctx, rand, { cx: 33, cy: 22, rx: 22, ry: 12, pal: WATER.bog, lumpy: 1, ripples: 1, glints: 0 });
        bubbles(ctx, rand, 33, 22, 22, 12, 5, WATER.bog);
        pebble(ctx, rand, 11, 34, 2.4, '#8c8470', INK);
        edgeTufts(ctx, rand, 33, 22, 22, 12, [0.4, 2.2], 6);
        break;
      case 2:
        drawPool(ctx, rand, { cx: 34, cy: 22, rx: 29, ry: 16, pal: WATER.bog, lumpy: 0.6, ripples: 2, glints: 2 });
        bubbles(ctx, rand, 34, 22, 29, 16, 10, WATER.bog);
        break;
      case 3:
        drawPool(ctx, rand, { cx: 34, cy: 22, rx: 24, ry: 13, pal: WATER.dark, lumpy: 0.8, ripples: 2, glints: 1 });
        bubbles(ctx, rand, 34, 22, 24, 13, 6, WATER.dark);
        for (let i = 0; i < 3; i++) line(ctx, [[26 + i * 8, 9], [24 + i * 8, 4], [27 + i * 8, 0]], rgba('#d8e6c8', 0.55), 1.2, { smooth: true, cap: 'round' });
        break;
      default:
        drawPool(ctx, rand, { cx: 34, cy: 22, rx: 27, ry: 15, pal: WATER.bog, lumpy: 0.8, ripples: 2, glints: 1 });
        bubbles(ctx, rand, 34, 22, 27, 15, 5, WATER.bog);
        edgeTufts(ctx, rand, 34, 22, 27, 15, [2.8, 1.3, 0.1, 4.6], 6);
        break;
    }
  },
});

const PADS = ['#5f9a45', '#4f8a3c', '#6aa84d', '#58913f'];
const BLOOMS = ['#f4a2c4', '#f8f2d8', '#f6d65a', '#e888b0'];

const lilies = defineSymbol({
  id: 'swamp.lilies',
  name: 'Lily pads',
  category: 'swamp',
  size: [64, 40],
  anchor: [0.5, 0.5],
  layer: 'ground',
  order: 30,
  tags: ['lily', 'pad', 'lotus', 'water', 'pond', 'flowers', 'swamp', 'marsh'],
  placement: 'land',
  rotatable: true,
  variants: 6,
  draw({ ctx, rand, variant }) {
    const rx = [24, 18, 27, 21, 25, 22][variant % 6]!;
    const ry = [13, 11, 12, 14, 14, 12][variant % 6]!;
    drawPool(ctx, rand, { cx: 32, cy: 21, rx, ry, pal: WATER.murk, lumpy: 0.6, ripples: 3, glints: 1 });
    const pads = [3, 5, 4, 6, 4, 5][variant % 6]!;
    for (let i = 0; i < pads; i++) {
      const a = (i / pads) * TAU + rand.range(-0.3, 0.3) + variant;
      const d = i === 0 ? 0.08 : rand.range(0.28, 0.62);
      const r = i === 0 ? rand.range(5.5, 7) : rand.range(3.2, 5.4);
      const bloom = (i < 2 && variant % 3 !== 2) || (variant === 5 && i === 3) ? BLOOMS[(i + variant) % BLOOMS.length] : undefined;
      lilyPad(ctx, rand, 32 + Math.cos(a) * rx * d, 21 + Math.sin(a) * ry * d, r, PADS[(i + variant) % PADS.length]!, INK, bloom);
    }
    if (variant % 2 === 1) edgeTufts(ctx, rand, 32, 21, rx, ry, [2.7, 0.4], 7);
  },
});

export default [pool, bog, lilies];
