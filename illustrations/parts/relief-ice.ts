import { mix, rgba } from '../kit/colors';
import { clipped, hatch, linearGradient, shape, softBlob, taper } from '../kit/draw';
import { blob, jagged } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { peakGeometry, type PeakGeometry } from './peak';
import { COOL_INK, shifted } from './relief-common';
import { towerGeometry, type TowerGeometry } from './relief-tower';

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

type Ramp = ReadonlyArray<readonly [number, string]>;

/** Light ramps: 0 = deepest shade, 1 = brightest sun. */
export const SNOW_RAMP: Ramp = [[0, '#6f8fc0'], [0.15, '#8fb0d8'], [0.35, '#b4d1ea'], [0.55, '#d3e6f6'], [0.78, '#eef7fe'], [1, '#ffffff']];
export const ICE_RAMP: Ramp = [[0, '#46618f'], [0.25, '#5f80b0'], [0.5, '#7ea3cc'], [0.75, '#a1c4e2'], [1, '#c7e0f2']];

export function rampColor(ramp: Ramp, l: number): string {
  const v = clamp(l, 0, 1);
  for (let i = 1; i < ramp.length; i++) {
    const [t1, c1] = ramp[i]!;
    if (v <= t1) {
      const [t0, c0] = ramp[i - 1]!;
      return mix(c0, c1, (v - t0) / (t1 - t0 || 1));
    }
  }
  return ramp[ramp.length - 1]![1];
}

/** A point at fraction `t` of the length of a polyline. */
function pathAt(pts: readonly Vec2[]): (t: number) => Vec2 {
  const lens: number[] = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
  const total = lens[lens.length - 1] || 1;
  return (t: number): Vec2 => {
    const d = clamp(t, 0, 1) * total;
    let i = 1;
    while (i < lens.length - 1 && lens[i]! < d) i++;
    const seg = lens[i]! - lens[i - 1]! || 1;
    const k = (d - lens[i - 1]!) / seg;
    const a = pts[i - 1]!;
    const b = pts[i]!;
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  };
}

/** Four-point glint. */
export function sparkle(ctx: Ctx2D, x: number, y: number, r: number, color = '#ffffff'): void {
  shape(ctx, [[x, y - r], [x + r * 0.22, y - r * 0.22], [x + r, y], [x + r * 0.22, y + r * 0.22], [x, y + r], [x - r * 0.22, y + r * 0.22], [x - r, y], [x - r * 0.22, y - r * 0.22]], { fill: color });
}

export interface FacetOptions {
  /** Silhouette side and ridge side, both from the summit to the foot. */
  edge: readonly Vec2[];
  ridge: readonly Vec2[];
  /** The face polygon the facets are clipped to. */
  face: readonly Vec2[];
  lit: boolean;
  rows: number;
  cols: number;
  /** Share of the height covered by snow. */
  snow: number;
  rand: Rng;
  ink: string;
}

/** Low-poly planes of snow and blue ice that tile one face of a peak. */
export function paintFacets(ctx: Ctx2D, o: FacetOptions): void {
  const { rand, rows, cols } = o;
  const E = pathAt(o.edge);
  const R = pathAt(o.ridge);
  const ph = rand.range(0, 6.28);
  const grid: Vec2[][] = [];
  const us: number[] = [];
  for (let c = 0; c <= cols; c++) us.push(-0.3 + (1.42 * c) / cols);
  const vs: number[] = [];
  for (let r = 0; r <= rows; r++) vs.push(-0.04 + 1.14 * (r / rows) ** 1.1);
  for (let r = 0; r <= rows; r++) {
    const row: Vec2[] = [];
    for (let c = 0; c <= cols; c++) {
      const inner = r > 0 && r < rows && c > 0 && c < cols ? 1 : 0.35;
      const u = us[c]! + rand.range(-0.2, 0.2) * inner * (1.42 / cols);
      const v = vs[r]! + rand.range(-0.2, 0.2) * inner * (1.14 / rows);
      const e = E(v);
      const g = R(v);
      row.push([e[0] + (g[0] - e[0]) * u, e[1] + (g[1] - e[1]) * u]);
    }
    grid.push(row);
  }

  clipped(ctx, o.face, () => {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p00 = grid[r]![c]!;
        const p10 = grid[r]![c + 1]!;
        const p11 = grid[r + 1]![c + 1]!;
        const p01 = grid[r + 1]![c]!;
        const uc = (us[c]! + us[c + 1]!) / 2;
        const vc = (vs[r]! + vs[r + 1]!) / 2;
        const snowy = vc < o.snow * (0.95 + 0.3 * Math.sin(uc * 5 + ph)) + rand.range(-0.05, 0.05);
        let l = (o.lit ? 0.7 : 0.26) - 0.3 * vc - (o.lit ? 0.1 : -0.04) * clamp(uc, 0, 1) + rand.range(-0.15, 0.15);
        if (!snowy) l += 0.06;
        const ramp = snowy ? SNOW_RAMP : ICE_RAMP;
        const diag = rand.chance(0.5);
        const tris: Vec2[][] = diag ? [[p00, p10, p11], [p00, p11, p01]] : [[p00, p10, p01], [p10, p11, p01]];
        tris.forEach((t, i) => {
          const tone = rampColor(ramp, l + (i === 0 ? 0.07 : -0.07));
          shape(ctx, t, { fill: tone, stroke: tone, width: 0.7 });
        });
        if (rand.chance(0.5)) shape(ctx, diag ? [p00, p11] : [p10, p01], { stroke: rgba(o.ink, 0.2), width: 0.8, closed: false });
        if (rand.chance(0.3)) shape(ctx, [p00, p10], { stroke: rgba(o.ink, 0.16), width: 0.8, closed: false });
        if (rand.chance(0.3)) shape(ctx, [p00, p01], { stroke: rgba(o.ink, 0.16), width: 0.8, closed: false });
      }
    }
  });
}

export interface IcePeakOptions {
  cx: number;
  baseY: number;
  w: number;
  h: number;
  lean?: number;
  flare?: number;
  segs?: number;
  stairs?: number;
  crown?: number;
  /** Share of the height covered by snow. Default 0.5. */
  snow?: number;
  rows?: number;
  cols?: number;
  /** A ribbon of glacier running down one face. */
  glacier?: 'left' | 'right';
  ink?: string;
  rand: Rng;
  shadow?: boolean;
}

/** A crystalline peak: faceted planes of snow over blue ice, a lit left flank and a cool shaded right flank. */
export function drawIcePeak(ctx: Ctx2D, o: IcePeakOptions): TowerGeometry {
  const { rand, cx, baseY, w, h } = o;
  const ink = o.ink ?? COOL_INK;
  const g = towerGeometry({ cx, baseY, w, h, lean: o.lean, flare: o.flare, segs: o.segs ?? 5, stairs: o.stairs ?? 0.2, crown: o.crown ?? 0.04, rock: '#8ea9c6', ink, rand });
  const rows = o.rows ?? (h > 60 ? 6 : 5);
  const cols = o.cols ?? 3;
  const snow = o.snow ?? 0.5;
  const lw = clamp(w * 0.017, 1.1, 1.9);

  if (o.shadow !== false) softBlob(ctx, cx + w * 0.14, baseY + h * 0.02, w * 0.62, h * 0.1, '#1d2535', 0.34);
  shape(ctx, g.silhouette, { fill: ink, stroke: ink, width: lw * 2 });
  paintFacets(ctx, { edge: g.leftEdge, ridge: g.ridge, face: g.leftFace, lit: true, rows, cols, snow, rand, ink });
  paintFacets(ctx, { edge: g.rightEdge, ridge: g.ridge, face: g.rightFace, lit: false, rows, cols, snow, rand, ink });

  if (o.glacier) {
    const left = o.glacier === 'left';
    const face = left ? g.leftFace : g.rightFace;
    const edge = left ? g.leftEdge : g.rightEdge;
    const E = pathAt(edge);
    const R = pathAt(g.ridge);
    const u0 = rand.range(0.28, 0.45);
    const pts: Vec2[] = [];
    const side: Vec2[] = [];
    for (let i = 0; i <= 8; i++) {
      const v = 0.3 + (i / 8) * 0.85;
      const e = E(v);
      const r = R(v);
      const u = u0 + 0.06 * Math.sin(i * 1.3) + 0.04 * i / 8;
      const half = 0.07 + 0.11 * (i / 8);
      pts.push([e[0] + (r[0] - e[0]) * (u - half), e[1] + (r[1] - e[1]) * (u - half)]);
      side.push([e[0] + (r[0] - e[0]) * (u + half), e[1] + (r[1] - e[1]) * (u + half)]);
    }
    clipped(ctx, face, () => {
      const tongue: Vec2[] = [...pts, ...side.slice().reverse()];
      shape(ctx, tongue, { fill: linearGradient(ctx, 0, baseY - h * 0.7, 0, baseY + 2, [rgba('#f4fbff', 0.0), '#e6f4fc', '#cfe7f6']), smooth: false });
      shape(ctx, pts, { stroke: rgba('#5f84b8', 0.55), width: 0.9, closed: false, smooth: true });
      shape(ctx, side, { stroke: rgba('#5f84b8', 0.55), width: 0.9, closed: false, smooth: true });
      for (let k = 0; k < 4; k++) {
        const i = 3 + k;
        const a = pts[i]!;
        const b = side[i]!;
        shape(ctx, jagged(rand, [a[0] * 0.7 + b[0] * 0.3, a[1] * 0.7 + b[1] * 0.3], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75], 3, 0.8), { stroke: rgba('#4d6f9e', 0.7), width: 0.8, closed: false });
      }
    });
  }

  clipped(ctx, g.silhouette, () => {
    shape(ctx, g.silhouette, { fill: linearGradient(ctx, 0, baseY - h * 0.3, 0, baseY + 2, [rgba('#3b5a8f', 0), rgba('#3b5a8f', 0.32)]) });
    shape(ctx, shifted(g.leftEdge, lw * 0.9, lw * 0.9), { stroke: rgba('#ffffff', 0.75), width: lw * 0.8, closed: false });
    shape(ctx, shifted(g.ridge, -lw * 0.5, 0), { stroke: rgba('#ffffff', 0.4), width: 0.8, closed: false });
  });
  shape(ctx, g.leftEdge, { stroke: ink, width: lw, closed: false });
  shape(ctx, [g.leftEdge[0]!, g.rightEdge[0]!], { stroke: ink, width: lw, closed: false });
  shape(ctx, g.rightEdge, { stroke: ink, width: lw * 1.2, closed: false });
  shape(ctx, g.ridge, { stroke: rgba(ink, 0.6), width: lw * 0.75, closed: false });
  sparkle(ctx, g.apex[0] - w * 0.02, g.apex[1] + h * 0.07, clamp(w * 0.05, 2, 4.5));
  return g;
}

export interface SnowFootOptions {
  x0: number;
  x1: number;
  y: number;
  /** Height of the drift. */
  h: number;
  rand: Rng;
  ink?: string;
  blocks?: number;
}

/** Lumpy snow drifts at the foot of a peak plus a few broken blocks of blue ice. */
export function drawSnowFoot(ctx: Ctx2D, o: SnowFootOptions): void {
  const { rand, x0, x1, y, h } = o;
  const ink = o.ink ?? COOL_INK;
  const w = x1 - x0;
  const lw = clamp(w * 0.01, 0.9, 1.3);
  const n = Math.max(3, Math.round(w / 13));
  softBlob(ctx, x0 + w * 0.52, y + h * 0.3, w * 0.58, h * 0.55, '#1d2535', 0.3);
  const domes: { x: number; rx: number; ry: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i + rand.range(0.25, 0.75)) / n;
    const mid = Math.sin(Math.PI * t) ** 0.45;
    domes.push({ x: x0 + w * t, rx: (w / n) * rand.range(0.8, 1.3), ry: h * rand.range(0.55, 1) * (0.55 + 0.45 * mid) });
  }
  domes.sort((a, b) => b.ry - a.ry);
  for (const d of domes) {
    const top: Vec2[] = [];
    for (let k = 0; k <= 8; k++) {
      const a = Math.PI + (Math.PI * k) / 8;
      top.push([d.x + Math.cos(a) * d.rx, y + Math.sin(a) * d.ry + rand.range(-0.3, 0.3)]);
    }
    const poly: Vec2[] = [...top, [d.x + d.rx * 0.4, y + h * 0.28], [d.x - d.rx * 0.4, y + h * 0.3]];
    shape(ctx, poly, { fill: linearGradient(ctx, d.x - d.rx * 0.6, y - d.ry, d.x + d.rx * 0.5, y + h * 0.3, ['#ffffff', '#e8f3fb', '#a9c4e3']), smooth: true });
    shape(ctx, top, { stroke: rgba(ink, 0.7), width: lw, closed: false, smooth: true });
  }
  for (let k = 0; k < (o.blocks ?? 2); k++) {
    const bx = x0 + w * ((k + rand.range(0.2, 0.8)) / Math.max(1, o.blocks ?? 2));
    const by = y + h * rand.range(0.05, 0.3);
    const r = rand.range(1.3, 2.2);
    const bl = blob(rand, bx, by, r * 1.3, r * 0.8, { points: 6, jitter: 0.25 });
    shape(ctx, bl, { fill: linearGradient(ctx, bx - r, by - r, bx + r, by + r, ['#f2fbff', '#a9d2ec', '#6f9fcb']), stroke: rgba(ink, 0.8), width: 0.7 });
  }
}

/** Hanging icicles along an edge: sorted left to right, each a tapered translucent spike. */
export function drawIcicles(ctx: Ctx2D, rand: Rng, edge: readonly Vec2[], count: number, maxLen: number, ink: string): void {
  const at = pathAt(edge);
  for (let i = 0; i < count; i++) {
    const t = (i + rand.range(0.2, 0.8)) / count;
    const p = at(t);
    const len = maxLen * rand.range(0.4, 1);
    const hw = rand.range(0.8, 1.5);
    const pts: Vec2[] = [[p[0] - hw, p[1] - 0.5], [p[0] + hw, p[1] - 0.5], [p[0] + rand.range(-0.4, 0.4), p[1] + len]];
    shape(ctx, pts, { fill: linearGradient(ctx, p[0] - hw, p[1], p[0] + hw, p[1] + len, ['#ffffff', '#bfe0f4', '#8dbbe0']), stroke: rgba(ink, 0.75), width: 0.6 });
  }
}

/** A one-sided shading wedge that starts as a point and widens down the line. */
function wedge(ctx: Ctx2D, line: readonly Vec2[], width: number, side: -1 | 1, fill: string): void {
  const n = line.length - 1;
  taper(ctx, line.map((p, i): Vec2 => [p[0] + side * (width / 2) * (i / n), p[1]]), 0.15, width, fill, true);
}

export interface IceMountainOptions {
  cx: number;
  baseY: number;
  w: number;
  h: number;
  lean?: number;
  rugged?: number;
  gullies?: number;
  /** Depth of the white snow field as a share of the height. Default 0.62. */
  snow?: number;
  /** A ribbon of glacier running down one face. */
  glacier?: 'left' | 'right';
  ink?: string;
  rand: Rng;
  shadow?: boolean;
}

/** A hand-inked alpine peak of white snow over blue ice: bright left flank, cool hatched right flank. */
export function drawIceMountain(ctx: Ctx2D, o: IceMountainOptions): PeakGeometry {
  const { rand, cx, baseY, w, h } = o;
  const ink = o.ink ?? COOL_INK;
  const g = peakGeometry({ cx, baseY, w, h, rock: '#8fb0d2', ink, lean: o.lean, rugged: o.rugged ?? 1.25, gullies: o.gullies ?? 3, rand });
  const { apex, left, right, ridgeBase } = g;
  const lw = clamp(w * 0.012, 1, 1.7);
  const depth = h * (o.snow ?? 0.8);

  if (o.shadow !== false) softBlob(ctx, cx + w * 0.14, baseY + h * 0.02, w * 0.62, h * 0.1, '#1d2535', 0.34);

  // Blue ice and rock show through below the snow line.
  shape(ctx, g.leftFace, { fill: linearGradient(ctx, left[0], apex[1], ridgeBase[0], baseY, ['#d3e3f3', '#abc8e6', '#86a9d3']) });
  shape(ctx, g.rightFace, { fill: linearGradient(ctx, apex[0], apex[1], right[0], baseY, ['#a9c2e0', '#829fcb', '#6482b5']) });

  const span = w * 0.62;
  const teeth = 11;
  const edge: Vec2[] = [[apex[0] - span, apex[1] - 4]];
  for (let i = 0; i <= teeth; i++) {
    const t = i / teeth;
    const flank = 1 - 0.4 * Math.abs(t - 0.5) * 2;
    edge.push([apex[0] - span + span * 2 * t, apex[1] + depth * (i % 2 === 0 ? 1 : 0.55) * flank * rand.range(0.75, 1.2)]);
  }
  edge.push([apex[0] + span, apex[1] - 4]);
  const litSnow = linearGradient(ctx, apex[0] - w * 0.3, apex[1], apex[0] + w * 0.1, apex[1] + depth, ['#ffffff', '#f0f8fe', '#d4e6f6']);
  const shadeSnow = linearGradient(ctx, apex[0], apex[1], apex[0] + w * 0.34, apex[1] + depth, ['#d9e8f6', '#adc7e4', '#8aa8d2']);
  clipped(ctx, g.leftFace, () => shape(ctx, edge, { fill: litSnow }));
  clipped(ctx, g.rightFace, () => shape(ctx, edge, { fill: shadeSnow }));

  if (o.glacier) {
    const leftSide = o.glacier === 'left';
    const E = pathAt(leftSide ? g.leftSlope : g.rightSlope);
    const R = pathAt(g.ridge);
    const u0 = rand.range(0.4, 0.55);
    const a: Vec2[] = [];
    const b: Vec2[] = [];
    for (let i = 0; i <= 9; i++) {
      const v = 0.3 + (i / 9) * 0.76;
      const e = E(v);
      const r = R(v);
      const u = u0 + 0.04 * Math.sin(i * 1.1) + 0.04 * (i / 9);
      const half = 0.05 + 0.07 * (i / 9) ** 1.2;
      a.push([e[0] + (r[0] - e[0]) * (u - half), e[1] + (r[1] - e[1]) * (u - half)]);
      b.push([e[0] + (r[0] - e[0]) * (u + half), e[1] + (r[1] - e[1]) * (u + half)]);
    }
    clipped(ctx, leftSide ? g.leftFace : g.rightFace, () => {
      const tongue: Vec2[] = [...a, ...b.slice().reverse()];
      shape(ctx, tongue, { fill: linearGradient(ctx, 0, apex[1] + h * 0.25, 0, baseY, [rgba('#e4f5fd', 0), '#c4e7f6', '#8cc7e8']) });
      shape(ctx, a, { stroke: rgba('#ffffff', 0.7), width: 1.6, closed: false, smooth: true });
      shape(ctx, b, { stroke: rgba('#ffffff', 0.5), width: 1.4, closed: false, smooth: true });
      shape(ctx, leftSide ? b : a, { stroke: rgba('#3f64a0', 0.6), width: 0.8, closed: false, smooth: true });
      for (let k = 4; k < 9; k++) {
        const p = a[k]!;
        const q = b[k]!;
        shape(ctx, jagged(rand, [p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25 - 0.4], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75 + 0.4], 3, 0.6), { stroke: rgba('#3a609c', 0.8), width: 0.8, closed: false });
      }
    });
  }

  // Sub-ridges: the right flank of each ridge falls into shadow, the left flank catches the light.
  const wide = w * 0.12;
  for (const face of ['left', 'right'] as const) {
    const lit = face === 'left';
    const poly = lit ? g.leftFace : g.rightFace;
    clipped(ctx, poly, () => {
      for (const s of g.spurs) {
        if (s.side !== face) continue;
        const line = s.line.slice(0, Math.max(5, Math.round(s.line.length * rand.range(0.5, 1))));
        wedge(ctx, line, wide * rand.range(0.8, 1.2), 1, lit ? 'rgba(104,140,196,0.32)' : 'rgba(44,72,128,0.36)');
        wedge(ctx, line, wide * 0.45, -1, lit ? 'rgba(255,255,255,0.5)' : 'rgba(190,214,240,0.22)');
        shape(ctx, line, { stroke: rgba(ink, lit ? 0.42 : 0.36), width: Math.max(0.7, w * 0.007), closed: false });
      }
      if (!lit) hatch(ctx, rand, poly, { angle: -1.05, spacing: Math.max(1.7, w * 0.024), color: '#33518a', width: 0.7, alpha: 0.26, ragged: true, skip: 0.3 });
    });
  }

  clipped(ctx, g.silhouette, () => {
    shape(ctx, g.silhouette, { fill: linearGradient(ctx, 0, baseY - h * 0.32, 0, baseY + h * 0.04, [rgba('#2f4a80', 0), rgba('#2f4a80', 0.3)]) });
    shape(ctx, shifted(g.leftSlope, w * 0.014, w * 0.01), { stroke: rgba('#ffffff', 0.85), width: Math.max(0.8, w * 0.01), closed: false });
    shape(ctx, edge.slice(1, -1), { stroke: rgba('#4a69a0', 0.5), width: Math.max(0.7, w * 0.008), closed: false });
  });
  shape(ctx, g.leftSlope, { stroke: ink, width: lw, closed: false });
  shape(ctx, g.rightSlope, { stroke: ink, width: lw, closed: false });
  shape(ctx, g.ridge, { stroke: rgba(ink, 0.65), width: Math.max(0.8, w * 0.009), closed: false });
  sparkle(ctx, apex[0] - w * 0.015, apex[1] + h * 0.08, clamp(w * 0.04, 1.8, 4));
  return g;
}
