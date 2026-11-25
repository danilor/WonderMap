import { mix, rgba } from '../kit/colors';
import { clipped, dot, ellipse, linearGradient, radialGradient, shades, shape, softBlob, taper } from '../kit/draw';
import { TAU } from '../kit/math';
import { catmullRom, ribbon } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';

/** Foliage palettes shared by tree symbols. Light/shade tones are derived with `shades()`. */
export const FOLIAGE = {
  green: '#6f9a3a',
  olive: '#5f7f33',
  dark: '#3f6030',
  autumn: '#c9772b',
  red: '#b4492e',
  yellow: '#c8a636',
  jungle: '#3f9a4a',
  swamp: '#5b7a3f',
  frost: '#7fa28a',
  blossom: '#e3a1c0',
} as const;

export const BARK = { brown: '#6b4a2b', gray: '#6f6a62', dark: '#473524', birch: '#d8d2c4' } as const;

export interface TreeOptions {
  cx: number;
  /** Ground contact line. */
  baseY: number;
  w: number;
  h: number;
  leaf: string;
  ink: string;
  trunk?: string;
  rand: Rng;
  /** Soft ground shadow. Default true. */
  shadow?: boolean;
}

interface Lobe {
  x: number;
  y: number;
  r: number;
}

function ground(ctx: Ctx2D, o: TreeOptions, spread = 0.62): void {
  if (o.shadow !== false) softBlob(ctx, o.cx + o.w * 0.1, o.baseY, o.w * spread, o.w * spread * 0.32, '#1d160c', 0.34);
}

/** A round deciduous tree: a cluster of lit lobes with a single ink outline around the union. */
export function drawRoundTree(ctx: Ctx2D, o: TreeOptions & { lobes?: number; fruit?: string; trunkVisible?: number }): void {
  const { rand, cx, baseY, w, h } = o;
  const tones = shades(o.leaf);
  const R = w / 2;
  const canopyH = h * 0.86;
  const cy = baseY - h * 0.14 - canopyH / 2;
  const ky = canopyH / 2 / R;
  const inkW = Math.max(1, w * 0.04);

  ground(ctx, o);

  // Trunk peeks out under the canopy.
  const trunkH = h * (o.trunkVisible ?? 0.2);
  const trunkW = w * 0.15;
  shape(
    ctx,
    [
      [cx - trunkW / 2, baseY - trunkH],
      [cx + trunkW / 2, baseY - trunkH],
      [cx + trunkW * 0.75, baseY],
      [cx - trunkW * 0.75, baseY],
    ],
    { fill: o.trunk ?? BARK.brown, stroke: o.ink, width: inkW * 0.8 },
  );

  // Lobe layout: big center, top, flanks and two bottom lobes. Later lobes overlap earlier ones.
  const base: Lobe[] = [
    { x: 0, y: 0.02, r: 0.64 },
    { x: -0.5, y: 0.18, r: 0.5 },
    { x: 0.5, y: 0.2, r: 0.5 },
    { x: -0.12, y: -0.5, r: 0.5 },
    { x: 0.42, y: -0.26, r: 0.42 },
    { x: -0.42, y: -0.24, r: 0.42 },
    { x: -0.28, y: 0.56, r: 0.4 },
    { x: 0.3, y: 0.58, r: 0.4 },
  ];
  const lobes = base.slice(0, o.lobes ?? 8).map((l) => ({
    x: cx + (l.x + rand.range(-0.07, 0.07)) * R,
    y: cy + (l.y + rand.range(-0.06, 0.06)) * R * ky,
    r: l.r * R * rand.range(0.92, 1.1),
  }));

  // Ink first (union outline), then the lit fills.
  for (const l of lobes) dot(ctx, l.x, l.y, l.r + inkW, o.ink);
  for (const l of lobes) {
    const g = radialGradient(ctx, l.x + l.r * 0.2, l.y + l.r * 0.28, l.r * 0.1, l.r * 1.35, [
      [0, tones.highlight],
      [0.3, tones.light],
      [0.62, tones.base],
      [1, tones.deep],
    ], l.x - l.r * 0.34, l.y - l.r * 0.42);
    dot(ctx, l.x, l.y, l.r, g);
    // A darker rim on the lower right separates lobes from each other.
    ctx.save();
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r - inkW * 0.2, -0.2, Math.PI * 0.9);
    ctx.strokeStyle = rgba(tones.deep, 0.5);
    ctx.lineWidth = Math.max(0.8, w * 0.02);
    ctx.stroke();
    ctx.restore();
  }

  // Leaf specks.
  ctx.save();
  for (let i = 0; i < Math.round(w * 0.5); i++) {
    const l = rand.pick(lobes);
    const a = rand.range(0, TAU);
    const d = rand.range(0.1, 0.8) * l.r;
    const x = l.x + Math.cos(a) * d;
    const y = l.y + Math.sin(a) * d;
    const lit = x + y < l.x + l.y;
    ctx.fillStyle = lit ? rgba(tones.highlight, 0.5) : rgba(tones.deep, 0.35);
    ctx.fillRect(x, y, Math.max(0.8, w * 0.025), Math.max(0.8, w * 0.025));
  }
  ctx.restore();

  if (o.fruit) {
    for (let i = 0; i < 6; i++) {
      const l = rand.pick(lobes);
      const a = rand.range(0, TAU);
      const d = rand.range(0.2, 0.75) * l.r;
      dot(ctx, l.x + Math.cos(a) * d, l.y + Math.sin(a) * d, Math.max(1, w * 0.04), o.fruit);
    }
  }
}

/** A conifer: stacked jagged tiers, lit on the left and shaded on the right. */
export function drawPine(ctx: Ctx2D, o: TreeOptions & { tiers?: number; snow?: boolean }): void {
  const { rand, cx, baseY, w, h } = o;
  const tones = shades(o.leaf);
  const tiers = o.tiers ?? 4;
  const inkW = Math.max(1, w * 0.045);
  const trunkH = h * 0.14;
  const top = baseY - h;
  const body = h - trunkH * 0.6;

  ground(ctx, o, 0.55);
  shape(ctx, [[cx - w * 0.06, baseY - trunkH * 1.4], [cx + w * 0.06, baseY - trunkH * 1.4], [cx + w * 0.08, baseY], [cx - w * 0.08, baseY]], {
    fill: o.trunk ?? BARK.dark,
    stroke: o.ink,
    width: inkW * 0.7,
  });

  interface Tier {
    left: Vec2[];
    right: Vec2[];
    y0: number;
    y1: number;
    half: number;
  }
  const list: Tier[] = [];
  for (let i = 0; i < tiers; i++) {
    const t0 = i / tiers;
    const t1 = (i + 1) / tiers;
    const y0 = top + body * t0 * 0.88;
    const y1 = top + body * (0.34 + t1 * 0.66) * 0.98 - trunkH * 0.1;
    const half = (w / 2) * (0.38 + 0.62 * t1);
    const teeth = 3;
    const left: Vec2[] = [[cx, y0]];
    const right: Vec2[] = [[cx, y0]];
    for (let k = 1; k <= teeth; k++) {
      const f = k / teeth;
      const y = y0 + (y1 - y0) * f;
      const x = half * f * rand.range(0.92, 1.06);
      const notch = (y1 - y0) * 0.12;
      left.push([cx - x, y - (k === teeth ? 0 : notch * 0.4)]);
      right.push([cx + x, y - (k === teeth ? 0 : notch * 0.4)]);
      if (k < teeth) {
        left.push([cx - x * 0.62, y + notch * 0.2]);
        right.push([cx + x * 0.62, y + notch * 0.2]);
      }
    }
    left.push([cx, y1 - (y1 - y0) * 0.18]);
    right.push([cx, y1 - (y1 - y0) * 0.18]);
    list.push({ left, right, y0, y1, half });
  }

  const outline = (t: Tier): Vec2[] => [...t.left, ...t.right.slice().reverse()];
  for (let i = tiers - 1; i >= 0; i--) {
    const t = list[i]!;
    shape(ctx, outline(t), { stroke: o.ink, width: inkW * 1.6, fill: o.ink });
  }
  for (let i = tiers - 1; i >= 0; i--) {
    const t = list[i]!;
    shape(ctx, t.left, { fill: linearGradient(ctx, cx - t.half, t.y0, cx, t.y1, [tones.light, tones.base]) });
    shape(ctx, t.right, { fill: linearGradient(ctx, cx, t.y0, cx + t.half, t.y1, [tones.shade, tones.deep]) });
    // Shadow under each tier onto the one below.
    shape(ctx, outline(t), { stroke: rgba(tones.deep, 0.6), width: inkW * 0.4 });
    if (o.snow) {
      const depth = (t.y1 - t.y0) * 0.55;
      const yb = t.y0 + depth;
      const xb = t.half * 0.55;
      const cap: Vec2[] = [
        [cx, t.y0 - 0.5],
        [cx - xb * 0.6, t.y0 + depth * 0.5],
        [cx - xb, yb],
        [cx - xb * 0.5, yb - depth * 0.3],
        [cx - xb * 0.05, yb + depth * 0.1],
        [cx + xb * 0.45, yb - depth * 0.32],
        [cx + xb, yb - depth * 0.04],
        [cx + xb * 0.6, t.y0 + depth * 0.5],
      ];
      clipped(ctx, outline(t), () => shape(ctx, cap, { fill: 'rgba(250,252,255,0.92)', stroke: 'rgba(120,140,170,0.5)', width: 0.7 }));
    }
  }
}

/** A lens-shaped frond along a curved spine. */
function frond(ctx: Ctx2D, spine: Vec2[], maxW: number, fill: string, ink: string, rib: string): void {
  const n = spine.length - 1;
  const widths = spine.map((_, i) => Math.max(0.5, maxW * Math.sin(Math.PI * Math.min(1, (i / n) * 0.92 + 0.06)) ** 0.75));
  const outline = ribbon(spine, widths);
  shape(ctx, outline, { fill: ink, stroke: ink, width: Math.max(1, maxW * 0.22) });
  shape(ctx, outline, { fill });
  shape(ctx, spine.slice(1), { stroke: rib, width: 0.7, closed: false });
}

/** A palm: curved trunk and a crown of drooping fronds. */
export function drawPalm(ctx: Ctx2D, o: TreeOptions & { lean?: number }): void {
  const { rand, cx, baseY, w, h } = o;
  const tones = shades(o.leaf);
  const lean = (o.lean ?? rand.range(-0.16, 0.16)) * w;
  const topX = cx + lean;
  const topY = baseY - h * 0.7;

  ground(ctx, o, 0.5);

  const trunk = catmullRom([[cx, baseY], [cx + lean * 0.2, baseY - h * 0.28], [cx + lean * 0.75, baseY - h * 0.52], [topX, topY]], 8);
  taper(ctx, trunk, w * 0.17, w * 0.1, o.ink);
  taper(ctx, trunk, w * 0.12, w * 0.062, o.trunk ?? '#9a7a4e');
  for (let i = 1; i < trunk.length - 2; i += 3) {
    const p = trunk[i]!;
    const t = i / trunk.length;
    const half = (w * (0.12 - 0.058 * t)) / 2;
    shape(ctx, [[p[0] - half, p[1]], [p[0] + half, p[1] + half * 0.35]], { stroke: 'rgba(60,40,20,0.45)', width: 0.8, closed: false });
  }

  // Back fronds first, then the ones hanging in front.
  const fronds = 8;
  for (let i = 0; i < fronds; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const k = Math.floor(i / 2) / (fronds / 2 - 1);
    const len = w * rand.range(0.5, 0.6);
    const rise = (1 - k) * len * 0.42 + len * 0.1;
    const reach = len * (0.6 + 0.4 * (1 - k * 0.5));
    const end: Vec2 = [topX + side * reach, topY - rise * 0.2 + len * (0.18 + 0.5 * k)];
    const mid: Vec2 = [topX + side * reach * 0.5, topY - rise];
    const spine = catmullRom([[topX, topY], mid, end], 8);
    const col = k < 0.34 ? tones.shade : k < 0.67 ? tones.base : tones.light;
    frond(ctx, spine, w * 0.15, col, o.ink, rgba(tones.deep, 0.5));
  }
  dot(ctx, topX - w * 0.04, topY + w * 0.03, w * 0.05, BARK.brown);
  dot(ctx, topX + w * 0.05, topY + w * 0.04, w * 0.05, BARK.dark);
}

/** A bare tree: tapering trunk and recursive branches. */
export function drawDeadTree(ctx: Ctx2D, o: TreeOptions & { depth?: number }): void {
  const { rand, cx, baseY, w, h } = o;
  const bark = o.trunk ?? BARK.gray;
  const tones = shades(bark);
  const inkW = Math.max(1, w * 0.03);

  ground(ctx, o, 0.46);

  interface Limb {
    pts: Vec2[];
    w0: number;
    w1: number;
    depth: number;
  }
  const limbs: Limb[] = [];
  function branch(x: number, y: number, angle: number, len: number, width: number, depth: number): void {
    const bend = rand.range(-0.35, 0.35);
    const x2 = x + Math.cos(angle) * len;
    const y2 = y + Math.sin(angle) * len;
    const mx = x + Math.cos(angle + bend) * len * 0.5;
    const my = y + Math.sin(angle + bend) * len * 0.5;
    limbs.push({ pts: catmullRom([[x, y], [mx, my], [x2, y2]], 6), w0: width, w1: Math.max(0.5, width * 0.55), depth });
    if (depth <= 0) return;
    const kids = depth > 1 ? 2 : rand.int(1, 2);
    for (let k = 0; k < kids; k++) {
      const spread = rand.range(0.35, 0.8) * (k === 0 ? -1 : 1);
      branch(x2, y2, angle + spread, len * rand.range(0.55, 0.74), width * 0.62, depth - 1);
    }
  }
  const trunkW = w * 0.15;
  branch(cx, baseY, -Math.PI / 2 + rand.range(-0.08, 0.08), h * 0.33, trunkW, o.depth ?? 3);

  // One ink pass under all fills keeps the joints seamless.
  for (const l of limbs) taper(ctx, l.pts, l.w0 + inkW * 2, l.w1 + inkW * 2, o.ink);
  for (const l of limbs) taper(ctx, l.pts, l.w0, l.w1, mix(bark, tones.light, 0.3 + 0.1 * l.depth));
  for (const l of limbs) {
    const shadeSide = l.pts.map((p, i): Vec2 => [p[0] + (l.w0 * (1 - i / l.pts.length)) * 0.22, p[1]]);
    taper(ctx, shadeSide, l.w0 * 0.4, l.w1 * 0.3, rgba(tones.deep, 0.35));
  }
  ellipse(ctx, cx, baseY, trunkW * 0.9, trunkW * 0.3, { fill: rgba(tones.deep, 0.5) });
}

