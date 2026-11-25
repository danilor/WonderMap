import { mix, rgba } from '../kit/colors';
import { ellipse, line, linearGradient, softBlob, taper } from '../kit/draw';
import { TAU } from '../kit/math';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { INK, litOffset, quadPts } from './nature-common';

/* ------------------------------------------------------------------------------------ */
/* Reeds and cattails                                                                   */
/* ------------------------------------------------------------------------------------ */

export interface ReedPalette {
  dark: string;
  base: string;
  light: string;
}

export const REED = {
  green: { dark: '#3c5a2b', base: '#6a8f3d', light: '#a4c466' },
  dry: { dark: '#6b5a2a', base: '#a58f48', light: '#dcc884' },
} as const satisfies Record<string, ReedPalette>;

export interface ReedsOptions {
  cx: number;
  baseY: number;
  /** Spread of the tips. */
  w: number;
  /** Height of the tallest stem. */
  h: number;
  blades: number;
  cattails: number;
  pal: ReedPalette;
  rand: Rng;
  /** Wind lean as a fraction of the stem length. */
  lean?: number;
  shadow?: boolean;
}

interface ReedStem {
  x0: number;
  x1: number;
  len: number;
  depth: number;
  bend: number;
}

/** A clump of long reed blades with brown cattail heads on the tallest stems. */
export function drawReeds(ctx: Ctx2D, o: ReedsOptions): void {
  const { rand, cx, baseY, w, h, pal } = o;
  const lean = o.lean ?? 0;
  if (o.shadow !== false) softBlob(ctx, cx + w * 0.08, baseY, w * 0.5, 2.6, '#1d160c', 0.32);

  const blades: ReedStem[] = [];
  for (let i = 0; i < o.blades; i++) {
    const f = (i + 0.5) / o.blades - 0.5 + rand.range(-0.06, 0.06);
    const len = h * rand.range(0.5, 0.8) * (1 - Math.abs(f) * 0.3);
    blades.push({ x0: cx + f * w * 0.5, x1: cx + f * w + lean * len, len, depth: rand.next(), bend: rand.range(-3.5, 3.5) });
  }
  blades.sort((a, b) => a.depth - b.depth);
  for (const s of blades) {
    const pts = quadPts([s.x0, baseY], [(s.x0 + s.x1) / 2 + s.bend, baseY - s.len * 0.55], [s.x1, baseY - s.len], 7);
    taper(ctx, pts, 4.4, 1.3, INK);
    taper(ctx, pts, 2.7, 0.3, mix(pal.dark, pal.base, s.depth));
    taper(ctx, litOffset(pts, 0.5), 0.9, 0.15, rgba(pal.light, 0.9));
  }

  const tails: ReedStem[] = [];
  for (let i = 0; i < o.cattails; i++) {
    const f = (i + 0.5) / o.cattails - 0.5 + rand.range(-0.08, 0.08);
    const len = h * rand.range(0.84, 1) * (1 - Math.abs(f) * 0.2);
    tails.push({ x0: cx + f * w * 0.42, x1: cx + f * w * 0.8 + lean * len, len, depth: rand.next(), bend: rand.range(-2.5, 2.5) });
  }
  tails.sort((a, b) => Math.abs(b.x1 - cx) - Math.abs(a.x1 - cx));
  const hl = Math.min(11, Math.max(7, h * 0.2));
  for (const s of tails) {
    const c: Vec2 = [(s.x0 + s.x1) / 2 + s.bend, baseY - s.len * 0.5];
    const tip: Vec2 = [s.x1, baseY - s.len];
    const pts = quadPts([s.x0, baseY], c, tip, 8);
    taper(ctx, pts, 3.6, 2.6, INK);
    taper(ctx, pts, 1.9, 1.2, mix(pal.base, pal.dark, 0.35));
    const dl = Math.hypot(tip[0] - c[0], tip[1] - c[1]) || 1;
    const d: Vec2 = [(tip[0] - c[0]) / dl, (tip[1] - c[1]) / dl];
    const mid: Vec2 = [tip[0] - d[0] * hl * 0.5, tip[1] - d[1] * hl * 0.5];
    const ang = Math.atan2(d[0], -d[1]);
    const rx = hl * 0.22;
    const ry = hl * 0.5;
    const spike: Vec2[] = [tip, [tip[0] + d[0] * 4, tip[1] + d[1] * 4]];
    line(ctx, spike, INK, 2.4, { cap: 'round' });
    line(ctx, spike, '#c2a561', 1, { cap: 'round' });
    ellipse(ctx, mid[0], mid[1], rx + 0.9, ry + 0.9, { fill: INK, rotation: ang });
    ellipse(ctx, mid[0], mid[1], rx, ry, {
      fill: linearGradient(ctx, mid[0] - rx, mid[1], mid[0] + rx, mid[1], ['#b07d4e', '#764d2c', '#3f2817']),
      rotation: ang,
    });
    ellipse(ctx, mid[0] - rx * 0.35, mid[1] - ry * 0.25, rx * 0.22, ry * 0.5, { fill: rgba('#e8c08a', 0.55), rotation: ang });
  }
}

/* ------------------------------------------------------------------------------------ */
/* Will-o'-the-wisps and mist                                                           */
/* ------------------------------------------------------------------------------------ */

export interface WispPalette {
  core: string;
  mid: string;
  glow: string;
  deep: string;
}

export const WISP = {
  cyan: { core: '#f2fffb', mid: '#98f5e4', glow: '#3ad6bd', deep: '#1c8a8a' },
  green: { core: '#f8ffe2', mid: '#c8f35e', glow: '#84d333', deep: '#3f8a22' },
  amber: { core: '#fffbe6', mid: '#ffd978', glow: '#ffa73a', deep: '#a8581c' },
} as const satisfies Record<string, WispPalette>;

/** A soft radial glow. */
export function glow(ctx: Ctx2D, x: number, y: number, r: number, color: string, alpha: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.45, rgba(color, alpha * 0.4));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

export interface WispOptions {
  cx: number;
  cy: number;
  r: number;
  pal: WispPalette;
  /** Length of the flame tail above the orb, in radii. */
  flame?: number;
  rand: Rng;
}

/** A glowing orb with a flickering flame and a few drifting sparks. */
export function drawWisp(ctx: Ctx2D, o: WispOptions): void {
  const { cx, cy, r, pal, rand } = o;
  glow(ctx, cx, cy, r * 3.4, pal.glow, 0.5);
  const fl = o.flame ?? 1.8;
  const lean = rand.range(-0.5, 0.5) * r;
  const flame: Vec2[] = [
    [cx - r * 0.82, cy + r * 0.1],
    [cx - r * 0.7, cy - r * 0.7],
    [cx + lean * 0.4, cy - r * (0.9 + fl * 0.55)],
    [cx + lean, cy - r * (1 + fl)],
    [cx + r * 0.2 + lean * 0.6, cy - r * (0.9 + fl * 0.45)],
    [cx + r * 0.78, cy - r * 0.6],
    [cx + r * 0.82, cy + r * 0.1],
  ];
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(flame[0]![0], flame[0]![1]);
  for (let i = 1; i < flame.length - 1; i++) {
    const p = flame[i]!;
    const q = flame[i + 1]!;
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  ctx.lineTo(flame[flame.length - 1]![0], flame[flame.length - 1]![1]);
  ctx.closePath();
  ctx.fillStyle = linearGradient(ctx, cx, cy - r * (1 + fl), cx, cy + r * 0.2, [rgba(pal.glow, 0.15), rgba(pal.mid, 0.75), rgba(pal.core, 0.95)]);
  ctx.fill();
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = rgba(pal.deep, 0.65);
  ctx.stroke();
  ctx.restore();

  ellipse(ctx, cx, cy, r, r * 0.95, { fill: INK, alpha: 0.5 });
  ellipse(ctx, cx, cy, r * 0.92, r * 0.88, {
    fill: (() => {
      const g = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.25, 0, cx, cy, r * 0.95);
      g.addColorStop(0, pal.core);
      g.addColorStop(0.5, pal.mid);
      g.addColorStop(1, pal.glow);
      return g;
    })(),
  });
  for (let i = 0; i < 3; i++) {
    const a = rand.range(0, TAU);
    const d = r * rand.range(1.5, 2.6);
    ellipse(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8 - r * 0.4, r * 0.14, r * 0.14, { fill: pal.core, alpha: 0.85 });
  }
}

export interface MistOptions {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  puffs: number;
  color: string;
  alpha: number;
  rand: Rng;
}

/** A low bank of drifting mist: overlapping soft puffs with a few thin curls on top. */
export function drawMist(ctx: Ctx2D, o: MistOptions): void {
  const { rand, cx, cy, rx, ry } = o;
  for (let i = 0; i < o.puffs; i++) {
    const t = o.puffs === 1 ? 0.5 : i / (o.puffs - 1);
    const x = cx + (t - 0.5) * rx * 1.5 + rand.range(-rx * 0.08, rx * 0.08);
    const y = cy + Math.sin(t * Math.PI * 2 + rand.range(-0.5, 0.5)) * ry * 0.4 + rand.range(-ry * 0.15, ry * 0.15);
    const r = rx * rand.range(0.34, 0.5);
    const a = o.alpha * rand.range(0.8, 1.1);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, (ry / rx) * 1.6);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, rgba(o.color, a));
    g.addColorStop(0.55, rgba(o.color, a * 0.6));
    g.addColorStop(1, rgba(o.color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  for (let i = 0; i < 2; i++) {
    const y = cy + (i - 0.5) * ry * 0.9 + rand.range(-1.5, 1.5);
    const x0 = cx - rx * rand.range(0.4, 0.7);
    const x1 = cx + rx * rand.range(0.3, 0.7);
    const pts = quadPts([x0, y + rand.range(-2, 2)], [(x0 + x1) / 2, y + rand.range(-7, 7)], [x1, y + rand.range(-2, 2)], 10);
    line(ctx, pts, rgba(o.color, o.alpha * 0.55), 0.9, { smooth: true, cap: 'round' });
  }
}
