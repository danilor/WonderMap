import { rgba } from '../kit/colors';
import { line, shades, shape } from '../kit/draw';
import { lerp } from '../kit/math';
import type { Vec2 } from '../kit/types';
import { FOAM, foamStrip, wake, waterShadow } from './sea-fx';
import type { FlagSpec, Hull, LateenSail, Pen, SquareSail } from './ship-parts';
import { WOOD, lateenSail, paintCrowsNest, paintFlag, paintMast, paintRope, squareSail } from './ship-parts';

/** Water under and around a hull: a soft shadow plus the wake trailing behind the stern. */
export function waterUnder(pen: Pen, hull: Hull, o: { wake?: number; alpha?: number } = {}): void {
  const { ctx, rand } = pen;
  const x0 = hull.spec.sternWl;
  const x1 = hull.spec.bowWl;
  waterShadow(ctx, (x0 + x1) / 2, 3.2, (x1 - x0) * 0.6, 6.5, 0.3);
  const len = o.wake ?? (x1 - x0) * 0.42;
  if (len > 6) wake(ctx, rand, x0 + 5, 0.4, len, { alpha: o.alpha ?? 0.6 });
}

/** Foam lapping at the waterline, with a heavier bow wave. Draw right after the hull. */
export function waterlineFoam(pen: Pen, hull: Hull, o: { bow?: number } = {}): void {
  const { ctx, rand } = pen;
  const x0 = hull.spec.sternWl - 1;
  const x1 = hull.spec.bowWl + 2;
  foamStrip(ctx, rand, x0, x1, 0.2, { depth: 3.2, alpha: 0.9, scallop: 4.6 });
  const b = o.bow ?? 1;
  if (b > 0) {
    foamStrip(ctx, rand, x1 - 10, x1 + 7 * b, 1.6, { depth: 3.6 * b, alpha: 0.85, scallop: 3.8 });
    ctx.save();
    ctx.fillStyle = rgbaFoam(0.9);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x1 + 4 + i * 2.6 * b, -1.4 - i * 1.1, 0.9 + (2 - i) * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function rgbaFoam(a: number): string {
  return rgba(FOAM, a);
}

export interface PortSpec {
  t0: number;
  t1: number;
  count: number;
  /** Vertical position between the sheer (0) and the waterline (1). */
  k?: number;
  size?: number;
  color?: string;
  lid?: string;
}

/** Gun ports / oar ports: a row of small dark openings along the hull. */
export function paintPorts(pen: Pen, hull: Hull, p: PortSpec): void {
  const { ctx, ink, u } = pen;
  const s = (p.size ?? 2.4) * u ** 0.5;
  for (let i = 0; i < p.count; i++) {
    const t = lerp(p.t0, p.t1, p.count === 1 ? 0.5 : i / (p.count - 1));
    const c = hull.at(t, p.k ?? 0.42);
    shape(ctx, [[c[0] - s, c[1] - s * 0.7], [c[0] + s, c[1] - s * 0.7], [c[0] + s, c[1] + s * 0.7], [c[0] - s, c[1] + s * 0.7]], { fill: p.color ?? '#1d1511', stroke: rgba(ink, 0.8), width: 0.6 * u });
    if (p.lid) shape(ctx, [[c[0] - s, c[1] - s * 0.7], [c[0] + s, c[1] - s * 0.7], [c[0] + s, c[1] - s * 0.1], [c[0] - s, c[1] - s * 0.1]], { fill: p.lid });
  }
}

export interface RigSail {
  y: number;
  w: number;
  h: number;
  foot?: number;
  belly?: number;
  roach?: number;
  seams?: number;
  cloth?: string;
  tatter?: number;
  mark?: SquareSail['mark'];
  stripes?: SquareSail['stripes'];
  tilt?: number;
}

export interface RigMast {
  x: number;
  /** Y of the masthead (negative = above the waterline). */
  top: number;
  /** Y where the mast is planted; defaults to the deck. */
  base?: number;
  w?: number;
  lean?: number;
  /** Crow's nest width (0 or undefined = none). */
  nest?: number;
  nestY?: number;
  flag?: { color: string; stripe?: string; kind?: FlagSpec['kind']; len?: number; h?: number; phase?: number; dy?: number };
  /** Square sails from the top down. */
  sails?: readonly RigSail[];
}

type LooseLateen = Omit<LateenSail, 'cloth'> & { cloth?: string };

export interface RigSpec {
  masts: readonly RigMast[];
  cloth: string;
  stripes?: SquareSail['stripes'];
  tatter?: number;
  mark?: SquareSail['mark'];
  yard?: string;
  mastWood?: string;
  lateens?: readonly LooseLateen[];
  jibs?: readonly LooseLateen[];
  bowsprit?: { from: Vec2; to: Vec2 };
  /** Forestay and backstay lines from the foremost / aftmost masthead. */
  stays?: { bow: Vec2; stern: Vec2 };
  shrouds?: boolean;
}

/** Masts, rigging, sails and flags for a ship; the hull must already be painted. */
export function paintRig(pen: Pen, hull: Hull, r: RigSpec): void {
  const { ctx, ink, u } = pen;
  const deckY = (x: number): number => {
    const t = (x - hull.spec.sternX) / (hull.spec.bowX - hull.spec.sternX);
    return hull.sheer(Math.max(0, Math.min(1, t)))[1];
  };
  const wood = r.mastWood ?? WOOD.dark;

  if (r.bowsprit) {
    const { from, to } = r.bowsprit;
    line(ctx, [from, to], ink, 3 * u);
    line(ctx, [from, to], shades(wood).base, 1.5);
    line(ctx, [[from[0] + 1, from[1] - 0.6], [to[0] - 1, to[1] - 0.4]], rgba(shades(wood).highlight, 0.7), 0.6);
  }

  if (r.stays) {
    const first = r.masts.reduce((a, b) => (b.x > a.x ? b : a));
    const last = r.masts.reduce((a, b) => (b.x < a.x ? b : a));
    paintRope(pen, [first.x, first.top + 3], r.stays.bow, { alpha: 0.6 });
    paintRope(pen, [last.x, last.top + 3], r.stays.stern, { alpha: 0.5 });
  }

  for (const m of r.masts) {
    const base = m.base ?? deckY(m.x) - 1.6;
    paintMast(pen, m.x, base, m.top, { w: m.w, wood, lean: m.lean });
    if (r.shrouds !== false) {
      const sy = deckY(m.x);
      const nestY = m.nestY ?? m.top + 7;
      for (const k of [-1, 1]) {
        paintRope(pen, [m.x, nestY], [m.x + k * 9, sy - 1], { alpha: 0.45 });
        paintRope(pen, [m.x, nestY + 4], [m.x + k * 7, sy - 1], { alpha: 0.3 });
      }
    }
  }

  for (const j of r.jibs ?? []) lateenSail(pen, { yard: null, cloth: r.cloth, ...j });
  for (const l of r.lateens ?? []) lateenSail(pen, { cloth: r.cloth, stripes: r.stripes, tatter: r.tatter, yard: r.yard ?? wood, ...l });

  // The aft sails overlap the ones in front of them.
  const order = [...r.masts].sort((a, b) => b.x - a.x);
  for (const m of order) {
    for (const s of m.sails ?? []) {
      squareSail(pen, {
        x: m.x,
        y: s.y,
        w: s.w,
        h: s.h,
        foot: s.foot,
        belly: s.belly,
        roach: s.roach,
        seams: s.seams,
        tilt: s.tilt,
        cloth: s.cloth ?? r.cloth,
        stripes: s.stripes ?? r.stripes,
        tatter: s.tatter ?? r.tatter,
        mark: s.mark ?? r.mark,
        yard: r.yard ?? wood,
      });
    }
  }

  for (const m of r.masts) {
    if (m.nest) paintCrowsNest(pen, m.x, m.nestY ?? m.top + 7, m.nest, wood);
    if (m.flag) {
      const f = m.flag;
      paintFlag(pen, { x: m.x + (m.lean ?? 0), y: m.top + (f.dy ?? 0), len: f.len ?? 14, h: f.h ?? 6, color: f.color, stripe: f.stripe, kind: f.kind ?? 'swallow', phase: f.phase });
    }
  }
}
