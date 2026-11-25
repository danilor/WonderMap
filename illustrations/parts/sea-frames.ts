import { mix, rgba } from '../kit/colors';
import { dot, ellipse, line, linearGradient, radialGradient, shades, shape } from '../kit/draw';
import { TAU } from '../kit/math';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';

/** Flat map ornaments: a ribbon banner, empty title cartouches and scale bars. */

const INK = '#2a2015';
const PAPER = '#ead9a8';
const GOLD = '#d8aa45';

/** A ribbon banner with swallow-tailed ends folded behind a bowed band, in a [240, 84] box. */
export function drawBanner(ctx: Ctx2D, base: string): void {
  const t = shades(base);
  const d = shades(mix(base, '#160d08', 0.4));
  const H = 36;
  const ytop = (x: number): number => 18 - 5 * Math.sin((Math.PI * (x - 50)) / 140);

  for (const s of [1, -1]) {
    const X = (x: number): number => (s === 1 ? x : 240 - x);
    shape(ctx, [[X(8), 30], [X(68), 43], [X(68), 79], [X(8), 68], [X(23), 49]], { fill: linearGradient(ctx, 0, 30, 0, 79, [d.light, d.base, d.shade]), stroke: INK, width: 1.7, join: 'miter' });
    shape(ctx, [[X(50), ytop(50) + H - 0.5], [X(68), ytop(68) + H], [X(68), 79]], { fill: rgba('#000000', 0.34), stroke: INK, width: 1.2, join: 'miter' });
    line(ctx, [[X(13), 38], [X(46), 45]], rgba(d.highlight, 0.5), 1);
  }

  const top: Vec2[] = [];
  const bot: Vec2[] = [];
  for (let x = 50; x <= 190.01; x += 5) {
    top.push([x, ytop(x)]);
    bot.push([x, ytop(x) + H]);
  }
  shape(ctx, [...top, ...[...bot].reverse()], { fill: linearGradient(ctx, 0, 12, 0, 58, [t.highlight, t.light, t.base, t.shade]), stroke: INK, width: 1.8, join: 'round' });
  shape(ctx, top.map(([x, y]): Vec2 => [x, y + 4.2]), { stroke: rgba(t.highlight, 0.85), width: 1, closed: false, dash: [3.4, 2.6] });
  shape(ctx, bot.map(([x, y]): Vec2 => [x, y - 4.2]), { stroke: rgba(d.deep, 0.55), width: 1, closed: false, dash: [3.4, 2.6] });
  shape(ctx, top.map(([x, y]): Vec2 => [x, y + 1.1]), { stroke: rgba('#ffffff', 0.35), width: 1.4, closed: false });
}

export type CartoucheKind = 'scroll' | 'plaque' | 'oval';

/** A rectangle whose corners are cut away by concave quarter circles. */
function cutRect(x0: number, y0: number, x1: number, y1: number, r: number): Vec2[] {
  const out: Vec2[] = [];
  const arc = (cx: number, cy: number, a0: number, a1: number): void => {
    for (let i = 0; i <= 8; i++) {
      const a = a0 + ((a1 - a0) * i) / 8;
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  arc(x0, y0, 0, Math.PI / 2);
  arc(x0, y1, -Math.PI / 2, 0);
  arc(x1, y1, Math.PI, Math.PI * 1.5);
  arc(x1, y0, Math.PI / 2, Math.PI);
  return out;
}

/** A vertical paper roll with a spiral end cap; `dir` is the side of the sheet it sits on. */
function roll(ctx: Ctx2D, x: number, y0: number, y1: number, rx: number, dir: 1 | -1): void {
  const p = shades(PAPER);
  const body = linearGradient(ctx, x - rx, 0, x + rx, 0, dir === 1 ? [p.light, p.highlight, p.base, p.shade] : [p.highlight, p.light, p.base, p.shade]);
  shape(ctx, [[x - rx, y0], [x + rx, y0], [x + rx, y1], [x - rx, y1]], { fill: body, stroke: INK, width: 1.7, join: 'miter' });
  ellipse(ctx, x, y1, rx, rx * 0.36, { fill: p.shade, stroke: INK, width: 1.7 });
  ellipse(ctx, x, y0, rx, rx * 0.36, { fill: p.highlight, stroke: INK, width: 1.7 });
  ellipse(ctx, x, y0, rx * 0.62, rx * 0.22, { stroke: rgba(INK, 0.7), width: 1 });
  ellipse(ctx, x, y0, rx * 0.28, rx * 0.1, { stroke: rgba(INK, 0.7), width: 0.9 });
  line(ctx, [[x - rx * 0.4, y0 + 4], [x - rx * 0.4, y1 - 4]], rgba('#ffffff', 0.35), 1.2);
}

function speckle(ctx: Ctx2D, rand: Rng, x0: number, y0: number, x1: number, y1: number, n: number): void {
  for (let i = 0; i < n; i++) dot(ctx, rand.range(x0, x1), rand.range(y0, y1), rand.range(0.4, 1.1), rgba('#7a5a2a', rand.range(0.1, 0.28)));
}

/** An empty ornate title plate, in a [280, 120] box. */
export function drawCartouche(ctx: Ctx2D, rand: Rng, kind: CartoucheKind): void {
  const p = shades(PAPER);
  if (kind === 'scroll') {
    const wave = (x: number, k: number): number => 1.8 * Math.sin(x * 0.085 + k);
    const top: Vec2[] = [];
    const bot: Vec2[] = [];
    for (let x = 30; x <= 250.01; x += 5) {
      top.push([x, 24 + wave(x, 0)]);
      bot.push([x, 96 + wave(x, 2)]);
    }
    shape(ctx, [...top, ...[...bot].reverse()], { fill: linearGradient(ctx, 30, 20, 250, 100, [p.highlight, p.light, p.base]), stroke: INK, width: 1.7, join: 'round' });
    speckle(ctx, rand, 40, 30, 240, 90, 50);
    shape(ctx, cutRect(46, 36, 234, 84, 7), { stroke: rgba('#6a4a22', 0.6), width: 1.2 });
    shape(ctx, cutRect(51, 41, 229, 79, 5), { stroke: rgba('#6a4a22', 0.35), width: 0.8 });
    roll(ctx, 24, 17, 103, 11, 1);
    roll(ctx, 256, 17, 103, 11, -1);
    return;
  }
  if (kind === 'plaque') {
    const wood = shades('#7a5230');
    shape(ctx, cutRect(12, 10, 268, 110, 15), { fill: linearGradient(ctx, 0, 10, 0, 110, [wood.light, wood.base, wood.shade]), stroke: INK, width: 2, join: 'miter' });
    for (let i = 0; i < 9; i++) line(ctx, [[rand.range(24, 70), 10 + i * 12.5], [rand.range(200, 256), 10 + i * 12.5 + rand.range(-1, 1)]], rgba(wood.deep, 0.22), 0.8);
    shape(ctx, cutRect(19, 17, 261, 103, 10), { fill: linearGradient(ctx, 20, 18, 260, 102, [p.highlight, p.light, p.base]), stroke: INK, width: 1.5, join: 'miter' });
    speckle(ctx, rand, 30, 26, 250, 94, 46);
    shape(ctx, cutRect(26, 24, 254, 96, 7), { stroke: rgba(GOLD, 0.95), width: 1.6 });
    shape(ctx, cutRect(26, 24, 254, 96, 7), { stroke: rgba(INK, 0.55), width: 0.6 });
    for (const [x, y] of [[12, 10], [268, 10], [12, 110], [268, 110]] as const) {
      dot(ctx, x, y, 4.6, INK);
      dot(ctx, x, y, 3.4, GOLD);
      dot(ctx, x - 0.9, y - 0.9, 1.1, '#fff1b8');
    }
    for (const x of [140]) {
      shape(ctx, [[x - 9, 10], [x, 4], [x + 9, 10], [x, 16]], { fill: GOLD, stroke: INK, width: 1.2 });
      shape(ctx, [[x - 9, 110], [x, 104], [x + 9, 110], [x, 116]], { fill: GOLD, stroke: INK, width: 1.2 });
    }
    return;
  }
  // oval
  const cx = 140;
  const cy = 60;
  const frame = shades('#6d4a2a');
  ellipse(ctx, cx + 2, cy + 3, 126, 54, { fill: rgba('#000000', 0.22) });
  ellipse(ctx, cx, cy, 126, 54, { fill: linearGradient(ctx, 0, cy - 54, 0, cy + 54, [frame.light, frame.base, frame.shade]), stroke: INK, width: 2 });
  ellipse(ctx, cx, cy, 112, 41, { fill: linearGradient(ctx, 0, cy - 42, 0, cy + 42, [p.highlight, p.light, p.base]), stroke: INK, width: 1.6 });
  speckle(ctx, rand, 60, 36, 220, 84, 40);
  ellipse(ctx, cx, cy, 106, 36, { stroke: rgba(GOLD, 0.95), width: 1.5 });
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * TAU;
    const x = cx + Math.cos(a) * 119;
    const y = cy + Math.sin(a) * 47.5;
    dot(ctx, x, y, 2.3, INK);
    dot(ctx, x, y, 1.6, i % 2 ? GOLD : '#f3d98a');
  }
  for (const s of [-1, 1]) {
    const x = cx + s * 133;
    shape(ctx, [[x - 6 * s, cy], [x, cy - 8], [x + 6 * s, cy], [x, cy + 8]], { fill: radialGradient(ctx, x - 1, cy - 2, 0, 9, ['#fff1b8', GOLD, '#8c6a22']), stroke: INK, width: 1.3 });
  }
  for (const y of [7, 113]) {
    const gem: Vec2[] = [[cx - 9, y], [cx, y - 6], [cx + 9, y], [cx, y + 6]];
    shape(ctx, gem, { fill: radialGradient(ctx, cx - 2, y - 2, 0, 10, ['#fff1b8', GOLD, '#8c6a22']), stroke: INK, width: 1.2 });
  }
}

export type ScaleKind = 'checker' | 'double' | 'arrow';

/** A scale bar without numbers (they depend on the map), in a [220, 36] box. */
export function drawScaleBar(ctx: Ctx2D, kind: ScaleKind): void {
  const x0 = 14;
  const x1 = 206;
  const seg = (x1 - x0) / 6;
  const tick = (x: number, ya: number, yb: number, w = 1.3): void => {
    line(ctx, [[x, ya], [x, yb]], INK, w, { cap: 'butt' });
  };
  if (kind === 'checker') {
    const y0 = 17;
    const y1 = 25;
    shape(ctx, [[x0 + 1.6, y0 + 2], [x1 + 1.6, y0 + 2], [x1 + 1.6, y1 + 2], [x0 + 1.6, y1 + 2]], { fill: rgba('#000000', 0.22) });
    for (let i = 0; i < 6; i++) {
      const a = x0 + i * seg;
      shape(ctx, [[a, y0], [a + seg, y0], [a + seg, y1], [a, y1]], { fill: i % 2 ? linearGradient(ctx, 0, y0, 0, y1, ['#4a3a28', '#241a10']) : linearGradient(ctx, 0, y0, 0, y1, ['#fbf1d0', PAPER]), stroke: INK, width: 1.4, join: 'miter' });
    }
    for (let i = 0; i <= 6; i++) tick(x0 + i * seg, y0 - (i % 3 === 0 ? 7 : 4), y0);
    for (let i = 0; i < 12; i++) tick(x0 + (i + 0.5) * (seg / 2), y1, y1 + 2.6, 0.9);
    for (const x of [x0, x1]) shape(ctx, [[x - 3.4, y0 - 7], [x, y0 - 11], [x + 3.4, y0 - 7], [x, y0 - 3.6]], { fill: GOLD, stroke: INK, width: 1 });
    return;
  }
  if (kind === 'double') {
    const y0 = 13;
    const mid = 19;
    const y1 = 25;
    shape(ctx, [[x0 + 1.6, y0 + 2], [x1 + 1.6, y0 + 2], [x1 + 1.6, y1 + 2], [x0 + 1.6, y1 + 2]], { fill: rgba('#000000', 0.2) });
    for (let i = 0; i < 6; i++) {
      const a = x0 + i * seg;
      shape(ctx, [[a, y0], [a + seg, y0], [a + seg, mid], [a, mid]], { fill: i % 2 ? '#2f2418' : '#f4e8c0', stroke: INK, width: 1.2, join: 'miter' });
      shape(ctx, [[a, mid], [a + seg, mid], [a + seg, y1], [a, y1]], { fill: i % 2 ? '#f4e8c0' : '#2f2418', stroke: INK, width: 1.2, join: 'miter' });
    }
    for (let i = 0; i <= 12; i++) tick(x0 + i * (seg / 2), y1, y1 + (i % 2 ? 3 : 6), i % 2 ? 0.9 : 1.2);
    return;
  }
  const y = 18;
  line(ctx, [[x0 + 1, y + 1.6], [x1 - 1, y + 1.6]], rgba('#000000', 0.2), 2.4);
  line(ctx, [[x0 + 4, y], [x1 - 4, y]], INK, 2.2, { cap: 'butt' });
  for (const [sx, a, b] of [[x0, x0 + 12, 1], [x1, x1 - 12, -1]] as const) {
    shape(ctx, [[sx, y], [a, y - 5.4], [a + b * 3, y], [a, y + 5.4]], { fill: INK, stroke: INK, width: 1, join: 'miter' });
  }
  for (let i = 1; i < 6; i++) {
    const x = x0 + i * seg;
    tick(x, y - (i === 3 ? 8 : 5), y + (i === 3 ? 8 : 5), i === 3 ? 1.8 : 1.3);
  }
  shape(ctx, [[110 - 5, y], [110, y - 4], [110 + 5, y], [110, y + 4]], { fill: GOLD, stroke: INK, width: 1.1 });
  for (let i = 0; i < 12; i++) if (i !== 5 && i !== 6) tick(x0 + 12 + ((x1 - x0 - 24) * (i + 0.5)) / 12, y + 8, y + 10.5, 0.9);
}
