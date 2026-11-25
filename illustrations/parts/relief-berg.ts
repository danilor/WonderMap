import { mix, rgba } from '../kit/colors';
import { clipped, linearGradient, shape, softBlob } from '../kit/draw';
import { chaikin, jagged } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { COOL_INK, shifted } from './relief-common';
import { paintFacets, sparkle } from './relief-ice';

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

/** Top outline of a berg from the left water line to the right one: x in -0.5..0.5, y = height above the water (0..1). */
export type BergProfile = ReadonlyArray<readonly [number, number]>;

export const BERG_PROFILES = {
  horn: [[-0.5, 0], [-0.45, 0.1], [-0.37, 0.2], [-0.31, 0.36], [-0.2, 0.46], [-0.12, 0.7], [-0.02, 1], [0.06, 0.82], [0.14, 0.64], [0.22, 0.5], [0.3, 0.42], [0.38, 0.28], [0.46, 0.1], [0.5, 0]],
  twin: [[-0.5, 0], [-0.43, 0.2], [-0.37, 0.5], [-0.29, 0.8], [-0.22, 0.6], [-0.1, 0.4], [-0.02, 0.5], [0.08, 0.8], [0.16, 1], [0.26, 0.72], [0.34, 0.42], [0.44, 0.2], [0.5, 0]],
  dome: [[-0.5, 0], [-0.46, 0.15], [-0.38, 0.4], [-0.26, 0.64], [-0.1, 0.86], [0.04, 0.95], [0.2, 0.86], [0.32, 0.62], [0.42, 0.34], [0.48, 0.14], [0.5, 0]],
  wedge: [[-0.5, 0], [-0.49, 0.18], [-0.32, 0.3], [-0.12, 0.46], [0.08, 0.7], [0.3, 1], [0.38, 0.62], [0.46, 0.3], [0.5, 0]],
  shard: [[-0.5, 0], [-0.4, 0.14], [-0.33, 0.5], [-0.26, 0.38], [-0.16, 0.72], [-0.08, 0.6], [0.02, 1], [0.12, 0.7], [0.2, 0.55], [0.3, 0.3], [0.42, 0.16], [0.5, 0]],
} satisfies Record<string, BergProfile>;

export interface BergOptions {
  cx: number;
  /** Y of the water line. */
  waterY: number;
  /** Width at the water line and height above it. */
  w: number;
  h: number;
  profile: BergProfile;
  /** How far the hidden part reaches below the water, as a share of `h`. */
  depth?: number;
  /** Share of the height covered by white snow; the rest is blue ice. */
  snow?: number;
  rows?: number;
  cols?: number;
  ink?: string;
  rand: Rng;
}

export interface BergShape {
  o: BergOptions;
  apex: Vec2;
  leftEdge: Vec2[];
  rightEdge: Vec2[];
  ridge: Vec2[];
  leftFace: Vec2[];
  rightFace: Vec2[];
  silhouette: Vec2[];
  /** Water line, left to right. */
  bottom: Vec2[];
  under: Vec2[];
}

/** The hidden bulk of a berg: a rounded, irregular body below the water line. */
function underBody(rand: Rng, cx: number, waterY: number, w: number, d: number): Vec2[] {
  const j = (): number => rand.range(-0.06, 0.06);
  return [
    [cx - w * 0.52, waterY],
    [cx - w * (0.47 + j()), waterY + d * 0.38],
    [cx - w * (0.3 + j()), waterY + d * 0.8],
    [cx - w * (0.05 + j()), waterY + d],
    [cx + w * (0.2 + j()), waterY + d * 0.88],
    [cx + w * (0.44 + j()), waterY + d * 0.48],
    [cx + w * 0.52, waterY],
  ];
}

/** Translucent turquoise ice seen through the water. */
function paintUnder(ctx: Ctx2D, rand: Rng, poly: readonly Vec2[], waterY: number, d: number, w: number, cx: number): void {
  shape(ctx, poly, { fill: linearGradient(ctx, 0, waterY, 0, waterY + d, [rgba('#a6f3ea', 0.78), rgba('#52c7d6', 0.5), rgba('#2f93bf', 0.1)]), smooth: true });
  clipped(ctx, poly, () => {
    for (let k = 0; k < 5; k++) {
      const a: Vec2 = [cx + w * rand.range(-0.4, 0.4), waterY];
      const b: Vec2 = [a[0] + w * rand.range(-0.25, 0.25), waterY + d * rand.range(0.5, 1)];
      shape(ctx, jagged(rand, a, b, 4, 1.2), { stroke: rgba(k % 2 ? '#e6fffb' : '#1f7fa8', k % 2 ? 0.42 : 0.26), width: 0.9, closed: false });
    }
  }, true);
  shape(ctx, poly, { stroke: rgba('#dffffa', 0.5), width: 0.9, smooth: true });
}

/** Rings of foam hugging the base of a berg; the back half is hidden by the ice that is drawn afterwards. */
function paintRings(ctx: Ctx2D, rand: Rng, cx: number, waterY: number, rx: number, ry: number): void {
  const phase = rand.range(0, 6.28);
  for (const [k, alpha] of [[1.13, 0.5], [1, 0.8]] as const) {
    const ring: Vec2[] = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      ring.push([cx + Math.cos(a) * rx * k * (1 + 0.04 * Math.sin(5 * a + phase)), waterY + ry * 0.4 + Math.sin(a) * ry * k]);
    }
    if (k === 1) shape(ctx, ring, { fill: rgba('#e8fbff', 0.28), smooth: true });
    shape(ctx, ring, { stroke: rgba('#ffffff', alpha), width: 0.9, smooth: true });
  }
}

export function bergShape(o: BergOptions): BergShape {
  const { rand, cx, waterY, w, h } = o;
  const pts: Vec2[] = o.profile.map(([x, y], i, a): Vec2 => {
    const end = i === 0 || i === a.length - 1;
    return [cx + x * w + (end ? 0 : rand.range(-0.02, 0.02) * w), waterY - y * h + (end ? 0 : rand.range(-0.03, 0.03) * h)];
  });
  let ai = 0;
  pts.forEach((p, i) => {
    if (p[1] < pts[ai]![1]) ai = i;
  });
  const apex = pts[ai]!;
  const left = pts[0]!;
  const right = pts[pts.length - 1]!;
  const leftEdge = pts.slice(0, ai + 1).reverse();
  const rightEdge = pts.slice(ai);
  const ridgeBase: Vec2 = [apex[0] + w * rand.range(-0.06, 0.1), waterY + h * 0.05];
  const ridge: Vec2[] = [apex];
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    ridge.push([apex[0] + (ridgeBase[0] - apex[0]) * t + rand.range(-1, 1) * w * 0.025, apex[1] + (ridgeBase[1] - apex[1]) * t]);
  }
  ridge.push(ridgeBase);
  const footL: Vec2 = [(ridgeBase[0] + left[0]) / 2, waterY + h * rand.range(0.02, 0.06)];
  const footR: Vec2 = [(ridgeBase[0] + right[0]) / 2, waterY + h * rand.range(0.02, 0.06)];
  const leftFace: Vec2[] = [...leftEdge, footL, ridgeBase, ...ridge.slice(1, -1).reverse()];
  const rightFace: Vec2[] = [...ridge, footR, ...rightEdge.slice(1).reverse()];
  const silhouette: Vec2[] = [...leftEdge, footL, ridgeBase, footR, ...rightEdge.slice(1).reverse()];
  const under = underBody(rand, cx, waterY, w, h * (o.depth ?? 0.8));
  return { o, apex, leftEdge, rightEdge, ridge, leftFace, rightFace, silhouette, bottom: [left, footL, ridgeBase, footR, right], under };
}

export function drawBergUnder(ctx: Ctx2D, s: BergShape): void {
  const { o } = s;
  paintUnder(ctx, o.rand, s.under, o.waterY, o.h * (o.depth ?? 0.8), o.w, o.cx);
}

/** The visible part of a faceted berg, with a foam ring and wet, turquoise-tinted foot. */
export function drawBergTop(ctx: Ctx2D, s: BergShape): void {
  const { o, leftEdge, rightEdge, ridge, leftFace, rightFace, silhouette, bottom } = s;
  const { rand, cx, waterY, w, h } = o;
  const ink = o.ink ?? COOL_INK;
  const lw = clamp(w * 0.014, 1, 1.6);
  const rows = o.rows ?? (h > 50 ? 5 : 4);
  const cols = o.cols ?? 3;
  const snow = o.snow ?? 0.7;

  paintRings(ctx, rand, cx, waterY, w * 0.56, Math.max(3, h * 0.07));
  shape(ctx, silhouette, { fill: ink, stroke: ink, width: lw * 2 });
  paintFacets(ctx, { edge: leftEdge, ridge, face: leftFace, lit: true, rows, cols, snow, rand, ink });
  paintFacets(ctx, { edge: rightEdge, ridge, face: rightFace, lit: false, rows, cols, snow, rand, ink });

  clipped(ctx, silhouette, () => {
    shape(ctx, silhouette, { fill: linearGradient(ctx, 0, waterY - h * 0.42, 0, waterY + h * 0.06, [rgba('#2a8fb4', 0), rgba('#2a8fb4', 0.42)]) });
    shape(ctx, shifted(leftEdge, lw * 0.9, lw * 0.9), { stroke: rgba('#ffffff', 0.8), width: lw * 0.8, closed: false });
    // A couple of dark cracks give the planes a broken, glassy feel.
    for (let k = 0; k < 2; k++) {
      const a: Vec2 = [cx + w * rand.range(-0.3, 0.3), waterY - h * rand.range(0.35, 0.7)];
      const b: Vec2 = [a[0] + w * rand.range(-0.1, 0.1), a[1] + h * rand.range(0.18, 0.3)];
      shape(ctx, jagged(rand, a, b, 4, 1), { stroke: rgba('#2f4f86', 0.5), width: 0.8, closed: false });
    }
  });
  shape(ctx, leftEdge, { stroke: ink, width: lw, closed: false });
  shape(ctx, rightEdge, { stroke: ink, width: lw * 1.15, closed: false });
  shape(ctx, ridge, { stroke: rgba(ink, 0.5), width: lw * 0.7, closed: false });
  shape(ctx, shifted(bottom, 0, lw * 1.4), { stroke: rgba('#2f93bf', 0.55), width: lw, closed: false, smooth: true });
  shape(ctx, bottom, { stroke: rgba('#ffffff', 0.92), width: lw * 1.3, closed: false, smooth: true });
  sparkle(ctx, s.apex[0] - w * 0.03, s.apex[1] + h * 0.1, clamp(w * 0.05, 2, 4.5));
  if (h > 40) sparkle(ctx, cx - w * 0.22, waterY - h * 0.3, clamp(w * 0.03, 1.5, 3));
}

export interface TabularOptions {
  cx: number;
  waterY: number;
  w: number;
  h: number;
  /** Depth of the top surface on screen as a share of `h`. */
  top?: number;
  depth?: number;
  /** A taller block on the left and a lower shelf on the right. */
  step?: boolean;
  ink?: string;
  rand: Rng;
}

interface SlabOptions {
  x0: number;
  x1: number;
  /** Y of the front top edge at the left end, and how much it changes towards the right end. */
  y: number;
  slope: number;
  /** On-screen depth of the lid. */
  T: number;
  waterY: number;
  ink: string;
  /** How much light the cliff face catches (0..1). */
  tone: number;
}

/** One block of tabular ice: a pale lid on top of a chipped cliff of blue ice. */
function paintSlab(ctx: Ctx2D, rand: Rng, o: SlabOptions): void {
  const { x0, x1, waterY, T, ink } = o;
  const w = x1 - x0;
  const lw = clamp(w * 0.016, 1, 1.5);
  const yAt = (x: number): number => o.y + (o.slope * (x - x0)) / w;
  const cliff = waterY - yAt(x0 + w / 2);
  const n = Math.max(5, Math.round(w / 8));
  const front: Vec2[] = [];
  for (let i = 0; i <= n; i++) {
    const end = i === 0 || i === n;
    const x = x0 + (w * i) / n;
    front.push([end ? x : x + rand.range(-0.3, 0.3) * (w / n), yAt(x) + (end ? 0 : rand.range(-1.3, 1.3))]);
  }
  const back = [x1 - w * 0.05, x0 + w * 0.7, x0 + w * 0.36, x0 + w * 0.05].map((x, i): Vec2 => [x, yAt(x) - T * (i === 0 || i === 3 ? rand.range(0.8, 0.95) : rand.range(0.98, 1.12))]);
  const lid: Vec2[] = [...front, ...back];
  const lean0 = rand.range(-0.03, 0.05) * w;
  const lean1 = rand.range(-0.05, 0.03) * w;
  const bottom: Vec2[] = [];
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    bottom.push([x1 + lean1 + (x0 + lean0 - x1 - lean1) * t, waterY + Math.sin(t * Math.PI) * 1.4 + (i === 0 || i === 4 ? 0 : rand.range(-0.5, 0.5))]);
  }
  const wall: Vec2[] = [...front, ...bottom];

  shape(ctx, wall, { fill: ink, stroke: ink, width: lw * 2 });
  shape(ctx, lid, { fill: ink, stroke: ink, width: lw * 2 });
  clipped(ctx, wall, () => {
    shape(ctx, wall, { fill: linearGradient(ctx, 0, yAt(x0) - 2, 0, waterY + 2, ['#f4faff', '#c9dff3', '#8db9e0', '#5189c2']) });
    shape(ctx, wall, { fill: linearGradient(ctx, x0, 0, x1, 0, [rgba('#ffffff', 0.4 * o.tone), rgba('#ffffff', 0), rgba('#26407a', 0.32)]) });
    for (const f of [0.28, 0.52, 0.76]) {
      const a = x0 + w * rand.range(0, 0.4);
      const b = a + w * rand.range(0.25, 0.6);
      const y = (x: number): number => yAt(x) + cliff * f + rand.range(-1, 1);
      shape(ctx, jagged(rand, [a, y(a)], [b, y(b)], 5, 0.7), { stroke: rgba('#ffffff', 0.42), width: 1.3, closed: false });
    }
    for (let k = 0; k < Math.max(3, Math.round(w / 15)); k++) {
      const x = x0 + w * rand.range(0.06, 0.94);
      const top = yAt(x) + rand.range(0, 0.18) * cliff;
      const pts = jagged(rand, [x, top], [x + rand.range(-2.5, 2.5), top + cliff * rand.range(0.3, 0.85)], 3, 0.9);
      shape(ctx, pts, { stroke: rgba('#315b94', 0.5), width: 0.9, closed: false });
      shape(ctx, shifted(pts, 1, 0), { stroke: rgba('#ffffff', 0.55), width: 0.8, closed: false });
    }
    shape(ctx, wall, { fill: linearGradient(ctx, 0, waterY - cliff * 0.3, 0, waterY + 2, [rgba('#1f8fb8', 0), rgba('#1f8fb8', 0.55)]) });
  });
  clipped(ctx, lid, () => {
    shape(ctx, lid, { fill: linearGradient(ctx, x0, yAt(x0) - T, x1, yAt(x1), ['#ffffff', '#f1f8fe', '#cfe2f3']) });
    softBlob(ctx, x0 + w * 0.3, yAt(x0) - T * 0.7, w * 0.2, T * 0.3, '#ffffff', 0.7);
    for (let k = 0; k < 3; k++) {
      const a: Vec2 = [x0 + w * rand.range(0.05, 0.6), yAt(x0) - T * rand.range(0.15, 0.8)];
      shape(ctx, jagged(rand, a, [a[0] + w * rand.range(0.12, 0.3), a[1] + rand.range(-2, 2.5)], 4, 0.8), { stroke: rgba('#7fa4d4', 0.6), width: 0.8, closed: false });
    }
    shape(ctx, front, { stroke: rgba('#ffffff', 0.95), width: lw * 1.6, closed: false });
  });
  shape(ctx, lid, { stroke: ink, width: lw });
  shape(ctx, wall, { stroke: ink, width: lw });
  shape(ctx, shifted(front, 0, lw * 1.3), { stroke: rgba('#5f8cc4', 0.45), width: lw, closed: false });
  const water = shifted(bottom, 0, 0);
  shape(ctx, shifted(water, 0, lw * 1.4), { stroke: rgba('#2f93bf', 0.55), width: lw, closed: false, smooth: true });
  shape(ctx, water, { stroke: rgba('#ffffff', 0.92), width: lw * 1.3, closed: false, smooth: true });
}

/** A flat-topped berg: a pale lid on cracked, wave-cut cliffs, optionally stepped. */
export function drawTabularBerg(ctx: Ctx2D, o: TabularOptions): void {
  const { rand, cx, waterY, w, h } = o;
  const ink = o.ink ?? COOL_INK;
  const T = h * (o.top ?? 0.34);
  const d = h * (o.depth ?? 0.9);
  const x0 = cx - w * 0.5;
  const x1 = cx + w * 0.5;
  paintUnder(ctx, rand, underBody(rand, cx, waterY, w * 0.96, d), waterY, d, w, cx);
  paintRings(ctx, rand, cx, waterY, w * 0.58, Math.max(3, h * 0.08));
  if (o.step) {
    const xm = x0 + w * rand.range(0.5, 0.58);
    paintSlab(ctx, rand, { x0: xm - w * 0.05, x1, y: waterY - h * 0.58, slope: rand.range(-1.5, 1.5), T: T * 0.8, waterY, ink, tone: 0.4 });
    paintSlab(ctx, rand, { x0, x1: xm, y: waterY - h, slope: rand.range(-3, 0), T, waterY, ink, tone: 1 });
  } else {
    paintSlab(ctx, rand, { x0, x1, y: waterY - h * rand.range(0.9, 1), slope: rand.range(-4, 2), T, waterY, ink, tone: 1 });
  }
  sparkle(ctx, x0 + w * 0.22, waterY - h - T * 0.35, clamp(w * 0.04, 2, 4));
}

export interface FloeOptions {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rand: Rng;
  /** Thickness of the plate on screen. */
  thick?: number;
  /** Straight-edged sides (5..9 is a good range). */
  sides?: number;
  cracks?: number;
  ink?: string;
  /** Skip the turquoise glow under the plate. */
  dry?: boolean;
}

/** Chipped, angular outline of a plate of sea ice, with one bite taken out of it when it has enough sides. */
function floeOutline(rand: Rng, cx: number, cy: number, rx: number, ry: number, sides: number): Vec2[] {
  const n = Math.max(5, sides);
  const phase = rand.range(0, Math.PI * 2);
  const bite = n > 6 ? rand.int(0, n - 1) : -1;
  const pts: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const a = phase + ((i + rand.range(-0.3, 0.3)) / n) * Math.PI * 2;
    const r = i === bite ? rand.range(0.66, 0.8) : rand.range(0.84, 1.06);
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  return chaikin(pts, 1, true);
}

/** A flat plate of sea ice: a pale lid, a blue edge, foam and a turquoise glow underneath. */
export function drawFloe(ctx: Ctx2D, o: FloeOptions): void {
  const { rand, cx, cy, rx, ry } = o;
  const ink = o.ink ?? COOL_INK;
  const t = o.thick ?? Math.max(2, ry * 0.3);
  const lw = clamp(rx * 0.03, 0.9, 1.4);
  const lid = floeOutline(rand, cx, cy, rx, ry, o.sides ?? 7);
  const grown = (k: number, dy: number): Vec2[] => lid.map((p): Vec2 => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k + dy]);

  if (!o.dry) shape(ctx, grown(1.14, t * 0.7), { fill: linearGradient(ctx, 0, cy - ry, 0, cy + ry * 1.4, [rgba('#9cf0e8', 0.6), rgba('#46b8d2', 0.3)]), stroke: rgba('#dffffa', 0.4), width: 0.8, smooth: true });
  shape(ctx, grown(1.07, t * 0.55), { stroke: rgba('#ffffff', 0.6), width: 0.9, smooth: true });

  // The outline runs clockwise on screen, so (dy, -dx) points out of the plate.
  const edges = lid.map((a, i) => {
    const b = lid[(i + 1) % lid.length]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return { a, b, nx: (b[1] - a[1]) / len, ny: -(b[0] - a[0]) / len };
  });
  for (const e of edges) {
    if (e.ny < -0.15) continue;
    const quad: Vec2[] = [e.a, e.b, [e.b[0], e.b[1] + t], [e.a[0], e.a[1] + t]];
    const c = mix('#bcdaf3', '#4d78b2', clamp((e.nx + 1) / 2, 0, 1));
    shape(ctx, quad, { fill: c, stroke: c, width: 0.7 });
  }
  // One ink line around the whole rim instead of a seam per segment.
  shape(ctx, shifted(lid, 0, t), { stroke: ink, width: lw });
  edges.forEach((e, i) => {
    if (e.ny < -0.15 !== edges[(i + edges.length - 1) % edges.length]!.ny < -0.15) shape(ctx, [e.a, [e.a[0], e.a[1] + t]], { stroke: ink, width: lw, closed: false });
  });
  shape(ctx, lid, { fill: linearGradient(ctx, cx - rx, cy - ry, cx + rx * 0.8, cy + ry, ['#ffffff', '#f0f8fe', '#cfe3f4']), stroke: ink, width: lw });
  clipped(ctx, lid, () => {
    softBlob(ctx, cx - rx * 0.25, cy - ry * 0.3, rx * 0.5, ry * 0.4, '#ffffff', 0.6);
    for (let k = 0; k < (o.cracks ?? 1); k++) {
      const a: Vec2 = [cx + rx * rand.range(-0.8, -0.2), cy + ry * rand.range(-0.6, 0.4)];
      const b: Vec2 = [a[0] + rx * rand.range(0.5, 1), a[1] + ry * rand.range(-0.5, 0.6)];
      shape(ctx, jagged(rand, a, b, 5, ry * 0.12), { stroke: rgba('#5f84b8', 0.7), width: 0.9, closed: false });
      shape(ctx, shifted(jagged(rand, a, b, 5, 0), -0.4, -0.7), { stroke: rgba('#ffffff', 0.7), width: 0.7, closed: false });
    }
    if (rx > 14) {
      for (let k = 0; k < 3; k++) {
        const x = cx + rx * rand.range(-0.2, 0.55);
        const y = cy + ry * rand.range(0.1, 0.6);
        shape(ctx, [[x, y], [x + rx * rand.range(0.15, 0.3), y + rand.range(-1, 1)]], { stroke: rgba('#a9c8e8', 0.75), width: 1.1, closed: false });
      }
    }
    shape(ctx, lid, { stroke: rgba('#9cc1e6', 0.6), width: lw * 2.2 });
  });
  for (const e of edges) {
    if (e.nx > -0.25 || e.ny > 0.2) continue;
    shape(ctx, [[e.a[0] + 0.5, e.a[1] + 0.9], [e.b[0] + 0.5, e.b[1] + 0.9]], { stroke: rgba('#ffffff', 0.8), width: 0.9, closed: false });
  }
}
