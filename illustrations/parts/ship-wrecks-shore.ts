import { mix, rgba } from '../kit/colors';
import { clipped, dot, ellipse, line, linearGradient, shades, shape, softBlob } from '../kit/draw';
import { lerp } from '../kit/math';
import { blob, catmullRom } from '../kit/shapes';
import type { Vec2 } from '../kit/types';
import { STONE, paintRock, stoneTone } from './sea-rock';
import { carvedPost, dragonHead } from './ship-oared';
import type { Pen } from './ship-parts';
import { CLOTH, WOOD, buildHull, paintBarrel, paintRope } from './ship-parts';
import { makePen } from './ship-types';
import { danglingRope, gull, weathered } from './ship-wreck';
import { HULLS, drawShipWreck, notch, paintPiece, palette, ribRow } from './ship-wrecks';
import { drawMastWreck, drawSmallWreck } from './ship-wrecks-small';

/** Wrecks on a beach, and clusters of wrecks (a ship graveyard). */

/* ------------------------------------------------------------------------------------ */
/* Sand                                                                                 */
/* ------------------------------------------------------------------------------------ */

/** A soft patch of sand to lay a wreck on, with a damp darker rim and a few grains. */
export function sandPatch(pen: Pen, cx: number, cy: number, rx: number, ry: number, sand: string): void {
  const { ctx, u, rand } = pen;
  const t = shades(sand);
  softBlob(ctx, cx, cy + 1, rx * 1.12, ry * 1.25, t.shade, 0.3);
  const pts = blob(rand, cx, cy, rx, ry, { points: 28, jitter: 0.05, lobes: 5, lobeAmp: 0.07 });
  shape(ctx, pts, { fill: linearGradient(ctx, cx - rx, cy - ry, cx + rx, cy + ry, [t.highlight, t.light, t.base]), smooth: true });
  clipped(
    ctx,
    pts,
    () => {
      for (let i = 0; i < 46; i++) dot(ctx, cx + rand.range(-1, 1) * rx, cy + rand.range(-1, 1) * ry, rand.range(0.3, 0.75), rgba(i % 3 ? t.shade : t.highlight, 0.7));
      shape(ctx, pts, { stroke: rgba(t.shade, 0.55), width: 3.2 * u, smooth: true });
    },
    true,
  );
  shape(ctx, pts, { stroke: rgba(t.deep, 0.5), width: 0.9 * u, smooth: true });
}

/** A bank of sand heaped in front of a hull, hiding its lowest planks. */
function dune(pen: Pen, x0: number, x1: number, top: number, sand: string, bump = 1.6): void {
  const { ctx, u, rand } = pen;
  const t = shades(sand);
  const n = 6;
  const pts: Vec2[] = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    pts.push([lerp(x0, x1, k), top - Math.sin(k * Math.PI) * bump * 1.5 + rand.range(-0.5, 0.5) * bump + (i === 0 || i === n ? 3.4 : 0)]);
  }
  const edge = catmullRom(pts, 6);
  const poly: Vec2[] = [...edge, [x1 - 2, top + 9], [x1 - 12, top + 12], [x0 + 12, top + 12], [x0 + 2, top + 9]];
  shape(ctx, poly, { fill: linearGradient(ctx, x0, top - 5, x1, top + 12, [t.highlight, t.light, t.base]), smooth: false });
  clipped(
    ctx,
    poly,
    () => {
      for (let i = 0; i < 6; i++) {
        const x = rand.range(x0 + 4, x1 - 12);
        const y = top + rand.range(2, 8);
        line(ctx, [[x, y], [x + rand.range(5, 10), y + rand.range(-0.5, 0.5)]], rgba(t.shade, 0.55), 0.7 * u);
      }
      for (let i = 0; i < 26; i++) dot(ctx, rand.range(x0, x1), top + rand.range(0, 12), rand.range(0.3, 0.7), rgba(i % 3 ? t.shade : t.highlight, 0.65));
      shape(ctx, poly, { fill: linearGradient(ctx, 0, top, 0, top + 12, [rgba(t.shade, 0), rgba(t.shade, 0.45)]) });
    },
    false,
  );
  shape(ctx, edge, { stroke: pen.ink, width: 1.1 * u, closed: false });
  shape(ctx, edge.map((q): Vec2 => [q[0], q[1] + 1.2]), { stroke: rgba(t.highlight, 0.85), width: 0.8 * u, closed: false });
}

/** A weathered plank lying on the ground. */
export function landPlank(pen: Pen, x: number, y: number, len: number, angle: number, wood: string = WOOD.pale): void {
  const { ctx, ink, u } = pen;
  const t = shades(weathered(wood, 0.25));
  const w = 2.9;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ellipse(ctx, 0.8, 1.7, len * 0.55, 1.5, { fill: rgba('#6b5a38', 0.4) });
  shape(ctx, [[-len / 2, -w / 2], [len / 2 - 1, -w / 2 + 0.2], [len / 2 + 0.9, 0.2], [len / 2 - 1.2, w / 2], [-len / 2 + 0.6, w / 2 - 0.2], [-len / 2 - 0.6, 0.3]], { fill: linearGradient(ctx, 0, -w / 2, 0, w / 2, [t.light, t.base, t.shade]), stroke: ink, width: 1 * u });
  dot(ctx, -len / 2 + 2.4, 0, 0.6, rgba(ink, 0.8));
  ctx.restore();
}

/** A barrel lying on its side, half sunk in the sand. */
export function landBarrel(pen: Pen, x: number, y: number, size: number, angle = 1.4): void {
  const { ctx } = pen;
  ellipse(ctx, x + 0.8, y + 1.6, size * 0.95, size * 0.4, { fill: rgba('#6b5a38', 0.4) });
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  paintBarrel(pen, 0, size * 0.52, size, size * 1.1, weathered(WOOD.pale, 0.2));
  ctx.restore();
}

/** An old anchor stuck in the sand. */
export function anchor(pen: Pen, x: number, y: number, s: number, angle = 0.28): void {
  const { ctx, ink, u } = pen;
  const k = u / s;
  const iron = '#5d626c';
  const light = '#8a909a';
  ellipse(ctx, x + 1, y + 1, 7 * s, 1.8 * s, { fill: rgba('#6b5a38', 0.4) });
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(s, s);
  const bar = (a: Vec2, b: Vec2, w: number): void => {
    line(ctx, [a, b], ink, (w + 1.6) * k);
    line(ctx, [a, b], iron, w);
    line(ctx, [[a[0] - 0.4, a[1]], [b[0] - 0.4, b[1]]], light, w * 0.3);
  };
  bar([0, -15], [0, 4], 2);
  bar([-5.4, -10.5], [5.4, -10.5], 1.8);
  ellipse(ctx, 0, -17, 2.4, 2.4, { stroke: ink, width: 2.4 * k });
  ellipse(ctx, 0, -17, 2.4, 2.4, { stroke: iron, width: 1.1 });
  const arms = catmullRom([[-8.6, -1.2], [-6.4, 3.6], [-2.6, 6.6], [0, 7], [2.6, 6.6], [6.4, 3.6], [8.6, -1.2]], 6);
  shape(ctx, arms, { stroke: ink, width: 3.4 * k, closed: false });
  shape(ctx, arms, { stroke: iron, width: 1.8, closed: false });
  for (const sx of [-1, 1]) shape(ctx, [[sx * 9.8, -3.4], [sx * 6.2, -1.2], [sx * 8.8, 1.2]], { fill: iron, stroke: ink, width: 0.9 * k });
  ctx.restore();
}

/* ------------------------------------------------------------------------------------ */
/* Beached wrecks                                                                       */
/* ------------------------------------------------------------------------------------ */

export interface BeachedLook {
  pose: 'ribs' | 'skeleton' | 'tilted' | 'buried';
  hull: string;
  trim: string;
  cloth: string;
  sand: string;
}

/** Scaled sub-scene around the origin. */
export function scaled(pen: Pen, s: number, fn: (pn: Pen) => void): void {
  pen.ctx.save();
  pen.ctx.scale(s, s);
  fn(makePen(pen.ctx, pen.rand, s, pen.ink));
  pen.ctx.restore();
}

/** A galleon run aground: the upper planking gone, ribs standing like the ribs of a beast, the mast broken and the sail in rags. */
function ribs(pen: Pen, look: BeachedLook): void {
  const { rand } = pen;
  const c = palette(look);
  const hull = buildHull(HULLS.galleon);
  sandPatch(pen, 0, 7, 72, 13, look.sand);
  paintPiece(pen, {
    hull,
    dy: 3,
    angle: 0.05,
    paint: { wood: c.wood, planks: 5, bands: [{ from: 0.06, to: 0.2, color: c.trim }], gap: notch(0.34, 0.96, 0.95), ribs: ribRow(rand, 0.4, 0.92, 7, [-0.14, 0.32]), holes: 2, moss: 0.25 },
    castles: [
      { t0: 0, t1: 0.37, rise: 13, wood: c.castle, windows: 3, trim: c.trim },
      { t0: 0, t1: 0.2, rise: 23, wood: c.castle, windows: 2, trim: c.trim },
    ],
    masts: [{ t: 0.5, top: -54, lean: -8, w: 3.4, sail: { y: -46, w: 32, h: 24, cloth: c.cloth, tilt: 3, strips: 5 } }],
    rig: (pn, h) => {
      paintRope(pn, [-3, -52], [h.sheer(0.12)[0] + 2, h.sheer(0.12)[1] - 18], { alpha: 0.5, sag: 3 });
      danglingRope(pn, [26, -30], 16, 1);
      gull(pn, h.sheer(0.1)[0] + 3, h.sheer(0.1)[1] - 25.5, 1);
    },
  });
  dune(pen, -64, -6, 1, look.sand, 1.8);
  dune(pen, -10, 62, 2, look.sand, 1.5);
  landPlank(pen, 66, 16, 13, 0.3);
  landPlank(pen, -52, 17, 11, -0.2, WOOD.oak);
  landBarrel(pen, 52, 14, 7);
  anchor(pen, -60, 12, 0.9, -0.3);
}

/** Only the keel and a rank of ribs remain, bleached white by the sun. */
function skeleton(pen: Pen, look: BeachedLook): void {
  const { rand } = pen;
  const c = palette({ ...look, hull: mix(look.hull, '#d9cdb4', 0.45) });
  const hull = buildHull(HULLS.galleon);
  sandPatch(pen, 0, 8, 74, 12, look.sand);
  paintPiece(pen, {
    hull,
    dy: 3,
    angle: -0.03,
    paint: { wood: c.wood, planks: 5, gap: () => 0.84, ribs: ribRow(rand, 0.05, 0.95, 15, [-0.34, -0.04], 0.8), holes: 0, moss: 0.05 },
    masts: [{ t: 0.55, top: -26, lean: 4, w: 3.2, wood: mix(WOOD.dark, '#b9ac90', 0.4) }],
    rig: (pn, h) => {
      const s = h.sheer(0.02);
      carvedPost(pn, [[s[0] + 2, s[1] + 4], [s[0] - 2, s[1] - 6], [s[0] - 3, s[1] - 16]], 3.4, 2.4, mix(WOOD.pale, '#cfc2a4', 0.3));
      danglingRope(pn, [4, -24], 9, -1);
    },
  });
  dune(pen, -66, -14, 2, look.sand, 1.4);
  dune(pen, -18, 66, 3, look.sand, 1.8);
  // Spilled ribs and a skull-shaped rock for good measure.
  landPlank(pen, -58, 16, 12, 0.5, mix(WOOD.pale, '#cfc2a4', 0.4));
  landPlank(pen, 58, 18, 14, -0.15, mix(WOOD.pale, '#cfc2a4', 0.4));
  landBarrel(pen, -34, 17, 6.4, 1.1);
}

/** A cog heeled over on the shore, stern high, a ruined castle and a torn sail draped over the sand. */
function tilted(pen: Pen, look: BeachedLook): void {
  const { ctx, rand } = pen;
  const c = palette(look);
  sandPatch(pen, 2, 8, 70, 13, look.sand);
  scaled(pen, 1.25, (pn) => {
    const hull = buildHull(HULLS.cog);
    paintPiece(pn, {
      hull,
      dy: 3,
      angle: 0.17,
      pivot: 4,
      paint: { wood: c.wood, planks: 4, clinker: true, bands: [{ from: 0.28, to: 0.5, color: c.trim }], gap: notch(0.4, 0.88, 0.8), ribs: ribRow(rand, 0.46, 0.84, 4, [-0.05, 0.3]), holes: 2, moss: 0.2 },
      castles: [
        { t0: 0, t1: 0.3, rise: 11, wood: c.castle, windows: 1, trim: c.trim, merlons: 3 },
        { t0: 0.86, t1: 1, rise: 6, wood: c.castle },
      ],
      masts: [{ t: 0.46, top: -44, lean: -10, w: 3.2, sail: { y: -36, w: 28, h: 18, cloth: c.cloth, tilt: -3, strips: 4 } }],
      rig: (pr, h) => {
        const s = h.sheer(0.9);
        paintRope(pr, [-6, -42], [s[0] - 2, s[1] - 4], { alpha: 0.5, sag: 3 });
        danglingRope(pr, [14, -24], 11, -1);
      },
    });
  });
  dune(pen, -66, -12, 4, look.sand, 1.8);
  dune(pen, -14, 60, 6, look.sand, 1.4);
  // The sail that came down with the mast lies in folds on the sand.
  const t = shades(c.cloth);
  const fold: Vec2[] = [[-70, 15], [-60, 11.5], [-46, 12], [-40, 16], [-52, 19], [-66, 19]];
  shape(ctx, fold, { fill: linearGradient(ctx, -70, 11, -40, 19, [t.highlight, c.cloth, t.shade]), stroke: pen.ink, width: 0.9 * pen.u, smooth: true });
  line(ctx, [[-62, 13], [-58, 18]], rgba(t.deep, 0.5), 0.7 * pen.u);
  line(ctx, [[-52, 12.6], [-49, 18]], rgba(t.deep, 0.5), 0.7 * pen.u);
  landPlank(pen, 58, 19, 12, 0.25);
  anchor(pen, 62, 12, 0.85, 0.35);
}

/** A longship swallowed by a dune, only its dragon prow and a few ribs still above the sand. */
function buried(pen: Pen, look: BeachedLook): void {
  const { ctx, rand } = pen;
  const c = palette(look);
  const dark = mix(c.wood, '#2a1a10', 0.35);
  sandPatch(pen, 0, 9, 74, 12, look.sand);
  ctx.save();
  ctx.translate(-9, 0);
  scaled(pen, 1.02, (pn) => {
    const hull = buildHull(HULLS.longship);
    paintPiece(pn, {
      hull,
      from: 0.2,
      dy: 5,
      angle: -0.09,
      pivot: 10,
      back: (pr, h) => {
        const bow = h.top[h.top.length - 1]!;
        carvedPost(pr, [[bow[0] - 2, bow[1] + 4], [bow[0] + 1, bow[1] - 3], [bow[0] + 4, bow[1] - 10], [bow[0] + 6, bow[1] - 17], [bow[0] + 8, bow[1] - 21]], 4.4, 2.8, dark);
        dragonHead(pr, bow[0] + 5.5, bow[1] - 21.5, 1, dark, c.trim);
      },
      paint: { wood: c.wood, planks: 4, clinker: true, bands: [{ from: 0, to: 0.3, color: c.trim }], gap: notch(0.3, 0.8, 0.95), ribs: ribRow(rand, 0.34, 0.76, 6, [-0.1, 0.34], 1.1), holes: 0, moss: 0.2 },
      masts: [{ t: 0.52, top: -26, lean: 3, w: 3, wood: dark }],
    });
  });
  ctx.restore();
  // A dune drifts over the stern and the middle of the hull; its foot melts into the sand patch.
  const crest = catmullRom([[-70, 11], [-62, 1], [-48, -7], [-32, -10], [-17, -7], [-5, -1], [8, 5], [20, 9]], 6);
  const foot: Vec2[] = [];
  for (let i = 1; i < 8; i++) {
    const k = i / 8;
    foot.push([lerp(20, -70, k), 10 + Math.sin(k * Math.PI) * 8.5]);
  }
  const t = shades(look.sand);
  const poly: Vec2[] = [...crest, ...foot];
  shape(ctx, poly, { fill: linearGradient(ctx, -70, -12, 20, 18, [t.highlight, t.light, t.base]) });
  clipped(
    ctx,
    poly,
    () => {
      for (let i = 0; i < 6; i++) {
        const x = rand.range(-62, 6);
        const y = rand.range(-4, 12);
        line(ctx, [[x, y], [x + rand.range(6, 12), y + rand.range(-0.8, 0.8)]], rgba(t.shade, 0.5), 0.7 * pen.u);
      }
      for (let i = 0; i < 34; i++) dot(ctx, rand.range(-70, 20), rand.range(-10, 18), rand.range(0.3, 0.7), rgba(i % 3 ? t.shade : t.highlight, 0.65));
      shape(ctx, poly, { fill: linearGradient(ctx, 0, -2, 0, 18, [rgba(t.shade, 0), rgba(t.shade, 0.4)]) });
    },
    false,
  );
  shape(ctx, crest, { stroke: pen.ink, width: 1.2 * pen.u, closed: false });
  shape(ctx, crest.map((q): Vec2 => [q[0] + 0.5, q[1] + 1.3]), { stroke: rgba(t.highlight, 0.85), width: 0.9 * pen.u, closed: false });
  dune(pen, 6, 62, 9, look.sand, 1.2);
  landPlank(pen, -58, 21, 13, 0.1, WOOD.oak);
  landBarrel(pen, 52, 18, 6.4, 1.2);
}

export function drawBeached(pen: Pen, look: BeachedLook): void {
  switch (look.pose) {
    case 'ribs':
      return ribs(pen, look);
    case 'skeleton':
      return skeleton(pen, look);
    case 'tilted':
      return tilted(pen, look);
    case 'buried':
      return buried(pen, look);
  }
}

/* ------------------------------------------------------------------------------------ */
/* Ship graveyard                                                                       */
/* ------------------------------------------------------------------------------------ */

type Spot = readonly [x: number, y: number, s: number, draw: (pn: Pen) => void];

/** Paints scenes scaled and placed around the origin, back (smaller y) to front. */
function arrange(pen: Pen, spots: readonly Spot[]): void {
  for (const [x, y, s, draw] of [...spots].sort((a, b) => a[1] - b[1])) {
    pen.ctx.save();
    pen.ctx.translate(x, y);
    pen.ctx.scale(s, s);
    draw(makePen(pen.ctx, pen.rand, s, pen.ink));
    pen.ctx.restore();
  }
}

const GOLD = '#d6a944';
const galleonWreck = (pose: 'listing' | 'split' | 'bow' | 'burned' | 'capsized', hull: string, cloth: string = CLOTH.cream) => (pn: Pen) => drawShipWreck(pn, { pose, hull, trim: GOLD, cloth });
const smallWreck = (pose: 'cog' | 'fishing' | 'longship' | 'rowboat', hull: string) => (pn: Pen) => drawSmallWreck(pn, { pose, hull, trim: '#d9c28a', cloth: CLOTH.cream });
const mastWreck = (pose: 'single' | 'twin' | 'nest' | 'yard', wood: string = WOOD.dark) => (pn: Pen) => drawMastWreck(pn, { pose, wood, cloth: CLOTH.cream, flag: CLOTH.red });
const rockAt = (x: number, w: number, h: number, summit: number, tone: string = STONE.grey, flat = 0) => (pn: Pen) => paintRock(pn, { x, y: 0, w, h, tone: stoneTone(tone), summit, flat });

export type GraveyardLayout = 'hulks' | 'reef' | 'fleet' | 'broken';

function spotsFor(layout: GraveyardLayout): Spot[] {
  switch (layout) {
    case 'hulks':
      return [
        [-18, -28, 0.74, galleonWreck('listing', WOOD.oak)],
        [72, -26, 0.78, mastWreck('twin')],
        [-86, -10, 0.62, mastWreck('single', WOOD.oak)],
        [66, 4, 0.66, galleonWreck('bow', WOOD.navy)],
        [-62, 10, 0.64, galleonWreck('capsized', WOOD.dark)],
        [-6, 26, 0.76, smallWreck('cog', WOOD.red)],
        [92, 28, 0.7, mastWreck('yard')],
      ];
    case 'reef':
      return [
        [-86, -26, 1, rockAt(0, 34, 44, 0.3, STONE.dark)],
        [-64, -16, 1, rockAt(0, 24, 26, -0.2)],
        [94, -24, 1, rockAt(0, 26, 52, 0.3, STONE.warm)],
        [76, -10, 1, rockAt(0, 30, 28, -0.2, STONE.grey, 0.3)],
        [8, -8, 0.84, galleonWreck('split', WOOD.red, CLOTH.white)],
        [-72, 18, 0.8, smallWreck('longship', WOOD.pale)],
        [62, 28, 0.74, smallWreck('fishing', WOOD.teal)],
        [-22, 30, 1, rockAt(0, 22, 14, 0.2, STONE.green)],
        [28, 28, 0.78, mastWreck('nest')],
      ];
    case 'fleet':
      return [
        [-72, -22, 0.64, galleonWreck('burned', WOOD.black, CLOTH.black)],
        [18, -26, 0.72, galleonWreck('burned', WOOD.dark, CLOTH.black)],
        [88, -16, 0.68, smallWreck('longship', WOOD.black)],
        [-22, 4, 0.76, galleonWreck('listing', WOOD.black, CLOTH.black)],
        [66, 18, 0.7, mastWreck('twin', WOOD.black)],
        [-92, 22, 0.7, smallWreck('cog', WOOD.dark)],
        [16, 30, 0.72, smallWreck('rowboat', WOOD.red)],
      ];
    case 'broken':
      return [
        [-72, -16, 0.82, galleonWreck('capsized', WOOD.navy)],
        [32, -26, 0.86, galleonWreck('split', WOOD.oak)],
        [-30, 16, 0.8, galleonWreck('bow', WOOD.red)],
        [80, 18, 0.78, smallWreck('cog', WOOD.teal)],
        [-100, 24, 0.7, mastWreck('yard')],
        [36, 30, 0.7, mastWreck('single')],
      ];
  }
}

export function drawGraveyard(pen: Pen, layout: GraveyardLayout): void {
  const { ctx } = pen;
  arrange(pen, spotsFor(layout));
  // The dark shoal goes behind everything, so the wrecks' waterline tints never touch it.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  softBlob(ctx, 0, 8, 128, 30, '#0a2a3c', 0.22);
  ctx.restore();
}
