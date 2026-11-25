import { rgba } from '../kit/colors';
import { dot, ellipse, shades, shape, softBlob, taper } from '../kit/draw';
import { TAU } from '../kit/math';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { INK, drawTuft, makeBlade, paintBlades, paintLobes, quadPts, tuftBlades, type Blade, type Lobe } from './nature-common';

/* ------------------------------------------------------------------------------------ */
/* Bushes                                                                               */
/* ------------------------------------------------------------------------------------ */

export interface BushOptions {
  cx: number;
  /** Ground contact line. */
  baseY: number;
  w: number;
  h: number;
  leaf: string;
  /** Alternative leaf colors spread over the lobes (autumn bushes). */
  palette?: readonly string[];
  ink?: string;
  rand: Rng;
  flowers?: { colors: readonly string[]; count: number };
  berries?: { color: string; count: number };
  shadow?: boolean;
  /** 0 = tidy dome, 1 = wide and low, 2 = tall and lumpy. */
  form?: 0 | 1 | 2;
}

function bushLobes(rand: Rng, cx: number, baseY: number, w: number, h: number, form: number): Lobe[] {
  const lobes: Lobe[] = [];
  const nb = form === 1 ? 4 : form === 2 ? 2 : rand.int(3, 4);
  const rb = h * (form === 1 ? 0.3 : form === 2 ? 0.3 : 0.34);
  for (let i = 0; i < nb; i++) {
    const t = nb === 1 ? 0.5 : i / (nb - 1);
    const r = rb * rand.range(0.88, 1.12);
    lobes.push({ x: cx + (t - 0.5) * (w - r * 1.7) + rand.range(-1.2, 1.2), y: baseY - r * rand.range(0.82, 1), rx: r * rand.range(1, 1.22), ry: r });
  }
  const nt = form === 1 ? 2 : form === 2 ? 3 : rand.int(2, 3);
  const rt = h * (form === 2 ? 0.27 : 0.3);
  for (let i = 0; i < nt; i++) {
    const t = (i + 0.5) / nt;
    const r = rt * rand.range(0.85, 1.15);
    const spread = form === 2 ? 0.34 : 0.52;
    const lift = form === 2 ? i * 0.12 * h * (i % 2 ? 1 : -0.4) : 0;
    lobes.push({ x: cx + (t - 0.5) * w * spread + rand.range(-2, 2), y: baseY - h + r * rand.range(0.95, 1.1) - lift * 0.3, rx: r * 1.1, ry: r });
  }
  if (form === 2) lobes.push({ x: cx + rand.range(-3, 3), y: baseY - h * 0.52, rx: h * 0.3, ry: h * 0.28 });
  return lobes.sort((a, b) => a.y - b.y);
}

function blossom(ctx: Ctx2D, x: number, y: number, r: number, color: string, center = '#f6d65a'): void {
  dot(ctx, x, y, r * 1.95, rgba(INK, 0.5));
  const phase = x * 0.7;
  for (let k = 0; k < 5; k++) {
    const a = phase + (k * TAU) / 5;
    dot(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.86, color);
  }
  dot(ctx, x, y, r * 0.62, center);
}

function berry(ctx: Ctx2D, x: number, y: number, r: number, color: string): void {
  dot(ctx, x, y, r + 0.7, INK);
  dot(ctx, x, y, r, color);
  dot(ctx, x - r * 0.3, y - r * 0.35, r * 0.34, 'rgba(255,255,255,0.8)');
}

/** A rounded leafy bush: clustered scalloped lobes with a single ink outline. */
export function drawBush(ctx: Ctx2D, o: BushOptions): void {
  const { rand, cx, baseY, w, h } = o;
  const ink = o.ink ?? INK;
  const inkW = Math.max(1, w * 0.032);
  if (o.shadow !== false) softBlob(ctx, cx + w * 0.08, baseY - 1, w * 0.6, w * 0.17, '#1d160c', 0.34);

  const lobes = bushLobes(rand, cx, baseY, w, h, o.form ?? 0);
  const pal = o.palette;
  if (pal) lobes.forEach((l, i) => (l.color = pal[(i + rand.int(0, 1)) % pal.length]));
  paintLobes(ctx, rand, lobes, { base: o.leaf, ink, inkW, marks: 4 });

  const top = lobes.filter((l) => l.y < baseY - h * 0.4);
  const pool = top.length ? top.concat(lobes) : lobes;
  for (let i = 0; i < (o.flowers?.count ?? 0); i++) {
    const l = rand.pick(pool);
    const a = rand.range(Math.PI, TAU) * 0.8 + rand.range(0, 1.2);
    const d = rand.range(0.2, 0.72);
    blossom(ctx, l.x + Math.cos(a) * l.rx * d, l.y + Math.sin(a) * l.ry * d, Math.max(1.5, w * 0.037), rand.pick(o.flowers!.colors));
  }
  for (let i = 0; i < (o.berries?.count ?? 0); i++) {
    const l = rand.pick(pool);
    const a = rand.range(0, TAU);
    const d = rand.range(0.15, 0.7);
    berry(ctx, l.x + Math.cos(a) * l.rx * d, l.y + Math.sin(a) * l.ry * d, Math.max(1.4, w * 0.036), o.berries!.color);
  }
}

export interface DryBushOptions {
  cx: number;
  baseY: number;
  w: number;
  h: number;
  twig: string;
  leaf: string;
  ink?: string;
  rand: Rng;
  /** Number of twigs. */
  twigs?: number;
  shadow?: boolean;
}

/** A wiry, leafless-looking shrub: twigs with sparse clumps of dry leaves. */
export function drawDryBush(ctx: Ctx2D, o: DryBushOptions): void {
  const { rand, cx, baseY, w, h } = o;
  const ink = o.ink ?? INK;
  const tones = shades(o.leaf);
  if (o.shadow !== false) softBlob(ctx, cx + w * 0.08, baseY - 1, w * 0.52, w * 0.14, '#1d160c', 0.3);

  const n = o.twigs ?? 9;
  const tips: Vec2[] = [];
  const paths: Vec2[][] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const a = (t - 0.5) * 2;
    const len = h * (0.62 + 0.38 * (1 - Math.abs(a) * 0.7)) * rand.range(0.82, 1.08);
    const start: Vec2 = [cx + a * w * 0.08, baseY];
    const tip: Vec2 = [cx + a * w * 0.46 + rand.range(-2, 2), baseY - len];
    const ctrl: Vec2 = [cx + a * w * 0.12 + rand.range(-2, 2), baseY - len * 0.62];
    const pts = quadPts(start, ctrl, tip, 6);
    paths.push(pts);
    tips.push(tip);
    // A side twig forks off the upper half.
    const k = rand.int(2, 4);
    const from = pts[k]!;
    const side = a >= 0 ? 1 : -1;
    const fork = quadPts(from, [from[0] + side * w * 0.1, from[1] - h * 0.18], [from[0] + side * w * rand.range(0.12, 0.22), from[1] - h * rand.range(0.2, 0.34)], 4);
    paths.push(fork);
    tips.push(fork[fork.length - 1]!);
  }
  for (const p of paths) shape(ctx, p, { stroke: ink, width: 2.7, closed: false, smooth: true });
  for (const p of paths) shape(ctx, p, { stroke: o.twig, width: 1.3, closed: false, smooth: true });

  // Small clumps of dry leaves near the twig tips.
  const clumps: Lobe[] = [];
  for (const tip of tips) {
    const r = Math.max(2.4, w * 0.075) * rand.range(0.8, 1.25);
    clumps.push({ x: tip[0] + rand.range(-1, 1), y: tip[1] + r * 0.5, rx: r * 1.2, ry: r });
  }
  for (let i = 0; i < 4; i++) {
    const r = w * 0.09;
    clumps.push({ x: cx + rand.range(-0.22, 0.22) * w, y: baseY - h * rand.range(0.2, 0.42), rx: r * 1.2, ry: r });
  }
  clumps.sort((a, b) => a.y - b.y);
  paintLobes(ctx, rand, clumps, { base: o.leaf, ink, inkW: Math.max(0.8, w * 0.02), marks: 1, bumps: 5, amp: 0.1 });
  for (let i = 0; i < 5; i++) {
    const l = rand.pick(clumps);
    dot(ctx, l.x + rand.range(-2, 2), l.y + rand.range(-1, 2), 0.9, rgba(tones.highlight, 0.8));
  }
}

/* ------------------------------------------------------------------------------------ */
/* Grass                                                                                */
/* ------------------------------------------------------------------------------------ */

export interface GrassClumpOptions {
  cx: number;
  baseY: number;
  w: number;
  h: number;
  tufts: number;
  count: number;
  dark: string;
  base: string;
  light: string;
  ink: string;
  /** Seed-head color: adds feathery heads on some blades (tall and dry grass). */
  seed?: string;
  /** Soft ground tint under the clump. */
  tint?: string;
  rand: Rng;
  bladeW?: number;
}

/** Several overlapping tufts, tall ones in the back. */
export function drawGrassClump(ctx: Ctx2D, o: GrassClumpOptions): void {
  const { rand, cx, baseY, w, h } = o;
  if (o.tint) softBlob(ctx, cx + w * 0.05, baseY - 1, w * 0.52, w * 0.12, o.tint, 0.42);
  const order = Array.from({ length: o.tufts }, (_, i) => i);
  const slots = order.map((i) => (o.tufts === 1 ? 0.5 : i / (o.tufts - 1)));
  const spots = slots.map((t) => ({ x: cx + (t - 0.5) * w * 0.62 + rand.range(-2, 2), y: baseY - rand.range(0, h * 0.12), h: h * rand.range(0.62, 1) }));
  spots.sort((a, b) => a.y - b.y || b.h - a.h);
  for (const s of spots) {
    const blades = tuftBlades(rand, { x: s.x, y: s.y, h: s.h, spread: w * 0.26, count: o.count, dark: o.dark, base: o.base, light: o.light, ink: o.ink, bladeW: o.bladeW });
    paintBlades(ctx, blades, o.ink, 0.8);
    if (o.seed) {
      for (const b of blades) {
        if (!rand.chance(0.55)) continue;
        const tip = b.pts[b.pts.length - 1]!;
        const prev = b.pts[b.pts.length - 3]!;
        const ang = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]);
        const len = Math.max(3, h * 0.2);
        const end: Vec2 = [tip[0] + Math.cos(ang) * len, tip[1] + Math.sin(ang) * len];
        const head = quadPts(tip, [tip[0] + Math.cos(ang) * len * 0.5 + 0.8, tip[1] + Math.sin(ang) * len * 0.5], end, 3);
        taper(ctx, head, Math.max(1.8, h * 0.07) + 1.4, 0.8, INK);
        taper(ctx, head, Math.max(1.8, h * 0.07), 0.5, o.seed);
      }
    }
  }
}

/* ------------------------------------------------------------------------------------ */
/* Flowers                                                                              */
/* ------------------------------------------------------------------------------------ */

export type FlowerKind = 'poppy' | 'daisy' | 'buttercup' | 'lavender' | 'bell' | 'tulip';

export interface FlowerPatchOptions {
  cx: number;
  baseY: number;
  w: number;
  h: number;
  kinds: readonly FlowerKind[];
  colors: readonly string[];
  count: number;
  rand: Rng;
  leaf?: string;
  /** Head radius in px. */
  r?: number;
}

const STEM = '#3f5f2c';

function head(ctx: Ctx2D, kind: FlowerKind, x: number, y: number, r: number, color: string, rand: Rng): void {
  const t = shades(color);
  switch (kind) {
    case 'poppy': {
      ellipse(ctx, x, y, r * 1.2, r * 1.05, { fill: INK, stroke: INK, width: 1.4 });
      ellipse(ctx, x - r * 0.35, y + r * 0.1, r * 0.8, r * 0.85, { fill: t.light });
      ellipse(ctx, x + r * 0.4, y + r * 0.05, r * 0.8, r * 0.9, { fill: t.base });
      ellipse(ctx, x, y - r * 0.2, r * 0.82, r * 0.75, { fill: t.highlight, alpha: 0.55 });
      dot(ctx, x + r * 0.05, y + r * 0.05, r * 0.36, '#2a1a1a');
      break;
    }
    case 'daisy': {
      const petals = 8;
      const ph = rand.range(0, 1);
      for (let k = 0; k < petals; k++) {
        const a = ph + (k * TAU) / petals;
        ellipse(ctx, x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82, r * 0.7, r * 0.3, { rotation: a, fill: color, stroke: rgba(INK, 0.85), width: 0.7 });
      }
      dot(ctx, x, y, r * 0.58, INK);
      dot(ctx, x, y, r * 0.44, '#f2c230');
      break;
    }
    case 'buttercup': {
      dot(ctx, x, y, r * 1.55, INK);
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k * TAU) / 5;
        dot(ctx, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.7, k < 2 ? t.light : t.base);
      }
      dot(ctx, x, y, r * 0.52, '#d88a1e');
      break;
    }
    case 'tulip': {
      shape(ctx, [[x - r * 0.9, y - r * 0.5], [x - r * 0.45, y - r * 1.1], [x, y - r * 0.5], [x + r * 0.45, y - r * 1.1], [x + r * 0.9, y - r * 0.5], [x + r * 0.7, y + r * 0.6], [x, y + r * 0.95], [x - r * 0.7, y + r * 0.6]], {
        fill: t.base,
        stroke: INK,
        width: 1,
      });
      shape(ctx, [[x - r * 0.8, y - r * 0.3], [x - r * 0.4, y - r * 0.9], [x - r * 0.1, y - r * 0.3], [x - r * 0.1, y + r * 0.6], [x - r * 0.6, y + r * 0.5]], { fill: t.light });
      break;
    }
    case 'bell': {
      shape(ctx, [[x - r * 0.45, y - r * 0.9], [x + r * 0.45, y - r * 0.9], [x + r * 0.95, y + r * 0.7], [x + r * 0.35, y + r * 0.95], [x - r * 0.35, y + r * 0.95], [x - r * 0.95, y + r * 0.7]], {
        fill: t.base,
        stroke: INK,
        width: 1,
        smooth: true,
      });
      shape(ctx, [[x - r * 0.3, y - r * 0.6], [x - r * 0.1, y - r * 0.6], [x - r * 0.3, y + r * 0.6], [x - r * 0.65, y + r * 0.6]], { fill: t.highlight, alpha: 0.7 });
      ellipse(ctx, x, y + r * 0.95, r * 0.75, r * 0.2, { fill: t.shade, stroke: INK, width: 0.7 });
      break;
    }
    default:
      break;
  }
}

function spike(ctx: Ctx2D, stem: Vec2[], r: number, color: string): void {
  const t = shades(color);
  const buds = 7;
  for (let i = 0; i < buds; i++) {
    const f = 1 - i / buds;
    const idx = Math.max(0, stem.length - 1 - Math.round((i / buds) * (stem.length - 1) * 0.5));
    const p = stem[idx]!;
    const s = r * (0.5 + 0.5 * f);
    const side = i % 2 === 0 ? -1 : 1;
    ellipse(ctx, p[0] + side * s * 0.55, p[1], s * 0.85, s * 0.62, { fill: i % 3 === 0 ? t.light : t.base, stroke: INK, width: 0.8 });
  }
  const tip = stem[stem.length - 1]!;
  ellipse(ctx, tip[0], tip[1] - r * 0.3, r * 0.5, r * 0.65, { fill: t.highlight, stroke: INK, width: 0.8 });
}

/** A little patch of wildflowers: leaf tufts, stems and heads. */
export function drawFlowerPatch(ctx: Ctx2D, o: FlowerPatchOptions): void {
  const { rand, cx, baseY, w, h } = o;
  const leaf = shades(o.leaf ?? '#5f8a35');
  const r = o.r ?? Math.max(2.3, w * 0.07);
  softBlob(ctx, cx + w * 0.05, baseY - 1, w * 0.55, w * 0.14, '#1d160c', 0.3);
  softBlob(ctx, cx, baseY - 2, w * 0.46, w * 0.12, '#46702f', 0.4);

  // Leaves fill the base of the patch.
  const tufts = 3;
  for (let i = 0; i < tufts; i++) {
    const x = cx + (i / (tufts - 1) - 0.5) * w * 0.55;
    drawTuft(ctx, rand, { x, y: baseY - rand.range(0, 2), h: h * rand.range(0.28, 0.4), spread: w * 0.2, count: 6, dark: leaf.shade, base: leaf.base, light: leaf.light, ink: INK, inkW: 0.8 });
  }

  interface Stem {
    root: Vec2;
    top: Vec2;
    kind: FlowerKind;
    color: string;
    bend: number;
  }
  const stems: Stem[] = [];
  for (let i = 0; i < o.count; i++) {
    const t = o.count === 1 ? 0.5 : i / (o.count - 1);
    const rootX = cx + (t - 0.5) * w * 0.42 + rand.range(-1.5, 1.5);
    const root: Vec2 = [rootX, baseY - rand.range(0, 4)];
    const len = h * rand.range(0.52, 0.92) * (1 - Math.abs(t - 0.5) * 0.35);
    const lean = (t - 0.5) * w * 0.3 + rand.range(-2, 2);
    stems.push({ root, top: [root[0] + lean, root[1] - len], kind: rand.pick(o.kinds), color: rand.pick(o.colors), bend: rand.range(-3, 3) });
  }
  stems.sort((a, b) => a.root[1] - b.root[1]);

  for (const s of stems) {
    const pts = quadPts(s.root, [(s.root[0] + s.top[0]) / 2 + s.bend, (s.root[1] + s.top[1]) / 2], s.top, 5);
    shape(ctx, pts, { stroke: STEM, width: 1.2, closed: false, smooth: true });
    // A leaf or two on the stem.
    const lp = pts[2]!;
    const dir = s.top[0] >= s.root[0] ? 1 : -1;
    ellipse(ctx, lp[0] + dir * 2.2, lp[1] + 0.6, 2.6, 1, { rotation: dir * -0.5, fill: leaf.base, stroke: INK, width: 0.6 });
    if (s.kind === 'lavender') spike(ctx, pts.slice(2), r * 0.95, s.color);
    else head(ctx, s.kind, s.top[0], s.top[1], r, s.color, rand);
  }
}

/* ------------------------------------------------------------------------------------ */
/* Ferns                                                                                */
/* ------------------------------------------------------------------------------------ */

export interface FernOptions {
  cx: number;
  baseY: number;
  w: number;
  h: number;
  fronds: number;
  leaf: string;
  ink?: string;
  rand: Rng;
  shadow?: boolean;
}

/** A fern: a fountain of arching fronds, each lined with pairs of leaflets. */
export function drawFern(ctx: Ctx2D, o: FernOptions): void {
  const { rand, cx, baseY, w, h } = o;
  const ink = o.ink ?? INK;
  const tones = shades(o.leaf);
  if (o.shadow !== false) softBlob(ctx, cx + w * 0.06, baseY - 1, w * 0.5, w * 0.13, '#1d160c', 0.32);

  // Fronds are grown in a unit frame (base at the origin, y up is negative), then fitted to the box.
  const steps = 14;
  const raw: { pts: Vec2[]; a: number }[] = [];
  for (let i = 0; i < o.fronds; i++) {
    const t = o.fronds === 1 ? 0.5 : i / (o.fronds - 1);
    const a = Math.max(-1, Math.min(1, (t - 0.5) * 2 + rand.range(-0.1, 0.1)));
    const side = a < 0 ? -1 : 1;
    const lean = a * 1.08 + rand.range(-0.08, 0.08);
    const droop = (0.3 + 0.62 * Math.abs(a)) * side;
    const len = (1 - 0.36 * Math.abs(a) ** 1.4) * rand.range(0.92, 1.06);
    let x = 0;
    let y = 0;
    const pts: Vec2[] = [[0, 0]];
    for (let k = 1; k <= steps; k++) {
      const f = k / steps;
      const heading = lean + droop * f * f;
      x += (Math.sin(heading) * len) / steps;
      y -= (Math.cos(heading) * len) / steps;
      pts.push([x, y]);
    }
    raw.push({ pts, a });
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  for (const f of raw) {
    for (const p of f.pts) {
      minX = Math.min(minX, p[0]);
      maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]);
    }
  }
  const lm = Math.max(3.4, Math.min(w, h) * 0.2);
  const boxW = Math.max(4, w - lm * 1.6);
  const boxH = Math.max(4, h - lm * 0.9);
  const sx = boxW / Math.max(0.2, maxX - minX);
  const sy = boxH / Math.max(0.2, -minY);
  const midX = (minX + maxX) / 2;

  const order = raw.slice().sort((p, q) => Math.abs(p.a) - Math.abs(q.a));
  for (const f of order) {
    const spine = f.pts.map((p): Vec2 => [cx + (p[0] - midX) * sx, baseY + p[1] * sy]);
    const blades: Blade[] = [];
    const n = spine.length;
    for (let k = 3; k < n; k++) {
      const u = k / (n - 1);
      const p = spine[k]!;
      const q = spine[Math.min(n - 1, k + 1)]!;
      const p0 = spine[k - 1]!;
      const tl = Math.hypot(q[0] - p0[0], q[1] - p0[1]) || 1;
      const ux = (q[0] - p0[0]) / tl;
      const uy = (q[1] - p0[1]) / tl;
      const prof = Math.sin(Math.PI * Math.min(1, (u - 0.12) / 0.95)) ** 0.75;
      const len = lm * (0.3 + 0.7 * Math.max(0, prof)) * (k === n - 1 ? 0.8 : 1);
      for (const s of [-1, 1]) {
        const ang = s * (1.12 - 0.35 * u);
        const dx = ux * Math.cos(ang) - uy * Math.sin(ang);
        const dy = ux * Math.sin(ang) + uy * Math.cos(ang);
        const tip: Vec2 = [p[0] + dx * len, p[1] + dy * len];
        const facing = dx * -0.7 + dy * -0.7;
        const color = facing > 0.25 ? tones.light : facing < -0.25 ? tones.shade : tones.base;
        blades.push(makeBlade(p, tip, -s * len * 0.12 * (ux >= 0 ? 1 : -1), Math.max(1.6, lm * 0.3), color, facing > 0.1 ? tones.highlight : undefined));
      }
    }
    const tip = spine[n - 1]!;
    const last = spine[n - 2]!;
    blades.push(makeBlade(tip, [tip[0] + (tip[0] - last[0]) * 1.3, tip[1] + (tip[1] - last[1]) * 1.3], 0, Math.max(1.5, lm * 0.28), tones.base));
    blades.push(makeBlade(spine[0]!, spine[3]!, 0, 2.2, tones.shade));
    paintBlades(ctx, blades, ink, 0.9);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(spine[0]![0], spine[0]![1]);
    for (const p of spine) ctx.lineTo(p[0], p[1]);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = f.a < 0 ? tones.light : tones.base;
    ctx.lineWidth = 0.95;
    ctx.stroke();
    ctx.restore();
  }
}

/** Helper for symbols that need a stand-alone blade list (e.g. reeds in swamps). */
export function bladeFan(rand: Rng, x: number, y: number, h: number, spread: number, count: number, colors: readonly [string, string, string]): Blade[] {
  const out: Blade[] = [];
  for (let i = 0; i < count; i++) {
    const a = count === 1 ? 0 : (i / (count - 1) - 0.5) * 2;
    const len = h * rand.range(0.7, 1) * (1 - Math.abs(a) * 0.25);
    const tip: Vec2 = [x + a * spread, y - len];
    out.push(makeBlade([x + a * 2, y], tip, a * spread * 0.3 + rand.range(-1, 1), Math.max(1.4, h * 0.08), colors[a < -0.2 ? 2 : a > 0.3 ? 0 : 1]));
  }
  return out;
}

