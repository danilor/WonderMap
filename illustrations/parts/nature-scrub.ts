import { rgba } from '../kit/colors';
import { ellipse, line, linearGradient, radialGradient, shape, softBlob } from '../kit/draw';
import { TAU } from '../kit/math';
import { blob } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { INK, quadPts } from './nature-common';

export const TUMBLE = {
  tan: { light: '#e8d196', base: '#c39e5c', shade: '#8b6b3a', deep: '#4a3720' },
  gray: { light: '#ded3bb', base: '#b3a487', shade: '#7e715a', deep: '#41362a' },
  green: { light: '#bccb8c', base: '#8f9e58', shade: '#617039', deep: '#343b20' },
} as const;

export type TumbleTone = keyof typeof TUMBLE;

export interface TumbleOptions {
  cx: number;
  /** Centre of the ball when it rests on the ground. */
  cy: number;
  r: number;
  tone?: TumbleTone;
  rand: Rng;
  /** Height above the ground for a ball in mid-bounce. */
  lift?: number;
}

/** A ball of tangled dry twigs: dark core, scribbled strands, lit from the top-left. */
export function drawTumbleweed(ctx: Ctx2D, o: TumbleOptions): void {
  const { rand, cx, r } = o;
  const pal = TUMBLE[o.tone ?? 'tan'];
  const lift = o.lift ?? 0;
  const by = o.cy - lift;
  const k = Math.max(0.7, r / 10);

  softBlob(ctx, cx + r * 0.3, o.cy + r * 0.92, r * 1.15, r * 0.3, '#1d160c', Math.max(0.12, 0.34 - lift * 0.012));

  shape(ctx, blob(rand, cx, by, r * 0.94, r * 0.9, { points: 13, jitter: 0.06 }), {
    fill: radialGradient(ctx, cx, by, 0, r * 1.1, [[0, pal.shade], [1, pal.deep]], cx - r * 0.3, by - r * 0.35),
    smooth: true,
  });

  const chord = (): { pts: Vec2[]; lit: number } => {
    const a0 = rand.range(0, TAU);
    const sweep = rand.range(1.2, 3.0);
    const p0: Vec2 = [cx + Math.cos(a0) * r * rand.range(0.82, 1), by + Math.sin(a0) * r * rand.range(0.82, 1)];
    const p1: Vec2 = [cx + Math.cos(a0 + sweep) * r * rand.range(0.82, 1), by + Math.sin(a0 + sweep) * r * rand.range(0.82, 1)];
    const m = a0 + sweep / 2;
    const rc = r * rand.range(-0.2, 1.1);
    const ctl: Vec2 = [cx + Math.cos(m) * rc, by + Math.sin(m) * rc];
    const pts = quadPts(p0, ctl, p1, 8);
    const mid = pts[4]!;
    return { pts, lit: ((mid[0] - cx) * -0.7 + (mid[1] - by) * -0.7) / r };
  };

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 12; i++) line(ctx, chord().pts, rgba(pal.deep, 0.9), 0.9 * k, { smooth: true });
  for (let i = 0; i < 30; i++) {
    const c = chord();
    line(ctx, c.pts, c.lit > 0.35 ? pal.light : c.lit > -0.15 ? pal.base : pal.shade, rand.range(0.9, 1.5) * k, { smooth: true });
  }
  ctx.restore();

  // Roundness: darker lower right, clipped to the ball.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, by, r * 0.96, 0, TAU);
  ctx.clip();
  ctx.fillStyle = radialGradient(ctx, cx, by, 0, r * 1.15, [[0, rgba(pal.deep, 0)], [0.5, rgba(pal.deep, 0)], [1, rgba(pal.deep, 0.55)]], cx - r * 0.4, by - r * 0.45);
  ctx.fillRect(cx - r, by - r, r * 2, r * 2);
  ctx.restore();

  for (let i = 0; i < 4; i++) {
    const a = rand.range(Math.PI * 1.05, Math.PI * 1.65);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, by, r * rand.range(0.55, 0.85), a, a + rand.range(0.3, 0.6));
    ctx.strokeStyle = rgba(pal.light, 0.9);
    ctx.lineWidth = 1 * k;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  // Scribbled outline and twigs sticking out.
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  for (let i = 0; i < 9; i++) {
    const a = rand.range(0, TAU);
    ctx.lineWidth = rand.range(1, 1.5) * k;
    ctx.beginPath();
    ctx.arc(cx + rand.range(-0.4, 0.4), by + rand.range(-0.4, 0.4), r * rand.range(0.93, 1.04), a, a + rand.range(0.5, 1.1));
    ctx.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const a = rand.range(0, TAU);
    const len = rand.range(1.5, 3.6) * k;
    const bend = rand.range(-0.5, 0.5);
    const x0 = cx + Math.cos(a) * r * 0.97;
    const y0 = by + Math.sin(a) * r * 0.97;
    ctx.lineWidth = 1 * k;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(x0 + Math.cos(a + bend) * len * 0.6, y0 + Math.sin(a + bend) * len * 0.6, x0 + Math.cos(a + bend * 1.6) * len, y0 + Math.sin(a + bend * 1.6) * len);
    ctx.stroke();
  }
  ctx.restore();
}

/** A vulture hunched on a perch, facing left. `x,y` is where its feet touch the branch. */
export function drawVulture(ctx: Ctx2D, x: number, y: number, s: number): void {
  const P = (px: number, py: number): Vec2 => [x + px * s, y + py * s];
  const iw = Math.max(0.8, s * 0.8);
  const dark = '#3a2d24';

  line(ctx, [P(-0.2, -2.6), P(-0.4, 0)], INK, 1.5 * s, { cap: 'round' });
  line(ctx, [P(1.9, -2.6), P(2.1, 0)], INK, 1.5 * s, { cap: 'round' });
  line(ctx, [P(-0.2, -2.6), P(-0.4, 0)], '#7a6350', 0.8 * s, { cap: 'round' });
  line(ctx, [P(1.9, -2.6), P(2.1, 0)], '#7a6350', 0.8 * s, { cap: 'round' });

  shape(ctx, [P(5.2, -5.6), P(9.8, -1.8), P(8.4, -0.2), P(4.2, -3)], { fill: dark, stroke: INK, width: iw, smooth: false });

  const [bx, by] = P(2.6, -5);
  ellipse(ctx, bx, by, 5 * s, 3.4 * s, {
    fill: linearGradient(ctx, bx - 5 * s, by - 3 * s, bx + 5 * s, by + 4 * s, [[0, '#6d5543'], [1, '#2d231a']]),
    stroke: INK,
    width: iw,
    rotation: 0.3,
  });
  const [wx, wy] = P(3.3, -5.1);
  ellipse(ctx, wx, wy, 4 * s, 2.1 * s, { fill: '#3b2d22', stroke: INK, width: iw * 0.8, rotation: 0.42 });
  for (let i = 0; i < 3; i++) line(ctx, [P(2.6 + i * 1.6, -4.1 + i * 0.5), P(3.6 + i * 1.6, -3.5 + i * 0.5)], rgba('#a78a6a', 0.7), 0.6 * s, { cap: 'round' });

  line(ctx, [P(-1.6, -8.1), P(-3.2, -10.2)], INK, 2.7 * s, { cap: 'round' });
  line(ctx, [P(-1.6, -8.1), P(-3.2, -10.2)], '#cf8a72', 1.5 * s, { cap: 'round' });
  const [rx, ry] = P(-1.3, -7.4);
  ellipse(ctx, rx, ry, 2.4 * s, 1.7 * s, { fill: '#efe5cc', stroke: INK, width: iw, rotation: -0.3 });
  const [hx, hy] = P(-3.7, -10.8);
  ellipse(ctx, hx, hy, 1.6 * s, 1.5 * s, { fill: '#d9806a', stroke: INK, width: iw });
  shape(ctx, [P(-5, -11.1), P(-7.3, -10.1), P(-5.1, -9.6)], { fill: '#efe0b0', stroke: INK, width: iw * 0.9, smooth: false });
  const [ex, ey] = P(-4.2, -11.2);
  ellipse(ctx, ex, ey, 0.4 * s, 0.4 * s, { fill: '#1a120c' });
}
