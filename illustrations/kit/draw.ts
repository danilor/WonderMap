import { adjust, mix, rgba } from './colors';
import { TAU, bounds, pointInPoly } from './math';
import { ribbon } from './shapes';
import type { Ctx2D, Rng, Vec2 } from './types';

/** Anything canvas accepts as a fill/stroke. */
export type Paint = string | CanvasGradient | CanvasPattern;
export type Stops = ReadonlyArray<readonly [number, string]> | readonly string[];

/* ------------------------------------------------------------------------------------ */
/* Path tracing                                                                         */
/* ------------------------------------------------------------------------------------ */

/** Add straight segments through `pts` to the current path. */
export function tracePoly(ctx: Ctx2D, pts: readonly Vec2[], closed = true): void {
  if (pts.length === 0) return;
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
  if (closed) ctx.closePath();
}

/** Add a smooth curve (quadratic through midpoints) to the current path. Cheap and pleasant for organic shapes. */
export function traceSmooth(ctx: Ctx2D, pts: readonly Vec2[], closed = true): void {
  const n = pts.length;
  if (n < 3) {
    tracePoly(ctx, pts, closed);
    return;
  }
  if (closed) {
    const sx = (pts[n - 1]![0] + pts[0]![0]) / 2;
    const sy = (pts[n - 1]![1] + pts[0]![1]) / 2;
    ctx.moveTo(sx, sy);
    for (let i = 0; i < n; i++) {
      const p = pts[i]!;
      const q = pts[(i + 1) % n]!;
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    ctx.closePath();
  } else {
    ctx.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < n - 1; i++) {
      const p = pts[i]!;
      const q = pts[i + 1]!;
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    ctx.lineTo(pts[n - 1]![0], pts[n - 1]![1]);
  }
}

/* ------------------------------------------------------------------------------------ */
/* Shapes                                                                               */
/* ------------------------------------------------------------------------------------ */

export interface ShapeStyle {
  fill?: Paint | null;
  stroke?: Paint | null;
  /** Stroke width in design units. */
  width?: number;
  /** Curve through the points instead of straight segments. */
  smooth?: boolean;
  closed?: boolean;
  alpha?: number;
  cap?: CanvasLineCap;
  join?: CanvasLineJoin;
  dash?: readonly number[];
}

/** The workhorse: fill and/or stroke a polygon or polyline. */
export function shape(ctx: Ctx2D, pts: readonly Vec2[], s: ShapeStyle): void {
  if (pts.length < 2) return;
  ctx.save();
  if (s.alpha !== undefined) ctx.globalAlpha *= s.alpha;
  ctx.beginPath();
  (s.smooth ? traceSmooth : tracePoly)(ctx, pts, s.closed ?? true);
  if (s.fill) {
    ctx.fillStyle = s.fill;
    ctx.fill();
  }
  if (s.stroke) {
    ctx.strokeStyle = s.stroke;
    ctx.lineWidth = s.width ?? 1;
    ctx.lineJoin = s.join ?? 'round';
    ctx.lineCap = s.cap ?? 'round';
    if (s.dash) ctx.setLineDash([...s.dash]);
    ctx.stroke();
  }
  ctx.restore();
}

/** Open stroked polyline. */
export function line(ctx: Ctx2D, pts: readonly Vec2[], stroke: Paint, width = 1, s: Omit<ShapeStyle, 'stroke' | 'width' | 'fill' | 'closed'> = {}): void {
  shape(ctx, pts, { ...s, stroke, width, closed: false });
}

export function ellipse(ctx: Ctx2D, cx: number, cy: number, rx: number, ry: number, s: Omit<ShapeStyle, 'smooth' | 'closed'> & { rotation?: number }): void {
  ctx.save();
  if (s.alpha !== undefined) ctx.globalAlpha *= s.alpha;
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), s.rotation ?? 0, 0, TAU);
  if (s.fill) {
    ctx.fillStyle = s.fill;
    ctx.fill();
  }
  if (s.stroke) {
    ctx.strokeStyle = s.stroke;
    ctx.lineWidth = s.width ?? 1;
    ctx.stroke();
  }
  ctx.restore();
}

export function dot(ctx: Ctx2D, x: number, y: number, r: number, fill: Paint): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

export function rect(ctx: Ctx2D, x: number, y: number, w: number, h: number, s: Omit<ShapeStyle, 'smooth' | 'closed'>): void {
  shape(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], s);
}

/** Filled polygon that tapers between two widths along an open path (hand-inked strokes, branches, rivers). */
export function taper(ctx: Ctx2D, pts: readonly Vec2[], w0: number, w1: number, fill: Paint, smooth = true): void {
  if (pts.length < 2) return;
  const widths = pts.map((_, i) => w0 + (w1 - w0) * (i / (pts.length - 1)));
  shape(ctx, ribbon(pts, widths), { fill, smooth });
}

/* ------------------------------------------------------------------------------------ */
/* Gradients                                                                            */
/* ------------------------------------------------------------------------------------ */

function addStops(g: CanvasGradient, stops: Stops): void {
  const n = stops.length;
  stops.forEach((s, i) => {
    if (typeof s === 'string') g.addColorStop(n === 1 ? 0 : i / (n - 1), s);
    else g.addColorStop(s[0], s[1]);
  });
}

/** Linear gradient; `stops` is either `[offset, color][]` or evenly spaced colors. */
export function linearGradient(ctx: Ctx2D, x0: number, y0: number, x1: number, y1: number, stops: Stops): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  addStops(g, stops);
  return g;
}

export function radialGradient(ctx: Ctx2D, x: number, y: number, r0: number, r1: number, stops: Stops, fx = x, fy = y): CanvasGradient {
  const g = ctx.createRadialGradient(fx, fy, r0, x, y, r1);
  addStops(g, stops);
  return g;
}

/* ------------------------------------------------------------------------------------ */
/* Clipping, shadows, light                                                             */
/* ------------------------------------------------------------------------------------ */

/** Run `fn` with the context clipped to a polygon. */
export function clipped(ctx: Ctx2D, pts: readonly Vec2[], fn: () => void, smooth = false): void {
  ctx.save();
  ctx.beginPath();
  (smooth ? traceSmooth : tracePoly)(ctx, pts, true);
  ctx.clip();
  fn();
  ctx.restore();
}

/** Soft elliptical blob of color: contact shadows, glows, ambient occlusion. */
export function softBlob(ctx: Ctx2D, cx: number, cy: number, rx: number, ry: number, color: string, alpha = 0.3): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / Math.max(rx, 0.0001));
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.55, rgba(color, alpha * 0.55));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Contact shadow under an object. Light is top-left, so the shadow leans to the right. */
export function groundShadow(ctx: Ctx2D, cx: number, cy: number, rx: number, ry: number, alpha = 0.3, color = '#1d160c'): void {
  softBlob(ctx, cx + rx * 0.12, cy, rx, ry, color, alpha);
}

/* ------------------------------------------------------------------------------------ */
/* Ink: hatching and stippling                                                          */
/* ------------------------------------------------------------------------------------ */

export interface HatchOptions {
  /** Direction of the lines in radians (0 = horizontal). Default 60°. */
  angle?: number;
  spacing?: number;
  color?: string;
  width?: number;
  /** Random sideways offset per line. */
  jitter?: number;
  alpha?: number;
  /** Probability to skip a line. */
  skip?: number;
  /** Lines get random lengths instead of crossing the whole region. */
  ragged?: boolean;
}

/** Parallel pen strokes clipped to a region: the classic map-maker shading. */
export function hatch(ctx: Ctx2D, rand: Rng, region: readonly Vec2[], o: HatchOptions = {}): void {
  if (region.length < 3) return;
  const b = bounds(region);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const half = Math.hypot(b.w, b.h) / 2 + 2;
  const angle = o.angle ?? Math.PI / 3;
  const spacing = Math.max(0.5, o.spacing ?? 2.4);
  const jitter = o.jitter ?? 0.25;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const nx = -dy;
  const ny = dx;

  ctx.save();
  ctx.beginPath();
  tracePoly(ctx, region, true);
  ctx.clip();
  ctx.strokeStyle = o.color ?? '#2a2016';
  ctx.lineWidth = o.width ?? 0.7;
  ctx.lineCap = 'round';
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.beginPath();
  for (let t = -half; t <= half; t += spacing) {
    if (o.skip && rand.chance(o.skip)) continue;
    const off = t + rand.range(-jitter, jitter);
    let a0 = -half;
    let a1 = half;
    if (o.ragged) {
      const len = rand.range(0.35, 1) * 2 * half;
      a0 = rand.range(-half, half - len);
      a1 = a0 + len;
    }
    ctx.moveTo(cx + nx * off + dx * a0, cy + ny * off + dy * a0);
    ctx.lineTo(cx + nx * off + dx * a1, cy + ny * off + dy * a1);
  }
  ctx.stroke();
  ctx.restore();
}

export interface StippleOptions {
  color?: string;
  radius?: number;
  alpha?: number;
}

/** Random dots inside a region. */
export function stipple(ctx: Ctx2D, rand: Rng, region: readonly Vec2[], count: number, o: StippleOptions = {}): void {
  if (region.length < 3) return;
  const b = bounds(region);
  const r = o.radius ?? 0.5;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.fillStyle = o.color ?? '#2a2016';
  ctx.beginPath();
  let placed = 0;
  for (let guard = 0; placed < count && guard < count * 12; guard++) {
    const x = rand.range(b.minX, b.maxX);
    const y = rand.range(b.minY, b.maxY);
    if (!pointInPoly(x, y, region)) continue;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
    placed++;
  }
  ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------------------------------ */
/* Lighting palettes                                                                    */
/* ------------------------------------------------------------------------------------ */

export interface Shades {
  highlight: string;
  light: string;
  base: string;
  shade: string;
  deep: string;
}

/** Illustrator's trick: warm light, cool shadow. Returns five tones derived from one color. */
export function shades(base: string): Shades {
  return {
    highlight: mix(base, '#fff4d2', 0.6),
    light: mix(base, '#fff1c8', 0.28),
    base,
    shade: mix(adjust(base, { h: -0.012 }), '#2b2552', 0.3),
    deep: mix(adjust(base, { h: -0.02 }), '#16122e', 0.56),
  };
}
