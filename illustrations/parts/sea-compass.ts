import { mix, rgba } from '../kit/colors';
import { ellipse, line, radialGradient, shape } from '../kit/draw';
import { TAU } from '../kit/math';
import type { Ctx2D, Vec2 } from '../kit/types';

/** Compass roses: a faceted star (each point half lit, half shaded), an optional lettered ring, rhumb lines and a hub. */

export interface RosePalette {
  ink: string;
  paper: string;
  band: string;
  light: string;
  dark: string;
  north: string;
}

export interface RoseLook {
  points: 4 | 8 | 16;
  palette: RosePalette;
  ring: 'full' | 'none';
  letters: 'all' | 'north' | 'none';
  rhumbs?: boolean;
}

/** Letters as a few strokes in a -1..1 box. */
const GLYPHS: Record<'N' | 'E' | 'S' | 'W', Vec2[][]> = {
  N: [[[-0.6, 0.8], [-0.6, -0.8], [0.6, 0.8], [0.6, -0.8]]],
  E: [[[0.6, -0.8], [-0.6, -0.8], [-0.6, 0.8], [0.6, 0.8]], [[-0.6, 0], [0.4, 0]]],
  S: [[[0.6, -0.55], [0.25, -0.85], [-0.3, -0.85], [-0.62, -0.5], [-0.4, -0.1], [0.4, 0.1], [0.62, 0.5], [0.3, 0.85], [-0.25, 0.85], [-0.6, 0.55]]],
  W: [[[-0.85, -0.8], [-0.42, 0.8], [0, -0.2], [0.42, 0.8], [0.85, -0.8]]],
};

const polar = (cx: number, cy: number, a: number, r: number): Vec2 => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];

function letter(ctx: Ctx2D, ch: 'N' | 'E' | 'S' | 'W', x: number, y: number, h: number, ink: string, fill: string): void {
  for (const pass of [0, 1]) {
    for (const stroke of GLYPHS[ch]) {
      const pts = stroke.map((p): Vec2 => [x + p[0] * h * 0.5, y + p[1] * h * 0.5]);
      line(ctx, pts, pass === 0 ? ink : fill, pass === 0 ? h * 0.24 : h * 0.1, { smooth: ch === 'S', join: 'miter', cap: 'butt' });
    }
  }
}

function annulus(ctx: Ctx2D, cx: number, cy: number, r0: number, r1: number, fill: string): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r1, 0, TAU);
  ctx.arc(cx, cy, r0, 0, TAU, true);
  ctx.fillStyle = fill;
  ctx.fill('evenodd');
  ctx.restore();
}

/** One point of the star: a kite split along its ridge, the half that faces the top-left light painted bright. */
function starPoint(ctx: Ctx2D, cx: number, cy: number, a: number, len: number, half: number, base: number, light: string, dark: string, ink: string, lw: number): void {
  const tip = polar(cx, cy, a, len);
  const left = polar(cx, cy, a - half, len * base);
  const right = polar(cx, cy, a + half, len * base);
  const rightLit = Math.sin(a) - Math.cos(a) > 0;
  shape(ctx, [[cx, cy], left, tip], { fill: rightLit ? dark : light });
  shape(ctx, [[cx, cy], tip, right], { fill: rightLit ? light : dark });
  shape(ctx, [[cx, cy], left, tip, right], { stroke: ink, width: lw, join: 'miter' });
  line(ctx, [[cx, cy], tip], rgba(ink, 0.5), lw * 0.55);
}

export function drawRose(ctx: Ctx2D, w: number, h: number, look: RoseLook): void {
  const p = look.palette;
  const cx = w / 2;
  const cy = h / 2;
  const full = look.ring === 'full';
  const R = Math.min(w, h) / 2 - (full ? 4 : 10);
  const lw = Math.max(0.9, R / 80);
  const Lmax = R * (full ? 0.78 : 0.86);

  if (full) {
    ellipse(ctx, cx + R * 0.03, cy + R * 0.05, R, R, { fill: rgba('#2a2015', 0.2) });
    ellipse(ctx, cx, cy, R, R, { fill: radialGradient(ctx, cx, cy, 0, R, [[0, rgba(p.paper, 0.92)], [0.78, rgba(p.paper, 0.92)], [1, rgba(p.band, 0.97)]]), stroke: p.ink, width: lw * 2.2 });
    annulus(ctx, cx, cy, R * 0.8, R * 0.985, rgba(p.band, 0.9));
    ellipse(ctx, cx, cy, R * 0.8, R * 0.8, { stroke: p.ink, width: lw * 1.5 });
    ellipse(ctx, cx, cy, R * 0.985, R * 0.985, { stroke: rgba(p.ink, 0.6), width: lw * 0.7 });
    // Ticks around the band, with the cardinal slots left clear for the letters.
    for (let k = 0; k < 64; k++) {
      if (k % 16 === 0) continue;
      const a = (k / 64) * TAU - Math.PI / 2;
      const len = k % 8 === 0 ? 0.14 : k % 4 === 0 ? 0.1 : 0.06;
      line(ctx, [polar(cx, cy, a, R * 0.8), polar(cx, cy, a, R * (0.8 + len))], rgba(p.ink, 0.85), lw * (k % 8 === 0 ? 1.3 : 0.9), { cap: 'butt' });
    }
    // Small diamonds on the diagonals.
    for (let k = 1; k < 8; k += 2) {
      const c = polar(cx, cy, (k / 8) * TAU - Math.PI / 2, R * 0.915);
      const d = R * 0.045;
      shape(ctx, [[c[0], c[1] - d], [c[0] + d, c[1]], [c[0], c[1] + d], [c[0] - d, c[1]]], { fill: p.north, stroke: p.ink, width: lw * 0.8 });
    }
  } else {
    ellipse(ctx, cx, cy + R * 0.04, R * 0.5, R * 0.5, { fill: rgba('#2a2015', 0.1) });
  }

  if (look.rhumbs) {
    const reach = full ? R * 0.8 : Lmax;
    for (let k = 0; k < 16; k++) line(ctx, [[cx, cy], polar(cx, cy, (k / 16) * TAU, reach)], rgba(p.ink, 0.28), lw * 0.7, { cap: 'butt' });
    ellipse(ctx, cx, cy, reach * 0.62, reach * 0.62, { stroke: rgba(p.ink, 0.3), width: lw * 0.7 });
  }

  // Points, smallest first so the long ones lie on top.
  const n = look.points;
  const ranks: Array<{ every: number; skip: number; len: number; half: number; base: number }> = [];
  if (n === 16) ranks.push({ every: 1, skip: 2, len: 0.5, half: 0.2, base: 0.34 });
  if (n >= 8) ranks.push({ every: n === 16 ? 2 : 1, skip: n === 16 ? 4 : 2, len: n === 16 ? 0.74 : 0.7, half: n === 16 ? 0.33 : 0.38, base: 0.3 });
  ranks.push({ every: n / 4, skip: 0, len: 1, half: n === 4 ? 0.5 : n === 8 ? 0.4 : 0.37, base: n === 4 ? 0.26 : 0.3 });
  for (const rank of ranks) {
    for (let i = 0; i < n; i += rank.every) {
      if (rank.skip > 1 && i % rank.skip === 0) continue;
      const a = (i / n) * TAU - Math.PI / 2;
      const north = i === 0 && rank.len === 1;
      starPoint(ctx, cx, cy, a, Lmax * rank.len, rank.half, rank.base, north ? mix(p.north, '#ffffff', 0.32) : p.light, north ? mix(p.north, '#2a0a0a', 0.3) : p.dark, p.ink, lw * 1.2);
    }
  }

  // Hub.
  const hub = R * 0.075;
  ellipse(ctx, cx, cy, hub, hub, { fill: radialGradient(ctx, cx, cy, 0, hub, [mix(p.light, '#ffffff', 0.4), p.light, p.dark], cx - hub * 0.35, cy - hub * 0.35), stroke: p.ink, width: lw * 1.3 });
  ellipse(ctx, cx, cy, hub * 0.38, hub * 0.38, { fill: p.north, stroke: p.ink, width: lw * 0.6 });

  // Letters.
  if (look.letters === 'none') return;
  const lh = R * 0.17;
  const reach = full ? R * 0.905 : R * 0.97;
  const fill = full ? mix(p.paper, '#ffffff', 0.4) : p.light;
  letter(ctx, 'N', cx, cy - reach, lh, p.ink, mix(p.north, '#ffffff', 0.25));
  if (look.letters === 'all') {
    letter(ctx, 'E', cx + reach, cy, lh, p.ink, fill);
    letter(ctx, 'S', cx, cy + reach, lh, p.ink, fill);
    letter(ctx, 'W', cx - reach, cy, lh, p.ink, fill);
  }
}
