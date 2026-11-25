import { mix, rgba } from '../kit/colors';
import { clipped, dot, line, linearGradient, shades, shape } from '../kit/draw';
import { lerp } from '../kit/math';
import { catmullRom } from '../kit/shapes';
import type { Rng, Vec2 } from '../kit/types';
import { waterShadow } from './sea-fx';
import { carvedPost } from './ship-oared';
import type { CastleSpec, Hull, HullSpec, Pen } from './ship-parts';
import { WOOD, buildHull, paintCastle, paintRope } from './ship-parts';
import type { Rib, WreckHull } from './ship-wreck';
import { barrelDebris, brokenMast, danglingRope, embers, floatingCloth, gull, inFrame, paintWreckHull, plankDebris, rigid, shreds, smoke, splinterHole, submerge, surfaceFoam, waterSpan, weathered, wreckage } from './ship-wreck';

/** Wrecked ships: surviving pieces of a hull, tilted and sunk into the sea, with broken masts and flotsam around them. */

/** The hull proportions of the intact ships, so a wreck reads as a ruined version of them. */
export const HULLS = {
  galleon: { sternX: -54, bowX: 48, sternWl: -47, bowWl: 40, sternH: 24, waistH: 13, bowH: 16, sweepA: 1.8, sweepB: 3.2, lift: 3, deck: 5, stemBow: 2, stemStern: -1 },
  cog: { sternX: -37, bowX: 41, sternWl: -33, bowWl: 37, sternH: 17, waistH: 10, bowH: 13.5, sweepA: 3.2, sweepB: 3.6, lift: 2.2, deck: 4.2, stemBow: 1.6 },
  caravel: { sternX: -40, bowX: 44, sternWl: -35, bowWl: 38, sternH: 17, waistH: 9, bowH: 13, sweepA: 2.2, sweepB: 3.4, lift: 2.4, deck: 4, stemBow: 2 },
  longship: { sternX: -46, bowX: 46, sternWl: -35, bowWl: 35, sternH: 19, waistH: 7, bowH: 19, sweepA: 4.2, sweepB: 4.2, lift: 6, deck: 3.4, stemBow: -2.2, stemStern: -2.2 },
  fishing: { sternX: -25, bowX: 29, sternWl: -21, bowWl: 25, sternH: 10.5, waistH: 6.5, bowH: 12.5, sweepA: 2, sweepB: 2.6, lift: 2.2, deck: 4.2, stemBow: 1.4 },
  rowboat: { sternX: -18, bowX: 20, sternWl: -14, bowWl: 16, sternH: 6.2, waistH: 4.6, bowH: 8.2, sweepA: 1.8, sweepB: 2.4, lift: 1.6, depth: 1.2, deck: 5.6, stemBow: 1 },
} satisfies Record<string, HullSpec>;

/** A notch of missing planking: 0 outside `[a, b]`, `depth` across the middle, with steep shoulders. */
export const notch =
  (a: number, b: number, depth: number) =>
  (t: number): number =>
    t <= a || t >= b ? 0 : depth * Math.min(1, 2.4 * Math.sin(((t - a) / (b - a)) * Math.PI));

/** Broken ribs spread over a stretch of hull. */
export function ribRow(rand: Rng, t0: number, t1: number, n: number, top: readonly [number, number], lean = 1.6): Rib[] {
  const out: Rib[] = [];
  for (let i = 0; i < n; i++) {
    const t = lerp(t0, t1, n === 1 ? 0.5 : i / (n - 1)) + rand.range(-0.012, 0.012);
    out.push({ t, top: rand.range(top[0], top[1]), lean: rand.range(-lean, lean) });
  }
  return out;
}

export interface WreckMast {
  /** Position along the hull (0 = stern, 1 = bow). */
  t: number;
  /** Y of the snapped top, in the piece's own frame. */
  top: number;
  lean?: number;
  w?: number;
  wood?: string;
  /** A torn sail still hanging from its yard. */
  sail?: { y: number; w: number; h: number; cloth: string; tilt?: number; strips?: number };
}

export interface Piece {
  hull: Hull;
  paint: Omit<WreckHull, 'inside' | 'from' | 'to'>;
  from?: number;
  to?: number;
  /** Shift and tilt of the piece (positive angles lower the bow), about `(pivot, 0)`. `dy` sinks it. */
  dx?: number;
  dy?: number;
  angle?: number;
  pivot?: number;
  castles?: readonly CastleSpec[];
  masts?: readonly WreckMast[];
  /** Painted behind the hull, in the piece's own frame (carved posts that the planking overlaps). */
  back?: (pen: Pen, hull: Hull) => void;
  /** Extra things in the piece's own frame, painted last (a bowsprit, rope, a gull). */
  rig?: (pen: Pen, hull: Hull) => void;
}

export interface PieceSpan {
  /** Where the piece crosses the water surface. */
  water: [number, number] | null;
  /** Horizontal extent of the piece. */
  x0: number;
  x1: number;
}

/** Paints one surviving piece of a ship, tilted into the sea. The water line is the frame's y = 0. */
export function paintPiece(pen: Pen, pc: Piece): PieceSpan {
  const { hull } = pc;
  const dx = pc.dx ?? 0;
  const dy = pc.dy ?? 0;
  const angle = pc.angle ?? 0;
  const pivot = pc.pivot ?? 0;
  const masts = pc.masts ?? [];
  let wall: Vec2[] = [];
  inFrame(pen.ctx, dx, dy, angle, pivot, () => {
    pc.back?.(pen, hull);
    wall = paintWreckHull(pen, hull, {
      ...pc.paint,
      from: pc.from,
      to: pc.to,
      inside: () => {
        for (const m of masts) {
          const b = hull.at(m.t, 0.72);
          brokenMast(pen, b[0], b[1], m.top, { w: m.w, lean: m.lean, wood: m.wood });
        }
      },
    });
    for (const c of pc.castles ?? []) paintCastle(pen, hull, c);
    for (const m of masts) {
      if (!m.sail) continue;
      const b = hull.at(m.t, 0.72);
      const k = (b[1] - m.sail.y) / (b[1] - m.top);
      const cx = b[0] + (m.lean ?? 0) * k * 0.9;
      shreds(pen, { x: cx - m.sail.w / 2, y: m.sail.y, w: m.sail.w, h: m.sail.h, cloth: m.sail.cloth, tilt: m.sail.tilt, strips: m.sail.strips });
    }
    pc.rig?.(pen, hull);
  });
  const tf = rigid(dx, dy, angle, pivot);
  const xs = wall.map((q) => tf(q)[0]);
  return { water: waterSpan(wall, tf), x0: Math.min(...xs), x1: Math.max(...xs) };
}

/** Sinks everything painted so far below the surface and rings the wreck with foam. */
export function settle(pen: Pen, pieces: readonly PieceSpan[]): void {
  submerge(pen.ctx, Math.min(...pieces.map((p) => p.x0)) - 3, Math.max(...pieces.map((p) => p.x1)) + 3);
  for (const p of pieces) if (p.water) surfaceFoam(pen, p.water[0], p.water[1]);
}

export type Drift = ReadonlyArray<readonly ['plank' | 'barrel' | 'junk', number, number]>;

/** Things floating on the sea around a wreck. */
export function drift(pen: Pen, items: Drift): void {
  const { rand } = pen;
  for (const [kind, x, y] of items) {
    if (kind === 'plank') plankDebris(pen, x, y, rand.range(9, 15), rand.range(-0.5, 0.5), rand.chance(0.5) ? WOOD.pale : WOOD.oak);
    else if (kind === 'barrel') barrelDebris(pen, x, y);
    else wreckage(pen, x, y, rand.range(0.9, 1.2));
  }
}

/* ------------------------------------------------------------------------------------ */
/* Ship wrecks                                                                          */
/* ------------------------------------------------------------------------------------ */

export interface ShipWreckLook {
  pose: 'listing' | 'split' | 'bow' | 'burned' | 'capsized';
  hull: string;
  trim: string;
  cloth: string;
}

export function palette(look: { hull: string; trim: string; cloth: string }) {
  const wood = weathered(look.hull, 0.22);
  return { wood, trim: weathered(look.trim, 0.25), castle: mix(wood, '#f0d9a2', 0.1), cloth: mix(look.cloth, '#8b8576', 0.3) };
}

/** Listing to the bow, a breach torn in the side with ribs standing out of it, one mast snapped and its sail in rags. */
function listing(pen: Pen, look: ShipWreckLook): void {
  const { ctx, rand } = pen;
  const c = palette(look);
  waterShadow(ctx, 0, 5, 70, 8, 0.34);
  const hull = buildHull(HULLS.galleon);
  const p = paintPiece(pen, {
    hull,
    dy: 7,
    angle: 0.09,
    paint: { wood: c.wood, planks: 5, bands: [{ from: 0.06, to: 0.2, color: c.trim }], gap: notch(0.36, 0.9, 0.95), ribs: ribRow(rand, 0.42, 0.86, 6, [-0.12, 0.3]), holes: 2 },
    castles: [
      { t0: 0, t1: 0.37, rise: 13, wood: c.castle, windows: 3, trim: c.trim },
      { t0: 0, t1: 0.2, rise: 23, wood: c.castle, windows: 2, trim: c.trim },
    ],
    masts: [
      { t: 0.45, top: -60, lean: -10, w: 3.4, sail: { y: -50, w: 34, h: 27, cloth: c.cloth, tilt: -4 } },
      { t: 0.78, top: -28, lean: 3, w: 3 },
    ],
    rig: (pn, h) => {
      const s = h.sheer(0.1);
      splinterHole(pn, s[0], s[1] - 12, 3);
      paintRope(pn, [-18, -58], [-34, -24], { alpha: 0.5, sag: 3 });
      paintRope(pn, [-18, -58], [-1, -11], { alpha: 0.5, sag: 2 });
      danglingRope(pn, [30, -27], 12, -1);
      gull(pn, s[0] + 3, s[1] - 25.5, 1);
    },
  });
  settle(pen, [p]);
  drift(pen, [['plank', 64, 11], ['barrel', 58, 16], ['junk', -62, 11], ['plank', -50, 15]]);
}

/** Broken in two: the stern stands high out of the water, the bow section slumps the other way. */
function split(pen: Pen, look: ShipWreckLook): void {
  const { ctx, ink, rand } = pen;
  const c = palette(look);
  waterShadow(ctx, 0, 5, 74, 8, 0.34);
  const hull = buildHull(HULLS.galleon);
  const aft = paintPiece(pen, {
    hull,
    to: 0.5,
    dx: -7,
    dy: 6,
    angle: 0.2,
    pivot: -30,
    paint: { wood: c.wood, planks: 5, bands: [{ from: 0.06, to: 0.2, color: c.trim }], gap: notch(0.24, 0.52, 0.9), ribs: ribRow(rand, 0.32, 0.5, 3, [-0.1, 0.3]), holes: 1 },
    castles: [
      { t0: 0, t1: 0.37, rise: 13, wood: c.castle, windows: 3, trim: c.trim },
      { t0: 0, t1: 0.2, rise: 23, wood: c.castle, windows: 2, trim: c.trim },
    ],
    masts: [{ t: 0.4, top: -36, lean: -3, w: 3.2 }],
    rig: (pn, h) => {
      const s = h.sheer(0.1);
      gull(pn, s[0] + 3, s[1] - 25.5, 1);
    },
  });
  const fore = paintPiece(pen, {
    hull,
    from: 0.6,
    dx: 9,
    dy: 11,
    angle: -0.26,
    pivot: 28,
    paint: { wood: c.wood, planks: 5, bands: [{ from: 0.06, to: 0.2, color: c.trim }], gap: notch(0.58, 0.84, 0.8), ribs: ribRow(rand, 0.64, 0.8, 3, [-0.05, 0.3]), holes: 1 },
    castles: [{ t0: 0.82, t1: 1, rise: 8, wood: c.castle, windows: 1, trim: c.trim }],
    masts: [{ t: 0.78, top: -34, lean: 4, w: 3, sail: { y: -27, w: 24, h: 18, cloth: c.cloth, tilt: 3, strips: 4 } }],
    rig: (pn) => {
      const x0 = 40;
      const y0 = -14;
      line(ctx, [[x0, y0], [x0 + 20, y0 - 9]], ink, 3 * pn.u);
      line(ctx, [[x0, y0], [x0 + 20, y0 - 9]], WOOD.dark, 1.5);
      danglingRope(pn, [x0 + 20, y0 - 9], 12, 1);
    },
  });
  settle(pen, [aft, fore]);
  drift(pen, [['plank', 4, 12], ['plank', 14, 16], ['barrel', -2, 7], ['junk', 60, 19], ['plank', -66, 14]]);
}

/** Only the bow still points at the sky. */
function bowUp(pen: Pen, look: ShipWreckLook): void {
  const { ctx, ink, rand } = pen;
  const c = palette(look);
  waterShadow(ctx, 8, 6, 50, 8, 0.34);
  const hull = buildHull(HULLS.galleon);
  const p = paintPiece(pen, {
    hull,
    from: 0.3,
    dx: -4,
    dy: 8,
    angle: -0.5,
    pivot: 6,
    paint: { wood: c.wood, planks: 5, bands: [{ from: 0.06, to: 0.2, color: c.trim }], gap: notch(0.38, 0.8, 0.7), ribs: ribRow(rand, 0.45, 0.74, 4, [-0.05, 0.3]), holes: 1 },
    castles: [{ t0: 0.82, t1: 1, rise: 8, wood: c.castle, windows: 1, trim: c.trim }],
    masts: [{ t: 0.78, top: -34, lean: 4, w: 3.2 }],
    rig: (pn) => {
      const x0 = 40;
      const y0 = -14;
      line(ctx, [[x0, y0], [x0 + 30, y0 - 13]], ink, 3 * pn.u);
      line(ctx, [[x0, y0], [x0 + 30, y0 - 13]], WOOD.dark, 1.5);
      paintRope(pn, [26, -34], [x0 + 30, y0 - 13], { alpha: 0.55, sag: 2 });
      danglingRope(pn, [x0 + 30, y0 - 13], 11, -1);
    },
  });
  settle(pen, [p]);
  drift(pen, [['plank', -36, 12], ['junk', -22, 17], ['barrel', 44, 17], ['plank', 56, 12]]);
}

/** Gutted by fire: black timber, glowing embers, a few ribs, smoke. */
function burned(pen: Pen, look: ShipWreckLook): void {
  const { ctx, rand } = pen;
  const c = palette(look);
  waterShadow(ctx, 0, 5, 70, 8, 0.34);
  const hull = buildHull(HULLS.galleon);
  const char = mix(c.wood, '#1c1613', 0.6);
  const p = paintPiece(pen, {
    hull,
    dy: 6,
    angle: -0.07,
    paint: { wood: mix(c.wood, '#9a6a3c', 0.3), planks: 5, char: 0.75, gap: notch(0.22, 0.92, 0.9), ribs: ribRow(rand, 0.28, 0.88, 8, [-0.12, 0.4]), holes: 3, moss: 0.15 },
    castles: [{ t0: 0, t1: 0.3, rise: 11, wood: char, windows: 0 }],
    masts: [
      { t: 0.45, top: -34, lean: 2, w: 3.4, wood: '#2b211b' },
      { t: 0.75, top: -22, lean: -2, w: 3, wood: '#2b211b' },
    ],
    rig: (pn, h) => {
      const a = h.at(0.45, 0.04);
      const b = h.at(0.7, 0.1);
      embers(pn, [[-9, -35], [-12, -36.5], [a[0] + 6, a[1] + 1], [b[0], b[1] - 1], [22, -23], h.sheer(0.9)]);
      smoke(pn, -9, -39, 28);
      smoke(pn, 22, -26, 20);
    },
  });
  settle(pen, [p]);
  drift(pen, [['plank', 62, 12], ['plank', -64, 14], ['junk', 52, 19]]);
}

/** Floating keel-up: a dome of strakes with the keel along its crest, a hole punched in the side, and the stem and sternpost poking out. */
function capsized(pen: Pen, look: ShipWreckLook): void {
  const { ctx, ink, u, rand } = pen;
  const c = palette(look);
  const tones = shades(c.wood);
  waterShadow(ctx, 0, 5, 64, 8, 0.34);

  const crest = catmullRom([[-45, -4], [-39, -13], [-25, -21], [-6, -24], [12, -21], [28, -15], [40, -9], [48, -6]], 6);
  const waterEdge = catmullRom([[-45, -2], [-37, 2], [-22, 5], [-6, 6], [12, 6], [28, 4], [40, 0], [48, -4]], 6);
  const hullPoly: Vec2[] = [...crest, ...waterEdge.slice().reverse()];
  const strake = (k: number): Vec2[] => crest.map((q, i): Vec2 => [lerp(q[0], waterEdge[i]![0], k), lerp(q[1], waterEdge[i]![1], k)]);

  // Stem and sternpost poke out behind the hull; the rudder hangs off the stern.
  carvedPost(pen, [[42, -7], [50, -10], [54, -18]], 3.4, 2.2, c.wood);
  shape(ctx, [[-47, -6], [-44, -9], [-42, -23], [-47, -24]], { fill: linearGradient(ctx, -47, 0, -42, 0, [tones.light, tones.shade]), stroke: ink, width: 1 * u });

  shape(ctx, hullPoly, { fill: ink, stroke: ink, width: 2.6 * u });
  shape(ctx, hullPoly, { fill: linearGradient(ctx, -30, -26, 34, 8, [tones.light, tones.base, tones.shade]) });
  clipped(ctx, hullPoly, () => {
    for (const k of [0.2, 0.4, 0.6, 0.8]) shape(ctx, strake(k).map((q): Vec2 => [q[0], q[1] + rand.range(-0.3, 0.3)]), { stroke: rgba(tones.deep, 0.6), width: 0.8 * u, closed: false });
    for (let j = 0; j < 14; j++) {
      const i = rand.int(2, crest.length - 3);
      const k = rand.range(0.1, 0.9);
      const a = strake(k)[i]!;
      const b = strake(Math.min(1, k + 0.2))[i]!;
      line(ctx, [a, b], rgba(tones.deep, 0.45), 0.6 * u);
    }
    shape(ctx, hullPoly, { fill: linearGradient(ctx, 0, -22, 0, 6, [rgba(tones.highlight, 0.16), rgba(tones.deep, 0), rgba('#3f7a64', 0.5)]) });
    shape(ctx, hullPoly, { fill: linearGradient(ctx, -45, 0, 48, 0, [rgba(tones.highlight, 0.14), rgba(tones.deep, 0), rgba(tones.deep, 0.3)]) });
    for (let j = 0; j < 20; j++) {
      const i = rand.int(1, crest.length - 2);
      const k = rand.range(0.5, 0.97);
      const q = strake(k)[i]!;
      dot(ctx, q[0], q[1], rand.range(0.4, 0.9), rgba('#ece7d6', 0.75));
    }
  }, false);
  // The keel: a pale ridge along the crest.
  shape(ctx, crest, { stroke: ink, width: 2.6 * u, closed: false });
  shape(ctx, crest.map((q): Vec2 => [q[0] - 0.2, q[1] + 0.9]), { stroke: tones.highlight, width: 1.1, closed: false });
  // A hole where the planking gave way, with the ribs behind it.
  const hx = 14;
  const hy = -6;
  splinterHole(pen, hx, hy, 5);
  for (const dx of [-2.6, 0.8, 4]) line(ctx, [[hx + dx, hy - 3.4], [hx + dx + 0.4, hy + 3.2]], rgba(mix(c.wood, '#e8cf9d', 0.3), 0.95), 1.3);

  floatingCloth(pen, -58, 9, 24, c.cloth);
  settle(pen, [{ water: [-47, 49], x0: -48, x1: 56 }]);
  gull(pen, -22, -23.5, 0.95);
  drift(pen, [['plank', 60, 12], ['barrel', 52, 17], ['plank', -36, 17]]);
}

export function drawShipWreck(pen: Pen, look: ShipWreckLook): void {
  switch (look.pose) {
    case 'listing':
      return listing(pen, look);
    case 'split':
      return split(pen, look);
    case 'bow':
      return bowUp(pen, look);
    case 'burned':
      return burned(pen, look);
    case 'capsized':
      return capsized(pen, look);
  }
}
