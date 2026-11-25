import { combineSeed, createRng } from '@wondermap/illustrations/kit';
import type { Vec2 } from '@wondermap/illustrations/kit';
import { pathStyleById, pathStyles } from '@wondermap/illustrations';
import type { MapTheme, ResolvedPathStyle } from '@wondermap/illustrations';
import type { MapPath, Rect } from '../model/types';

/** Turns the control points the user placed into a smooth polyline and draws it with the path style. */

export interface PathGeometry {
  points: Vec2[];
  widths: number[];
  bounds: Rect;
}

const geometryCache = new WeakMap<MapPath, PathGeometry>();

export function styleOf(path: MapPath): ResolvedPathStyle {
  return pathStyleById.get(path.style) ?? pathStyles[0]!;
}

/** Catmull-Rom spline through the control points, sampled finely enough to look smooth at any zoom. */
export function smoothPoints(control: readonly (readonly [number, number])[]): Vec2[] {
  const n = control.length;
  if (n < 3) return control.map((p) => [p[0], p[1]] as Vec2);
  const out: Vec2[] = [];
  const at = (i: number) => control[Math.min(n - 1, Math.max(0, i))]!;
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const steps = Math.min(48, Math.max(2, Math.ceil(len / 5)));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (p2[0] - p0[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (3 * p1[0] - p0[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (p2[1] - p0[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (3 * p1[1] - p0[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  const last = control[n - 1]!;
  out.push([last[0], last[1]]);
  return out;
}

/** Widths along a smoothed polyline: constant, or growing from a trickle to the full width for rivers. */
export function pathWidths(points: readonly Vec2[], width: number, taper: boolean): number[] {
  if (!taper) return points.map(() => width);
  const lengths: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1]! + Math.hypot(points[i]![0] - points[i - 1]![0], points[i]![1] - points[i - 1]![1]));
  }
  const total = lengths[lengths.length - 1] || 1;
  return lengths.map((l) => width * (0.34 + 0.66 * Math.pow(l / total, 0.75)));
}

export function pathGeometry(path: MapPath): PathGeometry {
  const hit = geometryCache.get(path);
  if (hit) return hit;
  const style = styleOf(path);
  const points = smoothPoints(path.points);
  const widths = pathWidths(points, path.width, style.taper);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of points) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  const pad = path.width + 6;
  const geometry: PathGeometry = { points, widths, bounds: { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad } };
  geometryCache.set(path, geometry);
  return geometry;
}

export function drawPath(ctx: CanvasRenderingContext2D, path: MapPath, theme: MapTheme, pixelScale: number): void {
  const style = styleOf(path);
  const { points, widths } = pathGeometry(path);
  if (points.length < 2) return;
  ctx.save();
  try {
    style.draw({ ctx, points, widths, theme, rand: createRng(combineSeed('path', path.id)), scale: pixelScale });
  } finally {
    ctx.restore();
  }
}

/** Distance from (x, y) to the path's centre line. */
export function distanceToPath(path: MapPath, x: number, y: number): number {
  const { points } = pathGeometry(path);
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / len2));
    const d = Math.hypot(x - (a[0] + dx * t), y - (a[1] + dy * t));
    if (d < best) best = d;
  }
  return best;
}

/** Ramer-Douglas-Peucker simplification of a freehand stroke. */
export function simplifyStroke(points: readonly (readonly [number, number])[], tolerance: number): [number, number][] {
  const n = points.length;
  if (n < 3) return points.map((p) => [p[0], p[1]]);
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack: Array<[number, number]> = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const pa = points[a]!;
    const pb = points[b]!;
    const dx = pb[0] - pa[0];
    const dy = pb[1] - pa[1];
    const len = Math.hypot(dx, dy);
    let worst = -1;
    let index = -1;
    for (let i = a + 1; i < b; i++) {
      const p = points[i]!;
      const d = len === 0 ? Math.hypot(p[0] - pa[0], p[1] - pa[1]) : Math.abs((p[0] - pa[0]) * dy - (p[1] - pa[1]) * dx) / len;
      if (d > worst) {
        worst = d;
        index = i;
      }
    }
    if (worst > tolerance && index > 0) {
      keep[index] = 1;
      stack.push([a, index], [index, b]);
    }
  }
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push([points[i]![0], points[i]![1]]);
  return out;
}
