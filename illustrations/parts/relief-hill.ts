import { mix, rgba } from '../kit/colors';
import { clipped, ellipse, linearGradient, shape, softBlob, stipple } from '../kit/draw';
import { catmullRom, ribbon } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { STONE, drawBoulder, pointIn, shifted, tuft } from './relief-common';

export interface HillPalette {
  lit: string;
  base: string;
  shade: string;
  deep: string;
  /** Darker grass blades on the lit side. */
  tuft: string;
  /** Pale blades near the summit. */
  tuftLight: string;
}

export const HILL = {
  green: { lit: '#b6d174', base: '#8eaf56', shade: '#648a46', deep: '#486b3b', tuft: '#4d7634', tuftLight: '#d6e89f' },
  brown: { lit: '#cdac78', base: '#aa885a', shade: '#80664a', deep: '#5e4936', tuft: '#715a35', tuftLight: '#e4cb9a' },
  dry: { lit: '#e4d086', base: '#c8b064', shade: '#9a864c', deep: '#716139', tuft: '#8a7634', tuftLight: '#f3e8b0' },
  tundra: { lit: '#acc09a', base: '#889e7d', shade: '#637c6c', deep: '#4a615e', tuft: '#52705e', tuftLight: '#d1e2c7' },
  rocky: { lit: '#c3b99f', base: '#a0957f', shade: '#756c63', deep: '#544d4d', tuft: '#6b7550', tuftLight: '#d3cfa6' },
} as const satisfies Record<string, HillPalette>;

export interface HillOptions {
  cx: number;
  /** Ground line at the left and right feet. */
  baseY: number;
  w: number;
  h: number;
  palette: HillPalette;
  ink: string;
  rand: Rng;
  /** Summit position along the width (0.5 = centred). */
  apex?: number;
  /** Profile exponent: lower = rounder dome, higher = pointier. Default 0.72. */
  curve?: number;
  /** Depth of the rounded foot as a fraction of `h`. Default 0.16. */
  foot?: number;
  /** Snow cover thickness at the summit as a fraction of `h` (0 = none). */
  snow?: number;
  /** Grass blades. Default scales with the width. */
  tufts?: number;
  /** Small stones lying on the slope. */
  rocks?: number;
  shadow?: boolean;
}

export interface HillGeometry {
  apex: Vec2;
  /** Silhouette from the left foot over the summit to the right foot. */
  top: Vec2[];
  polygon: Vec2[];
  left: number;
  w: number;
  /** Height of the silhouette at `x`. */
  topAt: (x: number) => number;
  /** Lowest edge of the foot. */
  bottom: number;
}

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

/** Ink line that swells in the middle and thins out at both ends, like a brush stroke. */
export function brushLine(ctx: Ctx2D, pts: readonly Vec2[], ink: string, width: number, ends = 0.4): void {
  const smooth = catmullRom(pts, 4);
  const widths = smooth.map((_, i) => width * (ends + (1 - ends) * Math.sin((Math.PI * i) / (smooth.length - 1)) ** 0.45));
  shape(ctx, ribbon(smooth, widths), { fill: ink, smooth: false });
}

/** A soft painted mound: lit upper left, shaded crescent on the right, grass blades and an ink contour on top. */
export function drawHill(ctx: Ctx2D, o: HillOptions): HillGeometry {
  const { rand, cx, baseY, w, h, palette: p } = o;
  const left = cx - w / 2;
  const a = clamp(o.apex ?? 0.5, 0.2, 0.8);
  const curve = o.curve ?? 0.72;
  const foot = (o.foot ?? 0.16) * h;
  const lw = clamp(w * 0.02, 1.1, 2);
  const n = 28;

  const top: Vec2[] = [];
  const ph1 = rand.range(0, 6.28);
  const ph2 = rand.range(0, 6.28);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = t <= a ? (0.5 * t) / a : 0.5 + (0.5 * (t - a)) / (1 - a);
    const f = Math.sin(Math.PI * u) ** curve;
    // Slow undulation keeps the silhouette from being a perfect mirror-symmetric dome.
    const wave = (Math.sin(t * 7 + ph1) * 0.022 + Math.sin(t * 13 + ph2) * 0.012) * Math.sin(Math.PI * t) ** 0.6;
    const wob = i === 0 || i === n ? 0 : (rand.range(-0.006, 0.006) + wave) * h;
    top.push([left + w * t, baseY - h * f + wob]);
  }
  const bottom: Vec2[] = [];
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    bottom.push([left + w * t, baseY + foot * Math.sin(Math.PI * t) ** 0.8]);
  }
  const polygon: Vec2[] = [...top, ...bottom.slice(1, -1)];
  const apex = top.reduce((m, q) => (q[1] < m[1] ? q : m), top[0]!);
  const iA = top.indexOf(apex);
  const yTop = apex[1];
  const yBot = baseY + foot;
  const topAt = (x: number): number => {
    const t = clamp((x - left) / w, 0, 1) * n;
    const i = Math.min(n - 1, Math.floor(t));
    return top[i]![1] + (top[i + 1]![1] - top[i]![1]) * (t - i);
  };

  if (o.shadow !== false) softBlob(ctx, cx + w * 0.1, baseY + foot * 0.75, w * 0.62, Math.max(3, foot * 1.15 + 2), '#1d160c', 0.34);
  shape(ctx, polygon, { fill: linearGradient(ctx, left, yTop, left + w, yBot, [[0, p.lit], [0.42, p.base], [0.8, p.shade], [1, p.deep]]) });

  clipped(ctx, polygon, () => {
    // Two shade bands on the right form the painted terminator.
    const band = (shift: number, alpha: number): void => {
      const tb = clamp(a + shift, 0.15, 0.85);
      const tb0 = Math.round(tb * n);
      const iS = Math.min(n - 1, iA + 2);
      const lower = bottom.slice(0, n - tb0 + 1);
      const from = lower[lower.length - 1]!;
      const to = top[iS]!;
      const c: Vec2 = [(from[0] + to[0]) / 2 + w * 0.13, (from[1] + to[1]) / 2 - h * 0.06];
      const inner: Vec2[] = [];
      for (let k = 1; k < 7; k++) {
        const t = k / 7;
        inner.push([(1 - t) ** 2 * from[0] + 2 * (1 - t) * t * c[0] + t * t * to[0], (1 - t) ** 2 * from[1] + 2 * (1 - t) * t * c[1] + t * t * to[1]]);
      }
      shape(ctx, [...top.slice(iS), ...lower, ...inner], { fill: rgba(p.deep, alpha), smooth: false });
    };
    band(-0.12, 0.2);
    band(0.1, 0.26);
    softBlob(ctx, apex[0] - w * 0.16, yTop + h * 0.26, w * 0.28, h * 0.2, '#fffbe0', 0.28);
    shape(ctx, bottom, { stroke: rgba(p.deep, 0.35), width: foot * 0.9 + 1.5, closed: false, smooth: true });

    // Grass blades.
    const count = o.tufts ?? Math.round(w / 7);
    const area = polygon.map((q): Vec2 => [apex[0] + (q[0] - apex[0]) * 0.94, q[1] + (yBot - q[1]) * 0.06]);
    for (let i = 0; i < count; i++) {
      const q = pointIn(rand, area);
      if (!q || q[1] < topAt(q[0]) + h * 0.1) continue;
      const shadeSide = q[0] > apex[0] + w * 0.12;
      const bright = !shadeSide && q[1] < yTop + h * 0.45;
      tuft(ctx, q[0], q[1], rand.range(2.2, 3.6), bright ? p.tuftLight : shadeSide ? mix(p.tuft, p.deep, 0.5) : p.tuft, 0.9);
    }
    stipple(ctx, rand, polygon, Math.round(w * 0.5), { color: p.deep, radius: 0.5, alpha: 0.3 });

    // Short pen strokes that follow the slope on the shaded side.
    const hatches = Math.round(w / 11);
    for (let i = 0; i < hatches; i++) {
      const k = clamp(Math.round(rand.range(a + 0.12, 0.9) * n), 1, n - 1);
      const p0 = top[k]!;
      const p1 = top[k + 1]!;
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
      const ux = (p1[0] - p0[0]) / len;
      const uy = (p1[1] - p0[1]) / len;
      const L = rand.range(0.05, 0.1) * w;
      const sy = p0[1] + rand.range(0.12, 0.55) * (yBot - p0[1]);
      shape(ctx, [[p0[0], sy], [p0[0] + ux * L * 0.5, sy + uy * L * 0.5 + 0.7], [p0[0] + ux * L, sy + uy * L + 0.4]], { stroke: rgba(p.deep, 0.45), width: 0.8, closed: false, smooth: true });
    }
    shape(ctx, shifted(top.slice(1, iA + 1), lw * 0.9, lw * 1.2), { stroke: rgba(p.tuftLight, 0.6), width: lw * 0.9, closed: false, smooth: true });
  });

  if (o.snow && o.snow > 0) {
    const depth = o.snow * h;
    const phase = rand.range(0, 6);
    const lobe = w * rand.range(0.1, 0.15);
    const m = 56;
    const upper: Vec2[] = [];
    const lower: Vec2[] = [];
    for (let i = 0; i <= m; i++) {
      const t = i / m;
      const x = left + w * t;
      const y = topAt(x);
      const reach = Math.max(0, 1 - Math.abs(t - a) / 0.62) ** 0.6;
      // Round lobes separated by short notches, like snow sliding down the slope.
      const scallop = 0.55 + 0.6 * Math.abs(Math.sin((Math.PI * (x - left)) / lobe + phase)) ** 0.55;
      upper.push([x, y]);
      lower.push([x, y + depth * reach * scallop]);
    }
    const cap: Vec2[] = [...upper, ...lower.slice().reverse()];
    clipped(ctx, polygon, () => {
      shape(ctx, cap, { fill: linearGradient(ctx, left, yTop, left + w, yTop + depth * 1.6, ['#ffffff', '#f2f7fd', '#c3d3e8']), smooth: false });
      shape(ctx, cap, { fill: linearGradient(ctx, apex[0] - w * 0.1, 0, left + w, 0, [[0, rgba('#7f93bd', 0)], [1, rgba('#7f93bd', 0.38)]]), smooth: false });
      shape(ctx, shifted(lower, 0.5, 1.3), { stroke: rgba('#243044', 0.3), width: 1.5, closed: false, smooth: true });
      shape(ctx, lower, { stroke: rgba('#4a5c80', 0.6), width: 0.8, closed: false, smooth: true });
    });
  }

  for (let i = 0; i < (o.rocks ?? 0); i++) {
    const q = pointIn(rand, polygon.map((v): Vec2 => [apex[0] + (v[0] - apex[0]) * 0.8, v[1]]));
    if (!q || q[1] < topAt(q[0]) + h * 0.22) continue;
    const r = rand.range(2.2, 3.6);
    drawBoulder(ctx, { cx: q[0], cy: q[1], rx: r, ry: r * 0.8, rock: STONE.gray, ink: o.ink, rand, shadow: false });
  }

  shape(ctx, bottom, { stroke: rgba(o.ink, 0.5), width: lw * 0.75, closed: false, smooth: true });
  brushLine(ctx, top, o.ink, lw * 1.25, 0.35);
  return { apex, top, polygon, left, w, topAt, bottom: yBot };
}

/** A small round shrub: three lobes with a lit crown. */
export function drawBush(ctx: Ctx2D, rand: Rng, x: number, y: number, r: number, leaf: string, ink: string): void {
  const lobes: [number, number, number][] = [
    [-0.62, 0, 0.62],
    [0.6, 0.05, 0.58],
    [0, -0.4, 0.76],
  ];
  softBlob(ctx, x + r * 0.2, y + r * 0.1, r * 1.3, r * 0.42, '#1d160c', 0.3);
  const lw = Math.max(0.7, r * 0.1);
  for (const [dx, dy, k] of lobes) {
    const rr = r * k * rand.range(0.92, 1.08);
    const cx = x + dx * r;
    const cy = y + dy * r - rr * 0.35;
    ellipse(ctx, cx, cy, rr, rr * 0.88, { fill: linearGradient(ctx, cx - rr, cy - rr, cx + rr, cy + rr, [mix(leaf, '#fff3c0', 0.35), leaf, mix(leaf, '#16122e', 0.35)]), stroke: ink, width: lw });
  }
  ellipse(ctx, x - r * 0.15, y - r * 1.08, r * 0.3, r * 0.2, { fill: rgba('#fff6c8', 0.45) });
}
