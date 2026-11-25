import { mix, rgba } from '../kit/colors';
import { dot, ellipse, line, linearGradient, radialGradient, shades, shape, softBlob } from '../kit/draw';
import type { Vec2 } from '../kit/types';
import { FOAM, foamBlob } from './sea-fx';
import type { Pen } from './ship-parts';
import { WOOD, paintBarrel, paintCrate } from './ship-parts';
import { plankDebris, weathered } from './ship-wreck';

/** A wooden pier running to the right from the shore end, seen from a 3/4 angle; also the ruined dock of a wreck scene. */

export interface PierLook {
  /** Deck length in px (the T-head and lantern come on top). */
  len: number;
  wood: string;
  /** 0 = sound ... 1 = nearly gone. */
  ruin: number;
  head: 'plain' | 'tee' | 'lantern';
  props?: boolean;
  /** The outer part of the deck has broken off and tips down into the water. */
  sag?: boolean;
}

const Y_BACK = 26;
const Y_FRONT = 40;
const FACE = 5;
const WATER = 56;

export function drawPier(pen: Pen, look: PierLook): void {
  const { ctx, rand, ink } = pen;
  const wood = weathered(look.wood, 0.08 + 0.42 * look.ruin);
  const t = shades(wood);
  const dk = shades(mix(wood, '#2a1a10', 0.5));
  const x0 = 10;
  const pw = 5.6;
  const n = Math.floor(look.len / pw);
  const x1 = x0 + n * pw;
  const split = look.sag ? Math.floor(n * 0.56) : n;
  const tilt = 0.3;

  const here: boolean[] = [];
  for (let i = 0; i < n; i++) here.push(i < 2 || !rand.chance(look.ruin * (0.08 + 0.7 * Math.pow(i / n, 1.2))));

  softBlob(ctx, (x0 + x1) / 2, 51, (x1 - x0) / 2 + 8, 7, '#0a2a3c', 0.26);

  const deck = (i0: number, i1: number): void => {
    const a = x0 + i0 * pw;
    const b = x0 + i1 * pw;
    for (const y of [Y_BACK + 3.5, Y_FRONT - 3]) {
      line(ctx, [[a, y], [b, y]], ink, 5, { cap: 'butt' });
      line(ctx, [[a, y], [b, y]], dk.base, 3, { cap: 'butt' });
    }
    for (let i = i0; i < i1; i++) {
      if (!here[i]) continue;
      const x = x0 + i * pw;
      const ragged = look.ruin > 0.15 && (!here[i - 1] || !here[i + 1]);
      const cutBack = ragged && rand.chance(0.5) ? rand.range(2, 8) : 0;
      const cutFront = ragged && rand.chance(0.45) ? rand.range(2, 7) : 0;
      const tone = rand.pick([t.light, t.base, t.base, mix(t.base, t.shade, 0.35), t.highlight]);
      ctx.save();
      if (look.ruin > 0.2 && rand.chance(0.35)) {
        ctx.translate(x + pw / 2, (Y_BACK + Y_FRONT) / 2);
        ctx.rotate(rand.range(-0.22, 0.22));
        ctx.translate(-(x + pw / 2), -(Y_BACK + Y_FRONT) / 2 + rand.range(0, 1.6));
      }
      const top = Y_BACK + cutBack;
      const bot = Y_FRONT - cutFront;
      shape(ctx, [[x, top], [x + pw - 0.5, top + rand.range(-0.5, 0.5)], [x + pw - 0.5, bot], [x, bot]], { fill: tone, stroke: rgba(ink, 0.7), width: 0.8, join: 'miter' });
      line(ctx, [[x + 0.5, top + 1], [x + 0.5, bot - 1]], rgba(t.highlight, 0.7), 0.6);
      line(ctx, [[x + pw * 0.55, top + 3], [x + pw * 0.55 + 0.3, bot - 3]], rgba(dk.deep, 0.16), 0.5);
      if (cutBack === 0) dot(ctx, x + pw / 2, top + 2.2, 0.45, rgba(ink, 0.6));
      if (cutFront === 0) {
        dot(ctx, x + pw / 2, bot - 2.2, 0.45, rgba(ink, 0.6));
        shape(ctx, [[x, Y_FRONT], [x + pw - 0.5, Y_FRONT], [x + pw - 0.5, Y_FRONT + FACE], [x, Y_FRONT + FACE]], { fill: dk.light, stroke: ink, width: 0.8, join: 'miter' });
      }
      ctx.restore();
    }
  };

  const post = (x: number, base: number, top: number, lean: number, broken: boolean, w = 4.6): void => {
    ellipse(ctx, x, base, w * 1.35, 2.3, { fill: rgba(FOAM, 0.85), stroke: rgba('#a6d2d8', 0.8), width: 0.6 });
    ctx.save();
    ctx.translate(x, base);
    ctx.rotate(lean);
    const h = base - top;
    const pts: Vec2[] = broken
      ? [[-w / 2, 0], [-w / 2, -h], [-w * 0.2, -h - 2.6], [0.2, -h + 0.8], [w * 0.28, -h - 3.6], [w / 2, -h], [w / 2, 0]]
      : [[-w / 2, 0], [-w / 2, -h], [w / 2, -h], [w / 2, 0]];
    shape(ctx, pts, { fill: linearGradient(ctx, -w / 2, 0, w / 2, 0, [t.light, t.base, dk.shade]), stroke: ink, width: 1, join: 'miter' });
    if (!broken && look.ruin < 0.5) line(ctx, [[-w / 2, -h + 4.4], [w / 2, -h + 3.6]], rgba('#d9c28a', 0.9), 0.9);
    ctx.restore();
  };

  deck(0, split);
  const bx = x0 + split * pw;
  if (split < n) {
    ctx.save();
    ctx.translate(bx, Y_FRONT);
    ctx.rotate(tilt);
    ctx.translate(-bx, -Y_FRONT);
    deck(split, n);
    ctx.restore();
    const ex = bx + (x1 - bx) * Math.cos(tilt);
    const ey = Y_FRONT + (x1 - bx) * Math.sin(tilt);
    foamBlob(ctx, rand, ex - 4, ey + 4, 10, 3.4, { alpha: 0.85 });
  }

  if (look.head === 'tee') {
    const a = x1 - 3;
    const b = x1 + 13;
    const yt = Y_BACK - 10;
    const yb = Y_FRONT + 6;
    shape(ctx, [[a, yt], [b, yt], [b, yb], [a, yb]], { fill: dk.base, stroke: ink, width: 1, join: 'miter' });
    for (let y = yt; y < yb - 1; y += 5.2) {
      const tone = rand.pick([t.light, t.base, mix(t.base, t.shade, 0.3)]);
      shape(ctx, [[a + 0.4, y + 0.3], [b - 0.4, y + 0.3], [b - 0.4, Math.min(y + 4.9, yb - 0.4)], [a + 0.4, Math.min(y + 4.9, yb - 0.4)]], { fill: tone, stroke: rgba(ink, 0.6), width: 0.7, join: 'miter' });
    }
    shape(ctx, [[a, yb], [b, yb], [b, yb + FACE], [a, yb + FACE]], { fill: dk.light, stroke: ink, width: 0.9, join: 'miter' });
  }

  // Piles under the near edge.
  const frontEnd = look.head === 'tee' ? x1 + 11 : split < n ? bx : x1 - 3;
  for (let k = 0, x = x0 + 7; x < frontEnd; k++, x += 18.5) {
    const roll = rand.next();
    if (look.ruin > 0.1 && roll < look.ruin * 0.22) continue;
    const broken = look.ruin > 0.1 && roll > 1 - look.ruin * 0.6;
    const lean = look.ruin > 0.1 ? rand.range(-0.2, 0.2) * look.ruin : 0;
    const base = look.head === 'tee' && x > x1 - 4 ? WATER + 3 : WATER;
    post(x, base, broken ? base - rand.range(3, 10) : (look.head === 'tee' && x > x1 - 4 ? Y_FRONT + 6 + FACE : Y_FRONT + 1), lean, broken);
    if (k > 12) break;
  }
  if (look.head === 'tee') post(x1 + 11.5, WATER + 3, Y_FRONT + 6 + FACE, 0, false);

  if (look.props && look.ruin < 0.6) {
    paintBarrel(pen, x1 - 26, Y_FRONT - 5, 8, 9, weathered(WOOD.oak, 0.2));
    paintCrate(pen, x1 - 17, Y_FRONT - 5, 8, 8, weathered(WOOD.pale, 0.2));
    paintCrate(pen, x1 - 13, Y_FRONT - 10, 6, 6, weathered(WOOD.pine, 0.2));
  }

  if (look.head === 'lantern') {
    const px = x1 - 4;
    line(ctx, [[px, Y_BACK + 7], [px, 9]], ink, 4.6, { cap: 'butt' });
    line(ctx, [[px, Y_BACK + 7], [px, 9]], t.base, 2.8, { cap: 'butt' });
    line(ctx, [[px - 0.7, Y_BACK + 6], [px - 0.7, 10]], rgba(t.highlight, 0.8), 0.8);
    ellipse(ctx, px, 11, 15, 15, { fill: radialGradient(ctx, px, 11, 0, 15, [[0, rgba('#ffd98a', 0.55)], [1, rgba('#ffd98a', 0)]]) });
    shape(ctx, [[px - 3.4, 4.6], [px + 3.4, 4.6], [px + 3, 12.6], [px - 3, 12.6]], { fill: '#f6cf6a', stroke: ink, width: 1, join: 'miter' });
    shape(ctx, [[px - 4.6, 4.6], [px, 0.6], [px + 4.6, 4.6]], { fill: dk.base, stroke: ink, width: 1 });
    line(ctx, [[px, 6], [px, 11.4]], rgba(ink, 0.55), 0.7);
  }

  if (look.ruin > 0.45) {
    for (let i = 0; i < 3; i++) plankDebris(pen, x0 + (0.45 + i * 0.2) * (x1 - x0) + rand.range(-6, 6), WATER + 7 + rand.range(0, 5), rand.range(9, 15), rand.range(-0.5, 0.5), rand.chance(0.5) ? WOOD.pale : WOOD.oak);
  }
}
