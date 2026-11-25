import { mix, rgba } from '../kit/colors';
import { clipped, dot, ellipse, line, linearGradient, radialGradient, shades, shape } from '../kit/draw';
import { TAU, lerp } from '../kit/math';
import type { Vec2 } from '../kit/types';
import { tentacle, thorn } from './sea-creature';
import type { Skin } from './sea-creature';
import { FOAM, droplets, foamStrip, ripple, waterShadow } from './sea-fx';
import { CLOTH, WOOD } from './ship-parts';
import type { Pen } from './ship-parts';
import { drawCog, makePen } from './ship-types';

/** The kraken: a domed head with slit-pupil eyes and a hooked beak, ringed by curling arms. */

export interface ArmSpec {
  /** Where the arm enters the water. */
  x: number;
  /** Control points above the water; the last one is where the curl starts. */
  stem: Vec2[];
  /** 1 curls clockwise, -1 counter-clockwise; the suckers sit on the inside of the curl. */
  curl: 1 | -1;
  r: number;
  turns: number;
  /** Width at the water. */
  w: number;
  /** Drawn over the head. */
  front?: boolean;
}

export interface KrakenHead {
  x: number;
  /** 1 is a dome about 76 px wide. */
  size: number;
  /** Swings the crown to the right (positive) or left. */
  lean: number;
  /** Share of the dome showing above the water. */
  rise: number;
  /** Width of the dome (default 1). */
  wide?: number;
  /** Thorns along the back of the head. */
  crest?: boolean;
  iris: string;
  /** Glow around the eyes. */
  glow?: string;
  spot: string;
  beak: string;
}

export interface KrakenLook {
  skin: Skin;
  head?: KrakenHead;
  arms: ArmSpec[];
  /** A cog caught in the arms, drawn between the back and front arms. */
  cog?: { x: number; y: number; angle: number; scale: number };
}

/** The stem followed by a shrinking spiral that continues its direction. */
function armPath(stem: readonly Vec2[], curl: 1 | -1, r: number, turns: number): Vec2[] {
  const P = stem[stem.length - 1]!;
  const Q = stem[stem.length - 2]!;
  const len = Math.hypot(P[0] - Q[0], P[1] - Q[1]) || 1;
  const tx = (P[0] - Q[0]) / len;
  const ty = (P[1] - Q[1]) / len;
  const cx = P[0] - curl * ty * r;
  const cy = P[1] + curl * tx * r;
  const a0 = Math.atan2(P[1] - cy, P[0] - cx);
  const steps = Math.round(turns * 8);
  const out = [...stem];
  for (let k = 1; k <= steps; k++) {
    const s = k / steps;
    const a = a0 + curl * s * turns * TAU;
    const rr = r * lerp(1, 0.36, Math.pow(s, 0.9));
    out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return out;
}

/** Foam where an arm enters the water; the strip is deep enough to hide the arm's cut end. */
function armFoam(pen: Pen, x: number, wl: number, r: number): void {
  const { ctx, rand } = pen;
  ellipse(ctx, x, wl + 0.8, r * 1.6, r * 0.52, { fill: rgba(FOAM, 0.42) });
  foamStrip(ctx, rand, x - r * 1.25, x + r * 1.25, wl - 0.8, { depth: Math.max(5, r * 0.7), alpha: 0.95, scallop: Math.max(3.2, r * 0.6) });
  droplets(ctx, rand, x, wl - 1, 3, r * 1.3, 0.7);
}

function paintArm(pen: Pen, wl: number, arm: ArmSpec, skin: Skin, dim: number): void {
  const sk: Skin = dim > 0 ? { ...skin, base: mix(skin.base, '#0e1a26', dim), belly: mix(skin.belly, '#0e1a26', dim * 0.5) } : skin;
  const ctrl = armPath([[arm.x, wl - 1.8], ...arm.stem], arm.curl, arm.r, arm.turns);
  tentacle(pen, ctrl, arm.w, sk, { side: arm.curl, sucker: skin.belly, tip: 1.2 });
  armFoam(pen, arm.x, wl, arm.w * 0.62);
}

/** One eye; `side` is -1 for the left eye. A heavy lid slanted toward the beak makes it angry. */
function paintEye(pen: Pen, ex: number, ey: number, R: number, side: -1 | 1, skin: Skin, head: KrakenHead, k: number): void {
  const { ctx, ink } = pen;
  const T = shades(skin.base);
  if (head.glow) ellipse(ctx, ex, ey, R * 2.3, R * 2, { fill: radialGradient(ctx, ex, ey, R * 0.4, R * 2.3, [[0, rgba(head.glow, 0.6)], [1, rgba(head.glow, 0)]]) });
  ellipse(ctx, ex, ey + 0.6, R + 2.4, R + 2, { fill: rgba(T.deep, 0.55) });
  const ball = linearGradient(ctx, ex - R * 0.6, ey - R, ex + R * 0.6, ey + R, [mix(head.iris, '#ffffff', 0.55), head.iris, mix(head.iris, '#6a2410', 0.5)]);
  ellipse(ctx, ex, ey, R, R * 0.94, { fill: ball, stroke: ink, width: 1.5 * k });
  ellipse(ctx, ex - side * 0.5, ey + 0.4, R * 0.2, R * 0.72, { fill: ink });
  dot(ctx, ex - R * 0.34, ey - R * 0.3, R * 0.2, '#ffffff');
  dot(ctx, ex + R * 0.26, ey + R * 0.34, R * 0.09, rgba('#ffffff', 0.7));

  const xo = ex + side * (R + 2.5);
  const xi = ex - side * (R + 2.5);
  const yo = ey - R * 0.58;
  const yi = ey + R * 0.2;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(ex, ey, R, R * 0.94, 0, 0, TAU);
  ctx.clip();
  shape(ctx, [[xo, ey - R - 3], [xi, ey - R - 3], [xi, yi], [xo, yo]], { fill: linearGradient(ctx, ex - R, ey - R, ex + R, ey, [T.light, skin.base, T.shade]) });
  line(ctx, [[xo, yo], [xi, yi]], ink, 1.7 * k);
  ctx.restore();
  ellipse(ctx, ex, ey, R, R * 0.94, { stroke: ink, width: 1.5 * k });
  line(ctx, [[xo + side * 0.8, yo - 3], [xi, yi - 3.2]], rgba(T.deep, 0.62), 2.3 * k);
}

/** The dome, eyes and beak, with `(0, 0)` at the water line below the middle of the head. */
function paintHead(pen: Pen, wl: number, head: KrakenHead, skin: Skin): void {
  const { ctx, rand, ink, u } = pen;
  const s = head.size;
  const k = u / s;
  const T = shades(skin.base);
  const rise = head.rise;
  const lean = head.lean;
  const wide = head.wide ?? 1;
  const dome: Vec2[] = ([
    [-37, 5], [-39, -14], [-36, -36], [-27, -58], [-11, -75], [6 + lean * 10, -82], [22 + lean * 16, -72], [33 + lean * 8, -52], [39, -28], [38, -8], [36, 5],
  ] as Vec2[]).map(([x, y]) => [x * wide, y * rise] as Vec2);
  const ex = 12 + 3 * wide;
  const ey = -33 * rise;

  ctx.save();
  ctx.translate(head.x, wl);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.rect(-90, -140, 180, 140);
  ctx.clip();

  if (head.crest) {
    // Thorns along the back of the head, behind the dome.
    for (let i = 4; i <= 8; i++) {
      const a = dome[i - 1]!;
      const b = dome[i]!;
      const c = dome[i + 1]!;
      const p: Vec2 = [0.125 * a[0] + 0.75 * b[0] + 0.125 * c[0], 0.125 * a[1] + 0.75 * b[1] + 0.125 * c[1]];
      const tx = c[0] - a[0];
      const ty = c[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      const nx = ty / tl;
      const ny = -tx / tl;
      const len = (6 + 5 * Math.sin(((i - 4) / 4) * Math.PI)) * Math.min(1, rise + 0.3);
      const half = 3.2;
      thorn(ctx, [p[0] - (tx / tl) * half, p[1] - (ty / tl) * half], [p[0] + (tx / tl) * half, p[1] + (ty / tl) * half], [p[0] + nx * len + (tx / tl) * 2, p[1] + ny * len + (ty / tl) * 2], 0.1, skin.fin, ink, 1.4 * k);
    }
  }

  shape(ctx, dome, { fill: linearGradient(ctx, -30 * wide, -80 * rise, 36 * wide, 0, [[0, T.highlight], [0.28, T.light], [0.62, skin.base], [1, T.shade]]), stroke: ink, width: 2.4 * k, smooth: true });
  const eyes: Vec2[] = [[-ex, ey], [ex, ey]];
  clipped(ctx, dome, () => {
    ellipse(ctx, 27 * wide, -18 * rise, 20 * wide, 44 * rise, { fill: rgba(T.deep, 0.32), rotation: 0.18 });
    ellipse(ctx, -17 * wide, -50 * rise, 8, 20 * rise, { fill: rgba(T.highlight, 0.34), rotation: 0.5 });
    for (let i = 0; i < 20; i++) {
      const x = rand.range(-33, 33) * wide;
      const y = rand.range(-74, -8) * rise;
      if (eyes.some((e) => Math.hypot(e[0] - x, e[1] - y) < 13) || Math.abs(x) < 7) continue;
      const r = rand.range(1.2, 3.4);
      const dark = rand.chance(0.45);
      ellipse(ctx, x, y, r, r * 0.8, { fill: dark ? rgba(T.deep, 0.34) : rgba(head.spot, 0.6), rotation: rand.range(0, 3) });
    }
    // Ridges running down from the crown.
    for (const sg of [-1, 1]) {
      const ridge: Vec2[] = [[sg * 4 + lean * 6, -78 * rise], [sg * 17 * wide + lean * 4, -62 * rise], [sg * 27 * wide, -42 * rise], [sg * 31 * wide, -22 * rise]];
      line(ctx, ridge, rgba(T.deep, 0.5), 1.6 * k, { smooth: true });
      line(ctx, ridge.map(([x, y]) => [x - sg * 1.3, y + 0.6] as Vec2), rgba(T.highlight, 0.4), 1 * k, { smooth: true });
    }
  }, true);

  paintEye(pen, -ex, ey, 9.4, -1, skin, head, k);
  paintEye(pen, ex, ey, 9.4, 1, skin, head, k);

  // Mouth and hooked beak.
  const by = ey + 12;
  shape(ctx, [[-7, by], [7, by], [8, by + 11], [0, by + 17], [-8, by + 11]], { fill: '#2a1218', smooth: true });
  const beak: Vec2[] = [[-5.8, by - 1], [5.8, by - 1], [6.4, by + 6], [2.8, by + 13], [0.6, by + 17.5], [-1, by + 13], [-5.2, by + 8]];
  shape(ctx, beak, { fill: linearGradient(ctx, -6, by, 6, by + 16, [mix(head.beak, '#ffffff', 0.4), head.beak, mix(head.beak, '#3a2410', 0.5)]), stroke: ink, width: 1.3 * k, smooth: true });
  line(ctx, [[-3.6, by + 1.2], [-3.2, by + 6]], rgba('#ffffff', 0.55), 1 * k);
  line(ctx, [[-4.6, by + 7], [-0.6, by + 10.4]], rgba(ink, 0.45), 0.8 * k);
  ctx.restore();
}

/** A kraken rising from the sea; the water line is at 80 % of the height. */
export function drawKraken(pen: Pen, w: number, h: number, look: KrakenLook): void {
  const { ctx, rand } = pen;
  const wl = Math.round(h * 0.8);
  const head = look.head;
  const hx = head?.x ?? w / 2;
  const hs = head?.size ?? 0.8;

  waterShadow(ctx, hx, wl + 3, 54 * hs, 9, 0.3);
  ripple(ctx, hx, wl + 4, 52 * hs, 11, { alpha: 0.36, rings: 2, width: 1 });

  for (const arm of look.arms.filter((a) => !a.front)) paintArm(pen, wl, arm, look.skin, 0.16);

  const cog = look.cog;
  if (cog) {
    ctx.save();
    ctx.translate(cog.x, cog.y);
    ctx.rotate(cog.angle);
    ctx.scale(cog.scale, cog.scale);
    drawCog(
      makePen(ctx, rand, cog.scale),
      { hull: WOOD.oak, cloth: CLOTH.cream, stripes: { a: CLOTH.red, b: CLOTH.cream, count: 6 }, flag: CLOTH.red, flagStripe: CLOTH.cream },
    );
    ctx.restore();
  }

  if (head) {
    paintHead(pen, wl, head, look.skin);
    foamStrip(ctx, rand, hx - 41 * hs, hx + 41 * hs, wl - 0.6, { depth: 4.4 * hs, alpha: 0.95, scallop: 6 });
    droplets(ctx, rand, hx, wl - 2, 4, 40 * hs, 0.8);
  }

  for (const arm of look.arms.filter((a) => a.front)) paintArm(pen, wl, arm, look.skin, 0);
}
