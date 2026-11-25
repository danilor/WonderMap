import { rgba } from '../kit/colors';
import { clipped, dot, ellipse, line, linearGradient, shades, shape, softBlob, taper } from '../kit/draw';
import { clamp, lerp } from '../kit/math';
import { catmullRom, cumulativeLength, normals } from '../kit/shapes';
import type { Ctx2D, Vec2 } from '../kit/types';
import { paintBody, thorn } from './sea-creature';
import type { Skin } from './sea-creature';
import { FOAM, droplets, foamBlob, foamStrip, ripple, waterShadow } from './sea-fx';
import type { Pen } from './ship-parts';

/** Whales: a long body along a spine, mostly under the water; the parts that break the surface are painted solid. */

export interface WhaleLook {
  skin: Skin;
  /** Centre line from the snout to the tail. */
  spine: Vec2[];
  /** Body width at each spine point. */
  widths: number[];
  /** Side of the spine holding the belly (+1 is down for a spine running right). */
  belly: 1 | -1;
  /** Share of the width that is belly (default 0.3). */
  plates?: number;
  /** Arc length between throat pleats; none by default. */
  pleats?: number;
  /** Eye at a fraction `t` of the body length, `k` half-widths from the spine toward the belly. */
  eye?: { t: number; k: number };
  mouth?: { t0: number; t1: number; k: number; lift: number };
  /** Fraction of the body length where the blowhole sits. */
  blowhole?: number;
  dorsal?: { t: number; h: number; sweep: number; wide?: number };
  /** Flukes at the tail end; under the water unless `air`. */
  flukes?: { size: number; span: number; len: number; air?: boolean; drips?: boolean };
  /** A pectoral flipper hanging from the belly side: offsets from the point at `t`. */
  flipper?: { t: number; path: Vec2[]; w: number; color: string };
  spout?: { t: number; h: number; spread: number };
  marks?: 'orca';
  /** Stretches of the water line, where the body crosses the surface, that get foam. */
  foam: Array<[number, number]>;
  /** Centre of a breaching splash. */
  splash?: number;
}

/* ------------------------------------------------------------------------------------ */
/* Body geometry                                                                        */
/* ------------------------------------------------------------------------------------ */

interface Body {
  pts: Vec2[];
  w: number[];
  nm: Vec2[];
  acc: number[];
  len: number;
}

function makeBody(ctrl: readonly Vec2[], cw: readonly number[]): Body {
  const k = 8;
  const pts = catmullRom(ctrl, k);
  const w = pts.map((_, i) => {
    const seg = Math.min(ctrl.length - 2, Math.floor(i / k));
    const t = (i - seg * k) / k;
    // The first stretch follows a quarter ellipse, which rounds the snout.
    const e = seg === 0 ? Math.sqrt(t * (2 - t)) : t * t * (3 - 2 * t);
    return lerp(cw[seg]!, cw[seg + 1]!, e);
  });
  const acc = cumulativeLength(pts);
  return { pts, w, nm: normals(pts), acc, len: acc[acc.length - 1]! };
}

/** The sample at fraction `t` of the body length. */
function indexAt(b: Body, t: number): number {
  const target = clamp(t, 0, 1) * b.len;
  let i = 0;
  while (i < b.acc.length - 1 && b.acc[i + 1]! < target) i++;
  return i;
}

/** The point `k` widths from sample `i`, toward `side`. */
function at(b: Body, i: number, k: number, side: 1 | -1): Vec2 {
  return [b.pts[i]![0] + b.nm[i]![0] * side * b.w[i]! * k, b.pts[i]![1] + b.nm[i]![1] * side * b.w[i]! * k];
}

/** Unit tangent at sample `i`, running toward the tail. */
function tangent(b: Body, i: number): Vec2 {
  return [b.nm[i]![1], -b.nm[i]![0]];
}

function silhouette(b: Body): Vec2[] {
  const idx: number[] = [];
  for (let i = 0; i < b.pts.length; i += 2) idx.push(i);
  if (idx[idx.length - 1] !== b.pts.length - 1) idx.push(b.pts.length - 1);
  return [...idx.map((i) => at(b, i, 0.5, 1)), ...idx.map((i) => at(b, i, 0.5, -1)).reverse()];
}

/* ------------------------------------------------------------------------------------ */
/* Parts                                                                                */
/* ------------------------------------------------------------------------------------ */

/** The outline of a pair of flukes: the tail stock at the origin, the lobes spreading up and out. */
function flukePath(ctx: Ctx2D): void {
  ctx.beginPath();
  ctx.moveTo(-4.5, 3);
  ctx.quadraticCurveTo(-15, -2, -31, -23);
  ctx.quadraticCurveTo(-19, -17.5, -5, -15);
  ctx.quadraticCurveTo(-1.6, -14.4, 0, -10);
  ctx.quadraticCurveTo(1.6, -14.4, 5, -15);
  ctx.quadraticCurveTo(19, -17.5, 31, -23);
  ctx.quadraticCurveTo(15, -2, 4.5, 3);
  ctx.closePath();
}

type Flukes = NonNullable<WhaleLook['flukes']>;

/** Flukes at `p`; the tail stock points along `ang` (0 is straight up). */
function paintFlukes(pen: Pen, p: Vec2, ang: number, f: Flukes, skin: Skin): void {
  const { ctx, ink, u } = pen;
  const T = shades(skin.base);
  ctx.save();
  ctx.translate(p[0], p[1]);
  ctx.rotate(ang);
  ctx.scale(f.size * f.span, f.size * f.len);
  flukePath(ctx);
  ctx.fillStyle = linearGradient(ctx, -30, -24, 24, 4, [T.highlight, T.light, skin.base, T.shade]);
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = ink;
  ctx.lineWidth = (2.3 * u) / f.size;
  ctx.stroke();
  const lw = 1.1 / f.size;
  ctx.lineCap = 'round';
  line(ctx, [[0, 2], [0, -10]], rgba(T.deep, 0.5), lw * 1.4);
  line(ctx, [[-2.6, -1], [-13, -9], [-25, -19]], rgba(T.deep, 0.34), lw);
  line(ctx, [[2.6, -1], [13, -9], [25, -19]], rgba(T.deep, 0.4), lw);
  line(ctx, [[-5.4, 1.4], [-15.4, -3.6], [-29, -21]], rgba(T.highlight, 0.62), lw * 1.3);
  ctx.restore();
}

function dorsalFin(pen: Pen, b: Body, side: 1 | -1, d: NonNullable<WhaleLook['dorsal']>, skin: Skin): void {
  const { ctx, ink, u } = pen;
  const T = shades(skin.base);
  const back: 1 | -1 = side === 1 ? -1 : 1;
  const half = d.wide ?? 5;
  const a = at(b, indexAt(b, d.t - half / b.len), 0.42, back);
  const c = at(b, indexAt(b, d.t + half / b.len), 0.42, back);
  const im = indexAt(b, d.t);
  const base = at(b, im, 0.5, back);
  const t = tangent(b, im);
  const tip: Vec2 = [base[0] - b.nm[im]![0] * side * d.h + t[0] * d.sweep, base[1] - b.nm[im]![1] * side * d.h + t[1] * d.sweep];
  thorn(ctx, a, c, tip, -0.16 * side, linearGradient(ctx, a[0], a[1], tip[0] + 6, tip[1], [T.shade, skin.base, T.highlight]), ink, 1.9 * u);
}

function spout(pen: Pen, x: number, y: number, h: number, spread: number): void {
  const { ctx, rand } = pen;
  softBlob(ctx, x, y - h * 0.8, spread * 0.8, h * 0.4, '#ffffff', 0.4);
  taper(ctx, [[x, y], [x, y - h * 0.8]], 3.2, 1.6, rgba(FOAM, 0.9));
  for (const sg of [-1, 1]) {
    const c = catmullRom([[x + sg * 0.5, y - h * 0.4], [x + sg * spread * 0.2, y - h * 0.9], [x + sg * spread * 0.6, y - h], [x + sg * spread, y - h * 0.62], [x + sg * spread * 1.2, y - h * 0.2]], 6);
    taper(ctx, c, 3.6, 0.8, rgba('#8fc4dc', 0.5));
    taper(ctx, c, 2.5, 0.5, rgba(FOAM, 0.96));
  }
  droplets(ctx, rand, x, y - h * 0.9, 7, spread * 1.1, 0.7);
}

/** Streams of water running off raised flukes. */
function drips(pen: Pen, p: Vec2, f: Flukes): void {
  const { ctx, rand } = pen;
  for (let i = 0; i < 6; i++) {
    const x = p[0] + (i - 2.5) * 9 * f.size + rand.range(-1.2, 1.2);
    const y = p[1] - (10 - Math.abs(i - 2.5) * 1.5) * f.size + rand.range(0, 3);
    const len = rand.range(4, 11);
    line(ctx, [[x, y], [x + rand.range(-0.3, 0.3), y + len]], rgba(FOAM, 0.62), rand.range(0.7, 1.1));
    if (i % 2 === 0) dot(ctx, x, y + len + rand.range(2.5, 5), rand.range(0.6, 1), rgba(FOAM, 0.85));
  }
}

/* ------------------------------------------------------------------------------------ */
/* The whale                                                                            */
/* ------------------------------------------------------------------------------------ */

/** A whale at the surface; the water line is at 78 % of the height. */
export function drawWhale(pen: Pen, w: number, h: number, look: WhaleLook): void {
  const { ctx, rand, ink, u } = pen;
  const wl = Math.round(h * 0.78);
  const side = look.belly;
  const skin = look.skin;
  const T = shades(skin.base);
  const b = makeBody(look.spine, look.widths);
  const n = b.pts.length;
  const end = b.pts[n - 1]!;
  const tt = tangent(b, n - 1);
  const tailAng = Math.atan2(tt[0], -tt[1]);

  const mid = b.pts[Math.floor(n * 0.5)]!;
  waterShadow(ctx, mid[0], wl + 8, 66, 10, 0.2);

  // The part under the water: a dim silhouette.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, wl, w, h - wl);
  ctx.clip();
  const sil = silhouette(b);
  shape(ctx, sil, { fill: rgba('#0a3552', 0.38), stroke: rgba(ink, 0.26), width: 1.6, smooth: true });
  if (look.flukes && !look.flukes.air) {
    ctx.save();
    ctx.translate(end[0], end[1]);
    ctx.rotate(tailAng);
    ctx.scale(look.flukes.size * look.flukes.span, look.flukes.size * look.flukes.len);
    flukePath(ctx);
    ctx.fillStyle = rgba('#0a3552', 0.38);
    ctx.fill();
    ctx.strokeStyle = rgba(ink, 0.26);
    ctx.lineWidth = 1.6 / look.flukes.size;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // The part above it.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, wl);
  ctx.clip();
  if (look.dorsal) dorsalFin(pen, b, side, look.dorsal, skin);
  paintBody(pen, b.pts, b.w, skin, { belly: side, plates: look.plates ?? 0.3, scales: 0, groove: look.pleats ?? 0 });

  if (look.marks === 'orca' && look.eye) {
    clipped(ctx, silhouette(b), () => {
      const ie = indexAt(b, look.eye!.t + 0.05);
      const p = at(b, ie, look.eye!.k - 0.3, side);
      const t = tangent(b, ie);
      ellipse(ctx, p[0], p[1], 6.2, 2.5, { fill: '#f6f6ee', rotation: Math.atan2(t[1], t[0]) - 0.35 * side });
      if (look.dorsal) {
        const id = indexAt(b, look.dorsal.t + 0.09);
        const q = at(b, id, -0.3 * side, side);
        const td = tangent(b, id);
        ellipse(ctx, q[0], q[1], 9, 3.6, { fill: rgba('#cdd3d8', 0.88), rotation: Math.atan2(td[1], td[0]) });
      }
    });
  }

  if (look.mouth) {
    const m = look.mouth;
    const pts: Vec2[] = [];
    for (let s = 0; s <= 6; s++) pts.push(at(b, indexAt(b, lerp(m.t0, m.t1, s / 6)), m.k - m.lift * Math.pow(s / 6, 2), side));
    line(ctx, pts, ink, 1.5 * u, { smooth: true });
    line(ctx, pts.map((p) => [p[0], p[1] + 1.3] as Vec2), rgba(T.highlight, 0.5), 0.8 * u, { smooth: true });
  }
  if (look.eye) {
    const ie = indexAt(b, look.eye.t);
    const p = at(b, ie, look.eye.k, side);
    ellipse(ctx, p[0], p[1], 2.5, 2.3, { fill: ink });
    dot(ctx, p[0] - 0.7, p[1] - 0.8, 0.85, '#ffffff');
  }
  if (look.blowhole !== undefined) {
    const ib = indexAt(b, look.blowhole);
    const p = at(b, ib, 0.36, side === 1 ? -1 : 1);
    const t = tangent(b, ib);
    ellipse(ctx, p[0], p[1], 2.3, 0.9, { fill: ink, rotation: Math.atan2(t[1], t[0]) });
  }

  const fl = look.flipper;
  if (fl) {
    const i = indexAt(b, fl.t);
    const base = at(b, i, 0.42, side);
    const pts = catmullRom(fl.path.map(([x, y]) => [base[0] + x, base[1] + y] as Vec2), 8);
    const nm = normals(pts);
    const hw = fl.w / 2;
    const prof = (t: number): number => hw * (0.7 + 0.5 * Math.sin(Math.PI * Math.pow(t, 0.6))) * Math.pow(1 - t, 0.45) + 0.2;
    const edge = (s: 1 | -1): Vec2[] => pts.map((p, j) => [p[0] + nm[j]![0] * s * prof(j / (pts.length - 1)), p[1] + nm[j]![1] * s * prof(j / (pts.length - 1))] as Vec2);
    const up = edge(-1);
    const down = edge(1);
    const outline = [...up, ...down.reverse()];
    const m = nm[nm.length >> 1]!;
    const lit: 1 | -1 = m[0] * -0.6 + m[1] * -0.8 > 0 ? 1 : -1;
    shape(ctx, outline, { fill: fl.color, stroke: ink, width: 2.2 * u, smooth: true });
    clipped(ctx, outline, () => line(ctx, edge(lit === 1 ? -1 : 1), rgba('#7f98ae', 0.55), 2.8, { smooth: true }), true);
    line(ctx, edge(lit).slice(2, -4), rgba('#ffffff', 0.7), 0.9, { smooth: true });
  }

  if (look.flukes?.air) {
    paintFlukes(pen, end, tailAng, look.flukes, skin);
    if (look.flukes.drips) drips(pen, end, look.flukes);
  }
  ctx.restore();

  // Foam along the water line.
  for (const [x0, x1] of look.foam) {
    const cx = (x0 + x1) / 2;
    const rr = Math.min((x1 - x0) / 2 + 12, (cx - 3) / 1.42, (w - 3 - cx) / 1.42);
    ripple(ctx, cx, wl + 3, rr, 7, { alpha: 0.32, rings: 2, width: 0.9 });
    ellipse(ctx, cx, wl + 1, (x1 - x0) / 2 + 3, 3.4, { fill: rgba(FOAM, 0.32) });
    foamStrip(ctx, rand, x0, x1, wl - 0.8, { depth: 5, alpha: 0.95, scallop: 5.2 });
  }
  if (look.splash !== undefined) {
    const sx = look.splash;
    foamBlob(ctx, rand, sx, wl + 1, 24, 6.5, { alpha: 0.78 });
    foamStrip(ctx, rand, sx - 26, sx + 26, wl - 0.8, { depth: 6, alpha: 0.96, scallop: 5.6 });
    droplets(ctx, rand, sx, wl - 3, 16, 30, 1.5);
    for (const sg of [-1, 1]) {
      const c = catmullRom([[sx + sg * 12, wl - 1], [sx + sg * 20, wl - 12], [sx + sg * 30, wl - 15], [sx + sg * 36, wl - 6]], 6);
      taper(ctx, c, 2.6, 0.5, rgba(FOAM, 0.85));
    }
  }
  if (look.spout) {
    const ib = indexAt(b, look.spout.t);
    const p = at(b, ib, 0.36, side === 1 ? -1 : 1);
    spout(pen, p[0], p[1], look.spout.h, look.spout.spread);
  }
  if (!look.splash) droplets(ctx, rand, b.pts[Math.floor(n * 0.1)]![0], wl - 2, 4, 12, 0.7);
}
