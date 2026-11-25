import { mix, rgba } from '../kit/colors';
import { dot, linearGradient, shape, softBlob, taper } from '../kit/draw';
import { TAU } from '../kit/math';
import { blob, normals, ribbon } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';

export interface SandStyle {
  /** Sunlit sand. */
  light: string;
  /** Shaded flank of a dune. */
  shade: string;
  /** Darkest sand along the crest. */
  deep: string;
  /** Colour of the thin crest lines. */
  line: string;
}

export const SAND: SandStyle = { light: '#f7e8b8', shade: '#c4954d', deep: '#8f6430', line: '#5d3f1e' };

/* ------------------------------------------------------------------------------------ */
/* Dune crests                                                                          */
/* ------------------------------------------------------------------------------------ */

export interface Crest {
  pts: Vec2[];
  /** Width of the shaded flank at its widest. */
  shade: number;
  /** Width of the sunlit flank at its widest. */
  lit: number;
  /** Ripple lines on the flanks. */
  ripples?: number;
  /** `out`: widest at the first point and thinning to the tip, as on the arms of a star dune. */
  taper?: 'both' | 'out';
  /** Where along the crest the flanks are widest (0..1, default 0.5). */
  peak?: number;
  /** Overrides the flank width along the crest (t in 0..1 gives a factor in 0..1). */
  profile?: (t: number) => number;
}

/** A crest arching from `a` to `b`; `skew` moves the summit (0..1 along the path). */
export function crestPath(rand: Rng, a: Vec2, b: Vec2, o: { arch: number; skew?: number; wig?: number; n?: number }): Vec2[] {
  const n = o.n ?? 30;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  let nx = dy / len;
  let ny = -dx / len;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const k = Math.log(0.5) / Math.log(o.skew ?? 0.5);
  const phase = rand.range(0, TAU);
  const pts: Vec2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const off = o.arch * Math.sin(Math.PI * Math.pow(t, k)) + (o.wig ?? 0) * Math.sin(t * TAU * 1.5 + phase) * Math.sin(Math.PI * t);
    pts.push([a[0] + dx * t + nx * off, a[1] + dy * t + ny * off]);
  }
  return pts;
}

/** A circular arc used for crescent shaped dunes. Angles in degrees, 0 = right, 90 = down. */
export function arcPath(cx: number, cy: number, rx: number, ry: number, from: number, to: number, n = 30): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((from + (to - from) * (i / n)) * Math.PI) / 180;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

const SHADE_DIR: Vec2 = [0.5, 0.86];

/** +1 when the left normal of the path faces the shaded side (lower right), -1 otherwise. */
function shadeSign(pts: readonly Vec2[]): number {
  let d = 0;
  for (const n of normals(pts)) d += n[0] * SHADE_DIR[0] + n[1] * SHADE_DIR[1];
  return d >= 0 ? 1 : -1;
}

/** Width factor along a crest: a lens, lopsided by `peak`, with a gentle wobble so the foot is not too regular. */
function swellFn(c: Crest, n: number, phase: number): (i: number) => number {
  const k = Math.log(0.5) / Math.log(Math.min(0.8, Math.max(0.2, c.peak ?? 0.5)));
  return (i) => {
    const t = i / (n - 1);
    const wob = 1 + 0.1 * Math.sin(t * TAU * 2 + phase);
    if (c.profile) return c.profile(t) * wob;
    if (c.taper === 'out') return Math.pow(1 - t, 0.75) * Math.min(1, 0.55 + t * 6) * wob;
    return Math.pow(Math.sin(Math.PI * Math.pow(t, k)), 0.7) * wob;
  };
}

/** Paints one crest: pale body, soft shaded flank, a bright lit flank, a crisp crest line and a few ripples. */
export function paintCrest(ctx: Ctx2D, rand: Rng, c: Crest, st: SandStyle = SAND): void {
  const n = c.pts.length;
  const nm = normals(c.pts);
  const sign = shadeSign(c.pts);
  const swell = swellFn(c, n, rand.range(0, TAU));
  const at = (i: number, d: number): Vec2 => [c.pts[i]![0] + nm[i]![0] * sign * d, c.pts[i]![1] + nm[i]![1] * sign * d];
  const edge = (width: number): Vec2[] => c.pts.map((_, i) => at(i, width * swell(i)));

  // Hide whatever lies behind this dune (the sprite sits on its own canvas, so only other dunes are removed).
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  shape(ctx, [...edge(-c.lit), ...edge(c.shade).reverse()], { fill: '#000', smooth: true });
  ctx.restore();
  // A pale body keeps the dune readable on any sand colour.
  shape(ctx, [...edge(-c.lit), ...edge(c.shade).reverse()], { fill: rgba(st.light, 0.32), smooth: true });
  // Sunlit flank, brighter towards the crest.
  for (const [f, a] of [[1, 0.16], [0.62, 0.24], [0.3, 0.32]] as const) {
    shape(ctx, [...c.pts, ...edge(-c.lit * f).reverse()], { fill: rgba(st.light, a), smooth: true });
  }
  // Shaded flank: stacked layers read as a soft gradient away from the crest.
  for (const [f, a] of [[1, 0.2], [0.82, 0.18], [0.64, 0.2], [0.46, 0.22], [0.28, 0.24], [0.12, 0.26]] as const) {
    shape(ctx, [...c.pts, ...edge(c.shade * f).reverse()], { fill: rgba(f > 0.3 ? st.shade : st.deep, a), smooth: true });
  }
  // Where the shaded flank meets the ground.
  const foot = edge(c.shade).slice(Math.round(n * 0.14), Math.round(n * 0.86));
  if (foot.length > 3) shape(ctx, foot, { stroke: rgba(st.deep, 0.34), width: 0.8, closed: false, smooth: true });

  // Ripples follow the crest on both flanks and fade out towards the ends.
  const rip = c.ripples ?? 3;
  ctx.save();
  ctx.lineCap = 'round';
  for (let r = 0; r < rip; r++) {
    const lit = r % 2 === 0;
    const d = lit ? -c.lit * rand.range(0.35, 0.85) : c.shade * rand.range(0.5, 1.1);
    const t0 = rand.range(0.08, 0.4);
    const t1 = Math.min(0.94, t0 + rand.range(0.22, 0.5));
    const i0 = Math.floor(t0 * (n - 1));
    const i1 = Math.floor(t1 * (n - 1));
    const sub: Vec2[] = [];
    for (let i = i0; i <= i1; i++) sub.push(at(i, d * swell(i)));
    if (sub.length < 3) continue;
    ctx.strokeStyle = lit ? rgba(st.shade, 0.5) : rgba(st.deep, 0.4);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    sub.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
    ctx.stroke();
  }
  ctx.restore();

  // Rim light just above the crest, then the crest line itself.
  const rim: Vec2[] = [];
  for (let i = 2; i < n - 2; i++) rim.push(at(i, -1.6 * swell(i)));
  if (rim.length > 3) shape(ctx, rim, { stroke: 'rgba(255,246,214,0.6)', width: 0.9, closed: false, smooth: true });
  const widths = c.pts.map((_, i) => 0.3 + 1.6 * swell(i));
  shape(ctx, ribbon(c.pts, widths), { fill: rgba(st.line, 0.82), smooth: true });
}

/** Paints crests from back to front so that nearer dunes overlap the ones behind. */
export function paintCrests(ctx: Ctx2D, rand: Rng, crests: readonly Crest[], st: SandStyle = SAND): void {
  const depth = (c: Crest): number => c.pts.reduce((s, p) => s + p[1], 0) / c.pts.length;
  for (const c of [...crests].sort((p, q) => depth(p) - depth(q))) paintCrest(ctx, rand, c, st);
}

/** Specks of dark sand and a few pale grains. */
export function grains(ctx: Ctx2D, rand: Rng, cx: number, cy: number, rx: number, ry: number, count: number, st: SandStyle = SAND): void {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const a = rand.range(0, TAU);
    const d = Math.sqrt(rand.next());
    ctx.fillStyle = rgba(i % 3 === 0 ? st.light : st.deep, i % 3 === 0 ? 0.7 : 0.4);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, rand.range(0.4, 0.8), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------------------------ */
/* Cracked earth                                                                        */
/* ------------------------------------------------------------------------------------ */

/** Keep the part of `poly` that is nearer to `a` than to `b`. */
function clipNearer(poly: readonly Vec2[], a: Vec2, b: Vec2): Vec2[] {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const nx = b[0] - a[0];
  const ny = b[1] - a[1];
  const out: Vec2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    const dp = (p[0] - mx) * nx + (p[1] - my) * ny;
    const dq = (q[0] - mx) * nx + (q[1] - my) * ny;
    if (dp <= 0) out.push(p);
    if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
      const t = dp / (dp - dq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

export interface CrackedOptions {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Approximate size of one tile. */
  cell: number;
  /** Colour of the dried mud tiles. */
  mud: string;
  /** Colour seen in the cracks. */
  crack: string;
  rand: Rng;
}

/** A patch of dried mud: Voronoi tiles with curled, lit edges and dark gaps. */
export function drawCracked(ctx: Ctx2D, o: CrackedOptions): void {
  const { rand, cx, cy, rx, ry, cell } = o;
  const outline = blob(rand, cx, cy, rx, ry, { points: 22, jitter: 0.07, lobes: 3, lobeAmp: 0.07, rotation: rand.range(-0.2, 0.2) });

  const seeds: Vec2[] = [];
  for (let y = cy - ry; y <= cy + ry; y += cell * 0.9) {
    for (let x = cx - rx; x <= cx + rx; x += cell) {
      const sx = x + rand.range(-0.4, 0.4) * cell + (Math.round((y - cy) / (cell * 0.9)) % 2) * cell * 0.5;
      const sy = y + rand.range(-0.4, 0.4) * cell * 0.9;
      const nx = (sx - cx) / rx;
      const ny = (sy - cy) / ry;
      if (nx * nx + ny * ny < 1.08) seeds.push([sx, sy]);
    }
  }

  softBlob(ctx, cx + 1, cy + 1, rx * 1.12, ry * 1.18, '#7a5a2e', 0.28);
  shape(ctx, outline, { fill: rgba(o.crack, 0.92), smooth: true });

  const base = mix(o.mud, '#ffffff', 0.04);
  for (let i = 0; i < seeds.length; i++) {
    let poly: Vec2[] = outline.slice();
    const s = seeds[i]!;
    for (let j = 0; j < seeds.length && poly.length > 2; j++) {
      if (j !== i) poly = clipNearer(poly, s, seeds[j]!);
    }
    if (poly.length < 3) continue;
    let mx = 0;
    let my = 0;
    for (const p of poly) {
      mx += p[0];
      my += p[1];
    }
    mx /= poly.length;
    my /= poly.length;
    const k = rand.range(0.8, 0.9);
    const tile: Vec2[] = poly.map((p): Vec2 => [mx + (p[0] - mx) * k + rand.range(-0.3, 0.3), my + (p[1] - my) * k + rand.range(-0.3, 0.3)]);
    const tone = mix(base, rand.chance(0.5) ? '#fff6dc' : '#b79a62', rand.range(0.02, 0.2));
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of tile) {
      minX = Math.min(minX, p[0]);
      maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]);
      maxY = Math.max(maxY, p[1]);
    }
    shape(ctx, tile, { fill: linearGradient(ctx, minX, minY, maxX, maxY, [mix(tone, '#fff6dc', 0.32), tone, mix(tone, '#7a5a2e', 0.24)]) });

    // Curled edges: lit on the upper left, shaded on the lower right.
    ctx.save();
    ctx.lineCap = 'round';
    for (let e = 0; e < tile.length; e++) {
      const p = tile[e]!;
      const q = tile[(e + 1) % tile.length]!;
      const ex = (p[0] + q[0]) / 2 - mx;
      const ey = (p[1] + q[1]) / 2 - my;
      const facing = (ex + ey) / (Math.hypot(ex, ey) || 1);
      if (Math.abs(facing) < 0.25) continue;
      ctx.strokeStyle = facing < 0 ? 'rgba(255,244,212,0.7)' : rgba('#5a3d1e', 0.5);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
      ctx.stroke();
    }
    ctx.restore();
    if (rand.chance(0.35)) {
      const a = rand.range(0, TAU);
      const len = cell * rand.range(0.2, 0.38);
      shape(ctx, [[mx, my], [mx + Math.cos(a) * len, my + Math.sin(a) * len * 0.8], [mx + Math.cos(a + 0.5) * len * 1.6, my + Math.sin(a + 0.5) * len * 1.3]], {
        stroke: rgba('#5a3d1e', 0.45),
        width: 0.6,
        closed: false,
      });
    }
  }
}

/** A single small stone with a pale top: scattered rubble for the desert. */
export function sandRock(ctx: Ctx2D, rand: Rng, x: number, y: number, r: number, color = '#b5a082'): void {
  const poly = blob(rand, x, y - r * 0.2, r, r * 0.68, { points: 8, jitter: 0.16 });
  softBlob(ctx, x + r * 0.3, y + r * 0.2, r * 1.3, r * 0.45, '#1d160c', 0.28);
  shape(ctx, poly, { fill: color, stroke: '#2a2015', width: Math.max(0.7, r * 0.16), smooth: true });
  taper(ctx, [[x - r * 0.7, y - r * 0.4], [x - r * 0.1, y - r * 0.7], [x + r * 0.4, y - r * 0.55]], r * 0.3, 0.2, 'rgba(255,244,212,0.7)');
  dot(ctx, x + r * 0.25, y, r * 0.12, rgba('#2a2015', 0.35));
}
