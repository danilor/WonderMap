import { mix, rgba } from '../kit/colors';
import { clipped, ellipse, line, linearGradient, radialGradient, shades, shape, softBlob, taper, type Shades } from '../kit/draw';
import { TAU } from '../kit/math';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { drawHouse } from './building';
import { INK, leafBlob, quadPts } from './nature-common';
import { FOLIAGE, drawRoundTree } from './tree';

/* ------------------------------------------------------------------------------------ */
/* Field geometry                                                                       */
/* ------------------------------------------------------------------------------------ */

export interface Quad {
  tl: Vec2;
  tr: Vec2;
  br: Vec2;
  bl: Vec2;
}

/** A slightly sheared rectangle: `skew` shifts the back edge right, `tilt` drops the right side. */
export function fieldQuad(cx: number, cy: number, w: number, h: number, skew = 0, tilt = 0): Quad {
  return {
    tl: [cx - w / 2 + skew, cy - h / 2 - tilt / 2],
    tr: [cx + w / 2 + skew, cy - h / 2 + tilt / 2],
    br: [cx + w / 2 - skew, cy + h / 2 + tilt / 2],
    bl: [cx - w / 2 - skew, cy + h / 2 - tilt / 2],
  };
}

/** Point on the quad: u runs left to right, v from the back edge to the front edge. */
export function quadAt(q: Quad, u: number, v: number): Vec2 {
  const ax = q.tl[0] + (q.tr[0] - q.tl[0]) * u;
  const ay = q.tl[1] + (q.tr[1] - q.tl[1]) * u;
  const bx = q.bl[0] + (q.br[0] - q.bl[0]) * u;
  const by = q.bl[1] + (q.br[1] - q.bl[1]) * u;
  return [ax + (bx - ax) * v, ay + (by - ay) * v];
}

function patchOutline(rand: Rng, q: Quad, wave: number): Vec2[] {
  const pts: Vec2[] = [];
  const edge = (a: Vec2, b: Vec2, n: number): void => {
    for (let i = 0; i < n; i++) {
      const t = i / n;
      pts.push([a[0] + (b[0] - a[0]) * t + rand.range(-wave, wave), a[1] + (b[1] - a[1]) * t + rand.range(-wave, wave)]);
    }
  };
  edge(q.tl, q.tr, 5);
  edge(q.tr, q.br, 3);
  edge(q.br, q.bl, 5);
  edge(q.bl, q.tl, 3);
  return pts;
}

/* ------------------------------------------------------------------------------------ */
/* Crops                                                                                */
/* ------------------------------------------------------------------------------------ */

export type CropKind = 'plowed' | 'sprouts' | 'stubble' | 'wheat' | 'lettuce' | 'cabbage' | 'purple' | 'pumpkin' | 'corn';

export interface FieldOptions {
  quad: Quad;
  rows: number;
  kind: CropKind;
  rand: Rng;
  soil?: string;
  /** Slab thickness for upright patches; leave 0 for flat ground decals. */
  thickness?: number;
  ink?: string;
}

function plowedRows(ctx: Ctx2D, rand: Rng, q: Quad, rows: number, tones: Shades, kind: CropKind): void {
  const sp = Math.max(3, (q.bl[1] - q.tl[1]) / rows);
  const sprouts: Vec2[][] = [];
  for (let i = 0; i < rows; i++) {
    const v = (i + 0.5) / rows;
    const pts: Vec2[] = [];
    for (let k = 0; k <= 6; k++) pts.push(quadAt(q, -0.05 + 1.1 * (k / 6), v + rand.range(-0.012, 0.012)));
    const shift = (dy: number): Vec2[] => pts.map((p): Vec2 => [p[0], p[1] + dy]);
    line(ctx, shift(sp * 0.2), rgba(tones.deep, 0.6), sp * 0.32, { smooth: true });
    line(ctx, shift(-sp * 0.1), tones.light, sp * 0.42, { smooth: true });
    line(ctx, shift(-sp * 0.25), rgba(tones.highlight, 0.45), sp * 0.12, { smooth: true });
    sprouts.push(pts);
  }
  if (kind === 'plowed') return;
  ctx.save();
  ctx.lineCap = 'round';
  for (const pass of [0, 1] as const) {
    ctx.beginPath();
    for (const pts of sprouts) {
      const a = pts[0]!;
      const b = pts[pts.length - 1]!;
      const n = Math.max(4, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4.6));
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        const x = a[0] + (b[0] - a[0]) * t + (k % 2) * 1.2;
        const y = a[1] + (b[1] - a[1]) * t - sp * 0.12;
        if (kind === 'sprouts') {
          ctx.moveTo(x, y);
          ctx.lineTo(x - 1.1, y - 2.4);
          ctx.moveTo(x, y);
          ctx.lineTo(x + 0.2, y - 3);
          ctx.moveTo(x, y);
          ctx.lineTo(x + 1.2, y - 2.2);
        } else {
          ctx.moveTo(x - 1.2, y);
          ctx.lineTo(x + 1.3, y - 1.4);
          ctx.moveTo(x - 0.6, y - 1.4);
          ctx.lineTo(x + 1.6, y - 2.2);
        }
      }
    }
    if (kind === 'sprouts') {
      ctx.strokeStyle = pass === 0 ? '#335a28' : '#6cab43';
      ctx.lineWidth = pass === 0 ? 1.9 : 0.9;
    } else {
      ctx.strokeStyle = pass === 0 ? rgba(tones.deep, 0.8) : '#e4c474';
      ctx.lineWidth = pass === 0 ? 1.7 : 0.8;
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** One band of wheat: wavy golden mass with stalks and nodding ears along the top. */
function wheatRow(ctx: Ctx2D, rand: Rng, a: Vec2, b: Vec2, hgt: number, ink: string, gold: string): void {
  const t = shades(gold);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(6, Math.round(len / 3.7));
  const top: Vec2[] = [];
  const bot: Vec2[] = [];
  const tops: Vec2[] = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const x = a[0] + (b[0] - a[0]) * k;
    const y = a[1] + (b[1] - a[1]) * k;
    const yt = y - hgt + rand.range(-0.7, 0.7);
    top.push([x, yt]);
    bot.push([x, y + 1.1]);
    tops.push([x, yt]);
  }
  const minY = Math.min(a[1], b[1]) - hgt - 2;
  const maxY = Math.max(a[1], b[1]) + 2;
  shape(ctx, [...top, ...bot.slice().reverse()], {
    fill: linearGradient(ctx, 0, minY, 0, maxY, [t.light, t.base, t.shade]),
    stroke: ink,
    width: 0.9,
  });
  // Stalk strokes.
  ctx.save();
  ctx.lineCap = 'round';
  for (const pass of [0, 1] as const) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const p = tops[i]!;
      const x = p[0] + (pass ? 0.5 : -0.4);
      ctx.moveTo(x, p[1] + 1.6);
      ctx.lineTo(x - 0.4, p[1] + hgt * 0.78);
    }
    ctx.strokeStyle = pass ? rgba(t.highlight, 0.6) : rgba(t.deep, 0.5);
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
  ctx.restore();
  // Ears.
  const ears: Vec2[][] = tops.map((p, i): Vec2[] => {
    const lean = 1.1 + (i % 3) * 0.5 + rand.range(-0.3, 0.3);
    const l = hgt * rand.range(0.34, 0.5);
    return [
      [p[0], p[1] + 1.2],
      [p[0] + lean * 0.4, p[1] - l * 0.45],
      [p[0] + lean, p[1] - l],
    ];
  });
  for (const e of ears) taper(ctx, e, 3.1, 1.2, ink);
  for (const e of ears) taper(ctx, e, 2.0, 0.5, rand.chance(0.5) ? t.highlight : t.light);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const e of ears) {
    const tip = e[2]!;
    ctx.moveTo(tip[0], tip[1]);
    ctx.lineTo(tip[0] + 0.5, tip[1] - 2);
  }
  ctx.strokeStyle = rgba(ink, 0.85);
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.restore();
}

/** A round leafy vegetable (lettuce, cabbage, beet) sitting on the row. */
function leafyPlant(ctx: Ctx2D, rand: Rng, x: number, y: number, r: number, kind: CropKind, ink: string): void {
  const color = kind === 'cabbage' ? '#6f9d5a' : kind === 'purple' ? '#8a68a6' : '#7bb446';
  const t = shades(color);
  const cy = y - r * 0.55;
  if (kind === 'pumpkin') {
    const orange = shades('#e0802a');
    ellipse(ctx, x - r * 0.35, cy - r * 0.15, r * 0.9, r * 0.65, { fill: shades('#4f8a34').base, stroke: ink, width: 0.8 });
    ellipse(ctx, x, cy, r + 0.8, r * 0.82 + 0.8, { fill: ink });
    ellipse(ctx, x, cy, r, r * 0.82, { fill: radialGradient(ctx, x - r * 0.3, cy - r * 0.35, r * 0.1, r * 1.3, [[0, orange.highlight], [0.4, orange.light], [0.75, orange.base], [1, orange.deep]]) });
    ctx.save();
    ctx.strokeStyle = rgba(orange.deep, 0.65);
    ctx.lineWidth = 0.7;
    for (const k of [-0.5, 0, 0.5]) {
      ctx.beginPath();
      ctx.ellipse(x + k * r * 0.5, cy, Math.abs(k) * r * 0.45 + r * 0.2, r * 0.8, 0, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }
    ctx.restore();
    shape(ctx, [[x - 0.4, cy - r * 0.78], [x + 0.2, cy - r * 1.15], [x + 1.2, cy - r * 1.1], [x + 0.8, cy - r * 0.75]], { fill: '#4a6a2c', stroke: ink, width: 0.6 });
    return;
  }
  const poly = leafBlob(rand, x, cy, r, r * 0.84, kind === 'lettuce' ? 9 : 6, kind === 'lettuce' ? 0.14 : 0.06);
  shape(ctx, poly, { fill: ink, stroke: ink, width: 1.8, smooth: true });
  shape(ctx, poly, { fill: radialGradient(ctx, x - r * 0.35, cy - r * 0.4, r * 0.1, r * 1.35, [[0, t.highlight], [0.4, t.light], [0.75, t.base], [1, t.deep]]), smooth: true });
  ctx.save();
  ctx.lineCap = 'round';
  if (kind === 'cabbage' || kind === 'purple') {
    ctx.strokeStyle = rgba(t.highlight, 0.95);
    ctx.lineWidth = Math.max(0.6, r * 0.14);
    ctx.beginPath();
    ctx.arc(x - r * 0.05, cy + r * 0.05, r * 0.55, Math.PI * 0.95, Math.PI * 1.75);
    ctx.stroke();
    ctx.strokeStyle = rgba(t.deep, 0.7);
    ctx.beginPath();
    ctx.arc(x + r * 0.05, cy + r * 0.1, r * 0.55, Math.PI * 0.05, Math.PI * 0.7);
    ctx.stroke();
  } else {
    ctx.strokeStyle = rgba(t.highlight, 0.85);
    ctx.lineWidth = Math.max(0.5, r * 0.12);
    ctx.beginPath();
    ctx.arc(x, cy + r * 0.1, r * 0.5, Math.PI * 1.0, Math.PI * 1.7);
    ctx.moveTo(x - r * 0.05, cy + r * 0.45);
    ctx.lineTo(x - r * 0.1, cy - r * 0.1);
    ctx.stroke();
  }
  ctx.restore();
}

/** Rows of corn: tall stalks with arching leaves, golden tassels and pale cobs. */
function cornPlant(ctx: Ctx2D, rand: Rng, x: number, y: number, hgt: number, ink: string): void {
  const leaf = shades('#6fa443');
  const stalk: Vec2[] = [[x, y], [x + rand.range(-0.6, 0.6), y - hgt * 0.5], [x + rand.range(-0.8, 0.8), y - hgt]];
  taper(ctx, stalk, 2.6, 1.6, ink);
  taper(ctx, stalk, 1.4, 0.8, leaf.light);
  for (let k = 0; k < 4; k++) {
    const side = k % 2 ? 1 : -1;
    const by = y - hgt * (0.22 + k * 0.17);
    const tip: Vec2 = [x + side * hgt * rand.range(0.4, 0.55), by + hgt * rand.range(0.0, 0.18)];
    const blade = quadPts([x, by], [x + side * hgt * 0.32, by - hgt * 0.26], tip, 5);
    taper(ctx, blade, 3.1, 0.3, ink);
    taper(ctx, blade, 2.0, 0.2, k % 2 ? leaf.base : leaf.light);
  }
  const top: Vec2 = stalk[2]!;
  for (const d of [-1.6, 0, 1.6]) taper(ctx, [[top[0], top[1] + 1], [top[0] + d * 0.7, top[1] - 2.4], [top[0] + d * 1.3, top[1] - 4.4]], 1.5, 0.4, '#d9b85a');
  ellipse(ctx, x + 1.2, y - hgt * 0.5, 1.1, 2.1, { fill: '#e8cf5c', stroke: ink, width: 0.6, rotation: -0.35 });
}

/** A flat patch of farmland seen from above: bare plowed soil, seedlings, stubble, or standing crops. */
export function drawField(ctx: Ctx2D, o: FieldOptions): void {
  const { rand } = o;
  const ink = o.ink ?? INK;
  const q = o.quad;
  const tones = shades(o.soil ?? '#8a5d3a');
  const th = o.thickness ?? 0;
  const outline = patchOutline(rand, q, 0.8);
  const standing = o.kind !== 'plowed' && o.kind !== 'sprouts' && o.kind !== 'stubble';

  if (th > 0) {
    const mx = (q.bl[0] + q.br[0]) / 2;
    softBlob(ctx, mx + 2, Math.max(q.bl[1], q.br[1]) + th, Math.abs(q.br[0] - q.bl[0]) * 0.58 + 4, th * 1.6 + 2, '#1d160c', 0.3);
    shape(ctx, outline.map((p): Vec2 => [p[0], p[1] + th]), { fill: mix(tones.deep, '#2a1c10', 0.35), stroke: ink, width: 1.1, smooth: true });
  }
  const edge = th > 0 ? ink : rgba(ink, 0.7);
  shape(ctx, outline, { fill: linearGradient(ctx, q.tl[0], q.tl[1], q.br[0], q.br[1], [tones.light, tones.base, tones.shade]), stroke: edge, width: 1.1, smooth: true });

  if (!standing) {
    clipped(ctx, outline, () => plowedRows(ctx, rand, q, o.rows, tones, o.kind), true);
    return;
  }

  const span = q.bl[1] - q.tl[1];
  const rows = Math.max(2, o.rows);
  const sp = Math.max(4.6, (span * 0.74) / (rows - 1));
  for (let i = 0; i < rows; i++) {
    const v = 0.17 + (0.74 * i) / (rows - 1);
    const a = quadAt(q, 0.07, v);
    const b = quadAt(q, 0.93, v);
    if (o.kind === 'wheat') {
      wheatRow(ctx, rand, a, b, Math.max(6.5, sp * 1.08), ink, '#dcae45');
      continue;
    }
    const gap = o.kind === 'corn' ? sp * 1.5 : o.kind === 'pumpkin' ? sp * 1.7 : sp * 1.25;
    const n = Math.max(3, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / gap));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5 + (i % 2 ? 0.25 : -0.25)) / n;
      const x = a[0] + (b[0] - a[0]) * Math.min(0.99, Math.max(0.01, t));
      const y = a[1] + (b[1] - a[1]) * Math.min(0.99, Math.max(0.01, t)) + rand.range(-0.4, 0.4);
      if (o.kind === 'corn') cornPlant(ctx, rand, x, y, Math.max(11, sp * 2.1), ink);
      else leafyPlant(ctx, rand, x, y, Math.max(2.6, sp * (o.kind === 'pumpkin' ? 0.62 : 0.58)), o.kind, ink);
    }
  }
}

/* ------------------------------------------------------------------------------------ */
/* Hay                                                                                  */
/* ------------------------------------------------------------------------------------ */

export type HayKind = 'dome' | 'cone' | 'round' | 'bales';

export interface HayOptions {
  cx: number;
  baseY: number;
  w: number;
  h: number;
  kind: HayKind;
  rand: Rng;
  straw?: string;
  ink?: string;
  /** Number of round bales or square bales. */
  count?: number;
  /** Fullness of the dome shoulders, 0 (hemisphere) to 1 (barrel). */
  bulge?: number;
}

const EX: Vec2 = [0.866, -0.5];
const EY: Vec2 = [-0.866, -0.5];

function stack(ctx: Ctx2D, o: HayOptions, prof: (t: number) => number, pole: boolean): void {
  const { cx, baseY, rand } = o;
  const ink = o.ink ?? INK;
  const R = o.w / 2;
  const ry = R * 0.3;
  const t = shades(o.straw ?? '#dcb55c');
  const N = 14;
  const left: Vec2[] = [];
  const right: Vec2[] = [];
  for (let i = 0; i <= N; i++) {
    const k = i / N;
    const r = prof(k) * R;
    const y = baseY - o.h * k;
    left.push([cx - r + rand.range(-0.5, 0.5), y]);
    right.push([cx + r + rand.range(-0.5, 0.5), y]);
  }
  const arc: Vec2[] = [];
  for (let i = 0; i <= 8; i++) {
    const a = (Math.PI * i) / 8;
    arc.push([cx + Math.cos(a) * R * prof(0), baseY + Math.sin(a) * ry]);
  }
  const outline: Vec2[] = [...left, ...right.slice().reverse(), ...arc];

  softBlob(ctx, cx + R * 0.18, baseY + ry * 0.45, R * 1.12, ry * 1.1, '#1d160c', 0.32);
  if (pole) {
    const top = left[N]!;
    taper(ctx, [[cx + 0.4, top[1] + 2], [cx + 0.4, top[1] - o.h * 0.22]], 2.4, 1.6, ink);
    taper(ctx, [[cx + 0.4, top[1] + 2], [cx + 0.4, top[1] - o.h * 0.22]], 1.2, 0.7, '#8a6a42');
  }
  shape(ctx, outline, {
    fill: linearGradient(ctx, cx - R, 0, cx + R, 0, [[0, t.highlight], [0.28, t.light], [0.6, t.base], [1, t.shade]]),
    stroke: ink,
    width: 1.2,
    smooth: true,
  });
  clipped(ctx, outline, () => {
    softBlob(ctx, cx - R * 0.35, baseY - o.h * 0.6, R * 0.5, o.h * 0.28, t.highlight, 0.45);
    ctx.lineCap = 'round';
    for (const pass of [0, 1] as const) {
      ctx.beginPath();
      for (let s = -0.85; s <= 0.86; s += 0.3) {
        const sx = s + rand.range(-0.05, 0.05);
        if (pass === 1 && sx > 0.15) continue;
        for (let i = 0; i <= 10; i++) {
          const k = i / 10;
          const x = cx + sx * prof(k) * R + (pass ? -0.9 : 0.4);
          const y = baseY - o.h * k + Math.sqrt(1 - sx * sx) * ry * prof(k);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = pass ? rgba(t.highlight, 0.7) : rgba(t.deep, 0.5);
      ctx.lineWidth = pass ? 0.7 : 0.8;
      ctx.stroke();
    }
    // Loose straw ends.
    for (const pass of [0, 1] as const) {
      ctx.beginPath();
      for (let i = 0; i < 26; i++) {
        const k = rand.range(0.05, 0.92);
        const s = rand.range(-0.9, 0.9);
        const x = cx + s * prof(k) * R;
        const y = baseY - o.h * k + Math.sqrt(1 - s * s) * ry * prof(k);
        const ang = rand.range(-0.7, 0.7) - Math.PI / 2 + s * 0.6;
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(ang) * 2.4, y + Math.sin(ang) * 2.4);
      }
      ctx.strokeStyle = pass ? rgba(t.highlight, 0.8) : rgba(t.deep, 0.55);
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
    // Twine bands.
    for (const k of pole ? [0.3, 0.62] : [0.36]) {
      const ring: Vec2[] = [];
      for (let s = -1; s <= 1.001; s += 0.125) ring.push([cx + s * prof(k) * R, baseY - o.h * k + Math.sqrt(Math.max(0, 1 - s * s)) * ry * prof(k)]);
      line(ctx, ring, '#5d4224', 1.5, { smooth: true });
      line(ctx, ring.map((p): Vec2 => [p[0], p[1] - 1.1]), rgba('#c79a58', 0.8), 0.6, { smooth: true });
    }
  }, true);
  if (!pole) {
    // A wisp of loose straw on top of the dome.
    const top = left[N]!;
    for (const d of [-1.2, 0.2, 1.4]) {
      const wisp = quadPts([top[0] + d * 0.3, top[1] + 1.5], [top[0] + d * 0.4, top[1] - 2.2], [top[0] + d * 2.2, top[1] - 3.6 + Math.abs(d)], 4);
      taper(ctx, wisp, 2.6, 0.7, ink);
    }
    for (const d of [-1.2, 0.2, 1.4]) {
      const wisp = quadPts([top[0] + d * 0.3, top[1] + 1.5], [top[0] + d * 0.4, top[1] - 2.2], [top[0] + d * 2.2, top[1] - 3.6 + Math.abs(d)], 4);
      taper(ctx, wisp, 1.3, 0.3, t.light);
    }
  }
}

function roundBale(ctx: Ctx2D, rand: Rng, x: number, baseY: number, r: number, len: number, straw: string, ink: string): void {
  const t = shades(straw);
  const cy = baseY - r;
  const rx = r * 0.38;
  const x0 = x - len / 2;
  const x1 = x + len / 2;
  softBlob(ctx, x + 2, baseY - 0.5, len * 0.62, r * 0.38, '#1d160c', 0.3);
  const body: Vec2[] = [[x0, cy - r], [x1, cy - r], [x1, cy + r], [x0, cy + r]];
  ellipse(ctx, x1, cy, rx + 0.9, r + 0.9, { fill: ink });
  shape(ctx, body, { fill: ink, stroke: ink, width: 1.8 });
  ellipse(ctx, x0, cy, rx + 0.9, r + 0.9, { fill: ink });
  ellipse(ctx, x1, cy, rx, r, { fill: t.shade });
  shape(ctx, body, { fill: linearGradient(ctx, 0, cy - r, 0, cy + r, [t.highlight, t.light, t.base, t.shade]) });
  // Straw grain along the roll.
  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const yy = cy - r * 0.8 + (i / 8) * r * 1.6;
    const xs = rand.range(x0 + 1, x1 - 4);
    ctx.moveTo(xs, yy);
    ctx.lineTo(xs + rand.range(3, 6), yy + rand.range(-0.4, 0.4));
  }
  ctx.strokeStyle = rgba(t.deep, 0.5);
  ctx.lineWidth = 0.6;
  ctx.stroke();
  ctx.restore();
  for (const f of [0.3, 0.72]) {
    const bx = x0 + len * f;
    line(ctx, quadPts([bx, cy - r], [bx + 1.8, cy], [bx, cy + r], 6), '#5d4224', 1.2);
  }
  // The visible end: rolled spiral.
  ellipse(ctx, x0, cy, rx, r, { fill: radialGradient(ctx, x0 - rx * 0.2, cy - r * 0.3, 1, r * 1.1, [[0, t.highlight], [0.6, t.light], [1, t.base]]), stroke: rgba(ink, 0.85), width: 0.9 });
  ctx.save();
  ctx.strokeStyle = rgba(t.deep, 0.7);
  ctx.lineWidth = 0.6;
  for (const f of [0.74, 0.5, 0.27]) {
    ctx.beginPath();
    ctx.ellipse(x0, cy, rx * f, r * f, 0, Math.PI * 0.2 * f, TAU - Math.PI * 0.3 * f);
    ctx.stroke();
  }
  ctx.restore();
}

function squareBale(ctx: Ctx2D, rand: Rng, x: number, y: number, a: number, b: number, hh: number, straw: string, ink: string): void {
  const t = shades(straw);
  const F: Vec2 = [x, y];
  const R: Vec2 = [x + EX[0] * a, y + EX[1] * a];
  const L: Vec2 = [x + EY[0] * b, y + EY[1] * b];
  const B: Vec2 = [R[0] + EY[0] * b, R[1] + EY[1] * b];
  const up = (p: Vec2): Vec2 => [p[0], p[1] - hh];
  const [Ft, Rt, Lt, Bt] = [up(F), up(R), up(L), up(B)];
  shape(ctx, [F, L, Lt, Ft], { fill: linearGradient(ctx, L[0], 0, F[0], 0, [t.highlight, t.light]), stroke: ink, width: 0.95 });
  shape(ctx, [F, R, Rt, Ft], { fill: linearGradient(ctx, F[0], 0, R[0], 0, [t.base, t.shade]), stroke: ink, width: 0.95 });
  shape(ctx, [Ft, Rt, Bt, Lt], { fill: linearGradient(ctx, Lt[0], Lt[1], Rt[0], Rt[1], [t.highlight, t.light]), stroke: ink, width: 0.95 });
  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const f = rand.range(0.1, 0.9);
    const g = rand.range(0.1, 0.9);
    const px = Ft[0] + (Rt[0] - Ft[0]) * f + (Lt[0] - Ft[0]) * g;
    const py = Ft[1] + (Rt[1] - Ft[1]) * f + (Lt[1] - Ft[1]) * g;
    ctx.moveTo(px, py);
    ctx.lineTo(px + EX[0] * 3, py + EX[1] * 3);
  }
  ctx.strokeStyle = rgba(t.deep, 0.45);
  ctx.lineWidth = 0.6;
  ctx.stroke();
  ctx.beginPath();
  for (const f of [0.28, 0.7]) {
    const s1: Vec2 = [Ft[0] + (Rt[0] - Ft[0]) * f, Ft[1] + (Rt[1] - Ft[1]) * f];
    const s2: Vec2 = [Lt[0] + (Bt[0] - Lt[0]) * f, Lt[1] + (Bt[1] - Lt[1]) * f];
    const s3: Vec2 = [F[0] + (R[0] - F[0]) * f, F[1] + (R[1] - F[1]) * f];
    ctx.moveTo(s2[0], s2[1]);
    ctx.lineTo(s1[0], s1[1]);
    ctx.lineTo(s3[0], s3[1]);
  }
  ctx.strokeStyle = '#5d4224';
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.restore();
}

/** Haystacks: domes, poled cones, rolled bales and square bale piles. */
export function drawHaystack(ctx: Ctx2D, o: HayOptions): void {
  const { rand, cx, baseY } = o;
  const ink = o.ink ?? INK;
  const straw = o.straw ?? '#dcb55c';
  if (o.kind === 'dome') {
    const e = 2 + (o.bulge ?? 0) * 1.7;
    stack(ctx, o, (k) => Math.pow(Math.max(0, 1 - Math.pow(k, e)), 0.5) * (1 + 0.05 * Math.sin(k * 9)), false);
  } else if (o.kind === 'cone') {
    stack(ctx, o, (k) => Math.max(0, (1 - k) * (1 + (0.18 + (o.bulge ?? 0) * 0.3) * Math.sin(Math.PI * Math.min(1, k * 1.3)))), true);
  } else if (o.kind === 'round') {
    const n = o.count ?? 2;
    const r = o.h * (n > 1 ? 0.3 : 0.42);
    const len = o.w * (n > 1 ? 0.5 : 0.78);
    if (n === 1) roundBale(ctx, rand, cx, baseY, r, len, straw, ink);
    else {
      roundBale(ctx, rand, cx + o.w * 0.17, baseY - r * 0.55, r, len, straw, ink);
      roundBale(ctx, rand, cx - o.w * 0.17, baseY, r, len, straw, ink);
      if (n > 2) roundBale(ctx, rand, cx + o.w * 0.05, baseY - r * 1.5, r, len, straw, ink);
    }
  } else {
    // Square bales stack as a pyramid: two side by side along the left axis, one across the top.
    const n = o.count ?? 3;
    const hh = Math.min(o.h * 0.3, o.w * 0.17);
    const a = hh * 2.1;
    const b = hh * 1.05;
    const fx = n === 1 ? cx + a * 0.1 : cx;
    if (n > 1) squareBale(ctx, rand, fx + EY[0] * b, baseY + EY[1] * b, a, b, hh, straw, ink);
    squareBale(ctx, rand, fx, baseY, a, b, hh, straw, ink);
    if (n > 2) squareBale(ctx, rand, fx + EY[0] * b * 0.5, baseY + EY[1] * b * 0.5 - hh, a, b, hh, straw, ink);
  }
}

/* ------------------------------------------------------------------------------------ */
/* Fences and the barn                                                                  */
/* ------------------------------------------------------------------------------------ */

/** A rustic two-rail fence along a polyline. */
export function drawFence(ctx: Ctx2D, pts: readonly Vec2[], o: { ink: string; wood: string; h?: number; gap?: number }): void {
  const h = o.h ?? 6;
  const t = shades(o.wood);
  const posts: Vec2[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / (o.gap ?? 7)));
    for (let k = i === 0 ? 0 : 1; k <= n; k++) posts.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  for (const f of [0.38, 0.78]) {
    const rail = posts.map((p): Vec2 => [p[0], p[1] - h * f]);
    line(ctx, rail, o.ink, 2.1);
    line(ctx, rail, t.light, 0.95);
  }
  for (const p of posts) {
    shape(ctx, [[p[0] - 1.4, p[1] + 0.4], [p[0] + 1.4, p[1] + 0.4], [p[0] + 1.3, p[1] - h], [p[0] - 1.3, p[1] - h]], { fill: t.base, stroke: o.ink, width: 0.8 });
    line(ctx, [[p[0] - 0.55, p[1] - 0.5], [p[0] - 0.5, p[1] - h + 0.8]], rgba(t.highlight, 0.9), 0.6);
  }
}

export interface BarnOptions {
  x: number;
  y: number;
  a: number;
  b: number;
  wallH: number;
  roofH: number;
  wall?: string;
  roof?: string;
  rand: Rng;
  ink?: string;
}

/** A red barn with a gable end facing right, big double doors with white braces and a hayloft window. */
export function drawBarn(ctx: Ctx2D, o: BarnOptions): void {
  const ink = o.ink ?? INK;
  drawHouse(ctx, { x: o.x, y: o.y, a: o.a, b: o.b, wallH: o.wallH, roofH: o.roofH, wall: o.wall ?? '#b0482f', roof: o.roof ?? '#6a5a52', ink, rand: o.rand, ridge: 'y' });
  const F: Vec2 = [o.x, o.y];
  const at = (f: number, h: number): Vec2 => [F[0] + EX[0] * o.a * f, F[1] + EX[1] * o.a * f - h];
  const d0 = 0.24;
  const d1 = 0.76;
  const dh = o.wallH * 0.82;
  shape(ctx, [at(d0, 0), at(d1, 0), at(d1, dh), at(d0, dh)], { fill: '#6f2a1e', stroke: ink, width: 0.8 });
  const trim = '#f2e8d4';
  line(ctx, [at(d0, 0), at(d1, dh)], trim, 0.9);
  line(ctx, [at(d1, 0), at(d0, dh)], trim, 0.9);
  line(ctx, [at(0.5, 0), at(0.5, dh)], trim, 0.8);
  shape(ctx, [at(d0, 0), at(d1, 0), at(d1, dh), at(d0, dh)], { stroke: trim, width: 0.8 });
  const wy = o.wallH + o.roofH * 0.3;
  shape(ctx, [at(0.42, wy), at(0.58, wy), at(0.58, wy + 3.4), at(0.42, wy + 3.4)], { fill: '#2b1f17', stroke: trim, width: 0.7 });
}

/* ------------------------------------------------------------------------------------ */
/* Homestead                                                                            */
/* ------------------------------------------------------------------------------------ */

/** A ground rectangle aligned with the house axes; its rows run up and to the right. */
export function dimetricQuad(x: number, y: number, a: number, b: number): Quad {
  const R: Vec2 = [x + EX[0] * a, y + EX[1] * a];
  return { tl: [x + EY[0] * b, y + EY[1] * b], tr: [R[0] + EY[0] * b, R[1] + EY[1] * b], br: R, bl: [x, y] };
}

interface Plot {
  x: number;
  y: number;
  a: number;
  b: number;
}

interface HomeLayout {
  barn: Plot;
  house: Plot;
  fields: (Plot & { rows: number })[];
  hay: { x: number; y: number; w: number; h: number };
  trees: { x: number; y: number; s: number }[];
  fenced: number[];
}

export const HOMESTEAD_SIZE: Vec2 = [124, 92];

const HOME_LAYOUTS: HomeLayout[] = [
  {
    barn: { x: 102, y: 56, a: 22, b: 26 },
    house: { x: 60, y: 70, a: 16, b: 14 },
    fields: [{ x: 30, y: 88, a: 24, b: 22, rows: 4 }],
    hay: { x: 101, y: 82, w: 22, h: 20 },
    trees: [{ x: 16, y: 50, s: 26 }],
    fenced: [0],
  },
  {
    barn: { x: 44, y: 54, a: 22, b: 26 },
    house: { x: 84, y: 70, a: 16, b: 14 },
    fields: [{ x: 98, y: 90, a: 22, b: 20, rows: 4 }],
    hay: { x: 26, y: 80, w: 22, h: 20 },
    trees: [{ x: 11, y: 60, s: 22 }, { x: 112, y: 38, s: 22 }],
    fenced: [0],
  },
  {
    barn: { x: 96, y: 50, a: 20, b: 24 },
    house: { x: 58, y: 66, a: 16, b: 14 },
    fields: [
      { x: 28, y: 84, a: 22, b: 20, rows: 4 },
      { x: 74, y: 90, a: 26, b: 16, rows: 3 },
    ],
    hay: { x: 110, y: 78, w: 18, h: 18 },
    trees: [{ x: 14, y: 44, s: 22 }],
    fenced: [1],
  },
];

export interface HomesteadOptions {
  layout: number;
  kinds: [CropKind, CropKind];
  barnWall: string;
  barnRoof: string;
  houseWall: string;
  houseRoof: string;
  hay: HayKind;
  rand: Rng;
  ink?: string;
}

/** A small farm: farmhouse, barn, haystack, trees and fenced crop fields, packed into one symbol. */
export function drawHomestead(ctx: Ctx2D, o: HomesteadOptions): void {
  const { rand } = o;
  const ink = o.ink ?? INK;
  const L = HOME_LAYOUTS[o.layout % HOME_LAYOUTS.length]!;
  const items: { y: number; run: () => void }[] = [];

  softBlob(ctx, (L.barn.x + L.house.x) / 2, Math.max(L.barn.y, L.house.y) - 4, 36, 13, '#a68a58', 0.5);

  L.fields.forEach((f, i) => {
    const quad = dimetricQuad(f.x, f.y, f.a, f.b);
    const kind = o.kinds[i % 2]!;
    items.push({ y: -1000 + i, run: () => drawField(ctx, { quad, rows: f.rows, kind, rand, soil: '#85603c' }) });
    if (L.fenced.includes(i)) {
      const pts: Vec2[] = [quad.tl, quad.bl, quad.br];
      items.push({ y: f.y + 2, run: () => drawFence(ctx, pts, { ink, wood: '#a88455', h: 5, gap: 6.5 }) });
    }
  });
  const barn = L.barn;
  items.push({ y: barn.y, run: () => drawBarn(ctx, { ...barn, wallH: 14, roofH: 11, wall: o.barnWall, roof: o.barnRoof, rand, ink }) });
  const house = L.house;
  items.push({
    y: house.y,
    run: () => drawHouse(ctx, { ...house, wallH: 10, roofH: 9, wall: o.houseWall, roof: o.houseRoof, ink, rand, chimney: true }),
  });
  items.push({ y: L.hay.y, run: () => drawHaystack(ctx, { cx: L.hay.x, baseY: L.hay.y, w: L.hay.w, h: L.hay.h, kind: o.hay, count: 3, rand }) });
  for (const t of L.trees) {
    items.push({ y: t.y, run: () => drawRoundTree(ctx, { cx: t.x, baseY: t.y, w: t.s, h: t.s * 1.2, leaf: FOLIAGE.green, ink, rand }) });
  }
  items.sort((p, q) => p.y - q.y);
  for (const it of items) it.run();
}
