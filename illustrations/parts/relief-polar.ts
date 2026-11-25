import { rgba } from '../kit/colors';
import { clipped, ellipse, linearGradient, shape, softBlob, taper } from '../kit/draw';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { COOL_INK, shifted } from './relief-common';
import { drawIcicles, sparkle } from './relief-ice';

/** Half-dome silhouette: the arc over the top plus a slightly bowed front edge. */
function domeOutline(rand: Rng, cx: number, baseY: number, rx: number, ry: number): Vec2[] {
  const pts: Vec2[] = [];
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI - (i / n) * Math.PI;
    const j = i === 0 || i === n ? 0 : rand.range(-0.02, 0.02);
    pts.push([cx + Math.cos(a) * rx * (1 + j), baseY - Math.sin(a) * ry * (1 + j)]);
  }
  for (let i = 1; i < 5; i++) {
    const t = 1 - i / 5;
    pts.push([cx + (t * 2 - 1) * rx, baseY + Math.sin(t * Math.PI) * ry * 0.12]);
  }
  return pts;
}

/** Rings of snow blocks around a dome: bowed courses with staggered joints. */
function blockCourses(ctx: Ctx2D, cx: number, baseY: number, rx: number, ry: number, rows: number): void {
  const course = (j: number): { hw: number; y: number; bow: number } => {
    const f = j / (rows + 0.6);
    const hw = rx * Math.sqrt(Math.max(0, 1 - f * f));
    return { hw, y: baseY - ry * f, bow: hw * 0.16 };
  };
  for (let j = 0; j <= rows; j++) {
    const c = course(j);
    if (j > 0) {
      const arc: Vec2[] = [];
      for (let k = 0; k <= 10; k++) {
        const u = -1 + k / 5;
        arc.push([cx + u * c.hw, c.y + c.bow * (1 - u * u)]);
      }
      shape(ctx, arc, { stroke: rgba('#5f7fae', 0.8), width: 0.9, closed: false, smooth: true });
    }
    if (j === rows) continue;
    const next = course(j + 1);
    const n = Math.max(2, Math.round((c.hw * 2) / 7));
    for (let k = 0; k < n; k++) {
      const u = -1 + ((k + 0.5 + (j % 2) * 0.5) / n) * 2;
      if (Math.abs(u) > 0.96) continue;
      shape(ctx, [[cx + u * c.hw, c.y + c.bow * (1 - u * u)], [cx + u * next.hw, next.y + next.bow * (1 - u * u)]], { stroke: rgba('#5f7fae', 0.65), width: 0.8, closed: false });
    }
  }
}

export interface IglooOptions {
  cx: number;
  baseY: number;
  w: number;
  h: number;
  rand: Rng;
  ink?: string;
  /** Side the entrance tunnel points to; 0 for none. */
  door?: -1 | 0 | 1;
  /** Warm light in the doorway. */
  lit?: boolean;
}

/** A dome of packed snow blocks with a low entrance tunnel. */
export function drawIgloo(ctx: Ctx2D, o: IglooOptions): void {
  const { rand, cx, baseY, w, h } = o;
  const ink = o.ink ?? COOL_INK;
  const rx = w / 2;
  const door = o.door ?? 1;
  const paintDome = (x: number, y: number, r: number, hh: number, rows: number): void => {
    const body = domeOutline(rand, x, y, r, hh);
    shape(ctx, body, { fill: linearGradient(ctx, x - r, y - hh, x + r * 0.9, y, ['#ffffff', '#eaf2fb', '#bdd0e8']), smooth: true });
    clipped(ctx, body, () => {
      blockCourses(ctx, x, y, r, hh, rows);
      shape(ctx, body, { fill: linearGradient(ctx, x - r * 0.1, y - hh, x + r, y, [rgba('#ffffff', 0), rgba('#3d5f9a', 0.4)]) });
      softBlob(ctx, x - r * 0.38, y - hh * 0.66, r * 0.34, hh * 0.28, '#ffffff', 0.9);
    }, true);
    shape(ctx, body, { stroke: ink, width: 1.4, smooth: true });
  };

  softBlob(ctx, cx + rx * 0.2, baseY + 2, rx * 1.2, 4, '#2a3a6a', 0.35);
  paintDome(cx, baseY, rx, h, 4);
  if (door !== 0) {
    const tx = cx + door * rx * 0.64;
    const trx = rx * 0.38;
    const try_ = h * 0.5;
    const ty = baseY + h * 0.08;
    softBlob(ctx, tx, ty + 2, trx * 1.1, 3, '#2a3a6a', 0.35);
    paintDome(tx, ty, trx, try_, 2);
    const dw = trx * 0.56;
    const dh = try_ * 0.74;
    const arch: Vec2[] = [];
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI - (i / 10) * Math.PI;
      arch.push([tx + Math.cos(a) * dw, ty - Math.sin(a) * dh]);
    }
    shape(ctx, arch, { fill: o.lit ? linearGradient(ctx, tx, ty - dh, tx, ty, ['#ffd27a', '#ff9a3c', '#8a3a1a']) : '#1d2a45', stroke: ink, width: 1.1, smooth: true });
    if (o.lit) softBlob(ctx, tx, ty + 1, trx * 1.1, 3, '#ffb347', 0.5);
  }
  softBlob(ctx, cx - rx * 0.1, baseY + 2, rx * 0.9, 2.4, '#ffffff', 0.55);
}

export interface FrostTreeOptions {
  cx: number;
  baseY: number;
  h: number;
  rand: Rng;
  ink?: string;
  /** Sideways bend of the trunk, -1..1. */
  lean?: number;
  /** Branching depth (1..3). */
  depth?: number;
  /** A snapped-off trunk instead of a whole tree. */
  stump?: boolean;
  /** Horizontal limits the crown is squeezed into (the trunk stays put). */
  xMin?: number;
  xMax?: number;
}

interface Limb {
  pts: Vec2[];
  w0: number;
  w1: number;
  level: number;
}

/** A bare, dead tree with snow along its branches, a few icicles and a drift at the roots. */
export function drawFrostTree(ctx: Ctx2D, o: FrostTreeOptions): void {
  const { rand, cx, baseY, h } = o;
  const ink = o.ink ?? COOL_INK;
  const limbs: Limb[] = [];
  const grow = (x: number, y: number, ang: number, len: number, w: number, depth: number, level: number): void => {
    const bend = rand.range(-0.35, 0.35);
    const mx = x + Math.cos(ang + bend * 0.5) * len * 0.5;
    const my = y + Math.sin(ang + bend * 0.5) * len * 0.5;
    const ex = x + Math.cos(ang + bend) * len;
    const ey = y + Math.sin(ang + bend) * len;
    limbs.push({ pts: [[x, y], [mx, my], [ex, ey]], w0: w, w1: Math.max(0.5, w * 0.55), level });
    if (depth <= 0) return;
    const kids = depth > 1 ? rand.int(2, 3) : 2;
    for (let i = 0; i < kids; i++) {
      const spread = (i - (kids - 1) / 2) * rand.range(0.55, 0.85);
      grow(ex, ey, ang + bend + spread, len * rand.range(0.6, 0.78), w * 0.55, depth - 1, level + 1);
    }
    if (depth > 1 && rand.chance(0.7)) grow(mx, my, ang + bend * 0.5 + rand.sign() * rand.range(0.7, 1.1), len * rand.range(0.35, 0.5), w * 0.4, depth - 2, level + 1);
  };
  const stump = o.stump === true;
  grow(cx, baseY, -Math.PI / 2 + (o.lean ?? 0) * 0.35, h * (stump ? 0.42 : 0.34), h * (stump ? 0.13 : 0.092), stump ? 0 : (o.depth ?? 3), 0);
  if (!stump && (o.xMin !== undefined || o.xMax !== undefined)) {
    let lo = cx;
    let hi = cx;
    limbs.forEach((l) => l.pts.forEach((p) => {
      lo = Math.min(lo, p[0] - l.w0);
      hi = Math.max(hi, p[0] + l.w0);
    }));
    const sl = o.xMin !== undefined && lo < o.xMin ? (cx - o.xMin) / (cx - lo) : 1;
    const sr = o.xMax !== undefined && hi > o.xMax ? (o.xMax - cx) / (hi - cx) : 1;
    limbs.forEach((l) => {
      l.pts = l.pts.map((p): Vec2 => [cx + (p[0] - cx) * (p[0] < cx ? sl : sr), p[1]]);
    });
  }

  softBlob(ctx, cx + 2, baseY + 1.5, h * 0.24, 3.2, '#2a3a6a', 0.35);
  const drawn = stump ? [] : limbs;
  drawn.forEach((l) => taper(ctx, l.pts, l.w0 + 1.6, l.w1 + 1.4, ink));
  drawn.forEach((l) => taper(ctx, l.pts, l.w0, l.w1, '#6f6358'));
  drawn.forEach((l) => {
    shape(ctx, shifted(l.pts, -l.w0 * 0.22, 0), { stroke: rgba('#c9bcae', 0.7), width: Math.max(0.5, l.w0 * 0.28), closed: false, smooth: true });
    const a = l.pts[0]!;
    const c = l.pts[2]!;
    if (Math.abs(c[1] - a[1]) < Math.abs(c[0] - a[0]) * 1.7) {
      shape(ctx, shifted(l.pts, 0, -l.w0 * 0.5 - 0.3), { stroke: '#ffffff', width: Math.max(0.9, l.w0 * 0.6), closed: false, smooth: true });
    }
  });
  const hangers = limbs.filter((l) => l.level > 0 && l.level < 3 && Math.abs(l.pts[2]![1] - l.pts[0]![1]) < Math.abs(l.pts[2]![0] - l.pts[0]![0]) * 0.8);
  hangers.slice(0, 3).forEach((l) => drawIcicles(ctx, rand, l.pts, 2, Math.max(3, h * 0.1), ink));
  const top = limbs[0]!.pts[2]!;
  if (stump) {
    // snapped trunk: flared foot, jagged splintered top and a ragged snow cap
    const bw = h * 0.21;
    const tw = h * 0.13;
    const topY = baseY - h * 0.4;
    const tops: Vec2[] = [];
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      tops.push([cx - tw + tw * 2 * t, topY - (i % 2 === 1 ? rand.range(3, 8) : rand.range(-1, 2)) - Math.sin(t * Math.PI) * 1.5]);
    }
    const body: Vec2[] = [[cx - bw, baseY], [cx - bw * 0.68, baseY - h * 0.2], ...tops, [cx + bw * 0.7, baseY - h * 0.18], [cx + bw, baseY]];
    shape(ctx, body, { fill: linearGradient(ctx, cx - bw, 0, cx + bw, 0, ['#9a8878', '#6f6358', '#4a4039']), stroke: ink, width: 1.2 });
    for (let i = 0; i < 3; i++) {
      const x = cx - tw * 0.8 + i * tw * 0.8 + rand.range(-1, 1);
      shape(ctx, [[x, topY + 3], [x + rand.range(-1, 1), baseY - h * 0.14]], { stroke: rgba(ink, 0.45), width: 0.8, closed: false });
    }
    const cap: Vec2[] = [...tops.map((p): Vec2 => [p[0], p[1] - 1.6]), ...tops.slice().reverse().map((p): Vec2 => [p[0], p[1] + 2.4 + rand.range(0, 2.4)])];
    shape(ctx, cap, { fill: '#ffffff', stroke: rgba(ink, 0.75), width: 0.9 });
  }
  const m = h * 0.17;
  ellipse(ctx, cx, baseY - 0.5, m, m * 0.38, { fill: linearGradient(ctx, cx - m, baseY - m * 0.4, cx + m, baseY + m * 0.4, ['#ffffff', '#e4eef9', '#bdd0e8']), stroke: rgba(ink, 0.65), width: 0.9 });
  sparkle(ctx, top[0] - h * 0.12, top[1] + h * 0.1, Math.max(1.6, h * 0.04));
}
