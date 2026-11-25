import { rgba } from '../kit/colors';
import { ellipse, line, linearGradient, radialGradient, shades, shape } from '../kit/draw';
import { TAU } from '../kit/math';
import type { Vec2 } from '../kit/types';
import { drawFlag } from './building';
import { INK, shadowOf } from './settle-geom';
import type { Stage } from './settle-geom';

/** Camp props: tents, pavilions and campfires. Positions are grid coordinates like the other `settle-*` parts. */

export interface TentOpts {
  /** Length along the ridge and width across it. */
  a?: number;
  b?: number;
  h?: number;
  color?: string;
  trim?: string;
  ridge?: 'u' | 'v';
  flag?: string;
  /** Dark door opening on the gable end that faces the viewer. */
  door?: boolean;
}

/** A ridge tent: two sloping canvas panels, a gable end with a door flap and a trimmed hem. */
export function addTent(st: Stage, u: number, v: number, o: TentOpts = {}): void {
  const { ctx, iso, scene } = st;
  const a = o.a ?? 11;
  const b = o.b ?? 9;
  const h = o.h ?? 8;
  const ridge = o.ridge ?? 'u';
  const color = o.color ?? '#d8c9a4';
  const trim = o.trim ?? '#b2503a';
  const P = (s: number, t: number, z = 0): Vec2 => (ridge === 'u' ? iso(u + s, v + t, z) : iso(u + t, v + s, z));
  scene.shadow(shadowOf([P(0, 0), P(a, 0), P(a, b), P(0, b)], h * 0.8, 0.5));
  scene.add(u + v + (a + b) / 2, () => {
    const tone = shades(color);
    // With the ridge along u the slope faces the shaded side and the gable the lit side; along v it is the other way round.
    const slopeTone = ridge === 'v' ? tone.light : tone.base;
    const endTone = ridge === 'v' ? tone.base : tone.light;
    const slope = [P(0, 0), P(a, 0), P(a, b / 2, h), P(0, b / 2, h)];
    const end = [P(0, 0), P(0, b), P(0, b / 2, h)];
    const topY = Math.min(...slope.map((p) => p[1]));
    const botY = Math.max(...slope.map((p) => p[1]));
    shape(ctx, slope, { fill: linearGradient(ctx, 0, topY, 0, botY, [[0, slopeTone], [1, tone.shade]]), stroke: INK, width: 0.9 });
    shape(ctx, end, { fill: linearGradient(ctx, 0, topY, 0, botY, [[0, endTone], [1, tone.base]]), stroke: INK, width: 0.9 });
    // Seams between the canvas panels.
    const panels = Math.max(2, Math.round(a / 3.4));
    for (let i = 1; i < panels; i++) line(ctx, [P((a * i) / panels, b / 2, h), P((a * i) / panels, 0, 0)], rgba(tone.deep, 0.4), 0.6);
    // Hem.
    const k = 0.17;
    shape(ctx, [P(0, 0), P(a, 0), P(a, (b / 2) * k, h * k), P(0, (b / 2) * k, h * k)], { fill: trim, stroke: rgba(INK, 0.8), width: 0.6 });
    shape(ctx, [P(0, 0), P(0, b), P(0, b - (b / 2) * k, h * k), P(0, (b / 2) * k, h * k)], { fill: shades(trim).light, stroke: rgba(INK, 0.8), width: 0.6 });
    if (o.door !== false) {
      shape(ctx, [P(0, b * 0.36), P(0, b * 0.64), P(0, b / 2, h * 0.62)], { fill: '#2a2015', stroke: INK, width: 0.6 });
      shape(ctx, [P(0, b * 0.36), P(0, b * 0.5), P(0, b / 2, h * 0.62)], { fill: rgba(tone.light, 0.9), stroke: rgba(INK, 0.8), width: 0.5 });
    }
    // Ridge poles.
    for (const s of [0, a]) line(ctx, [P(s, b / 2, h), P(s, b / 2, h + 2.4)], INK, 1.2);
    if (o.flag) {
      const [fx, fy] = P(a, b / 2, h + 2);
      drawFlag(ctx, fx, fy, 7, o.flag, INK, 1);
    }
  });
}

export interface PavilionOpts {
  s?: number;
  wallH?: number;
  roofH?: number;
  color?: string;
  trim?: string;
  flag?: string;
}

/** A square pavilion with striped walls and a peaked roof (commander's or merchant's tent). */
export function addPavilion(st: Stage, u: number, v: number, o: PavilionOpts = {}): void {
  const { ctx, iso, scene } = st;
  const s = o.s ?? 12;
  const wh = o.wallH ?? 4.6;
  const rh = o.roofH ?? 9;
  const color = o.color ?? '#efe6d2';
  const trim = o.trim ?? '#b2503a';
  const P = (x: number, y: number, z = 0): Vec2 => iso(u + x, v + y, z);
  scene.shadow(shadowOf([P(0, 0), P(s, 0), P(s, s), P(0, s)], (wh + rh) * 0.8, 0.5));
  scene.add(u + v + s, () => {
    const stripes = 4;
    const apex = P(s / 2, s / 2, wh + rh);
    for (const face of ['u', 'v'] as const) {
      const at = (t: number, z = 0): Vec2 => (face === 'u' ? P(0, s * t, z) : P(s * t, 0, z));
      const tone = face === 'u' ? 0 : 1;
      for (let i = 0; i < stripes; i++) {
        const c = i % 2 ? color : trim;
        const t = shades(c);
        const fill = tone ? t.base : t.light;
        shape(ctx, [at(i / stripes), at((i + 1) / stripes), at((i + 1) / stripes, wh), at(i / stripes, wh)], { fill, stroke: rgba(INK, 0.8), width: 0.6 });
      }
      shape(ctx, [at(0), at(1), at(1, wh), at(0, wh)], { stroke: INK, width: 0.9 });
    }
    for (const face of ['u', 'v'] as const) {
      const at = (t: number, z = 0): Vec2 => (face === 'u' ? P(0, s * t, z) : P(s * t, 0, z));
      for (let i = 0; i < stripes; i++) {
        const c = i % 2 ? trim : color;
        const t = shades(c);
        shape(ctx, [at(i / stripes, wh), at((i + 1) / stripes, wh), apex], { fill: face === 'u' ? t.highlight : t.light, stroke: rgba(INK, 0.8), width: 0.6 });
      }
      shape(ctx, [at(0, wh), at(1, wh), apex], { stroke: INK, width: 0.9 });
    }
    // Door.
    shape(ctx, [P(s * 0.4, 0), P(s * 0.6, 0), P(s * 0.6, 0, wh * 0.9), P(s * 0.4, 0, wh * 0.9)], { fill: '#2a2015', stroke: INK, width: 0.6 });
    line(ctx, [apex, [apex[0], apex[1] - 3]], INK, 1.2);
    drawFlag(ctx, apex[0], apex[1] - 2.5, 8, o.flag ?? trim, INK, 1);
  });
}

/** A campfire in a ring of stones with crossed logs and a flickering flame. */
export function addCampfire(st: Stage, u: number, v: number, size = 1): void {
  const { ctx, iso, scene, rand } = st;
  const [x, y] = iso(u, v);
  const k = size;
  const lean = rand.range(-0.5, 0.5);
  const hgt = rand.range(0.9, 1.15);
  scene.add(u + v, () => {
    ctx.save();
    ctx.fillStyle = radialGradient(ctx, x, y - 1, 1, 13 * k, [[0, 'rgba(255,190,80,0.5)'], [1, 'rgba(255,150,40,0)']]);
    ctx.beginPath();
    ctx.ellipse(x, y, 14 * k, 7.5 * k, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    for (let i = 0; i < 9; i++) {
      const th = (i / 9) * TAU + 0.3;
      const sx = x + Math.cos(th) * 3.9 * k;
      const sy = y + Math.sin(th) * 2 * k;
      ellipse(ctx, sx, sy, 1.15 * k, 0.85 * k, { fill: i % 2 ? '#8d887d' : '#aaa497', stroke: INK, width: 0.6 });
    }
    ellipse(ctx, x, y, 2.9 * k, 1.4 * k, { fill: '#2b2118' });
    line(ctx, [[x - 3.2 * k, y - 0.6 * k], [x + 3.2 * k, y + 0.9 * k]], INK, 2.6 * k);
    line(ctx, [[x - 3.2 * k, y - 0.6 * k], [x + 3.2 * k, y + 0.9 * k]], '#7b5634', 1.5 * k);
    line(ctx, [[x - 2.8 * k, y + 1 * k], [x + 2.8 * k, y - 0.9 * k]], INK, 2.6 * k);
    line(ctx, [[x - 2.8 * k, y + 1 * k], [x + 2.8 * k, y - 0.9 * k]], '#94673e', 1.5 * k);
    const flame = (w: number, hh: number, fill: string, stroke: string | null): void => {
      const f = (p: number): number => p * k;
      ctx.beginPath();
      ctx.moveTo(x - f(w), y - f(0.4));
      ctx.bezierCurveTo(x - f(w * 1.1), y - f(hh * 0.45), x - f(w * 0.3 - lean * 2), y - f(hh * 0.6), x + f(lean * 3), y - f(hh));
      ctx.bezierCurveTo(x + f(w * 0.4), y - f(hh * 0.55), x + f(w * 1.1), y - f(hh * 0.4), x + f(w), y - f(0.4));
      ctx.quadraticCurveTo(x, y + f(1.2), x - f(w), y - f(0.4));
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
    };
    flame(3, 10.5 * hgt, '#e8641e', '#7a2e0e');
    flame(2.1, 8 * hgt, '#ffb13b', null);
    flame(1.1, 5 * hgt, '#fff0a0', null);
  });
}
