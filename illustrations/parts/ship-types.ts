import { mix, rgba } from '../kit/colors';
import { dot, line, shades, shape } from '../kit/draw';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { SEA_INK } from './sea-fx';
import type { Hull, Pen, SquareSail } from './ship-parts';
import { CLOTH, WOOD, buildHull, paintCastle, paintCross, paintFlag, paintHull, paintSailor, paintSkull } from './ship-parts';
import type { RigMast, RigSpec } from './ship-rig';
import { paintPorts, paintRig, waterUnder, waterlineFoam } from './ship-rig';

/** A pen for a ship drawn at `scale` (ink widths are compensated so small ships keep a readable outline). */
export function makePen(ctx: Ctx2D, rand: Rng, scale = 1, ink: string = SEA_INK): Pen {
  return { ctx, rand, ink, u: 1 / Math.sqrt(scale) };
}

type Mark = NonNullable<SquareSail['mark']>;

const crossMark = (color: string): Mark => (pen, cx, cy, w) => paintCross(pen, cx, cy, w * 0.62, color);
export const skullMark: Mark = (pen, cx, cy, w) => paintSkull(pen, cx, cy - w * 0.04, w * 0.2);

/** A pole with a flag near the stern. */
function sternStaff(pen: Pen, x: number, y: number, h: number, color: string, stripe?: string): void {
  const { ctx, ink, u } = pen;
  line(ctx, [[x, y], [x, y - h]], ink, 2 * u);
  line(ctx, [[x, y], [x, y - h]], WOOD.pale, 0.9);
  paintFlag(pen, { x, y: y - h, len: 12, h: 7, color, stripe, kind: 'square', phase: 1 });
}

/** A small glowing lantern. */
function lantern(pen: Pen, x: number, y: number): void {
  const { ctx, ink, u } = pen;
  line(ctx, [[x, y - 3.4], [x, y - 1]], ink, 0.8 * u);
  dot(ctx, x, y, 2.3 * u ** 0.5, ink);
  dot(ctx, x, y, 1.5 * u ** 0.5, '#f6d065');
}

/* ------------------------------------------------------------------------------------ */
/* Cog                                                                                  */
/* ------------------------------------------------------------------------------------ */

export interface CogLook {
  hull: string;
  band?: string;
  cloth: string;
  stripes?: SquareSail['stripes'];
  cross?: string;
  flag: string;
  flagStripe?: string;
  /** Stretches the hull. */
  len?: number;
  sternH?: number;
  castle?: number;
  merlons?: number;
  mast?: number;
  sailor?: boolean;
}

/** A broad, tubby medieval trader: one big square sail, a crenellated stern castle and a small fore castle. */
export function drawCog(pen: Pen, look: CogLook): Hull {
  const L = look.len ?? 1;
  const hull = buildHull({
    sternX: -37 * L,
    bowX: 41 * L,
    sternWl: -33 * L,
    bowWl: 37 * L,
    sternH: look.sternH ?? 17,
    waistH: 10,
    bowH: 13.5,
    sweepA: 3.2,
    sweepB: 3.6,
    lift: 2.2,
    deck: 4.2,
    stemBow: 1.6,
  });
  const castleWood = mix(look.hull, '#f3dca8', 0.12);
  waterUnder(pen, hull);
  paintHull(pen, hull, { wood: look.hull, planks: 4, clinker: true, bands: look.band ? [{ from: 0.28, to: 0.5, color: look.band }] : undefined });
  waterlineFoam(pen, hull);
  const aft = paintCastle(pen, hull, { t0: 0, t1: 0.3, rise: look.castle ?? 11, wood: castleWood, merlons: look.merlons ?? 4, windows: 1 });
  paintCastle(pen, hull, { t0: 0.85, t1: 1, rise: 6.5, wood: castleWood, merlons: 2 });
  if (look.sailor) paintSailor(pen, aft.left[0] + 9, aft.left[1] + 1.5, 7.5, { shirt: look.flag, arm: 2 });

  const mast = look.mast ?? 1;
  const top = -72 * mast;
  const yard = top + 12;
  const rig: RigSpec = {
    cloth: look.cloth,
    stripes: look.stripes,
    mark: look.cross ? crossMark(look.cross) : undefined,
    masts: [{ x: -2, top, nest: 9, nestY: top + 6, flag: { color: look.flag, stripe: look.flagStripe, len: 17, h: 7 }, sails: [{ y: yard, w: 40, h: 40 * mast, belly: 6 }] }],
    stays: { bow: [hull.spec.bowX - 2, -17], stern: [aft.left[0] + 2, aft.left[1]] },
  };
  paintRig(pen, hull, rig);
  sternStaff(pen, aft.left[0] + 2.5, aft.left[1] + 1, 11, look.flag, look.flagStripe);
  return hull;
}

/* ------------------------------------------------------------------------------------ */
/* Galleon and pirate ship                                                              */
/* ------------------------------------------------------------------------------------ */

export interface GreatShipLook {
  hull: string;
  band: string;
  bandColor2?: string;
  trim: string;
  cloth: string;
  stripes?: SquareSail['stripes'];
  tatter?: number;
  mark?: Mark;
  /** Number of masts: 2 (brig) or 3. */
  masts: 2 | 3;
  /** Tall castles with gilded windows or a low raider's deck. */
  castle: 'tall' | 'low';
  ports: number;
  flag: string;
  flagStripe?: string;
  skullFlag?: boolean;
  portColor?: string;
  lateenMizzen?: boolean;
  /** Overall stretch. */
  len?: number;
}

/** A three-masted sailing ship with stacked square sails, jibs on a bowsprit and a castle astern. */
export function drawGreatShip(pen: Pen, look: GreatShipLook): Hull {
  const { ctx, ink, u } = pen;
  const tall = look.castle === 'tall';
  const L = look.len ?? 1;
  const hull = buildHull({
    sternX: -54 * L,
    bowX: 48 * L,
    sternWl: -47 * L,
    bowWl: 40 * L,
    sternH: tall ? 25 : 19,
    waistH: 13,
    bowH: tall ? 17 : 15,
    sweepA: tall ? 1.7 : 2.4,
    sweepB: 3.2,
    lift: 3,
    deck: 5,
    stemBow: 2,
    stemStern: -1,
  });
  const body = look.hull;
  const castleWood = mix(body, '#f0d9a2', tall ? 0.1 : 0);

  // Beak under the bowsprit.
  waterUnder(pen, hull, { wake: 36 });
  const bow = hull.top[hull.top.length - 1]!;
  shape(ctx, [[bow[0] - 2, bow[1] + 1], [bow[0] + 13 * L, bow[1] + 6], [bow[0] + 12 * L, bow[1] + 8], [bow[0] - 3, bow[1] + 9]], { fill: shades(body).shade, stroke: ink, width: 1.1 * u });

  paintHull(pen, hull, { wood: body, planks: 4, bands: [{ from: 0.06, to: 0.2, color: look.trim }, ...(look.bandColor2 ? [{ from: 0.62, to: 0.78, color: look.bandColor2 }] : [])] });
  paintPorts(pen, hull, { t0: 0.3, t1: 0.86, count: 6, k: 0.5, size: 2.2, color: look.portColor ?? '#1c130e', lid: rgba(shades(body).light, 0.9) });
  waterlineFoam(pen, hull, { bow: 1.2 });

  let sternTop: Vec2;
  if (tall) {
    paintCastle(pen, hull, { t0: 0, t1: 0.37, rise: 14, wood: castleWood, windows: 4, trim: look.trim });
    const tower = paintCastle(pen, hull, { t0: 0, t1: 0.2, rise: 24, wood: castleWood, windows: 2, trim: look.trim });
    sternTop = tower.left;
    lantern(pen, tower.left[0] + 3, tower.left[1] - 3);
    paintCastle(pen, hull, { t0: 0.82, t1: 1, rise: 8, wood: castleWood, merlons: 0, windows: 1, trim: look.trim });
  } else {
    const aft = paintCastle(pen, hull, { t0: 0, t1: 0.3, rise: 9, wood: castleWood, windows: 3, trim: look.trim });
    sternTop = aft.left;
    paintCastle(pen, hull, { t0: 0.86, t1: 1, rise: 5, wood: castleWood });
  }

  const sail = look.cloth;
  const roof = sternTop[1];
  const three = look.masts === 3;
  const foreX = 25 * L;
  const mainX = three ? -8 * L : -4 * L;
  const mizzenX = -34 * L;
  const masts: RigMast[] = [
    {
      x: foreX,
      top: -86,
      nest: 7,
      nestY: -80,
      flag: { color: look.flag, kind: 'swallow', len: 12, h: 5 },
      sails: [
        { y: -76, w: 24, h: 19, belly: 4 },
        { y: -53, w: 34, h: 30, belly: 6 },
      ],
    },
    {
      x: mainX,
      top: -106,
      nest: 8,
      nestY: -100,
      flag: look.skullFlag ? undefined : { color: look.flag, stripe: look.flagStripe, kind: 'swallow', len: 20, h: 8 },
      sails: [
        { y: -97, w: 27, h: 22, belly: 4 },
        { y: -71, w: 42, h: 39, belly: 7, mark: look.mark },
      ],
    },
  ];
  const rig: RigSpec = {
    masts,
    cloth: sail,
    stripes: look.stripes,
    tatter: look.tatter,
    bowsprit: { from: [hull.spec.bowX - 8, -14], to: [68 * L, -26] },
    stays: { bow: [66 * L, -25], stern: [roof < -40 ? sternTop[0] + 6 : sternTop[0], roof] },
    jibs: [
      { tack: [65 * L, -26], peak: [foreX + 6, -82], clew: [foreX + 12, -34], hollow: 0.08, creases: 2 },
      { tack: [57 * L, -22], peak: [foreX + 5, -64], clew: [foreX + 14, -30], hollow: 0.07, creases: 2, cloth: mix(sail, '#ffffff', 0.12) },
    ],
  };
  if (three) {
    if (look.lateenMizzen === false) {
      masts.push({ x: mizzenX, top: -86, base: roof, nest: 0, flag: { color: look.flag, kind: 'pennant', len: 12, h: 5 }, sails: [{ y: -80, w: 24, h: 18, belly: 4 }, { y: -58, w: 30, h: 22, belly: 5 }] });
    } else {
      masts.push({ x: mizzenX, top: -74, base: roof + 1, flag: { color: look.flag, kind: 'pennant', len: 12, h: 5 } });
      rig.lateens = [{ tack: [mizzenX + 15, roof - 7], peak: [mizzenX - 21, roof - 43], clew: [mizzenX - 21, roof - 9], hollow: 0.07, creases: 4 }];
    }
  }
  paintRig(pen, hull, rig);

  if (look.skullFlag) {
    const mx = mainX;
    const fy = -106;
    const w = 17;
    const h = 12;
    shape(ctx, [[mx, fy], [mx + w, fy + 1.2], [mx + w - 1, fy + h * 0.55], [mx + w + 0.4, fy + h], [mx, fy + h - 0.4]], { fill: '#1d1b22', stroke: ink, width: 0.9 * u });
    paintSkull(pen, mx + w * 0.5, fy + h * 0.38, 2.5 * u ** 0.2);
  }
  sternStaff(pen, sternTop[0] + 3, sternTop[1] + 1, 14, look.flag, look.flagStripe);
  return hull;
}

/* ------------------------------------------------------------------------------------ */
/* Caravel                                                                              */
/* ------------------------------------------------------------------------------------ */

export interface CaravelLook {
  hull: string;
  band?: string;
  cloth: string;
  stripes?: SquareSail['stripes'];
  /** Cross painted on the main sail. */
  cross?: string;
  flag: string;
  flagStripe?: string;
  /** `latina`: two big triangular sails. `redonda`: square fore and main sails and a triangular mizzen. */
  rig: 'latina' | 'redonda';
  len?: number;
}

/** A slim explorer with triangular (lateen) sails, or the square-rigged variant. */
export function drawCaravel(pen: Pen, look: CaravelLook): Hull {
  const L = look.len ?? 1;
  const hull = buildHull({
    sternX: -40 * L,
    bowX: 44 * L,
    sternWl: -35 * L,
    bowWl: 38 * L,
    sternH: 17,
    waistH: 9,
    bowH: 13,
    sweepA: 2.2,
    sweepB: 3.4,
    lift: 2.4,
    deck: 4,
    stemBow: 2,
  });
  const castleWood = mix(look.hull, '#f3dca8', 0.1);
  waterUnder(pen, hull, { wake: 24 });
  paintHull(pen, hull, { wood: look.hull, planks: 4, bands: look.band ? [{ from: 0.1, to: 0.27, color: look.band }] : undefined });
  waterlineFoam(pen, hull);
  const aft = paintCastle(pen, hull, { t0: 0, t1: 0.3, rise: 8, wood: castleWood, windows: 2 });
  paintCastle(pen, hull, { t0: 0.86, t1: 1, rise: 4.5, wood: castleWood });
  lantern(pen, aft.left[0] + 2.5, aft.left[1] - 2);

  const bow = hull.spec.bowX;
  const roof = aft.left[1];
  if (look.rig === 'latina') {
    const rig: RigSpec = {
      cloth: look.cloth,
      stripes: look.stripes,
      masts: [
        { x: 26 * L, top: -56, base: -16 },
        { x: -4 * L, top: -62 },
      ],
      lateens: [
        { tack: [47 * L, -19], peak: [12 * L, -66], clew: [12 * L, -28], hollow: 0.07, creases: 3 },
        { tack: [28 * L, -24], peak: [-33 * L, -86], clew: [-33 * L, -30], hollow: 0.07, creases: 5, mark: look.cross ? crossMark(look.cross) : undefined },
      ],
      stays: { bow: [bow - 1, -16], stern: [aft.left[0] + 2, roof] },
    };
    paintRig(pen, hull, rig);
    paintFlag(pen, { x: -33 * L, y: -86, len: 14, h: 6, color: look.flag, stripe: look.flagStripe, kind: 'swallow' });
    paintFlag(pen, { x: 12 * L, y: -66, len: 10, h: 5, color: look.flag, kind: 'pennant' });
  } else {
    const rig: RigSpec = {
      cloth: look.cloth,
      stripes: look.stripes,
      masts: [
        { x: 26 * L, top: -68, nest: 6, nestY: -64, flag: { color: look.flag, kind: 'pennant', len: 11, h: 5 }, sails: [{ y: -59, w: 28, h: 27, belly: 5 }] },
        { x: -5 * L, top: -88, nest: 7, nestY: -83, flag: { color: look.flag, stripe: look.flagStripe, kind: 'swallow', len: 17, h: 7 }, sails: [{ y: -78, w: 40, h: 40, belly: 6, mark: look.cross ? crossMark(look.cross) : undefined }] },
        { x: -32 * L, top: -66, base: roof + 1 },
      ],
      lateens: [{ tack: [-12 * L, roof - 6], peak: [-41 * L, roof - 39], clew: [-41 * L, roof - 8], hollow: 0.07, creases: 3 }],
      stays: { bow: [bow - 1, -16], stern: [aft.left[0] + 2, roof] },
    };
    paintRig(pen, hull, rig);
    paintFlag(pen, { x: -41 * L, y: roof - 39, len: 10, h: 5, color: look.flag, kind: 'pennant' });
  }
  return hull;
}

/** Shared palettes so the symbol files read like recipes. */
export const PAL = { WOOD, CLOTH };
