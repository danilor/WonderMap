import { rgba } from '../kit/colors';
import { dot, ellipse, line, linearGradient, shades, shape, softBlob } from '../kit/draw';
import { bounds, lerp, TAU } from '../kit/math';
import { ribbon } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { INK, quadPts, tube } from './nature-common';

export const BONE = '#e6dbc0';
const SOCKET = '#33271c';
const HORN = '#ddd0ae';

/** A bone coloured polygon, lit from the top-left, with an ink outline. */
function bonePoly(ctx: Ctx2D, pts: readonly Vec2[], ink: string, inkW: number, smooth = true, tint = BONE): void {
  const t = shades(tint);
  const b = bounds(pts);
  shape(ctx, pts, {
    fill: linearGradient(ctx, b.minX, b.minY, b.maxX, b.maxY, [[0, t.highlight], [0.3, t.light], [0.65, t.base], [1, t.shade]]),
    stroke: ink,
    width: inkW,
    smooth,
  });
}

/** A horn: tapering tube with growth rings. */
function horn(ctx: Ctx2D, pts: readonly Vec2[], w0: number, w1: number, ink: string, tint = HORN): void {
  tube(ctx, pts, w0, w1, tint, { ink, inkW: 1 });
  for (let i = 2; i < pts.length - 1; i += 2) {
    const a = pts[i - 1]!;
    const b = pts[i + 1]!;
    const c = pts[i]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    const w = lerp(w0, w1, i / (pts.length - 1)) * 0.4;
    line(ctx, [[c[0] - nx * w, c[1] - ny * w], [c[0] + nx * w, c[1] + ny * w]], rgba('#6e5c3e', 0.5), 0.7);
  }
}

/* ------------------------------------------------------------------------------------ */
/* Skulls                                                                               */
/* ------------------------------------------------------------------------------------ */

export interface BeastSkullOptions {
  /** Middle of the forehead. */
  cx: number;
  cy: number;
  s: number;
  horns: 'long' | 'bull' | 'ram';
  ink?: string;
}

/** Horns of one side in skull units (right side, x grows outward). */
function hornPath(kind: BeastSkullOptions['horns']): Vec2[] {
  if (kind === 'long') return [[6.5, -5.2], [11, -4.6], [16, -6], [20.5, -9.5], [24, -14.5], [25.8, -18]];
  if (kind === 'bull') return [[6.5, -5.2], [10.5, -5], [14.2, -7.6], [15.6, -12], [14.8, -16.6]];
  const out: Vec2[] = [];
  for (let i = 0; i <= 26; i++) {
    const u = i / 26;
    const a = -2.46 + u * 1.2 * TAU;
    const r = lerp(8.4, 2.2, u);
    out.push([13 + Math.cos(a) * r, Math.sin(a) * r]);
  }
  return out;
}

/** A cow, bull or ram skull seen from the front, lying flat. */
export function drawBeastSkull(ctx: Ctx2D, o: BeastSkullOptions): void {
  const ink = o.ink ?? INK;
  const { cx, cy, s } = o;
  const P = (x: number, y: number): Vec2 => [cx + x * s, cy + y * s];
  const muzzle = o.horns === 'ram' ? 0.8 : 1;
  const mz = (y: number): number => (y > 3 ? 3 + (y - 3) * muzzle : y);
  const t = shades(BONE);

  softBlob(ctx, cx + 2 * s, cy + 11 * s, 18 * s, 9 * s, '#1d160c', 0.3);

  for (const side of [-1, 1]) {
    const pts = hornPath(o.horns).map(([x, y]): Vec2 => P(x * side, y));
    if (o.horns === 'ram') horn(ctx, pts, 6.4 * s, 1.1 * s, ink);
    else horn(ctx, pts, 5.6 * s, 1.1 * s, ink);
  }

  const right: Vec2[] = [[0, -9.8], [4.6, -9.4], [8.4, -6.8], [9, -1.8], [7, 3.4], [5.8, 9], [5.8, 14.2], [4.6, 18.4], [2.2, 20]];
  const outline: Vec2[] = [
    ...right.map(([x, y]): Vec2 => P(x, mz(y))),
    P(0, mz(20.6)),
    ...right.slice(1).reverse().map(([x, y]): Vec2 => P(-x, mz(y))),
  ];
  bonePoly(ctx, outline, ink, 1.15);

  // bridge of the nose and sutures
  line(ctx, [P(0, -6), P(0, mz(15))], rgba('#6e5c3e', 0.45), 0.8);
  line(ctx, [P(-1.8, -8.6), P(0.4, -6.4), P(-1.4, -4.4), P(0.6, -2.6)], rgba(ink, 0.5), 0.8);
  line(ctx, [P(-3.2, 5.4), P(0, 6.4), P(3.2, 5.4)], rgba('#6e5c3e', 0.45), 0.8, { smooth: true });
  // highlight along the lit side of the forehead
  line(ctx, [P(-6.6, -5.4), P(-5, -7.8), P(-2.4, -8.7)], rgba(t.highlight, 0.95), 1.1 * s, { smooth: true });

  for (const side of [-1, 1]) {
    const e = P(5.3 * side, -1.5);
    ellipse(ctx, e[0], e[1], 2.4 * s, 2.8 * s, { fill: SOCKET, stroke: ink, width: 0.9, rotation: 0.2 * side });
    const n = P(2.2 * side, mz(17.2));
    ellipse(ctx, n[0], n[1], 1.1 * s, 1.6 * s, { fill: SOCKET, rotation: 0.3 * side });
  }
}

export interface HumanSkullOptions {
  cx: number;
  cy: number;
  s: number;
  tilt?: number;
  jaw?: boolean;
  crack?: boolean;
  ink?: string;
}

/** A human skull with a cracked cranium and a hanging jaw. */
export function drawHumanSkull(ctx: Ctx2D, o: HumanSkullOptions): void {
  const ink = o.ink ?? INK;
  const t = shades(BONE);
  ctx.save();
  ctx.translate(o.cx, o.cy);
  ctx.rotate(o.tilt ?? 0);
  ctx.scale(o.s, o.s);
  softBlob(ctx, 1.5, 12, 12, 5.5, '#1d160c', 0.3);

  if (o.jaw !== false) {
    bonePoly(ctx, [[-6.2, 7.6], [-6.9, 12], [-4.2, 15.6], [0, 16.8], [4.2, 15.6], [6.9, 12], [6.2, 7.6], [0, 9]], ink, 0.95);
    for (let i = -2; i <= 2; i++) line(ctx, [[i * 2.1, 9.6], [i * 2.1, 11.6]], rgba(ink, 0.7), 0.7);
  }
  const right: Vec2[] = [[0, -8.6], [5.6, -7.4], [8.8, -2.6], [8.6, 2.6], [6.6, 6], [5.4, 9.8], [3, 11.4]];
  const outline: Vec2[] = [...right, [0, 11.9], ...right.slice(1).reverse().map(([x, y]): Vec2 => [-x, y])];
  bonePoly(ctx, outline, ink, 0.95);

  line(ctx, [[-6.6, -4.2], [-4.6, -6.4], [-1.6, -7.4]], rgba(t.highlight, 0.95), 1.2, { smooth: true });
  for (const side of [-1, 1]) {
    ellipse(ctx, 3.6 * side, 0.9, 2.7, 3.1, { fill: SOCKET, stroke: ink, width: 0.8, rotation: 0.15 * side });
    line(ctx, [[7.2 * side, 3.8], [5.4 * side, 5.8], [3.6 * side, 5.6]], rgba('#6e5c3e', 0.6), 0.8, { smooth: true });
  }
  shape(ctx, [[0, 3.6], [-1.6, 7.2], [1.6, 7.2]], { fill: SOCKET });
  line(ctx, [[-5.2, 9.4], [5.2, 9.4]], rgba(ink, 0.6), 0.7);
  for (let i = -2; i <= 2; i++) line(ctx, [[i * 2.1 + 1.05, 9.5], [i * 2.1 + 1.05, 11.3]], rgba(ink, 0.7), 0.7);
  if (o.crack) line(ctx, [[2.6, -8.2], [1, -5.4], [3.2, -3.6], [2, -1]], rgba(ink, 0.8), 0.8);
  ctx.restore();
}

export interface DragonSkullOptions {
  x: number;
  y: number;
  s: number;
  ink?: string;
}

/** A long reptilian skull in profile, jaws slightly open and ringed with teeth. */
export function drawDragonSkull(ctx: Ctx2D, o: DragonSkullOptions): void {
  const ink = o.ink ?? INK;
  const { x, y, s } = o;
  const P = (px: number, py: number): Vec2 => [x + px * s, y + py * s];
  const t = shades(BONE);
  const lip: Vec2[] = [[0.8, 21.8], [7, 22], [16, 22.6], [25, 23.2], [33, 23.8], [41, 24.8], [48, 26.5]];
  const jawTop: Vec2[] = [[2, 24.4], [8, 25.2], [18, 26], [30, 26.8], [42, 27.2], [51, 26]];
  const yOn = (poly: readonly Vec2[], px: number): number => {
    for (let i = 1; i < poly.length; i++) {
      const a = poly[i - 1]!;
      const b = poly[i]!;
      if (px <= b[0]) return lerp(a[1], b[1], (px - a[0]) / (b[0] - a[0] || 1));
    }
    return poly[poly.length - 1]![1];
  };

  softBlob(ctx, x + 30 * s, y + 31 * s, 28 * s, 5 * s, '#1d160c', 0.3);

  // horns sweeping back
  horn(ctx, [P(44, 6.5), P(49.5, 2.6), P(55, 1.6), P(58.6, 3)], 4.6 * s, 0.9 * s, ink);
  horn(ctx, [P(50, 12), P(55, 11), P(58.2, 8.4)], 3.4 * s, 0.9 * s, ink);

  // lower jaw
  const jawRaw: Vec2[] = [[1.6, 24.4], [8, 27.4], [20, 29.6], [32, 31.2], [43, 32.2], [50, 32.6], [54, 29.6], [51, 26], ...[...jawTop].reverse()];
  const jaw = jawRaw.map(([px, py]): Vec2 => P(px, py));
  shape(ctx, [...lip, ...[...jawTop].reverse()].map(([px, py]): Vec2 => P(px, py)), { fill: SOCKET });
  bonePoly(ctx, jaw, ink, 1.1, false, '#dccfae');
  for (let px = 7; px < 40; px += 5.2) {
    const base = yOn(jawTop, px);
    shape(ctx, [P(px - 1.5, base), P(px + 0.2, base - 3.4), P(px + 1.7, base)], { fill: t.light, stroke: ink, width: 0.8, join: 'round' });
  }

  // upper skull
  const skullRaw: Vec2[] = [[0.5, 17], [0.8, 21.5], ...lip.slice(1), [53, 24], [54.5, 17], [51, 9.5], [44, 5], [36, 4.5], [30, 8.5], [22, 11], [13, 12.5], [5, 13.5]];
  const skull = skullRaw.map(([px, py]): Vec2 => P(px, py));
  bonePoly(ctx, skull, ink, 1.2);
  for (let px = 4.5; px < 36; px += 5.2) {
    const base = yOn(lip, px);
    shape(ctx, [P(px - 1.7, base), P(px + 0.2, base + 4.6), P(px + 1.9, base)], { fill: t.highlight, stroke: ink, width: 0.8 });
  }

  // eye socket with a heavy brow, temporal opening and nostril
  line(ctx, [P(29.5, 9.6), P(35, 6.4), P(41, 9)], rgba(t.highlight, 0.95), 1.4 * s, { smooth: true });
  const eye = P(35, 12);
  ellipse(ctx, eye[0], eye[1], 3.7 * s, 3.2 * s, { fill: SOCKET, stroke: ink, width: 0.9 });
  const temple = P(46.5, 16);
  ellipse(ctx, temple[0], temple[1], 3 * s, 3.8 * s, { fill: SOCKET, stroke: ink, width: 0.9, rotation: -0.2 });
  const nose = P(6, 16.4);
  ellipse(ctx, nose[0], nose[1], 1.8 * s, 1.2 * s, { fill: SOCKET, rotation: -0.2 });
  line(ctx, [P(18, 13.6), P(22, 15), P(26, 14.4)], rgba('#6e5c3e', 0.5), 0.8, { smooth: true });
  line(ctx, [P(26, 17.4), P(31, 18.6)], rgba('#6e5c3e', 0.45), 0.8);
}

/* ------------------------------------------------------------------------------------ */
/* Long bones and ribs                                                                  */
/* ------------------------------------------------------------------------------------ */

/** A femur-like bone: waisted shaft with a pair of knobs at each end. */
export function drawLongBone(ctx: Ctx2D, x0: number, y0: number, x1: number, y1: number, w: number, ink = INK): void {
  const t = shades(BONE);
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const nx = -Math.sin(ang);
  const ny = Math.cos(ang);
  const knob = w * 0.62;
  const kn: Vec2[] = [
    [x0 + nx * w * 0.42, y0 + ny * w * 0.42],
    [x0 - nx * w * 0.42, y0 - ny * w * 0.42],
    [x1 + nx * w * 0.42, y1 + ny * w * 0.42],
    [x1 - nx * w * 0.42, y1 - ny * w * 0.42],
  ];
  const mid: Vec2 = [(x0 + x1) / 2, (y0 + y1) / 2];
  softBlob(ctx, mid[0] + w * 0.5, mid[1] + w * 0.8, Math.hypot(x1 - x0, y1 - y0) * 0.56, w * 0.9, '#1d160c', 0.28);

  const n = 8;
  const pts: Vec2[] = [];
  const widths: number[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    pts.push([lerp(x0, x1, u), lerp(y0, y1, u)]);
    widths.push(w * (0.66 + 0.34 * Math.abs(2 * u - 1) ** 1.6));
  }
  const outline = ribbon(pts, widths);
  shape(ctx, outline, { fill: ink, stroke: ink, width: 2 });
  for (const k of kn) dot(ctx, k[0], k[1], knob + 1, ink);
  const sgn = nx + ny < 0 ? 1 : -1;
  shape(ctx, outline, {
    fill: linearGradient(ctx, mid[0] + nx * sgn * w * 0.5, mid[1] + ny * sgn * w * 0.5, mid[0] - nx * sgn * w * 0.5, mid[1] - ny * sgn * w * 0.5, [t.highlight, t.light, t.base, t.shade]),
  });
  for (const k of kn) {
    dot(ctx, k[0], k[1], knob, linearGradient(ctx, k[0] - knob, k[1] - knob, k[0] + knob, k[1] + knob, [t.highlight, t.base, t.shade]));
    dot(ctx, k[0] - knob * 0.3, k[1] - knob * 0.32, knob * 0.28, rgba(t.highlight, 0.9));
  }
}

export interface RibcageOptions {
  /** Left end of the spine on the ground. */
  x: number;
  y: number;
  len: number;
  /** Height of the tallest rib. */
  h: number;
  ribs: number;
  /** How much the row climbs to the right (fraction of `len`). Default 0.2. */
  slope?: number;
  rand: Rng;
  ink?: string;
}

/** Ribs arching out of the ground along a row of vertebrae. */
export function drawRibcage(ctx: Ctx2D, o: RibcageOptions): void {
  const ink = o.ink ?? INK;
  const t = shades(BONE);
  const dx = o.len;
  const dy = -o.len * (o.slope ?? 0.2);
  const ribs: Vec2[][] = [];
  const widths: number[] = [];
  for (let i = 0; i < o.ribs; i++) {
    const u = (i + 0.5) / o.ribs;
    const bx = o.x + dx * u;
    const by = o.y + dy * u;
    const hh = o.h * (0.6 + 0.4 * Math.sin(Math.PI * u)) * o.rand.range(0.93, 1.06);
    const reach = 5 + hh * 0.34;
    ribs.push(quadPts([bx, by], [bx + reach * 0.35, by - hh * 2], [bx + reach, by - 2.5], 9));
    widths.push(3.6 - u * 0.5);
  }
  softBlob(ctx, o.x + dx * 0.5, o.y + dy * 0.5 + 2, o.len * 0.62, 4.2, '#1d160c', 0.3);
  for (let i = ribs.length - 1; i >= 0; i--) tube(ctx, ribs[i]!, widths[i]!, 1, BONE, { ink, inkW: 0.95 });
  for (let i = 0; i <= o.ribs; i++) {
    const u = i / o.ribs;
    ellipse(ctx, o.x + dx * u, o.y + dy * u + 0.6, 2.4, 1.8, { fill: linearGradient(ctx, o.x + dx * u - 2, o.y + dy * u - 2, o.x + dx * u + 2, o.y + dy * u + 2, [t.highlight, t.base, t.shade]), stroke: ink, width: 0.9 });
  }
}
