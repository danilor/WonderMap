import { rgba } from '../kit/colors';
import { clipped, linearGradient, shades, shape, softBlob, stipple, type Shades } from '../kit/draw';
import { TAU } from '../kit/math';
import { jagged } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { drawBoulder, drawScree, strataLines } from './relief-common';

export interface SlabOptions {
  cx: number;
  /** Center of the top plane. */
  cy: number;
  rx: number;
  ry: number;
  /** Visible thickness of the slab. */
  thick: number;
  rock: string;
  ink: string;
  rand: Rng;
  shadow?: boolean;
}

/** A flat stone: lit top plane over a shaded fluted edge. */
export function drawSlab(ctx: Ctx2D, o: SlabOptions): void {
  const { rand, cx, cy, rx, ry, thick } = o;
  const tones = shades(o.rock);
  const n = 12;
  const ring: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const k = 1 + rand.range(-0.1, 0.08);
    ring.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  const front = ring.slice(0, n / 2 + 1).reverse();
  const under: Vec2[] = front.map((p): Vec2 => [p[0], p[1] + thick * rand.range(0.85, 1.1)]);
  const wall: Vec2[] = [...front, ...under.slice().reverse()];
  const lw = Math.max(0.9, rx * 0.06);
  if (o.shadow !== false) softBlob(ctx, cx + rx * 0.2, cy + ry + thick * 0.8, rx * 1.1, ry * 0.8, '#1d160c', 0.34);
  shape(ctx, wall, { fill: o.ink, stroke: o.ink, width: lw * 2 });
  shape(ctx, wall, { fill: linearGradient(ctx, cx - rx, 0, cx + rx, 0, [tones.light, tones.base, tones.shade, tones.deep]) });
  clipped(ctx, wall, () => {
    shape(ctx, under.map((p): Vec2 => [p[0], p[1] - thick * 0.45]), { stroke: rgba(tones.deep, 0.35), width: 0.8, closed: false });
    shape(ctx, front, { stroke: rgba('#120f1c', 0.4), width: 2, closed: false });
  });
  shape(ctx, ring, { fill: linearGradient(ctx, cx - rx, cy - ry, cx + rx * 0.8, cy + ry, [tones.highlight, tones.light, tones.base]), stroke: o.ink, width: lw, smooth: true });
  shape(ctx, [ring[8]!, ring[9]!, ring[10]!].map((p): Vec2 => [p[0] + 1, p[1] + 0.9]), { stroke: rgba(tones.highlight, 0.7), width: lw * 0.8, closed: false });
}

export interface HoodooOptions {
  cx: number;
  baseY: number;
  w: number;
  h: number;
  rock: string;
  ink: string;
  rand: Rng;
  /** Half widths (fraction of w/2) from the base to the top. */
  profile: readonly number[];
  /** Index of the first profile step that belongs to the cap (-1 = no cap). */
  cap?: number;
  strata?: number;
  shadow?: boolean;
}

/** A weathered stone pillar: strata, a mushroom cap and a rubble foot. */
export function drawHoodoo(ctx: Ctx2D, o: HoodooOptions): void {
  const { rand, cx, baseY, w, h } = o;
  const tones: Shades = shades(o.rock);
  const steps = o.profile.length;
  const left: Vec2[] = [];
  const right: Vec2[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const r = (w / 2) * o.profile[i]! * (1 + rand.range(-0.05, 0.05));
    const y = baseY - h * t;
    left.push([cx - r, y]);
    right.push([cx + r * rand.range(0.96, 1.04), y]);
  }
  const poly: Vec2[] = [...left, ...right.slice().reverse()];
  const lw = Math.max(1, w * 0.035);
  if (o.shadow !== false) softBlob(ctx, cx + w * 0.22, baseY + 1, w * 0.8, Math.max(3, w * 0.16), '#1d160c', 0.4);

  shape(ctx, poly, { fill: o.ink, stroke: o.ink, width: lw * 2 });
  shape(ctx, poly, { fill: linearGradient(ctx, cx - w / 2, 0, cx + w / 2, 0, [[0, tones.light], [0.42, tones.base], [0.78, tones.shade], [1, tones.deep]]) });
  clipped(ctx, poly, () => {
    const bandCount = o.strata ?? 7;
    for (let s = 0; s < bandCount; s++) {
      const y0 = baseY - (h * s) / bandCount;
      const y1 = baseY - (h * (s + 1)) / bandCount;
      const wob = (x: number): number => Math.sin(x * 0.45 + s * 1.7) * 0.7;
      const band: Vec2[] = [];
      for (let x = cx - w; x <= cx + w; x += 4) band.push([x, y0 + wob(x)]);
      const lowEdge: Vec2[] = [];
      for (let x = cx + w; x >= cx - w; x -= 4) lowEdge.push([x, y1 + wob(x)]);
      shape(ctx, [...band, ...lowEdge], { fill: s % 2 === 0 ? rgba(tones.highlight, 0.12) : rgba(tones.deep, 0.15) });
      shape(ctx, band, { stroke: rgba(tones.deep, 0.34), width: 0.8, closed: false });
    }
    strataLines(ctx, rand, poly, Math.max(3, h / 14), tones.deep, 0.15);
    shape(ctx, left.map((p): Vec2 => [p[0] + w * 0.07, p[1]]), { stroke: rgba(tones.highlight, 0.55), width: lw * 1.1, closed: false });
    stipple(ctx, rand, poly, Math.round(w * 0.8), { color: tones.deep, radius: 0.5, alpha: 0.35 });
    if (o.cap !== undefined && o.cap >= 0) {
      // The cap overhangs its neck and throws a shadow on it.
      const y = baseY - (h * o.cap) / (steps - 1);
      shape(ctx, [[cx - w, y], [cx + w, y], [cx + w, y + h * 0.1], [cx - w, y + h * 0.1]], { fill: linearGradient(ctx, 0, y, 0, y + h * 0.1, [rgba('#120f1c', 0.5), rgba('#120f1c', 0)]) });
    }
    shape(ctx, jagged(rand, [cx + w * rand.range(-0.1, 0.15), baseY - h * rand.range(0.3, 0.5)], [cx + w * rand.range(-0.15, 0.2), baseY - h * rand.range(0.08, 0.2)], 4, w * 0.02), { stroke: rgba(o.ink, 0.55), width: 0.9, closed: false });
  });
  shape(ctx, poly, { stroke: o.ink, width: lw, closed: true });
  drawScree(ctx, rand, { x0: cx - w * 0.62, x1: cx + w * 0.7, y: baseY + 1, depth: Math.max(3, h * 0.1), rock: o.rock, ink: o.ink, count: 4, size: Math.max(1.6, w * 0.07) });
}

export interface ArchOptions {
  cx: number;
  baseY: number;
  w: number;
  h: number;
  rock: string;
  ink: string;
  rand: Rng;
  /** Opening size relative to the whole arch. */
  open?: number;
  shadow?: boolean;
}

/** A natural rock arch: one silhouette with an opening cut out of the foot. */
export function drawArch(ctx: Ctx2D, o: ArchOptions): void {
  const { rand, cx, baseY, w, h } = o;
  const tones = shades(o.rock);
  const open = o.open ?? 0.4;
  const ox = (w / 2) * open;
  const oy = h * (0.35 + 0.35 * open);
  const outer: Vec2[] = [
    [cx - w / 2, baseY],
    [cx - w * 0.5 + rand.range(0, 2), baseY - h * 0.34],
    [cx - w * 0.42, baseY - h * 0.64],
    [cx - w * 0.3, baseY - h * 0.86],
    [cx - w * 0.12, baseY - h * rand.range(0.93, 1)],
    [cx + w * 0.08, baseY - h * rand.range(0.95, 1)],
    [cx + w * 0.28, baseY - h * rand.range(0.84, 0.9)],
    [cx + w * 0.42, baseY - h * 0.6],
    [cx + w * 0.5, baseY - h * 0.3],
    [cx + w / 2 + 1, baseY],
  ];
  const hole: Vec2[] = [];
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI;
    hole.push([cx + ox * Math.cos(a), baseY - oy * Math.sin(a) * (1 + rand.range(-0.04, 0.04))]);
  }
  const poly: Vec2[] = [...outer, ...hole];
  const lw = Math.max(1, w * 0.03);
  if (o.shadow !== false) softBlob(ctx, cx + w * 0.2, baseY + 1, w * 0.7, Math.max(3, w * 0.12), '#1d160c', 0.4);
  shape(ctx, poly, { fill: o.ink, stroke: o.ink, width: lw * 2 });
  shape(ctx, poly, { fill: linearGradient(ctx, cx - w / 2, 0, cx + w / 2, 0, [[0, tones.light], [0.4, tones.base], [0.8, tones.shade], [1, tones.deep]]) });
  clipped(ctx, poly, () => {
    strataLines(ctx, rand, poly, Math.max(3, h / 12), tones.deep, 0.22);
    // Soffit: the shaded underside of the span follows the opening.
    shape(ctx, hole.map((p): Vec2 => [p[0] + 0.6, p[1] - 0.8]), { stroke: rgba('#120f1c', 0.55), width: 3.2, closed: false, smooth: true });
    shape(ctx, outer.slice(0, 6).map((p): Vec2 => [p[0] + w * 0.06, p[1] + 1]), { stroke: rgba(tones.highlight, 0.5), width: lw * 1.1, closed: false });
    stipple(ctx, rand, poly, Math.round(w * 0.8), { color: tones.deep, radius: 0.5, alpha: 0.35 });
    shape(ctx, jagged(rand, [cx - w * 0.3, baseY - h * 0.8], [cx - w * 0.22, baseY - h * 0.52], 4, 0.8), { stroke: rgba(o.ink, 0.55), width: 0.9, closed: false });
  });
  shape(ctx, poly, { stroke: o.ink, width: lw });
  drawScree(ctx, rand, { x0: cx - w * 0.6, x1: cx - ox * 0.7, y: baseY + 1, depth: Math.max(3, h * 0.1), rock: o.rock, ink: o.ink, count: 4, size: Math.max(1.6, w * 0.06) });
  drawScree(ctx, rand, { x0: cx + ox * 0.7, x1: cx + w * 0.64, y: baseY + 1, depth: Math.max(3, h * 0.1), rock: o.rock, ink: o.ink, count: 4, size: Math.max(1.6, w * 0.06) });
}

export interface CairnOptions {
  cx: number;
  baseY: number;
  /** Width of the bottom row. */
  w: number;
  rock: string;
  ink: string;
  rand: Rng;
  rows?: number;
}

/** A stacked pile of small stones, wide at the bottom. */
export function drawCairn(ctx: Ctx2D, o: CairnOptions): void {
  const { rand } = o;
  const rows = o.rows ?? 4;
  softBlob(ctx, o.cx + o.w * 0.18, o.baseY + 1, o.w * 0.7, o.w * 0.14, '#1d160c', 0.4);
  let y = o.baseY;
  for (let r = 0; r < rows; r++) {
    const count = rows - r;
    const size = (o.w / rows) * 0.62 * (1 - r * 0.06);
    for (let i = 0; i < count; i++) {
      const x = o.cx + (i - (count - 1) / 2) * size * 1.5 + rand.range(-1, 1);
      drawBoulder(ctx, { cx: x, cy: y - size * 0.62, rx: size * rand.range(0.95, 1.2), ry: size * rand.range(0.75, 0.9), rock: o.rock, ink: o.ink, rand, shadow: false });
    }
    y -= size * 1.05;
  }
}
