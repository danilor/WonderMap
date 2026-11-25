import { mix, rgba } from '../kit/colors';
import { ellipse, linearGradient, shades, shape, tracePoly } from '../kit/draw';
import type { Shades } from '../kit/draw';
import { TAU, clamp, lerp2 } from '../kit/math';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { drawFlag } from './building';
import { INK, archWindow, ellipseFootprint, gateway, groundShade, inFace, masonry, mottle, shadowOf, slit } from './settle-geom';
import type { Face, Iso, Stage } from './settle-geom';

/**
 * Castle building blocks on the dimetric grid of `settle-geom`: prisms, wall runs, round towers, boxes with roofs.
 * Everything is registered in the stage's scene so that overlapping pieces are painted far-to-near.
 */

/* ------------------------------------------------------------------------------------ */
/* Faces and prisms                                                                      */
/* ------------------------------------------------------------------------------------ */

export interface SideFace {
  /** Grid endpoints of the bottom edge. */
  a: Vec2;
  b: Vec2;
  /** Light factor: +1 faces the light, -1 faces away. */
  s: number;
  frame: Face;
  /** Screen length of the bottom edge. */
  len: number;
  depth: number;
}

/** Faces of a ground polygon (grid space) that point towards the viewer, far ones first. */
export function sideFaces(iso: Iso, poly: readonly Vec2[], z: number): SideFace[] {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    area += p[0] * q[1] - q[0] * p[1];
  }
  const sign = area >= 0 ? 1 : -1;
  const out: SideFace[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const du = b[0] - a[0];
    const dv = b[1] - a[1];
    const l = Math.hypot(du, dv);
    if (l < 0.01) continue;
    const nu = (sign * dv) / l;
    const nv = (-sign * du) / l;
    if (nu + nv > -0.08) continue;
    const A = iso(a[0], a[1], z);
    const B = iso(b[0], b[1], z);
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    if (len < 0.4) continue;
    out.push({
      a,
      b,
      s: (nv - nu) / Math.SQRT2,
      frame: { o: A, d: [(B[0] - A[0]) / len, (B[1] - A[1]) / len] },
      len,
      depth: (a[0] + a[1] + b[0] + b[1]) / 2,
    });
  }
  return out.sort((p, q) => q.depth - p.depth);
}

/** Vertical gradient for a wall face: lit faces are light at the top, shaded ones cool and dark. */
export function faceGradient(ctx: Ctx2D, tones: Shades, s: number, y0: number, y1: number): CanvasGradient {
  const p = clamp((s + 0.71) / 1.42, 0, 1);
  return linearGradient(ctx, 0, y0, 0, y1, [mix(tones.shade, tones.light, p), mix(tones.deep, tones.base, p)]);
}

export interface PrismOpts {
  poly: readonly Vec2[];
  z0?: number;
  h: number;
  stone: string;
  tones?: Shades;
  ink?: string;
  /** Pass a generator to texture the faces with masonry. */
  rand?: Rng;
  top?: string | false;
  lineWidth?: number;
  row?: number;
  block?: number;
}

export interface PrismResult {
  faces: SideFace[];
  /** Screen outline of the top face. */
  top: Vec2[];
}

export function drawPrism(ctx: Ctx2D, iso: Iso, o: PrismOpts): PrismResult {
  const ink = o.ink ?? INK;
  const z0 = o.z0 ?? 0;
  const z1 = z0 + o.h;
  const tones = o.tones ?? shades(o.stone);
  const lw = o.lineWidth ?? 1;
  const faces = sideFaces(iso, o.poly, z0);
  ctx.save();
  ctx.lineJoin = 'round';
  for (const f of faces) {
    const A = iso(f.a[0], f.a[1], z0);
    const B = iso(f.b[0], f.b[1], z0);
    const At = iso(f.a[0], f.a[1], z1);
    const Bt = iso(f.b[0], f.b[1], z1);
    ctx.beginPath();
    tracePoly(ctx, [A, B, Bt, At], true);
    ctx.fillStyle = faceGradient(ctx, tones, f.s, Math.min(At[1], Bt[1]), Math.max(A[1], B[1]));
    ctx.fill();
    const rand = o.rand;
    if (rand) {
      inFace(ctx, f.frame, () => {
        masonry(ctx, f.len, o.h, tones.deep, rand, { row: o.row, block: o.block });
        const area = f.len * o.h;
        if (area > 110) mottle(ctx, f.len, o.h, tones, rand, Math.round(area / 110));
      });
    }
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  const top = o.poly.map((p): Vec2 => iso(p[0], p[1], z1));
  if (o.top !== false) {
    ctx.beginPath();
    tracePoly(ctx, top, true);
    ctx.fillStyle = o.top ?? tones.highlight;
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  ctx.restore();
  return { faces, top };
}

/* ------------------------------------------------------------------------------------ */
/* Merlons                                                                               */
/* ------------------------------------------------------------------------------------ */

export interface MerlonRow {
  /** Start of the outer edge line (grid space). */
  p: Vec2;
  /** Unit direction along the edge. */
  d: Vec2;
  /** Unit direction from the outer edge into the wall. */
  inward: Vec2;
  len: number;
  z: number;
  tones: Shades;
  ink: string;
  /** Only place merlons whose start lies in [from, to). */
  from?: number;
  to?: number;
  period?: number;
  ml?: number;
  mt?: number;
  mh?: number;
  margin?: number;
}

export function merlonRow(ctx: Ctx2D, iso: Iso, o: MerlonRow): void {
  const period = o.period ?? 5.6;
  const ml = o.ml ?? 3.2;
  const mt = o.mt ?? 1.8;
  const mh = o.mh ?? 3.2;
  const margin = o.margin ?? 0.6;
  const from = o.from ?? -Infinity;
  const to = o.to ?? Infinity;
  const starts: number[] = [];
  for (let s = margin; s + ml <= o.len - margin + 1e-6; s += period) if (s >= from - 1e-6 && s < to - 1e-6) starts.push(s);
  // Farther merlons first.
  if (o.d[0] + o.d[1] > 0) starts.reverse();
  const at = (s: number, c: number): Vec2 => [o.p[0] + o.d[0] * s + o.inward[0] * c, o.p[1] + o.d[1] * s + o.inward[1] * c];
  for (const s of starts) {
    drawPrism(ctx, iso, { poly: [at(s, 0), at(s + ml, 0), at(s + ml, mt), at(s, mt)], z0: o.z, h: mh, stone: '', tones: o.tones, ink: o.ink, lineWidth: 0.6 });
  }
}

/* ------------------------------------------------------------------------------------ */
/* Wall runs                                                                             */
/* ------------------------------------------------------------------------------------ */

export interface WallOpts {
  /** Centre line end points (grid space). */
  p: Vec2;
  q: Vec2;
  t?: number;
  h?: number;
  stone: string;
  crenels?: boolean;
  /** 0 = intact; larger values lower and break sections. */
  ruin?: number;
  /** Draw the free end of the wall nearest to the viewer. Default true. */
  cap?: boolean;
}

export function addWall(stage: Stage, o: WallOpts): void {
  const { ctx, iso, scene, rand } = stage;
  let p = o.p;
  let q = o.q;
  if (q[0] + q[1] < p[0] + p[1]) [p, q] = [q, p];
  const t = o.t ?? 5;
  const h = o.h ?? 17;
  const ruin = o.ruin ?? 0;
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
  if (L < 0.5) return;
  const d: Vec2 = [(q[0] - p[0]) / L, (q[1] - p[1]) / L];
  // The long side that faces the viewer.
  const n: Vec2 = d[0] > d[1] ? [d[1], -d[0]] : [-d[1], d[0]];
  const ht = t / 2;
  const F = (s: number): Vec2 => [p[0] + d[0] * s + n[0] * ht, p[1] + d[1] * s + n[1] * ht];
  const Bk = (s: number): Vec2 => [p[0] + d[0] * s - n[0] * ht, p[1] + d[1] * s - n[1] * ht];
  const crenels = (o.crenels ?? true) && ruin === 0;

  const foot = [F(0), F(L), Bk(L), Bk(0)].map((g): Vec2 => iso(g[0], g[1]));
  scene.shadow(shadowOf(foot, h * 0.78, 0.5));

  const segs = Math.max(1, Math.round(L / (ruin ? 4.5 : 8)));
  const heights: number[] = [];
  for (let i = 0; i < segs; i++) {
    let f = 1;
    if (ruin > 0) f = rand.chance(ruin * 0.4) ? rand.range(0.14, 0.38) : 1 - ruin * rand.range(0, 0.5);
    heights.push(h * f);
  }
  const caps = o.cap ?? true;

  for (let i = 0; i < segs; i++) {
    const s0 = (i * L) / segs;
    const s1 = Math.min(L, ((i + 1) * L) / segs + (i < segs - 1 ? 0.35 : 0));
    const hh = heights[i]!;
    const mid = (s0 + s1) / 2;
    const jag = ruin > 0 ? [0, rand.range(-1.8, 1.8), rand.range(-1.8, 1.8), 0] : null;
    scene.add(p[0] + p[1] + (d[0] + d[1]) * mid, () => {
      ctx.save();
      ctx.lineJoin = 'round';
      const pt = (g: Vec2, z: number) => iso(g[0], g[1], z);
      const topAt = (g: (s: number) => Vec2): Vec2[] => {
        if (!jag) return [pt(g(s0), hh), pt(g(s1), hh)];
        return jag.map((j, k) => pt(g(lerp(s0, s1, k / (jag.length - 1))), hh + j));
      };
      const frontTop = topAt(F);
      const backTop = topAt(Bk);
      const A = pt(F(s0), 0);
      const B = pt(F(s1), 0);
      const sh = shades(o.stone);
      const sFace = (nv: Vec2) => (nv[1] - nv[0]) / Math.SQRT2;

      // Visible long face.
      ctx.beginPath();
      tracePoly(ctx, [A, B, ...frontTop.slice().reverse()], true);
      ctx.fillStyle = faceGradient(ctx, sh, sFace(n), Math.min(...frontTop.map((c) => c[1])), Math.max(A[1], B[1]));
      ctx.fill();
      const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      ctx.save();
      if (ruin > 0) ctx.clip();
      inFace(ctx, { o: A, d: [(B[0] - A[0]) / len, (B[1] - A[1]) / len] }, () => {
        masonry(ctx, len, hh + 2, sh.deep, rand, { row: 4.2, block: 6.2 });
        if (len * hh > 110) mottle(ctx, len, hh, sh, rand, 2);
      });
      ctx.restore();

      // Free end nearest to the viewer.
      if (i === 0 && caps) {
        const c0 = pt(F(0), 0);
        const c1 = pt(Bk(0), 0);
        const c2 = pt(Bk(0), hh);
        const c3 = frontTop[0]!;
        ctx.beginPath();
        tracePoly(ctx, [c0, c1, c2, c3], true);
        ctx.fillStyle = faceGradient(ctx, sh, (d[0] - d[1]) / Math.SQRT2, Math.min(c2[1], c3[1]), Math.max(c0[1], c1[1]));
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Wall walk.
      ctx.beginPath();
      tracePoly(ctx, [...frontTop, ...backTop.slice().reverse()], true);
      ctx.fillStyle = ruin > 0 ? mix(sh.highlight, sh.base, 0.4) : sh.highlight;
      ctx.fill();

      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]);
      ctx.lineTo(B[0], B[1]);
      tracePoly(ctx, frontTop, false);
      tracePoly(ctx, backTop, false);
      if (i === segs - 1) {
        const e0 = frontTop[frontTop.length - 1]!;
        const e1 = backTop[backTop.length - 1]!;
        ctx.moveTo(e0[0], e0[1]);
        ctx.lineTo(e1[0], e1[1]);
        ctx.moveTo(B[0], B[1]);
        ctx.lineTo(e0[0], e0[1]);
      }
      ctx.stroke();

      if (crenels) {
        const row = { d, len: L, z: hh, tones: sh, ink: INK, from: s0, to: s1 === L ? L + 1 : s1 - 0.35 };
        merlonRow(ctx, iso, { ...row, p: Bk(0), inward: n });
        merlonRow(ctx, iso, { ...row, p: F(0), inward: [-n[0], -n[1]] });
      }
      ctx.restore();
    });
  }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ------------------------------------------------------------------------------------ */
/* Round towers                                                                          */
/* ------------------------------------------------------------------------------------ */

export type TowerTop = 'cone' | 'crenel' | 'flat' | 'dome' | 'spire' | 'broken';

export interface TowerOpts {
  u: number;
  v: number;
  r: number;
  h: number;
  stone: string;
  top?: TowerTop;
  roof?: string;
  roofH?: number;
  flag?: string;
  /** Arrow slits around the front. */
  slits?: number;
  /** Arched windows with a glow colour. */
  windows?: number;
  glow?: string;
  /** Little spikes around the roof base. */
  crown?: boolean;
  moss?: boolean;
  /** Shift in sort depth so towers draw after the walls that end inside them. */
  bias?: number;
  noShadow?: boolean;
}

export function addTower(stage: Stage, o: TowerOpts): void {
  const { ctx, iso, scene, rand } = stage;
  const [cx, cy] = iso(o.u, o.v);
  const r = o.r;
  const roofH = o.roofH ?? r * 1.9;
  const reach = o.h + (o.top === 'cone' || o.top === 'spire' ? roofH * 0.5 : 0);
  if (!o.noShadow) scene.shadow(shadowOf(ellipseFootprint(cx, cy, r * 1.04, r * 0.38, 12), reach, 0.5));
  scene.add(o.u + o.v - 4.5 + (o.bias ?? 0), () => drawRoundTower(ctx, cx, cy, o, roofH, rand));
}

function drawRoundTower(ctx: Ctx2D, cx: number, cy: number, o: TowerOpts, roofH: number, rand: Rng): void {
  const { r, h } = o;
  const ry = r * 0.36;
  const top = cy - h;
  const tones = shades(o.stone);
  const broken = o.top === 'broken';

  const body = new Path2D();
  if (broken) {
    body.moveTo(cx - r, top + 4);
    const n = 6;
    for (let i = 1; i <= n; i++) body.lineTo(cx - r + (2 * r * i) / n, top + rand.range(-3.5, 6));
    body.lineTo(cx + r, cy);
  } else {
    body.moveTo(cx - r, top);
    body.lineTo(cx + r, top);
    body.lineTo(cx + r, cy);
  }
  body.ellipse(cx, cy, r, ry, 0, 0, Math.PI, false);
  body.closePath();

  ctx.save();
  ctx.fillStyle = linearGradient(ctx, cx - r, 0, cx + r, 0, [[0, tones.highlight], [0.26, tones.light], [0.6, tones.base], [0.86, tones.shade], [1, tones.deep]]);
  ctx.fill(body);
  ctx.clip(body);

  // Courses and staggered joints.
  const row = 4.4;
  ctx.strokeStyle = rgba(tones.deep, 0.34);
  ctx.lineWidth = 0.55;
  const joints = Math.max(4, Math.round((Math.PI * r) / 6.4));
  let k = 0;
  for (let z = row; z < h + 2; z += row, k++) {
    ctx.beginPath();
    ctx.ellipse(cx, cy - z, r, ry, 0, 0, Math.PI, false);
    for (let j = 0; j < joints; j++) {
      const th = ((j + 0.5 + (k % 2) * 0.5 + rand.range(-0.14, 0.14)) / joints) * Math.PI;
      const x = cx + Math.cos(th) * r;
      const y = cy - z + row + Math.sin(th) * ry;
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - row);
    }
    ctx.stroke();
  }
  // A few mottled stones.
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = rand.chance(0.5) ? rgba(tones.highlight, 0.18) : rgba(tones.deep, 0.15);
    ctx.fillRect(cx + rand.range(-0.9, 0.7) * r, cy - rand.range(0.1, 0.95) * h, rand.range(2.5, 6), rand.range(1.6, 3.4));
  }
  // Darker foot and a shadow under the parapet.
  ctx.fillStyle = linearGradient(ctx, 0, cy - h * 0.34, 0, cy + ry, [rgba('#1d160c', 0), rgba('#1d160c', 0.26)]);
  ctx.fillRect(cx - r, cy - h * 0.34, 2 * r, h * 0.34 + ry + 1);
  if (o.top === 'crenel' || o.top === 'flat' || o.top === 'cone') {
    ctx.fillStyle = linearGradient(ctx, 0, top, 0, top + 6, [rgba('#1d160c', 0.28), rgba('#1d160c', 0)]);
    ctx.fillRect(cx - r, top, 2 * r, 6);
  }
  if (o.moss) {
    ctx.fillStyle = rgba('#5d7a3a', 0.5);
    for (let i = 0; i < 6; i++) {
      const ang = rand.range(0.2, 2.9);
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(ang) * r * 0.9, cy - rand.range(0, 0.35) * h + Math.sin(ang) * ry, rand.range(2, 4), rand.range(1.5, 3.5), 0, 0, TAU);
      ctx.fill();
    }
  }

  // Slits and windows face the viewer.
  const front = Math.PI / 2;
  const slits = o.slits ?? 0;
  for (let i = 0; i < slits; i++) {
    const th = front + (i - (slits - 1) / 2) * 0.7 + rand.range(-0.08, 0.08);
    const z = h * (0.3 + 0.12 * i + rand.range(0, 0.05));
    const w = 1.5 * (0.35 + 0.65 * Math.sin(th));
    ctx.fillStyle = '#2b2118';
    ctx.fillRect(cx + Math.cos(th) * r - w / 2, cy - z + Math.sin(th) * ry - 4.6, w, 4.6);
  }
  const wins = o.windows ?? 0;
  for (let i = 0; i < wins; i++) {
    const th = front + (i - (wins - 1) / 2) * 0.8;
    const z = h * (0.46 + 0.18 * (i % 2));
    const w = 3 * (0.4 + 0.6 * Math.sin(th));
    const x = cx + Math.cos(th) * r;
    const y = cy - z + Math.sin(th) * ry;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x - w / 2, y - 4);
    ctx.quadraticCurveTo(x, y - 8, x + w / 2, y - 4);
    ctx.lineTo(x + w / 2, y);
    ctx.closePath();
    ctx.fillStyle = o.glow ?? '#e9b95a';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
  ctx.restore();

  if (broken) {
    ctx.save();
    ctx.clip(body);
    ctx.fillStyle = rgba('#241c14', 0.72);
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.05, top + 3.5, r * 0.72, ry * 0.8, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.lineJoin = 'round';
  ctx.stroke(body);
  ctx.restore();

  switch (o.top ?? 'crenel') {
    case 'crenel':
      crenelTop(ctx, cx, top, r, ry, tones);
      break;
    case 'flat':
      flatTop(ctx, cx, top, r, ry, tones);
      break;
    case 'cone':
      coneRoof(ctx, cx, top, r * 1.2, ry * 1.2, roofH, o.roof ?? '#b2503a', o.flag, rand);
      break;
    case 'dome':
      domeRoof(ctx, cx, top, r * 1.12, ry * 1.12, roofH * 0.62, o.roof ?? '#4f8a85', o.flag);
      break;
    case 'spire':
      spireRoof(ctx, cx, top, r * 1.1, ry * 1.1, roofH, o.roof ?? '#4b4757', o.flag, !!o.crown, rand);
      break;
    default:
      break;
  }
}

function flatTop(ctx: Ctx2D, cx: number, top: number, r: number, ry: number, tones: Shades): void {
  const R = r * 1.06;
  const RY = ry * 1.06;
  ctx.beginPath();
  ctx.ellipse(cx, top, R, RY, 0, 0, TAU);
  ctx.fillStyle = linearGradient(ctx, cx - R, 0, cx + R, 0, [tones.highlight, tones.light, tones.base]);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.1;
  ctx.stroke();
}

function crenelTop(ctx: Ctx2D, cx: number, top: number, r: number, ry: number, tones: Shades): void {
  flatTop(ctx, cx, top, r, ry, tones);
  const R = r * 1.06;
  const RY = ry * 1.06;
  // Sunken floor.
  ctx.beginPath();
  ctx.ellipse(cx, top + 1.2, R * 0.8, RY * 0.78, 0, 0, TAU);
  ctx.fillStyle = linearGradient(ctx, 0, top - RY, 0, top + RY, [mix(tones.deep, '#000000', 0.2), tones.shade]);
  ctx.fill();
  const n = Math.max(6, Math.round((TAU * R) / 6.6));
  const merlon = (th: number) => {
    const x = cx + Math.cos(th) * R;
    const y = top + Math.sin(th) * RY;
    const hw = 1.8 * (0.5 + 0.5 * Math.abs(Math.sin(th))) + 0.5;
    const c = Math.cos(th);
    ctx.beginPath();
    ctx.rect(x - hw, y - 3.6, hw * 2, 4.4);
    ctx.fillStyle = c < -0.25 ? tones.light : c > 0.25 ? tones.shade : tones.base;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.fillStyle = rgba(tones.highlight, 0.8);
    ctx.fillRect(x - hw, y - 3.6, hw * 2, 0.9);
  };
  for (let i = 0; i < n; i++) {
    const th = ((i + 0.25) / n) * TAU;
    if (Math.sin(th) < 0) merlon(th);
  }
  for (let i = 0; i < n; i++) {
    const th = ((i + 0.25) / n) * TAU;
    if (Math.sin(th) >= 0) merlon(th);
  }
}

/** Front half of an eave ring as a stroked arc. */
function eaveArc(ctx: Ctx2D, cx: number, y: number, rx: number, ry: number): void {
  ctx.beginPath();
  ctx.ellipse(cx, y, rx, ry, 0, 0, Math.PI, false);
}

export function coneRoof(ctx: Ctx2D, cx: number, baseY: number, e: number, ey: number, roofH: number, color: string, flag: string | undefined, rand: Rng): void {
  const roof = shades(color);
  const apexY = baseY - roofH;
  const sil = new Path2D();
  sil.moveTo(cx - e, baseY);
  sil.lineTo(cx, apexY);
  sil.lineTo(cx + e, baseY);
  sil.ellipse(cx, baseY, e, ey, 0, 0, Math.PI, false);
  sil.closePath();
  ctx.save();
  ctx.fillStyle = linearGradient(ctx, cx - e, 0, cx + e, 0, [[0, roof.highlight], [0.24, roof.light], [0.55, roof.base], [0.82, roof.shade], [1, roof.deep]]);
  ctx.fill(sil);
  ctx.clip(sil);
  // Shingle rows and seams.
  ctx.strokeStyle = rgba(roof.deep, 0.42);
  ctx.lineWidth = 0.65;
  const rows = Math.max(3, Math.round(roofH / 4.2));
  for (let i = 1; i < rows; i++) {
    const t = i / rows;
    eaveArc(ctx, cx, baseY - roofH * t, e * (1 - t), ey * (1 - t));
    ctx.stroke();
    ctx.beginPath();
    const n = Math.max(2, Math.round(e * (1 - t) * 0.5));
    for (let j = 0; j < n; j++) {
      const th = ((j + 0.5 + (i % 2) * 0.5) / n) * Math.PI;
      const x = cx + Math.cos(th) * e * (1 - t);
      const y = baseY - roofH * t + Math.sin(th) * ey * (1 - t);
      const t2 = (i + 1) / rows;
      const x2 = cx + Math.cos(th) * e * (1 - t2);
      const y2 = baseY - roofH * t2 + Math.sin(th) * ey * (1 - t2);
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = rgba(roof.highlight, 0.55);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(cx - e * 0.78, baseY + ey * 0.55);
  ctx.lineTo(cx - 0.4, apexY + 2);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.lineJoin = 'round';
  ctx.stroke(sil);
  ctx.strokeStyle = rgba(roof.deep, 0.9);
  ctx.lineWidth = 1.5;
  eaveArc(ctx, cx, baseY + 0.4, e, ey);
  ctx.stroke();
  ctx.restore();
  if (flag) drawFlag(ctx, cx, apexY + 1, 10 + rand.range(0, 2), flag, INK, 1);
}

export function domeRoof(ctx: Ctx2D, cx: number, baseY: number, e: number, ey: number, domeH: number, color: string, flag?: string): void {
  const roof = shades(color);
  const sil = new Path2D();
  sil.ellipse(cx, baseY, e, domeH, 0, Math.PI, 0, false);
  sil.ellipse(cx, baseY, e, ey, 0, 0, Math.PI, false);
  sil.closePath();
  ctx.save();
  ctx.fillStyle = ctx.createRadialGradient(cx - e * 0.4, baseY - domeH * 0.6, 0, cx, baseY - domeH * 0.2, e * 1.3);
  const g = ctx.fillStyle as CanvasGradient;
  g.addColorStop(0, roof.highlight);
  g.addColorStop(0.35, roof.light);
  g.addColorStop(0.7, roof.base);
  g.addColorStop(1, roof.deep);
  ctx.fill(sil);
  ctx.clip(sil);
  ctx.strokeStyle = rgba(roof.deep, 0.4);
  ctx.lineWidth = 0.7;
  for (const k of [0.36, 0.72]) {
    ctx.beginPath();
    ctx.ellipse(cx, baseY, e * k, domeH, 0, Math.PI, 0, false);
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.stroke(sil);
  ctx.restore();
  const top = baseY - domeH;
  shape(ctx, [[cx, top], [cx, top - 4]], { stroke: INK, width: 1.1, closed: false });
  ellipse(ctx, cx, top - 5, 1.4, 1.4, { fill: '#e8c25a', stroke: INK, width: 0.7 });
  if (flag) drawFlag(ctx, cx, top - 4, 9, flag, INK, 1);
}

export function spireRoof(ctx: Ctx2D, cx: number, baseY: number, e: number, ey: number, roofH: number, color: string, flag: string | undefined, crown: boolean, rand: Rng): void {
  const roof = shades(color);
  const apexY = baseY - roofH;
  const spike = (th: number, hgt: number) => {
    const x = cx + Math.cos(th) * e * 0.92;
    const y = baseY + Math.sin(th) * ey * 0.92;
    const w = 1.7;
    ctx.beginPath();
    ctx.moveTo(x - w, y + 0.5);
    ctx.lineTo(x + Math.cos(th) * 0.8, y - hgt);
    ctx.lineTo(x + w, y + 0.5);
    ctx.closePath();
    ctx.fillStyle = Math.cos(th) < 0 ? roof.light : roof.shade;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  };
  const nSpikes = crown ? 7 : 0;
  const hs = Array.from({ length: nSpikes }, () => rand.range(7, 11));
  for (let i = 0; i < nSpikes; i++) if (Math.sin(((i + 0.5) / nSpikes) * TAU) < 0) spike(((i + 0.5) / nSpikes) * TAU, hs[i]!);

  const sil = new Path2D();
  sil.moveTo(cx - e, baseY);
  sil.quadraticCurveTo(cx - e * 0.28, baseY - roofH * 0.42, cx, apexY);
  sil.quadraticCurveTo(cx + e * 0.28, baseY - roofH * 0.42, cx + e, baseY);
  sil.ellipse(cx, baseY, e, ey, 0, 0, Math.PI, false);
  sil.closePath();
  ctx.save();
  ctx.fillStyle = linearGradient(ctx, cx - e, 0, cx + e, 0, [[0, roof.light], [0.3, roof.base], [0.7, roof.shade], [1, roof.deep]]);
  ctx.fill(sil);
  ctx.clip(sil);
  ctx.strokeStyle = rgba(roof.deep, 0.55);
  ctx.lineWidth = 0.7;
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    const w = e * (1 - t) * 0.9;
    ctx.beginPath();
    ctx.ellipse(cx, baseY - roofH * t * 0.96, w, ey * (1 - t), 0, 0, Math.PI, false);
    ctx.stroke();
  }
  ctx.strokeStyle = rgba(roof.highlight, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - e * 0.8, baseY + 1);
  ctx.quadraticCurveTo(cx - e * 0.25, baseY - roofH * 0.45, cx - 0.5, apexY + 2);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.lineJoin = 'round';
  ctx.stroke(sil);
  ctx.restore();
  for (let i = 0; i < nSpikes; i++) if (Math.sin(((i + 0.5) / nSpikes) * TAU) >= 0) spike(((i + 0.5) / nSpikes) * TAU, hs[i]! * 0.8);
  if (flag) drawFlag(ctx, cx, apexY + 1, 11, flag, INK, 1);
}

/* ------------------------------------------------------------------------------------ */
/* Boxes: keeps, gatehouses, halls                                                       */
/* ------------------------------------------------------------------------------------ */

export interface RoofSpec {
  kind: 'hip' | 'gable' | 'pyramid';
  color: string;
  h: number;
  /** For gables: the axis the ridge runs along. Defaults to the longer side. */
  ridge?: 'u' | 'v';
  over?: number;
}

export interface BoxOpts {
  u: number;
  v: number;
  a: number;
  b: number;
  h: number;
  stone: string;
  top?: 'crenel' | 'flat';
  roof?: RoofSpec;
  /** Arched windows; columns/rows are derived from the face size. */
  windows?: { glow?: string; frame?: string; rows?: number; scale?: number } | false;
  /** Which face gets a gate: 'u' = the lit left face, 'v' = the shaded right face. */
  gate?: { face: 'u' | 'v'; w?: number; h?: number } | null;
  /** Small round turrets on the corners. */
  turrets?: { r?: number; h?: number; top?: TowerTop; roof?: string; inset?: number; flag?: string } | null;
  flag?: string;
  bias?: number;
  noShadow?: boolean;
  /** Plain rough texture instead of regular courses (ruins, cottages). */
  row?: number;
  /** No masonry texture at all (plaster or timber walls). */
  plain?: boolean;
  /** Arrow slits on the walls (for blank towers and bastions). */
  slits?: number;
}

export function addBox(stage: Stage, o: BoxOpts): void {
  const { ctx, iso, scene, rand } = stage;
  const { u, v, a, b, h } = o;
  const poly: Vec2[] = [[u, v], [u + a, v], [u + a, v + b], [u, v + b]];
  const roofH = o.roof ? o.roof.h : 0;
  if (!o.noShadow) {
    const foot = poly.map((g): Vec2 => iso(g[0], g[1]));
    scene.shadow(shadowOf(foot, h + roofH * 0.6 + (o.turrets ? (o.turrets.h ?? 8) * 0.4 : 0), 0.5));
  }
  scene.add(u + v + (a + b) / 2 + (o.bias ?? 0), () => {
    const tones = shades(o.stone);
    const res = drawPrism(ctx, iso, { poly, h, stone: o.stone, tones, rand: o.plain ? undefined : rand, row: o.row, top: o.roof ? false : mix(tones.highlight, tones.light, 0.45) });
    // Windows and gate.
    for (const f of res.faces) {
      const onV = Math.abs(f.a[1] - f.b[1]) < 1e-6;
      const isGate = !!o.gate && ((o.gate.face === 'v' && onV) || (o.gate.face === 'u' && !onV));
      if (isGate) {
        const gw = o.gate!.w ?? Math.min(9, f.len * 0.34);
        const gh = o.gate!.h ?? Math.min(h * 0.62, 14);
        gateway(ctx, f.frame, f.len / 2, gw, gh);
      }
      if (o.slits) {
        const cols = Math.max(1, Math.round(f.len / 12));
        for (let c = 0; c < cols; c++) {
          if (isGate && Math.abs((c + 0.5) / cols - 0.5) < 0.2) continue;
          const sx = (f.len * (c + 0.5)) / cols;
          for (let r = 0; r < o.slits; r++) slit(ctx, f.frame, sx, h * (0.34 + (0.4 * r) / Math.max(1, o.slits)) + 1, 1.5, 5);
        }
      }
      if (o.windows !== false && o.windows) {
        const sc = o.windows.scale ?? 1;
        const cols = Math.max(1, Math.floor((f.len - 4) / (12 * sc)));
        const rows = o.windows.rows ?? Math.max(1, Math.floor((h - 6) / (11 * sc)));
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (isGate && r === 0 && cols === 1) continue;
            if (isGate && r === 0 && Math.abs((c + 0.5) / cols - 0.5) < 0.2) continue;
            const wz = (isGate ? 3.5 : 3) + ((r + 1) * (h - 6)) / (rows + 0.6) - 2;
            archWindow(ctx, f.frame, (f.len * (c + 0.5)) / cols, wz, 2.7 * sc, 5.6 * sc, { glow: o.windows.glow, frame: o.windows.frame });
          }
        }
      }
    }

    const crenel = !o.roof && (o.top ?? 'crenel') === 'crenel';
    const edge = (p: Vec2, q: Vec2, inward: Vec2) => {
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      return { p, d: [(q[0] - p[0]) / len, (q[1] - p[1]) / len] as Vec2, inward, len, z: h, tones, ink: INK };
    };
    if (crenel) {
      merlonRow(ctx, iso, edge([u, v + b], [u + a, v + b], [0, -1]));
      merlonRow(ctx, iso, edge([u + a, v], [u + a, v + b], [-1, 0]));
    }
    const tur = o.turrets;
    const inset = tur?.inset ?? 2.4;
    const corners: Vec2[] = [[u + inset, v + inset], [u + a - inset, v + inset], [u + a - inset, v + b - inset], [u + inset, v + b - inset]];
    const mid = u + v + (a + b) / 2;
    const turretAt = (c: Vec2) => {
      if (!tur) return;
      const [cx, cy] = iso(c[0], c[1], h);
      drawRoundTower(ctx, cx, cy, { u: c[0], v: c[1], r: tur.r ?? 3.4, h: tur.h ?? 8, stone: o.stone, top: tur.top ?? 'cone', roof: tur.roof, roofH: (tur.r ?? 3.4) * 2.3, slits: 1, flag: tur.flag }, (tur.r ?? 3.4) * 2.3, rand);
    };
    const far = corners.filter((c) => c[0] + c[1] > mid).sort((p, q) => q[0] + q[1] - (p[0] + p[1]));
    const near = corners.filter((c) => c[0] + c[1] <= mid).sort((p, q) => q[0] + q[1] - (p[0] + p[1]));
    far.forEach(turretAt);
    if (o.roof) drawRoof(ctx, iso, o, o.roof, tones);
    near.forEach(turretAt);
    if (crenel) {
      merlonRow(ctx, iso, edge([u, v], [u + a, v], [0, 1]));
      merlonRow(ctx, iso, edge([u, v], [u, v + b], [1, 0]));
    }
    if (o.flag) {
      const [fx, fy] = iso(u + a / 2, v + b / 2, h + roofH);
      drawFlag(ctx, fx, fy, 11, o.flag, INK, 1);
    }
  });
}

function tri(ctx: Ctx2D, pts: readonly Vec2[], fill: string): void {
  ctx.beginPath();
  tracePoly(ctx, pts, true);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** Parallel shingle rows between an eave edge and a ridge edge. */
function slopeRows(ctx: Ctx2D, e0: Vec2, e1: Vec2, r0: Vec2, r1: Vec2, n: number, color: string): void {
  ctx.save();
  ctx.strokeStyle = rgba(color, 0.5);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let i = 1; i < n; i++) {
    const p = lerp2(e0, r0, i / n);
    const q = lerp2(e1, r1, i / n);
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(q[0], q[1]);
  }
  ctx.stroke();
  ctx.restore();
}

function eaveLine(ctx: Ctx2D, pts: readonly Vec2[], color: string): void {
  ctx.save();
  ctx.strokeStyle = rgba(color, 0.9);
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  tracePoly(ctx, pts, false);
  ctx.stroke();
  ctx.restore();
}

export function drawRoof(ctx: Ctx2D, iso: Iso, box: { u: number; v: number; a: number; b: number; h: number }, roof: RoofSpec, wall: Shades): void {
  const { u, v, a, b, h } = box;
  const ov = roof.over ?? 1.6;
  const rt = shades(roof.color);
  const z = h;
  const rh = roof.h;
  const P = (pu: number, pv: number, pz: number): Vec2 => iso(pu, pv, pz);
  const e0 = P(u - ov, v - ov, z);
  const e1 = P(u + a + ov, v - ov, z);
  const e3 = P(u - ov, v + b + ov, z);
  const rows = Math.max(3, Math.round(rh / 3.8));
  const kind = roof.kind === 'hip' && Math.abs(a - b) < 2 ? 'pyramid' : roof.kind;
  const front = mix(rt.base, rt.shade, 0.6);

  if (kind === 'pyramid') {
    const apex = P(u + a / 2, v + b / 2, z + rh);
    tri(ctx, [e0, apex, e3], rt.light);
    slopeRows(ctx, e0, e3, apex, apex, rows, rt.deep);
    tri(ctx, [e0, e1, apex], front);
    slopeRows(ctx, e0, e1, apex, apex, rows, rt.deep);
    eaveLine(ctx, [e3, e0, e1], rt.deep);
    return;
  }
  const ridge = roof.ridge ?? (a >= b ? 'u' : 'v');
  if (kind === 'hip') {
    if (ridge === 'u') {
      const r0 = P(u + b / 2, v + b / 2, z + rh);
      const r1 = P(u + a - b / 2, v + b / 2, z + rh);
      tri(ctx, [e0, r0, e3], rt.light);
      slopeRows(ctx, e0, e3, r0, r0, rows, rt.deep);
      tri(ctx, [e0, e1, r1, r0], front);
      slopeRows(ctx, e0, e1, r0, r1, rows, rt.deep);
      eaveLine(ctx, [e3, e0, e1], rt.deep);
      ctx.save();
      ctx.strokeStyle = rgba(rt.highlight, 0.8);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(r0[0], r0[1]);
      ctx.lineTo(r1[0], r1[1]);
      ctx.stroke();
      ctx.restore();
    } else {
      const r0 = P(u + a / 2, v + a / 2, z + rh);
      const r1 = P(u + a / 2, v + b - a / 2, z + rh);
      tri(ctx, [e0, e3, r1, r0], rt.light);
      slopeRows(ctx, e0, e3, r0, r1, rows, rt.deep);
      tri(ctx, [e0, e1, r0], front);
      slopeRows(ctx, e0, e1, r0, r0, rows, rt.deep);
      eaveLine(ctx, [e3, e0, e1], rt.deep);
      ctx.save();
      ctx.strokeStyle = rgba(rt.highlight, 0.8);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(r0[0], r0[1]);
      ctx.lineTo(r1[0], r1[1]);
      ctx.stroke();
      ctx.restore();
    }
    return;
  }
  // Gable.
  if (ridge === 'u') {
    const gable = [P(u, v, z), P(u, v + b, z), P(u, v + b / 2, z + rh)];
    tri(ctx, gable, wall.light);
    const r0 = P(u - ov, v + b / 2, z + rh);
    const r1 = P(u + a + ov, v + b / 2, z + rh);
    tri(ctx, [e0, e1, r1, r0], front);
    slopeRows(ctx, e0, e1, r0, r1, rows, rt.deep);
    eaveLine(ctx, [e0, e1], rt.deep);
    ctx.save();
    ctx.strokeStyle = rgba(rt.highlight, 0.8);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(r0[0], r0[1]);
    ctx.lineTo(r1[0], r1[1]);
    ctx.stroke();
    ctx.restore();
  } else {
    const gable = [P(u, v, z), P(u + a, v, z), P(u + a / 2, v, z + rh)];
    tri(ctx, gable, wall.shade);
    const r0 = P(u + a / 2, v - ov, z + rh);
    const r1 = P(u + a / 2, v + b + ov, z + rh);
    tri(ctx, [e0, e3, r1, r0], rt.light);
    slopeRows(ctx, e0, e3, r0, r1, rows, rt.deep);
    eaveLine(ctx, [e0, e3], rt.deep);
    ctx.save();
    ctx.strokeStyle = rgba(rt.highlight, 0.8);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(r0[0], r0[1]);
    ctx.lineTo(r1[0], r1[1]);
    ctx.stroke();
    ctx.restore();
  }
}

/* ------------------------------------------------------------------------------------ */
/* Ground                                                                                */
/* ------------------------------------------------------------------------------------ */

/** A soft patch of trodden earth (courtyards, roads). Painted before everything else. */
export function addGround(stage: Stage, poly: readonly Vec2[], color: string, alpha = 0.7): void {
  const { ctx, iso, scene, rand } = stage;
  const pts = poly.map((g): Vec2 => iso(g[0], g[1]));
  scene.add(1e6, () => {
    ctx.save();
    shape(ctx, pts, { fill: rgba(color, alpha), stroke: rgba(mix(color, '#2a2015', 0.45), alpha * 0.7), width: 1.2, smooth: true });
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    ctx.beginPath();
    tracePoly(ctx, pts, true);
    ctx.clip();
    ctx.fillStyle = rgba(mix(color, '#2a2015', 0.4), 0.35);
    const n = Math.round(((x1 - x0) * (y1 - y0)) / 90);
    for (let i = 0; i < n; i++) ctx.fillRect(rand.range(x0, x1), rand.range(y0, y1), rand.range(0.8, 1.6), rand.range(0.7, 1.2));
    ctx.fillStyle = rgba(mix(color, '#ffffff', 0.5), 0.3);
    for (let i = 0; i < n / 2; i++) ctx.fillRect(rand.range(x0, x1), rand.range(y0, y1), rand.range(0.8, 1.4), 0.9);
    ctx.restore();
  });
}

/** Corner points of a regular ring in grid space, used for round curtain walls. */
export function ringPoints(cu: number, cv: number, R: number, n: number, rot = 0): Vec2[] {
  return Array.from({ length: n }, (_, i): Vec2 => [cu + Math.cos(rot + (i / n) * TAU) * R, cv + Math.sin(rot + (i / n) * TAU) * R]);
}

export interface RingOpts {
  stone: string;
  h?: number;
  t?: number;
  ruin?: number;
  crenels?: boolean;
  /** Leaves a gap of width `w` on edge `edge` (pts[edge] to pts[edge + 1]) at fraction `at` for a gatehouse. */
  gate?: { edge: number; w: number; at?: number };
  /** Edges that are left open. */
  skip?: readonly number[];
}

/** Curtain wall around a closed polygon of grid points. */
export function addRing(stage: Stage, pts: readonly Vec2[], o: RingOpts): void {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    if (o.skip?.includes(i)) continue;
    const p = pts[i]!;
    const q = pts[(i + 1) % n]!;
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const common = { stone: o.stone, h: o.h, t: o.t, ruin: o.ruin, crenels: o.crenels, cap: false };
    if (o.gate && o.gate.edge === i) {
      const c = L * (o.gate.at ?? 0.5);
      const g = o.gate.w / 2;
      const d: Vec2 = [(q[0] - p[0]) / L, (q[1] - p[1]) / L];
      addWall(stage, { ...common, p, q: [p[0] + d[0] * (c - g), p[1] + d[1] * (c - g)] });
      addWall(stage, { ...common, p: [p[0] + d[0] * (c + g), p[1] + d[1] * (c + g)], q });
    } else {
      addWall(stage, { ...common, p, q });
    }
  }
}

/* ------------------------------------------------------------------------------------ */
/* Ruins                                                                                 */
/* ------------------------------------------------------------------------------------ */

export interface RuinWallOpts {
  p: Vec2;
  q: Vec2;
  t?: number;
  h: number;
  stone: string;
  /** How ragged the top is, 0..1. */
  broken?: number;
  moss?: boolean;
  /** The visible face is the inside of a room: a little dimmer. */
  inner?: boolean;
  /** Heights at p and q, so that neighbouring walls agree at their corners. */
  ends?: [number, number];
  /** Missing part of the wall, as fractions of its length (measured from p). */
  gap?: [number, number];
}

/** Piecewise linear top line of a broken wall: (distance along the wall, height). Equal distances make vertical breaks. */
function ruinProfile(rand: Rng, L: number, h: number, broken: number, ends: [number, number], gap?: [number, number]): Vec2[] {
  const n = Math.max(2, Math.round(L / 6));
  const pts: Vec2[] = [[0, ends[0]]];
  let prev = ends[0];
  let wasGap = false;
  for (let i = 1; i < n; i++) {
    const s = (i / n) * L + rand.range(-1.2, 1.2);
    const inGap = !!gap && s / L > gap[0] && s / L < gap[1];
    const z = inGap ? h * rand.range(0.05, 0.14) : Math.max(2.5, h * (1 - broken * rand.range(0, 0.85)));
    if (inGap || wasGap || rand.chance(0.4)) pts.push([s, prev]);
    pts.push([s, z]);
    prev = z;
    wasGap = inGap;
  }
  if (wasGap || rand.chance(0.35)) pts.push([L, prev]);
  pts.push([L, ends[1]]);
  return pts;
}

/** A free-standing wall fragment with a jagged, broken top. The face towards the viewer is drawn. */
export function addRuinWall(stage: Stage, o: RuinWallOpts): void {
  const { ctx, iso, scene, rand } = stage;
  let p = o.p;
  let q = o.q;
  let ends: [number, number] = o.ends ?? [o.h * rand.range(0.7, 1), o.h * rand.range(0.7, 1)];
  let gap = o.gap;
  if (q[0] + q[1] < p[0] + p[1]) {
    [p, q] = [q, p];
    ends = [ends[1], ends[0]];
    if (gap) gap = [1 - gap[1], 1 - gap[0]];
  }
  const t = o.t ?? 4;
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
  if (L < 1) return;
  const d: Vec2 = [(q[0] - p[0]) / L, (q[1] - p[1]) / L];
  const n: Vec2 = d[0] > d[1] ? [d[1], -d[0]] : [-d[1], d[0]];
  const ht = t / 2;
  const F = (s: number): Vec2 => [p[0] + d[0] * s + n[0] * ht, p[1] + d[1] * s + n[1] * ht];
  const Bk = (s: number): Vec2 => [p[0] + d[0] * s - n[0] * ht, p[1] + d[1] * s - n[1] * ht];
  const prof = ruinProfile(rand, L, o.h, o.broken ?? 0.6, ends, gap);
  const sh = shades(o.stone);
  const sFront = (n[1] - n[0]) / Math.SQRT2;
  const sCap = (d[0] - d[1]) / Math.SQRT2;
  scene.shadow(shadowOf([F(0), F(L), Bk(L), Bk(0)].map((g): Vec2 => iso(g[0], g[1])), o.h * 0.7, 0.5));

  for (let i = 0; i < prof.length - 1; i++) {
    const [s0, z0] = prof[i]!;
    const [s1, z1] = prof[i + 1]!;
    if (s1 - s0 < 0.05) continue;
    const seed = rand.fork(rand.int(0, 1e9));
    scene.add(p[0] + p[1] + (d[0] + d[1]) * ((s0 + s1) / 2), () => {
      const P = (g: Vec2, z: number) => iso(g[0], g[1], z);
      const A = P(F(s0), 0);
      const B = P(F(s1), 0);
      const E = P(Bk(s0), 0);
      const At = P(F(s0), z0);
      const Bt = P(F(s1), z1);
      const Ct = P(Bk(s0), z0);
      const Dt = P(Bk(s1), z1);
      const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineWidth = 1;
      ctx.strokeStyle = INK;
      // Near end of the segment (only visible above a lower neighbour).
      ctx.beginPath();
      tracePoly(ctx, [A, E, Ct, At], true);
      ctx.fillStyle = faceGradient(ctx, sh, sCap, Math.min(At[1], Ct[1]), Math.max(A[1], E[1]));
      ctx.fill();
      ctx.stroke();
      // Long face with masonry.
      ctx.beginPath();
      tracePoly(ctx, [A, B, Bt, At], true);
      const top = Math.min(At[1], Bt[1]);
      ctx.fillStyle = faceGradient(ctx, sh, sFront, top, Math.max(A[1], B[1]));
      ctx.fill();
      ctx.save();
      ctx.clip();
      inFace(ctx, { o: A, d: [(B[0] - A[0]) / len, (B[1] - A[1]) / len] }, () => {
        const zm = Math.max(z0, z1);
        masonry(ctx, len, zm + 2, sh.deep, seed, { row: 4.2, block: 6 });
        mottle(ctx, len, zm, sh, seed, Math.max(1, Math.round((len * zm) / 90)));
        if (o.moss) {
          ctx.fillStyle = rgba('#5d7a3a', 0.5);
          for (let k = 0; k < 2; k++) {
            ctx.beginPath();
            ctx.ellipse(seed.range(0, len), seed.range(0, zm * 0.35), seed.range(1.6, 3.4), seed.range(1, 2.2), 0, 0, TAU);
            ctx.fill();
          }
          ctx.strokeStyle = rgba('#4d6b2f', 0.8);
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          for (let k = 0; k < 2; k++) {
            const x = seed.range(0.5, len - 0.5);
            const zt = z0 + ((z1 - z0) * x) / len;
            ctx.moveTo(x, zt);
            ctx.lineTo(x + seed.range(-0.6, 0.6), zt - seed.range(3, Math.min(8, zt)));
          }
          ctx.stroke();
        }
      });
      ctx.fillStyle = groundShade(ctx, top, Math.max(A[1], B[1]), '#1d160c', o.inner ? 0.42 : 0.26);
      ctx.fillRect(Math.min(A[0], B[0]) - 1, top - 1, Math.abs(B[0] - A[0]) + 2, Math.max(A[1], B[1]) - top + 2);
      ctx.restore();
      ctx.stroke();
      // Weathered top.
      ctx.beginPath();
      tracePoly(ctx, [At, Bt, Dt, Ct], true);
      ctx.fillStyle = mix(sh.highlight, sh.base, 0.4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  }
}

export interface RuinBoxOpts {
  u: number;
  v: number;
  a: number;
  b: number;
  /** Height of the best preserved corner. */
  h: number;
  t?: number;
  stone: string;
  broken?: number;
  moss?: boolean;
  floor?: string;
  /** Leaves a breach in one of the front walls. */
  breach?: 'u' | 'v';
}

/** A roofless building with four broken walls. */
export function addRuinBox(stage: Stage, o: RuinBoxOpts): void {
  const { iso, scene, rand } = stage;
  const { u, v, a, b, h } = o;
  const t = o.t ?? 3.6;
  const e = t / 2;
  const hs = () => h * rand.range(0.62, 1);
  const c00 = hs();
  const c10 = hs();
  const c01 = hs();
  const c11 = hs();
  const common = { t, h, stone: o.stone, broken: o.broken ?? 0.7, moss: o.moss };
  addRuinWall(stage, { ...common, p: [u - e, v], q: [u + a + e, v], ends: [c00, c10], gap: o.breach === 'v' ? [0.35, 0.62] : undefined });
  addRuinWall(stage, { ...common, p: [u, v - e], q: [u, v + b + e], ends: [c00, c01], gap: o.breach === 'u' ? [0.35, 0.62] : undefined });
  addRuinWall(stage, { ...common, p: [u - e, v + b], q: [u + a + e, v + b], ends: [c01, c11], inner: true });
  addRuinWall(stage, { ...common, p: [u + a, v - e], q: [u + a, v + b + e], ends: [c10, c11], inner: true });

  const u0 = u + e;
  const u1 = u + a - e;
  const v0 = v + e;
  const v1 = v + b - e;
  const floor = o.floor ?? '#6e6554';
  const speck = rand.fork(rand.int(0, 1e9));
  scene.add(1e6 - 0.5, () => {
    const { ctx } = stage;
    ctx.save();
    ctx.beginPath();
    tracePoly(ctx, [iso(u0, v0), iso(u1, v0), iso(u1, v1), iso(u0, v1)], true);
    ctx.fillStyle = floor;
    ctx.fill();
    ctx.clip();
    // Paving joints.
    ctx.strokeStyle = rgba('#2a2015', 0.28);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let x = u0 + 4.5; x < u1; x += 5.5) {
      const A = iso(x, v0);
      const B = iso(x, v1);
      ctx.moveTo(A[0], A[1]);
      ctx.lineTo(B[0], B[1]);
    }
    for (let y = v0 + 4.5; y < v1; y += 5.5) {
      const A = iso(u0, y);
      const B = iso(u1, y);
      ctx.moveTo(A[0], A[1]);
      ctx.lineTo(B[0], B[1]);
    }
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const [x, y] = iso(speck.range(u0, u1), speck.range(v0, v1));
      ctx.fillStyle = rgba(speck.chance(0.5) ? '#7d9a48' : '#a89f8c', 0.7);
      ctx.fillRect(x, y, speck.range(1.5, 3.2), 1.2);
    }
    ctx.restore();
  });
}

export interface RuinRingOpts {
  stone: string;
  h: number;
  t?: number;
  broken?: number;
  moss?: boolean;
  /** Missing parts per edge (fractions of the edge length). */
  gaps?: Readonly<Record<number, [number, number]>>;
  /** Edges that are gone entirely. */
  skip?: readonly number[];
}

/** A collapsed curtain wall around a closed polygon; neighbouring segments share their corner heights. */
export function addRuinRing(stage: Stage, pts: readonly Vec2[], o: RuinRingOpts): void {
  const n = pts.length;
  const corner = pts.map(() => o.h * stage.rand.range(0.66, 1));
  for (let i = 0; i < n; i++) {
    if (o.skip?.includes(i)) continue;
    addRuinWall(stage, {
      p: pts[i]!,
      q: pts[(i + 1) % n]!,
      h: o.h,
      t: o.t,
      stone: o.stone,
      broken: o.broken,
      moss: o.moss,
      gap: o.gaps?.[i],
      ends: [corner[i]!, corner[(i + 1) % n]!],
    });
  }
}

export interface CragOpts {
  poly: readonly Vec2[];
  elev: number;
  color: string;
  /** Colour of the plateau. */
  top?: string;
}

/** A rocky outcrop with a flat top; objects standing on it use a stage whose origin is raised by `elev`. */
export function addCrag(stage: Stage, o: CragOpts): void {
  const { ctx, iso, scene, rand } = stage;
  const foot = o.poly.map((g): Vec2 => iso(g[0], g[1]));
  scene.shadow(shadowOf(foot, o.elev * 0.9, 0.5));
  const depth = Math.max(...o.poly.map((g) => g[0] + g[1])) + 0.3;
  const cracks = o.poly.map(() => Array.from({ length: 3 }, () => ({ at: rand.range(0.12, 0.88), len: rand.range(0.35, 0.85), lean: rand.range(-1.6, 1.6) })));
  scene.add(depth, () => {
    const tones = shades(o.color);
    const grass = mix('#7f9a4c', o.color, 0.2);
    const { faces } = drawPrism(ctx, iso, { poly: o.poly, h: o.elev, stone: o.color, tones, top: o.top ?? grass, lineWidth: 1.2 });
    faces.forEach((f, k) => {
      inFace(ctx, f.frame, () => {
        ctx.lineCap = 'round';
        // Darker foot.
        ctx.fillStyle = linearGradient(ctx, 0, 0, 0, o.elev * 0.5, [rgba('#1d160c', 0.34), rgba('#1d160c', 0)]);
        ctx.fillRect(0, 0, f.len, o.elev * 0.5);
        for (const c of cracks[k % cracks.length]!) {
          ctx.strokeStyle = rgba(tones.deep, 0.55);
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          const x = c.at * f.len;
          ctx.moveTo(x, o.elev);
          ctx.lineTo(x + c.lean, o.elev - c.len * o.elev * 0.5);
          ctx.lineTo(x - c.lean * 0.6, o.elev - c.len * o.elev);
          ctx.stroke();
          ctx.strokeStyle = rgba(tones.highlight, 0.4);
          ctx.beginPath();
          ctx.moveTo(x + 1.2, o.elev - 0.5);
          ctx.lineTo(x + 1.2 + c.lean, o.elev - c.len * o.elev * 0.45);
          ctx.stroke();
        }
        // Strata.
        ctx.strokeStyle = rgba(tones.deep, 0.3);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (const t of [0.34, 0.66]) {
          ctx.moveTo(0, o.elev * t);
          ctx.lineTo(f.len * 0.4, o.elev * t - 0.8);
          ctx.moveTo(f.len * 0.55, o.elev * t + 0.6);
          ctx.lineTo(f.len, o.elev * t);
        }
        ctx.stroke();
        // Grassy lip along the top edge.
        ctx.fillStyle = grass;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.8;
        for (let x = 1.5; x < f.len - 1; x += 3.3) {
          ctx.beginPath();
          ctx.ellipse(x + (k % 2), o.elev, 2.3, 1.6 + ((x * 7) % 5) * 0.35, 0, Math.PI, TAU, false);
          ctx.fill();
          ctx.stroke();
        }
      });
    });
  });
}
