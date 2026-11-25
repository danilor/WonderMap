import { mix, rgba } from '../kit/colors';
import { dot, ellipse, line, linearGradient, shades, shape, taper } from '../kit/draw';
import type { Paint } from '../kit/draw';
import { clamp, dist, lerp } from '../kit/math';
import { catmullRom, normals } from '../kit/shapes';
import type { Ctx2D, Vec2 } from '../kit/types';
import { FOAM, droplets, foamStrip, ripple } from './sea-fx';
import type { Pen } from './ship-parts';

/** Scaly sea creatures: bodies that shade like cylinders, spikes, heads and tentacles. Spines run from the head to the tail. */

export interface Skin {
  base: string;
  belly: string;
  fin: string;
  eye: string;
}

/** Light comes from the top-left. */
const LIGHT: Vec2 = [-0.6, -0.8];

/** Arc length at every sample of a polyline. */
function arcLength(pts: readonly Vec2[]): number[] {
  const out = [0];
  for (let i = 1; i < pts.length; i++) out.push(out[i - 1]! + dist(pts[i - 1]!, pts[i]!));
  return out;
}

/** A curved thorn from the base `a`-`b` to `tip`; `bend` sweeps it sideways. */
export function thorn(ctx: Ctx2D, a: Vec2, b: Vec2, tip: Vec2, bend: number, fill: Paint, ink: string, lw: number): void {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const px = -(tip[1] - my) * bend;
  const py = (tip[0] - mx) * bend;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.quadraticCurveTo((a[0] + tip[0]) / 2 + px, (a[1] + tip[1]) / 2 + py, tip[0], tip[1]);
  ctx.quadraticCurveTo((b[0] + tip[0]) / 2 + px, (b[1] + tip[1]) / 2 + py, b[0], b[1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/* ------------------------------------------------------------------------------------ */
/* Bodies                                                                               */
/* ------------------------------------------------------------------------------------ */

export interface BodyOpts {
  /** Side of the spine holding the belly: +1 is the side `normals()` points to (down, for a spine running right). */
  belly?: 1 | -1;
  /** Painted sample range, for painter's-order chunks of a long body. */
  from?: number;
  to?: number;
  /** Share of the width taken by the belly (default 0.4, 0 for none). */
  plates?: number;
  /** Rows of scales on the back (default 3). */
  scales?: number;
  /** Arc length between belly grooves (default 3.4), 0 for none. */
  groove?: number;
  /** Narrows the belly where the body turns edge-on (coils seen from above). */
  fade?: boolean;
}

/** A tapering body along a spine: ink edges, belly, light and shade that slide across as the body turns, plates and scales. */
export function paintBody(pen: Pen, spine: readonly Vec2[], widths: readonly number[], skin: Skin, o: BodyOpts = {}): void {
  const { ctx, ink, u } = pen;
  const side = o.belly ?? 1;
  const a = Math.max(0, o.from ?? 0);
  const b = Math.min(spine.length - 1, o.to ?? spine.length - 1);
  if (b <= a) return;
  const nm = normals(spine);
  const acc = arcLength(spine);
  const T = shades(skin.base);
  const idx: number[] = [];
  for (let i = a; i <= b; i++) idx.push(i);

  /** 1 where the back faces the light squarely, -1 where it faces away. */
  const lit = (i: number): number => clamp(-side * (nm[i]![0] * LIGHT[0] + nm[i]![1] * LIGHT[1]) * 1.6, -1, 1);
  const off = (i: number, k: number): Vec2 => [spine[i]![0] + nm[i]![0] * side * widths[i]! * k, spine[i]![1] + nm[i]![1] * side * widths[i]! * k];
  const curve = (f: (i: number) => number): Vec2[] => idx.map((i) => off(i, f(i)));
  const band = (f0: (i: number) => number, f1: (i: number) => number): Vec2[] => [...curve(f0), ...curve(f1).reverse()];

  // Edges only, no end caps, so painter-ordered chunks of one body join without seams.
  shape(ctx, curve(() => -0.5), { stroke: ink, width: 3.4 * u, closed: false });
  shape(ctx, curve(() => 0.5), { stroke: ink, width: 3.4 * u, closed: false });
  shape(ctx, band(() => -0.5, () => 0.5), { fill: skin.base });
  const bw = o.plates ?? 0.4;
  const bwAt = (i: number): number => (o.fade ? bw * clamp(Math.abs(nm[i]![1]) * 1.5, 0.15, 1) : bw);
  if (bw > 0) shape(ctx, band((i) => 0.5 - bwAt(i), () => 0.5), { fill: skin.belly });
  shape(ctx, band((i) => -0.5 * lit(i), (i) => -0.05 * lit(i)), { fill: rgba(T.highlight, 0.4) });
  shape(ctx, band((i) => 0.5 * lit(i), (i) => 0.1 * lit(i)), { fill: rgba(T.deep, 0.34) });
  shape(ctx, curve((i) => -0.3 * lit(i)), { stroke: rgba('#ffffff', 0.32), width: 1.1 * u, closed: false });

  const groove = o.groove ?? 3.4;
  if (bw > 0 && groove > 0) {
    for (const i of idx) {
      if (i === 0 || Math.floor(acc[i]! / groove) === Math.floor(acc[i - 1]! / groove) || widths[i]! < 4) continue;
      line(ctx, [off(i, 0.5 - bwAt(i) + 0.03), off(i, 0.47)], rgba(T.deep, 0.42), 0.8 * u);
    }
  }

  const rows = o.scales ?? 3;
  const wMax = Math.max(...widths);
  const step = clamp(wMax * 0.34, 3.4, 7);
  const kMax = bw > 0 ? 0.5 - bw - 0.1 : 0.34;
  for (let r = 0; r < rows; r++) {
    const k = rows === 1 ? -0.1 : lerp(-0.34, kMax, r / (rows - 1));
    const phase = (r % 2) * step * 0.5;
    for (const i of idx) {
      if (i === 0 || widths[i]! < 3.8) continue;
      if (Math.floor((acc[i]! - phase) / step) === Math.floor((acc[i - 1]! - phase) / step)) continue;
      const c = off(i, k);
      const tx = nm[i]![1];
      const ty = -nm[i]![0];
      const nx = nm[i]![0] * side;
      const ny = nm[i]![1] * side;
      const sz = clamp(widths[i]! * 0.09, 0.7, 2.6);
      shape(ctx, [[c[0] - nx * sz, c[1] - ny * sz], [c[0] + tx * sz * 0.75, c[1] + ty * sz * 0.75], [c[0] + nx * sz, c[1] + ny * sz]], { stroke: rgba(T.deep, 0.5), width: 0.7 * u, closed: false, smooth: true });
    }
  }
}

/** A body that overlaps itself (a coil): painted in short chunks, the farthest first. `depth(i)` grows toward the viewer. */
export function paintCoiled(pen: Pen, spine: readonly Vec2[], widths: readonly number[], skin: Skin, depth: (i: number) => number, o: BodyOpts & { chunk?: number; under?: (a: number, b: number) => void; over?: (a: number, b: number) => void; bellyAt?: (i: number) => 1 | -1 } = {}): void {
  const n = spine.length;
  const step = o.chunk ?? 6;
  const parts: Array<{ a: number; b: number; d: number }> = [];
  for (let a = 0; a < n - 1; a += step) {
    const b = Math.min(n - 1, a + step + 1);
    parts.push({ a, b, d: depth((a + b) >> 1) });
  }
  parts.sort((p, q) => p.d - q.d);
  for (const part of parts) {
    o.under?.(part.a, part.b);
    paintBody(pen, spine, widths, skin, { ...o, belly: o.bellyAt ? o.bellyAt((part.a + part.b) >> 1) : o.belly, from: part.a, to: part.b });
    o.over?.(part.a, part.b);
  }
}

export interface SpikeOpts {
  belly?: 1 | -1;
  from?: number;
  to?: number;
  /** Samples between spikes. */
  every?: number;
  /** Height of the spike at sample `i`. */
  size: (i: number) => number;
  /** How far the tips sweep toward the tail. */
  sweep?: number;
}

/** Spikes along the back. Paint them before the body so it covers their roots. */
export function dorsalSpikes(pen: Pen, spine: readonly Vec2[], widths: readonly number[], skin: Skin, o: SpikeOpts): void {
  const { ctx, ink, u } = pen;
  const side = o.belly ?? 1;
  const nm = normals(spine);
  const T = shades(skin.fin);
  const every = o.every ?? 3;
  const sweep = o.sweep ?? 0.45;
  const b = Math.min(spine.length - 1, o.to ?? spine.length - 1);
  for (let i = Math.ceil((o.from ?? 0) / every) * every; i <= b; i += every) {
    const h = o.size(i);
    if (h < 1.2) continue;
    const p = spine[i]!;
    const nx = -nm[i]![0] * side;
    const ny = -nm[i]![1] * side;
    const tx = nm[i]![1];
    const ty = -nm[i]![0];
    const r = widths[i]! * 0.42;
    const bx = p[0] + nx * r;
    const by = p[1] + ny * r;
    const half = h * 0.36;
    const tip: Vec2 = [bx + nx * h + tx * h * sweep, by + ny * h + ty * h * sweep];
    thorn(ctx, [bx - tx * half * 0.6, by - ty * half * 0.6], [bx + tx * half, by + ty * half], tip, -0.16, linearGradient(ctx, bx, by, tip[0], tip[1], [T.shade, skin.fin, T.highlight]), ink, 1.05 * u);
  }
}

/** Foam, ripples and a few drops where a body breaks the surface; the foam also hides the cut end of the body. */
export function surfaceFoam(pen: Pen, x: number, y: number, r: number): void {
  const { ctx, rand } = pen;
  ripple(ctx, x, y + 1, r * 2.2, r * 0.64, { alpha: 0.42, rings: 1, width: 0.9 });
  ellipse(ctx, x, y + 0.8, r * 1.55, r * 0.5, { fill: rgba(FOAM, 0.5) });
  foamStrip(ctx, rand, x - r * 1.2, x + r * 1.2, y - 0.8, { depth: r * 0.36, alpha: 0.95, scallop: Math.max(3.2, r * 0.6) });
  droplets(ctx, rand, x, y - 1, 3, r * 1.3, 0.7);
}

/* ------------------------------------------------------------------------------------ */
/* Heads                                                                                */
/* ------------------------------------------------------------------------------------ */

export interface HeadOpts {
  /** 1 is about 36 px long. */
  size?: number;
  /** Jaw opening in radians. */
  open?: number;
  /** Turns the head, in radians; positive points the snout down. */
  tilt?: number;
  /** Muzzle length multiplier. */
  snout?: number;
  /** 0 none, 1 short swept horns, 2 long branching horns. */
  horns?: 0 | 1 | 2;
  whiskers?: boolean;
  /** Fan of fins behind the skull. */
  frill?: boolean;
  tongue?: boolean;
  /** Colour of horns and teeth. */
  bone?: string;
}

/** A serpent's head in profile with the back of the skull at `(x, y)`, facing `dir` (-1 left, 1 right). */
export function serpentHead(pen: Pen, x: number, y: number, dir: -1 | 1, skin: Skin, o: HeadOpts = {}): void {
  const { ctx, ink, u } = pen;
  const s = o.size ?? 1;
  const open = o.open ?? 0.35;
  const sn = o.snout ?? 1;
  const bone = o.bone ?? '#efe3c0';
  const T = shades(skin.base);
  const k = u / s;
  const X = (v: number): number => (v > 6 ? 6 + (v - 6) * sn : v);
  const hinge: Vec2 = [-3, 3.5];
  const rot = (p: Vec2): Vec2 => {
    const dx = p[0] - hinge[0];
    const dy = p[1] - hinge[1];
    return [hinge[0] + dx * Math.cos(open) - dy * Math.sin(open), hinge[1] + dx * Math.sin(open) + dy * Math.cos(open)];
  };
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * s, s);
  ctx.rotate(o.tilt ?? 0);

  if (o.frill) {
    for (let i = 0; i < 4; i++) {
      const bx = -5 - i * 0.6;
      const by = -7 + i * 3.2;
      thorn(ctx, [bx + 2, by - 2], [bx + 2, by + 2.4], [bx - 9 - i * 0.8, by - 5.5 + i * 2.2], 0.16, linearGradient(ctx, bx, by, bx - 10, by - 5, [T.shade, skin.fin]), ink, 1 * k);
    }
  }
  if (o.horns) {
    const long = o.horns === 2;
    const pts: Vec2[] = long ? [[1, -8], [-5, -13.5], [-13, -17], [-21, -15.5]] : [[1, -8], [-3, -12.5], [-8, -15.5]];
    const w0 = long ? 3.4 : 3;
    taper(ctx, catmullRom(pts, 6), w0 + 1.8 * k, 1.4 * k, ink);
    taper(ctx, catmullRom(pts, 6), w0, 0.5, bone);
    if (long) {
      const branch: Vec2[] = [[-7.5, -14.4], [-9, -19], [-7.6, -23]];
      taper(ctx, catmullRom(branch, 6), 2.8 * k + 1, 1.2 * k, ink);
      taper(ctx, catmullRom(branch, 6), 1.5, 0.4, bone);
    }
  }

  // Lower jaw, swung open around the hinge.
  ctx.save();
  ctx.translate(hinge[0], hinge[1]);
  ctx.rotate(open);
  ctx.translate(-hinge[0], -hinge[1]);
  const jaw: Vec2[] = [[-3.5, 3.4], [2, 7.6], [X(11), 8.8], [X(19), 7.6], [X(25.5), 5], [X(27), 2.8], [X(21), 3.9], [X(10), 4.4], [1, 4]];
  shape(ctx, jaw, { fill: linearGradient(ctx, 0, 3, 0, 9, [mix(skin.base, skin.belly, 0.6), mix(skin.base, T.shade, 0.35)]), stroke: ink, width: 1.2 * k, smooth: true });
  for (const tx of [14, 20]) thorn(ctx, [X(tx) - 1.1, 4.3], [X(tx) + 1.1, 4.3], [X(tx) + 0.3, 1.2], 0, bone, ink, 0.6 * k);
  ctx.restore();

  // Mouth.
  shape(ctx, [[-2, 3], [X(14), 2.3], [X(26.5), 1.6], rot([X(27), 2.8]), rot([X(14), 4.4]), rot([1, 4])], { fill: '#4a1a22', smooth: false });
  if (o.tongue ?? true) {
    const jawTip = rot([X(27), 3]);
    const tp = catmullRom([rot([X(3), 4]), rot([X(11), 4.2]), rot([X(20), 4.6]), [jawTip[0] + 0.5, jawTip[1] + 5]], 5);
    taper(ctx, tp, 2.4 + 1.2 * k, 0.9, ink);
    taper(ctx, tp, 2.4, 0.4, '#c2434d');
    const e = tp[tp.length - 1]!;
    for (const sg of [-1, 1]) {
      taper(ctx, [[e[0], e[1] - 0.4], [e[0] + 2.6, e[1] + 1.2 + sg * 1.5]], 1.5 + 1.2 * k, 0.4, ink);
      taper(ctx, [[e[0], e[1] - 0.4], [e[0] + 2.6, e[1] + 1.2 + sg * 1.5]], 1.5, 0.3, '#c2434d');
    }
  }

  // Skull and fangs.
  const skull: Vec2[] = [[-8, 2], [-9, -4], [-4, -9], [3, -9.5], [8, -8.6], [X(14), -6.2], [X(21), -5.4], [X(26), -4.2], [X(28), -2], [X(27.5), 0.6], [X(24), 1.8], [X(16), 2.2], [X(8), 3], [-2, 4]];
  shape(ctx, skull, { fill: linearGradient(ctx, -4 * dir, -10, 4 * dir, 4, [T.light, skin.base, T.shade]), stroke: ink, width: 1.3 * k, smooth: true });
  line(ctx, [[-6, -3], [-3.4, 1], [-2.6, 3.4]], rgba(T.deep, 0.6), 0.9 * k);
  for (const tx of [10, 17, 24]) thorn(ctx, [X(tx) - 1.2, 2.2], [X(tx) + 1.2, 2.2], [X(tx) + 0.5, 6], 0, bone, ink, 0.6 * k);

  // Eye, brow and nostril.
  ellipse(ctx, 5, -3.8, 2.3, 2.1, { fill: skin.eye, stroke: ink, width: 0.9 * k });
  ellipse(ctx, 5.2, -3.8, 0.6, 1.7, { fill: ink });
  dot(ctx, 4.3, -4.7, 0.6, '#ffffff');
  line(ctx, [[1, -7.1], [9.6, -5]], ink, 2 * k);
  line(ctx, [[1.2, -7.4], [9, -5.6]], rgba(T.light, 0.8), 0.7 * k);
  dot(ctx, X(24.2), -2.6, 0.75, ink);

  if (o.whiskers) {
    for (const sg of [-1, 1]) {
      const wp = catmullRom([[X(25), -0.2], [X(31), 2.5 + sg * 2], [X(29), 8 + sg * 3], [X(36), 12 + sg * 5]], 5);
      taper(ctx, wp, 1.5 * k + 0.4, 0.3, ink);
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------------------------------ */
/* Tentacles                                                                            */
/* ------------------------------------------------------------------------------------ */

export interface TentacleOpts {
  /** Width at the tip. */
  tip?: number;
  /** Side of the spine with the suckers (the inside of the curl). */
  side?: 1 | -1;
  /** Part of the length, 0 to 1, that carries suckers. */
  suckers?: readonly [number, number];
  sucker?: string;
}

/** A tentacle along the control points, starting thick and ending in a curled tip. */
export function tentacle(pen: Pen, ctrl: readonly Vec2[], baseW: number, skin: Skin, o: TentacleOpts = {}): void {
  const { ctx, ink, u } = pen;
  const spine = catmullRom(ctrl, 8);
  const n = spine.length;
  const tip = o.tip ?? 1.1;
  const widths = spine.map((_, i) => lerp(baseW, tip, Math.pow(i / (n - 1), 0.8)));
  const side = o.side ?? 1;
  paintBody(pen, spine, widths, skin, { belly: side, plates: 0.34, scales: 0, groove: 0 });
  const [s0, s1] = o.suckers ?? [0.18, 0.94];
  const nm = normals(spine);
  const acc = arcLength(spine);
  const T = shades(o.sucker ?? skin.belly);
  const gap = Math.max(3, baseW * 0.5);
  let last = -gap;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    if (t < s0 || t > s1 || acc[i]! - last < gap * (0.7 + 0.6 * (1 - t))) continue;
    last = acc[i]!;
    const w = widths[i]!;
    const r = clamp(w * 0.2, 0.55, 2.4);
    const cx = spine[i]![0] + nm[i]![0] * side * w * 0.3;
    const cy = spine[i]![1] + nm[i]![1] * side * w * 0.3;
    ellipse(ctx, cx, cy, r, r * 0.86, { fill: T.light, stroke: ink, width: 0.6 * u });
    if (r > 1.1) dot(ctx, cx, cy, r * 0.42, rgba(T.deep, 0.75));
  }
}
