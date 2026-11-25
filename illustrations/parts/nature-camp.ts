import { darken, lighten, mix, rgba } from '../kit/colors';
import { clipped, dot, ellipse, line, linearGradient, shades, shape, softBlob } from '../kit/draw';
import { TAU, lerp2 } from '../kit/math';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { INK, pebble, quadPts, sprinkle, tube } from './nature-common';

const EX = 0.866;
const EY = 0.5;

/** Dimetric projection with `fx, fy` as the near ground corner; x runs up-right, y runs up-left. */
export function iso(fx: number, fy: number): (x: number, y: number, z?: number) => Vec2 {
  return (x, y, z = 0) => [fx + (x - y) * EX, fy - (x + y) * EY - z];
}

export interface Cloth {
  cloth: string;
  stripe: string;
  trim: string;
}

export const CLOTH = {
  red: { cloth: '#e8d6a8', stripe: '#bd4f38', trim: '#7e3326' },
  indigo: { cloth: '#e4d8bb', stripe: '#3f6f94', trim: '#27465e' },
  ochre: { cloth: '#dcb96e', stripe: '#a9522f', trim: '#6e3520' },
  green: { cloth: '#e3d6ab', stripe: '#5f8f4e', trim: '#38592e' },
  goat: { cloth: '#6a5646', stripe: '#4a3a30', trim: '#2f241d' },
  white: { cloth: '#f0e8d4', stripe: '#dcd0b2', trim: '#b04a38' },
} satisfies Record<string, Cloth>;

const WOOD = '#8a6a44';
const DARK_DOOR = '#2a1c13';

/* ------------------------------------------------------------------------------------ */
/* Tents                                                                                */
/* ------------------------------------------------------------------------------------ */

export interface ConeTentOptions {
  cx: number;
  baseY: number;
  rx: number;
  h: number;
  cloth: Cloth;
  rand: Rng;
  /** Seams across the front. */
  panels?: number;
  /** -1..1 position of the doorway across the front. */
  door?: number;
  /** Colour of a pennant on top. */
  flag?: string;
  lean?: number;
  ink?: string;
}

/** A round tent with a pointed top, striped panels, a hem band and a dark doorway. */
export function drawConeTent(ctx: Ctx2D, o: ConeTentOptions): void {
  const ink = o.ink ?? INK;
  const { cx, baseY, rx, h, cloth, rand } = o;
  const ry = rx * 0.34;
  const n = o.panels ?? 7;
  const apex: Vec2 = [cx + (o.lean ?? 0), baseY - h];
  const arc = (t: number): Vec2 => [cx + Math.cos(t) * rx, baseY + Math.sin(t) * ry];
  const arcs = (t0: number, t1: number, steps: number): Vec2[] => Array.from({ length: steps + 1 }, (_, i) => arc(t0 + ((t1 - t0) * i) / steps));
  const bow = rx * 0.07;
  const rightEnd = arc(0);
  const leftEnd = arc(Math.PI);
  const right = quadPts(apex, [(apex[0] + rightEnd[0]) / 2 - bow, (apex[1] + baseY) / 2], rightEnd, 7);
  const left = quadPts(leftEnd, [(apex[0] + leftEnd[0]) / 2 + bow, (apex[1] + baseY) / 2], apex, 7);
  const sil = [...right, ...arcs(0, Math.PI, 14).slice(1), ...left.slice(1)];

  softBlob(ctx, cx + rx * 0.35, baseY + ry * 0.45, rx * 1.3, ry * 1.1, '#1d160c', 0.34);

  // poles poking out of the top
  const poles: Array<[number, number]> = [[-5, -7], [-2, -9.5], [2.6, -8.5], [5.6, -6]];
  for (const [dx, dy] of poles) line(ctx, [[apex[0] - dx * 0.2, apex[1] + 3], [apex[0] + dx, apex[1] + dy + rand.range(-0.6, 0.6)]], ink, 2.4);
  for (const [dx, dy] of poles) line(ctx, [[apex[0] - dx * 0.2, apex[1] + 3], [apex[0] + dx, apex[1] + dy]], WOOD, 1.1);

  shape(ctx, sil, { fill: ink, stroke: ink, width: 2.4 });
  clipped(ctx, sil, () => {
    for (let i = 0; i < n; i++) {
      const t0 = (Math.PI * i) / n;
      const t1 = (Math.PI * (i + 1)) / n;
      shape(ctx, [apex, ...arcs(t0, t1, 3)], { fill: i % 2 ? cloth.stripe : cloth.cloth });
    }
    // hem band
    const lower = arcs(0, Math.PI, 14);
    const upper = lower.map((p): Vec2 => [p[0] + (apex[0] - p[0]) * 0.06, p[1] - 3.6]);
    shape(ctx, [...lower, ...[...upper].reverse()], { fill: cloth.trim });
    line(ctx, upper, rgba(ink, 0.75), 0.8);
    for (let i = 1; i < n; i++) line(ctx, [apex, arc((Math.PI * i) / n)], rgba(darken(cloth.trim, 0.3), 0.5), 0.8);
    // door
    const dt = Math.PI / 2 - (o.door ?? 0.1) * 0.8;
    const dl = arc(dt + 0.2);
    const dr = arc(dt - 0.2);
    const dm = arc(dt);
    const top = lerp2(dm, apex, 0.5);
    shape(ctx, [dl, lerp2(dl, apex, 0.34), top, lerp2(dr, apex, 0.34), dr], { fill: DARK_DOOR, stroke: ink, width: 1.1 });
    line(ctx, [lerp2(dl, apex, 0.34), top], rgba(lighten(cloth.cloth, 0.2), 0.7), 0.8);
    // light from the top-left: bright left flank, dark right flank
    shape(ctx, sil, {
      fill: linearGradient(ctx, cx - rx, 0, cx + rx, 0, [
        [0, rgba('#fff4d2', 0.36)],
        [0.4, rgba('#fff4d2', 0.04)],
        [0.7, rgba('#2b2552', 0.16)],
        [1, rgba('#16122e', 0.54)],
      ]),
    });
  });
  shape(ctx, sil, { stroke: ink, width: 1.9 });
  for (let i = 0; i <= n; i++) {
    const p = arc((Math.PI * i) / n);
    dot(ctx, p[0], p[1] + 1.3, 0.8, ink);
  }

  if (o.flag) {
    const tip: Vec2 = [apex[0], apex[1] - 15];
    line(ctx, [[apex[0], apex[1] + 1], tip], ink, 2.3);
    line(ctx, [[apex[0], apex[1] + 1], tip], WOOD, 1);
    shape(ctx, [tip, [tip[0] + 10, tip[1] + 2.4], [tip[0] + 1, tip[1] + 5.2]], { fill: o.flag, stroke: ink, width: 1.1, smooth: false });
  }
}

export interface GableTentOptions {
  /** Near ground corner. */
  fx: number;
  fy: number;
  /** Length along the ridge (runs up-right) and width (up-left). */
  a: number;
  b: number;
  h: number;
  cloth: Cloth;
  rand: Rng;
  /** Dip of the ridge between the poles. */
  sag?: number;
  pegs?: number;
  stripes?: number;
  ink?: string;
}

/** A long ridge tent: lit gable end with the doorway, shaded sloping side with a scalloped hem. */
export function drawGableTent(ctx: Ctx2D, o: GableTentOptions): void {
  const ink = o.ink ?? INK;
  const { a, b, h, cloth } = o;
  const p = iso(o.fx, o.fy);
  const sag = o.sag ?? 1.6;
  const pegs = o.pegs ?? 5;
  const steps = pegs * 4;
  const F = p(0, 0);
  const L = p(0, b);
  const Rl = p(0, b / 2, h);
  const ridge = (t: number): Vec2 => p(a * t, b / 2, h - sag * 4 * t * (1 - t));
  const hem = (t: number): Vec2 => p(a * t, 0, Math.sin(Math.PI * ((t * pegs) % 1)) * 1.8);
  const ts = Array.from({ length: steps + 1 }, (_, i) => i / steps);
  const hemPts = ts.map(hem);
  const ridgePts = ts.map(ridge);
  const slope: Vec2[] = [...hemPts, ...[...ridgePts].reverse()];
  const gable: Vec2[] = [F, L, Rl];
  const mid = p(a / 2, b / 2);
  const dim = (c: string): string => mix(c, '#2b2552', 0.28);

  softBlob(ctx, mid[0] + 5, mid[1] + 2, (a + b) * 0.44, (a + b) * 0.15, '#1d160c', 0.34);
  line(ctx, [Rl, p(-4, b / 2, 0)], rgba(ink, 0.55), 0.7);

  shape(ctx, slope, { fill: ink, stroke: ink, width: 2.4 });
  shape(ctx, gable, { fill: ink, stroke: ink, width: 2.4 });

  const t = shades(cloth.cloth);
  shape(ctx, slope, { fill: dim(cloth.cloth) });
  const n = o.stripes ?? 6;
  for (let k = 1; k < n; k += 2) {
    const i0 = Math.round((k / n) * steps);
    const i1 = Math.round(((k + 1) / n) * steps);
    shape(ctx, [...hemPts.slice(i0, i1 + 1), ...ridgePts.slice(i0, i1 + 1).reverse()], { fill: dim(cloth.stripe) });
  }
  line(ctx, ridgePts, rgba(lighten(cloth.cloth, 0.4), 0.55), 1);
  line(ctx, hemPts, rgba(darken(cloth.trim, 0.2), 0.6), 1.1);

  shape(ctx, gable, { fill: linearGradient(ctx, Rl[0], Rl[1], F[0], F[1], [t.highlight, t.light, t.base]) });
  line(ctx, [F, Rl, L], cloth.stripe, 2, { join: 'round' });
  const d1 = p(0, b * 0.3);
  const d2 = p(0, b * 0.7);
  const d3 = p(0, b * 0.5, h * 0.64);
  shape(ctx, [d1, d3, d2], { fill: DARK_DOOR, stroke: ink, width: 1.1 });
  line(ctx, [d1, d3], rgba(lighten(cloth.cloth, 0.2), 0.7), 0.8);

  shape(ctx, [...hemPts, ...[...ridgePts].reverse()], { stroke: ink, width: 1.8 });
  shape(ctx, gable, { stroke: ink, width: 1.8 });
  for (let i = 0; i <= pegs; i++) {
    const q = p((a * i) / pegs, 0);
    dot(ctx, q[0], q[1] + 0.8, 0.8, ink);
  }
  for (const end of [Rl, ridge(1)]) {
    line(ctx, [end, [end[0], end[1] - 4.4]], ink, 2.5);
    line(ctx, [end, [end[0], end[1] - 4.4]], WOOD, 1.1);
  }
}

/* ------------------------------------------------------------------------------------ */
/* Fire                                                                                 */
/* ------------------------------------------------------------------------------------ */

function flame(ctx: Ctx2D, x: number, y: number, w: number, h: number, lean: number, fill: string, stroke?: string): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.bezierCurveTo(x - w * 0.62, y - h * 0.4, x - w * 0.05 + lean * 0.4, y - h * 0.55, x + lean, y - h);
  ctx.bezierCurveTo(x + w * 0.1 + lean * 0.6, y - h * 0.5, x + w * 0.62, y - h * 0.45, x + w / 2, y);
  ctx.quadraticCurveTo(x, y + h * 0.16, x - w / 2, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.9;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  ctx.restore();
}

/** Ring of stones, crossed logs and a lively flame with a warm glow on the ground. */
export function drawCampfire(ctx: Ctx2D, rand: Rng, x: number, y: number, s = 1, ink = INK): void {
  softBlob(ctx, x, y + s, 16 * s, 7 * s, '#ff9a2a', 0.3);
  softBlob(ctx, x, y + 0.5 * s, 8.5 * s, 3.6 * s, '#2a1c10', 0.55);
  const stones: Vec2[] = [];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * TAU + 0.3;
    stones.push([x + Math.cos(ang) * 7 * s, y + Math.sin(ang) * 3.1 * s]);
  }
  const drawStones = (back: boolean): void => {
    for (const st of stones) if ((st[1] < y) === back) pebble(ctx, rand, st[0], st[1] + 1.2 * s, 1.9 * s, '#9a927f', ink, false);
  };
  drawStones(true);
  tube(ctx, [[x - 6 * s, y + 0.6 * s], [x + 5 * s, y - 1.6 * s]], 3 * s, 2.6 * s, '#6b4a2b', { ink, inkW: 0.9 });
  tube(ctx, [[x - 5 * s, y - 1.5 * s], [x + 6 * s, y + 0.8 * s]], 3 * s, 2.6 * s, '#5b3d24', { ink, inkW: 0.9 });
  flame(ctx, x - 3.6 * s, y + 0.2 * s, 4.6 * s, 7.5 * s, -1.2 * s, '#e8601c', '#6e2a10');
  flame(ctx, x + 3.8 * s, y + 0.3 * s, 4.6 * s, 8 * s, 1.4 * s, '#e8601c', '#6e2a10');
  flame(ctx, x, y - 0.4 * s, 9 * s, 14.5 * s, 0.8 * s, '#e8601c', '#6e2a10');
  flame(ctx, x + 0.4 * s, y - 0.2 * s, 6 * s, 10.5 * s, 0.6 * s, '#ffa530');
  flame(ctx, x + 0.4 * s, y - 0.1 * s, 3.2 * s, 6 * s, 0.4 * s, '#ffe58a');
  drawStones(false);
  sprinkle(ctx, rand, x + s, y - 17 * s, 5 * s, 3.5 * s, 4, '#ffb347', 0.7 * s);
}

/* ------------------------------------------------------------------------------------ */
/* Props                                                                                */
/* ------------------------------------------------------------------------------------ */

/** A clay jar with a flared lip, banded belly and a dark mouth. */
export function drawJar(ctx: Ctx2D, x: number, baseY: number, h: number, color: string, ink = INK): void {
  const t = shades(color);
  const r = h * 0.34;
  const neck = r * 0.4;
  const lip = r * 0.58;
  const top = baseY - h;
  softBlob(ctx, x + r * 0.5, baseY, r * 1.5, r * 0.5, '#1d160c', 0.32);
  const body: Vec2[] = [
    [x - lip, top], [x - neck, top + h * 0.14], [x - r * 0.92, top + h * 0.42], [x - r, top + h * 0.62], [x - r * 0.62, baseY - 0.8], [x, baseY + 0.3],
    [x + r * 0.62, baseY - 0.8], [x + r, top + h * 0.62], [x + r * 0.92, top + h * 0.42], [x + neck, top + h * 0.14], [x + lip, top],
  ];
  shape(ctx, body, { fill: linearGradient(ctx, x - r, 0, x + r, 0, [t.highlight, t.light, t.base, t.shade, t.deep]), stroke: ink, width: 1.1, smooth: true });
  line(ctx, [[x - r * 0.96, top + h * 0.56], [x, top + h * 0.63], [x + r * 0.96, top + h * 0.56]], rgba(t.deep, 0.75), 0.9, { smooth: true });
  line(ctx, [[x - r * 0.62, top + h * 0.38], [x - r * 0.8, top + h * 0.52]], rgba(t.highlight, 0.9), 0.9);
  ellipse(ctx, x, top, lip, lip * 0.4, { fill: DARK_DOOR, stroke: ink, width: 1 });
}

/** A tied burlap sack. */
export function drawSack(ctx: Ctx2D, x: number, baseY: number, h: number, color = '#c8a76e', ink = INK): void {
  const t = shades(color);
  const r = h * 0.52;
  const top = baseY - h;
  softBlob(ctx, x + r * 0.5, baseY, r * 1.5, r * 0.5, '#1d160c', 0.32);
  const flare: Vec2[] = [[x - r * 0.32, top + h * 0.16], [x - r * 0.5, top - h * 0.06], [x - r * 0.1, top + h * 0.02], [x + r * 0.5, top - h * 0.1], [x + r * 0.32, top + h * 0.16]];
  shape(ctx, flare, { fill: t.light, stroke: ink, width: 1, smooth: true });
  const body: Vec2[] = [[x - r * 0.32, top + h * 0.14], [x - r * 0.8, top + h * 0.45], [x - r, baseY - h * 0.18], [x - r * 0.5, baseY], [x + r * 0.5, baseY], [x + r, baseY - h * 0.18], [x + r * 0.8, top + h * 0.45], [x + r * 0.32, top + h * 0.14]];
  shape(ctx, body, { fill: linearGradient(ctx, x - r, top, x + r, baseY, [t.highlight, t.base, t.shade]), stroke: ink, width: 1.1, smooth: true });
  line(ctx, [[x - r * 0.4, top + h * 0.17], [x + r * 0.4, top + h * 0.17]], '#6b4a2b', 1.3);
  line(ctx, [[x - r * 0.5, top + h * 0.5], [x - r * 0.62, top + h * 0.72]], rgba(t.highlight, 0.8), 0.9);
}

/** A small wooden crate. */
export function drawCrate(ctx: Ctx2D, fx: number, fy: number, s: number, color = '#a9814c', ink = INK): void {
  const t = shades(color);
  const p = iso(fx, fy);
  const z = s * 0.85;
  softBlob(ctx, fx + s * 0.55, fy - s * 0.2, s * 1.2, s * 0.5, '#1d160c', 0.3);
  shape(ctx, [p(0, 0), p(0, s), p(0, s, z), p(0, 0, z)], { fill: t.base, stroke: ink, width: 1 });
  shape(ctx, [p(0, 0), p(s, 0), p(s, 0, z), p(0, 0, z)], { fill: t.shade, stroke: ink, width: 1 });
  shape(ctx, [p(0, 0, z), p(s, 0, z), p(s, s, z), p(0, s, z)], { fill: t.light, stroke: ink, width: 1 });
  line(ctx, [p(0, s / 2), p(0, s / 2, z)], rgba(t.deep, 0.6), 0.7);
  line(ctx, [p(s / 2, 0), p(s / 2, 0, z)], rgba(t.deep, 0.6), 0.7);
  line(ctx, [p(s / 2, 0, z), p(s / 2, s, z)], rgba(t.deep, 0.5), 0.7);
}

export interface RugColors {
  base: string;
  border: string;
  accent: string;
}

export const RUGS = {
  red: { base: '#b5463a', border: '#e3c27a', accent: '#2f4f73' },
  blue: { base: '#3f6f94', border: '#e8d6a8', accent: '#bd4f38' },
  green: { base: '#5f8f4e', border: '#e8c97a', accent: '#8f2f2f' },
  plum: { base: '#7a3f63', border: '#e3c27a', accent: '#e8d6a8' },
} satisfies Record<string, RugColors>;

/** A flat woven rug seen from above with fringed ends. */
export function drawRug(ctx: Ctx2D, fx: number, fy: number, a: number, b: number, col: RugColors, ink = INK): void {
  const p = iso(fx, fy);
  const quad = (x0: number, y0: number, x1: number, y1: number): Vec2[] => [p(x0, y0), p(x1, y0), p(x1, y1), p(x0, y1)];
  for (let i = 1; i < 4; i++) {
    const y = (b * i) / 4;
    line(ctx, [p(-1.6, y), p(0, y)], rgba(ink, 0.7), 0.8);
    line(ctx, [p(a, y), p(a + 1.6, y)], rgba(ink, 0.7), 0.8);
  }
  shape(ctx, quad(0, 0, a, b), { fill: col.border, stroke: ink, width: 1.2 });
  shape(ctx, quad(1.7, 1.7, a - 1.7, b - 1.7), { fill: col.base });
  const cx = a / 2;
  const cy = b / 2;
  shape(ctx, [p(cx - a * 0.26, cy), p(cx, cy - b * 0.3), p(cx + a * 0.26, cy), p(cx, cy + b * 0.3)], { fill: col.accent });
  shape(ctx, [p(cx - a * 0.12, cy), p(cx, cy - b * 0.14), p(cx + a * 0.12, cy), p(cx, cy + b * 0.14)], { fill: col.border });
  line(ctx, [p(0.6, 0.6), p(0.6, b - 0.6), p(a - 0.6, b - 0.6)], rgba('#fff4d2', 0.35), 0.8);
}
