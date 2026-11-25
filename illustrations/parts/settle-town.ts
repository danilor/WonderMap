import { bounds, pointInPoly } from '../kit/math';
import { mix, rgba } from '../kit/colors';
import type { Vec2 } from '../kit/types';
import { ROOF, WALL, drawHouse } from './building';
import { addBox, addRing, addTower } from './settle-castle';
import type { TowerTop } from './settle-castle';
import { INK, shadowOf } from './settle-geom';
import type { Stage } from './settle-geom';
import { addPath } from './settle-props';

/**
 * Town building blocks: houses laid out in districts, churches and minsters, town walls with towers and gates, fields.
 * Houses wrap `drawHouse` so that they share the dimetric grid with the castle pieces.
 */

export const ROOFS: readonly string[] = [ROOF.red, ROOF.red, ROOF.brown, ROOF.slate, ROOF.blue, ROOF.teal, ROOF.thatch];
export const WALLS: readonly string[] = [WALL.plaster, WALL.plaster, WALL.white, WALL.timber, WALL.stone];

export type Rect = readonly [number, number, number, number];

/** The same stage, lifted by `dz` so that things can stand on roofs or terraces. */
export function raised(st: Stage, dz: number): Stage {
  return { ...st, iso: (u, v, z = 0) => st.iso(u, v, z + dz) };
}

export interface HouseSpec {
  wallH?: number;
  roofH?: number;
  wall?: string;
  roof?: string;
  chimney?: boolean;
  hip?: boolean;
  ridge?: 'x' | 'y';
}

export function addHouse(st: Stage, u: number, v: number, a: number, b: number, o: HouseSpec = {}): void {
  const { ctx, iso, scene, rand } = st;
  const wallH = o.wallH ?? 7;
  const roofH = o.roofH ?? 7;
  const [x, y] = iso(u, v);
  const seed = rand.fork(rand.int(0, 1e9));
  const wall = o.wall ?? WALL.plaster;
  const roof = o.roof ?? ROOF.red;
  scene.shadow(shadowOf([iso(u, v), iso(u + a, v), iso(u + a, v + b), iso(u, v + b)], wallH + roofH * 0.55, 0.5));
  scene.add(u + v + (a + b) / 2, () => {
    drawHouse(ctx, { x, y, a, b, wallH, roofH, wall, roof, ink: INK, rand: seed, chimney: o.chimney, hip: o.hip, ridge: o.ridge, shadow: false });
  });
}

/** Moves every edge of a convex polygon inwards by `d`. */
export function insetPoly(poly: readonly Vec2[], d: number): Vec2[] {
  const n = poly.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % n]!;
    area += p[0] * q[1] - q[0] * p[1];
  }
  const sgn = area > 0 ? 1 : -1;
  const lines = poly.map((p, i) => {
    const q = poly[(i + 1) % n]!;
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    const dx = (q[0] - p[0]) / L;
    const dy = (q[1] - p[1]) / L;
    return { p: [p[0] - dy * d * sgn, p[1] + dx * d * sgn] as Vec2, d: [dx, dy] as Vec2 };
  });
  return lines.map((l, i): Vec2 => {
    const k = lines[(i + n - 1) % n]!;
    const den = k.d[0] * l.d[1] - k.d[1] * l.d[0];
    if (Math.abs(den) < 1e-6) return l.p;
    const t = ((l.p[0] - k.p[0]) * l.d[1] - (l.p[1] - k.p[1]) * l.d[0]) / den;
    return [k.p[0] + k.d[0] * t, k.p[1] + k.d[1] * t];
  });
}

export interface DistrictOpts {
  /** Area to fill (convex polygon in grid space). */
  poly: readonly Vec2[];
  /** Rectangles [u0, v0, u1, v1] that stay free (plazas, big buildings, streets). */
  avoid?: readonly Rect[];
  size?: readonly [number, number];
  /** Width of the lanes between rows. */
  lane?: number;
  gap?: number;
  /** Probability that a slot is built on. */
  fill?: number;
  /** Probability of a taller house. */
  tall?: number;
  roofs?: readonly string[];
  walls?: readonly string[];
  /** Overall house height factor. */
  height?: number;
  /** Rows run along u (default) or v. */
  hip?: number;
}

/** Houses in jittered rows. Returns the footprints [u0, v0, u1, v1] that were built. */
export function addDistrict(st: Stage, o: DistrictOpts): Rect[] {
  const { rand } = st;
  const [smin, smax] = o.size ?? [8, 12];
  const lane = o.lane ?? 2.6;
  const gap = o.gap ?? 1;
  const roofs = o.roofs ?? ROOFS;
  const walls = o.walls ?? WALLS;
  const avoid = o.avoid ?? [];
  const placed: Rect[] = [];
  const bb = bounds(o.poly as Vec2[]);
  const hit = (u: number, v: number, a: number, b: number): boolean => {
    if (avoid.some((r) => !(u + a + gap <= r[0] || u >= r[2] + gap || v + b + gap <= r[1] || v >= r[3] + gap))) return true;
    return !(pointInPoly(u, v, o.poly) && pointInPoly(u + a, v, o.poly) && pointInPoly(u, v + b, o.poly) && pointInPoly(u + a, v + b, o.poly));
  };
  let v = bb.minY + rand.range(0, 1.5);
  while (v + smin <= bb.maxY + 0.01) {
    let rowDepth = 0;
    let u = bb.minX + rand.range(0, 1.5);
    while (u + smin <= bb.maxX + 0.01) {
      const a0 = rand.range(smin, smax);
      const b0 = rand.range(smin, smax);
      let a = a0;
      let b = b0;
      let ok = false;
      for (const k of [1, 0.85, 0.7, 0]) {
        a = Math.max(smin, a0 * k);
        b = Math.max(smin, b0 * (k || 0.85));
        if (!hit(u, v, a, b)) {
          ok = true;
          break;
        }
      }
      if (!ok || !rand.chance(o.fill ?? 0.92)) {
        u += rand.range(2, 3.4);
        continue;
      }
      const tall = rand.chance(o.tall ?? 0.2);
      const k = o.height ?? 1;
      addHouse(st, u, v, a, b, {
        wallH: (tall ? rand.range(9.5, 12) : rand.range(6, 8.2)) * k,
        roofH: rand.range(6.2, 8.6) * k,
        wall: rand.pick(walls),
        roof: rand.pick(roofs),
        chimney: rand.chance(0.4),
        hip: a < smin * 1.15 && b < smin * 1.15 && rand.chance(o.hip ?? 0.35),
        ridge: rand.chance(0.5) ? 'x' : 'y',
      });
      placed.push([u, v, u + a, v + b]);
      rowDepth = Math.max(rowDepth, b);
      u += a + gap + rand.range(0, 1.2);
    }
    v += (rowDepth || smin * 0.8) + lane;
  }
  return placed;
}

export interface MinsterOpts {
  stone?: string;
  roof?: string;
  spire?: string;
  glow?: string;
  flag?: string;
  scale?: number;
}

/** A big church: nave, twin front towers and a crossing spire. Occupies about 37s x 22s. */
export function addMinster(st: Stage, u: number, v: number, o: MinsterOpts = {}): void {
  const s = o.scale ?? 1;
  const stone = o.stone ?? '#c8bda0';
  const roof = o.roof ?? ROOF.slate;
  const spire = o.spire ?? ROOF.blue;
  const glow = o.glow ?? '#ffd27a';
  const W = 22 * s;
  const N = 30 * s;
  const U0 = u + 7 * s;
  const nave = { u: U0, v: v + 4 * s, a: N, b: W - 8 * s, h: 14 * s };
  addBox(st, { ...nave, stone, roof: { kind: 'gable', color: roof, h: 11 * s, ridge: 'u', over: 1 }, windows: { glow, rows: 1, scale: 0.8 } });
  addBox(st, { u, v, a: 9 * s, b: 9 * s, h: 30 * s, stone, roof: { kind: 'pyramid', color: spire, h: 17 * s }, windows: { glow, rows: 2, scale: 0.7 }, bias: -2, flag: o.flag });
  addBox(st, { u, v: v + W - 9 * s, a: 9 * s, b: 9 * s, h: 27 * s, stone, roof: { kind: 'pyramid', color: spire, h: 15 * s }, windows: { glow, rows: 2, scale: 0.7 }, bias: -2 });
  addTower(raised(st, nave.h + 7 * s), { u: U0 + N * 0.52, v: v + W / 2, r: 3 * s, h: 3 * s, stone, top: 'spire', roof: spire, roofH: 21 * s, noShadow: true, bias: -3 });
}

export interface ChurchOpts {
  stone?: string;
  roof?: string;
  spire?: string;
  glow?: string;
}

/** A parish church with a single bell tower. Occupies about 24 x 10. */
export function addChurch(st: Stage, u: number, v: number, o: ChurchOpts = {}): void {
  const stone = o.stone ?? '#c8bda0';
  const glow = o.glow ?? '#ffd27a';
  addBox(st, { u: u + 5, v: v + 1, a: 19, b: 9, h: 9, stone, roof: { kind: 'gable', color: o.roof ?? ROOF.red, h: 7, ridge: 'u', over: 1 }, windows: { glow, rows: 1, scale: 0.8 } });
  addBox(st, { u, v, a: 8, b: 8, h: 19, stone, roof: { kind: 'pyramid', color: o.spire ?? ROOF.slate, h: 13 }, windows: { glow, rows: 2, scale: 0.7 }, bias: -2 });
}

export interface TownWallOpts {
  stone: string;
  h?: number;
  t?: number;
  crenels?: boolean;
  /**
   * Gate on an edge of the polygon. With `face` ('v' for edges at constant v, 'u' for edges at constant u; axis-aligned
   * edges only) a gatehouse is built; without it the gap is just flanked by two small towers.
   */
  gate?: { edge: number; face?: 'u' | 'v'; w?: number; at?: number; boxA?: number; boxH?: number; roof?: string; roofH?: number; flag?: string };
  tower?: {
    r: number;
    h: number;
    roofH?: number;
    roofs: readonly string[];
    top?: TowerTop;
    /** Extra towers along long edges, every `every` units. */
    mid?: { every: number; r: number; h: number; top?: TowerTop };
    flag?: string;
    slits?: number;
  };
  skip?: readonly number[];
}

/** Curtain wall with towers on the corners, an optional gatehouse and optional mid-wall towers. */
export function addTownWall(st: Stage, pts: readonly Vec2[], o: TownWallOpts): void {
  const n = pts.length;
  const gw = o.gate ? (o.gate.w ?? 9) : 0;
  const boxA = o.gate?.face ? (o.gate.boxA ?? gw + 8) : 0;
  addRing(st, pts, { stone: o.stone, h: o.h ?? 11, t: o.t ?? 4, crenels: o.crenels, skip: o.skip, gate: o.gate ? { edge: o.gate.edge, w: boxA ? gw + 4 : gw, at: o.gate.at } : undefined });
  const tw = o.tower;
  if (tw) {
    pts.forEach((p, i) => {
      addTower(st, { u: p[0], v: p[1], r: tw.r, h: tw.h, stone: o.stone, top: tw.top ?? 'cone', roof: tw.roofs[i % tw.roofs.length], roofH: tw.roofH ?? tw.r * 2.1, flag: i === 0 ? tw.flag : undefined, slits: tw.slits ?? 1 });
    });
    if (tw.mid) {
      const m = tw.mid;
      pts.forEach((p, i) => {
        const q = pts[(i + 1) % n]!;
        if (o.skip?.includes(i)) return;
        const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
        const k = Math.floor(L / m.every);
        for (let j = 1; j < k; j++) {
          const t = j / k;
          if (o.gate && o.gate.edge === i && Math.abs(t - (o.gate.at ?? 0.5)) * L < boxA * 0.5 + m.r + 1) continue;
          addTower(st, { u: p[0] + (q[0] - p[0]) * t, v: p[1] + (q[1] - p[1]) * t, r: m.r, h: m.h, stone: o.stone, top: m.top ?? 'crenel', roof: tw.roofs[(i + j) % tw.roofs.length], roofH: m.r * 2, slits: 1 });
        }
      });
    }
  }
  if (o.gate) {
    const g = o.gate;
    const p = pts[g.edge]!;
    const q = pts[(g.edge + 1) % n]!;
    const c = (g.at ?? 0.5);
    const cu = p[0] + (q[0] - p[0]) * c;
    const cv = p[1] + (q[1] - p[1]) * c;
    if (!g.face) {
      const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const d: Vec2 = [(q[0] - p[0]) / L, (q[1] - p[1]) / L];
      for (const s of [-1, 1]) {
        addTower(st, { u: cu + d[0] * s * gw * 0.5, v: cv + d[1] * s * gw * 0.5, r: 3.8, h: (o.h ?? 11) + 7, stone: o.stone, top: 'cone', roof: tw?.roofs[0], roofH: 8.5, slits: 1, flag: s > 0 ? g.flag : undefined });
      }
      return;
    }
    const depth = 10;
    const boxH = g.boxH ?? (o.h ?? 11) + 9;
    const roof = g.roof ? { kind: 'hip' as const, color: g.roof, h: g.roofH ?? 8 } : undefined;
    const common = { h: boxH, stone: o.stone, windows: false as const, slits: 1, roof, flag: g.flag, gate: { face: g.face, w: gw, h: Math.min(boxH * 0.62, 13) } };
    if (g.face === 'v') addBox(st, { ...common, u: cu - boxA / 2, v: cv - 3, a: boxA, b: depth });
    else addBox(st, { ...common, u: cu - 3, v: cv - boxA / 2, a: depth, b: boxA });
  }
}

/** A ploughed field: a patch of furrows painted on the ground. */
export function addField(st: Stage, u: number, v: number, a: number, b: number, color: string, along: 'u' | 'v' = 'u'): void {
  const { ctx, iso, scene } = st;
  scene.add(1e6, () => {
    const corners = [iso(u, v), iso(u + a, v), iso(u + a, v + b), iso(u, v + b)];
    ctx.save();
    ctx.beginPath();
    corners.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.fillStyle = rgba(color, 0.92);
    ctx.fill();
    ctx.clip();
    const step = 2.4;
    const furrow = rgba(mix(color, INK, 0.38), 0.55);
    const crest = rgba(mix(color, '#ffffff', 0.35), 0.5);
    const len = along === 'u' ? b : a;
    for (let s = step * 0.5; s < len; s += step) {
      const p0 = along === 'u' ? iso(u, v + s) : iso(u + s, v);
      const p1 = along === 'u' ? iso(u + a, v + s) : iso(u + s, v + b);
      ctx.strokeStyle = furrow;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(p1[0], p1[1]);
      ctx.stroke();
      ctx.strokeStyle = crest;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1] - 1);
      ctx.lineTo(p1[0], p1[1] - 1);
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    corners.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.strokeStyle = rgba(mix(color, INK, 0.55), 0.8);
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  });
}

/** A road from the gate: a path plus its soft outline. */
export function addRoad(st: Stage, pts: readonly Vec2[], width = 6): void {
  addPath(st, pts, width);
}
