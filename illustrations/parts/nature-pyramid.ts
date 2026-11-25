import { darken, lighten, mix, rgba } from '../kit/colors';
import { clipped, linearGradient, shape, softBlob } from '../kit/draw';
import { lerp, TAU } from '../kit/math';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { sandRock } from './nature-sand';

export interface PyramidPalette {
  lit: string;
  shade: string;
  top: string;
  line: string;
}

export const PYRAMID: Record<'sand' | 'lime' | 'rose' | 'dusk', PyramidPalette> = {
  sand: { lit: '#ecc98a', shade: '#b98d57', top: '#f3dfae', line: '#7a5430' },
  lime: { lit: '#efe2c4', shade: '#bba98a', top: '#f6eed8', line: '#7e6d52' },
  rose: { lit: '#e0a57c', shade: '#a8694a', top: '#ecc2a0', line: '#6b3d27' },
  dusk: { lit: '#c9ad86', shade: '#8b7254', top: '#d9c3a0', line: '#4e3b28' },
};

export interface PyramidOptions {
  /** The corner nearest to the viewer, on the ground. */
  f: Vec2;
  /** Side lengths along the right-going and left-going base edges. */
  a: number;
  b: number;
  height: number;
  palette: PyramidPalette;
  ink: string;
  rand: Rng;
  /** Fraction of the height that is still standing: below 1 it is a ruin with a ragged flat top. */
  trunc?: number;
  /** Rows of blocks on each face. */
  courses?: number;
  /** A dark entrance on the lit face. */
  door?: boolean;
  /** Colour of a capstone. */
  cap?: string;
  /** Number of steps; makes a stepped pyramid with a staircase. */
  steps?: number;
  /** A small temple on top of a stepped pyramid. */
  temple?: boolean;
}

type Project = (x: number, y: number, z: number) => Vec2;

const EX: Vec2 = [0.866, -0.5];
const EY: Vec2 = [-0.866, -0.5];

const lerp2 = (p: Vec2, q: Vec2, t: number): Vec2 => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];

function inkFace(ctx: Ctx2D, pts: readonly Vec2[], ink: string, width = 2.4): void {
  shape(ctx, pts, { fill: ink, stroke: ink, width, join: 'round' });
}

/** Lighter towards the top of a face and darker towards the ground. */
function wash(ctx: Ctx2D, poly: readonly Vec2[], light: number, dark: number): void {
  const ys = poly.map((q) => q[1]);
  const xs = poly.map((q) => q[0]);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  clipped(ctx, poly, () => {
    ctx.fillStyle = linearGradient(ctx, 0, y0, 0, y1, [[0, `rgba(255,240,200,${light})`], [0.5, 'rgba(255,240,200,0)'], [1, `rgba(60,30,10,${dark})`]]);
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  });
}

interface Faces {
  left: Vec2[];
  right: Vec2[];
  top: Vec2[];
}

/** A block standing on `z0` whose near corner is at (x0, y0); the lit face is the one towards the left. */
function box(ctx: Ctx2D, p: Project, x0: number, y0: number, z0: number, dx: number, dy: number, dz: number, pal: PyramidPalette, ink: string, inkW = 2.4): Faces {
  const z1 = z0 + dz;
  const left: Vec2[] = [p(x0, y0, z0), p(x0, y0 + dy, z0), p(x0, y0 + dy, z1), p(x0, y0, z1)];
  const right: Vec2[] = [p(x0, y0, z0), p(x0 + dx, y0, z0), p(x0 + dx, y0, z1), p(x0, y0, z1)];
  const top: Vec2[] = [p(x0, y0, z1), p(x0 + dx, y0, z1), p(x0 + dx, y0 + dy, z1), p(x0, y0 + dy, z1)];
  inkFace(ctx, top, ink, inkW);
  inkFace(ctx, left, ink, inkW);
  inkFace(ctx, right, ink, inkW);
  shape(ctx, top, { fill: pal.top });
  shape(ctx, left, { fill: lighten(pal.lit, 0.03) });
  shape(ctx, right, { fill: darken(pal.shade, 0.04) });
  wash(ctx, left, 0.2, 0.16);
  wash(ctx, right, 0.1, 0.22);
  return { left, right, top };
}

/** Rows of blocks on a slanted face: `lo` and `hi` are the lower and upper edges of the face as pairs of points. */
function blockRows(ctx: Ctx2D, rand: Rng, lo: [Vec2, Vec2], hi: [Vec2, Vec2], rows: number, line: string): void {
  const at = (t: number): [Vec2, Vec2] => [lerp2(lo[0], hi[0], t), lerp2(lo[1], hi[1], t)];
  for (let k = 0; k < rows; k++) {
    const [a0, b0] = at(k / rows);
    const [a1, b1] = at((k + 1) / rows);
    const len = Math.hypot(b0[0] - a0[0], b0[1] - a0[1]);
    const m = Math.max(1, Math.round(len / 9));
    const cuts: number[] = [0];
    for (let i = 0; i < m; i++) {
      const s = (i + 0.5 + (k % 2 ? 0.5 : 0) + rand.range(-0.12, 0.12)) / (m + 0.5);
      if (s > 0.04 && s < 0.96) cuts.push(s);
    }
    cuts.push(1);
    // Some blocks weathered darker or bleached paler than their neighbours.
    for (let j = 0; j + 1 < cuts.length; j++) {
      if (!rand.chance(0.15)) continue;
      const quad: Vec2[] = [lerp2(a0, b0, cuts[j]!), lerp2(a0, b0, cuts[j + 1]!), lerp2(a1, b1, cuts[j + 1]!), lerp2(a1, b1, cuts[j]!)];
      shape(ctx, quad, { fill: rand.chance(0.55) ? rgba(line, 0.1) : 'rgba(255,240,205,0.16)' });
    }
    for (let j = 1; j + 1 < cuts.length; j++) shape(ctx, [lerp2(a0, b0, cuts[j]!), lerp2(a1, b1, cuts[j]!)], { stroke: rgba(line, 0.22), width: 0.6, closed: false });
    if (k > 0) {
      shape(ctx, [a0, b0], { stroke: rgba(line, 0.34), width: 0.8, closed: false });
      shape(ctx, [[a0[0], a0[1] + 1], [b0[0], b0[1] + 1]], { stroke: 'rgba(255,240,205,0.22)', width: 0.7, closed: false });
    }
  }
}

/** A broken top edge: a couple of big bites out of the masonry along the slope. */
function crumble(rand: Rng, from: Vec2, to: Vec2, bite: number): Vec2[] {
  const m1 = lerp2(from, to, rand.range(0.28, 0.4));
  const m2 = lerp2(from, to, rand.range(0.6, 0.72));
  const d1 = bite * rand.range(0.4, 1);
  const d2 = bite * rand.range(0.2, 0.8);
  return [from, [m1[0], m1[1] + d1], [m2[0], m2[1] + d2], to];
}

/** A soft heap of sand: pale on the upper left, shaded towards the lower right, outlined along its crest only. */
export function drift(ctx: Ctx2D, rand: Rng, x: number, y: number, rx: number, h: number, skew = 0.55): void {
  const n = 26;
  const k = Math.log(0.5) / Math.log(skew);
  const phase = rand.range(0, TAU);
  const prof = (t: number): number => Math.pow(Math.sin(Math.PI * Math.pow(t, k)), 0.6) * (1 + 0.06 * Math.sin(t * 9 + phase));
  const crest: Vec2[] = [];
  for (let i = 0; i <= n; i++) crest.push([x - rx + (2 * rx * i) / n, y - h * prof(i / n)]);
  const belly: Vec2[] = [];
  for (let i = n - 1; i > 0; i--) belly.push([x - rx + (2 * rx * i) / n, y + h * 0.24 * Math.sin((Math.PI * i) / n)]);
  const pts: Vec2[] = [...crest, ...belly];

  softBlob(ctx, x + rx * 0.08, y + h * 0.2, rx * 0.98, h * 0.22, '#6b4a22', 0.28);
  shape(ctx, pts, { fill: '#ecd5a0', smooth: true });
  clipped(
    ctx,
    pts,
    () => {
      ctx.fillStyle = linearGradient(ctx, x - rx * 0.7, y - h, x + rx * 0.8, y + h * 0.3, [[0, '#fbf0c6'], [0.5, '#ecd5a0'], [1, '#c2a064']]);
      ctx.fillRect(x - rx - 2, y - h - 2, rx * 2 + 4, h * 1.4 + 4);
      for (const f of [0.42, 0.7]) {
        const line: Vec2[] = [];
        for (let i = 3; i <= n - 3; i++) line.push([x - rx + (2 * rx * i) / n, y - h * prof(i / n) * f + h * 0.04]);
        shape(ctx, line, { stroke: 'rgba(143,100,48,0.34)', width: 0.7, closed: false, smooth: true });
      }
    },
    true,
  );
  shape(ctx, crest, { stroke: 'rgba(93,63,30,0.85)', width: 1.2, closed: false, smooth: true });
  shape(ctx, crest.slice(3, -3).map((q): Vec2 => [q[0] - 0.5, q[1] - 1.6]), { stroke: 'rgba(255,248,222,0.55)', width: 0.8, closed: false, smooth: true });
}

/** A smooth, ruined or stepped pyramid seen from a corner, lit from the upper left. */
export function drawPyramid(ctx: Ctx2D, o: PyramidOptions): void {
  const { f, a, b, height: H, palette: pal, ink, rand } = o;
  const p: Project = (x, y, z) => [f[0] + EX[0] * x + EY[0] * y, f[1] + EX[1] * x + EY[1] * y - z];
  const reach = (a + b) * 0.433;
  const F = p(0, 0, 0);

  softBlob(ctx, f[0] + reach * 0.45, f[1] - (a + b) * 0.08, reach * 0.95 + H * 0.35, (a + b) * 0.1 + 3, '#1d160c', 0.3);

  if (o.steps) drawStepped(ctx, o, p);
  else {
    const c = o.trunc ?? 1;
    const xs = (a / 2) * c;
    const ys = (b / 2) * c;
    const zt = H * c;
    const R = p(a, 0, 0);
    const L = p(0, b, 0);
    const Ft = p(xs, ys, zt);
    const Rt = p(a - xs, ys, zt);
    const Lt = p(xs, b - ys, zt);
    const Bt = p(a - xs, b - ys, zt);
    const ruin = c < 0.98;
    const leftTop = ruin ? crumble(rand, Lt, Ft, zt * 0.24) : [Lt, Ft];
    const rightTop = ruin ? crumble(rand, Ft, Rt, zt * 0.24) : [Ft, Rt];
    const left: Vec2[] = [F, L, ...leftTop];
    const right: Vec2[] = [F, R, ...rightTop.slice().reverse()];
    const top: Vec2[] = [Ft, Rt, Bt, Lt];

    if (ruin) inkFace(ctx, top, ink);
    inkFace(ctx, left, ink);
    inkFace(ctx, right, ink);

    if (ruin) shape(ctx, top, { fill: pal.top });
    shape(ctx, left, { fill: lighten(pal.lit, 0.04) });
    shape(ctx, right, { fill: pal.shade });
    wash(ctx, left, 0.26, 0.2);
    wash(ctx, right, 0.14, 0.3);
    const rows = o.courses ?? Math.max(5, Math.round(H / 5));
    blockRows(ctx, rand, [F, L], [Ft, Lt], rows, pal.line);
    blockRows(ctx, rand, [F, R], [Ft, Rt], rows, pal.line);
    shape(ctx, [Ft, F], { stroke: 'rgba(255,244,214,0.55)', width: 1, closed: false });
    shape(ctx, [F, R], { stroke: rgba(darken(pal.shade, 0.5), 0.45), width: 1, closed: false });
    softBlob(ctx, (F[0] + R[0]) / 2 + 2, (F[1] + R[1]) / 2 - 1, Math.abs(R[0] - F[0]) * 0.5, 3, darken(pal.shade, 0.6), 0.25);

    if (ruin) {
      // Fallen masonry left on the broken summit, far blocks first.
      const spots: Array<[number, number, number]> = [];
      const room = (a - 2 * xs) * 0.62;
      for (let i = 0; i < 3; i++) spots.push([xs + rand.range(0.8, room), ys + rand.range(0.8, room), rand.range(2, 3.4)]);
      spots.sort((m, n) => n[0] + n[1] - (m[0] + m[1]));
      for (const [x, y, s] of spots) box(ctx, p, x, y, zt, s, s * rand.range(0.8, 1.2), rand.range(1.4, 2.6), pal, ink, 1.5);
    }

    if (o.door) {
      const yc = b / 2;
      const w = Math.max(2.2, b * 0.07);
      const dz = Math.min(H * 0.2, 9);
      const faceX = (z: number): number => ((a / 2) * z) / H;
      const door: Vec2[] = [p(faceX(0), yc - w, 0), p(faceX(0), yc + w, 0), p(faceX(dz), yc + w, dz), p(faceX(dz), yc - w, dz)];
      shape(ctx, door, { fill: '#2a1c12', stroke: ink, width: 1, join: 'round' });
      shape(ctx, [door[3]!, door[2]!], { stroke: 'rgba(255,240,205,0.45)', width: 0.8, closed: false });
    }
    if (o.cap && !ruin) {
      shape(ctx, [Ft, lerp2(Ft, L, 0.1), lerp2(Ft, F, 0.1)], { fill: lighten(o.cap, 0.15), stroke: ink, width: 0.7 });
      shape(ctx, [Ft, lerp2(Ft, F, 0.1), lerp2(Ft, R, 0.1)], { fill: darken(o.cap, 0.15), stroke: ink, width: 0.7 });
    }
  }

  // Fallen blocks at the foot.
  for (let i = 0; i < 3; i++) sandRock(ctx, rand, F[0] + rand.range(-0.5, 0.5) * reach, F[1] + rand.range(0, 3), rand.range(1.6, 2.6), mix(pal.lit, '#a89070', 0.4));
}

function drawStepped(ctx: Ctx2D, o: PyramidOptions, p: Project): void {
  const { a, b, height: H, palette: pal, ink, rand } = o;
  const n = o.steps!;
  const hs = H / n;
  for (let j = 0; j < n; j++) {
    const k = 1 - (0.84 * j) / n;
    const aj = a * k;
    const bj = b * k;
    const x0 = (a - aj) / 2;
    const y0 = (b - bj) / 2;
    const z0 = j * hs;
    const { left, right, top } = box(ctx, p, x0, y0, z0, aj, bj, hs, pal, ink);
    blockRows(ctx, rand, [left[0]!, left[1]!], [left[3]!, left[2]!], 2, pal.line);
    blockRows(ctx, rand, [right[0]!, right[1]!], [right[3]!, right[2]!], 2, pal.line);
    shape(ctx, [left[3]!, left[0]!], { stroke: 'rgba(255,244,214,0.5)', width: 0.9, closed: false });
    shape(ctx, [top[0]!, top[1]!], { stroke: 'rgba(255,244,214,0.55)', width: 0.9, closed: false });
    shape(ctx, [top[0]!, top[3]!], { stroke: 'rgba(255,244,214,0.4)', width: 0.9, closed: false });
    // Staircase on the lit side.
    const sw = Math.max(2.4, bj * 0.12);
    const yc = b / 2;
    const stair: Vec2[] = [p(x0, yc - sw, z0), p(x0, yc + sw, z0), p(x0, yc + sw, z0 + hs), p(x0, yc - sw, z0 + hs)];
    shape(ctx, stair, { fill: lighten(pal.lit, 0.2), stroke: rgba(pal.line, 0.5), width: 0.7 });
    for (let s = 1; s < 3; s++) shape(ctx, [p(x0, yc - sw, z0 + (hs * s) / 3), p(x0, yc + sw, z0 + (hs * s) / 3)], { stroke: rgba(pal.line, 0.4), width: 0.6, closed: false });
  }
  if (o.temple) {
    const k = 1 - 0.84;
    const th = hs * 0.9;
    const aj = a * k * 0.62;
    const bj = b * k * 0.62;
    const x0 = (a - aj) / 2;
    const y0 = (b - bj) / 2;
    box(ctx, p, x0, y0, H, aj, bj, th, pal, ink);
    const yc = y0 + bj / 2;
    shape(ctx, [p(x0, yc - 1.4, H), p(x0, yc + 1.4, H), p(x0, yc + 1.4, H + th * 0.65), p(x0, yc - 1.4, H + th * 0.65)], { fill: '#2a1c12' });
  }
}
