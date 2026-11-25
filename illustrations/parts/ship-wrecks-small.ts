import { mix, rgba } from '../kit/colors';
import { clipped, dot, ellipse, line, shape } from '../kit/draw';
import { TAU } from '../kit/math';
import type { Vec2 } from '../kit/types';
import { foamBlob, waterShadow } from './sea-fx';
import { carvedPost, dragonHead } from './ship-oared';
import type { Pen } from './ship-parts';
import { WOOD, buildHull, paintCrowsNest, paintFlag, paintOar, paintRope, paintShield } from './ship-parts';
import { makePen } from './ship-types';
import { brokenMast, danglingRope, floatingCloth, gull, plankDebris, shreds } from './ship-wreck';
import { HULLS, drift, notch, paintPiece, palette, ribRow, settle } from './ship-wrecks';

/** Small wrecks (a cog, a fishing boat, a longship, a rowboat) and lone masts sticking out of the sea. */

const SPLINTER = '#e9d2a2';

export interface SmallWreckLook {
  pose: 'cog' | 'fishing' | 'longship' | 'rowboat';
  hull: string;
  trim: string;
  cloth: string;
}

/** A round shield floating flat on the water. */
function floatingShield(pen: Pen, x: number, y: number, r: number, color: string, accent: string): void {
  const { ctx, ink, u, rand } = pen;
  foamBlob(ctx, rand, x, y + 0.9, r * 1.5, r * 0.6, { alpha: 0.5, edge: false });
  ellipse(ctx, x, y, r, r * 0.52, { fill: color, stroke: ink, width: 0.9 * u });
  ellipse(ctx, x, y, r * 0.64, r * 0.33, { stroke: accent, width: 0.9 * u });
  dot(ctx, x, y, r * 0.2, ink);
  dot(ctx, x, y, r * 0.12, '#c9c2b0');
}

/** A fishing net drifting at the surface, with floats along its edge. */
function floatingNet(pen: Pen, cx: number, cy: number, w: number): void {
  const { ctx, ink, u, rand } = pen;
  const rim: Vec2[] = [];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const r = 1 + rand.range(-0.15, 0.15);
    rim.push([cx + Math.cos(a) * w * 0.5 * r, cy + Math.sin(a) * w * 0.2 * r]);
  }
  foamBlob(ctx, rand, cx, cy + 0.8, w * 0.55, w * 0.22, { alpha: 0.4, edge: false });
  shape(ctx, rim, { fill: rgba('#b3a572', 0.6), stroke: rgba(ink, 0.8), width: 0.9 * u, smooth: true });
  clipped(
    ctx,
    rim,
    () => {
      for (let x = -w * 0.6; x <= w * 0.6; x += 2.8) {
        line(ctx, [[cx + x, cy - w * 0.25], [cx + x + w * 0.2, cy + w * 0.25]], rgba('#3b3220', 0.75), 0.5 * u);
        line(ctx, [[cx + x + w * 0.2, cy - w * 0.25], [cx + x, cy + w * 0.25]], rgba('#3b3220', 0.75), 0.5 * u);
      }
    },
    true,
  );
  [0, 4, 7].forEach((i, k) => {
    const p = rim[i]!;
    dot(ctx, p[0], p[1], 1.9, ink);
    dot(ctx, p[0], p[1], 1.3, k % 2 ? '#f4ead0' : '#c9483b');
  });
}

/** Jagged pale wood where a post was snapped off. */
function splinterTip(pen: Pen, x: number, y: number, w: number): void {
  const { ctx, ink, u, rand } = pen;
  shape(ctx, [[x - w / 2, y + 1.2], [x - w * 0.3, y - rand.range(1.6, 2.6)], [x - 0.1, y - 0.2], [x + w * 0.25, y - rand.range(2.8, 4)], [x + w / 2, y + 1.2]], { fill: SPLINTER, stroke: ink, width: 0.8 * u });
}

/** Runs `fn` in a copy of the scene scaled around its origin, with a pen that keeps the ink weights consistent. */
function scaled(pen: Pen, s: number, fn: (pn: Pen) => void): void {
  pen.ctx.save();
  pen.ctx.scale(s, s);
  fn(makePen(pen.ctx, pen.rand, s, pen.ink));
  pen.ctx.restore();
}

/* ------------------------------------------------------------------------------------ */
/* Small wrecks                                                                         */
/* ------------------------------------------------------------------------------------ */

/** A merchant cog with its stern sunk, the castle half drowned and the mast leaning on its last stay. */
function cog(pen: Pen, look: SmallWreckLook): void {
  const { ctx, rand } = pen;
  const c = palette(look);
  waterShadow(ctx, 0, 5, 52, 7, 0.34);
  const hull = buildHull(HULLS.cog);
  const p = paintPiece(pen, {
    hull,
    dy: 6,
    angle: -0.15,
    pivot: 6,
    paint: { wood: c.wood, planks: 4, clinker: true, bands: [{ from: 0.28, to: 0.5, color: c.trim }], gap: notch(0.34, 0.9, 0.95), ribs: ribRow(rand, 0.42, 0.86, 5, [-0.1, 0.32]), holes: 1 },
    castles: [
      { t0: 0, t1: 0.3, rise: 11, wood: c.castle, windows: 1, trim: c.trim },
      { t0: 0.86, t1: 1, rise: 6, wood: c.castle },
    ],
    masts: [{ t: 0.46, top: -50, lean: 8, w: 3.2, sail: { y: -44, w: 30, h: 24, cloth: c.cloth, tilt: -3, strips: 5 } }],
    rig: (pn, h) => {
      const s = h.sheer(0.08);
      paintRope(pn, [-2, -48], [s[0] + 2, s[1] - 10], { alpha: 0.5, sag: 3 });
      danglingRope(pn, [16, -33], 13, -1);
      gull(pn, s[0] + 4, s[1] - 15.5, 0.95);
    },
  });
  settle(pen, [p]);
  drift(pen, [['plank', 47, 12], ['barrel', 40, 17], ['plank', -48, 15]]);
}

/** A fishing boat with its back broken and the net still tangled around it. */
function fishing(pen: Pen, look: SmallWreckLook): void {
  const { ctx, ink, u, rand } = pen;
  const c = palette(look);
  waterShadow(ctx, 0, 5, 40, 6, 0.34);
  scaled(pen, 1.28, (pn) => {
    const hull = buildHull(HULLS.fishing);
    const p = paintPiece(pn, {
      hull,
      dy: 4.5,
      angle: -0.2,
      pivot: 0,
      paint: { wood: c.wood, planks: 3, clinker: true, bands: [{ from: 0.05, to: 0.3, color: c.trim }], gap: notch(0.3, 0.86, 0.95), ribs: ribRow(rand, 0.36, 0.8, 4, [-0.1, 0.3], 1.2), holes: 1 },
      masts: [{ t: 0.42, top: -30, lean: 5, w: 2.4, sail: { y: -26, w: 18, h: 14, cloth: c.cloth, tilt: 3, strips: 4 } }],
      rig: (pr, h) => {
        const b = h.at(0.62, 0.05);
        line(ctx, [b, [b[0] + 3, b[1] - 14]], ink, 2.4 * u);
        line(ctx, [b, [b[0] + 3, b[1] - 14]], WOOD.pale, 1.1);
        danglingRope(pr, [b[0] + 3, b[1] - 14], 9, 1);
      },
    });
    settle(pn, [p]);
    floatingNet(pn, -23, 6.5, 17);
    drift(pn, [['plank', 28, 9], ['barrel', 24, 13]]);
  });
}

/** A viking longship that ran onto rocks: the dragon head still proud, the strakes laid open like a ribcage. */
function longship(pen: Pen, look: SmallWreckLook): void {
  const { ctx, rand } = pen;
  const c = palette(look);
  waterShadow(ctx, 0, 5, 50, 7, 0.34);
  ctx.translate(-5, 0);
  scaled(pen, 0.8, (pn) => {
    const hull = buildHull(HULLS.longship);
    const dark = mix(c.wood, '#2a1a10', 0.35);
    const p = paintPiece(pn, {
      hull,
      dy: 5,
      angle: -0.07,
      pivot: 4,
      back: (pr, h) => {
        const bow = h.top[h.top.length - 1]!;
        const stern = h.top[0]!;
        carvedPost(pr, [[bow[0] - 2, bow[1] + 4], [bow[0] + 1, bow[1] - 3], [bow[0] + 4, bow[1] - 10], [bow[0] + 6, bow[1] - 17], [bow[0] + 8, bow[1] - 21]], 4.4, 2.8, dark);
        dragonHead(pr, bow[0] + 5.5, bow[1] - 21.5, 1, dark, c.trim);
        carvedPost(pr, [[stern[0] + 2, stern[1] + 4], [stern[0] - 1, stern[1] - 3], [stern[0] - 3, stern[1] - 9]], 4.4, 3.6, dark);
        splinterTip(pr, stern[0] - 3, stern[1] - 9, 3.6);
      },
      paint: { wood: c.wood, planks: 4, clinker: true, bands: [{ from: 0, to: 0.3, color: c.trim }], gap: notch(0.26, 0.76, 0.95), ribs: ribRow(rand, 0.28, 0.74, 7, [-0.12, 0.34], 1.1), holes: 1 },
      masts: [{ t: 0.5, top: -32, lean: 4, w: 3, sail: { y: -27, w: 24, h: 18, cloth: mix(c.cloth, '#c9a45a', 0.3), tilt: -2, strips: 4 } }],
      rig: (pr, h) => {
        for (const t of [0.12, 0.18, 0.84, 0.9]) {
          const q = h.at(t, 0.3);
          paintShield(pr, q[0], q[1], 3.2, t < 0.5 ? '#8c3b32' : '#d8c9a0', t < 0.5 ? '#d8c9a0' : '#8c3b32');
        }
        const o = h.at(0.2, 0.62);
        paintOar(pr, [o[0], o[1]], [o[0] - 7, 5.4], WOOD.pale);
        const g = h.at(0.84, 0.62);
        paintOar(pr, [g[0], g[1]], [g[0] + 9, 6], WOOD.pale);
      },
    });
    settle(pn, [p]);
    floatingShield(pn, -52, 9, 4.2, '#2f5f7a', '#d8c9a0');
    floatingShield(pn, 58, 12, 4, '#8c3b32', '#d8c9a0');
    drift(pn, [['plank', 50, 8], ['plank', -40, 14]]);
  });
}

/** A rowboat sunk by the stern, its bow and one oar pointing at the sky. */
function rowboat(pen: Pen, look: SmallWreckLook): void {
  const { ctx, rand } = pen;
  const c = palette(look);
  waterShadow(ctx, 0, 5, 36, 6, 0.34);
  scaled(pen, 1.7, (pn) => {
    const hull = buildHull(HULLS.rowboat);
    const p = paintPiece(pn, {
      hull,
      dy: 4,
      angle: -0.34,
      pivot: 4,
      paint: { wood: c.wood, planks: 3, clinker: true, bands: [{ from: 0, to: 0.3, color: c.trim }], gap: notch(0.22, 0.7, 0.85), ribs: ribRow(rand, 0.3, 0.66, 3, [-0.05, 0.3], 1), holes: 1 },
      rig: (pr, h) => {
        const a = h.at(0.34, 0.2);
        paintOar(pr, [a[0] + 2, a[1] + 2], [a[0] - 13, -14], WOOD.pale);
        const b = h.at(0.62, 0.05);
        line(pr.ctx, [[b[0] - 2, b[1]], [b[0] + 6, b[1] - 1.4]], pr.ink, 2.6 * pr.u);
        line(pr.ctx, [[b[0] - 2, b[1]], [b[0] + 6, b[1] - 1.4]], WOOD.pale, 1.2);
      },
    });
    settle(pn, [p]);
    plankDebris(pn, 17, 5.5, 9, 0.2);
    plankDebris(pn, -19, 7.5, 7, -0.3, WOOD.oak);
    floatingCloth(pn, 10, 8.5, 9, c.cloth);
  });
}

export function drawSmallWreck(pen: Pen, look: SmallWreckLook): void {
  switch (look.pose) {
    case 'cog':
      return cog(pen, look);
    case 'fishing':
      return fishing(pen, look);
    case 'longship':
      return longship(pen, look);
    case 'rowboat':
      return rowboat(pen, look);
  }
}

/* ------------------------------------------------------------------------------------ */
/* Lone masts                                                                           */
/* ------------------------------------------------------------------------------------ */

export interface MastWreckLook {
  pose: 'single' | 'twin' | 'nest' | 'yard';
  wood: string;
  cloth: string;
  flag: string;
}

/** X of a leaning mast at height `y`. */
function mastAt(x: number, base: number, top: number, lean: number, y: number): number {
  return x + lean * ((base - y) / (base - top)) * 0.95;
}

function single(pen: Pen, look: MastWreckLook): void {
  const { ctx } = pen;
  const cloth = mix(look.cloth, '#8b8576', 0.3);
  waterShadow(ctx, 0, 6, 24, 5, 0.3);
  const base = 16;
  const top = -64;
  brokenMast(pen, -3, base, top, { w: 4.4, lean: 10, wood: look.wood });
  const yy = -49;
  const cx = mastAt(-3, base, top, 10, yy);
  shreds(pen, { x: cx - 16, y: yy, w: 33, h: 26, cloth, tilt: -3, strips: 5 });
  paintRope(pen, [cx - 15, yy - 1], [-18, -20], { alpha: 0.5, sag: 2 });
  danglingRope(pen, [cx + 16, yy - 3], 14, 1);
  gull(pen, cx + 15, yy - 3.4, 0.9, -1);
  settle(pen, [{ water: [-6, 0], x0: -7, x1: 1 }]);
  drift(pen, [['plank', -21, 11], ['barrel', 18, 12], ['plank', 11, 16]]);
}

function twin(pen: Pen, look: MastWreckLook): void {
  const { ctx } = pen;
  const cloth = mix(look.cloth, '#8b8576', 0.3);
  waterShadow(ctx, 0, 6, 28, 5, 0.3);
  const base = 17;
  brokenMast(pen, -11, base, -66, { w: 4, lean: 7, wood: look.wood });
  const xa = mastAt(-11, base, -66, 7, -52);
  shreds(pen, { x: xa - 11, y: -52, w: 22, h: 18, cloth, tilt: 2, strips: 4 });
  brokenMast(pen, 10, base, -42, { w: 3.4, lean: -9, wood: look.wood });
  paintRope(pen, [mastAt(-11, base, -66, 7, -64), -64], [mastAt(10, base, -42, -9, -41), -41], { alpha: 0.55, sag: 4 });
  paintRope(pen, [xa, -52], [mastAt(10, base, -42, -9, -34), -34], { alpha: 0.45, sag: 3 });
  gull(pen, mastAt(10, base, -42, -9, -42) + 1, -42, 0.95);
  settle(pen, [{ water: [-14, -8], x0: -15, x1: -7 }, { water: [7, 13], x0: 6, x1: 14 }]);
  drift(pen, [['plank', -2, 12], ['plank', -24, 14], ['junk', 24, 15]]);
}

function nest(pen: Pen, look: MastWreckLook): void {
  const { ctx } = pen;
  waterShadow(ctx, 0, 6, 22, 5, 0.3);
  const base = 16;
  const top = -66;
  brokenMast(pen, 3, base, top, { w: 4.2, lean: -6, wood: look.wood });
  const nx = mastAt(3, base, top, -6, -50);
  paintCrowsNest(pen, nx, -50, 15, WOOD.dark);
  const fx = mastAt(3, base, top, -6, -58);
  paintFlag(pen, { x: fx, y: -58, len: 13, h: 6, color: look.flag, kind: 'pennant' });
  danglingRope(pen, [nx + 6, -48], 16, 1);
  settle(pen, [{ water: [0, 6], x0: -1, x1: 7 }]);
  drift(pen, [['barrel', -17, 11], ['plank', 17, 13], ['plank', -8, 17]]);
}

/** A stump with its spar and sail floating beside it. */
function yard(pen: Pen, look: MastWreckLook): void {
  const { ctx, ink, u } = pen;
  const cloth = mix(look.cloth, '#8b8576', 0.3);
  waterShadow(ctx, 0, 6, 28, 5, 0.3);
  brokenMast(pen, -8, 14, -32, { w: 4.6, lean: 3, wood: look.wood });
  danglingRope(pen, [-5, -30], 12, -1);
  settle(pen, [{ water: [-11, -4], x0: -12, x1: -3 }]);
  // The yard lies across the water with the sail draped over it.
  floatingCloth(pen, 12, 9, 22, cloth);
  const a: Vec2 = [-2, 5.5];
  const b: Vec2 = [28, 10];
  line(pen.ctx, [a, b], ink, 3.8 * u);
  line(pen.ctx, [a, b], WOOD.dark, 2);
  line(pen.ctx, [[a[0], a[1] - 0.6], [b[0], b[1] - 0.6]], rgba(WOOD.pale, 0.5), 0.8);
  gull(pen, 20, 6.2, 0.9);
  drift(pen, [['plank', -22, 13], ['barrel', 24, 15]]);
}

export function drawMastWreck(pen: Pen, look: MastWreckLook): void {
  switch (look.pose) {
    case 'single':
      return single(pen, look);
    case 'twin':
      return twin(pen, look);
    case 'nest':
      return nest(pen, look);
    case 'yard':
      return yard(pen, look);
  }
}
