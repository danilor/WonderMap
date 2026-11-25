import { mix, rgba } from '../kit/colors';
import { clipped, ellipse, linearGradient, radialGradient, shades, shape, softBlob, stipple } from '../kit/draw';
import { TAU } from '../kit/math';
import { blob, catmullRom, jagged } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { drawBoulder, shifted, tuft } from './relief-common';
import { LAVA, drawLavaRiver } from './relief-fire';
import { drawSteam } from './relief-thermal';

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
const VOID = '#0b0705';

export interface GroundTones {
  lit: string;
  base: string;
  deep: string;
}

/** Ground colors for the rim around a pit or a crack. */
export const LIP = {
  earth: { lit: '#c9a173', base: '#a47c50', deep: '#6e5132' },
  grass: { lit: '#aecf72', base: '#84a954', deep: '#4f7a3a' },
  limestone: { lit: '#ebe4d2', base: '#c8bfa9', deep: '#8e8674' },
  sand: { lit: '#f0d9a2', base: '#d4b278', deep: '#a1804f' },
  basalt: { lit: '#7e7a86', base: '#5c5964', deep: '#38353f' },
} as const satisfies Record<string, GroundTones>;

/** A curved stroke along part of an ellipse (ripples). */
function arc(ctx: Ctx2D, cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, color: string, width: number): void {
  const pts: Vec2[] = [];
  for (let i = 0; i <= 8; i++) {
    const a = a0 + ((a1 - a0) * i) / 8;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  shape(ctx, pts, { stroke: color, width, closed: false, smooth: true });
}

export type PitFloor = 'dark' | 'water' | 'rubble' | 'ember';

export interface SinkholeOptions {
  cx: number;
  cy: number;
  /** Radii of the opening. */
  rx: number;
  ry: number;
  rand: Rng;
  ink: string;
  lip: GroundTones;
  /** Color of the pit wall. */
  wall: string;
  floor?: PitFloor;
  /** Thickness of the ring around the opening as a share of rx. Default 0.3. */
  ring?: number;
  /** Raggedness of the opening: 0.05 is smooth, 0.17 is a collapse. */
  jag?: number;
  /** Soil band between the lip and the void. */
  edge?: string;
  roots?: boolean;
  /** Blade color for tufts on the lip. */
  grass?: string;
  chips?: number;
  cracks?: number;
  /** Color of the chips and fallen blocks. */
  rock: string;
}

/** A round pit in the ground: raised lip, far wall with strata, and a floor of darkness, water, rubble or embers. */
export function drawSinkhole(ctx: Ctx2D, o: SinkholeOptions): void {
  const { rand, cx, cy, rx, ry, ink, lip } = o;
  const ring = o.ring ?? 0.3;
  const kind = o.floor ?? 'dark';
  const lw = clamp(rx * 0.05, 1, 1.9);
  const wallT = shades(o.wall);
  const orx = rx * (1 + ring);
  const ory = ry * (1 + ring * 0.85);
  const ocy = cy + ry * 0.06;
  const lipPoly = blob(rand, cx, ocy, orx, ory, { points: 22, jitter: 0.04, lobes: 4, lobeAmp: 0.03 });
  const pit = blob(rand, cx, cy, rx, ry, { points: o.jag ? 26 : 18, jitter: o.jag ?? 0.055 });
  const n = pit.length;
  const depth = ry * 0.9;
  const floor: Vec2[] = pit.map((p): Vec2 => [cx + (p[0] - cx) * 0.9, cy + (p[1] - cy) * 0.86 + depth]);

  softBlob(ctx, cx + rx * 0.08, ocy + ory * 0.35, orx * 1.12, ory * 1.05, '#1d160c', 0.34);
  shape(ctx, lipPoly, { fill: ink, stroke: ink, width: lw * 2 });
  shape(ctx, lipPoly, { fill: linearGradient(ctx, cx - orx, cy - ory, cx + orx * 0.8, cy + ory, [[0, lip.lit], [0.5, lip.base], [1, lip.deep]]) });
  clipped(ctx, lipPoly, () => {
    // The outer slope of the raised lip turns away from the light.
    shape(ctx, lipPoly, { fill: linearGradient(ctx, 0, cy + ory * 0.1, 0, cy + ory, [[0, rgba(lip.deep, 0)], [1, rgba(lip.deep, 0.6)]]) });
    stipple(ctx, rand, lipPoly, Math.round(rx * 1.1), { color: lip.deep, radius: 0.6, alpha: 0.5 });
    stipple(ctx, rand, lipPoly, Math.round(rx * 0.45), { color: lip.lit, radius: 0.6, alpha: 0.6 });
    for (let k = 0; k < (o.cracks ?? 3); k++) {
      const p = pit[rand.int(0, n - 1)]!;
      const dx = p[0] - cx;
      const dy = p[1] - cy;
      const end: Vec2 = [p[0] + dx * ring * rand.range(0.6, 1.1), p[1] + dy * ring * rand.range(0.6, 1.1)];
      shape(ctx, jagged(rand, p, end, 4, 1.1), { stroke: rgba(ink, 0.55), width: 0.85, closed: false });
    }
  });
  shape(ctx, lipPoly.slice(11, 21).map((p): Vec2 => [p[0] + lw * 0.9, p[1] + lw * 0.9]), { stroke: rgba(lip.lit, 0.65), width: 0.9, closed: false, smooth: true });
  if (o.edge) shape(ctx, pit, { stroke: o.edge, width: Math.max(2.6, rx * 0.11) });

  shape(ctx, pit, { fill: ink, stroke: ink, width: lw * 1.5 });
  clipped(ctx, pit, () => {
    const top = cy - ry;
    shape(ctx, pit, { fill: linearGradient(ctx, 0, top, 0, cy + ry, [[0, mix(o.wall, '#1a120d', 0.12)], [0.55, mix(o.wall, VOID, 0.6)], [1, VOID]]) });
    for (let i = 0; i < 4; i++) {
      const y = top + ry * (0.16 + i * 0.2) + rand.range(-0.8, 0.8);
      const pts: Vec2[] = [];
      for (let x = cx - rx - 2; x <= cx + rx + 2; x += 5) pts.push([x, y + Math.sin(x * 0.45 + i * 1.7) * 0.7 + rand.range(-0.4, 0.4)]);
      shape(ctx, pts, { stroke: i % 2 ? rgba(wallT.deep, 0.5) : rgba(wallT.highlight, 0.24), width: 0.9, closed: false, smooth: true });
    }
    for (let i = 0; i < 5; i++) {
      const x = cx + rand.range(-0.9, 0.9) * rx;
      const y0 = top + ry * 0.1;
      shape(ctx, [[x, y0], [x + rand.range(-1, 1), y0 + ry * rand.range(0.3, 0.7)]], { stroke: rgba(wallT.deep, 0.45), width: 0.9, closed: false });
    }

    const rockDark = mix(o.rock, VOID, 0.35);
    if (kind === 'water') {
      shape(ctx, floor, { fill: linearGradient(ctx, 0, cy - ry * 0.2, 0, cy + ry, [[0, '#17515f'], [0.5, '#2a95a8'], [1, '#6fd8d4']]) });
      softBlob(ctx, cx - rx * 0.25, cy + ry * 0.5, rx * 0.55, ry * 0.32, '#e6feff', 0.75);
      arc(ctx, cx - rx * 0.1, cy + ry * 0.42, rx * 0.5, ry * 0.3, 0.2, 2.4, rgba('#e8fdff', 0.6), 0.8);
      arc(ctx, cx - rx * 0.1, cy + ry * 0.45, rx * 0.72, ry * 0.46, 3.4, 5.4, rgba('#e8fdff', 0.4), 0.8);
      shape(ctx, floor.slice(Math.floor(n / 2), n), { stroke: rgba('#e8fdff', 0.85), width: 1.2, closed: false, smooth: true });
    } else if (kind === 'ember') {
      shape(ctx, floor, { fill: radialGradient(ctx, cx, cy + ry * 0.55, 0, rx * 0.95, [[0, LAVA.core], [0.25, LAVA.hot], [0.55, LAVA.mid], [0.85, LAVA.red], [1, LAVA.deep]]) });
      for (let i = 0; i < 4; i++) {
        ellipse(ctx, cx + rand.range(-0.6, 0.6) * rx, cy + ry * rand.range(0.25, 0.8), rx * rand.range(0.1, 0.2), ry * rand.range(0.06, 0.1), { fill: rgba(LAVA.crust, 0.78), rotation: rand.range(-0.4, 0.4) });
      }
      softBlob(ctx, cx, cy + ry * 0.2, rx * 0.95, ry * 0.8, LAVA.glow, 0.5);
    } else {
      shape(ctx, floor, { fill: linearGradient(ctx, 0, cy, 0, cy + ry, [[0, VOID], [1, '#2a1d14']]) });
      softBlob(ctx, cx - rx * 0.1, cy + ry * 0.58, rx * 0.55, ry * 0.3, '#6a5238', 0.4);
      if (kind === 'rubble') {
        const blocks = rand.int(4, 6);
        for (let i = 0; i < blocks; i++) {
          const r = rx * rand.range(0.1, 0.19);
          drawBoulder(ctx, { cx: cx + rand.range(-0.62, 0.62) * rx, cy: cy + ry * rand.range(0.25, 0.62), rx: r, ry: r * 0.75, rock: rockDark, ink, rand, shadow: false });
        }
      }
    }
    shape(ctx, floor, { stroke: rgba(VOID, 0.75), width: 2.2 });
    // The upper-left lip shades the floor.
    shape(ctx, pit, { fill: linearGradient(ctx, cx - rx, cy - ry, cx + rx * 0.8, cy + ry * 0.9, [[0, rgba(VOID, kind === 'water' ? 0.35 : 0.5)], [0.55, rgba(VOID, 0.08)], [1, rgba(VOID, 0)]]) });

    if (o.roots) {
      for (let k = 0; k < 3; k++) {
        const p = pit[rand.int(Math.floor(n * 0.56), Math.floor(n * 0.92))]!;
        const len = ry * rand.range(0.5, 0.95);
        const path: Vec2[] = [[p[0], p[1] - 1], [p[0] + rand.range(-1, 1), p[1] + len * 0.4], [p[0] + rand.range(-2, 2), p[1] + len * 0.75], [p[0] + rand.range(-2.5, 2.5), p[1] + len]];
        shape(ctx, path, { stroke: ink, width: 2.1, closed: false, smooth: true });
        shape(ctx, path, { stroke: '#8a5f36', width: 1, closed: false, smooth: true });
        const q = path[1]!;
        shape(ctx, [q, [q[0] + rand.sign() * 3, q[1] + 3.5]], { stroke: '#7a5230', width: 0.8, closed: false });
      }
    }
  });
  shape(ctx, pit, { stroke: ink, width: lw * 1.3 });
  shape(ctx, pit.slice(Math.floor(n * 0.5), Math.floor(n * 0.86)).map((p): Vec2 => [p[0] - lw * 0.5, p[1] - lw * 1.2]), { stroke: rgba(lip.lit, 0.85), width: 1, closed: false, smooth: true });

  if (o.grass) {
    for (let k = 0; k < Math.round(rx * 0.35); k++) {
      const a = rand.range(0, TAU);
      const f = 1 + ring * rand.range(0.35, 0.85);
      tuft(ctx, cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f + 1, rand.range(2.4, 3.8), o.grass);
    }
  }
  const chips: Array<{ x: number; y: number; r: number }> = [];
  for (let k = 0; k < (o.chips ?? 4); k++) {
    const a = rand.range(0, TAU);
    const f = 1 + ring * rand.range(0.4, 0.85);
    chips.push({ x: cx + Math.cos(a) * rx * f, y: cy + Math.sin(a) * ry * f + 1, r: rand.range(1.5, rx * 0.11) });
  }
  chips.sort((a, b) => a.y - b.y);
  for (const c of chips) drawBoulder(ctx, { cx: c.x, cy: c.y, rx: c.r * 1.1, ry: c.r * 0.85, rock: o.rock, ink, rand, simple: c.r < 2.3 });
}

export type RiftFill = 'dark' | 'lava' | 'mist';

export interface RiftOptions {
  w: number;
  h: number;
  rand: Rng;
  ink: string;
  lip: GroundTones;
  /** Color of the cliff face inside the crack. */
  wall: string;
  fill?: RiftFill;
  /** Widest opening. */
  width: number;
  /** Sideways wander of the crack as a share of h. Default 0.15. */
  bend?: number;
  /** Vertical position of the crack as a share of h. Default 0.5. */
  y?: number;
  /** Hairline cracks that branch off. */
  branches?: number;
  chips?: number;
  rock: string;
  grass?: string;
  /** Plank bridge across the middle. */
  bridge?: boolean;
}

/** A long crack in the ground: jagged lips, a layered far wall and a dark, molten or misty bottom. */
export function drawRift(ctx: Ctx2D, o: RiftOptions): void {
  const { rand, w, h, ink, lip } = o;
  const fill = o.fill ?? 'dark';
  const wallT = shades(o.wall);
  const cyc = h * (o.y ?? 0.5);
  const bend = h * (o.bend ?? 0.15);
  const nc = 6;
  const ctrl: Vec2[] = [];
  for (let i = 0; i < nc; i++) {
    const t = i / (nc - 1);
    ctrl.push([w * (0.08 + 0.84 * t), cyc + rand.range(-1, 1) * bend * (i === 0 || i === nc - 1 ? 0.55 : 1)]);
  }
  const line = catmullRom(ctrl, 8);
  const m = line.length;
  const p1 = rand.range(0, TAU);
  const p2 = rand.range(0, TAU);
  const half: number[] = [];
  for (let i = 0; i < m; i++) {
    const t = i / (m - 1);
    half.push((o.width / 2) * Math.pow(Math.sin(Math.PI * t), 0.8) * (1 + 0.2 * Math.sin(t * 11 + p1) + 0.1 * Math.sin(t * 27 + p2)));
  }
  const nrm = (i: number): Vec2 => {
    const a = line[Math.max(0, i - 1)]!;
    const b = line[Math.min(m - 1, i + 1)]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
  };
  const up: Vec2[] = [];
  const dn: Vec2[] = [];
  for (let i = 0; i < m; i++) {
    const nv = nrm(i);
    const live = i === 0 || i === m - 1 ? 0 : 1;
    const a = half[i]! * (1 + rand.range(-0.18, 0.18) * live);
    const b = half[i]! * (1 + rand.range(-0.18, 0.18) * live);
    up.push([line[i]![0] - nv[0] * a, line[i]![1] - nv[1] * a]);
    dn.push([line[i]![0] + nv[0] * b, line[i]![1] + nv[1] * b]);
  }
  const poly: Vec2[] = [...up, ...dn.slice().reverse()];
  const lipW = clamp(o.width * 0.17, 2, 3.4);
  const d = o.width * 0.5;
  const floorPoly = shifted(poly, 0, d);
  const molten = fill === 'lava';

  for (let i = 4; i < m - 4; i += 6) softBlob(ctx, line[i]![0], line[i]![1] + 1.5, half[i]! * 1.7 + 4, half[i]! * 1.2 + 3, molten ? LAVA.glow : '#1d160c', molten ? 0.22 : 0.2);

  shape(ctx, poly, { stroke: rgba(ink, 0.7), width: lipW * 2 + 2.2 });
  shape(ctx, poly, { stroke: linearGradient(ctx, 0, cyc - o.width, w * 0.85, cyc + o.width, [[0, lip.lit], [0.5, lip.base], [1, lip.deep]]), width: lipW * 2 });
  if (molten) shape(ctx, poly, { stroke: rgba(LAVA.glow, 0.34), width: lipW * 1.2 });
  shape(ctx, shifted(up, 0, -lipW * 0.8), { stroke: rgba(lip.lit, 0.8), width: 0.8, closed: false });

  shape(ctx, poly, { fill: ink, stroke: ink, width: 1.6 });
  clipped(ctx, poly, () => {
    // The far wall steps down in darker bands, each one a copy of the opening pushed lower.
    shape(ctx, poly, { fill: mix(o.wall, '#1a120d', 0.1) });
    const bands: Array<[number, number]> = [[0.28, 0.35], [0.5, 0.58], [0.74, 0.8]];
    for (const [k, dark] of bands) {
      const off = d * k;
      shape(ctx, shifted(poly, 0, off), { fill: mix(o.wall, VOID, dark) });
      shape(ctx, shifted(up, 0, off), { stroke: rgba(wallT.highlight, 0.22), width: 0.8, closed: false });
      shape(ctx, shifted(up, 0, off - 0.9), { stroke: rgba(VOID, 0.5), width: 0.8, closed: false });
    }
    shape(ctx, shifted(up, 0, 1.2), { stroke: rgba(wallT.highlight, 0.4), width: 0.9, closed: false });

    shape(ctx, floorPoly, { fill: fill === 'mist' ? '#10252d' : VOID });
    if (molten) {
      shape(ctx, floorPoly, { fill: linearGradient(ctx, 0, cyc - o.width * 0.3, 0, cyc + o.width * 0.6, [[0, LAVA.deep], [0.5, LAVA.red], [1, LAVA.mid]]) });
      clipped(ctx, floorPoly, () => {
        const riverPath = [line[2]!, line[11]!, line[20]!, line[29]!, line[38]!].map((p): Vec2 => [p[0], p[1] + d * 0.55]);
        drawLavaRiver(ctx, rand, riverPath, [o.width * 0.25, o.width * 0.5, o.width * 0.6, o.width * 0.5, o.width * 0.25], { glow: false, capStart: false, capEnd: false });
      });
      softBlob(ctx, w * 0.5, cyc - o.width * 0.1, w * 0.36, o.width * 0.55, LAVA.glow, 0.38);
    } else if (fill === 'mist') {
      softBlob(ctx, w * 0.5, cyc + o.width * 0.35, w * 0.3, o.width * 0.4, '#a9d3dc', 0.5);
      softBlob(ctx, w * 0.3, cyc + o.width * 0.3, w * 0.16, o.width * 0.25, '#a9d3dc', 0.4);
    }
    shape(ctx, floorPoly, { stroke: rgba(VOID, 0.7), width: 2 });
    // Shade falling from the upper-left lip.
    shape(ctx, poly, { fill: linearGradient(ctx, 0, cyc - o.width, w * 0.9, cyc + o.width * 0.8, [[0, rgba(VOID, 0.34)], [0.6, rgba(VOID, 0.06)], [1, rgba(VOID, 0)]]) });
  });
  shape(ctx, poly, { stroke: ink, width: 1.5 });

  const side = (i: number, s: number): { p: Vec2; v: Vec2 } => {
    const nv = nrm(i);
    const p = s < 0 ? up[i]! : dn[i]!;
    return { p, v: [nv[0] * s, nv[1] * s] };
  };
  for (let k = 0; k < (o.branches ?? 3); k++) {
    const i = rand.int(5, m - 6);
    const { p, v } = side(i, rand.sign());
    const a: Vec2 = [p[0] + v[0] * (lipW + 0.6), p[1] + v[1] * (lipW + 0.6)];
    const len = rand.range(5, 13);
    const b: Vec2 = [a[0] + v[0] * len + rand.range(-2, 2), a[1] + v[1] * len + rand.range(-1.5, 1.5)];
    if (b[0] < 1 || b[0] > w - 1 || b[1] < 1 || b[1] > h - 1) continue;
    const crack = jagged(rand, a, b, 4, 1.1);
    shape(ctx, crack, { stroke: rgba(ink, 0.78), width: 0.95, closed: false });
    if (rand.chance(0.5)) {
      const q = crack[2]!;
      const f: Vec2 = [q[0] + rand.range(-5, 5), q[1] + v[1] * rand.range(2, 6)];
      if (f[0] > 1 && f[0] < w - 1 && f[1] > 1 && f[1] < h - 1) shape(ctx, jagged(rand, q, f, 2, 0.8), { stroke: rgba(ink, 0.6), width: 0.8, closed: false });
    }
  }

  if (o.bridge) {
    const i = Math.round((m - 1) * rand.range(0.44, 0.56));
    const a0 = up[i]!;
    const b0 = dn[i]!;
    const len0 = Math.hypot(b0[0] - a0[0], b0[1] - a0[1]) || 1;
    const u: Vec2 = [(b0[0] - a0[0]) / len0, (b0[1] - a0[1]) / len0];
    const v: Vec2 = [-u[1], u[0]];
    const ext = lipW + 3.2;
    const A: Vec2 = [a0[0] - u[0] * ext, a0[1] - u[1] * ext];
    const len = len0 + ext * 2;
    const bw = 4;
    shape(ctx, [[A[0] - v[0] * bw + 1.4, A[1] - v[1] * bw + 2.4], [A[0] + v[0] * bw + 1.4, A[1] + v[1] * bw + 2.4], [A[0] + u[0] * len + v[0] * bw + 1.4, A[1] + u[1] * len + v[1] * bw + 2.4], [A[0] + u[0] * len - v[0] * bw + 1.4, A[1] + u[1] * len - v[1] * bw + 2.4]], { fill: rgba('#120c08', 0.5) });
    for (const s of [-1, 1]) {
      const rope: Vec2[] = [[A[0] + v[0] * bw * s, A[1] + v[1] * bw * s], [A[0] + u[0] * len + v[0] * bw * s, A[1] + u[1] * len + v[1] * bw * s]];
      shape(ctx, rope, { stroke: ink, width: 2.3, closed: false });
      shape(ctx, rope, { stroke: '#8a6a43', width: 1.1, closed: false });
    }
    const planks = Math.floor(len / 2.3);
    for (let k = 0; k < planks; k++) {
      const c: Vec2 = [A[0] + u[0] * (1.2 + k * 2.3), A[1] + u[1] * (1.2 + k * 2.3)];
      const hw = bw - 0.2;
      shape(ctx, [[c[0] - v[0] * hw - u[0], c[1] - v[1] * hw - u[1]], [c[0] + v[0] * hw - u[0], c[1] + v[1] * hw - u[1]], [c[0] + v[0] * hw + u[0], c[1] + v[1] * hw + u[1]], [c[0] - v[0] * hw + u[0], c[1] - v[1] * hw + u[1]]], { fill: k % 2 ? '#a97a47' : '#c09360', stroke: rgba(ink, 0.8), width: 0.6 });
    }
    for (const t of [0, 1]) {
      for (const s of [-1, 1]) {
        const px = A[0] + u[0] * len * t + v[0] * bw * s;
        const py = A[1] + u[1] * len * t + v[1] * bw * s;
        ellipse(ctx, px, py, 1.7, 1.5, { fill: '#6b4a2a', stroke: ink, width: 0.8 });
      }
    }
  }

  const chips: Array<{ x: number; y: number; r: number }> = [];
  for (let k = 0; k < (o.chips ?? 4); k++) {
    const i = rand.int(4, m - 5);
    const { p, v } = side(i, rand.sign());
    const r = rand.range(1.5, 3.1);
    const off = lipW + r + rand.range(0, 2.5);
    const x = clamp(p[0] + v[0] * off + rand.range(-2, 2), r + 1, w - r - 1);
    const y = clamp(p[1] + v[1] * off, r + 1, h - r - 1);
    chips.push({ x, y, r });
  }
  chips.sort((a, b) => a.y - b.y);
  for (const c of chips) drawBoulder(ctx, { cx: c.x, cy: c.y, rx: c.r * 1.1, ry: c.r * 0.85, rock: o.rock, ink, rand, simple: c.r < 2.3 });

  if (o.grass) {
    for (let k = 0; k < 9; k++) {
      const i = rand.int(4, m - 5);
      const { p, v } = side(i, rand.sign());
      const off = lipW + rand.range(1.5, 5);
      tuft(ctx, clamp(p[0] + v[0] * off, 2, w - 2), clamp(p[1] + v[1] * off + 1, 4, h - 1), rand.range(2.4, 3.6), o.grass);
    }
  }
  if (fill === 'mist') drawSteam(ctx, rand, w * 0.5, cyc - o.width * 0.1, cyc - 3, 4, 5);
}
