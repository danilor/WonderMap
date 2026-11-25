import { mix, rgba } from '../kit/colors';
import { clipped, linearGradient, shades, shape, softBlob, stipple, type Shades } from '../kit/draw';
import { TAU } from '../kit/math';
import { jagged } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { drawBoulder, pointIn, tuft } from './relief-common';

export interface MesaOptions {
  cx: number;
  /** Ground line under the front of the talus slope. */
  groundY: number;
  /** Half width / half depth of the flat top. */
  rx: number;
  ry: number;
  /** Total height of cliff plus talus slope. */
  wall: number;
  rock: string;
  /** Color of the flat top (grass, dust, snow...). */
  top: string;
  ink: string;
  rand: Rng;
  /** Number of sedimentary layers on the cliff face. Default 5. */
  strata?: number;
  /** Share of the height taken by the sloping rubble skirt (0..0.6). Default 0.3. */
  talus?: number;
  /** How much wider the cliff foot is than the top (1 = sheer). Default 1.05. */
  taper?: number;
  shadow?: boolean;
  /** Grass tufts and a stone on the top. Default true. */
  vegetation?: boolean;
  tuftColor?: string;
}

export interface MesaGeometry {
  top: Vec2[];
  topCx: number;
  topCy: number;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** A table-top butte seen from three quarters: flat top, eroded layered cliff and a rubble skirt. */
export function drawMesa(ctx: Ctx2D, o: MesaOptions): MesaGeometry {
  const { rand, cx, rx, ry, wall } = o;
  const tones: Shades = shades(o.rock);
  const talus = o.talus ?? 0.3;
  const taper = o.taper ?? 1.05;
  const hc = wall * (1 - talus);
  const topCy = o.groundY - wall - ry;
  const n = 24;
  const p1 = rand.range(0, TAU);
  const p2 = rand.range(0, TAU);
  const notch = rand.int(0, n - 1);
  const ring: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    let k = 1 + rand.range(-0.06, 0.06) + 0.07 * Math.sin(a * 3 + p1) + 0.04 * Math.sin(a * 5 + p2);
    if (i === notch || i === (notch + 1) % n) k -= 0.11;
    ring.push([cx + Math.cos(a) * rx * k, topCy + Math.sin(a) * ry * k]);
  }
  // Front half of the ring, from the left extreme to the right one.
  const front = ring.slice(0, n / 2 + 1).reverse();
  const last = front.length - 1;
  const cliffFoot: Vec2[] = front.map((p, i): Vec2 => [cx + (p[0] - cx) * taper + rand.range(-0.8, 0.8), p[1] + hc * rand.range(0.94, 1.06) + (i === 0 || i === last ? 1.5 : 0)]);
  const skirt = 1 + talus * 0.38;
  const skirtFoot: Vec2[] = front.map((p, i): Vec2 => {
    const side = i === 0 || i === last ? 1.04 : 1;
    return [cx + (p[0] - cx) * taper * skirt * side, p[1] + wall * rand.range(0.97, 1.03) - (i === 0 || i === last ? wall * 0.04 : 0)];
  });
  const sideStep = (a: Vec2, b: Vec2): Vec2[] => {
    const m = rand.range(0.35, 0.65);
    const dir = a[0] < cx ? -1 : 1;
    return [[lerp(a[0], b[0], m) + dir * rand.range(0.5, 2.4), lerp(a[1], b[1], m)]];
  };
  const leftStep = sideStep(front[0]!, cliffFoot[0]!);
  const rightStep = sideStep(front[last]!, cliffFoot[last]!);
  const wallPoly: Vec2[] = [...front, ...rightStep, ...cliffFoot.slice().reverse(), ...leftStep];
  const skirtPoly: Vec2[] = [...cliffFoot, ...skirtFoot.slice().reverse()];
  const frontY = (x: number): number => {
    for (let i = 1; i < front.length; i++) {
      const a = front[i - 1]!;
      const b = front[i]!;
      if (x <= b[0]) return a[1] + ((b[1] - a[1]) * (x - a[0])) / Math.max(0.001, b[0] - a[0]);
    }
    return front[last]![1];
  };
  const lw = Math.max(1.1, Math.min(1.8, rx * 0.032));

  if (o.shadow !== false) softBlob(ctx, cx + rx * 0.18, o.groundY + 1, rx * 1.3, Math.max(4, ry * 0.9), '#1d160c', 0.42);

  // Cliff face.
  shape(ctx, wallPoly, { fill: o.ink, stroke: o.ink, width: lw * 2 });
  shape(ctx, wallPoly, { fill: linearGradient(ctx, cx - rx, 0, cx + rx, 0, [[0, tones.light], [0.4, tones.base], [0.78, tones.shade], [1, tones.deep]]) });
  clipped(ctx, wallPoly, () => {
    const layers = o.strata ?? 5;
    const weights = Array.from({ length: layers }, () => rand.range(0.55, 1.6));
    const sum = weights.reduce((a, b) => a + b, 0);
    let acc = 0;
    const edgeAt = (f: number, phase: number): Vec2[] => front.map((p): Vec2 => [p[0], p[1] + hc * f + Math.sin(p[0] * 0.42 + phase) * 0.7]);
    let upper = edgeAt(0, 0);
    for (let s = 0; s < layers; s++) {
      acc += weights[s]! / sum;
      const phase = rand.range(0, TAU);
      const lower = edgeAt(Math.min(1.05, acc), phase);
      const roll = rand.next();
      const tint = roll < 0.34 ? rgba(tones.highlight, 0.15) : roll < 0.68 ? rgba(tones.deep, 0.17) : rgba(mix(tones.base, tones.highlight, 0.4), 0.1);
      shape(ctx, [...upper, ...lower.slice().reverse()], { fill: tint });
      if (s > 0) {
        shape(ctx, upper, { stroke: rgba(tones.deep, 0.42), width: 0.85, closed: false });
        shape(ctx, upper.map((p): Vec2 => [p[0], p[1] + 1.1]), { stroke: rgba(tones.highlight, 0.26), width: 0.7, closed: false });
      }
      upper = lower;
    }
    // Wide weathering streaks that taper down from the rim, plus a few cracks.
    const streaks = Math.max(3, Math.round(rx / 8));
    for (let i = 0; i < streaks; i++) {
      const x = cx + rand.range(-0.92, 0.92) * rx;
      const y0 = frontY(x) - 1;
      const y1 = y0 + hc * rand.range(0.5, 1.05);
      const half = rand.range(0.9, 2.3);
      const lit = x < cx + rx * 0.1;
      shape(ctx, [[x - half * 0.3, y0], [x + half * 0.3, y0], [x + half, y1], [x - half, y1]], { fill: rgba(lit ? tones.deep : '#120f1c', lit ? 0.3 : 0.38) });
      shape(ctx, [[x + half * 0.5, y0 + 1], [x + half * 1.15, y1 - 1]], { stroke: rgba(tones.highlight, lit ? 0.3 : 0.1), width: 0.7, closed: false });
    }
    for (let i = 0; i < 2; i++) {
      const x = cx + rand.range(-0.8, 0.8) * rx;
      const y0 = frontY(x) + 1;
      shape(ctx, jagged(rand, [x, y0], [x + rand.range(-3, 3), y0 + hc * rand.range(0.5, 0.95)], 5, 1), { stroke: rgba(o.ink, 0.55), width: 0.9, closed: false });
    }
    // Shadow settles under the lip and at the foot of the cliff.
    shape(ctx, wallPoly, { fill: linearGradient(ctx, 0, topCy, 0, o.groundY, [rgba('#120f1c', 0.34), rgba('#120f1c', 0), rgba('#120f1c', 0), rgba(tones.deep, 0.34)]) });
    stipple(ctx, rand, wallPoly, Math.round(rx * 0.8), { color: tones.deep, radius: 0.5, alpha: 0.35 });
  });
  shape(ctx, [cliffFoot[0]!, ...leftStep, ...front, ...rightStep, cliffFoot[last]!], { stroke: o.ink, width: lw, closed: false });

  // Rubble skirt: a sloping apron whose tongues climb the foot of the cliff.
  const dust = mix(tones.light, tones.base, 0.5);
  const skirtOutline: Vec2[] = [cliffFoot[0]!, ...skirtFoot, cliffFoot[last]!];
  shape(ctx, skirtPoly, { fill: linearGradient(ctx, cx - rx, 0, cx + rx, 0, [[0, dust], [0.5, tones.base], [1, tones.shade]]) });
  clipped(ctx, skirtPoly, () => {
    for (let i = 1; i < cliffFoot.length - 1; i++) {
      const a = cliffFoot[i]!;
      const b = skirtFoot[i]!;
      const wdt = rand.range(1.2, 2.6);
      shape(ctx, [[a[0] - wdt * 0.35, a[1]], [a[0] + wdt * 0.35, a[1]], [b[0] + wdt, b[1]], [b[0] - wdt, b[1]]], { fill: rgba(i % 2 ? tones.deep : tones.highlight, i % 2 ? 0.2 : 0.16) });
    }
    shape(ctx, skirtPoly, { fill: linearGradient(ctx, 0, o.groundY - wall * talus, 0, o.groundY + 1, [rgba(tones.deep, 0), rgba(tones.deep, 0.28)]) });
    stipple(ctx, rand, skirtPoly, Math.round(rx * 0.7), { color: tones.deep, radius: 0.55, alpha: 0.4 });
  });
  for (let i = 1; i < cliffFoot.length - 1; i++) {
    const a = cliffFoot[i]!;
    const t = (a[0] - (cx - rx)) / (2 * rx);
    const col = t < 0.4 ? dust : t < 0.75 ? tones.base : tones.shade;
    const th = hc * rand.range(0.16, 0.4);
    const tw = rx * rand.range(0.07, 0.13);
    shape(ctx, [[a[0] + rand.range(-1, 1), a[1] - th], [a[0] - tw, a[1] + 1.5], [a[0] + tw, a[1] + 1.5]], {
      fill: linearGradient(ctx, 0, a[1] - th, 0, a[1] + 1.5, [rgba(col, 0), rgba(col, 0.92)]),
    });
  }
  shape(ctx, skirtOutline, { stroke: o.ink, width: lw, closed: false });
  const chips = Math.round(rx / 3.2);
  for (let i = 0; i < chips; i++) {
    const t = rand.range(0.04, 0.96);
    const idx = Math.min(skirtFoot.length - 1, Math.round(t * (skirtFoot.length - 1)));
    const a = cliffFoot[idx]!;
    const b = skirtFoot[idx]!;
    const f = rand.range(0.3, 1);
    const r = rand.range(1.2, 2.5) * (0.75 + 0.5 * Math.min(1, rx / 40));
    drawBoulder(ctx, { cx: lerp(a[0], b[0], f) + rand.range(-2, 2), cy: lerp(a[1], b[1], f), rx: r, ry: r * 0.8, rock: o.rock, ink: o.ink, rand, shadow: false, simple: true });
  }

  // Flat top.
  const topPaint = linearGradient(ctx, cx - rx, topCy - ry, cx + rx * 0.7, topCy + ry, [mix(o.top, '#fff1c8', 0.3), o.top, mix(o.top, '#16122e', 0.22)]);
  shape(ctx, ring, { fill: topPaint, stroke: o.ink, width: lw, smooth: false });
  clipped(ctx, ring, () => {
    stipple(ctx, rand, ring, Math.round(rx * 0.9), { color: mix(o.top, '#16122e', 0.45), radius: 0.6, alpha: 0.45 });
    stipple(ctx, rand, ring, Math.round(rx * 0.5), { color: mix(o.top, '#fff4d2', 0.6), radius: 0.55, alpha: 0.5 });
    // The front rim catches the light, the back rim sits in a soft shade.
    shape(ctx, front, { stroke: rgba(tones.highlight, 0.6), width: 1.6, closed: false, smooth: true });
    shape(ctx, ring.slice(n / 2).concat([ring[0]!]), { stroke: rgba('#16122e', 0.25), width: 2, closed: false, smooth: true });
  });
  if (o.vegetation !== false) {
    const green = o.tuftColor ?? '#6f8a3e';
    const inner = ring.map((q): Vec2 => [cx + (q[0] - cx) * 0.78, topCy + (q[1] - topCy) * 0.66]);
    for (let i = 0; i < Math.round(rx / 6); i++) {
      const p = pointIn(rand, inner);
      if (p) tuft(ctx, p[0], p[1], rand.range(2.4, 3.8), green, 0.9);
    }
    const stone = rand.chance(0.7) ? pointIn(rand, inner) : null;
    if (stone) drawBoulder(ctx, { cx: stone[0], cy: stone[1], rx: rand.range(2.2, 3.4), ry: rand.range(1.7, 2.5), rock: o.rock, ink: o.ink, rand, shadow: false });
  }
  return { top: ring, topCx: cx, topCy };
}
