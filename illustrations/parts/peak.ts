import { mix, rgba } from '../kit/colors';
import { clipped, hatch, linearGradient, shades, shape, softBlob, taper, type Shades } from '../kit/draw';
import { lerp2 } from '../kit/math';
import { jagged } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';

export interface PeakOptions {
  /** Horizontal center of the base. */
  cx: number;
  /** Y of the base line (where the mountain meets the ground). */
  baseY: number;
  /** Base width / height of the peak in design units. */
  w: number;
  h: number;
  /** Main rock color. Light/shade tones are derived from it. */
  rock: string;
  /** Fraction of the height covered by snow (0 = none). */
  snow?: number;
  /** Shift the apex sideways, as a fraction of `w` (-0.25..0.25). */
  lean?: number;
  /** Ink color for outlines. */
  ink: string;
  /** Number of sub-ridges painted on each face (default 2). */
  gullies?: number;
  /** Soft contact shadow under the peak. Default true. */
  shadow?: boolean;
  /** Extra darkness for stormy mountains (0..1). */
  gloom?: number;
  /** 1 = normal, >1 = more jagged, craggy slopes. */
  rugged?: number;
  rand: Rng;
}

/** A sub-ridge running down one face of the peak. */
export interface Spur {
  side: 'left' | 'right';
  line: Vec2[];
}

/** Faces and outlines of a peak, exposed so symbols can add details (lava, cave mouths, flags…). */
export interface PeakGeometry {
  apex: Vec2;
  left: Vec2;
  right: Vec2;
  ridgeBase: Vec2;
  /** Apex → left foot. */
  leftSlope: Vec2[];
  /** Apex → right foot. */
  rightSlope: Vec2[];
  /** Apex → foot of the ridge. */
  ridge: Vec2[];
  leftFace: Vec2[];
  rightFace: Vec2[];
  silhouette: Vec2[];
  spurs: Spur[];
}

/**
 * A concave, craggy slope from `from` (apex) to `to` (foot). `inward` is the side the mountain lies on.
 * A shoulder (a small secondary summit) breaks the silhouette so it never looks like a plain triangle.
 */
function slope(rand: Rng, from: Vec2, to: Vec2, inward: 1 | -1, w: number, rugged: number): Vec2[] {
  const out: Vec2[] = [from];
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * inward;
  const ny = (dx / len) * inward;
  const steps = Math.round(12 + 5 * (rugged - 1));
  const shoulderAt = rand.range(0.4, 0.66);
  const shoulderSize = w * rand.range(0.03, 0.06) * Math.min(1.6, rugged);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const concave = Math.sin(Math.PI * t) * w * 0.05;
    const jit = rand.range(-1, 1) * w * 0.017 * rugged;
    const bump = Math.max(0, 1 - Math.abs(t - shoulderAt) / 0.1) * shoulderSize;
    const o = concave + jit - bump;
    out.push([from[0] + dx * t + nx * o, from[1] + dy * t + ny * o]);
  }
  out.push(to);
  return out;
}

export function peakGeometry(o: PeakOptions): PeakGeometry {
  const { rand, cx, baseY, w, h } = o;
  const apex: Vec2 = [cx + (o.lean ?? 0) * w, baseY - h];
  const left: Vec2 = [cx - w / 2, baseY - rand.range(0, h * 0.02)];
  const right: Vec2 = [cx + w / 2, baseY - rand.range(0, h * 0.02)];
  const ridgeBase: Vec2 = [apex[0] + w * rand.range(0.02, 0.12), baseY + h * 0.02];
  const rugged = o.rugged ?? 1;

  const leftSlope = slope(rand, apex, left, -1, w, rugged);
  const rightSlope = slope(rand, apex, right, 1, w, rugged);

  const ridge: Vec2[] = [apex];
  for (let i = 1; i < 7; i++) {
    const p = lerp2(apex, ridgeBase, i / 7);
    ridge.push([p[0] + rand.range(-1, 1) * w * 0.026, p[1]]);
  }
  ridge.push(ridgeBase);

  const footL: Vec2 = [lerp2(ridgeBase, left, 0.5)[0], baseY + h * rand.range(0, 0.04)];
  const footR: Vec2 = [lerp2(ridgeBase, right, 0.5)[0], baseY + h * rand.range(0, 0.04)];

  const leftFace: Vec2[] = [...leftSlope, footL, ridgeBase, ...ridge.slice(1, -1).reverse()];
  const rightFace: Vec2[] = [...ridge, footR, ...rightSlope.slice(1).reverse()];
  const silhouette: Vec2[] = [...leftSlope, footL, ridgeBase, footR, ...rightSlope.slice(1).reverse()];

  const spurs: Spur[] = [];
  const count = o.gullies ?? 2;
  for (let i = 0; i < count; i++) {
    for (const side of ['left', 'right'] as const) {
      const lit = side === 'left';
      const start = lerp2(apex, ridgeBase, rand.range(0.1, 0.5));
      const u = (i + rand.range(0.25, 0.85)) / count;
      const along = lit ? lerp2(left, ridgeBase, 0.12 + 0.76 * u) : lerp2(ridgeBase, right, 0.1 + 0.78 * u);
      const end: Vec2 = [along[0], baseY + h * rand.range(-0.02, 0.03)];
      spurs.push({ side, line: jagged(rand, start, end, 9, w * 0.012 * rugged) });
    }
  }
  return { apex, left, right, ridgeBase, leftSlope, rightSlope, ridge, leftFace, rightFace, silhouette, spurs };
}

/** A one-sided shading wedge that starts as a point and widens down the line. `side` is -1 (left) or 1 (right). */
function wedge(ctx: Ctx2D, line: Vec2[], width: number, side: -1 | 1, fill: string): void {
  const n = line.length - 1;
  const shifted = line.map((p, i): Vec2 => [p[0] + side * (width / 2) * (i / n), p[1]]);
  taper(ctx, shifted, 0.15, width, fill, true);
}

/** One lit/shaded mountain peak with sub-ridges, optional snow cap and ink outline. */
export function drawPeak(ctx: Ctx2D, o: PeakOptions): PeakGeometry {
  const { rand } = o;
  const g = peakGeometry(o);
  const { apex, left, right, ridgeBase } = g;
  const tones = shades(o.gloom ? mix(o.rock, '#1b1b22', o.gloom) : o.rock);

  if (o.shadow !== false) {
    softBlob(ctx, o.cx + o.w * 0.14, o.baseY + o.h * 0.02, o.w * 0.66, o.h * 0.13, '#1d160c', 0.36);
  }

  // Lit (left) and shaded (right) faces.
  shape(ctx, g.leftFace, { fill: linearGradient(ctx, left[0], apex[1], ridgeBase[0], o.baseY, [tones.highlight, tones.light, tones.base]) });
  shape(ctx, g.rightFace, { fill: linearGradient(ctx, apex[0], apex[1], right[0], o.baseY, [tones.base, tones.shade, tones.deep]) });

  // Sub-ridges: the right flank of each ridge is in shadow, its left flank catches the light.
  const wide = o.w * 0.14;
  for (const face of ['left', 'right'] as const) {
    const lit = face === 'left';
    const poly = lit ? g.leftFace : g.rightFace;
    clipped(ctx, poly, () => {
      for (const s of g.spurs) {
        if (s.side !== face) continue;
        wedge(ctx, s.line, wide * rand.range(0.8, 1.2), 1, rgba(lit ? tones.shade : tones.deep, lit ? 0.5 : 0.55));
        wedge(ctx, s.line, wide * 0.55, -1, rgba(tones.highlight, lit ? 0.42 : 0.2));
        shape(ctx, s.line, { stroke: rgba(o.ink, lit ? 0.5 : 0.4), width: Math.max(0.7, o.w * 0.007), closed: false });
      }
      // Pen hatching on the shaded face gives the engraved look of hand-drawn maps.
      if (!lit) hatch(ctx, rand, poly, { angle: -1.05, spacing: Math.max(1.6, o.w * 0.026), color: tones.deep, width: 0.7, alpha: 0.32, ragged: true, skip: 0.25 });
    });
  }

  // Foot shading blends the peak into the ground.
  shape(ctx, g.silhouette, { fill: linearGradient(ctx, 0, o.baseY - o.h * 0.3, 0, o.baseY + o.h * 0.04, [rgba(tones.deep, 0), rgba(tones.deep, 0.42)]) });

  // Fallen rock at the foot.
  for (let i = 0; i < 4; i++) {
    const x = left[0] + (right[0] - left[0]) * rand.range(0.05, 0.95);
    const r = o.w * rand.range(0.035, 0.07);
    softBlob(ctx, x, o.baseY + o.h * 0.01, r, r * 0.45, tones.deep, 0.32);
  }

  if (o.snow && o.snow > 0) drawSnowCap(ctx, g, o, tones);

  // Light catches the left edge; ink traces both slopes and the ridge.
  clipped(ctx, g.silhouette, () => {
    shape(ctx, g.leftSlope.map((p): Vec2 => [p[0] + o.w * 0.014, p[1] + o.w * 0.01]), {
      stroke: rgba(tones.highlight, 0.55),
      width: Math.max(0.8, o.w * 0.01),
      closed: false,
    });
  });
  const inkW = Math.max(1, o.w * 0.012);
  shape(ctx, g.leftSlope, { stroke: o.ink, width: inkW, closed: false });
  shape(ctx, g.rightSlope, { stroke: o.ink, width: inkW, closed: false });
  shape(ctx, g.ridge, { stroke: rgba(o.ink, 0.7), width: Math.max(0.8, o.w * 0.009), closed: false });
  return g;
}

function drawSnowCap(ctx: Ctx2D, g: PeakGeometry, o: PeakOptions, tones: Shades): void {
  const { apex } = g;
  const { rand } = o;
  const depth = o.h * (o.snow ?? 0.35) * 1.4;
  const teeth = 9;
  const span = o.w * 0.62;
  const edge: Vec2[] = [[apex[0] - span, apex[1] - 4]];
  for (let i = 0; i <= teeth; i++) {
    const t = i / teeth;
    const x = apex[0] - span + span * 2 * t;
    const down = i % 2 === 0 ? 1 : 0.5;
    // The snow line sits higher at the peak's center and drops toward the flanks.
    const flank = 1 - 0.35 * Math.abs(t - 0.5) * 2;
    edge.push([x, apex[1] + depth * down * flank * rand.range(0.75, 1.2)]);
  }
  edge.push([apex[0] + span, apex[1] - 4]);

  const litSnow = linearGradient(ctx, apex[0] - o.w * 0.3, apex[1], apex[0] + o.w * 0.1, apex[1] + depth, ['#ffffff', '#e8f1f8', '#c9dae9']);
  const shadeSnow = linearGradient(ctx, apex[0], apex[1], apex[0] + o.w * 0.3, apex[1] + depth, ['#c6d5e8', '#9fb5d0', '#8299b8']);
  clipped(ctx, g.leftFace, () => shape(ctx, edge, { fill: litSnow }));
  clipped(ctx, g.rightFace, () => shape(ctx, edge, { fill: shadeSnow }));
  clipped(ctx, g.silhouette, () => {
    // Snow-covered spurs get a cool shadow too, kept inside the snow field.
    clipped(ctx, edge, () => {
      for (const s of g.spurs) wedge(ctx, s.line.slice(0, 6), o.w * 0.1, 1, 'rgba(120,145,185,0.42)');
    });
    shape(ctx, edge.slice(1, -1), { stroke: rgba(tones.deep, 0.55), width: Math.max(0.7, o.w * 0.008), closed: false });
  });
}

/** Rock palettes shared by mountain symbols. */
export const ROCK = {
  brown: '#9a7752',
  gray: '#8a8d93',
  black: '#4e4d55',
  red: '#a8553a',
  sand: '#c5a26a',
  green: '#6f8c52',
  ice: '#9bb2c6',
} as const;
