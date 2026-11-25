import { rgba } from '../kit/colors';
import { ellipse, shape, softBlob } from '../kit/draw';
import { TAU } from '../kit/math';
import { blob } from '../kit/shapes';
import type { Ctx2D, Rng } from '../kit/types';

/** Foam, ripples and wave marks shared by every symbol that floats or swims. */

export const FOAM = '#f8fdfb';
/** Cool tone that outlines foam on its shaded side. */
export const FOAM_EDGE = '#a6d2d8';
/** Warm dark ink used for outlines. */
export const SEA_INK = '#2a2015';
const WATER_SHADOW = '#0a2a3c';

/** Soft shadow on the water under something that floats. Light is top-left, so it leans to the lower right. */
export function waterShadow(ctx: Ctx2D, cx: number, cy: number, rx: number, ry: number, alpha = 0.32): void {
  softBlob(ctx, cx + rx * 0.12, cy + ry * 0.25, rx, ry, WATER_SHADOW, alpha);
}

/** Scalloped foam lapping along a waterline from `x0` to `x1`; it also hides the hard edge where a hull meets the sea. */
export function foamStrip(ctx: Ctx2D, rand: Rng, x0: number, x1: number, y: number, o: { depth?: number; alpha?: number; scallop?: number; width?: number } = {}): void {
  const depth = o.depth ?? 3;
  const alpha = o.alpha ?? 0.85;
  const step = o.scallop ?? 4.4;
  const xs: number[] = [x0];
  while (xs[xs.length - 1]! < x1 - step * 0.6) xs.push(xs[xs.length - 1]! + step * rand.range(0.75, 1.3));
  xs.push(x1);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, y - 1.2);
  ctx.lineTo(x1, y - 1.2);
  ctx.lineTo(x1, y);
  const lower: Array<[number, number, number, number]> = [];
  for (let i = xs.length - 1; i > 0; i--) {
    const a = xs[i]!;
    const b = xs[i - 1]!;
    const cy = y + depth * rand.range(0.85, 1.45);
    const ey = y + rand.range(-0.4, 0.5);
    ctx.quadraticCurveTo((a + b) / 2, cy, b, ey);
    lower.push([a, b, cy, ey]);
  }
  ctx.closePath();
  ctx.fillStyle = rgba(FOAM, alpha);
  ctx.fill();
  // Cool edge under each scallop gives the foam a little volume.
  ctx.strokeStyle = rgba(FOAM_EDGE, 0.85);
  ctx.lineWidth = o.width ?? 0.7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y);
  for (const [a, b, cy, ey] of lower) {
    ctx.moveTo(a, y);
    ctx.quadraticCurveTo((a + b) / 2, cy + 0.6, b, ey);
  }
  ctx.stroke();
  ctx.restore();
}

/** Streaks trailing to the left of `(x, y)`: the wake of something moving right. */
export function wake(ctx: Ctx2D, rand: Rng, x: number, y: number, len: number, o: { alpha?: number; width?: number } = {}): void {
  const alpha = o.alpha ?? 0.55;
  const width = o.width ?? 1;
  ctx.save();
  ctx.lineCap = 'round';
  const rows = [
    { dy: 0.5, l: 0.55 },
    { dy: 3.2, l: 1 },
    { dy: 5.8, l: 0.72 },
  ];
  for (const row of rows) {
    let cx = x - rand.range(1, 3);
    const end = x - len * row.l;
    let n = 0;
    while (cx > end) {
      const seg = rand.range(4, 9) * (1 + n * 0.12);
      const fade = 1 - (x - cx) / len;
      ctx.strokeStyle = rgba(FOAM, alpha * Math.max(0.15, fade));
      ctx.lineWidth = width * (0.7 + 0.5 * fade);
      const yy = y + row.dy + Math.sin(n * 1.7 + row.dy) * 0.5 + (x - cx) * 0.02;
      ctx.beginPath();
      ctx.moveTo(cx, yy);
      ctx.quadraticCurveTo(cx - seg * 0.5, yy + rand.range(-0.9, 0.9), cx - seg, yy);
      ctx.stroke();
      cx -= seg + rand.range(2.5, 5.5);
      n++;
    }
  }
  ctx.restore();
}

/** Concentric elliptical ripples (a splash, a pole in the water, something that just sank). */
export function ripple(ctx: Ctx2D, x: number, y: number, rx: number, ry: number, o: { alpha?: number; width?: number; rings?: number; color?: string } = {}): void {
  const rings = o.rings ?? 2;
  for (let i = 0; i < rings; i++) {
    const k = 1 + i * 0.42;
    ellipse(ctx, x, y, rx * k, ry * k, { stroke: rgba(o.color ?? FOAM, (o.alpha ?? 0.7) / (1 + i * 0.9)), width: (o.width ?? 1) * (1 - i * 0.15) });
  }
}

/** Foam ring where a body breaks the surface (pole, tentacle, serpent). */
export function splashRing(ctx: Ctx2D, x: number, y: number, r: number): void {
  ellipse(ctx, x, y, r * 1.5, r * 0.45, { fill: 'rgba(255,255,255,0.35)' });
  ellipse(ctx, x, y, r * 1.5, r * 0.45, { stroke: 'rgba(255,255,255,0.8)', width: 1 });
  ellipse(ctx, x, y, r * 2.1, r * 0.65, { stroke: 'rgba(255,255,255,0.35)', width: 0.8 });
}

/** A foam patch with a ragged outline, for the surf around rocks, wrecks and islets. */
export function foamBlob(ctx: Ctx2D, rand: Rng, cx: number, cy: number, rx: number, ry: number, o: { alpha?: number; edge?: boolean } = {}): void {
  const pts = blob(rand, cx, cy, rx, ry, { points: 22, jitter: 0.06, lobes: 9, lobeAmp: 0.1 });
  shape(ctx, pts, { fill: rgba(FOAM, o.alpha ?? 0.6), smooth: true });
  if (o.edge !== false) shape(ctx, pts, { stroke: rgba(FOAM, 0.9), width: 0.9, smooth: true });
}

/** Little droplets thrown up around a point (splashes, spouts, breaking waves). */
export function droplets(ctx: Ctx2D, rand: Rng, x: number, y: number, count: number, spread: number, rise = 1, color = FOAM): void {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const a = rand.range(-Math.PI * 0.9, -Math.PI * 0.1);
    const d = rand.range(0.3, 1) * spread;
    const r = rand.range(0.5, 1.3);
    ctx.fillStyle = rgba(color, rand.range(0.55, 0.95));
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * rise, r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * A small curling swell: rises from the left, crests and curls over to the right.
 * `curl` scales the height; `flip` mirrors it.
 */
export function waveMark(ctx: Ctx2D, x: number, y: number, w: number, o: { color?: string; shade?: string; width?: number; alpha?: number; curl?: number; flip?: boolean } = {}): void {
  const k = o.flip ? -1 : 1;
  const h = w * 0.36 * (o.curl ?? 1);
  const X = (u: number) => x + u * w * k;
  const Y = (v: number) => y + v * h;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha *= o.alpha ?? 1;
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(X(-0.5), Y(0));
    ctx.bezierCurveTo(X(-0.34), Y(-0.05), X(-0.26), Y(-0.9), X(0.02), Y(-1));
    ctx.bezierCurveTo(X(0.22), Y(-1.04), X(0.36), Y(-0.7), X(0.28), Y(-0.4));
    ctx.bezierCurveTo(X(0.24), Y(-0.24), X(0.1), Y(-0.3), X(0.12), Y(-0.46));
  };
  if (o.shade) {
    ctx.translate(0.6, 0.9);
    ctx.strokeStyle = o.shade;
    ctx.lineWidth = o.width ?? 1.2;
    path();
    ctx.stroke();
    ctx.translate(-0.6, -0.9);
  }
  ctx.strokeStyle = o.color ?? FOAM;
  ctx.lineWidth = o.width ?? 1.2;
  path();
  ctx.stroke();
  // The swell's long trough line.
  ctx.beginPath();
  ctx.moveTo(X(-0.5), Y(0));
  ctx.quadraticCurveTo(X(0), Y(0.28), X(0.5), Y(0.02));
  ctx.stroke();
  ctx.restore();
}
