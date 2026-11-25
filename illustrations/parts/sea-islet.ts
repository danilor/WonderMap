import { rgba } from '../kit/colors';
import { clipped, dot, ellipse, line, linearGradient, shades, shape, softBlob } from '../kit/draw';
import { blob } from '../kit/shapes';
import type { Vec2 } from '../kit/types';
import { FOAM, foamBlob, ripple } from './sea-fx';
import { paintRock } from './sea-rock';
import type { Rock } from './sea-rock';
import type { Pen } from './ship-parts';
import { drawPalm } from './tree';

/** Small islands: a sandy lens in turquoise shallows, with palms, rocks and a few things washed up. */

export interface Palm {
  x: number;
  /** Where the trunk stands, as an offset from the middle of the waterline. */
  y: number;
  w: number;
  h: number;
  lean?: number;
}

export type PropKind = 'chest' | 'log' | 'bush' | 'shells' | 'flag' | 'barrel';

export interface IsletLook {
  /** Radii of the island at the waterline. */
  rx: number;
  ry: number;
  sand: string;
  turf?: { color: string; rx: number; ry: number; x?: number; y?: number };
  palms?: Palm[];
  /** Painted over the island, in front of the palms. */
  rocks?: Rock[];
  props?: Array<{ kind: PropKind; x: number; y: number; s?: number }>;
}

const THICK = 3.6;

function bush(pen: Pen, x: number, y: number, r: number, color: string): void {
  const { ctx, ink, u } = pen;
  const T = shades(color);
  softBlob(ctx, x + r * 0.3, y + 1, r * 1.2, r * 0.4, '#2a2015', 0.3);
  for (const [dx, dy, k] of [[-0.55, -0.1, 0.7], [0.55, -0.05, 0.75], [0, -0.5, 0.9]] as const) {
    const cx = x + dx * r;
    const cy = y + dy * r - r * 0.35;
    ellipse(ctx, cx, cy, r * k, r * k * 0.86, { fill: linearGradient(ctx, cx - r * k, cy - r * k, cx + r * k, cy + r * k, [T.highlight, T.light, T.base, T.shade]), stroke: ink, width: 1.2 * u });
  }
  dot(ctx, x - r * 0.3, y - r * 1.1, r * 0.14, rgba(T.highlight, 0.9));
}

function chest(pen: Pen, x: number, y: number, s: number): void {
  const { ctx, ink, u } = pen;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  softBlob(ctx, 2, 0.6, 8.5, 2.2, '#2a2015', 0.32);
  shape(ctx, [[-6.5, 0], [-6.5, -5], [6.5, -5], [6.5, 0]], { fill: '#7a4c26', stroke: ink, width: 1.3 * u });
  shape(ctx, [[-6.5, -4.6], [-5, -9], [5, -9], [6.5, -4.6]], { fill: '#935c2e', stroke: ink, width: 1.3 * u, smooth: true });
  shape(ctx, [[-6.5, -3.6], [6.5, -3.6]], { stroke: '#3a3a42', width: 1.4 * u, closed: false });
  shape(ctx, [[-2.2, -9], [-2.2, 0]], { stroke: '#3a3a42', width: 1.2 * u, closed: false });
  shape(ctx, [[2.2, -9], [2.2, 0]], { stroke: '#3a3a42', width: 1.2 * u, closed: false });
  line(ctx, [[-5.4, -5.4], [-3, -8]], rgba('#ffd9a0', 0.55), 0.9 * u);
  dot(ctx, 0, -3.6, 1.1, '#f2c94c');
  dot(ctx, 3.8, -5.6, 0.7, '#f2c94c');
  dot(ctx, 5.2, -6.2, 0.55, '#f2c94c');
  ctx.restore();
}

function log(pen: Pen, x: number, y: number, s: number): void {
  const { ctx, ink, u } = pen;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  softBlob(ctx, 1.5, 1, 11, 2.2, '#2a2015', 0.28);
  shape(ctx, [[-10, 0.6], [-9, -2.8], [7, -3.4], [10, -1.2], [8.6, 1.8], [-8, 2.2]], { fill: linearGradient(ctx, 0, -3.4, 0, 2.2, ['#c9a672', '#9a7a4e', '#6f5636']), stroke: ink, width: 1.2 * u, smooth: true });
  ellipse(ctx, 9, -0.6, 1.4, 2.2, { fill: '#d9bc88', stroke: ink, width: 0.8 * u });
  line(ctx, [[-6, -1.8], [4, -2.2]], rgba('#f4e3b8', 0.6), 0.8 * u);
  ctx.restore();
}

function barrel(pen: Pen, x: number, y: number, s: number): void {
  const { ctx, ink, u } = pen;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  softBlob(ctx, 2, 0.6, 7.5, 1.9, '#2a2015', 0.3);
  shape(ctx, [[-4.2, 0], [-4.8, -4.5], [-4, -8], [4, -8], [4.8, -4.5], [4.2, 0]], { fill: linearGradient(ctx, -5, 0, 5, 0, ['#b48650', '#8a5f34', '#5e3f22']), stroke: ink, width: 1.2 * u, smooth: true });
  ellipse(ctx, 0, -8, 4, 1.6, { fill: '#b48650', stroke: ink, width: 1 * u });
  line(ctx, [[-4.7, -2.6], [4.7, -2.6]], '#3a3a42', 0.9 * u);
  line(ctx, [[-4.7, -5.8], [4.7, -5.8]], '#3a3a42', 0.9 * u);
  ctx.restore();
}

function flag(pen: Pen, x: number, y: number, s: number): void {
  const { ctx, ink, u } = pen;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  line(ctx, [[0, 0], [0.4, -16]], ink, 2 * u);
  line(ctx, [[0, 0], [0.4, -16]], '#a8825a', 1 * u);
  shape(ctx, [[0.6, -16], [8, -14.6], [6.2, -12.4], [8.2, -10.6], [0.6, -10.8]], { fill: '#c8442f', stroke: ink, width: 1.1 * u, smooth: false });
  line(ctx, [[1.4, -15.4], [6, -14.6]], rgba('#ffb09a', 0.7), 0.7 * u);
  ctx.restore();
}

function shells(pen: Pen, x: number, y: number, s: number): void {
  const { ctx, rand, u } = pen;
  for (let i = 0; i < 4; i++) {
    const px = x + rand.range(-7, 7) * s;
    const py = y + rand.range(-1.2, 1.2) * s;
    ellipse(ctx, px, py, 1.1 * s, 0.7 * s, { fill: i % 2 ? '#fff4e0' : '#f6c8c0', stroke: rgba('#6b5a3a', 0.7), width: 0.5 * u });
  }
}

function prop(pen: Pen, kind: PropKind, x: number, y: number, s: number): void {
  if (kind === 'chest') chest(pen, x, y, s);
  else if (kind === 'log') log(pen, x, y, s);
  else if (kind === 'bush') bush(pen, x, y, 5 * s, '#5d9a48');
  else if (kind === 'shells') shells(pen, x, y, s);
  else if (kind === 'barrel') barrel(pen, x, y, s);
  else flag(pen, x, y, s);
}

/** The island with its shallows. The waterline centre is the origin. */
export function drawIslet(pen: Pen, look: IsletLook): void {
  const { ctx, rand, ink, u } = pen;
  const { rx, ry } = look;
  const T = shades(look.sand);

  // Shallows: pale turquoise growing out of the deep water, and the surf ring.
  softBlob(ctx, 0, 2, rx * 1.85, ry * 2.8, '#46b4b8', 0.42);
  softBlob(ctx, 0, 2, rx * 1.4, ry * 2.1, '#9fe6dc', 0.55);
  ripple(ctx, 0, 3.4, rx * 1.3, ry * 1.65, { alpha: 0.42, rings: 2 });
  foamBlob(ctx, rand, 0, 1.6, rx * 1.1, ry * 1.5, { alpha: 0.55 });

  // The beach slope, then the top face lifted above it.
  const base = blob(rand, 0, 0, rx, ry, { points: 22, jitter: 0.04, lobes: 4, lobeAmp: 0.05 });
  const top = base.map((p): Vec2 => [p[0] * 0.94, p[1] * 0.92 - THICK]);
  shape(ctx, base, { fill: linearGradient(ctx, -rx, -ry, rx, ry, [T.base, T.shade, T.deep]), stroke: ink, width: 2.1 * u, smooth: true });
  shape(ctx, top, { fill: linearGradient(ctx, -rx, -ry - THICK, rx * 0.8, ry, [T.highlight, T.light, T.base]), stroke: ink, width: 1.5 * u, smooth: true });
  clipped(ctx, top, () => {
    shape(ctx, top, { stroke: rgba(T.shade, 0.5), width: 4.6, smooth: true });
    for (let i = 0; i < 14; i++) dot(ctx, rand.range(-0.8, 0.8) * rx, -THICK + rand.range(-0.8, 0.8) * ry, rand.range(0.4, 0.9), rgba(i % 3 ? T.shade : T.highlight, 0.5));
  }, true);
  // Wet sand along the waterline of the slope.
  clipped(ctx, base, () => {
    shape(ctx, base, { stroke: rgba('#5a4a2a', 0.34), width: 3.4, smooth: true });
  }, true);

  const turf = look.turf;
  if (turf) {
    const G = shades(turf.color);
    const tp = blob(rand, turf.x ?? 0, (turf.y ?? 0) - THICK, turf.rx, turf.ry, { points: 18, jitter: 0.07, lobes: 5, lobeAmp: 0.1 });
    shape(ctx, tp, { fill: linearGradient(ctx, -turf.rx, -turf.ry, turf.rx, turf.ry, [G.highlight, G.light, G.base, G.shade]), stroke: rgba(G.deep, 0.85), width: 1.2 * u, smooth: true });
    for (let i = 0; i < 7; i++) {
      const x = (turf.x ?? 0) + rand.range(-0.8, 0.8) * turf.rx;
      const y = (turf.y ?? 0) - THICK + rand.range(-0.6, 0.6) * turf.ry;
      line(ctx, [[x, y], [x + rand.range(-1, 1), y - rand.range(1.5, 3)]], G.highlight, 0.8 * u);
    }
  }

  // Everything standing on the island, back to front.
  const items: Array<{ y: number; draw: () => void }> = [];
  for (const p of look.palms ?? []) {
    items.push({
      y: p.y,
      draw: () => {
        softBlob(ctx, p.x + p.w * 0.3, p.y - THICK + 0.8, p.w * 0.55, p.w * 0.14, '#2a2015', 0.3);
        drawPalm(ctx, { cx: p.x, baseY: p.y - THICK, w: p.w, h: p.h, leaf: '#4f9a4a', ink, rand, shadow: false, lean: p.lean ?? 0.08 });
      },
    });
  }
  for (const q of look.props ?? []) items.push({ y: q.y, draw: () => prop(pen, q.kind, q.x, q.y - THICK, q.s ?? 1) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();

  for (const r of [...(look.rocks ?? [])].sort((a, b) => a.y - b.y)) paintRock(pen, r);
  // A few scraps of foam on the beach, to tie it to the sea.
  ctx.save();
  ctx.globalAlpha = 0.7;
  for (let i = 0; i < 4; i++) {
    const a = rand.range(0.2, 0.8) * Math.PI;
    dot(ctx, Math.cos(a) * rx * 1.06, Math.sin(a) * ry * 1.06 + 1.5, rand.range(0.6, 1.2), FOAM);
  }
  ctx.restore();
}
