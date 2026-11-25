import { darken, lighten, rgba } from '../kit/colors';
import { ellipse, line, linearGradient, shape, softBlob, taper } from '../kit/draw';
import { bounds, lerp } from '../kit/math';
import { blob } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { INK, litOffset, quadPts } from './nature-common';

export interface SnagPalette {
  highlight: string;
  light: string;
  base: string;
  shade: string;
  deep: string;
  /** Freshly broken wood. */
  wood: string;
}

/** Wood colours for dead trees. */
export const SNAG_BARK = {
  bleached: { highlight: '#f0e6cc', light: '#dccdaa', base: '#b9a785', shade: '#8b7858', deep: '#584632', wood: '#efe3c4' },
  silver: { highlight: '#e8e0cf', light: '#cfc5b0', base: '#a69b86', shade: '#786e5d', deep: '#463d32', wood: '#efe6d0' },
  charred: { highlight: '#8a7566', light: '#6f5a4c', base: '#54433a', shade: '#3d2f28', deep: '#241a15', wood: '#b4895e' },
  umber: { highlight: '#c0996b', light: '#a67f57', base: '#86623f', shade: '#5f4430', deep: '#3a281b', wood: '#e2c796' },
  swamp: { highlight: '#a09d7e', light: '#85826a', base: '#6a6652', shade: '#4b4838', deep: '#2c2a20', wood: '#cbbf9b' },
} as const satisfies Record<string, SnagPalette>;

export interface SnagOptions {
  cx: number;
  baseY: number;
  /** Total height. */
  h: number;
  /** Trunk width at the foot. */
  w: number;
  bark: SnagPalette;
  rand: Rng;
  /** Sideways lean of the trunk top as a fraction of `h`. */
  lean?: number;
  /** Limbs fanning out from the top of the trunk. */
  limbs?: number;
  /** Near-horizontal limbs growing from the middle of the trunk. */
  sideLimbs?: number;
  /** Maximum angle of the outer limbs from vertical, in radians. */
  spread?: number;
  /** Limbs curve upwards (positive) or droop (negative). */
  up?: number;
  /** Fraction of `h` taken by the bare trunk. */
  trunkFrac?: number;
  /** Broken-off branch stumps on the trunk. */
  stubs?: number;
  roots?: number;
  hollow?: boolean;
  /** Moss colour: adds lumps on the lit side and hanging strands. */
  moss?: string;
  shadow?: boolean;
}

interface Piece {
  pts: Vec2[];
  w0: number;
  w1: number;
  cap?: boolean;
}

function limbPath(origin: Vec2, angle: number, len: number, up: number, rand: Rng, steps = 5): Vec2[] {
  const pts: Vec2[] = [origin];
  let a = angle;
  let x = origin[0];
  let y = origin[1];
  for (let i = 0; i < steps; i++) {
    a += (-Math.PI / 2 - a) * up + rand.range(-0.3, 0.3);
    x += (Math.cos(a) * len) / steps;
    y += (Math.sin(a) * len) / steps;
    pts.push([x, y]);
  }
  return pts;
}

function heading(pts: readonly Vec2[], i = pts.length - 1): number {
  const a = pts[Math.max(0, i - 1)]!;
  const b = pts[i]!;
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
}

/** A limb with side twigs, grown recursively. */
function bough(origin: Vec2, angle: number, len: number, w0: number, depth: number, up: number, rand: Rng, out: Piece[], tips: Vec2[]): void {
  const pts = limbPath(origin, angle, len, up, rand);
  out.push({ pts, w0, w1: Math.max(0.9, w0 * 0.3) });
  tips.push(pts[pts.length - 1]!);
  if (depth <= 0 || w0 < 1.8) return;
  const k = rand.int(2, 3);
  const side = rand.chance(0.5) ? 1 : -1;
  bough(pts[k]!, heading(pts, k + 1) + side * rand.range(0.5, 0.95), len * rand.range(0.38, 0.55), w0 * 0.5, depth - 1, up, rand, out, tips);
  if (depth >= 2 && rand.chance(0.7)) {
    bough(pts[1]!, heading(pts, 2) - side * rand.range(0.55, 1), len * rand.range(0.3, 0.45), w0 * 0.42, depth - 1, up, rand, out, tips);
  }
}

/** A gnarled dead tree with forking limbs. Returns the limb tips (useful for perching things). */
export function drawSnag(ctx: Ctx2D, o: SnagOptions): Vec2[] {
  const { rand, cx, baseY, h, w } = o;
  const ink = INK;
  const tones = o.bark;
  const inkW = Math.max(0.9, w * 0.08);
  const lean = o.lean ?? rand.range(-0.08, 0.08);
  const up = o.up ?? 0.2;
  const trunkH = h * (o.trunkFrac ?? 0.42);
  const sway = w * rand.range(0.15, 0.4) * (rand.chance(0.5) ? 1 : -1);
  const phase = rand.range(0, 1.5);

  const trunk: Vec2[] = [];
  for (let i = 0; i <= 7; i++) {
    const t = i / 7;
    trunk.push([cx + lean * h * t * t + sway * Math.sin((t + phase) * Math.PI * 1.3) * t, baseY - trunkH * t]);
  }
  const wTop = w * 0.52;
  const widthAt = (t: number): number => lerp(w, wTop, t);
  const at = (t: number): Vec2 => {
    const f = Math.min(Math.max(t, 0), 1) * (trunk.length - 1);
    const i = Math.min(trunk.length - 2, Math.floor(f));
    const a = trunk[i]!;
    const b = trunk[i + 1]!;
    return [lerp(a[0], b[0], f - i), lerp(a[1], b[1], f - i)];
  };

  if (o.shadow !== false) softBlob(ctx, cx + w * 0.7, baseY + 1, w * 2.1, w * 0.45, '#1d160c', 0.3);

  const roots: Piece[] = [];
  const rootCount = o.roots ?? 2;
  for (let i = 0; i < rootCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const reach = w * rand.range(0.5, 0.8);
    const start: Vec2 = [cx + side * w * 0.1, baseY - w * 0.5];
    const end: Vec2 = [cx + side * reach, baseY + rand.range(0.3, 1)];
    const ctl: Vec2 = [cx + side * reach * 0.5, baseY - w * 0.1];
    roots.push({ pts: quadPts(start, ctl, end, 4), w0: w * 0.42, w1: 1.6 });
  }

  const limbs: Piece[] = [];
  const tips: Vec2[] = [];
  const top = trunk[trunk.length - 1]!;
  const n = Math.max(1, o.limbs ?? 3);
  const spread = o.spread ?? 1;
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0 : i / (n - 1) - 0.5;
    const len = (h - trunkH) * rand.range(0.68, 0.84) * (1 - Math.abs(f) * 0.5);
    bough(top, -Math.PI / 2 + f * 2 * spread + rand.range(-0.15, 0.15), len, wTop * rand.range(0.8, 1), 2, up, rand, limbs, tips);
  }
  for (let i = 0; i < (o.sideLimbs ?? 1); i++) {
    const t = rand.range(0.5, 0.8);
    const side = i % 2 === 0 ? (sway > 0 ? -1 : 1) : sway > 0 ? 1 : -1;
    bough(at(t), -Math.PI / 2 + side * rand.range(1.05, 1.4), h * rand.range(0.28, 0.4), widthAt(t) * 0.55, 1, up * 1.3, rand, limbs, tips);
  }

  const stubs: Piece[] = [];
  for (let i = 0; i < (o.stubs ?? 1); i++) {
    const t = rand.range(0.3, 0.75);
    const side = rand.chance(0.5) ? 1 : -1;
    const sw = widthAt(t) * 0.45;
    stubs.push({ pts: limbPath(at(t), -Math.PI / 2 + side * rand.range(0.7, 1.1), h * 0.16, 0.12, rand, 2), w0: sw, w1: sw * 0.85, cap: true });
  }

  const trunkPiece: Piece = { pts: trunk, w0: w, w1: wTop };
  const rest = [...roots, ...limbs, ...stubs];
  const everything = [...rest, trunkPiece];

  for (const p of everything) taper(ctx, p.pts, p.w0 + inkW * 2, p.w1 + inkW * 2, ink);
  for (const p of rest) taper(ctx, p.pts, p.w0, p.w1, tones.base);
  const tb = bounds(trunk);
  taper(ctx, trunk, w, wTop, linearGradient(ctx, tb.minX - w * 0.5, 0, tb.maxX + w * 0.5, 0, [[0, tones.light], [0.3, tones.base], [1, tones.shade]]));

  for (const p of everything) {
    if (p.w0 < 2.2) continue;
    taper(ctx, litOffset(p.pts, -p.w0 * 0.24), p.w0 * 0.36, p.w1 * 0.3, rgba(tones.deep, 0.4));
    taper(ctx, litOffset(p.pts, p.w0 * 0.22), p.w0 * 0.26, p.w1 * 0.2, rgba(tones.highlight, 0.55));
  }

  for (const p of stubs) {
    const end = p.pts[p.pts.length - 1]!;
    ellipse(ctx, end[0], end[1], p.w1 / 2 + 0.3, p.w1 * 0.32, { fill: tones.wood, stroke: ink, width: inkW * 0.9, rotation: heading(p.pts) + Math.PI / 2 });
  }

  // Grain, cracks and a knot on the trunk.
  for (let g = 0; g < 3; g++) {
    const u = rand.range(-0.32, 0.3);
    const t0 = rand.range(0.04, 0.5);
    const t1 = Math.min(0.97, t0 + rand.range(0.25, 0.5));
    const pts: Vec2[] = [];
    for (let k = 0; k <= 5; k++) {
      const t = lerp(t0, t1, k / 5);
      const p = at(t);
      pts.push([p[0] + u * widthAt(t) + rand.range(-0.3, 0.3), p[1]]);
    }
    line(ctx, pts, rgba(tones.deep, 0.5), 0.8, { smooth: true });
  }
  {
    const t = rand.range(0.1, 0.8);
    const p = at(t);
    const half = widthAt(t) * rand.range(0.18, 0.3);
    const x0 = p[0] + rand.range(-0.2, 0.2) * widthAt(t) - half;
    line(ctx, [[x0, p[1]], [x0 + half * 0.7, p[1] + 1.2], [x0 + half * 1.3, p[1] - 0.6], [x0 + half * 2, p[1] + 0.8]], rgba(tones.deep, 0.7), 0.8);
  }
  if (!o.hollow) {
    const t = rand.range(0.25, 0.6);
    const p = at(t);
    const x = p[0] + rand.range(-0.15, 0.15) * widthAt(t);
    ellipse(ctx, x, p[1], 1.2, 2, { fill: tones.deep, stroke: rgba(ink, 0.7), width: 0.6 });
    ellipse(ctx, x - 0.25, p[1] - 0.5, 0.5, 0.9, { fill: rgba(tones.highlight, 0.45) });
  }

  if (o.hollow) {
    const p = at(0.2);
    const ww = widthAt(0.2);
    ellipse(ctx, p[0] + ww * 0.05, p[1], ww * 0.24, ww * 0.38, { fill: '#241a12', stroke: ink, width: inkW });
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(p[0] + ww * 0.05, p[1] + ww * 0.06, ww * 0.15, ww * 0.26, 0, 0.2, Math.PI - 0.2);
    ctx.strokeStyle = rgba(tones.highlight, 0.5);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }

  if (o.moss) {
    const moss = o.moss;
    const lit = lighten(moss, 0.22);
    const lump = (x: number, y: number, r: number): void => {
      shape(ctx, blob(rand, x, y, r, r * 0.72, { points: 7, jitter: 0.2 }), {
        fill: linearGradient(ctx, x - r, y - r, x + r, y + r, [lit, moss, darken(moss, 0.3)]),
        stroke: ink,
        width: 0.8,
        smooth: true,
      });
    };
    for (let i = 0; i < 3; i++) {
      const t = 0.05 + i * 0.16 + rand.range(0, 0.08);
      const p = at(t);
      const wt = widthAt(t);
      lump(p[0] + wt * (i % 2 === 0 ? -0.28 : 0.12), p[1], wt * rand.range(0.26, 0.4));
    }
    for (const l of limbs) {
      if (l.w0 < 2.6) continue;
      const k = rand.int(0, 1);
      const a = litOffset(l.pts, l.w0 * 0.3)[k]!;
      lump(a[0], a[1], l.w0 * 0.5);
      const b = litOffset(l.pts, l.w0 * 0.2)[k + 2]!;
      for (let s = 0; s < 3; s++) {
        const x = b[0] + (s - 1) * 2.6 + rand.range(-0.6, 0.6);
        const len = rand.range(4, 11);
        const strand = quadPts([x, b[1]], [x + rand.range(-2, 2), b[1] + len * 0.5], [x + rand.range(-2.2, 2.2), b[1] + len], 5);
        taper(ctx, strand, 2.4, 0.8, rgba(ink, 0.55));
        taper(ctx, strand, 1.3, 0.3, s === 1 ? lit : moss);
      }
    }
  }

  return tips;
}
