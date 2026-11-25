import { defineSymbol } from '../../kit/define';
import type { Ctx2D, Rng } from '../../kit/types';
import { drawBarrel, drawPricklyPear, drawSaguaro, type ArmSpec } from '../../parts/nature-cactus';
import { INK, drawTuft, pebble } from '../../parts/nature-common';

const ROCK = '#a8977c';

/** A few stones and dry grass around the foot of a plant. */
function rubble(ctx: Ctx2D, rand: Rng, cx: number, baseY: number, spread: number, scale = 1): void {
  const n = rand.int(2, 3);
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    pebble(ctx, rand, cx + side * rand.range(0.7, 1) * spread, baseY + rand.range(0, 1.5), rand.range(1.3, 2.3) * scale, ROCK, INK, false);
  }
}

function dryTuft(ctx: Ctx2D, rand: Rng, x: number, y: number, h: number): void {
  drawTuft(ctx, rand, { x, y, h, spread: h * 0.55, count: 5, dark: '#8a7236', base: '#b6994d', light: '#d9c274', ink: INK, inkW: 0.7 });
}

/* ------------------------------------------------------------------------------------ */
/* Saguaro                                                                              */
/* ------------------------------------------------------------------------------------ */

interface SaguaroSpec {
  h: number;
  trunkW: number;
  arms: ArmSpec[];
  lean?: number;
  bloom?: boolean;
  skin?: string;
}

const SAGUARO: SaguaroSpec[] = [
  { h: 60, trunkW: 11, arms: [{ side: -1, at: 0.34, reach: 8, rise: 17 }, { side: 1, at: 0.5, reach: 9, rise: 21 }], bloom: true },
  { h: 64, trunkW: 10, lean: 2, arms: [{ side: 1, at: 0.42, reach: 10, rise: 24 }], skin: '#78a65a' },
  { h: 55, trunkW: 12, arms: [{ side: -1, at: 0.28, reach: 8, rise: 14 }, { side: 1, at: 0.42, reach: 8, rise: 19 }, { side: -1, at: 0.7, reach: 5, rise: 9 }], bloom: true, skin: '#5f9a6a' },
  { h: 58, trunkW: 10.5, lean: -4, arms: [{ side: -1, at: 0.58, reach: 7, rise: 15 }, { side: 1, at: 0.28, reach: 8, rise: 12 }] },
  { h: 40, trunkW: 13, arms: [], bloom: true, skin: '#6aa05e' },
  { h: 62, trunkW: 10, arms: [{ side: -1, at: 0.6, reach: 7, rise: 12 }, { side: 1, at: 0.56, reach: 8, rise: 14 }], bloom: true, skin: '#72a35a' },
];

const saguaro = defineSymbol({
  id: 'cactus.saguaro',
  name: 'Saguaro Cactus',
  category: 'desert',
  size: [56, 76],
  anchor: [0.5, 0.92],
  order: 10,
  tags: ['cactus', 'saguaro', 'desert', 'plant', 'tall'],
  placement: 'land',
  variants: SAGUARO.length,
  draw({ ctx, w, h, rand, variant }) {
    const s = SAGUARO[variant % SAGUARO.length]!;
    const cx = w / 2;
    const baseY = h * 0.92;
    rubble(ctx, rand, cx, baseY, s.trunkW * 1.5);
    drawSaguaro(ctx, { cx, baseY, h: s.h, trunkW: s.trunkW, arms: s.arms, lean: s.lean, bloom: s.bloom, skin: s.skin, rand });
  },
});

/* ------------------------------------------------------------------------------------ */
/* Barrel cactus                                                                        */
/* ------------------------------------------------------------------------------------ */

interface BarrelItem {
  dx: number;
  r: number;
  tall: number;
  dy?: number;
  skin?: string;
  spine?: string;
  bloom?: string;
  ribs?: number;
}

const BARRELS: BarrelItem[][] = [
  [{ dx: 0, r: 13, tall: 1, bloom: '#e5484d' }],
  [{ dx: 0, r: 11, tall: 1.28, spine: '#f2cd55', bloom: '#f7d44a', ribs: 11 }],
  [{ dx: 0, r: 13, tall: 0.92, skin: '#5f9a86', spine: '#fff7e0', ribs: 8 }],
  [{ dx: 0, r: 12, tall: 1.05, skin: '#78a65a', spine: '#e8a458', bloom: '#f08abf' }],
  [
    { dx: 7, r: 11, tall: 1, bloom: '#f7d44a' },
    { dx: -10, r: 7.5, tall: 1.1, dy: 1, skin: '#78a65a', ribs: 7 },
  ],
  [
    { dx: 0, r: 9.5, tall: 1.12, dy: -2, skin: '#6aa05e', bloom: '#e5484d', ribs: 8 },
    { dx: -12, r: 7, tall: 1, dy: 1, skin: '#5f9a86', ribs: 7 },
    { dx: 11, r: 6.5, tall: 1.2, dy: 2, spine: '#f2cd55', ribs: 7 },
  ],
];

const barrel = defineSymbol({
  id: 'cactus.barrel',
  name: 'Barrel Cactus',
  category: 'desert',
  size: [48, 38],
  anchor: [0.5, 0.9],
  order: 20,
  tags: ['cactus', 'barrel', 'desert', 'plant', 'round'],
  placement: 'land',
  variants: BARRELS.length,
  draw({ ctx, w, h, rand, variant }) {
    const items = [...BARRELS[variant % BARRELS.length]!].sort((p, q) => (p.dy ?? 0) - (q.dy ?? 0));
    const baseY = h * 0.9;
    rubble(ctx, rand, w / 2, baseY, 15, 0.9);
    for (const b of items) drawBarrel(ctx, { cx: w / 2 + b.dx, baseY: baseY + (b.dy ?? 0), r: b.r, tall: b.tall, skin: b.skin, spine: b.spine, bloom: b.bloom, ribs: b.ribs, rand });
  },
});

/* ------------------------------------------------------------------------------------ */
/* Prickly pear                                                                         */
/* ------------------------------------------------------------------------------------ */

interface PearSpec {
  pads: number;
  skin?: string;
  fruit?: string;
  flower?: string;
  h: number;
  w: number;
}

const PEARS: PearSpec[] = [
  { pads: 6, fruit: '#c8325a', h: 36, w: 42 },
  { pads: 6, flower: '#f5d34a', h: 36, w: 42, skin: '#68a05a' },
  { pads: 7, h: 38, w: 44, skin: '#5f9a6c' },
  { pads: 5, fruit: '#8a3f9a', h: 32, w: 40, skin: '#6f8f66' },
  { pads: 8, fruit: '#e0662a', h: 38, w: 46 },
  { pads: 4, flower: '#f7e27a', h: 28, w: 36, skin: '#72a35a' },
];

const pricklyPear = defineSymbol({
  id: 'cactus.prickly-pear',
  name: 'Prickly Pear',
  category: 'desert',
  size: [52, 44],
  anchor: [0.5, 0.92],
  order: 30,
  tags: ['cactus', 'prickly pear', 'opuntia', 'desert', 'plant'],
  placement: 'land',
  variants: PEARS.length,
  draw({ ctx, w, h, rand, variant }) {
    const s = PEARS[variant % PEARS.length]!;
    const baseY = h * 0.92;
    rubble(ctx, rand, w / 2, baseY, s.w * 0.42, 0.9);
    drawPricklyPear(ctx, { cx: w / 2, baseY, h: s.h, w: s.w, pads: s.pads, skin: s.skin, fruit: s.fruit, flower: s.flower, rand });
  },
});

/* ------------------------------------------------------------------------------------ */
/* Cactus group                                                                         */
/* ------------------------------------------------------------------------------------ */

type GroupItem =
  | { kind: 'saguaro'; x: number; y: number; spec: number; scale: number }
  | { kind: 'barrel'; x: number; y: number; spec: number; scale: number }
  | { kind: 'pear'; x: number; y: number; spec: number; scale: number }
  | { kind: 'tuft'; x: number; y: number; scale: number };

const GROUPS: GroupItem[][] = [
  [
    { kind: 'saguaro', x: 0.42, y: 0.7, spec: 0, scale: 0.75 },
    { kind: 'barrel', x: 0.68, y: 0.9, spec: 0, scale: 0.85 },
    { kind: 'pear', x: 0.2, y: 0.92, spec: 0, scale: 0.8 },
    { kind: 'tuft', x: 0.9, y: 0.78, scale: 1 },
  ],
  [
    { kind: 'saguaro', x: 0.28, y: 0.74, spec: 2, scale: 0.66 },
    { kind: 'saguaro', x: 0.72, y: 0.66, spec: 1, scale: 0.72 },
    { kind: 'barrel', x: 0.5, y: 0.93, spec: 1, scale: 0.85 },
    { kind: 'tuft', x: 0.1, y: 0.9, scale: 1 },
  ],
  [
    { kind: 'saguaro', x: 0.6, y: 0.62, spec: 4, scale: 0.8 },
    { kind: 'barrel', x: 0.3, y: 0.8, spec: 2, scale: 0.85 },
    { kind: 'pear', x: 0.8, y: 0.78, spec: 3, scale: 0.8 },
    { kind: 'barrel', x: 0.58, y: 0.92, spec: 0, scale: 0.9 },
  ],
  [
    { kind: 'saguaro', x: 0.76, y: 0.66, spec: 3, scale: 0.7 },
    { kind: 'pear', x: 0.3, y: 0.78, spec: 1, scale: 0.9 },
    { kind: 'pear', x: 0.66, y: 0.92, spec: 0, scale: 0.8 },
    { kind: 'barrel', x: 0.1, y: 0.92, spec: 3, scale: 0.7 },
  ],
  [
    { kind: 'saguaro', x: 0.5, y: 0.66, spec: 5, scale: 0.75 },
    { kind: 'barrel', x: 0.28, y: 0.86, spec: 4, scale: 0.85 },
    { kind: 'pear', x: 0.76, y: 0.88, spec: 4, scale: 0.8 },
    { kind: 'tuft', x: 0.46, y: 0.93, scale: 0.9 },
  ],
  [
    { kind: 'saguaro', x: 0.52, y: 0.62, spec: 0, scale: 0.7 },
    { kind: 'saguaro', x: 0.24, y: 0.72, spec: 3, scale: 0.66 },
    { kind: 'saguaro', x: 0.8, y: 0.74, spec: 4, scale: 0.8 },
    { kind: 'barrel', x: 0.4, y: 0.92, spec: 5, scale: 0.8 },
    { kind: 'tuft', x: 0.9, y: 0.92, scale: 0.9 },
  ],
];

const cactusGroup = defineSymbol({
  id: 'desert.cactus-group',
  name: 'Cactus Garden',
  category: 'desert',
  size: [104, 84],
  anchor: [0.5, 0.94],
  order: 40,
  tags: ['cactus', 'cacti', 'desert', 'plant', 'group', 'garden'],
  placement: 'land',
  variants: GROUPS.length,
  draw({ ctx, w, h, rand, variant }) {
    const items = [...GROUPS[variant % GROUPS.length]!].sort((p, q) => p.y - q.y);
    for (const it of items) {
      const x = w * it.x;
      const y = h * it.y;
      if (it.kind === 'tuft') {
        dryTuft(ctx, rand, x, y, 9 * it.scale);
      } else if (it.kind === 'saguaro') {
        const s = SAGUARO[it.spec % SAGUARO.length]!;
        rubble(ctx, rand, x, y, s.trunkW * it.scale * 1.4, 0.8);
        drawSaguaro(ctx, { cx: x, baseY: y, h: s.h * it.scale, trunkW: s.trunkW * it.scale, arms: s.arms.map((a) => ({ ...a, reach: a.reach * it.scale, rise: a.rise * it.scale })), lean: (s.lean ?? 0) * it.scale, bloom: s.bloom, skin: s.skin, rand });
      } else if (it.kind === 'barrel') {
        const b = BARRELS[it.spec % BARRELS.length]![0]!;
        drawBarrel(ctx, { cx: x, baseY: y, r: b.r * it.scale, tall: b.tall, skin: b.skin, spine: b.spine, bloom: b.bloom, ribs: b.ribs, rand });
      } else {
        const s = PEARS[it.spec % PEARS.length]!;
        drawPricklyPear(ctx, { cx: x, baseY: y, h: s.h * it.scale, w: s.w * it.scale, pads: s.pads, skin: s.skin, fruit: s.fruit, flower: s.flower, rand });
      }
    }
  },
});

export default [saguaro, barrel, pricklyPear, cactusGroup];
