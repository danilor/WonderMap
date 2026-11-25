import { mix, rgba } from '../kit/colors';
import { linearGradient, shades, shape, softBlob, type Shades } from '../kit/draw';
import { TAU, bounds, pointInPoly } from '../kit/math';
import { jagged } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';

/** Warm dark ink for outlines of relief symbols. */
export const INK = '#2a2015';
/** Slightly cool ink that sits better on ice and snow. */
export const COOL_INK = '#2a3042';

/** Rock base colors for relief symbols (light/shade tones are derived with `shades`). */
export const STONE = {
  gray: '#8e9197',
  brown: '#9d7b55',
  red: '#b05a3b',
  dark: '#5a5860',
  sand: '#c9a770',
  pale: '#b9b3a6',
  basalt: '#4a4650',
  ash: '#403f47',
} as const;

/** A random point inside a polygon (rejection sampling). */
export function pointIn(rand: Rng, poly: readonly Vec2[], tries = 30): Vec2 | null {
  const b = bounds(poly);
  for (let i = 0; i < tries; i++) {
    const x = rand.range(b.minX, b.maxX);
    const y = rand.range(b.minY, b.maxY);
    if (pointInPoly(x, y, poly)) return [x, y];
  }
  return null;
}

/** Shift every point of a polyline. */
export function shifted(pts: readonly Vec2[], dx: number, dy: number): Vec2[] {
  return pts.map((p): Vec2 => [p[0] + dx, p[1] + dy]);
}

/** Pick an element that differs from the previous pick (so neighbouring stripes never share a tone). */
export function pickDifferent<T>(rand: Rng, items: readonly T[], prev: T | undefined): T {
  for (let i = 0; i < 6; i++) {
    const v = rand.pick(items);
    if (v !== prev) return v;
  }
  return items[0]!;
}

/** Three short grass blades fanning out of one point. */
export function tuft(ctx: Ctx2D, x: number, y: number, size: number, color: string, width = 0.9): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - size * 0.45, y);
  ctx.lineTo(x - size * 0.8, y - size * 0.95);
  ctx.moveTo(x, y);
  ctx.lineTo(x + size * 0.05, y - size * 1.25);
  ctx.moveTo(x + size * 0.45, y);
  ctx.lineTo(x + size * 0.85, y - size * 0.9);
  ctx.stroke();
  ctx.restore();
}

/** Wavy horizontal strata lines (sandstone, layered cliffs) clipped to a face. */
export function strataLines(ctx: Ctx2D, rand: Rng, face: readonly Vec2[], spacing: number, color: string, alpha: number, lineWidth = 0.8): void {
  const b = bounds(face);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(face[0]![0], face[0]![1]);
  for (let i = 1; i < face.length; i++) ctx.lineTo(face[i]![0], face[i]![1]);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let y = b.minY + spacing * rand.range(0.3, 1); y < b.maxY; y += spacing * rand.range(0.75, 1.3)) {
    ctx.beginPath();
    let x = b.minX - 2;
    ctx.moveTo(x, y);
    while (x < b.maxX + 2) {
      x += rand.range(4, 9);
      ctx.lineTo(x, y + rand.range(-0.7, 0.7));
    }
    ctx.stroke();
  }
  ctx.restore();
}

export interface BoulderOptions {
  cx: number;
  /** Center of the boulder (its bottom sits `ry * 0.72` lower). */
  cy: number;
  rx: number;
  ry: number;
  rock: string;
  ink: string;
  rand: Rng;
  /** Moss tint over the top plane. */
  moss?: string;
  /** Snow cap over the top plane. */
  snow?: boolean;
  cracks?: boolean;
  /** Soft contact shadow. Default true. */
  shadow?: boolean;
  /** Skip the facets (tiny scree chips). */
  simple?: boolean;
}

/** A faceted boulder: lit top plane, lit left face and shaded right face under one ink outline. */
export function drawBoulder(ctx: Ctx2D, o: BoulderOptions): void {
  const { rand, cx, cy, rx, ry } = o;
  const tones = shades(o.rock);
  const n = o.simple ? 6 : 9;
  const pts: Vec2[] = [];
  const jit = o.simple ? 2.2 : 1;
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (i / n) * TAU + rand.range(-0.1, 0.1) * jit;
    const k = 1 + rand.range(-0.13, 0.1) * jit;
    const s = Math.sin(a);
    pts.push([cx + Math.cos(a) * rx * k, cy + s * ry * k * (s > 0 ? 0.72 : 1)]);
  }
  const lw = Math.max(0.8, Math.min(rx, ry) * 0.08);
  if (o.shadow !== false) softBlob(ctx, cx + rx * 0.22, cy + ry * 0.62, rx * 1.2, ry * 0.42, '#1d160c', 0.36);

  if (o.simple) {
    const chip = linearGradient(ctx, cx - rx, cy - ry, cx + rx * 0.8, cy + ry * 0.8, [tones.light, tones.base, tones.shade]);
    shape(ctx, pts, { fill: chip, stroke: rgba(o.ink, 0.85), width: Math.min(lw, 0.8), smooth: false });
    return;
  }

  const brow: Vec2 = [(pts[1]![0] + pts[4]![0]) / 2 + rand.range(-0.1, 0.1) * rx, (pts[1]![1] + pts[4]![1]) / 2 + ry * rand.range(0.28, 0.5)];
  const top: Vec2[] = [pts[1]!, pts[2]!, pts[3]!, pts[4]!, brow];
  const left: Vec2[] = [pts[1]!, brow, ...pts.slice(6), pts[0]!];
  const right: Vec2[] = [brow, pts[4]!, pts[5]!, pts[6]!];

  shape(ctx, pts, { fill: o.ink, stroke: o.ink, width: lw * 2 });
  shape(ctx, left, { fill: linearGradient(ctx, 0, cy - ry, 0, cy + ry * 0.7, [tones.light, tones.base]) });
  shape(ctx, right, { fill: linearGradient(ctx, cx, cy - ry, cx + rx, cy + ry * 0.7, [tones.shade, tones.deep]) });
  shape(ctx, top, { fill: linearGradient(ctx, cx - rx, cy - ry, cx + rx * 0.6, cy, [tones.highlight, tones.light]) });
  if (o.moss) shape(ctx, top, { fill: rgba(o.moss, 0.72) });
  if (o.snow) shape(ctx, [...top.slice(0, 4), [brow[0] + rx * 0.25, brow[1] + ry * 0.12], [brow[0] - rx * 0.1, brow[1] - ry * 0.05], [brow[0] - rx * 0.45, brow[1] + ry * 0.1]], { fill: 'rgba(246,250,255,0.95)' });
  shape(ctx, [pts[1]!, brow, pts[4]!], { stroke: rgba(tones.deep, 0.55), width: lw * 0.8, closed: false });
  shape(ctx, [brow, pts[6]!], { stroke: rgba(tones.deep, 0.6), width: lw * 0.8, closed: false });
  if (o.cracks) {
    const from: Vec2 = [cx - rx * 0.25, cy];
    shape(ctx, jagged(rand, from, [from[0] - rx * 0.1, from[1] + ry * 0.55], 4, rx * 0.07), { stroke: rgba(tones.deep, 0.7), width: lw * 0.7, closed: false });
  }
  shape(ctx, pts, { stroke: o.ink, width: lw });
  // The sun catches the upper-left edge.
  shape(ctx, [pts[0]!, pts[1]!, pts[2]!].map((p): Vec2 => [p[0] + lw, p[1] + lw * 0.9]), { stroke: rgba(tones.highlight, 0.6), width: lw * 0.8, closed: false });
}

export interface ScreeOptions {
  x0: number;
  x1: number;
  /** Ground line. */
  y: number;
  /** How far up the apron reaches. */
  depth: number;
  rock: string;
  ink: string;
  count: number;
  /** Largest chip radius. */
  size: number;
}

/** Fallen rock at the foot of cliffs: a rubble apron with angular chips, big ones at the front. */
export function drawScree(ctx: Ctx2D, rand: Rng, o: ScreeOptions): void {
  const tones: Shades = shades(o.rock);
  const w = o.x1 - o.x0;
  const apex = (o.x0 + o.x1) / 2;
  const apron: Vec2[] = [[o.x0, o.y + 1]];
  const steps = 7;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const arch = Math.sin(Math.PI * t) ** 0.8;
    apron.push([o.x0 + w * t, o.y - o.depth * arch * rand.range(0.7, 1)]);
  }
  apron.push([o.x1, o.y + 1], [apex, o.y + o.depth * 0.14]);
  const dust = mix(tones.base, tones.shade, 0.18);
  shape(ctx, apron, {
    fill: linearGradient(ctx, 0, o.y - o.depth, 0, o.y + o.depth * 0.2, [rgba(dust, 0), rgba(dust, 0.78), rgba(mix(tones.base, tones.shade, 0.5), 0.88)]),
    smooth: true,
  });
  const chips: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < o.count; i++) {
    const t = rand.range(0.02, 0.98);
    const edge = Math.sin(Math.PI * t) ** 0.8;
    const f = rand.next() ** 0.8;
    chips.push({ x: o.x0 + w * t, y: o.y - o.depth * edge * f * 0.85 + o.depth * 0.05, r: o.size * (0.35 + 0.65 * (1 - f * 0.6)) * rand.range(0.7, 1.15) });
  }
  chips.sort((a, b) => a.y - b.y);
  for (const c of chips) {
    drawBoulder(ctx, { cx: c.x, cy: c.y, rx: c.r, ry: c.r * 0.8, rock: o.rock, ink: o.ink, rand, shadow: false, simple: true });
  }
}
