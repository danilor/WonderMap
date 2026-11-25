import { mix, rgba } from '../kit/colors';
import { clipped, dot, line, linearGradient, shades, shape } from '../kit/draw';
import { lerp } from '../kit/math';
import { catmullRom } from '../kit/shapes';
import type { Vec2 } from '../kit/types';
import { foamBlob, foamStrip, ripple } from './sea-fx';
import type { Pen } from './ship-parts';

/** Rocks standing in the sea: faceted stone with a wet band and surf around the foot. */

export interface Rock {
  /** Centre of the base, on the waterline. */
  x: number;
  y: number;
  /** Width of the base and height above the water. */
  w: number;
  h: number;
  tone: string;
  /** -1..1: where the highest point sits. */
  summit?: number;
  /** 0 = pointed, 1 = flat topped. */
  flat?: number;
  /** A natural arch through the foot of the rock. */
  arch?: boolean;
  /** Turf or moss over the top. */
  cap?: string;
  /** Skip the surf (when the caller paints its own). */
  dry?: boolean;
}

const LEFT: ReadonlyArray<Vec2> = [[-1, 0], [-0.98, 0.17], [-0.84, 0.37], [-0.82, 0.57], [-0.6, 0.76], [-0.38, 0.9], [-0.15, 1]];
const RIGHT: ReadonlyArray<Vec2> = [[0.15, 0.98], [0.36, 0.87], [0.58, 0.71], [0.74, 0.52], [0.9, 0.35], [0.97, 0.16], [1, 0]];

/** Surf around the foot of something standing in the water. */
export function surf(pen: Pen, cx: number, y: number, rx: number): void {
  const { ctx, rand } = pen;
  foamStrip(ctx, rand, cx - rx, cx + rx, y, { depth: 2.6, scallop: 3.6, alpha: 0.95 });
  foamBlob(ctx, rand, cx - rx * 0.92, y + 1.8, rx * 0.22, 1.5, { alpha: 0.6, edge: false });
  foamBlob(ctx, rand, cx + rx * 0.95, y + 2.2, rx * 0.26, 1.7, { alpha: 0.6, edge: false });
  foamStrip(ctx, rand, cx - rx * 0.5, cx + rx * 0.3, y + 3.6, { depth: 1.5, scallop: 3.2, alpha: 0.5 });
}

/** One rock, painted on the waterline. */
export function paintRock(pen: Pen, r: Rock): void {
  const { ctx, ink, u, rand } = pen;
  const hw = r.w / 2;
  const tones = shades(r.tone);
  const s = (r.summit ?? 0) * 0.5;
  const fl = r.flat ?? 0;
  const place = (p: Vec2, side: number): Vec2 => {
    const top = p[1] > 0.95;
    const fx = p[0] + s * p[1] ** 1.6 + (top ? side * fl * 0.5 : 0);
    const jx = p[1] > 0 && p[1] < 0.95 ? rand.range(-0.05, 0.05) : 0;
    const fy = top && fl > 0 ? 1 - fl * 0.03 : p[1];
    return [r.x + (fx + jx) * hw, r.y - fy * r.h + (p[1] > 0 && p[1] < 0.95 ? rand.range(-0.025, 0.025) * r.h : 0)];
  };
  const L = LEFT.map((p) => place(p, -1));
  const R = RIGHT.map((p) => place(p, 1));
  const peak: Vec2 = [(L[L.length - 1]![0] + R[0]![0]) / 2, Math.min(L[L.length - 1]![1], R[0]![1])];
  const foot: Vec2 = [r.x + (s * 0.5 + 0.12) * hw, r.y];
  const outline: Vec2[] = [...L, ...R];
  const lit: Vec2[] = [...L, peak, foot];
  const dark: Vec2[] = [peak, ...R, foot];

  ripple(ctx, r.x, r.y + 3.2, hw * 1.3, hw * 0.2, { alpha: 0.4, rings: 2 });

  shape(ctx, outline, { fill: ink, stroke: ink, width: 2.6 * u });
  shape(ctx, lit, { fill: linearGradient(ctx, r.x - hw, r.y - r.h, r.x + hw * 0.2, r.y, [tones.highlight, tones.light, tones.base]) });
  shape(ctx, dark, { fill: linearGradient(ctx, r.x, r.y - r.h, r.x + hw, r.y, [tones.base, tones.shade, tones.deep]) });
  clipped(ctx, outline, () => {
    // Facets: extra planes on both faces.
    const mid = (a: Vec2, b: Vec2, k: number): Vec2 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
    shape(ctx, [L[2]!, mid(peak, foot, 0.5), L[4]!, L[3]!], { fill: rgba(tones.shade, 0.32) });
    shape(ctx, [mid(peak, foot, 0.35), R[2]!, R[3]!, mid(peak, foot, 0.8)], { fill: rgba(tones.deep, 0.3) });
    shape(ctx, [R[4]!, R[5]!, foot, mid(peak, foot, 0.85)], { fill: rgba(tones.deep, 0.34) });
    shape(ctx, [peak, mid(peak, foot, 0.4), L[5]!, L[6]!], { fill: rgba(tones.highlight, 0.28) });
    // The ridge between the lit and the shaded face.
    line(ctx, [peak, mid(peak, foot, 0.5), foot], rgba(tones.deep, 0.55), 1 * u);
    // Cracks.
    for (let i = 0; i < 4; i++) {
      const a: Vec2 = [r.x + rand.range(-0.7, 0.7) * hw, r.y - r.h * rand.range(0.25, 0.8)];
      const pts: Vec2[] = [a];
      for (let j = 1; j <= 3; j++) pts.push([pts[j - 1]![0] + rand.range(-2, 2) * (0.7 + hw / 20), pts[j - 1]![1] + rand.range(1.2, 3.2)]);
      line(ctx, pts, rgba(tones.deep, 0.55), 0.7 * u);
    }
    // Wet foot: darker, greener stone just above the waterline, with weed.
    shape(ctx, outline, { fill: linearGradient(ctx, 0, r.y - r.h * 0.34, 0, r.y + 0.5, [rgba('#12383f', 0), rgba('#12383f', 0.55)]) });
    for (let i = 0; i < 9; i++) dot(ctx, r.x + rand.range(-0.9, 0.9) * hw, r.y - rand.range(0, 0.1) * r.h, rand.range(0.5, 1.1), rgba('#e7e1cf', 0.75));
    if (r.cap) {
      const cap: Vec2[] = [[r.x - hw * 1.3, r.y - r.h * 1.1], [r.x + hw * 1.3, r.y - r.h * 1.1]];
      const n = 7;
      for (let i = n; i >= 0; i--) cap.push([r.x - hw * 1.3 + (hw * 2.6 * i) / n, r.y - r.h * (i % 2 ? 0.78 : 0.86) + rand.range(-1, 1)]);
      const t = shades(r.cap);
      shape(ctx, cap, { fill: linearGradient(ctx, r.x - hw, r.y - r.h, r.x + hw, r.y - r.h * 0.7, [t.light, t.base, t.shade]), smooth: false });
      shape(ctx, cap.slice(2), { stroke: rgba(ink, 0.75), width: 0.9 * u, closed: false });
      for (let i = 0; i < 7; i++) {
        const x = r.x + rand.range(-0.8, 0.8) * hw;
        const y = r.y - r.h * rand.range(0.9, 1);
        line(ctx, [[x, y], [x + rand.range(-1.2, 1.2), y - rand.range(1.5, 3)]], t.highlight, 0.8 * u);
      }
    }
  });
  // Arch: a hole through the foot of the rock with sea behind it.
  if (r.arch) {
    const ax = r.x + hw * 0.02;
    const aw = hw * 0.36;
    const ah = r.h * 0.5;
    const hole = catmullRom([[ax - aw, r.y + 0.5], [ax - aw * 0.96, r.y - ah * 0.5], [ax - aw * 0.55, r.y - ah * 0.9], [ax, r.y - ah], [ax + aw * 0.55, r.y - ah * 0.9], [ax + aw * 0.96, r.y - ah * 0.5], [ax + aw, r.y + 0.5]], 5);
    shape(ctx, hole, { fill: ink });
    shape(ctx, hole.map((q): Vec2 => [lerp(q[0], ax, 0.1), lerp(q[1], r.y, 0.06)]), { fill: linearGradient(ctx, 0, r.y - ah, 0, r.y, ['#27768f', '#4aa0b8']) });
    clipped(ctx, hole, () => {
      shape(ctx, [[ax - aw * 1.2, r.y - ah * 1.2], [ax - aw * 0.1, r.y - ah * 1.2], [ax - aw * 0.4, r.y], [ax - aw * 1.2, r.y]], { fill: rgba('#0e3340', 0.45) });
    });
    shape(ctx, hole, { stroke: ink, width: 1.2 * u });
  }
  // Light catching the top edge.
  shape(ctx, [L[4]!, L[5]!, L[6]!, peak, R[0]!], { stroke: rgba(tones.highlight, 0.9), width: 1 * u, closed: false });
  shape(ctx, outline, { stroke: ink, width: 1.2 * u });
  if (!r.dry) surf(pen, r.x, r.y, hw * 1.04);
}

/** A rock palette: cool grey stone, warm sandstone, dark basalt. */
export const STONE = {
  grey: '#8f9399',
  warm: '#a69a86',
  dark: '#5d6269',
  green: '#7f8a78',
} as const;

/** Blend a stone tone toward the sea so rocks sit in the picture. */
export function stoneTone(base: string): string {
  return mix(base, '#6b8a96', 0.12);
}
