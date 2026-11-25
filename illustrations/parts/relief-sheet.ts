import { rgba } from '../kit/colors';
import { clipped, ellipse, linearGradient, shape, softBlob } from '../kit/draw';
import { blob, jagged } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { COOL_INK, shifted } from './relief-common';

const scaled = (pts: readonly Vec2[], cx: number, cy: number, k: number): Vec2[] => pts.map((p): Vec2 => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k]);

export interface GlacierOptions {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rand: Rng;
  ink?: string;
  crevasses?: number;
  /** Dark gravel along the flanks and down the middle. */
  moraine?: boolean;
  /** Turquoise melt pond. */
  pond?: boolean;
}

/** A river of ice seen from above: flow lines, fanned crevasses, optional moraine and melt pond. */
export function drawGlacier(ctx: Ctx2D, o: GlacierOptions): void {
  const { rand, cx, cy, rx, ry } = o;
  const ink = o.ink ?? COOL_INK;
  const body = blob(rand, cx, cy, rx, ry, { points: 22, jitter: 0.1, lobes: 3, lobeAmp: 0.1 });

  softBlob(ctx, cx + rx * 0.05, cy + ry * 0.25, rx * 1.1, ry * 1.1, '#51709f', 0.28);
  shape(ctx, scaled(body, cx, cy, 1.09), { fill: rgba('#ffffff', 0.55), smooth: true });
  shape(ctx, body, { fill: linearGradient(ctx, cx - rx, cy - ry, cx + rx, cy + ry, ['#ffffff', '#e1f0fb', '#a9cdea']), smooth: true });
  clipped(ctx, body, () => {
    const lines = 5;
    for (let i = 0; i < lines; i++) {
      const v = -0.7 + (1.4 * i) / (lines - 1);
      const phase = rand.range(0, 6.28);
      const pts: Vec2[] = [];
      for (let k = 0; k <= 8; k++) {
        const u = -1 + (2 * k) / 8;
        pts.push([cx + u * rx, cy + v * ry * (1 - 0.25 * u * u) + Math.sin(u * 2.2 + phase) * ry * 0.08]);
      }
      shape(ctx, shifted(pts, 0, 1.1), { stroke: rgba('#6f9ccc', 0.4), width: 1.2, closed: false, smooth: true });
      shape(ctx, pts, { stroke: rgba('#ffffff', 0.85), width: 1.4, closed: false, smooth: true });
    }
    for (let k = 0; k < (o.crevasses ?? 8); k++) {
      const x = cx + rx * rand.range(-0.8, 0.8);
      const y = cy + ry * rand.range(-0.6, 0.6);
      const a = Math.PI / 2 + rand.range(-0.55, 0.55);
      const len = ry * rand.range(0.3, 0.7);
      const dx = Math.cos(a) * len * 0.5;
      const dy = Math.sin(a) * len * 0.5;
      const crack = jagged(rand, [x - dx, y - dy], [x + dx, y + dy], 4, 1.1);
      shape(ctx, crack, { stroke: rgba('#254a85', 0.85), width: 1.5, closed: false });
      shape(ctx, shifted(crack, -0.8, -0.8), { stroke: rgba('#ffffff', 0.9), width: 0.9, closed: false });
    }
    shape(ctx, body, { fill: linearGradient(ctx, cx - rx * 0.3, cy - ry, cx + rx * 0.5, cy + ry, [rgba('#ffffff', 0), rgba('#3a68ab', 0.24)]) });
    shape(ctx, body, { stroke: rgba('#5d8bc2', 0.5), width: 5, smooth: true });
    if (o.pond) {
      const px = cx + rx * rand.range(-0.25, 0.3);
      const py = cy + ry * rand.range(-0.2, 0.2);
      ellipse(ctx, px, py, rx * 0.13, ry * 0.16, { fill: linearGradient(ctx, px, py - ry * 0.16, px, py + ry * 0.16, ['#8cf0ec', '#2fb5cf']), stroke: rgba('#ffffff', 0.9), width: 1.2, rotation: rand.range(-0.4, 0.4) });
      ellipse(ctx, px - rx * 0.04, py - ry * 0.05, rx * 0.04, ry * 0.04, { fill: rgba('#ffffff', 0.8) });
    }
  }, true);
  if (o.moraine) {
    const rocks: string[] = ['#5e5a56', '#7a746c', '#4a4743'];
    for (let k = 0; k < 46; k++) {
      const p = body[rand.int(0, body.length - 1)]!;
      const s = rand.range(0.78, 0.94);
      const r = rand.range(0.6, 1.3);
      ellipse(ctx, cx + (p[0] - cx) * s, cy + (p[1] - cy) * s, r, r * 0.8, { fill: rand.pick(rocks) });
    }
    for (let k = 0; k < 18; k++) {
      const u = rand.range(-0.78, 0.78);
      const r = rand.range(0.6, 1.2);
      ellipse(ctx, cx + u * rx, cy + ry * 0.05 + Math.sin(u * 2.4) * ry * 0.08 + rand.range(-1.2, 1.2), r, r * 0.8, { fill: rand.pick(rocks) });
    }
  }
  shape(ctx, body, { stroke: rgba(ink, 0.8), width: 1.1, smooth: true });
}

export interface LakeOptions {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rand: Rng;
  ink?: string;
  /** Share of the ice that is covered with snow (0..1). */
  snowy?: number;
  /** A dark ice-fishing hole. */
  hole?: boolean;
}

/** A lake frozen over: pale blue ice with glare, cracks and a snowy bank. */
export function drawFrozenLake(ctx: Ctx2D, o: LakeOptions): void {
  const { rand, cx, cy, rx, ry } = o;
  const ink = o.ink ?? COOL_INK;
  const shore = blob(rand, cx, cy, rx * 1.16, ry * 1.2, { points: 24, jitter: 0.06, lobes: 7, lobeAmp: 0.05 });
  const lake = blob(rand, cx, cy, rx, ry, { points: 22, jitter: 0.1, lobes: 3, lobeAmp: 0.08 });

  softBlob(ctx, cx + 1, cy + ry * 0.3, rx * 1.2, ry * 1.1, '#2c3f66', 0.22);
  shape(ctx, shore, { fill: linearGradient(ctx, cx - rx, cy - ry, cx + rx, cy + ry, ['#ffffff', '#eef6fc', '#d4e5f4']), stroke: rgba('#7d9cc4', 0.6), width: 0.9, smooth: true });
  shape(ctx, lake, { fill: linearGradient(ctx, cx - rx * 0.8, cy - ry, cx + rx * 0.8, cy + ry, ['#e4f6fc', '#b5e0f2', '#7bb9de']), smooth: true });
  clipped(ctx, lake, () => {
    for (let k = 0; k < 3; k++) softBlob(ctx, cx + rx * rand.range(-0.5, 0.5), cy + ry * rand.range(-0.4, 0.5), rx * rand.range(0.2, 0.35), ry * rand.range(0.18, 0.3), '#4f9ccf', 0.3);
    softBlob(ctx, cx - rx * 0.3, cy - ry * 0.35, rx * 0.55, ry * 0.32, '#ffffff', 0.75);
    const patches = Math.round((o.snowy ?? 0.2) * 5);
    for (let k = 0; k < patches; k++) {
      const a = rand.range(0, 6.28);
      const px = cx + Math.cos(a) * rx * rand.range(0.45, 0.85);
      const py = cy + Math.sin(a) * ry * rand.range(0.45, 0.85);
      const patch = blob(rand, px, py, rx * rand.range(0.18, 0.34), ry * rand.range(0.16, 0.3), { points: 10, jitter: 0.25 });
      shape(ctx, patch, { fill: rgba('#ffffff', 0.92), stroke: rgba('#9db9da', 0.6), width: 0.8, smooth: true });
    }
    const hub: Vec2 = [cx + rx * rand.range(-0.25, 0.25), cy + ry * rand.range(-0.2, 0.2)];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * 6.28 + rand.range(-0.4, 0.4);
      const len = Math.min(rx, ry * 1.4) * rand.range(0.45, 1.1);
      const crack = jagged(rand, hub, [hub[0] + Math.cos(a) * len, hub[1] + Math.sin(a) * len * (ry / rx)], 5, 1.2);
      shape(ctx, shifted(crack, 0.5, 0.7), { stroke: rgba('#3f74ad', 0.55), width: 1, closed: false });
      shape(ctx, crack, { stroke: rgba('#ffffff', 0.95), width: 1, closed: false });
    }
    for (let k = 0; k < 7; k++) {
      ellipse(ctx, cx + rx * rand.range(-0.7, 0.7), cy + ry * rand.range(-0.6, 0.6), rand.range(0.8, 1.8), rand.range(0.6, 1.2), { stroke: rgba('#ffffff', 0.7), width: 0.6 });
    }
    shape(ctx, lake, { stroke: rgba('#ffffff', 0.9), width: 4.5, smooth: true });
    shape(ctx, shifted(lake, 0.8, 1), { stroke: rgba('#4f84bc', 0.4), width: 2.4, smooth: true });
  }, true);
  shape(ctx, lake, { stroke: rgba(ink, 0.55), width: 1, smooth: true });
  if (o.hole) {
    const hx = cx + rx * 0.22;
    const hy = cy + ry * 0.12;
    ellipse(ctx, hx, hy, 4, 2.7, { fill: '#2b6ea8', stroke: rgba('#ffffff', 0.95), width: 1.3 });
    ellipse(ctx, hx, hy, 3, 1.9, { fill: '#173f72', stroke: rgba(ink, 0.8), width: 0.8 });
    shape(ctx, [[hx + 5, hy - 0.5], [hx + 12, hy - 6]], { stroke: '#6b4a2b', width: 1, closed: false });
  }
}

export interface DriftOptions {
  cx: number;
  baseY: number;
  w: number;
  h: number;
  rand: Rng;
  ink?: string;
  /** Where the crest sits along the width (0..1); the steep lee side is on the right. */
  crest?: number;
  ripples?: number;
}

/** A wind-carved drift: gentle lit windward slope, steep shaded lee, sastrugi ripples. */
export function drawSnowdrift(ctx: Ctx2D, o: DriftOptions): void {
  const { rand, cx, baseY, w, h } = o;
  const ink = o.ink ?? COOL_INK;
  const crest = o.crest ?? 0.62;
  const x0 = cx - w / 2;
  const steps = 12;
  const top: Vec2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const rise = t < crest ? Math.sin((t / crest) * (Math.PI / 2)) ** 1.5 : Math.cos(((t - crest) / (1 - crest)) * (Math.PI / 2)) ** 0.8;
    top.push([x0 + w * t, baseY - h * rise + (i === 0 || i === steps ? 0 : rand.range(-0.5, 0.5))]);
  }
  const bottom: Vec2[] = [];
  for (let i = 1; i < 6; i++) {
    const t = 1 - i / 6;
    bottom.push([x0 + w * t, baseY + Math.sin(t * Math.PI) * h * 0.2 + rand.range(-0.3, 0.3)]);
  }
  const body: Vec2[] = [...top, ...bottom];

  softBlob(ctx, cx + w * 0.12, baseY + h * 0.12, w * 0.55, h * 0.3, '#42618f', 0.26);
  const ci = Math.round(steps * crest);
  const crestPt = top[ci]!;
  const ridgeFoot: Vec2 = [crestPt[0] - w * 0.1, baseY + h * 0.12];
  const lee: Vec2[] = [...top.slice(ci), ...bottom.filter((p) => p[0] > ridgeFoot[0]), ridgeFoot];
  shape(ctx, body, { fill: linearGradient(ctx, x0, baseY - h, x0 + w * 0.3, baseY + h * 0.2, ['#ffffff', '#f1f6fc', '#dce8f6']), smooth: true });
  clipped(ctx, body, () => {
    shape(ctx, lee, { fill: linearGradient(ctx, crestPt[0], crestPt[1], x0 + w, baseY + h * 0.1, ['#cddcf0', '#a8c0de']), smooth: true });
    softBlob(ctx, crestPt[0] - w * 0.04, crestPt[1] + h * 0.35, w * 0.12, h * 0.4, '#8fb0d8', 0.35);
    for (let k = 0; k < (o.ripples ?? 4); k++) {
      const t = rand.range(0.08, crest * 0.8);
      const y = baseY - h * rand.range(0.1, 0.55);
      const pts: Vec2[] = [[x0 + w * t, y], [x0 + w * (t + 0.08), y - h * 0.06], [x0 + w * (t + 0.17), y - h * 0.02]];
      shape(ctx, pts, { stroke: rgba('#8fb0d8', 0.65), width: 0.9, closed: false, smooth: true });
    }
    shape(ctx, shifted(top.slice(2, Math.max(4, ci)), 0.4, 1), { stroke: rgba('#ffffff', 0.9), width: 1.2, closed: false, smooth: true });
  }, true);
  shape(ctx, [crestPt, [(crestPt[0] + ridgeFoot[0]) / 2 + 0.8, (crestPt[1] + ridgeFoot[1]) / 2], ridgeFoot], { stroke: rgba('#7f9fcc', 0.8), width: 1.2, closed: false, smooth: true });
  shape(ctx, top, { stroke: rgba(ink, 0.7), width: 1, closed: false, smooth: true });
  shape(ctx, [...bottom].reverse(), { stroke: rgba(ink, 0.35), width: 0.8, closed: false, smooth: true });
}
