import { mix, rgba } from '../kit/colors';
import { ellipse, line, linearGradient, shades, shape, softBlob, taper } from '../kit/draw';
import { lerp } from '../kit/math';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { drawHouse } from './building';
import { INK, litOffset, quadPts } from './nature-common';
import { glow } from './nature-marsh';
import { drawRoundTree } from './tree';

/* ------------------------------------------------------------------------------------ */
/* Weeping willow                                                                       */
/* ------------------------------------------------------------------------------------ */

export interface WillowOptions {
  cx: number;
  baseY: number;
  w: number;
  h: number;
  leaf: string;
  rand: Rng;
  /** How low the curtains hang at the sides, 0..1. */
  skirt?: number;
  /** Sideways lean of the trunk as a fraction of `w`. */
  lean?: number;
  shadow?: boolean;
}

interface Strand {
  pts: Vec2[];
  e: number;
  w: number;
}

/** A weeping willow: a gnarled trunk under a dome of long hanging curtains. */
export function drawWillow(ctx: Ctx2D, o: WillowOptions): void {
  const { rand, cx, baseY, w, h } = o;
  const R = w / 2;
  const Ry = h * 0.3;
  const cy = baseY - h + Ry;
  const skirt = o.skirt ?? 1;
  const lean = (o.lean ?? 0) * w;
  const tones = shades(o.leaf);
  if (o.shadow !== false) softBlob(ctx, cx + w * 0.1, baseY, w * 0.42, w * 0.09, '#1d160c', 0.34);

  const trunk = quadPts([cx, baseY], [cx + lean * 0.2 - 1.5, baseY - h * 0.28], [cx + lean * 0.5, baseY - h * 0.6], 7);
  for (const s of [-1, 1]) {
    const root = quadPts([cx + s * w * 0.03, baseY - 5], [cx + s * w * 0.1, baseY - 1], [cx + s * w * 0.17, baseY + 0.5], 4);
    taper(ctx, root, 5, 2.2, INK);
    taper(ctx, root, 3.2, 0.9, '#5a4836');
  }
  taper(ctx, trunk, w * 0.2 + 2.2, w * 0.11 + 2.2, INK);
  taper(ctx, trunk, w * 0.2, w * 0.11, linearGradient(ctx, cx - w * 0.1, 0, cx + w * 0.12, 0, ['#9a8460', '#6a5640', '#43352a']));
  taper(ctx, litOffset(trunk, w * 0.05), w * 0.05, w * 0.03, rgba('#d3bc94', 0.55));
  line(ctx, quadPts([cx + 1, baseY - 4], [cx + 2, baseY - h * 0.2], [cx + lean * 0.3 + 1, baseY - h * 0.4], 5), rgba('#2b2118', 0.55), 0.8);

  const n = Math.max(9, Math.round(w / 4.4));
  const step = (2 * R) / n;
  const centerTip = baseY - h * 0.42;
  const edgeTip = baseY - h * (0.05 + (1 - skirt) * 0.3);

  const makeStrands = (offset: number, shorten: number): Strand[] => {
    const out: Strand[] = [];
    for (let k = 0; k < n; k++) {
      const x = cx - R + (k + 0.5 + offset) * step;
      const e = Math.min(1, Math.abs(x - cx) / R);
      const ax = cx + (x - cx) * 0.9;
      const ea = Math.min(1, Math.abs(ax - cx) / R);
      const ay = cy - Ry * Math.sqrt(Math.max(0, 1 - ea * ea)) * 0.95 + 2;
      const tx = x + Math.sign(x - cx) * e * 3 + rand.range(-1.2, 1.2);
      const ty = Math.max(ay + 9, lerp(centerTip, edgeTip, Math.pow(e, 1.3)) + rand.range(-2.5, 2.5) - shorten);
      out.push({ pts: quadPts([ax, ay], [ax + (tx - ax) * 0.25 + rand.range(-2, 2), ay + (ty - ay) * 0.55], [tx, ty], 7), e, w: step * 1.3 });
    }
    return out;
  };
  const back = makeStrands(0, 0);
  const front = makeStrands(0.5, 3);

  // The mass behind the curtains, so no gaps show between strands.
  const mass: Vec2[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = Math.PI - (i / 16) * Math.PI;
    mass.push([cx + Math.cos(t) * R * 0.98, cy - Math.sin(t) * Ry]);
  }
  for (let k = back.length - 1; k >= 0; k--) {
    const tip = back[k]!.pts[back[k]!.pts.length - 1]!;
    mass.push(tip);
    const prev = back[k - 1];
    if (prev) {
      const pt = prev.pts[prev.pts.length - 1]!;
      mass.push([(tip[0] + pt[0]) / 2, Math.min(tip[1], pt[1]) - rand.range(4, 8)]);
    }
  }
  shape(ctx, mass, { fill: linearGradient(ctx, cx - R, cy - Ry, cx + R * 0.7, baseY, [tones.base, tones.shade, tones.deep]), stroke: INK, width: 1.7 });

  const paint = (list: Strand[], inkAlpha: number, lit: boolean): void => {
    for (const s of list) {
      const shade = mix(tones.base, tones.deep, Math.min(1, s.e * 0.5 + (lit ? 0 : 0.15)));
      taper(ctx, s.pts, s.w + 1.2, 1.6, rgba(INK, inkAlpha));
      taper(ctx, s.pts, s.w, 0.8, lit ? mix(shade, tones.light, 0.35) : shade);
      if (s.pts[0]![0] < cx + R * 0.3) taper(ctx, litOffset(s.pts, s.w * 0.18), s.w * 0.32, 0.3, rgba(tones.highlight, 0.7));
    }
  };
  paint(back, 0.55, false);
  paint(front, 0.7, true);

  softBlob(ctx, cx - R * 0.3, cy - Ry * 0.5, R * 0.42, Ry * 0.3, tones.highlight, 0.4);
}

/* ------------------------------------------------------------------------------------ */
/* Mangrove                                                                             */
/* ------------------------------------------------------------------------------------ */

export interface MangroveOptions {
  cx: number;
  /** Water line where the roots end. */
  baseY: number;
  w: number;
  h: number;
  leaf: string;
  rand: Rng;
  roots: number;
  /** Height of the stilt roots. */
  rootH: number;
}

/** A mangrove: a dense dome of leaves lifted on arching stilt roots. */
export function drawMangrove(ctx: Ctx2D, o: MangroveOptions): void {
  const { rand, cx, baseY, w, roots } = o;
  const rootTop = baseY - o.rootH;
  const list: Vec2[][] = [];
  const widths: number[] = [];
  for (let i = 0; i < roots; i++) {
    const f = roots === 1 ? 0 : i / (roots - 1) - 0.5;
    const xe = cx + f * w * rand.range(0.9, 1) + rand.range(-1.5, 1.5);
    const xs = cx + f * w * 0.18;
    const ys = rootTop + rand.range(-2, 2);
    list.push(quadPts([xs, ys], [xs + (xe - xs) * 1.05, ys + o.rootH * 0.15], [xe, baseY + rand.range(-0.5, 1)], 8));
    widths.push(rand.range(3, 4.4));
  }
  const order = list.map((_, i) => i).sort((a, b) => Math.abs(list[b]![list[b]!.length - 1]![0] - cx) - Math.abs(list[a]![list[a]!.length - 1]![0] - cx));
  for (const i of order) {
    const pts = list[i]!;
    const rw = widths[i]!;
    taper(ctx, pts, rw + 2.2, 3.2, INK);
    taper(ctx, pts, rw, 1.5, '#7a5a3c');
    taper(ctx, litOffset(pts, rw * 0.22), rw * 0.3, 0.5, rgba('#d1a77c', 0.6));
    const end = pts[pts.length - 1]!;
    ellipse(ctx, end[0], end[1] + 0.4, 3.2, 1.1, { stroke: rgba('#d8efd6', 0.65), width: 0.7 });
  }
  drawRoundTree(ctx, { cx, baseY: rootTop + 4, w: w * 0.82, h: o.h, leaf: o.leaf, ink: INK, rand, shadow: false, trunkVisible: 0.02, lobes: 7 });
}

/* ------------------------------------------------------------------------------------ */
/* Witch hut on stilts                                                                  */
/* ------------------------------------------------------------------------------------ */

export interface StiltHutOptions {
  cx: number;
  /** Ground (water) line under the front corner. */
  groundY: number;
  a: number;
  b: number;
  /** Height of the platform above the ground. */
  lift: number;
  wallH: number;
  roofH: number;
  wall: string;
  roof: string;
  rand: Rng;
  hip?: boolean;
  ridge?: 'x' | 'y';
  lantern?: boolean;
}

const EX: Vec2 = [0.866, -0.5];
const EY: Vec2 = [-0.866, -0.5];

function along(p: Vec2, v: Vec2, k: number): Vec2 {
  return [p[0] + v[0] * k, p[1] + v[1] * k];
}

/** A hut lifted on crooked stilts, with a plank platform, a ladder and an optional glowing lantern. */
export function drawStiltHut(ctx: Ctx2D, o: StiltHutOptions): void {
  const t = 2.6;
  const m = 3;
  const yp = o.groundY - o.lift;
  const PF: Vec2 = [o.cx, yp + m];
  const PR = along(PF, EX, o.a + 2 * m);
  const PL = along(PF, EY, o.b + 2 * m);
  const PB = along(PR, EY, o.b + 2 * m);
  const low = (p: Vec2): Vec2 => [p[0], p[1] + t];

  const post = (p: Vec2, wd: number): void => {
    const y0 = p[1] + t - 1;
    const y1 = p[1] + o.lift;
    shape(ctx, [[p[0] - wd / 2, y0], [p[0] + wd / 2, y0], [p[0] + wd / 2 + 0.3, y1], [p[0] - wd / 2 - 0.3, y1]], {
      fill: linearGradient(ctx, p[0] - wd / 2, 0, p[0] + wd / 2, 0, ['#8a6b47', '#5e4630']),
      stroke: INK,
      width: 1.1,
    });
    ellipse(ctx, p[0], y1 + 0.3, wd * 0.9, 1, { stroke: rgba('#d8efd6', 0.6), width: 0.6 });
  };
  const midLF = along(PF, EY, (o.b + 2 * m) / 2);
  const midFR = along(PF, EX, (o.a + 2 * m) / 2);
  post(PL, 3);
  post(PR, 3);
  line(ctx, [[PL[0], PL[1] + t + 3], [midLF[0], midLF[1] + o.lift - 2]], INK, 1.8);
  line(ctx, [[PL[0], PL[1] + t + 3], [midLF[0], midLF[1] + o.lift - 2]], '#7a5c3c', 0.8);
  line(ctx, [[PR[0], PR[1] + t + 3], [midFR[0], midFR[1] + o.lift - 2]], INK, 1.8);
  line(ctx, [[PR[0], PR[1] + t + 3], [midFR[0], midFR[1] + o.lift - 2]], '#6a4f33', 0.8);
  post(midLF, 3.2);
  post(midFR, 3.2);
  post(PF, 3.6);

  // Ladder down the lit side.
  const T = along(PL, [PF[0] - PL[0], PF[1] - PL[1]], 0.62);
  const rails: [number, number][] = [[-1.9, 0], [1.9, 0]];
  for (const [dx] of rails) {
    const top: Vec2 = [T[0] + dx - 1, T[1] + 1];
    const bot: Vec2 = [T[0] + dx - 8, T[1] + o.lift + 1];
    line(ctx, [top, bot], INK, 2.4, { cap: 'round' });
    line(ctx, [top, bot], '#a98757', 1.1, { cap: 'round' });
  }
  for (let i = 1; i <= 3; i++) {
    const f = i / 4;
    const y = T[1] + 1 + (o.lift) * f;
    const x = T[0] - 1 - 7 * f;
    line(ctx, [[x - 1.9, y], [x + 1.9, y]], INK, 2, { cap: 'round' });
    line(ctx, [[x - 1.9, y], [x + 1.9, y]], '#c4a574', 0.8, { cap: 'round' });
  }

  // Platform: two plank edges and the top.
  shape(ctx, [PL, PF, low(PF), low(PL)], { fill: '#8d6f4b', stroke: INK, width: 1.2 });
  shape(ctx, [PF, PR, low(PR), low(PF)], { fill: '#5d4630', stroke: INK, width: 1.2 });
  shape(ctx, [PF, PR, PB, PL], { fill: linearGradient(ctx, PL[0], PL[1], PR[0], PR[1], ['#bb9a69', '#a58660', '#7f6445']), stroke: INK, width: 1.2 });
  for (let i = 1; i < 5; i++) {
    const p0: Vec2 = [lerp(PL[0], PF[0], i / 5), lerp(PL[1], PF[1], i / 5)];
    const p1: Vec2 = [lerp(PB[0], PR[0], i / 5), lerp(PB[1], PR[1], i / 5)];
    line(ctx, [p0, p1], rgba('#3b2a1c', 0.45), 0.7);
  }

  drawHouse(ctx, {
    x: o.cx,
    y: yp,
    a: o.a,
    b: o.b,
    wallH: o.wallH,
    roofH: o.roofH,
    wall: o.wall,
    roof: o.roof,
    ink: INK,
    rand: o.rand,
    chimney: !o.hip,
    hip: o.hip,
    ridge: o.ridge,
    shadow: false,
  });

  if (o.lantern) {
    const lx = PR[0] - 2;
    const ly = PR[1] + 2;
    glow(ctx, lx, ly + 3, 11, '#ffb23e', 0.55);
    line(ctx, [[lx, ly - 3], [lx, ly]], INK, 1.4);
    ellipse(ctx, lx, ly + 3, 2.4, 3, { fill: '#ffe08a', stroke: INK, width: 1 });
    ellipse(ctx, lx - 0.6, ly + 2.2, 0.8, 1, { fill: '#ffffff', alpha: 0.8 });
  }
}
