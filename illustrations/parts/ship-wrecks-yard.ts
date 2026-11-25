import { mix, rgba } from '../kit/colors';
import { ellipse, line, linearGradient, radialGradient, shades, shape, softBlob } from '../kit/draw';
import type { Vec2 } from '../kit/types';
import type { Pen } from './ship-parts';
import { WOOD, buildHull, paintBarrel, paintRope } from './ship-parts';
import { embers, smoke, weathered } from './ship-wreck';
import { HULLS, notch, paintPiece, ribRow } from './ship-wrecks';
import { anchor, landBarrel, landPlank, sandPatch, scaled } from './ship-wrecks-shore';

/** A ruined shipyard: a half-built hull on its slipway, a collapsing scaffold and crane, and stacks of timber. */

export interface YardLook {
  stage: 'half' | 'ribs' | 'burnt' | 'overgrown';
  ground: string;
  timber: string;
  /** 0 = scaffold and crane still stand ... 1 = they have come down. */
  fallen: number;
}

/** A squared timber with an ink outline and a lit left edge. */
function beam(pen: Pen, a: Vec2, b: Vec2, w: number, wood: string): void {
  const { ctx, ink } = pen;
  const t = shades(wood);
  line(ctx, [a, b], ink, w + 1.7, { cap: 'butt' });
  line(ctx, [a, b], t.base, w, { cap: 'butt' });
  line(ctx, [[a[0] - w * 0.2, a[1] - 0.2], [b[0] - w * 0.2, b[1] - 0.2]], t.highlight, Math.max(0.6, w * 0.3), { cap: 'butt' });
}

/** The jagged splintered top of a snapped timber. */
function splinters(pen: Pen, p: Vec2, w: number, wood: string): void {
  const t = shades(wood);
  shape(pen.ctx, [[p[0] - w / 2 - 0.4, p[1] + 1], [p[0] - w * 0.2, p[1] - 3.2], [p[0] + w * 0.05, p[1] - 0.6], [p[0] + w * 0.32, p[1] - 3.8], [p[0] + w / 2 + 0.4, p[1] + 1]], { fill: t.light, stroke: pen.ink, width: 0.9 });
}

function groundShadow(pen: Pen, x: number, y: number, rx: number): void {
  ellipse(pen.ctx, x + 1.5, y + 1, rx, 1.4, { fill: rgba('#4a3a20', 0.4) });
}

/** Cross-ties and two greased rails the hull was built on. */
function slipway(pen: Pen, wood: string, x0: number, x1: number, y: number): void {
  const { ctx, ink } = pen;
  const t = shades(wood);
  for (let x = x0; x < x1; x += 9.4) {
    shape(ctx, [[x, y - 3], [x + 4.4, y - 3.2], [x + 4.4, y + 5.4], [x, y + 5.6]], { fill: linearGradient(ctx, x, 0, x + 4.4, 0, [t.light, t.base]), stroke: ink, width: 0.9, join: 'miter' });
  }
  for (const ry of [y - 0.4, y + 3.6]) {
    line(ctx, [[x0 - 3, ry], [x1 + 3, ry]], ink, 3.4, { cap: 'butt' });
    line(ctx, [[x0 - 3, ry], [x1 + 3, ry]], '#6a6258', 2, { cap: 'butt' });
    line(ctx, [[x0 - 3, ry - 0.5], [x1 + 3, ry - 0.5]], '#a29a8c', 0.7, { cap: 'butt' });
  }
}

function ladder(pen: Pen, a: Vec2, b: Vec2, wood: string): void {
  const { ctx, ink } = pen;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const nx = (-dy / len) * 2.7;
  const ny = (dx / len) * 2.7;
  for (const s of [-1, 1]) beam(pen, [a[0] + nx * s, a[1] + ny * s], [b[0] + nx * s, b[1] + ny * s], 1.5, wood);
  for (let k = 0.12; k < 0.95; k += 0.14) {
    const x = a[0] + dx * k;
    const y = a[1] + dy * k;
    line(ctx, [[x - nx, y - ny], [x + nx, y + ny]], ink, 1.9, { cap: 'butt' });
    line(ctx, [[x - nx, y - ny], [x + nx, y + ny]], shades(wood).light, 1, { cap: 'butt' });
  }
}

interface Post {
  x: number;
  h: number;
  lean: number;
}

/** A timber scaffold: posts, two working levels with a plank deck, and cross braces. Breaks up as `fallen` grows. */
function scaffold(pen: Pen, look: YardLook, wood: string, xs: readonly number[], base: number, tall: number, w: number): void {
  const { ctx, rand, ink } = pen;
  const t = shades(wood);
  const posts: Post[] = xs.map((x, i) => {
    const snapped = rand.chance(look.fallen * 0.5);
    return { x, h: snapped ? rand.range(14, 30) : rand.range(tall - 8, tall) - (i % 2) * 4, lean: rand.range(-0.06, 0.06) * (0.4 + look.fallen * 2) };
  });
  const at = (p: Post, k: number): Vec2 => [p.x + p.lean * k, base - k];
  const levels = [tall * 0.38, tall * 0.74];
  for (const p of posts) groundShadow(pen, p.x, base, w * 1.2);
  for (const p of posts) {
    beam(pen, [p.x, base], at(p, p.h), w, wood);
    if (p.h < tall - 10) splinters(pen, at(p, p.h), w, wood);
  }
  levels.forEach((k, li) => {
    for (let i = 0; i + 1 < posts.length; i++) {
      const a = posts[i]!;
      const b = posts[i + 1]!;
      if (a.h < k + 3 || b.h < k + 3 || rand.chance(look.fallen * 0.4)) continue;
      const pa = at(a, k);
      const pb = at(b, k);
      if (li === 0) {
        shape(ctx, [[pa[0], pa[1] - 2.4], [pb[0], pb[1] - 2.4], [pb[0], pb[1] + 1.6], [pa[0], pa[1] + 1.6]], { fill: linearGradient(ctx, 0, pa[1] - 2, 0, pa[1] + 2, [t.light, t.base]), stroke: ink, width: 1, join: 'miter' });
        for (let x = pa[0] + 5.6; x < pb[0] - 2; x += 5.6) line(ctx, [[x, pa[1] - 2], [x, pa[1] + 1.2]], rgba(ink, 0.55), 0.7);
      } else {
        beam(pen, pa, pb, 2.2, wood);
      }
      if (li === 0 && i % 2 === 0 && b.h > levels[1]! + 3) beam(pen, pa, at(b, levels[1]!), 1.5, wood);
    }
  });
  const first = posts[0]!;
  if (look.fallen < 0.6) ladder(pen, [first.x - 11, base + 1], at(first, levels[1]! - 3), wood);
}

/** A derrick: an A-frame mast, an inclined boom with a topping lift, and a load line. */
function crane(pen: Pen, look: YardLook, wood: string, x: number, base: number): void {
  const { ctx, ink } = pen;
  const down = look.fallen > 0.6;
  const top: Vec2 = [x + (down ? -2 : 2), base - 98];
  groundShadow(pen, x - 7, base + 1, 4);
  groundShadow(pen, x + 7, base + 2, 4);
  paintRope(pen, [top[0], top[1] + 6], [x - 36, base - 2], { alpha: 0.75, sag: 2 });
  beam(pen, [x - 8, base + 1], top, 3.2, wood);
  beam(pen, [x + 8, base + 2], top, 3.2, wood);
  beam(pen, [x - 5, base - 36], [x + 5.4, base - 36], 1.8, wood);
  beam(pen, [x - 2.7, base - 66], [x + 3.2, base - 66], 1.6, wood);
  const pivot: Vec2 = [x + 0.5, base - 38];
  if (!down) {
    const tip: Vec2 = [x + 66, base - 86];
    beam(pen, pivot, tip, 3, wood);
    paintRope(pen, top, tip, { alpha: 0.85, sag: 1 });
    const hook: Vec2 = [tip[0], tip[1] + 30];
    line(ctx, [tip, hook], rgba(ink, 0.85), 0.9);
    ellipse(ctx, tip[0], tip[1], 2.2, 2.2, { fill: '#6a6258', stroke: ink, width: 1 });
    for (const dx of [-9, 0, 9]) line(ctx, [hook, [tip[0] + dx, hook[1] + 9]], rgba(ink, 0.6), 0.6);
    for (let i = 0; i < 3; i++) beam(pen, [tip[0] - 12, hook[1] + 9 + i * 2.6], [tip[0] + 12, hook[1] + 9 + i * 2.6], 2.2, i % 2 ? WOOD.pale : WOOD.oak);
  } else {
    const cut: Vec2 = [x + 22, base - 62];
    beam(pen, pivot, cut, 3, wood);
    splinters(pen, cut, 3, wood);
    beam(pen, [x + 40, base + 8], [x + 82, base + 17], 3, wood);
    paintRope(pen, [x + 22, base - 60], [x + 46, base + 7], { alpha: 0.6, sag: 6 });
    ellipse(pen.ctx, x + 84, base + 18, 2.2, 2.2, { fill: '#6a6258', stroke: ink, width: 1 });
  }
}

/** A stack of seasoned planks on bearers. */
function plankStack(pen: Pen, x: number, y: number, wood: string, layers: number): void {
  const { ctx, rand, ink } = pen;
  const w = 27;
  ellipse(ctx, x + 1.5, y + 1.2, w * 0.58, 2.4, { fill: rgba('#4a3a20', 0.4) });
  for (const bx of [-9, 9]) shape(ctx, [[x + bx - 2.6, y - 2.2], [x + bx + 2.6, y - 2.2], [x + bx + 2.6, y + 0.6], [x + bx - 2.6, y + 0.6]], { fill: shades(wood).shade, stroke: ink, width: 0.9, join: 'miter' });
  for (let i = 0; i < layers; i++) {
    const yy = y - 2.2 - i * 3.4;
    const j = rand.range(-1.4, 1.4);
    const t = shades(i % 2 ? mix(wood, WOOD.pale, 0.4) : wood);
    shape(ctx, [[x - w / 2 + j, yy - 3.2], [x + w / 2 + j, yy - 3.2], [x + w / 2 + j + 0.8, yy], [x - w / 2 + j - 0.8, yy]], { fill: linearGradient(ctx, 0, yy - 3.2, 0, yy, [t.light, t.base]), stroke: ink, width: 0.95, join: 'miter' });
    line(ctx, [[x - w / 2 + j + 1.4, yy - 1.9], [x + w / 2 + j - 2, yy - 1.9]], rgba(t.deep, 0.35), 0.5);
  }
}

function bush(pen: Pen, x: number, y: number, r: number): void {
  const { ctx, rand, ink } = pen;
  const g = shades('#5f8a43');
  ellipse(ctx, x + 1, y + 1, r * 1.2, r * 0.4, { fill: rgba('#2a3a1a', 0.3) });
  for (let i = 0; i < 4; i++) {
    const bx = x + (i - 1.5) * r * 0.55 + rand.range(-1, 1);
    const by = y - r * (0.5 + 0.18 * (i % 2));
    ellipse(ctx, bx, by, r * 0.7, r * 0.62, { fill: radialGradient(ctx, bx - r * 0.2, by - r * 0.25, 0, r * 0.8, [g.highlight, g.base, g.shade]), stroke: ink, width: 0.9 });
  }
}

function tuft(pen: Pen, x: number, y: number, s: number): void {
  const g = shades('#6b9a3e');
  for (let i = -2; i <= 2; i++) line(pen.ctx, [[x + i * 1.2 * s, y], [x + i * 2.5 * s, y - (6 + (2 - Math.abs(i)) * 2) * s]], i % 2 ? g.shade : g.base, 1.3, { cap: 'round' });
}

export function drawShipyard(pen: Pen, look: YardLook): void {
  const { ctx, rand } = pen;
  const burnt = look.stage === 'burnt';
  const scaf = burnt ? '#3d3229' : weathered(WOOD.oak, 0.38);
  const hullWood = weathered(look.timber, burnt ? 0.4 : look.stage === 'ribs' ? 0.15 : 0.3);

  sandPatch(pen, 0, 9, 101, 15, look.ground);
  if (burnt) softBlob(ctx, 4, 12, 88, 11, '#1d1814', 0.5);
  slipway(pen, weathered(WOOD.dark, 0.3), -88, 88, 12);

  // The far row of the scaffold stands behind the hull.
  scaffold(pen, { ...look, fallen: look.fallen * 0.6 }, mix(scaf, '#2a1a10', 0.3), [-34, 2, 38], 4, 56, 2.8);

  scaled(pen, 1.2, (pn) => {
    const hull = buildHull(HULLS.galleon);
    const { rand: r } = pn;
    const paint =
      look.stage === 'ribs'
        ? { wood: hullWood, planks: 5, gap: (t: number) => (t < 0.1 ? 0.55 : 0.985), ribs: ribRow(r, 0.04, 0.97, 15, [-0.22, 0.04], 0.5), holes: 0, moss: 0.05 }
        : look.stage === 'burnt'
          ? { wood: hullWood, planks: 5, gap: notch(0.18, 0.92, 0.88), ribs: ribRow(r, 0.22, 0.92, 9, [-0.2, 0.05], 0.8), char: 0.85, holes: 1, moss: 0 }
          : { wood: hullWood, planks: 5, gap: (t: number) => (t < 0.4 ? 0 : t < 0.72 ? 0.12 + 0.8 * Math.pow((t - 0.4) / 0.32, 1.2) : 0.97), ribs: ribRow(r, 0.4, 0.98, 12, [-0.2, 0.04], 0.5), holes: 0, moss: look.stage === 'overgrown' ? 0.7 : 0.15 };
    paintPiece(pn, { hull, dy: 2, angle: 0.03, paint });
  });

  // Shores propping the hull, then the near scaffold and the crane.
  for (const sx of [-52, -14, 28]) beam(pen, [sx, 18], [sx + 9, 2], 2.2, mix(scaf, WOOD.pale, 0.2));
  scaffold(pen, look, scaf, [-40, -6, 28, 62], 21, 62, 3.2);
  crane(pen, look, scaf, -94, 17);

  plankStack(pen, 82, 20, weathered(WOOD.pale, 0.35), 4);
  plankStack(pen, 70, 26, weathered(WOOD.oak, 0.3), 2);
  landBarrel(pen, -66, 27, 7, 1.2);
  paintBarrel(pen, -52, 27, 8, 9, weathered(WOOD.oak, 0.3));
  landPlank(pen, 24, 27, 18, -0.12, WOOD.pale);
  landPlank(pen, 42, 29, 13, 0.3, WOOD.oak);
  anchor(pen, -78, 21, 0.85, -0.25);

  if (burnt) {
    smoke(pen, -22, -24, 34);
    smoke(pen, 38, -14, 28);
    embers(pen, [[-24, -20], [-8, -15], [30, -11], [44, -8], [-40, -8]]);
  }
  if (look.stage === 'overgrown') {
    bush(pen, -86, 26, 10);
    bush(pen, 96, 15, 8);
    for (let i = 0; i < 9; i++) tuft(pen, rand.range(-96, 96), rand.range(18, 32), rand.range(0.8, 1.2));
  }
}
