import { mix, rgba } from '../kit/colors';
import { clipped, ellipse, linearGradient, radialGradient, shades, shape, softBlob, stipple } from '../kit/draw';
import { TAU } from '../kit/math';
import { jagged } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { shifted } from './relief-common';
import { brushLine } from './relief-hill';

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
const step = (x: number): number => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

export interface OutcropOptions {
  cx: number;
  /** Ground line at the front of the foot. */
  baseY: number;
  w: number;
  h: number;
  rock: string;
  ink: string;
  rand: Rng;
  /** Squareness of the profile: 2 = dome, 4 = cliff. Default 2.6. */
  boxy?: number;
  /** Shifts the summit sideways (-1..1). */
  lean?: number;
  /** Ledges that step the silhouette inwards. Default 2. */
  ledges?: number;
  /** Covering on the upper part (grass, snow, moss). */
  cap?: string;
  /** Depth of the covering as a share of the height. Default 0.2. */
  capShare?: number;
  shadow?: boolean;
}

export interface OutcropGeometry {
  polygon: Vec2[];
  /** A point inside the mass: u across (-1..1), v upwards (0 = foot, 1 = summit). */
  at: (u: number, v: number) => Vec2;
}

/** A lumpy mass of layered rock, lit from the upper left, that makes a good frame for a cave mouth. */
export function drawOutcrop(ctx: Ctx2D, o: OutcropOptions): OutcropGeometry {
  const { rand, cx, baseY, w, h } = o;
  const hw = w / 2;
  const q = o.boxy ?? 2.6;
  const lean = (o.lean ?? 0) * hw * 0.28;
  const foot = h * 0.1;
  const tones = shades(o.rock);
  const lw = clamp(w * 0.02, 1.1, 1.9);
  const ph = [rand.range(0, TAU), rand.range(0, TAU), rand.range(0, TAU), rand.range(0, TAU)];
  const ledges = Array.from({ length: o.ledges ?? 2 }, () => ({ v: rand.range(0.3, 0.8), side: rand.sign(), d: rand.range(0.05, 0.09) }));
  const half = (v: number, side: number): number => {
    const vv = clamp(v, 0, 0.99);
    let k = Math.pow(Math.max(0, 1 - Math.pow(vv, q)), 1 / q);
    k *= 1 + 0.045 * Math.sin(vv * 7 + ph[side < 0 ? 0 : 1]!) + 0.025 * Math.sin(vv * 15 + ph[side < 0 ? 2 : 3]!);
    for (const l of ledges) if (l.side === side) k -= l.d * step((vv - l.v) / 0.06);
    return Math.max(0.02, k);
  };
  const at = (u: number, v: number): Vec2 => [cx + lean * v + u * hw * half(v, u < 0 ? -1 : 1), baseY - h * v];

  const N = 30;
  const L: Vec2[] = [];
  const R: Vec2[] = [];
  for (let i = 0; i <= N; i++) {
    const v = (i / N) * 0.985;
    const rough = i === 0 || i === N ? 0 : 1;
    const pl = at(-1, v);
    const pr = at(1, v);
    L.push([pl[0] + rand.range(-0.022, 0.022) * hw * rough, pl[1] + rand.range(-0.01, 0.01) * h * rough]);
    R.push([pr[0] + rand.range(-0.022, 0.022) * hw * rough, pr[1] + rand.range(-0.01, 0.01) * h * rough]);
  }
  const front: Vec2[] = [];
  for (let j = 1; j <= 8; j++) {
    const t = j / 9;
    const x = R[0]![0] + (L[0]![0] - R[0]![0]) * t;
    front.push([x, baseY + foot * Math.sin(Math.PI * t) ** 0.8]);
  }
  const polygon: Vec2[] = [...L, ...R.slice().reverse(), ...front];

  if (o.shadow !== false) softBlob(ctx, cx + hw * 0.16, baseY + foot * 0.55, hw * 1.2, foot * 1.5 + 3, '#1d160c', 0.38);
  shape(ctx, polygon, { fill: o.ink, stroke: o.ink, width: lw * 2 });
  shape(ctx, polygon, { fill: linearGradient(ctx, cx - hw * 0.9, baseY - h, cx + hw * 0.85, baseY + foot, [[0, tones.light], [0.42, tones.base], [0.8, tones.shade], [1, tones.deep]]) });

  clipped(ctx, polygon, () => {
    // Broken-up planes: tint follows the light direction, with enough jitter to read as separate rock faces.
    const rows = h > 52 ? 4 : 3;
    const cols = 4;
    const grid: Vec2[][] = [];
    for (let r = 0; r <= rows; r++) {
      const row: Vec2[] = [];
      for (let c = 0; c <= cols; c++) {
        const edge = r === 0 || r === rows || c === 0 || c === cols ? 0 : 1;
        row.push(at(-1.2 + (c / cols) * 2.4 + rand.range(-0.12, 0.12) * edge, -0.04 + (r / rows) * 1.06 + rand.range(-0.06, 0.06) * edge));
      }
      grid.push(row);
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const uc = -1.2 + ((c + 0.5) / cols) * 2.4;
        const vc = (r + 0.5) / rows;
        const light = -0.6 * uc + 0.5 * (vc - 0.3) + rand.range(-0.3, 0.3);
        const quad = [grid[r]![c]!, grid[r]![c + 1]!, grid[r + 1]![c + 1]!, grid[r + 1]![c]!];
        shape(ctx, quad, { fill: light > 0 ? rgba(tones.highlight, Math.min(0.3, 0.22 * light)) : rgba(tones.deep, Math.min(0.4, 0.3 * -light)) });
        if (rand.chance(0.45)) shape(ctx, [quad[0]!, quad[3]!], { stroke: rgba(o.ink, 0.2), width: 0.8, closed: false });
        if (rand.chance(0.45)) shape(ctx, [quad[0]!, quad[1]!], { stroke: rgba(o.ink, 0.16), width: 0.8, closed: false });
      }
    }
    softBlob(ctx, cx - hw * 0.35, baseY - h * 0.78, hw * 0.55, h * 0.3, tones.highlight, 0.3);
    // Two shaded planes on the right, split by hand-inked folds.
    const plane = (u0: number, u1: number, alpha: number): void => {
      const edge: Vec2[] = [];
      for (let i = 0; i <= 8; i++) {
        const v = 1.02 - i * 0.14;
        edge.push(at(u0 + (u1 - u0) * (1 - clamp(v, 0, 1)) + 0.05 * Math.sin(i * 1.7 + ph[0]!), v));
      }
      shape(ctx, [...edge, at(1.4, -0.2), at(1.4, 1.1)], { fill: rgba(tones.deep, alpha) });
      shape(ctx, edge, { stroke: rgba(o.ink, 0.36), width: 0.9, closed: false, smooth: true });
    };
    plane(0.12, 0.42, 0.3);
    plane(0.55, 0.74, 0.28);
    // Sunlit band along the left side.
    const litEdge: Vec2[] = [];
    const litInner: Vec2[] = [];
    for (let i = 0; i <= 7; i++) {
      const v = 0.1 + i * 0.12;
      litEdge.push(at(-1.05, v));
      litInner.push(at(-0.5 - 0.1 * Math.sin(i * 1.3 + ph[1]!) - 0.12 * v, v));
    }
    shape(ctx, [...litEdge, ...litInner.slice().reverse()], { fill: rgba(tones.highlight, 0.2), smooth: true });
    // Layers that bulge downwards like latitude lines on a ball.
    for (let k = 0; k < 3; k++) {
      const v = 0.16 + k * 0.2 + rand.range(-0.03, 0.03);
      const a0 = rand.range(-0.95, -0.45);
      const a1 = rand.range(0.25, 0.95);
      const pts: Vec2[] = [];
      for (let i = 0; i <= 10; i++) {
        const u = a0 + ((a1 - a0) * i) / 10;
        const p = at(u, v + 0.018 * Math.sin(u * 6 + ph[k]!));
        pts.push([p[0], p[1] + (1 - u * u) * h * 0.04]);
      }
      shape(ctx, pts, { stroke: rgba(tones.deep, 0.46), width: 0.9, closed: false, smooth: true });
      shape(ctx, shifted(pts, 0.4, 1.2), { stroke: rgba(tones.highlight, 0.26), width: 0.7, closed: false, smooth: true });
    }
    for (let i = 0; i < 3; i++) {
      const a = at(rand.range(-0.75, 0.6), rand.range(0.7, 0.92));
      shape(ctx, jagged(rand, a, [a[0] + rand.range(-3, 3), a[1] + h * rand.range(0.16, 0.32)], 5, 1.1), { stroke: rgba(o.ink, 0.5), width: 0.85, closed: false });
    }
    stipple(ctx, rand, polygon, Math.round(w * 0.5), { color: rgba(tones.deep, 0.9), radius: 0.6, alpha: 0.4 });
    stipple(ctx, rand, [at(-0.95, 0.9), at(-0.2, 1), at(-0.3, 0.3), at(-0.95, 0.2)], Math.round(w * 0.14), { color: tones.highlight, radius: 0.55, alpha: 0.55 });

    if (o.cap) {
      const cap = shades(o.cap);
      const share = o.capShare ?? 0.2;
      const vc = (u: number): number => 1 - share * (0.75 + 0.25 * Math.sin(u * 5 + ph[2]!) + 0.12 * Math.sin(u * 11 + ph[3]!));
      const lower: Vec2[] = [];
      for (let i = 0; i <= 12; i++) {
        const u = 1 - (i / 12) * 2;
        lower.push(at(u, vc(u)));
      }
      const capPoly: Vec2[] = [...L.filter((_, i) => i / N * 0.985 >= vc(-1)), ...R.filter((_, i) => i / N * 0.985 >= vc(1)).reverse(), ...lower];
      shape(ctx, capPoly, { fill: linearGradient(ctx, cx - hw, baseY - h, cx + hw * 0.8, baseY - h * 0.6, [[0, cap.light], [0.5, cap.base], [1, cap.shade]]) });
      shape(ctx, lower, { stroke: rgba(cap.deep, 0.75), width: 1, closed: false, smooth: true });
      shape(ctx, shifted(lower, 0, -1.1), { stroke: rgba(cap.highlight, 0.4), width: 0.8, closed: false, smooth: true });
    }
  });

  shape(ctx, polygon, { stroke: o.ink, width: lw * 1.2 });
  const hl = L.filter((_, i) => i > 3 && i < N - 2).map((p): Vec2 => [p[0] + lw, p[1] + lw * 0.4]);
  shape(ctx, hl, { stroke: rgba(tones.highlight, 0.5), width: 0.9, closed: false, smooth: true });
  brushLine(ctx, [L[0]!, ...front.slice(1, -1), R[0]!].reverse(), o.ink, lw * 1.3);
  return { polygon, at };
}

export interface MouthOptions {
  cx: number;
  /** Ground line at the centre of the opening. */
  baseY: number;
  w: number;
  h: number;
  rock: string;
  ink: string;
  rand: Rng;
  /** Roof profile exponent: low = boxy, high = pointed. Default 0.8. */
  arch?: number;
  /** Stalactites hanging from the roof. Default 3. */
  teeth?: number;
  /** Color of eyes glowing in the dark. */
  eyes?: string;
  /** Light coming from deep inside (crystals, fire). */
  glow?: string;
  /** Tone of the floor close to the entrance. */
  floor?: string;
  /** Thickness of the stone lip around the opening. */
  rim?: number;
  /** Wooden mine frame instead of a bare lip. */
  timber?: boolean;
  /** Drawn inside the opening, clipped to it (crystals, fire...). */
  inside?: () => void;
}

export interface MouthGeometry {
  poly: Vec2[];
  hw: number;
  hh: number;
}

const WOOD = { lit: '#b98550', base: '#8a5e34', shade: '#5f3e22' } as const;

/** A dark cave opening with a stone lip, a lit inner wall, a pale floor and hanging teeth of rock. */
export function drawCaveMouth(ctx: Ctx2D, o: MouthOptions): MouthGeometry {
  const { rand, cx, baseY, ink } = o;
  const hw = o.w / 2;
  const hh = o.h;
  const arch = o.arch ?? 0.8;
  const rim = o.timber ? 0.6 : o.rim ?? Math.max(1.8, o.w * 0.08);
  const tones = shades(o.rock);
  const ph1 = rand.range(0, TAU);
  const ph2 = rand.range(0, TAU);
  const lean = rand.range(-0.08, 0.08) * hw;
  const roof = (t: number, grow = 0): Vec2 => {
    const a = Math.PI * (1 - t);
    const s = Math.max(0, Math.sin(a));
    const wob = 1 + 0.05 * Math.sin(t * 9 + ph1) + 0.03 * Math.sin(t * 17 + ph2);
    return [cx + Math.cos(a) * (hw + grow) + lean * s, baseY - (hh + grow * 0.8) * Math.pow(s, arch) * wob];
  };
  const n = 20;
  const roofPts: Vec2[] = [];
  const roofOuter: Vec2[] = [];
  for (let i = 0; i <= n; i++) {
    roofPts.push(roof(i / n));
    roofOuter.push(roof(i / n, rim));
  }
  const fy = Math.min(hw * 0.22, 4);
  const floorPts: Vec2[] = [];
  const floorOuter: Vec2[] = [];
  for (let j = 1; j <= 8; j++) {
    const t = 1 - j / 9;
    const x = cx + Math.cos(Math.PI * (1 - t)) * hw;
    const y = baseY + fy * Math.sin(Math.PI * t) ** 0.7;
    floorPts.push([x, y]);
    floorOuter.push([cx + (x - cx) * (1 + rim / hw), y + 0.7]);
  }
  const poly: Vec2[] = [...roofPts, ...floorPts];
  const ring: Vec2[] = [...roofOuter, ...floorOuter];
  const mid = baseY - hh * 0.4;

  if (!o.timber) {
    shape(ctx, ring, { fill: ink, stroke: ink, width: 1.6 });
    shape(ctx, ring, { fill: linearGradient(ctx, cx - hw - rim, baseY - hh, cx + hw + rim, baseY, [[0, tones.highlight], [0.5, tones.light], [1, tones.base]]) });
    const joints = Math.max(4, Math.round((hw + hh) / 4));
    for (let i = 1; i < joints; i++) {
      const t = i / joints + rand.range(-0.02, 0.02);
      shape(ctx, [roof(t, -0.2), roof(t, rim + 0.2)], { stroke: rgba(tones.deep, 0.55), width: 0.7, closed: false });
    }
    shape(ctx, ring, { stroke: ink, width: 1.2 });
  }

  shape(ctx, poly, { fill: '#0b0705' });
  clipped(ctx, poly, () => {
    const wallLit = mix(o.rock, '#2a1d14', 0.42);
    shape(ctx, poly, { fill: linearGradient(ctx, cx - hw, 0, cx + hw, 0, [[0, wallLit], [0.6, mix(wallLit, '#120c08', 0.6)], [1, '#140d09']]) });
    const inner = poly.map((p): Vec2 => [cx + (p[0] - cx) * 0.8 + hw * 0.04, mid + (p[1] - mid) * 0.8 + hh * 0.05]);
    shape(ctx, inner, { fill: radialGradient(ctx, cx, mid, 0, Math.max(hw, hh) * 0.95, [[0, '#030201'], [0.6, '#0d0806'], [1, '#1f1610']], cx + hw * 0.1, mid) });
    shape(ctx, roofPts, { stroke: rgba(tones.light, 0.28), width: 1.4, closed: false, smooth: true });
    if (o.glow) {
      shape(ctx, poly, { fill: radialGradient(ctx, cx, mid + hh * 0.1, 0, Math.max(hw, hh) * 1.05, [[0, rgba(o.glow, 0.92)], [0.45, rgba(o.glow, 0.5)], [1, rgba(o.glow, 0)]]) });
    }
    o.inside?.();
    if (o.floor) {
      shape(ctx, [[cx - hw - 1, baseY - hh * 0.22], [cx + hw + 1, baseY - hh * 0.22], [cx + hw + 1, baseY + fy + 1], [cx - hw - 1, baseY + fy + 1]], {
        fill: linearGradient(ctx, 0, baseY - hh * 0.22, 0, baseY + fy, [[0, rgba(o.floor, 0)], [0.55, rgba(o.floor, 0.22)], [1, rgba(o.floor, 0.94)]]),
      });
    }
    const teeth = o.teeth ?? 3;
    const toothTone = mix(o.rock, '#1a120d', 0.3);
    for (let i = 0; i < teeth; i++) {
      const t = 0.16 + (0.68 * (i + rand.range(0.2, 0.8))) / teeth;
      const a = roof(t - 0.034);
      const b = roof(t + 0.034);
      const len = hh * rand.range(0.13, 0.26);
      const tip: Vec2 = [(a[0] + b[0]) / 2 + rand.range(-0.8, 0.8), (a[1] + b[1]) / 2 + len];
      shape(ctx, [a, tip, b], { fill: toothTone, stroke: rgba(ink, 0.9), width: 0.8 });
      shape(ctx, [[a[0] + 0.6, a[1] + 0.5], [tip[0] - 0.2, tip[1] - 0.8]], { stroke: rgba(tones.light, 0.45), width: 0.6, closed: false });
    }
  });
  shape(ctx, poly, { stroke: rgba(ink, 0.9), width: 1 });

  if (o.eyes) {
    const ex = cx + hw * 0.1;
    const ey = baseY - hh * 0.36;
    const gap = Math.max(2.2, hw * 0.2);
    softBlob(ctx, ex, ey, gap * 2.2, gap * 1.3, o.eyes, 0.5);
    for (const side of [-1, 1]) {
      ellipse(ctx, ex + side * gap, ey, Math.max(0.9, hw * 0.07), Math.max(0.7, hw * 0.05), { fill: o.eyes, rotation: side * 0.2 });
    }
  }

  if (o.timber) {
    const pw = Math.max(2.6, o.w * 0.075);
    const top = baseY - hh * 0.92;
    const post = (x: number): void => {
      shape(ctx, [[x - pw / 2, baseY + 1], [x + pw / 2, baseY + 1], [x + pw / 2, top], [x - pw / 2, top]], { fill: linearGradient(ctx, x - pw / 2, 0, x + pw / 2, 0, [WOOD.lit, WOOD.base, WOOD.shade]), stroke: ink, width: 0.9 });
      shape(ctx, [[x - pw * 0.2, baseY - 1], [x - pw * 0.2, top + 2]], { stroke: rgba(WOOD.shade, 0.7), width: 0.6, closed: false });
    };
    post(cx - hw + 0.5);
    post(cx + hw - 0.5);
    const bw = hw * 2 + pw * 2.2;
    const bh = Math.max(3, pw * 1.1);
    shape(ctx, [[cx - bw / 2, top - bh * 0.5], [cx + bw / 2, top - bh * 0.5], [cx + bw / 2, top + bh * 0.5], [cx - bw / 2, top + bh * 0.5]], { fill: linearGradient(ctx, 0, top - bh / 2, 0, top + bh / 2, [WOOD.lit, WOOD.base, WOOD.shade]), stroke: ink, width: 0.9 });
    const br = hw * 0.34;
    for (const side of [-1, 1]) {
      const x0 = cx + side * (hw - pw * 0.4);
      shape(ctx, [[x0, top + bh * 0.4 + br], [x0, top + bh * 0.4 + br - pw * 0.8], [x0 - side * br, top + bh * 0.4], [x0 - side * br, top + bh * 0.4 + pw * 0.8]], { fill: WOOD.base, stroke: ink, width: 0.8 });
    }
  }

  return { poly, hw, hh };
}

export interface CrystalOptions {
  /** Centre of the base. */
  x: number;
  y: number;
  w: number;
  h: number;
  tilt?: number;
  color: string;
  ink: string;
  /** Strength of the soft halo behind it (0 = none). */
  halo?: number;
  /** Sideways offset of the tip, -1..1. */
  tip?: number;
}

/** A six-sided crystal prism with a pointed top, light on the left facets and dark on the right. */
export function drawCrystal(ctx: Ctx2D, o: CrystalOptions): void {
  const { x, y, w, h } = o;
  const t = shades(o.color);
  const tilt = o.tilt ?? 0;
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  const P = (px: number, py: number): Vec2 => [x + px * cos - py * sin, y + px * sin + py * cos];
  const sh = h * 0.72;
  const split = -w * 0.08;
  const bl = P(-w / 2, 0);
  const bc = P(split, w * 0.13);
  const br = P(w / 2, 0);
  const sl = P(-w / 2, -sh);
  const sc = P(split, -sh + w * 0.13);
  const sr = P(w / 2, -sh);
  const tp = P((o.tip ?? 0) * w * 0.25, -h);
  if (o.halo) softBlob(ctx, x - sin * h * 0.5, y - cos * h * 0.5, h * 0.75, h * 0.62, o.color, o.halo);
  shape(ctx, [bl, bc, br, sr, tp, sl], { fill: o.ink, stroke: o.ink, width: 1.5 });
  shape(ctx, [bl, bc, sc, sl], { fill: linearGradient(ctx, bl[0], bl[1], sl[0], sl[1], [t.light, t.base]) });
  shape(ctx, [bc, br, sr, sc], { fill: linearGradient(ctx, bc[0], bc[1], br[0], br[1], [t.shade, t.deep]) });
  shape(ctx, [sl, sc, tp], { fill: t.highlight });
  shape(ctx, [sc, sr, tp], { fill: t.base });
  shape(ctx, [bc, sc, tp], { stroke: rgba(o.ink, 0.5), width: 0.7, closed: false });
  const s0 = P(-w * 0.34, -h * 0.14);
  const s1 = P(-w * 0.34, -sh * 0.8);
  shape(ctx, [s0, s1], { stroke: 'rgba(255,255,255,0.62)', width: Math.max(0.7, w * 0.07), closed: false });
}

export interface ClusterOptions {
  cx: number;
  baseY: number;
  /** Width of the whole cluster. */
  spread: number;
  /** Height of the tallest crystal. */
  h: number;
  count: number;
  colors: readonly string[];
  ink: string;
  halo?: number;
}

/** A fan of crystals growing out of one spot, tallest in the middle. */
export function drawCrystalCluster(ctx: Ctx2D, rand: Rng, o: ClusterOptions): void {
  const items: { x: number; y: number; w: number; h: number; tilt: number; c: string }[] = [];
  for (let i = 0; i < o.count; i++) {
    const f = o.count === 1 ? 0 : (i / (o.count - 1)) * 2 - 1;
    const tall = 1 - Math.abs(f) * 0.5 + rand.range(-0.1, 0.1);
    const h = o.h * clamp(tall, 0.35, 1.05);
    items.push({
      x: o.cx + f * o.spread * 0.4 + rand.range(-0.8, 0.8),
      y: o.baseY + rand.range(-1, 1.2) - Math.abs(f) * 0.6,
      w: Math.max(2.6, h * rand.range(0.24, 0.34)),
      h,
      tilt: f * 0.38 + rand.range(-0.1, 0.1),
      c: rand.pick(o.colors),
    });
  }
  items.sort((a, b) => a.h - b.h);
  for (const c of items) drawCrystal(ctx, { x: c.x, y: c.y, w: c.w, h: c.h, tilt: c.tilt, color: c.c, ink: o.ink, halo: o.halo, tip: rand.range(-0.6, 0.6) });
}

/** A tiny bleached skull. */
export function drawSkull(ctx: Ctx2D, x: number, y: number, r: number, ink: string): void {
  shape(ctx, [[x - r * 0.5, y + r * 0.3], [x + r * 0.5, y + r * 0.3], [x + r * 0.38, y + r * 0.95], [x - r * 0.38, y + r * 0.95]], { fill: '#d6c9a8', stroke: ink, width: 0.8 });
  ellipse(ctx, x, y - r * 0.1, r, r * 0.85, { fill: linearGradient(ctx, x - r, y - r, x + r, y + r, ['#f1e9d2', '#d9ceb0']), stroke: ink, width: 0.9 });
  ellipse(ctx, x - r * 0.4, y - r * 0.05, r * 0.27, r * 0.32, { fill: '#1a120d' });
  ellipse(ctx, x + r * 0.4, y - r * 0.05, r * 0.27, r * 0.32, { fill: '#1a120d' });
  shape(ctx, [[x, y + r * 0.2], [x - r * 0.12, y + r * 0.45], [x + r * 0.12, y + r * 0.45]], { fill: '#1a120d' });
  shape(ctx, [[x - r * 0.25, y + r * 0.7], [x + r * 0.25, y + r * 0.7]], { stroke: rgba(ink, 0.7), width: 0.6, closed: false });
}

/** A scatter of bones: short thick sticks with knobbed ends. */
export function drawBones(ctx: Ctx2D, rand: Rng, x: number, y: number, spread: number, count: number, ink: string): void {
  for (let i = 0; i < count; i++) {
    const bx = x + rand.range(-1, 1) * spread;
    const by = y + rand.range(-0.4, 0.4) * spread * 0.4;
    const a = rand.range(-0.7, 0.7);
    const len = rand.range(2.6, 4.4);
    const dx = Math.cos(a) * len;
    const dy = Math.sin(a) * len;
    shape(ctx, [[bx - dx, by - dy], [bx + dx, by + dy]], { stroke: ink, width: 2.1, closed: false });
    shape(ctx, [[bx - dx, by - dy], [bx + dx, by + dy]], { stroke: '#e8dfc6', width: 1.1, closed: false });
    ellipse(ctx, bx - dx, by - dy, 1.1, 1, { fill: '#e8dfc6', stroke: ink, width: 0.6 });
    ellipse(ctx, bx + dx, by + dy, 1.1, 1, { fill: '#e8dfc6', stroke: ink, width: 0.6 });
  }
}
