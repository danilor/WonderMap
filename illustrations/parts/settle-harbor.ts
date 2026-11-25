import { mix, rgba } from '../kit/colors';
import { ellipse, linearGradient, shades, shape, softBlob, traceSmooth, tracePoly } from '../kit/draw';
import { TAU, pointInPoly } from '../kit/math';
import type { Vec2 } from '../kit/types';
import { drawFlag } from './building';
import { drawPrism } from './settle-castle';
import { INK, STONE, boxFootprint, inFace, leftFace, shadowOf } from './settle-geom';
import type { Stage } from './settle-geom';

/**
 * Harbour toolkit: water patches, stone quays, wooden piers, boats and ships, cranes. Positions are grid coordinates
 * `(u, v)`; water lies towards negative `v` (the lower right of the sprite).
 */

export const SEA = { deep: '#2c6f98', mid: '#3d8db4', shallow: '#86cdd6', foam: '#e8f7f3' } as const;

export interface SeaOpts {
  /** Stretch of the outline that is a beach (gets a pale shallow band and foam): `count` vertices from vertex `from`. */
  shore?: { from: number; count: number };
  colors?: Partial<Record<keyof typeof SEA, string>>;
  ripples?: number;
  /** Amount of random wobble added to the outline (fraction of the edge length). */
  wobble?: number;
}

/** A soft-edged patch of sea painted under everything else. */
export function addSea(st: Stage, base: readonly Vec2[], o: SeaOpts = {}): void {
  const { ctx, iso, scene, rand } = st;
  const c = { ...SEA, ...o.colors };
  const seed = rand.fork(rand.int(0, 1e9));
  const wob = o.wobble ?? 0.16;
  // One extra vertex per edge, pushed sideways, makes the coastline irregular.
  const poly: Vec2[] = [];
  base.forEach((p, i) => {
    const q = base[(i + 1) % base.length]!;
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    const j = seed.range(-1, 1) * Math.min(4, L * wob);
    poly.push(p, [(p[0] + q[0]) / 2 - ((q[1] - p[1]) / L) * j, (p[1] + q[1]) / 2 + ((q[0] - p[0]) / L) * j]);
  });
  const pts = poly.map((g): Vec2 => iso(g[0], g[1]));
  const shore: Vec2[] = [];
  if (o.shore) {
    for (let k = 0; k < o.shore.count * 2 - 1; k++) shore.push(pts[(o.shore.from * 2 + k) % pts.length]!);
  }
  let vMin = Infinity;
  let vMax = -Infinity;
  let uMid = 0;
  for (const [pu, pv] of poly) {
    vMin = Math.min(vMin, pv);
    vMax = Math.max(vMax, pv);
    uMid += pu / poly.length;
  }
  const ripples: Vec2[] = [];
  const uLo = Math.min(...poly.map((p) => p[0]));
  const uHi = Math.max(...poly.map((p) => p[0]));
  const inner = poly.map((p): Vec2 => [p[0] * 0.9 + uMid * 0.1, p[1] * 0.9 + (vMin + vMax) * 0.05]);
  for (let i = 0, guard = 0; i < (o.ripples ?? 16) && guard < 400; guard++) {
    const g: Vec2 = [seed.range(uLo, uHi), seed.range(vMin, vMax)];
    if (!pointInPoly(g[0], g[1], inner)) continue;
    ripples.push(iso(g[0], g[1]));
    i++;
  }
  scene.add(1e6 + 0.9, () => {
    ctx.save();
    const scale = Math.max(0.2, ctx.getTransform().a);
    ctx.filter = `blur(${(1.5 * scale).toFixed(2)}px)`;
    shape(ctx, pts, { fill: c.mid, smooth: true });
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    traceSmooth(ctx, pts, true);
    ctx.clip();
    const a = iso(uMid, vMax);
    const b = iso(uMid, vMin);
    ctx.fillStyle = linearGradient(ctx, a[0], a[1], b[0], b[1], [[0, rgba(c.shallow, 0.55)], [0.3, rgba(c.mid, 0)], [1, rgba(c.deep, 0.7)]]);
    ctx.fillRect(Math.min(...pts.map((p) => p[0])) - 2, Math.min(...pts.map((p) => p[1])) - 2, 400, 400);
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(c.foam, 0.55);
    ctx.lineWidth = 0.9;
    for (const [x, y] of ripples) {
      const w = seed.range(2.4, 4.2);
      ctx.beginPath();
      ctx.moveTo(x - w, y + 0.4);
      ctx.quadraticCurveTo(x - w / 2, y - 1.1, x, y + 0.2);
      ctx.quadraticCurveTo(x + w / 2, y + 1.3, x + w, y - 0.2);
      ctx.stroke();
    }
    if (shore.length > 1) {
      ctx.lineJoin = 'round';
      for (const [w, col, al] of [[9, c.shallow, 0.3], [5, c.shallow, 0.4], [2.6, c.foam, 0.45]] as const) {
        ctx.strokeStyle = rgba(col, al);
        ctx.lineWidth = w;
        ctx.beginPath();
        traceSmooth(ctx, shore, false);
        ctx.stroke();
      }
      ctx.setLineDash([3.5, 2.2]);
      ctx.strokeStyle = rgba(c.foam, 0.9);
      ctx.lineWidth = 1;
      ctx.beginPath();
      traceSmooth(ctx, shore, false);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  });
}

export interface QuayOpts {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
  /** Custom outline (an L-shaped wharf with a mole, say); u0..v1 must then be its bounding box. */
  poly?: readonly Vec2[];
  /** Indices of the outline edges that meet the water and get foam (default: the first). */
  foam?: readonly number[];
  h?: number;
  stone?: string;
  top?: string;
  /** Mooring posts along the water edge: positions along u. */
  bollards?: readonly number[];
  /** The v at which the bollards stand (default: just behind the front edge). */
  bollardV?: number;
}

/** A stone wharf: a low flat slab whose front face meets the water. */
export function addQuay(st: Stage, o: QuayOpts): void {
  const { ctx, iso, scene, rand } = st;
  const h = o.h ?? 3;
  const stone = o.stone ?? STONE.gray;
  const poly: Vec2[] = o.poly ? o.poly.slice() : [[o.u0, o.v0], [o.u1, o.v0], [o.u1, o.v1], [o.u0, o.v1]];
  const tones = shades(stone);
  const seed = rand.fork(rand.int(0, 1e9));
  const waterEdges = (o.foam ?? [0]).map((i): [Vec2, Vec2] => {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    // Push the line half a unit out of the wall, towards the water (away from the polygon centre).
    const nx = -(q[1] - p[1]) / L;
    const ny = (q[0] - p[0]) / L;
    const cu = (o.u0 + o.u1) / 2;
    const cv = (o.v0 + o.v1) / 2;
    const sgn = (((p[0] + q[0]) / 2 - cu) * nx + ((p[1] + q[1]) / 2 - cv) * ny) >= 0 ? 1 : -1;
    const ex = (q[0] - p[0]) / L;
    const ey = (q[1] - p[1]) / L;
    return [
      [p[0] + nx * sgn * 0.4 - ex * 0.5, p[1] + ny * sgn * 0.4 - ey * 0.5],
      [q[0] + nx * sgn * 0.4 + ex * 0.5, q[1] + ny * sgn * 0.4 + ey * 0.5],
    ];
  });
  scene.add(1e6 + 0.3, () => {
    drawPrism(ctx, iso, { poly, h, stone, tones, rand: seed, top: mix(tones.highlight, tones.light, 0.4), lineWidth: 1 });
    ctx.save();
    ctx.lineCap = 'round';
    for (const [a, b] of waterEdges) {
      const f0 = iso(a[0], a[1]);
      const f1 = iso(b[0], b[1]);
      ctx.setLineDash([]);
      ctx.strokeStyle = rgba(SEA.foam, 0.8);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(f0[0], f0[1] + 0.4);
      ctx.lineTo(f1[0], f1[1] + 0.4);
      ctx.stroke();
      ctx.setLineDash([3, 2.4]);
      ctx.strokeStyle = rgba(SEA.foam, 0.6);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(f0[0] + 1, f0[1] + 2);
      ctx.lineTo(f1[0] + 1, f1[1] + 2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    tracePoly(ctx, poly.map((g): Vec2 => iso(g[0], g[1], h)), true);
    ctx.clip();
    ctx.strokeStyle = rgba(INK, 0.22);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let x = o.u0 + 4; x < o.u1; x += 5.4) {
      const p = iso(x, o.v0, h);
      const q = iso(x, o.v1, h);
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
    }
    for (let y = o.v0 + 3.2; y < o.v1; y += 3.8) {
      const p = iso(o.u0, y, h);
      const q = iso(o.u1, y, h);
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
    }
    ctx.stroke();
    ctx.restore();
    // Edge highlight along the water side.
    ctx.strokeStyle = rgba('#fff7e0', 0.55);
    ctx.lineWidth = 0.8;
    for (const i of o.foam ?? [0]) {
      const e0 = iso(poly[i]![0], poly[i]![1], h);
      const e1 = iso(poly[(i + 1) % poly.length]![0], poly[(i + 1) % poly.length]![1], h);
      ctx.beginPath();
      ctx.moveTo(e0[0], e0[1] + 0.8);
      ctx.lineTo(e1[0], e1[1] + 0.8);
      ctx.stroke();
    }
    for (const bu of o.bollards ?? []) {
      const [x, y] = iso(bu, o.bollardV ?? o.v0 + 1.4, h);
      ctx.fillStyle = '#4a3a2b';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.rect(x - 0.9, y - 2.4, 1.8, 2.4);
      ctx.fill();
      ctx.stroke();
      ellipse(ctx, x, y - 2.4, 1.1, 0.6, { fill: '#6b5a48', stroke: INK, width: 0.6 });
    }
  });
  scene.shadow(shadowOf(poly.map((g): Vec2 => iso(g[0], g[1])), h, 0.5));
}

export interface PierOpts {
  u: number;
  /** Where the pier leaves the shore. It runs towards -v. */
  v: number;
  len: number;
  w?: number;
  wood?: string;
  lantern?: boolean;
  /** Mooring posts on the free end. */
  bollards?: boolean;
}

/** A wooden jetty on piles. */
export function addPier(st: Stage, o: PierOpts): void {
  const { ctx, iso, scene } = st;
  const w = o.w ?? 5;
  const wood = o.wood ?? '#a57f52';
  const tones = shades(wood);
  const seg = 7;
  const n = Math.max(1, Math.round(o.len / seg));
  const z0 = 1.8;
  const dh = 1.4;
  for (let i = 0; i < n; i++) {
    const vA = o.v - (o.len / n) * i;
    const vB = o.v - (o.len / n) * (i + 1);
    const last = i === n - 1;
    scene.add(o.u + w / 2 + (vA + vB) / 2 + 0.4, () => {
      ctx.save();
      // Water shadow and piles.
      const sh = [iso(o.u - 0.5, vA), iso(o.u + w + 1.5, vA), iso(o.u + w + 1.5, vB), iso(o.u - 0.5, vB)];
      ctx.beginPath();
      tracePoly(ctx, sh, true);
      ctx.fillStyle = rgba('#10313f', 0.3);
      ctx.fill();
      const posts: Vec2[] = [[o.u + 0.4, vB + 0.3], [o.u + w - 0.4, vB + 0.3]];
      if (i === 0) posts.push([o.u + 0.4, vA - 0.3], [o.u + w - 0.4, vA - 0.3]);
      for (const [pu, pv] of posts) {
        const b = iso(pu, pv, -0.6);
        const t = iso(pu, pv, z0 + 0.2);
        ctx.lineCap = 'round';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.1;
        ctx.beginPath();
        ctx.moveTo(b[0], b[1]);
        ctx.lineTo(t[0], t[1]);
        ctx.stroke();
        ctx.strokeStyle = tones.deep;
        ctx.lineWidth = 1.1;
        ctx.stroke();
        ctx.strokeStyle = rgba('#e8f7f3', 0.8);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(b[0], b[1] + 0.2, 1.9, 0.8, 0, 0, TAU);
        ctx.stroke();
      }
      drawPrism(ctx, iso, { poly: [[o.u, vA], [o.u + w, vA], [o.u + w, vB], [o.u, vB]], z0, h: dh, stone: wood, tones, top: tones.light, lineWidth: 0.9 });
      ctx.strokeStyle = rgba(INK, 0.35);
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      for (let k = 1.4; k < Math.abs(vA - vB); k += 1.7) {
        const p = iso(o.u, vA - k, z0 + dh);
        const q = iso(o.u + w, vA - k, z0 + dh);
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(q[0], q[1]);
      }
      ctx.stroke();
      if (last && (o.bollards ?? true)) {
        for (const bu of [o.u + 0.9, o.u + w - 0.9]) {
          const [x, y] = iso(bu, vB + 0.9, z0 + dh);
          ctx.fillStyle = '#4a3a2b';
          ctx.strokeStyle = INK;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.rect(x - 0.9, y - 2.2, 1.8, 2.2);
          ctx.fill();
          ctx.stroke();
        }
      }
      if (last && o.lantern) {
        const [x, y] = iso(o.u + w / 2, vB + 1, z0 + dh);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - 7);
        ctx.stroke();
        softBlob(ctx, x, y - 8, 4, 3.4, '#ffd27a', 0.5);
        ctx.fillStyle = '#ffd27a';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.rect(x - 1.2, y - 9.4, 2.4, 2.8);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    });
  }
}

export interface BoatMast {
  h: number;
  sail?: string;
  stripe?: string;
  kind?: 'square' | 'lateen' | 'furled';
  flag?: string;
  /** Sail half-width as a multiple of the half beam. */
  spread?: number;
}

export interface BoatOpts {
  u: number;
  v: number;
  /** Axis the keel runs along. */
  dir: 'u' | 'v';
  len: number;
  beam: number;
  hull: string;
  trim?: string;
  sheer?: number;
  /** Which end is the bow: +1 towards +axis, -1 towards -axis. */
  bow?: 1 | -1;
  prow?: 'plain' | 'dragon';
  mast?: BoatMast;
  cargo?: 'barrels' | 'crates' | 'fish' | 'logs';
  oars?: number;
  shields?: readonly string[];
  /** Shipbuilding: 0 = bare ribs ... 1 = fully planked. */
  build?: number;
  /** Boat on land: no water, optionally lifted onto blocks. */
  dry?: boolean;
  lift?: number;
  /** Tilt the interior away (a boat turned over on trestles shows only the hull). */
  upturned?: boolean;
}

/** A small vessel in the dimetric grid, from rowboats to merchant cogs, built from a 3D lens-shaped hull. */
export function addBoat(st: Stage, o: BoatOpts): void {
  const { ctx, iso, scene, rand } = st;
  const trim = o.trim ?? mix(o.hull, '#efe2bd', 0.6);
  const L = o.len;
  const W = o.beam;
  const lift = o.lift ?? 0;
  const zg = Math.max(2.2, W * 0.36);
  const sheer = o.sheer ?? W * 0.3;
  const bow = o.bow ?? 1;
  const hullTone = shades(o.hull);
  const seed = rand.fork(rand.int(0, 1e9));
  const half = (s: number): number => (W / 2) * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, s))), 0.6);
  const zt = (s: number): number => {
    const q = (s - 0.5) * 2 * bow;
    return lift + zg + sheer * (q > 0 ? Math.pow(q, 2.2) : 0.5 * Math.pow(-q, 2.2));
  };
  const at = (s: number, side: number, z: number, wf = 1): Vec2 => {
    const a = (s - 0.5) * L;
    const x = side * half(s) * wf;
    return o.dir === 'u' ? iso(o.u + a, o.v + x, z) : iso(o.u + x, o.v + a, z);
  };
  const N = 14;
  const ss = Array.from({ length: N + 1 }, (_, i) => i / N);
  const nearTop = ss.map((s) => at(s, -1, zt(s)));
  const farTop = ss.map((s) => at(s, 1, zt(s)));
  const keel = lift - 0.3;
  const nearWater = ss.map((s) => at(s, -1, keel, 0.58));
  const depth = o.u + o.v + 0.2;

  scene.add(depth, () => {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (!o.dry) {
      const ring = (wf: number): Vec2[] => [...ss.map((s) => at(s, -1, 0, wf)), ...ss.slice().reverse().map((s) => at(s, 1, 0, wf))];
      shape(ctx, ring(1.45), { fill: rgba('#10313f', 0.3), smooth: true });
      shape(ctx, ring(1.2), { stroke: rgba(SEA.foam, 0.75), width: 1, smooth: true });
      ctx.setLineDash([2.5, 2]);
      shape(ctx, ring(1.5), { stroke: rgba(SEA.foam, 0.45), width: 0.8, smooth: true });
      ctx.setLineDash([]);
    } else {
      softBlob(ctx, at(0.5, 0, 0)[0] + 1.5, at(0.5, 0, 0)[1] + 0.8, L * 0.45, L * 0.2, '#1d160c', 0.28);
    }
    const frameLine = (pts: readonly Vec2[], col: string, wi: number): void => {
      ctx.strokeStyle = INK;
      ctx.lineWidth = wi + 1.2;
      ctx.beginPath();
      tracePoly(ctx, pts, false);
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = wi;
      ctx.beginPath();
      tracePoly(ctx, pts, false);
      ctx.stroke();
    };

    if (o.build !== undefined) {
      const pf = Math.min(1, Math.max(0, o.build));
      const raw = mix(hullTone.light, '#e0c48a', 0.55);
      const ribs = Math.max(4, Math.round(L / 4.4));
      const rib = (s: number, side: number): Vec2[] => {
        const pts: Vec2[] = [];
        for (let t = 0; t <= 1.001; t += 0.2) pts.push(at(s, side, keel + (zt(s) - keel) * Math.pow(t, 1.35), 0.12 + 0.88 * Math.pow(t, 0.75)));
        return pts;
      };
      for (let k = 0; k < ribs; k++) frameLine(rib((k + 0.6) / (ribs + 0.2), 1), raw, 0.9);
      frameLine(ss.map((s) => at(s, 0, keel + 0.2, 0)), mix(raw, '#8a6a40', 0.4), 1.5);
      if (pf > 0) {
        const planked = (side: number): Vec2[] => [
          ...ss.map((s) => at(s, side, keel + (zt(s) - keel) * pf * 0.92, 0.58 + 0.42 * pf)),
          ...ss.slice().reverse().map((s) => at(s, side, keel, 0.58)),
        ];
        const near = planked(-1);
        shape(ctx, near, { fill: linearGradient(ctx, 0, Math.min(...near.map((p) => p[1])), 0, Math.max(...near.map((p) => p[1])), [hullTone.light, hullTone.base]), stroke: INK, width: 1, closed: true });
        ctx.strokeStyle = rgba(INK, 0.4);
        ctx.lineWidth = 0.6;
        for (let k = 1; k <= 3; k++) {
          const f = k / 4;
          ctx.beginPath();
          tracePoly(ctx, ss.map((s) => at(s, -1, keel + (zt(s) - keel) * pf * 0.92 * f, 0.58 + 0.42 * pf * f)), false);
          ctx.stroke();
        }
      }
      for (const [sEnd, curl] of [[bow > 0 ? 0.98 : 0.02, 1], [bow > 0 ? 0.02 : 0.98, -1]] as const) {
        void curl;
        frameLine([at(sEnd, 0, keel), at(sEnd, 0, zt(sEnd) + 1.5)], raw, 1.4);
      }
    } else {
      // Hull side, strakes and gunwale.
      const near = [...nearTop, ...nearWater.slice().reverse()];
      const y0 = Math.min(...nearTop.map((p) => p[1]));
      const y1 = Math.max(...nearWater.map((p) => p[1]));
      ctx.beginPath();
      tracePoly(ctx, near, true);
      ctx.fillStyle = linearGradient(ctx, 0, y0, 0, y1, [hullTone.light, hullTone.base, hullTone.shade]);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = rgba(INK, 0.38);
      for (const f of [0.38, 0.7]) {
        ctx.beginPath();
        tracePoly(ctx, ss.map((s) => at(s, -1, keel + (zt(s) - keel) * f, 0.58 + 0.42 * f)), false);
        ctx.stroke();
      }
      ctx.strokeStyle = trim;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      tracePoly(ctx, ss.map((s) => at(s, -1, zt(s) - 0.9, 1)), false);
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.beginPath();
      tracePoly(ctx, near, true);
      ctx.stroke();
      if (!o.upturned) {
        // Open interior seen from above.
        const inner = [...nearTop, ...farTop.slice().reverse()];
        ctx.beginPath();
        tracePoly(ctx, inner, true);
        ctx.fillStyle = linearGradient(ctx, 0, Math.min(...farTop.map((p) => p[1])), 0, Math.max(...nearTop.map((p) => p[1])), ['#5e4529', '#8a6a45']);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.9;
        ctx.stroke();
        ctx.beginPath();
        tracePoly(ctx, ss.map((s) => at(s, 1, zt(s) - 1.1, 0.98)), false);
        tracePoly(ctx, nearTop.slice().reverse(), false);
        ctx.strokeStyle = rgba(INK, 0);
        ctx.stroke();
        // Thwarts.
        ctx.strokeStyle = trim;
        ctx.lineWidth = 1.1;
        for (const s of [0.3, 0.5, 0.7]) {
          const a = at(s, -1, zt(s) - 0.5, 0.96);
          const b = at(s, 1, zt(s) - 0.5, 0.96);
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
        }
      } else {
        const keelLine = ss.map((s) => at(s, 0, zt(s) + 0.5, 0.4));
        shape(ctx, [...nearTop, ...keelLine.slice().reverse()], { fill: hullTone.highlight, stroke: INK, width: 0.8, closed: true });
      }
    }

    if (o.cargo && !o.upturned) {
      const spots: [number, number][] = [[0.38, -0.25], [0.5, 0.3], [0.6, -0.2], [0.44, 0.45]];
      for (const [s, side] of spots) {
        const p = at(s, side, zt(s) - 0.6, 0.7);
        if (o.cargo === 'barrels') {
          ctx.fillStyle = '#9a6f45';
          ctx.strokeStyle = INK;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.rect(p[0] - 1.3, p[1] - 3, 2.6, 3);
          ctx.fill();
          ctx.stroke();
          ellipse(ctx, p[0], p[1] - 3, 1.3, 0.6, { fill: '#c9a06a', stroke: INK, width: 0.5 });
        } else if (o.cargo === 'crates') {
          ctx.fillStyle = '#c9a06a';
          ctx.strokeStyle = INK;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.rect(p[0] - 1.5, p[1] - 3, 3, 3);
          ctx.fill();
          ctx.stroke();
        } else if (o.cargo === 'fish') {
          ellipse(ctx, p[0], p[1] - 0.8, 2.2, 1, { fill: seed.chance(0.5) ? '#c8d4d8' : '#e0a84a', stroke: INK, width: 0.5 });
        } else {
          ctx.strokeStyle = INK;
          ctx.fillStyle = '#8a6a45';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.ellipse(p[0], p[1] - 1.2, 2.6, 1.2, -0.4, 0, TAU);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
    if (o.oars && !o.upturned) {
      for (let k = 0; k < o.oars; k++) {
        const s = 0.22 + (0.56 * (k + 0.5)) / o.oars;
        const a = at(s, -1, zt(s) + 0.3, 1);
        const b = at(s, -1, 0, 2.5);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.9;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
        ctx.strokeStyle = '#d2b07c';
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }
    }
    if (o.shields) {
      o.shields.forEach((col, k) => {
        const s = 0.22 + (0.56 * (k + 0.5)) / o.shields!.length;
        const p = at(s, -1, zt(s) - 1.3, 0.97);
        ellipse(ctx, p[0], p[1], 1.5, 1.5, { fill: col, stroke: INK, width: 0.6 });
        ctx.fillStyle = rgba('#fff7e0', 0.8);
        ctx.fillRect(p[0] - 0.3, p[1] - 0.3, 0.6, 0.6);
      });
    }
    if (o.prow === 'dragon') {
      const sB = bow > 0 ? 1 : 0;
      const fwd = bow > 0 ? 1 : -1;
      const base = at(sB, 0, zt(sB) - 0.5);
      const pts: Vec2[] = [base];
      const dir: Vec2 = o.dir === 'u' ? [0.866 * fwd, -0.5 * fwd] : [-0.866 * fwd, -0.5 * fwd];
      for (const [f, z] of [[0.5, 3.2], [1.6, 5.4], [2.8, 6.2]] as const) pts.push([base[0] + dir[0] * f * 1.3, base[1] + dir[1] * f * 1.3 - z]);
      frameLine(pts, trim, 1.5);
      const hd = pts[pts.length - 1]!;
      ellipse(ctx, hd[0] + dir[0] * 0.8, hd[1] - 0.2, 1.7, 1.1, { fill: trim, stroke: INK, width: 0.7 });
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(hd[0] + dir[0] * 0.9, hd[1] - 0.6, 0.8, 0.8);
      const sS = 1 - sB;
      const sb = at(sS, 0, zt(sS) - 0.5);
      frameLine([sb, [sb[0] - dir[0] * 1.2, sb[1] - dir[1] * 1.2 - 3.2], [sb[0] - dir[0] * 2.2, sb[1] - dir[1] * 2.2 - 4.2]], trim, 1.3);
    }
    if (o.mast) {
      const m = o.mast;
      const s0 = 0.5 - 0.05 * bow;
      const zb = zt(s0) - 0.5;
      const topZ = zt(s0) + m.h;
      const mb = at(s0, 0, zb);
      const mt = at(s0, 0, topZ);
      const kind = m.kind ?? 'square';
      const sw = (W / 2) * (m.spread ?? 1.15);
      const P = (side: number, z: number): Vec2 => {
        const a = (s0 - 0.5) * L;
        return o.dir === 'u' ? iso(o.u + a, o.v + side * sw, z) : iso(o.u + side * sw, o.v + a, z);
      };
      const sailCol = m.sail ?? '#eee3c4';
      const sailTone = shades(sailCol);
      const lit = o.dir === 'u';
      if (kind === 'square') {
        const yTop = topZ - 1.2;
        const yBot = zt(s0) + m.h * 0.3;
        const pts: Vec2[] = [P(-1, yTop), P(1, yTop)];
        for (let k = 0; k <= 6; k++) {
          const side = 1 - k / 3;
          pts.push(P(side * 0.95, yBot - 1.6 * (1 - side * side) + (lit ? 0 : 0)));
        }
        const x0 = Math.min(...pts.map((p) => p[0]));
        const x1 = Math.max(...pts.map((p) => p[0]));
        shape(ctx, pts, { fill: linearGradient(ctx, x0, 0, x1, 0, lit ? [sailTone.highlight, sailTone.light, sailTone.base] : [sailTone.light, sailTone.base, sailTone.shade]), stroke: INK, width: 0.9, closed: true });
        if (m.stripe) {
          for (const sd of [-0.55, 0, 0.55]) {
            const q = [P(sd - 0.14, yTop), P(sd + 0.14, yTop), P(sd + 0.14, yBot - 1.4), P(sd - 0.14, yBot - 1.4)];
            shape(ctx, q, { fill: rgba(m.stripe, 0.85), closed: true });
          }
          shape(ctx, pts, { stroke: INK, width: 0.9, closed: true });
        }
        frameLine([P(-1.08, yTop), P(1.08, yTop)], '#8a6a45', 1.1);
      } else if (kind === 'lateen') {
        const T = at(bow > 0 ? 0.9 : 0.1, 0, zt(bow > 0 ? 0.9 : 0.1) + 2);
        const C = at(bow > 0 ? 0.08 : 0.92, 0, zt(bow > 0 ? 0.08 : 0.92) + 3.2);
        const pts: Vec2[] = [T, mt, C, [(T[0] + C[0]) / 2, (T[1] + C[1]) / 2 + 1.2]];
        shape(ctx, pts, { fill: linearGradient(ctx, Math.min(T[0], C[0]), 0, Math.max(T[0], C[0]), 0, [sailTone.highlight, sailTone.light, sailTone.base]), stroke: INK, width: 0.9, closed: true });
        if (m.stripe) shape(ctx, [mt, [(T[0] + mt[0]) / 2, (T[1] + mt[1]) / 2], [(C[0] + mt[0]) / 2, (C[1] + mt[1]) / 2]], { fill: rgba(m.stripe, 0.8), closed: true });
        frameLine([T, mt], '#8a6a45', 1.1);
      } else {
        const p = P(-1, topZ - 1.2);
        const q = P(1, topZ - 1.2);
        frameLine([p, q], '#8a6a45', 1.1);
        shape(ctx, [[p[0] * 0.9 + q[0] * 0.1, p[1] + 1.4], [p[0] * 0.1 + q[0] * 0.9, q[1] + 1.4]], { stroke: sailCol, width: 2.2, closed: false, cap: 'round' });
      }
      frameLine([mb, mt], '#8a6a45', 1.3);
      if (m.flag) drawFlag(ctx, mt[0], mt[1], 6, m.flag, INK, 1);
    }
    ctx.restore();
  });
}

export interface CraneOpts {
  u: number;
  v: number;
  h: number;
  /** Jib length towards -v (over the water). */
  jib?: number;
  wood?: string;
  load?: boolean;
}

/** A timber harbour crane: braced tower, a long jib over the water and a hanging crate. */
export function addCrane(st: Stage, o: CraneOpts): void {
  const { ctx, iso, scene } = st;
  const wood = o.wood ?? '#8a6a45';
  const jib = o.jib ?? 14;
  const a = 6;
  const cu = o.u + a / 2;
  const cv = o.v + a / 2;
  scene.shadow(shadowOf(boxFootprint(iso, o.u, o.v, a, a), o.h * 0.5, 0.5));
  scene.add(o.u + o.v + a + 0.5, () => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const segs: [Vec2, Vec2, number][] = [];
    const seg = (p: [number, number, number], q: [number, number, number], wi = 1.3): void => {
      segs.push([iso(p[0], p[1], p[2]), iso(q[0], q[1], q[2]), wi]);
    };
    const apex: [number, number, number] = [cu, cv, o.h];
    for (const [pu, pv] of [[o.u, o.v], [o.u + a, o.v], [o.u + a, o.v + a], [o.u, o.v + a]] as const) seg([pu, pv, 0], [cu + (pu - cu) * 0.25, cv + (pv - cv) * 0.25, o.h * 0.82], 1.6);
    for (const z of [0.3, 0.58]) {
      const k = 1 - z * 0.75;
      const c: [number, number][] = [[o.u, o.v], [o.u + a, o.v], [o.u + a, o.v + a], [o.u, o.v + a]].map(([pu, pv]) => [cu + (pu! - cu) * k, cv + (pv! - cv) * k]);
      for (let i = 0; i < 4; i++) seg([c[i]![0], c[i]![1], o.h * z], [c[(i + 1) % 4]![0], c[(i + 1) % 4]![1], o.h * z], 1);
    }
    seg([cu, cv, o.h * 0.82], apex, 1.8);
    const tip: [number, number, number] = [cu, cv - jib, o.h - 3.5];
    seg([cu, cv + 4, o.h + 1.5], tip, 1.7);
    seg([cu, cv + 4, o.h + 1.5], [cu, cv + 4, o.h * 0.82], 1.2);
    seg(tip, [cu, cv - 1, o.h + 6], 0.8);
    seg([cu, cv - 1, o.h + 6], [cu, cv + 3, o.h + 1.5], 0.8);
    for (const [col, extra] of [[INK, 1.2], [wood, 0]] as const) {
      for (const [p, q, wi] of segs) {
        ctx.strokeStyle = col;
        ctx.lineWidth = wi + extra;
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(q[0], q[1]);
        ctx.stroke();
      }
    }
    // Treadwheel on the lit side.
    inFace(ctx, leftFace(iso, o.u, o.v, a, o.h * 0.1), () => {
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.arc(a / 2, o.h * 0.3, o.h * 0.2, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = wood;
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const t = (k / 6) * TAU;
        ctx.moveTo(a / 2, o.h * 0.3);
        ctx.lineTo(a / 2 + Math.cos(t) * o.h * 0.2, o.h * 0.3 + Math.sin(t) * o.h * 0.2);
      }
      ctx.stroke();
    });
    if (o.load !== false) {
      const t = iso(tip[0], tip[1], tip[2]);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(t[0], t[1]);
      ctx.lineTo(t[0], t[1] + 7);
      ctx.stroke();
      ctx.fillStyle = '#c9a06a';
      ctx.beginPath();
      ctx.rect(t[0] - 2.6, t[1] + 7, 5.2, 4.6);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = rgba(INK, 0.5);
      ctx.beginPath();
      ctx.moveTo(t[0] - 2.6, t[1] + 9.3);
      ctx.lineTo(t[0] + 2.6, t[1] + 9.3);
      ctx.stroke();
    }
    ctx.restore();
  });
}
