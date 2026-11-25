import { rgba } from '../kit/colors';
import { shape, softBlob } from '../kit/draw';
import { blob } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { INK, drawTuft } from './nature-common';
import { drawBush } from './nature-foliage';
import { sandRock } from './nature-sand';
import { drawPool, WATER } from './nature-water';
import { drawPalm, FOLIAGE } from './tree';

export interface OasisSpec {
  patch: { cx: number; cy: number; rx: number; ry: number };
  pools: Array<{ cx: number; cy: number; rx: number; ry: number; rotation?: number }>;
  palms: Array<{ x: number; y: number; w: number; h: number; lean?: number }>;
  bushes?: Array<{ x: number; y: number; w: number; h: number }>;
  reeds?: Array<{ x: number; y: number; h: number; n?: number }>;
  tufts?: Array<[number, number, number]>;
  rocks?: Array<[number, number, number]>;
  /** A shrunken, muddy oasis. */
  dry?: boolean;
}

const PALM_LEAF = '#58a043';

/** Fringe of green (or dried mud) around the water, built from feathered stacked layers. */
function fringe(ctx: Ctx2D, rand: Rng, s: OasisSpec): void {
  const { cx, cy, rx, ry } = s.patch;
  const outline = blob(rand, cx, cy, rx, ry, { points: 26, jitter: 0.07, lobes: 5, lobeAmp: 0.09 });
  const grow = (k: number): Vec2[] => outline.map((p): Vec2 => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k]);
  const layers: Array<[number, string, number]> = s.dry
    ? [[1.1, '#b79556', 0.18], [1, '#a98a54', 0.3], [0.88, '#9aa24f', 0.28], [0.7, '#8f9a48', 0.25]]
    : [[1.12, '#b79556', 0.2], [1.02, '#86b252', 0.3], [0.92, '#78a647', 0.36], [0.8, '#659a3e', 0.34], [0.62, '#4f8a36', 0.2]];
  for (const [k, c, a] of layers) shape(ctx, grow(k), { fill: rgba(c, a), smooth: true });
  for (let i = 0; i < 9; i++) {
    const x = cx + rand.range(-0.8, 0.8) * rx;
    const y = cy + rand.range(-0.7, 0.7) * ry;
    const dark = i % 3 === 0;
    softBlob(ctx, x, y, rand.range(5, 10), rand.range(2.5, 5), dark ? (s.dry ? '#7d7a38' : '#3f7a2e') : s.dry ? '#c2b56a' : '#b4d676', 0.28);
  }
}

/** Water, a green fringe and palms: everything standing is arranged back to front on top of the pools. */
export function drawOasis(ctx: Ctx2D, rand: Rng, s: OasisSpec): void {
  fringe(ctx, rand, s);
  for (const p of s.pools) drawPool(ctx, rand, { ...p, pal: WATER.oasis, lumpy: 0.55, ripples: 3, glints: 3, bank: true });

  const items: Array<{ y: number; draw: () => void }> = [];
  for (const [x, y, h] of s.tufts ?? []) {
    items.push({
      y,
      draw: () => drawTuft(ctx, rand, { x, y, h, spread: h * 0.7, count: 6, dark: s.dry ? '#8a8a40' : '#4a7a30', base: s.dry ? '#b2ac58' : '#78a548', light: s.dry ? '#d2c874' : '#a3c768', ink: INK }),
    });
  }
  for (const [x, y, r] of s.rocks ?? []) items.push({ y, draw: () => sandRock(ctx, rand, x, y, r, '#b9a079') });
  for (const r of s.reeds ?? []) {
    items.push({
      y: r.y,
      draw: () => drawTuft(ctx, rand, { x: r.x, y: r.y, h: r.h, spread: r.h * 0.34, count: r.n ?? 7, dark: '#4b7a38', base: '#7ba64e', light: '#a9cb72', ink: INK, bladeW: 1.7 }),
    });
  }
  for (const b of s.bushes ?? []) items.push({ y: b.y, draw: () => drawBush(ctx, { cx: b.x, baseY: b.y, w: b.w, h: b.h, leaf: s.dry ? '#8d9a45' : FOLIAGE.green, rand, form: 1 }) });
  for (const p of s.palms) items.push({ y: p.y, draw: () => drawPalm(ctx, { cx: p.x, baseY: p.y, w: p.w, h: p.h, leaf: s.dry ? '#8aa044' : PALM_LEAF, ink: INK, rand, lean: p.lean }) });
  for (const it of items.sort((a, b) => a.y - b.y)) it.draw();
}
