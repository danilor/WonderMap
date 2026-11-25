import { TAU, clamp, dist } from './math';
import type { Rng, Vec2 } from './types';

/** Points of a wobbly closed blob around an ellipse. `lobes` adds large rounded bumps (tree crowns, clouds). */
export function blob(
  rand: Rng,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  o: { points?: number; jitter?: number; lobes?: number; lobeAmp?: number; rotation?: number } = {},
): Vec2[] {
  const n = o.points ?? 16;
  const jitter = o.jitter ?? 0.1;
  const lobes = o.lobes ?? 0;
  const lobeAmp = o.lobeAmp ?? 0;
  const phase = rand.range(0, TAU);
  const rot = o.rotation ?? 0;
  const out: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const k = 1 + rand.range(-jitter, jitter) + (lobes ? Math.sin(a * lobes + phase) * lobeAmp : 0);
    const x = Math.cos(a) * rx * k;
    const y = Math.sin(a) * ry * k;
    out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return out;
}

export function ellipsePoints(cx: number, cy: number, rx: number, ry: number, n = 24): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
}

/** Zig-zag line from `a` to `b` with `steps` segments, perpendicular amplitude `amp`. Includes both ends. */
export function jagged(rand: Rng, a: Vec2, b: Vec2, steps: number, amp: number): Vec2[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const out: Vec2[] = [a];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const o = rand.range(-amp, amp);
    out.push([a[0] + dx * t + nx * o, a[1] + dy * t + ny * o]);
  }
  out.push(b);
  return out;
}

/** Subdivide a polyline and nudge points to look hand-drawn. */
export function wobble(pts: readonly Vec2[], rand: Rng, amp: number, step = 6): Vec2[] {
  if (amp <= 0 || pts.length < 2) return pts.slice();
  const out: Vec2[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const d = dist(a, b);
    const n = Math.max(1, Math.round(d / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const jx = k === 0 ? 0 : rand.range(-amp, amp);
      const jy = k === 0 ? 0 : rand.range(-amp, amp);
      out.push([a[0] + (b[0] - a[0]) * t + jx, a[1] + (b[1] - a[1]) * t + jy]);
    }
  }
  out.push(pts[pts.length - 1]!);
  return out;
}

/** Chaikin corner cutting: smooths a polyline/polygon. */
export function chaikin(pts: readonly Vec2[], iterations = 2, closed = false): Vec2[] {
  let cur: Vec2[] = pts.slice();
  for (let it = 0; it < iterations; it++) {
    if (cur.length < 3) break;
    const next: Vec2[] = [];
    const n = cur.length;
    const last = closed ? n : n - 1;
    if (!closed) next.push(cur[0]!);
    for (let i = 0; i < last; i++) {
      const p = cur[i]!;
      const q = cur[(i + 1) % n]!;
      next.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25]);
      next.push([p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]);
    }
    if (!closed) next.push(cur[n - 1]!);
    cur = next;
  }
  return cur;
}

/** Sample a Catmull-Rom spline through `pts`. */
export function catmullRom(pts: readonly Vec2[], samples = 8, closed = false): Vec2[] {
  const n = pts.length;
  if (n < 3) return pts.slice();
  const out: Vec2[] = [];
  const segs = closed ? n : n - 1;
  const at = (i: number) => (closed ? pts[((i % n) + n) % n]! : pts[clamp(i, 0, n - 1)]!);
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let s = 0; s < samples; s++) {
      const t = s / samples;
      const t2 = t * t;
      const t3 = t2 * t;
      const x = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      out.push([x, y]);
    }
  }
  if (!closed) out.push(pts[n - 1]!);
  return out;
}

/** Resample a polyline at (approximately) uniform spacing. */
export function resample(pts: readonly Vec2[], spacing: number): Vec2[] {
  if (pts.length < 2) return pts.slice();
  const out: Vec2[] = [pts[0]!];
  let carry = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const seg = dist(a, b);
    if (seg === 0) continue;
    let pos = spacing - carry;
    while (pos <= seg) {
      const t = pos / seg;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      pos += spacing;
    }
    carry = seg - (pos - spacing);
  }
  const last = pts[pts.length - 1]!;
  const tail = out[out.length - 1]!;
  if (tail[0] !== last[0] || tail[1] !== last[1]) out.push(last);
  return out;
}

/** Unit normal (pointing left of travel direction) at each point of a polyline. */
export function normals(pts: readonly Vec2[]): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    out.push([-dy / len, dx / len]);
  }
  return out;
}

/** Closed polygon outlining a variable-width stroke along `pts` (`widths` are full widths). */
export function ribbon(pts: readonly Vec2[], widths: readonly number[]): Vec2[] {
  const nm = normals(pts);
  const left: Vec2[] = [];
  const right: Vec2[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const n = nm[i]!;
    const w = (widths[i] ?? widths[widths.length - 1] ?? 1) / 2;
    left.push([p[0] + n[0] * w, p[1] + n[1] * w]);
    right.push([p[0] - n[0] * w, p[1] - n[1] * w]);
  }
  return [...left, ...right.reverse()];
}

/** Cumulative arc length along a polyline. */
export function cumulativeLength(pts: readonly Vec2[]): number[] {
  const out = [0];
  for (let i = 1; i < pts.length; i++) out.push(out[i - 1]! + dist(pts[i - 1]!, pts[i]!));
  return out;
}
