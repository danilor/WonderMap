import { defineSymbol } from '../../kit/define';
import type { Ctx2D, Rng, Vec2 } from '../../kit/types';
import { INK, drawTuft, quadPts, tube } from '../../parts/nature-common';
import { arcPath, crestPath, drawCracked, grains, paintCrests, sandRock, type Crest } from '../../parts/nature-sand';
import { TAU } from '../../kit/math';

function dryTuft(ctx: Ctx2D, rand: Rng, x: number, y: number, h: number): void {
  drawTuft(ctx, rand, { x, y, h, spread: h * 0.55, count: 5, dark: '#8a7236', base: '#b6994d', light: '#d9c274', ink: INK, inkW: 0.7 });
}

/** A bleached twig lying on the ground. */
function twig(ctx: Ctx2D, rand: Rng, x: number, y: number, len: number): void {
  const lift = rand.range(-2.5, 2.5);
  tube(ctx, quadPts([x - len / 2, y + 1], [x, y - lift], [x + len / 2, y - 1], 6), 2, 1, '#d6c7a2', { ink: INK, inkW: 0.6 });
  tube(ctx, quadPts([x - len * 0.05, y - lift * 0.4], [x + len * 0.05, y - 3], [x + len * 0.18, y - 4.4], 4), 1.1, 0.6, '#d6c7a2', { ink: INK, inkW: 0.5 });
}

/** A barchan: a crescent that opens to the right, with horns trailing downwind. */
function crescent(rand: Rng, cx: number, cy: number, rx: number, ry: number, shade: number, lit: number, ripples = 3): Crest {
  const from = rand.range(50, 68);
  const to = 360 - rand.range(50, 68);
  const pts = arcPath(cx, cy, rx, ry, from, to, 28).map((p): Vec2 => [p[0] + rand.range(-0.35, 0.35), p[1] + rand.range(-0.35, 0.35)]);
  return { pts, shade, lit, ripples };
}

type Bump = readonly [at: number, width: number, height: number];

/** A crest with several summits, like the back of a camel. */
function humps(rand: Rng, a: Vec2, b: Vec2, bumps: readonly Bump[], shade: number, lit: number, ripples = 3): Crest {
  const n = 36;
  const phase = rand.range(0, TAU);
  const elev: number[] = [];
  const pts: Vec2[] = [];
  let top = 0;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let e = 0;
    for (const [at, wd, ht] of bumps) e += ht * Math.exp(-Math.pow((t - at) / wd, 2));
    e *= Math.min(1, t * 7, (1 - t) * 7);
    elev.push(e);
    top = Math.max(top, e);
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - e + Math.sin(t * TAU * 1.6 + phase) * 0.9 * Math.sin(Math.PI * t)]);
  }
  return { pts, shade, lit, ripples, profile: (t) => Math.pow(elev[Math.round(t * n)]! / top, 0.8) };
}

const ridge = (rand: Rng, a: Vec2, b: Vec2, arch: number, shade: number, lit: number, o: { skew?: number; wig?: number; ripples?: number } = {}): Crest => ({
  pts: crestPath(rand, a, b, { arch, skew: o.skew ?? 0.45, wig: o.wig ?? 1.2 }),
  shade,
  lit,
  ripples: o.ripples ?? 3,
  peak: o.skew ?? 0.45,
});

/* ------------------------------------------------------------------------------------ */
/* Single dune                                                                          */
/* ------------------------------------------------------------------------------------ */

const DUNE: ((rand: Rng) => Crest[])[] = [
  // long crescent ridge
  (rand) => [ridge(rand, [8, 41], [97, 36], 17, 15, 11, { skew: 0.38, wig: 1.6, ripples: 4 })],
  // barchan
  (rand) => [crescent(rand, 60, 29, 33, 15, 11, 9, 4)],
  // twin ridges
  (rand) => [ridge(rand, [10, 29], [80, 24], 11, 10, 8, { skew: 0.4 }), ridge(rand, [26, 48], [97, 43], 12, 11, 8, { skew: 0.58 })],
  // camel back with two summits
  (rand) => [humps(rand, [8, 43], [96, 39], [[0.3, 0.17, 20], [0.72, 0.15, 14]], 15, 11, 4)],
  // whaleback hump
  (rand) => [ridge(rand, [14, 41], [90, 39], 16, 19, 14, { skew: 0.56, wig: 0.8, ripples: 5 })],
  // sinuous crest
  (rand) => [ridge(rand, [6, 43], [98, 17], 5, 12, 9, { skew: 0.5, wig: 7, ripples: 4 })],
];

const dune = defineSymbol({
  id: 'desert.dune',
  name: 'Sand Dune',
  category: 'desert',
  size: [104, 58],
  anchor: [0.5, 0.62],
  layer: 'ground',
  order: 50,
  tags: ['dune', 'sand', 'desert', 'ridge', 'ground'],
  placement: 'land',
  variants: DUNE.length,
  draw({ ctx, w, h, rand, variant }) {
    const crests = DUNE[variant % DUNE.length]!(rand);
    grains(ctx, rand, w / 2, h * 0.5, w * 0.4, h * 0.36, 26);
    paintCrests(ctx, rand, crests);
    grains(ctx, rand, w / 2, h * 0.5, w * 0.4, h * 0.36, 8);
  },
});

/* ------------------------------------------------------------------------------------ */
/* Dune field                                                                           */
/* ------------------------------------------------------------------------------------ */

const DUNES: ((rand: Rng) => Crest[])[] = [
  // parallel wavy ridges
  (rand) => [
    ridge(rand, [14, 27], [112, 21], 9, 9, 7, { wig: 2, skew: 0.42 }),
    ridge(rand, [8, 46], [130, 40], 12, 12, 8, { wig: 2.5, skew: 0.55 }),
    ridge(rand, [30, 64], [144, 59], 11, 11, 8, { wig: 2, skew: 0.4 }),
  ],
  // diagonal ridges
  (rand) => [
    ridge(rand, [10, 50], [70, 14], 8, 10, 8, { wig: 1.6 }),
    ridge(rand, [46, 66], [122, 24], 10, 12, 9, { wig: 2, skew: 0.5 }),
    ridge(rand, [86, 69], [142, 38], 7, 9, 7, { wig: 1.4 }),
  ],
  // barchan field
  (rand) => [
    crescent(rand, 66, 36, 24, 12, 8, 12, 3),
    crescent(rand, 24, 24, 15, 7.5, 5.5, 8, 2),
    crescent(rand, 112, 28, 16, 8, 6, 9, 2),
    crescent(rand, 38, 56, 17, 8.5, 6, 9, 2),
    crescent(rand, 104, 58, 23, 11, 8, 11, 3),
  ],
  // camel back between two low ridges
  (rand) => [
    humps(rand, [18, 40], [136, 34], [[0.28, 0.12, 19], [0.7, 0.14, 14]], 17, 12, 4),
    ridge(rand, [8, 60], [62, 56], 7, 8, 6, { skew: 0.45 }),
    ridge(rand, [86, 70], [144, 64], 7, 8, 6, { skew: 0.55 }),
  ],
  // one big dune with small ones in front
  (rand) => [
    ridge(rand, [14, 40], [124, 33], 24, 24, 17, { wig: 1.8, skew: 0.42, ripples: 5 }),
    ridge(rand, [10, 62], [48, 58], 6, 6, 5, { ripples: 2 }),
    ridge(rand, [58, 67], [100, 63], 7, 7, 5, { ripples: 2 }),
    ridge(rand, [108, 64], [140, 60], 5, 5, 4, { ripples: 1 }),
  ],
  // rolling dunes, one in front of the other
  (rand) => [
    ridge(rand, [36, 38], [138, 31], 20, 19, 14, { wig: 1.5, skew: 0.5, ripples: 5 }),
    ridge(rand, [6, 53], [80, 48], 16, 16, 12, { wig: 1.2, skew: 0.42, ripples: 4 }),
    ridge(rand, [64, 70], [146, 63], 13, 13, 10, { wig: 1.4, skew: 0.58, ripples: 3 }),
  ],
];

const dunes = defineSymbol({
  id: 'desert.dunes',
  name: 'Sand Dunes',
  category: 'desert',
  size: [152, 76],
  anchor: [0.5, 0.6],
  layer: 'ground',
  order: 60,
  tags: ['dunes', 'sand', 'desert', 'ridges', 'erg', 'ground'],
  placement: 'land',
  variants: DUNES.length,
  draw({ ctx, w, h, rand, variant }) {
    const crests = DUNES[variant % DUNES.length]!(rand);
    grains(ctx, rand, w / 2, h * 0.5, w * 0.42, h * 0.4, 46);
    paintCrests(ctx, rand, crests);
    grains(ctx, rand, w / 2, h * 0.5, w * 0.42, h * 0.4, 12);
    if (variant === 0 || variant === 4) sandRock(ctx, rand, w * 0.8, h * 0.9, 2.2);
    if (variant === 1) dryTuft(ctx, rand, w * 0.18, h * 0.5, 7);
  },
});

/* ------------------------------------------------------------------------------------ */
/* Cracked earth                                                                        */
/* ------------------------------------------------------------------------------------ */

interface CrackedSpec {
  mud: string;
  crack: string;
  cell: number;
  rx?: number;
  extra?: 'tuft' | 'rock' | 'twig';
}

const CRACKED: CrackedSpec[] = [
  { mud: '#e9d6a4', crack: '#6a4a2a', cell: 12 },
  { mud: '#e4cf9a', crack: '#5f4125', cell: 8.5, extra: 'rock' },
  { mud: '#ecdcb0', crack: '#6a4a2a', cell: 15, extra: 'tuft' },
  { mud: '#dfae82', crack: '#5a3420', cell: 11.5 },
  { mud: '#efe8d4', crack: '#8a7c64', cell: 10, extra: 'twig' },
  { mud: '#c7a672', crack: '#4d3519', cell: 12.5, extra: 'rock' },
];

const cracked = defineSymbol({
  id: 'desert.cracked',
  name: 'Cracked Earth',
  category: 'desert',
  size: [76, 54],
  anchor: [0.5, 0.55],
  layer: 'ground',
  order: 70,
  tags: ['cracked', 'dry', 'mud', 'earth', 'drought', 'desert', 'badlands', 'ground'],
  placement: 'land',
  variants: CRACKED.length,
  draw({ ctx, w, h, rand, variant }) {
    const s = CRACKED[variant % CRACKED.length]!;
    drawCracked(ctx, { cx: w / 2, cy: h / 2, rx: w * 0.4, ry: h * 0.38, cell: s.cell, mud: s.mud, crack: s.crack, rand });
    if (s.extra === 'rock') {
      sandRock(ctx, rand, w * 0.3, h * 0.55, 3.2);
      sandRock(ctx, rand, w * 0.66, h * 0.4, 2.2);
    } else if (s.extra === 'tuft') {
      dryTuft(ctx, rand, w * 0.58, h * 0.58, 8);
    } else if (s.extra === 'twig') {
      twig(ctx, rand, w * 0.35, h * 0.62, 11);
    }
  },
});

export default [dune, dunes, cracked];
