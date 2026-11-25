import { mix, rgba } from '../kit/colors';
import { clipped, dot, line, linearGradient, shades, shape, taper } from '../kit/draw';
import { catmullRom } from '../kit/shapes';
import type { Vec2 } from '../kit/types';
import { ripple } from './sea-fx';
import type { Hull, Pen, SquareSail } from './ship-parts';
import { CLOTH, WOOD, buildHull, paintBarrel, paintCastle, paintCrate, paintFlag, paintHull, paintOar, paintSailor, paintShield, paintYard } from './ship-parts';
import { paintPorts, paintRig, waterUnder, waterlineFoam } from './ship-rig';

/** A carved post: a tapered, inked piece of wood following the curve through `pts`. */
export function carvedPost(pen: Pen, pts: readonly Vec2[], w0: number, w1: number, wood: string): void {
  const { ctx, ink, u } = pen;
  const tones = shades(wood);
  const path = catmullRom(pts, 8);
  taper(ctx, path, w0 + 1.8 * u, w1 + 1.8 * u, ink);
  taper(ctx, path, w0, w1, linearGradient(ctx, pts[0]![0] - w0, 0, pts[0]![0] + w0 * 1.5, 0, [tones.light, tones.base, tones.shade]));
}

/** A dragon head in profile facing right. `(x, y)` is the back of the skull. */
export function dragonHead(pen: Pen, x: number, y: number, k: number, wood: string, accent: string): void {
  const { ctx, ink, u } = pen;
  const tones = shades(wood);
  const P = (dx: number, dy: number): Vec2 => [x + dx * k, y + dy * k];
  // Ear/horn and mane.
  shape(ctx, [P(-1, -5), P(-6, -13), P(-3, -6), P(-8, -9), P(-3, -2)], { fill: accent, stroke: ink, width: 0.9 * u });
  // Lower jaw (open), then the skull on top of it.
  shape(ctx, [P(1, 3), P(11, 4), P(17, 8), P(9, 9), P(1, 7)], { fill: tones.shade, stroke: ink, width: 1 * u });
  shape(ctx, [P(9, 4.2), P(13, 4.4), P(15, 6.4), P(11, 6.6)], { fill: '#b03a3a' });
  const skull = [P(-3, 3), P(-4, -3), P(0, -8), P(7, -8.5), P(14, -6), P(20, -3), P(20.5, 0), P(15, 1.4), P(10, 2), P(3, 4)];
  shape(ctx, skull, { fill: linearGradient(ctx, x, y - 9 * k, x + 3 * k, y + 5 * k, [tones.highlight, wood, tones.shade]), stroke: ink, width: 1.2 * u, smooth: true });
  for (const tx of [12, 15, 18]) shape(ctx, [P(tx, 1.2), P(tx + 1, 4.2), P(tx + 2, 1)], { fill: '#f6f0dc', stroke: ink, width: 0.5 * u });
  dot(ctx, x + 6 * k, y - 3.4 * k, 1.9 * k, ink);
  dot(ctx, x + 6 * k, y - 3.4 * k, 1.3 * k, '#f5d34f');
  dot(ctx, x + 6.3 * k, y - 3.4 * k, 0.6 * k, ink);
  dot(ctx, x + 18.6 * k, y - 1.6 * k, 0.8 * k, ink);
  line(ctx, [P(1, -6), P(5, -7.2), P(9, -7)], rgba(tones.highlight, 0.7), 0.8 * u);
}

/* ------------------------------------------------------------------------------------ */
/* Longship                                                                             */
/* ------------------------------------------------------------------------------------ */

export interface LongshipLook {
  hull: string;
  strake: string;
  cloth: string;
  stripes?: SquareSail['stripes'];
  head: 'dragon' | 'curl';
  shields: readonly [string, string];
  accent: string;
  sail?: boolean;
  len?: number;
}

/** A viking longship: low and long, sweeping posts, a dragon prow, a row of shields and a striped sail. */
export function drawLongship(pen: Pen, look: LongshipLook): Hull {
  const { ctx, ink, u } = pen;
  const L = look.len ?? 1;
  const hull = buildHull({
    sternX: -46 * L,
    bowX: 46 * L,
    sternWl: -35 * L,
    bowWl: 35 * L,
    sternH: 19,
    waistH: 7,
    bowH: 19,
    sweepA: 4.2,
    sweepB: 4.2,
    lift: 6,
    deck: 3.4,
    stemBow: -2.2,
    stemStern: -2.2,
  });
  const dark = mix(look.hull, '#2a1a10', 0.35);
  waterUnder(pen, hull, { wake: 22 });

  // Posts rise from the stem and sternpost; they sit behind the hull edge so the join looks carved from one piece.
  const bow = hull.top[hull.top.length - 1]!;
  const stern = hull.top[0]!;
  if (look.head === 'dragon') {
    carvedPost(pen, [[bow[0] - 2, bow[1] + 4], [bow[0] + 1, bow[1] - 3], [bow[0] + 4, bow[1] - 10], [bow[0] + 6, bow[1] - 17], [bow[0] + 8, bow[1] - 21]], 4.4, 2.8, dark);
  } else {
    carvedPost(pen, [[bow[0] - 2, bow[1] + 4], [bow[0] + 2, bow[1] - 3], [bow[0] + 5, bow[1] - 10], [bow[0] + 5, bow[1] - 17], [bow[0] + 1, bow[1] - 21], [bow[0] - 3, bow[1] - 19], [bow[0] - 2.4, bow[1] - 15.5], [bow[0] + 0.4, bow[1] - 15.5]], 4.4, 2.4, dark);
  }
  carvedPost(pen, [[stern[0] + 2, stern[1] + 4], [stern[0] - 1, stern[1] - 3], [stern[0] - 4, stern[1] - 9], [stern[0] - 4, stern[1] - 15], [stern[0] - 0.5, stern[1] - 19], [stern[0] + 3, stern[1] - 17.5], [stern[0] + 2.4, stern[1] - 14], [stern[0] - 0.2, stern[1] - 14.4]], 4.4, 2.4, dark);

  paintHull(pen, hull, { wood: look.hull, planks: 4, clinker: true, bands: [{ from: 0, to: 0.32, color: look.strake }], wet: 0.45 });
  if (look.head === 'dragon') dragonHead(pen, bow[0] + 5.5, bow[1] - 21.5, 1, dark, look.accent);

  // Crew behind the shields.
  const crewT = look.sail === false ? [0.2, 0.3, 0.42, 0.58, 0.7, 0.82] : [0.16, 0.26, 0.86];
  crewT.forEach((t, i) => {
    const p = hull.sheer(t);
    paintSailor(pen, p[0], p[1] + 1.5, 8.6, { shirt: i % 2 ? CLOTH.red : CLOTH.blue, hat: '#8f9498' });
  });

  // Mast, sail and rigging.
  if (look.sail !== false) {
    const mx = 2 * L;
    paintRig(pen, hull, {
      cloth: look.cloth,
      stripes: look.stripes,
      masts: [{ x: mx, top: -62, base: -8, w: 3, flag: { color: look.accent, kind: 'swallow', len: 11, h: 5, dy: -1 }, sails: [{ y: -56, w: 46, h: 35, belly: 8, foot: 1.08, seams: 1 }] }],
      stays: { bow: [bow[0] + 2, bow[1] - 6], stern: [stern[0] - 2, stern[1] - 6] },
      shrouds: false,
    });
  } else {
    // Furled sail lying along the deck on its yard.
    const a: Vec2[] = [[-34 * L, -14], [-10 * L, -16.4], [14 * L, -16], [34 * L, -13.5]];
    taper(ctx, a, 4.6, 4.6, ink);
    taper(ctx, a, 3.4, 3.4, linearGradient(ctx, 0, -20, 0, -12, [mix(look.cloth, '#ffffff', 0.3), look.cloth, shades(look.cloth).shade]));
    for (const x of [-22, -4, 14, 28]) line(ctx, [[x * L, -18.3], [x * L, -13.5]], rgba(ink, 0.6), 0.7 * u);
  }

  // Shields along the rail, oars below them.
  const count = 11;
  const oarT: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = 0.15 + (0.7 * i) / (count - 1);
    const c = hull.at(t, 0.3);
    paintShield(pen, c[0], c[1], 3.2, look.shields[i % 2], look.shields[(i + 1) % 2]);
    if (i % 2 === 1) oarT.push(t);
  }
  for (const t of oarT) {
    const f = hull.at(t, 0.62);
    paintOar(pen, [f[0], f[1]], [f[0] - 8, 5.4], mix(look.hull, '#e8d3a3', 0.35));
  }
  waterlineFoam(pen, hull, { bow: 0.9 });
  return hull;
}

/* ------------------------------------------------------------------------------------ */
/* Galley                                                                               */
/* ------------------------------------------------------------------------------------ */

export interface GalleyLook {
  hull: string;
  strake: string;
  cloth: string;
  stripes?: SquareSail['stripes'];
  awning: string;
  awning2: string;
  flag: string;
  /** Sail set or furled on its yard. */
  sail?: boolean;
  oars?: number;
}

/** A long Mediterranean war galley: a row of oars, a ram at the bow, one lateen sail and an awning at the stern. */
export function drawGalley(pen: Pen, look: GalleyLook): Hull {
  const { ctx, ink, u } = pen;
  const hull = buildHull({
    sternX: -62,
    bowX: 56,
    sternWl: -56,
    bowWl: 50,
    sternH: 15,
    waistH: 8,
    bowH: 11,
    sweepA: 2.6,
    sweepB: 3.4,
    lift: 2.4,
    deck: 3.6,
    stemBow: 1.2,
  });
  const castleWood = mix(look.hull, '#f3dca8', 0.1);
  waterUnder(pen, hull, { wake: 24 });

  // Ram: a bronze spur at the waterline.
  const ram: Vec2[] = [[hull.spec.bowWl - 4, -3.4], [hull.spec.bowWl + 15, 0.4], [hull.spec.bowWl + 15.5, 2], [hull.spec.bowWl - 3, 4.4]];
  shape(ctx, ram, { fill: linearGradient(ctx, 0, -4, 0, 4, ['#d9b266', '#a47a38', '#6e4d22']), stroke: ink, width: 1.1 * u });
  line(ctx, [[hull.spec.bowWl + 2, 0.4], [hull.spec.bowWl + 12, 1]], rgba('#3d2a12', 0.7), 0.7 * u);

  paintHull(pen, hull, { wood: look.hull, planks: 3, bands: [{ from: 0, to: 0.3, color: look.strake }] });

  // Oars first, so the foam covers their blades.
  const n = look.oars ?? 9;
  for (let i = 0; i < n; i++) {
    const t = 0.14 + (0.64 * i) / (n - 1);
    const f = hull.at(t, 0.5);
    shape(pen.ctx, [[f[0] - 1.3, f[1] - 1], [f[0] + 1.3, f[1] - 1], [f[0] + 1.3, f[1] + 1.3], [f[0] - 1.3, f[1] + 1.3]], { fill: '#1d1511', stroke: rgba(ink, 0.8), width: 0.5 * u });
    paintOar(pen, [f[0], f[1]], [f[0] - 9.5, 5.6], mix(look.hull, '#ead6a7', 0.4));
  }
  paintPorts(pen, hull, { t0: 0.14, t1: 0.78, count: n, k: 0.5, size: 1.3, color: '#1d1511' });
  waterlineFoam(pen, hull, { bow: 0.9 });

  // Raised bow platform and a curled stern ornament.
  const sternTop = hull.top[0]!;
  const bowTop = hull.top[hull.top.length - 1]!;
  carvedPost(pen, [[sternTop[0] + 3, sternTop[1] + 3], [sternTop[0] - 3, sternTop[1] - 5], [sternTop[0] - 6, sternTop[1] - 13], [sternTop[0] - 3.5, sternTop[1] - 19], [sternTop[0] + 0.6, sternTop[1] - 17.5], [sternTop[0] - 1, sternTop[1] - 13.6]], 4.2, 2, mix(look.hull, '#2a1a10', 0.2));
  paintCastle(pen, hull, { t0: 0.86, t1: 1, rise: 6, wood: castleWood, merlons: 3 });
  carvedPost(pen, [[bowTop[0] - 2, bowTop[1] + 2], [bowTop[0] + 1, bowTop[1] - 5], [bowTop[0] + 2.4, bowTop[1] - 11]], 3.2, 2, look.strake);
  dot(ctx, bowTop[0] + 2.6, bowTop[1] - 12.4, 2.2 * u ** 0.5, '#d8a93e');
  dot(ctx, bowTop[0] + 2.6, bowTop[1] - 12.4, 1.2 * u ** 0.5, '#f4dc8a');

  // Stern cabin with a striped awning.
  const cab = paintCastle(pen, hull, { t0: 0.02, t1: 0.2, rise: 9, wood: castleWood, windows: 2, trim: look.strake });
  const ax0 = cab.left[0] - 2;
  const ax1 = cab.right[0] + 15;
  const ay = cab.left[1] - 12;
  for (const px of [cab.left[0] + 1, cab.right[0] - 1, ax1 - 5]) line(ctx, [[px, cab.left[1] + 1], [px, ay + 2.5]], ink, 1.8 * u);
  const awn: Vec2[] = [[ax0 + 3, ay], [ax1 - 3, ay], [ax1 + 1, ay + 5.5], [ax0 - 1, ay + 5.5]];
  shape(ctx, awn, { fill: look.awning, stroke: ink, width: 1.1 * u });
  clipped(ctx, awn, () => {
    const stripes = 6;
    for (let i = 0; i < stripes; i += 2) {
      const sx = ax0 - 1 + ((ax1 - ax0 + 2) * i) / stripes;
      shape(ctx, [[sx, ay - 1], [sx + (ax1 - ax0 + 2) / stripes, ay - 1], [sx + (ax1 - ax0 + 2) / stripes, ay + 6], [sx, ay + 6]], { fill: look.awning2 });
    }
    shape(ctx, awn, { fill: linearGradient(ctx, 0, ay, 0, ay + 6, [rgba('#ffffff', 0.25), rgba('#1c1030', 0.3)]) });
  });
  // Scalloped valance.
  for (let sx = ax0 + 1; sx < ax1 - 1; sx += 4.2) dot(ctx, sx + 2.1, ay + 5.6, 2.1 * u ** 0.4, rgba(look.awning, 0.95));

  // Mast and big lateen sail (or the sail furled on its yard).
  if (look.sail === false) {
    const a: Vec2[] = [[30, -16], [8, -23], [-18, -28], [-38, -34]];
    taper(ctx, a, 5, 5, ink);
    taper(ctx, a, 3.8, 3.8, linearGradient(ctx, 0, -38, 0, -14, [mix(look.cloth, '#ffffff', 0.3), look.cloth, shades(look.cloth).shade]));
    paintYard(pen, 34, -15, -42, -36, { w: 1.7 });
    paintRig(pen, hull, { cloth: look.cloth, masts: [{ x: -2, top: -40, base: -12, flag: { color: look.flag, kind: 'pennant', len: 12, h: 5 } }], shrouds: false });
  } else {
    paintRig(pen, hull, {
      cloth: look.cloth,
      stripes: look.stripes,
      masts: [{ x: -2, top: -50, base: -12 }],
      lateens: [{ tack: [36, -17], peak: [-42, -70], clew: [-41, -26], hollow: 0.07, creases: 6 }],
      shrouds: false,
    });
    paintFlag(pen, { x: -42, y: -70, len: 15, h: 6, color: look.flag, kind: 'swallow' });
  }
  paintFlag(pen, { x: bowTop[0] + 2.6, y: bowTop[1] - 12.5, len: 11, h: 5, color: look.flag, kind: 'pennant', phase: 1.5 });
  return hull;
}

/* ------------------------------------------------------------------------------------ */
/* Small boats                                                                          */
/* ------------------------------------------------------------------------------------ */

export interface FishingLook {
  hull: string;
  band?: string;
  cloth: string;
  patch?: string;
  rig: 'lateen' | 'sprit' | 'oars';
  flag?: string;
  buoy?: string;
  cargo: 'net' | 'crates' | 'barrels' | 'none';
  hat: string;
}

/** A little working boat with a patched sail, a fisherman and the day's gear. */
export function drawFishingBoat(pen: Pen, look: FishingLook): Hull {
  const { ctx, ink, u } = pen;
  const hull = buildHull({
    sternX: -25,
    bowX: 29,
    sternWl: -21,
    bowWl: 25,
    sternH: 10.5,
    waistH: 6.5,
    bowH: 12.5,
    sweepA: 2,
    sweepB: 2.6,
    lift: 2.2,
    deck: 4.2,
    stemBow: 1.4,
  });
  waterUnder(pen, hull, { wake: 14 });
  paintHull(pen, hull, { wood: look.hull, planks: 3, clinker: true, bands: look.band ? [{ from: 0.05, to: 0.3, color: look.band }] : undefined });
  waterlineFoam(pen, hull, { bow: 0.8 });

  // Gear on the deck.
  const deck = hull.sheer(0.62);
  if (look.cargo === 'net') {
    const cx = deck[0] + 1;
    const cy = deck[1] - 1;
    const blob: Vec2[] = [[cx - 8, cy + 2.4], [cx - 6.5, cy - 3.2], [cx - 1, cy - 5.2], [cx + 5, cy - 3.8], [cx + 8, cy + 2.4]];
    shape(ctx, blob, { fill: '#9d8f62', stroke: ink, width: 0.9 * u, smooth: true });
    clipped(ctx, blob, () => {
      for (let i = -12; i <= 12; i += 2.6) {
        line(ctx, [[cx + i, cy - 7], [cx + i + 6, cy + 4]], rgba('#3b3220', 0.7), 0.5 * u);
        line(ctx, [[cx + i + 6, cy - 7], [cx + i, cy + 4]], rgba('#3b3220', 0.7), 0.5 * u);
      }
    }, true);
    dot(ctx, cx - 3.5, cy - 3.2, 1.7, ink);
    dot(ctx, cx - 3.5, cy - 3.2, 1.2, look.buoy ?? '#c9483b');
    dot(ctx, cx + 3.5, cy - 3.6, 1.7, ink);
    dot(ctx, cx + 3.5, cy - 3.6, 1.2, '#f4ead0');
  } else if (look.cargo === 'crates') {
    paintCrate(pen, deck[0] - 6, deck[1] + 0.5, 6.4, 5.6);
    paintCrate(pen, deck[0] + 1, deck[1] + 0.5, 6, 5, WOOD.pine);
  } else if (look.cargo === 'barrels') {
    paintBarrel(pen, deck[0] - 3, deck[1] + 0.8, 6, 7.5);
    paintBarrel(pen, deck[0] + 4, deck[1] + 0.8, 6, 6.5, WOOD.oak);
  }

  const stern = hull.sheer(0.14);
  paintSailor(pen, stern[0] + 1, stern[1] + 1.2, 9.5, { shirt: look.band ?? CLOTH.blue, hat: look.hat, arm: 2 });
  if (look.rig === 'lateen') {
    paintRig(pen, hull, {
      cloth: look.cloth,
      masts: [{ x: 7, top: -42, base: -12, w: 2.4 }],
      lateens: [{ tack: [28, -14], peak: [-12, -50], clew: [-12, -20], hollow: 0.08, creases: 4, yard: WOOD.dark }],
      shrouds: false,
    });
    if (look.patch) shape(ctx, [[-4, -24], [2, -26], [3, -19], [-3, -18]], { fill: look.patch, stroke: rgba(ink, 0.5), width: 0.5 * u });
    if (look.flag) paintFlag(pen, { x: -12, y: -50, len: 9, h: 4, color: look.flag, kind: 'pennant' });
  } else if (look.rig === 'sprit') {
    paintRig(pen, hull, {
      cloth: look.cloth,
      masts: [{ x: 5, top: -48, base: -12, w: 2.4, flag: look.flag ? { color: look.flag, kind: 'pennant', len: 9, h: 4 } : undefined, sails: [{ y: -43, w: 24, h: 26, belly: 4, foot: 1.18, seams: 1, tilt: 1 }] }],
      jibs: [{ tack: [30, -12], peak: [8, -40], clew: [12, -17], hollow: 0.06, creases: 2 }],
      shrouds: false,
    });
    if (look.patch) shape(ctx, [[-2, -34], [4, -35], [5, -28], [-1, -27]], { fill: look.patch, stroke: rgba(ink, 0.5), width: 0.5 * u });
  } else {
    const f = hull.at(0.55, 0.3);
    paintOar(pen, [f[0] + 4, f[1] - 8], [f[0] - 9, 6], WOOD.pale);
    paintOar(pen, [f[0] + 9, f[1] - 8], [f[0] - 4, 6], WOOD.pale);
  }
  return hull;
}

export interface RowboatLook {
  hull: string;
  inside: string;
  band?: string;
  sailor?: string | null;
  cargo?: 'barrel' | 'lantern' | 'net' | 'none';
}

/** A tiny dinghy with a rower. */
export function drawRowboat(pen: Pen, look: RowboatLook): Hull {
  const { ctx, ink, u } = pen;
  const hull = buildHull({
    sternX: -18,
    bowX: 20,
    sternWl: -14,
    bowWl: 16,
    sternH: 6.2,
    waistH: 4.6,
    bowH: 8.2,
    sweepA: 1.8,
    sweepB: 2.4,
    lift: 1.6,
    depth: 1.2,
    deck: 5.6,
    stemBow: 1,
  });
  waterUnder(pen, hull, { wake: 10 });
  const inside = shades(look.inside);
  paintHull(pen, hull, { wood: look.hull, deck: inside.base, planks: 2, bands: look.band ? [{ from: 0, to: 0.34, color: look.band }] : undefined, clinker: true });
  // Thwarts across the open boat.
  for (const t of [0.3, 0.52, 0.72]) {
    const a = hull.sheer(t);
    const b: Vec2 = [a[0] + 1.2, a[1] - 5.2 * Math.sin(Math.PI * t) ** 0.7];
    line(ctx, [a, b], ink, 2.4 * u);
    line(ctx, [a, b], WOOD.pale, 1.2);
  }
  // The rower at the middle thwart and the cargo near the bow.
  const mid = hull.sheer(0.46);
  if (look.sailor !== null) paintSailor(pen, mid[0] - 1, mid[1] - 2.4, 10, { shirt: look.sailor ?? CLOTH.green, hat: '#7a5a3a', arm: 3 });
  const bow = hull.sheer(0.8);
  if (look.cargo === 'barrel') paintBarrel(pen, bow[0], bow[1] - 2.4, 5.6, 6);
  else if (look.cargo === 'lantern') {
    line(ctx, [[bow[0], bow[1] - 3], [bow[0], bow[1] - 9]], ink, 1.2 * u);
    dot(ctx, bow[0], bow[1] - 11, 2.4, ink);
    dot(ctx, bow[0], bow[1] - 11, 1.6, '#f7d46a');
  } else if (look.cargo === 'net') {
    shape(ctx, [[bow[0] - 4, bow[1] - 2], [bow[0] - 3, bow[1] - 6.5], [bow[0] + 3, bow[1] - 7], [bow[0] + 4.5, bow[1] - 2]], { fill: '#a39565', stroke: ink, width: 0.8 * u, smooth: true });
  }
  waterlineFoam(pen, hull, { bow: 0.6 });
  // Oar with its blade in the water and a few ripples.
  const o = hull.at(0.5, 0.05);
  paintOar(pen, [o[0] + 3, o[1] - 7], [o[0] - 10, 5.4], WOOD.pale);
  ripple(ctx, o[0] - 10, 5.8, 3.4, 1.1, { alpha: 0.7, rings: 2 });
  return hull;
}
