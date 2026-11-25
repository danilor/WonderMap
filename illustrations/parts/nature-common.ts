import { rgba } from '../kit/colors';
import { dot, ellipse, linearGradient, radialGradient, shades, shape, softBlob, taper, type Shades } from '../kit/draw';
import { TAU } from '../kit/math';
import { blob, normals } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';

/** Warm dark ink shared by the nature art. */
export const INK = '#2a2015';

/** Points along a quadratic curve `a → b` pulled towards `c`. */
export function quadPts(a: Vec2, c: Vec2, b: Vec2, n = 6): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return out;
}

/** Polyline shifted sideways by `d` towards the lit side (top-left) of the path. */
export function litOffset(pts: readonly Vec2[], d: number): Vec2[] {
  const nm = normals(pts);
  let sx = 0;
  let sy = 0;
  for (const n of nm) {
    sx += n[0];
    sy += n[1];
  }
  const sign = sx + sy < 0 ? 1 : -1;
  return pts.map((p, i): Vec2 => [p[0] + nm[i]![0] * d * sign, p[1] + nm[i]![1] * d * sign]);
}

/* ------------------------------------------------------------------------------------ */
/* Blades of grass                                                                      */
/* ------------------------------------------------------------------------------------ */

export interface Blade {
  pts: Vec2[];
  w: number;
  color: string;
  light?: string;
}

export function makeBlade(base: Vec2, tip: Vec2, bend: number, w: number, color: string, light?: string): Blade {
  const mid: Vec2 = [(base[0] + tip[0]) / 2 + bend, (base[1] + tip[1]) / 2];
  return { pts: quadPts(base, mid, tip, 5), w, color, light };
}

/** Ink every blade first so the outline stays clean, then fill and highlight them. */
export function paintBlades(ctx: Ctx2D, blades: readonly Blade[], ink: string, inkW: number): void {
  for (const b of blades) taper(ctx, b.pts, b.w + inkW * 2, inkW * 1.4, ink);
  for (const b of blades) {
    taper(ctx, b.pts, b.w, 0.3, b.color);
    if (b.light) taper(ctx, litOffset(b.pts, b.w * 0.18), b.w * 0.34, 0.15, b.light);
  }
}

export interface TuftOptions {
  x: number;
  /** Ground contact. */
  y: number;
  h: number;
  /** Half width of the fan at the tips. */
  spread: number;
  count: number;
  /** Palette of the blades: dark / base / light. */
  dark: string;
  base: string;
  light: string;
  ink: string;
  inkW?: number;
  bladeW?: number;
  /** Sideways lean of the whole tuft in px. */
  lean?: number;
}

/** Blades of one tuft, outer blades first so the tall center ones end up on top. */
export function tuftBlades(rand: Rng, o: TuftOptions): Blade[] {
  const out: Blade[] = [];
  const bw = o.bladeW ?? Math.max(1.4, o.h * 0.13);
  for (let i = 0; i < o.count; i++) {
    const t = o.count === 1 ? 0.5 : i / (o.count - 1);
    const a = (t - 0.5) * 2;
    const len = o.h * (0.58 + 0.42 * (1 - Math.abs(a) ** 1.5)) * rand.range(0.82, 1.08);
    const baseX = o.x + a * o.spread * 0.2 + rand.range(-0.8, 0.8);
    const tip: Vec2 = [o.x + a * o.spread * rand.range(0.8, 1.05) + (o.lean ?? 0) * (len / o.h), o.y - len];
    const bend = (a * 0.4 + rand.range(-0.5, 0.5)) * o.spread * 0.35;
    const color = a < -0.35 ? o.light : a > 0.4 ? o.dark : o.base;
    out.push(makeBlade([baseX, o.y], tip, bend, bw * rand.range(0.85, 1.15), color, a < 0.2 ? o.light : undefined));
  }
  return out.sort((p, q) => Math.abs(q.pts[q.pts.length - 1]![0] - o.x) - Math.abs(p.pts[p.pts.length - 1]![0] - o.x));
}

/** Convenience: ink, fill and highlight one tuft. */
export function drawTuft(ctx: Ctx2D, rand: Rng, o: TuftOptions): void {
  paintBlades(ctx, tuftBlades(rand, o), o.ink, o.inkW ?? 0.8);
}

/* ------------------------------------------------------------------------------------ */
/* Leafy lobes (bushes, canopies, moss)                                                 */
/* ------------------------------------------------------------------------------------ */

export interface Lobe {
  x: number;
  y: number;
  rx: number;
  ry: number;
  /** Overrides the base color of the whole mass. */
  color?: string;
}

/** A scalloped blob: the outline of a leafy clump. */
export function leafBlob(rand: Rng, cx: number, cy: number, rx: number, ry: number, bumps = 7, amp = 0.08): Vec2[] {
  return blob(rand, cx, cy, rx, ry, { points: bumps * 3, jitter: 0.03, lobes: bumps, lobeAmp: amp });
}

export interface LobeStyle {
  base: string;
  ink: string;
  inkW: number;
  bumps?: number;
  amp?: number;
  /** Leaf crescents per lobe. */
  marks?: number;
}

/** Lit lobes with one ink outline around their union. Returns each lobe polygon. */
export function paintLobes(ctx: Ctx2D, rand: Rng, lobes: readonly Lobe[], o: LobeStyle): Vec2[][] {
  const polys = lobes.map((l) => leafBlob(rand, l.x, l.y, l.rx, l.ry, o.bumps ?? 7, o.amp ?? 0.08));
  for (const p of polys) shape(ctx, p, { fill: o.ink, stroke: o.ink, width: o.inkW * 2, smooth: true });
  lobes.forEach((l, i) => {
    const tones = shades(l.color ?? o.base);
    const big = Math.max(l.rx, l.ry);
    const g = radialGradient(
      ctx,
      l.x + l.rx * 0.2,
      l.y + l.ry * 0.3,
      big * 0.1,
      big * 1.3,
      [
        [0, tones.highlight],
        [0.3, tones.light],
        [0.62, tones.base],
        [1, tones.deep],
      ],
      l.x - l.rx * 0.34,
      l.y - l.ry * 0.42,
    );
    shape(ctx, polys[i]!, { fill: g, smooth: true });
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(l.x, l.y, l.rx * 0.93, l.ry * 0.93, 0, -0.15, Math.PI * 0.85);
    ctx.strokeStyle = rgba(tones.deep, 0.5);
    ctx.lineWidth = Math.max(0.7, o.inkW);
    ctx.stroke();
    ctx.restore();
    leafMarks(ctx, rand, l, tones, o.marks ?? 4);
  });
  return polys;
}

/** Little crescent strokes that read as clusters of leaves. */
export function leafMarks(ctx: Ctx2D, rand: Rng, l: Lobe, tones: Shades, count: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  const big = Math.max(l.rx, l.ry);
  for (let i = 0; i < count; i++) {
    // Marks follow the form of the lobe: highlights upper-left, shadows lower-right.
    const lit = i % 2 === 0;
    const a = lit ? rand.range(Math.PI * 0.98, Math.PI * 1.6) : rand.range(-0.1, Math.PI * 0.55);
    const d = rand.range(0.42, 0.8);
    const span = rand.range(0.26, 0.46);
    ctx.beginPath();
    ctx.ellipse(l.x, l.y, l.rx * d, l.ry * d, 0, a - span, a + span);
    ctx.strokeStyle = lit ? rgba(tones.highlight, 0.8) : rgba(tones.deep, 0.5);
    ctx.lineWidth = Math.max(0.7, big * 0.07);
    ctx.stroke();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------------------------ */
/* Tubes (stalks, cacti, roots, limbs)                                                  */
/* ------------------------------------------------------------------------------------ */

export interface TubeStyle {
  ink: string;
  inkW: number;
  /** Round the two ends. Default true. */
  round?: boolean;
  /** Draw the 3D shading strokes. Default true. */
  shaded?: boolean;
}

/** A tapering tube with ink outline, lit left/top edge and shaded right/bottom edge. */
export function tube(ctx: Ctx2D, pts: readonly Vec2[], w0: number, w1: number, color: string, st: TubeStyle): void {
  const tones = shades(color);
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  taper(ctx, pts, w0 + st.inkW * 2, w1 + st.inkW * 2, st.ink);
  if (st.round !== false) {
    dot(ctx, first[0], first[1], w0 / 2 + st.inkW, st.ink);
    dot(ctx, last[0], last[1], w1 / 2 + st.inkW, st.ink);
  }
  taper(ctx, pts, w0, w1, color);
  if (st.round !== false) {
    dot(ctx, first[0], first[1], w0 / 2, color);
    dot(ctx, last[0], last[1], w1 / 2, color);
  }
  if (st.shaded === false) return;
  const sh = litOffset(pts, -w0 * 0.24);
  const hi = litOffset(pts, w0 * 0.22);
  taper(ctx, sh, w0 * 0.42, w1 * 0.4, rgba(tones.deep, 0.45));
  taper(ctx, hi, w0 * 0.3, w1 * 0.26, rgba(tones.highlight, 0.7));
}

/* ------------------------------------------------------------------------------------ */
/* Small odds and ends                                                                  */
/* ------------------------------------------------------------------------------------ */

/** A small rounded rock with ink outline, lit from the top-left. */
export function pebble(ctx: Ctx2D, rand: Rng, x: number, y: number, r: number, color: string, ink: string, shadow = true): void {
  const tones = shades(color);
  if (shadow) softBlob(ctx, x + r * 0.25, y + r * 0.2, r * 1.25, r * 0.5, '#1d160c', 0.3);
  const poly = blob(rand, x, y - r * 0.15, r, r * 0.76, { points: 9, jitter: 0.14 });
  shape(ctx, poly, { fill: linearGradient(ctx, x - r, y - r, x + r * 0.8, y + r * 0.5, [tones.highlight, tones.base, tones.shade]), stroke: ink, width: Math.max(0.8, r * 0.16), smooth: true });
  ctx.save();
  ctx.beginPath();
  ctx.arc(x - r * 0.1, y - r * 0.2, r * 0.62, Math.PI * 1.05, Math.PI * 1.55);
  ctx.strokeStyle = rgba(tones.highlight, 0.8);
  ctx.lineWidth = Math.max(0.6, r * 0.14);
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

/** Soft ellipse of ground tint: grass under a plant, trampled earth, scorch marks. */
export function groundPatch(ctx: Ctx2D, cx: number, cy: number, rx: number, ry: number, color: string, alpha = 0.35): void {
  softBlob(ctx, cx, cy, rx, ry, color, alpha);
}

/** Thin curved ripple arcs on water. */
export function ripples(ctx: Ctx2D, rand: Rng, cx: number, cy: number, rx: number, ry: number, color: string, count: number, alpha = 0.5): void {
  ctx.save();
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = 0.8;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const x = cx + rand.range(-0.7, 0.7) * rx;
    const y = cy + rand.range(-0.6, 0.6) * ry;
    const len = rand.range(0.14, 0.3) * rx;
    ctx.beginPath();
    ctx.ellipse(x, y, len, len * 0.28, 0, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
  }
  ctx.restore();
}

/** Fan of tiny dots, used for sparkles, pollen, spines and dust. */
export function sprinkle(ctx: Ctx2D, rand: Rng, cx: number, cy: number, rx: number, ry: number, count: number, color: string, r = 0.6): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const a = rand.range(0, TAU);
    const d = Math.sqrt(rand.next());
    const x = cx + Math.cos(a) * rx * d;
    const y = cy + Math.sin(a) * ry * d;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  }
  ctx.fill();
  ctx.restore();
}

/** Ellipse that is filled with a top-left lit gradient and outlined. */
export function litEllipse(ctx: Ctx2D, cx: number, cy: number, rx: number, ry: number, color: string, ink: string, inkW: number): void {
  const t = shades(color);
  ellipse(ctx, cx, cy, rx, ry, { fill: ink, stroke: ink, width: inkW * 2 });
  ellipse(ctx, cx, cy, rx, ry, { fill: radialGradient(ctx, cx + rx * 0.2, cy + ry * 0.3, Math.max(rx, ry) * 0.1, Math.max(rx, ry) * 1.3, [[0, t.highlight], [0.35, t.light], [0.7, t.base], [1, t.deep]], cx - rx * 0.35, cy - ry * 0.4) });
}
