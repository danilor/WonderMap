import { rgba } from '../kit/colors';
import { ellipse, line, radialGradient, shape } from '../kit/draw';
import { TAU, lerp } from '../kit/math';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';

/** Things that float above the map: soft clouds and flocks of birds, each with a faint shadow on the ground below. */

/* ------------------------------------------------------------------------------------ */
/* Clouds                                                                               */
/* ------------------------------------------------------------------------------------ */

/** x, y, rx, ry, rotation */
type Puff = readonly [x: number, y: number, rx: number, ry: number, rot?: number];

export interface CloudTone {
  light: string;
  base: string;
  shade: string;
  line: string;
}

export const SKY: CloudTone = { light: '#ffffff', base: '#f7faff', shade: '#c9d7ec', line: '#9fb2cc' };
export const STORM: CloudTone = { light: '#e3e8f1', base: '#bac3d3', shade: '#7c8aa4', line: '#55627a' };

export type CloudKind = 'cumulus' | 'twin' | 'streak' | 'wisp' | 'heavy';

/** A heap of puffs: a scalloped row along the bottom, a mid row and a few big round tops over them. */
function dome(rand: Rng, cx: number, base: number, rx: number, height: number, n: number, rMin: number, rMax: number): Puff[] {
  const out: Puff[] = [];
  const m = Math.max(3, Math.round(rx / 15));
  for (let i = 0; i < m; i++) {
    const r = rMin * rand.range(0.85, 1.12);
    out.push([cx + ((i / (m - 1)) * 2 - 1) * rx * 0.92, base + rand.range(-2, 2), r * 1.05, r * 0.82]);
  }
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const s = Math.sin(Math.PI * t);
    const r = (rMin + (rMax - rMin) * s) * rand.range(0.9, 1.1);
    out.push([cx + (t * 2 - 1) * rx * 0.86, base - s * height * rand.range(0.6, 1) - r * 0.25, r, r * 0.92]);
  }
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const s = Math.sin(Math.PI * t);
    const r = (rMin + (rMax - rMin) * s) * 0.82 * rand.range(0.9, 1.1);
    out.push([cx + (t * 2 - 1) * rx * 0.86, base - s * height * 0.36, r, r * 0.9]);
  }
  return out;
}

function puffsFor(rand: Rng, kind: CloudKind, w: number): Puff[] {
  const mid = w / 2 - 8;
  switch (kind) {
    case 'cumulus':
      return dome(rand, mid, 82, 74, 38, 6, 17, 30);
    case 'twin':
      return [...dome(rand, mid - 36, 66, 46, 26, 4, 13, 21), ...dome(rand, mid + 40, 88, 50, 30, 4, 14, 23)];
    case 'streak': {
      const out: Puff[] = [[mid, 66, 80, 15]];
      for (let i = 0; i < 9; i++) {
        const t = i / 8;
        out.push([mid - 68 + t * 136, 62 - Math.sin(Math.PI * t) * rand.range(4, 14), rand.range(11, 17), rand.range(9, 13)]);
      }
      return out;
    }
    case 'wisp': {
      const out: Puff[] = [];
      for (let i = 0; i < 6; i++) {
        const t = i / 5;
        out.push([mid - 56 + t * 112 + rand.range(-4, 4), 70 - t * 28 + rand.range(-6, 6), rand.range(18, 32), rand.range(3.2, 5.4), -0.28 + rand.range(-0.1, 0.1)]);
      }
      return out;
    }
    case 'heavy':
      return [...dome(rand, mid, 90, 80, 44, 7, 20, 34), [mid - 30, 62, 26, 22], [mid + 28, 56, 30, 26]];
  }
}

function tracePuff(ctx: Ctx2D, p: Puff, dx = 0, dy = 0): void {
  ctx.save();
  ctx.translate(p[0] + dx, p[1] + dy);
  ctx.rotate(p[4] ?? 0);
  ctx.ellipse(0, 0, p[2], p[3], 0, 0, TAU);
  ctx.restore();
}

export function drawCloud(ctx: Ctx2D, rand: Rng, w: number, kind: CloudKind, tone: CloudTone): void {
  const puffs = puffsFor(rand, kind, w).sort((a, b) => a[1] - b[1]);
  const thin = kind === 'wisp';
  const alpha = thin ? 0.72 : 0.94;

  // Shadow on the ground: the same silhouette, pushed down and right.
  ctx.save();
  ctx.fillStyle = rgba('#1c2b3d', thin ? 0.1 : 0.17);
  for (const p of puffs) {
    ctx.beginPath();
    tracePuff(ctx, p, 12, 20);
    ctx.fill();
  }
  ctx.restore();

  for (const p of puffs) {
    const rx = p[2];
    const ry = p[3];
    ctx.save();
    ctx.translate(p[0], p[1]);
    ctx.rotate(p[4] ?? 0);
    ctx.scale(1, ry / rx);
    const g = thin
      ? radialGradient(ctx, 0, 0, 0, rx, [[0, rgba(tone.light, 0.85)], [0.6, rgba(tone.light, 0.45)], [1, rgba(tone.base, 0)]])
      : radialGradient(ctx, 0, 0, 0, rx, [[0, rgba(tone.light, alpha)], [0.5, rgba(tone.base, alpha)], [1, rgba(tone.shade, alpha)]], -rx * 0.34, -rx * 0.42);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, TAU);
    ctx.fill();
    if (!thin) {
      ctx.strokeStyle = rgba(tone.line, 0.22);
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
    ctx.restore();
  }
}

/* ------------------------------------------------------------------------------------ */
/* Birds                                                                                */
/* ------------------------------------------------------------------------------------ */

export interface BirdTone {
  body: string;
  wing: string;
  tip: string;
  ink: string;
}

export const GULL: BirdTone = { body: '#f4f1ea', wing: '#fbf8f1', tip: '#4a4f58', ink: '#2a2015' };
export const GOOSE: BirdTone = { body: '#9b8a74', wing: '#b8a78e', tip: '#4d4235', ink: '#2a2015' };
export const CROW: BirdTone = { body: '#2c2a30', wing: '#46444d', tip: '#1c1a1f', ink: '#14110e' };

/** One bird seen from above, heading along +x before rotation; `flap` -1..1 raises or drops the wing tips. */
function bird(ctx: Ctx2D, x: number, y: number, s: number, heading: number, flap: number, tone: BirdTone): void {
  const reach = lerp(0.8, 1.04, (flap + 1) / 2);
  const sweep = flap * 2.4;
  ctx.save();
  ctx.translate(x + 7 * s, y + 11 * s);
  ctx.rotate(heading);
  ctx.scale(s, s);
  shape(ctx, [[3, 0], [0, -13 * reach], [-8, -14 * reach], [-4, 0], [-8, 14 * reach], [0, 13 * reach]], { fill: rgba('#1c2b3d', 0.14), smooth: true });
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);
  ctx.scale(s, s);
  const k = 1 / s;
  for (const side of [-1, 1]) {
    const wing: Vec2[] = [
      [2.4, 0],
      [1.8, side * 5],
      [-0.5 + sweep * 0.2, side * 10 * reach],
      [-4.6 + sweep, side * 15 * reach],
      [-7.4 + sweep, side * 12 * reach],
      [-9 + sweep * 0.7, side * 8.6 * reach],
      [-7.4, side * 5.4],
      [-5.4, side * 2.6],
      [-3.2, 0],
    ];
    shape(ctx, wing, { fill: tone.wing, stroke: tone.ink, width: 1.15 * k, join: 'round' });
    shape(ctx, [wing[3]!, wing[4]!, wing[5]!, [-4.8 + sweep * 0.6, side * 10.4 * reach], [-2.6 + sweep * 0.3, side * 11.6 * reach]], { fill: rgba(tone.tip, 0.8) });
    line(ctx, [[0.4, side * 1.2], [-5 + sweep * 0.5, side * 8 * reach]], rgba(tone.ink, 0.35), 0.5 * k);
  }
  shape(ctx, [[-4.5, 0], [-11, -2.3], [-12.4, 0], [-11, 2.3]], { fill: tone.wing, stroke: tone.ink, width: 1 * k });
  ellipse(ctx, 0, 0, 5.8, 2.5, { fill: tone.body, stroke: tone.ink, width: 1.1 * k });
  ellipse(ctx, 6.4, 0, 1.9, 1.7, { fill: tone.body, stroke: tone.ink, width: 1 * k });
  shape(ctx, [[8, -0.9], [10.8, 0], [8, 0.9]], { fill: '#e0a23a', stroke: tone.ink, width: 0.6 * k });
  ctx.restore();
}

export type FlockKind = 'vee' | 'gulls' | 'crows' | 'pair';

export function drawFlock(ctx: Ctx2D, rand: Rng, w: number, h: number, kind: FlockKind): void {
  const cx = w / 2;
  const cy = h / 2;
  switch (kind) {
    case 'vee': {
      const a = -0.5;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      for (let i = 0; i < 5; i++) {
        const row = Math.ceil(i / 2);
        const side = i % 2 ? 1 : -1;
        const x = cx + 26 - dx * row * 15 - dy * side * row * 16 + rand.range(-1.5, 1.5);
        const y = cy - 16 - dy * row * 15 + dx * side * row * 16 + rand.range(-1.5, 1.5);
        bird(ctx, x, y, 1, a + rand.range(-0.06, 0.06), Math.sin(i * 1.7), GOOSE);
      }
      return;
    }
    case 'gulls': {
      const spots: ReadonlyArray<readonly [number, number, number]> = [[-34, -16, -0.5], [4, -26, 0.25], [30, -2, 0.9], [-6, 8, -1.1], [-38, 20, 2.4], [22, 28, 0.4]];
      spots.forEach(([dx, dy, a], i) => bird(ctx, cx + dx + rand.range(-2, 2), cy + dy + rand.range(-2, 2), rand.range(1.0, 1.25), a, Math.sin(i * 2.3 + 1), GULL));
      return;
    }
    case 'crows': {
      const spots: ReadonlyArray<readonly [number, number, number]> = [[-26, 8, -0.3], [-4, -8, -0.1], [20, -18, -0.3], [8, 14, -0.05], [34, 6, -0.2], [-12, -22, -0.4]];
      spots.forEach(([dx, dy, a], i) => bird(ctx, cx + dx + rand.range(-2, 2), cy + dy + rand.range(-2, 2), rand.range(0.9, 1.1), a + rand.range(-0.2, 0.2), Math.cos(i * 2.1), CROW));
      return;
    }
    case 'pair':
      bird(ctx, cx - 14, cy + 6, 1.5, -0.7, 0.6, GULL);
      bird(ctx, cx + 20, cy - 12, 1.3, -0.55, -0.4, GULL);
      return;
  }
}
