import { TAU, catmullRom, resample, valueNoise } from '@wondermap/illustrations/kit';
import type { Vec2 } from '@wondermap/illustrations/kit';

/** Plain geometry for the example maps: shapes, smooth outlines with natural wobble, and distances. */

export type Polygon = readonly Vec2[];

/** A tilted ellipse as a polygon. */
export function ellipse(cx: number, cy: number, rx: number, ry: number, rotation = 0, count = 16): Vec2[] {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const out: Vec2[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    out.push([cx + x * cos - y * sin, cy + x * sin + y * cos]);
  }
  return out;
}

export const circle = (cx: number, cy: number, r: number, count = 16): Vec2[] => ellipse(cx, cy, r, r, 0, count);

/** An upright rectangle from its top-left to its bottom-right corner. */
export const rectangle = (x0: number, y0: number, x1: number, y1: number): Vec2[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];

export function distanceToSegment(x: number, y: number, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / len2)) : 0;
  return Math.hypot(x - (a[0] + dx * t), y - (a[1] + dy * t));
}

export function distanceToPolyline(x: number, y: number, line: Polygon): number {
  let best = Infinity;
  for (let i = 0; i + 1 < line.length; i++) best = Math.min(best, distanceToSegment(x, y, line[i]!, line[i + 1]!));
  return best;
}

/** Distance to the outline of a closed polygon (the closing edge included). */
export function distanceToOutline(x: number, y: number, polygon: Polygon): number {
  let best = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) best = Math.min(best, distanceToSegment(x, y, polygon[j]!, polygon[i]!));
  return best;
}

/** Length of a polyline, or of a closed outline. */
export function lengthOf(points: Polygon, closed = false): number {
  let sum = 0;
  for (let i = 0; i + 1 < points.length; i++) sum += Math.hypot(points[i + 1]![0] - points[i]![0], points[i + 1]![1] - points[i]![1]);
  if (closed && points.length > 1) sum += Math.hypot(points[0]![0] - points[points.length - 1]![0], points[0]![1] - points[points.length - 1]![1]);
  return sum;
}

/** Smooth closed curve through the corner points. */
export const smoothLoop = (points: Polygon, samples = 6): Vec2[] => catmullRom(points, samples, true);

/** A closed outline resampled to roughly even spacing. */
export function resampleLoop(loop: Polygon, spacing: number): Vec2[] {
  const out = resample([...loop, loop[0]!], spacing);
  // The resampler ends on the starting point again, which would double it up.
  const first = out[0]!;
  const last = out[out.length - 1]!;
  if (out.length > 1 && Math.hypot(last[0] - first[0], last[1] - first[1]) < spacing * 0.5) out.pop();
  return out;
}

export interface RoughOptions {
  /** Largest sideways push of the longest wobble, in px. */
  amp: number;
  /** Length of the longest wobble, in px. Each finer layer of wobble has half the length. */
  scale: number;
  octaves?: number;
  /** How much of the push is left for each finer layer: 0.5 (default) is smooth, 0.65 is jagged. */
  gain?: number;
  seed: number;
}

/**
 * Gives a closed outline a hand-drawn, natural wobble. The noise is read around a circle, so it joins up seamlessly
 * where the outline closes.
 */
export function roughenLoop(loop: Polygon, o: RoughOptions): Vec2[] {
  const octaves = o.octaves ?? 3;
  const gain = o.gain ?? 0.5;
  const finest = o.scale / 2 ** (octaves - 1);
  const pts = resampleLoop(loop, Math.max(3, finest / 3));
  const n = pts.length;
  const radius = lengthOf(pts, true) / TAU;
  const out: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[(i + n - 1) % n]!;
    const next = pts[(i + 1) % n]!;
    const tx = next[0] - prev[0];
    const ty = next[1] - prev[1];
    const len = Math.hypot(tx, ty) || 1;
    const angle = (i / n) * TAU;
    let push = 0;
    let amp = o.amp;
    let feature = o.scale;
    for (let k = 0; k < octaves; k++) {
      const u = (Math.cos(angle) * radius) / feature;
      const v = (Math.sin(angle) * radius) / feature;
      push += (valueNoise(u + 17.3 * k, v + 5.1 * k, o.seed + k * 977) - 0.5) * 2 * amp;
      amp *= gain;
      feature *= 0.5;
    }
    const p = pts[i]!;
    out.push([p[0] - (ty / len) * push, p[1] + (tx / len) * push]);
  }
  return out;
}

/** Smooths a closed outline and gives it a natural wobble: the shape of a coast, a forest edge, a patch of desert. */
export function organicLoop(corners: Polygon, o: RoughOptions): Vec2[] {
  return roughenLoop(smoothLoop(corners), o);
}

/**
 * Smooths a line and bends it sideways with noise, like a river finding its way. The two ends stay where they are.
 * `amp` is the largest push (0 only smooths), `scale` the length of one bend.
 */
export function meander(line: Polygon, amp: number, scale: number, seed: number): Vec2[] {
  if (line.length < 2) return line.slice();
  const dense = resample(catmullRom(line, 8), Math.max(6, scale / 5));
  const total = lengthOf(dense);
  const out: Vec2[] = [];
  let travelled = 0;
  for (let i = 0; i < dense.length; i++) {
    const p = dense[i]!;
    if (i > 0) travelled += Math.hypot(p[0] - dense[i - 1]![0], p[1] - dense[i - 1]![1]);
    const prev = dense[Math.max(0, i - 1)]!;
    const next = dense[Math.min(dense.length - 1, i + 1)]!;
    const tx = next[0] - prev[0];
    const ty = next[1] - prev[1];
    const len = Math.hypot(tx, ty) || 1;
    const fade = Math.min(1, travelled / (scale * 0.8), (total - travelled) / (scale * 0.8));
    const push = (valueNoise(travelled / scale, 0.5, seed) - 0.5) * 2 * amp * Math.max(0, fade);
    out.push([p[0] - (ty / len) * push, p[1] + (tx / len) * push]);
  }
  return out;
}
