import { mix, rgba } from '../kit/colors';
import { dot, ellipse, linearGradient, radialGradient, shades, shape, softBlob, taper } from '../kit/draw';
import { TAU } from '../kit/math';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { INK, paintLobes, quadPts, tube, type Lobe } from './nature-common';

/* ------------------------------------------------------------------------------------ */
/* Mushrooms                                                                            */
/* ------------------------------------------------------------------------------------ */

export interface MushroomPalette {
  cap: string;
  stem: string;
  /** Pale rim under the cap. */
  lip: string;
  spot?: string;
  glow?: string;
}

export const MUSHROOM = {
  red: { cap: '#cb3a2f', stem: '#efe4c8', lip: '#efdcb0', spot: '#fff4de' },
  brown: { cap: '#a56f3c', stem: '#e8d9b4', lip: '#d8c192', spot: '#d9ae72' },
  orange: { cap: '#e28a2a', stem: '#f0e3be', lip: '#efd9a2', spot: '#f8dc92' },
  purple: { cap: '#8c5db0', stem: '#e2d6e8', lip: '#d6c2e0', spot: '#eadcf4' },
  pale: { cap: '#cdb98a', stem: '#ede3c8', lip: '#e3d4a8', spot: '#a68f60' },
  glow: { cap: '#2fa5c2', stem: '#cfe9ec', lip: '#a8dfe8', spot: '#c4f8ff', glow: '#6fe9ff' },
} satisfies Record<string, MushroomPalette>;

export type MushroomKind = keyof typeof MUSHROOM;

interface MushroomShape {
  x: number;
  y: number;
  capW: number;
  capH: number;
  stemH: number;
  stemW: number;
  lean: number;
}

function capOutline(cx: number, cy: number, rx: number, ry: number, front: number): Vec2[] {
  const pts: Vec2[] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = Math.PI + (i / n) * Math.PI;
    pts.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]);
  }
  for (let i = 1; i < n; i++) {
    const t = (i / n) * Math.PI;
    pts.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry * front]);
  }
  return pts;
}

function mushroom(ctx: Ctx2D, rand: Rng, m: MushroomShape, pal: MushroomPalette, ink: string): void {
  const stem = shades(pal.stem);
  const cap = shades(pal.cap);
  const { x, y, capW, capH, stemH, stemW, lean } = m;
  const topX = x + lean;
  const topY = y - stemH;
  const bw = stemW * 1.45;

  // Stem: slightly flared foot, rounded base.
  const stemPts: Vec2[] = [
    [topX - stemW * 0.5, topY],
    [x - stemW * 0.52, y - stemH * 0.5],
    [x - bw * 0.5, y - 0.4],
    [x, y + stemW * 0.14],
    [x + bw * 0.5, y - 0.4],
    [x + stemW * 0.52, y - stemH * 0.5],
    [topX + stemW * 0.5, topY],
  ];
  shape(ctx, stemPts, {
    fill: linearGradient(ctx, x - bw * 0.5, 0, x + bw * 0.5, 0, [stem.highlight, stem.light, stem.base, stem.shade]),
    stroke: ink,
    width: 1.3,
    smooth: true,
  });

  // Cap.
  const capY = topY + capH * 0.12;
  const out = capOutline(topX, capY, capW / 2, capH, 0.3);
  shape(ctx, out, {
    fill: radialGradient(ctx, topX + capW * 0.1, capY - capH * 0.2, capW * 0.04, capW * 0.75, [[0, cap.highlight], [0.3, cap.light], [0.62, cap.base], [1, cap.deep]], topX - capW * 0.2, capY - capH * 0.6),
    stroke: ink,
    width: 1.4,
    smooth: true,
  });
  // Pale rim along the front lip.
  const lip: Vec2[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = (i / 10) * Math.PI;
    lip.push([topX + Math.cos(t) * capW * 0.46, capY + Math.sin(t) * capH * 0.3 * 0.82]);
  }
  shape(ctx, lip, { stroke: rgba(pal.lip, 0.9), width: Math.max(0.9, capH * 0.12), closed: false, smooth: true, cap: 'round' });

  if (pal.spot) {
    const n = Math.max(3, Math.round(capW / 3.4));
    for (let i = 0; i < n; i++) {
      const u = rand.range(-0.78, 0.78);
      const v = rand.range(0.14, 0.78);
      const cu = Math.sqrt(1 - u * u);
      const sx = topX + u * (capW / 2) * 0.9;
      const sy = capY - v * capH * cu * 0.92;
      const r = capW * rand.range(0.055, 0.1) * (0.55 + 0.45 * cu);
      ellipse(ctx, sx, sy, r, r * 0.66, { fill: pal.spot, stroke: rgba(INK, 0.35), width: 0.5 });
    }
  }
  // Soft highlight on the lit side of the dome.
  ellipse(ctx, topX - capW * 0.17, capY - capH * 0.6, capW * 0.15, capH * 0.12, { fill: cap.highlight, alpha: 0.5, rotation: -0.4 });
}

export interface MushroomOptions {
  cx: number;
  baseY: number;
  w: number;
  h: number;
  kind: MushroomKind;
  count: number;
  rand: Rng;
  ink?: string;
  shadow?: boolean;
  /** Custom palette; replaces the named kind. */
  palette?: MushroomPalette;
}

/** A cluster of mushrooms of different sizes. */
export function drawMushrooms(ctx: Ctx2D, o: MushroomOptions): void {
  const { rand, cx, baseY, w, h } = o;
  const pal: MushroomPalette = o.palette ?? MUSHROOM[o.kind];
  const ink = o.ink ?? INK;
  if (o.shadow !== false) softBlob(ctx, cx + w * 0.05, baseY - 1, w * 0.5, w * 0.12, '#1d160c', 0.32);
  if (pal.glow) {
    const g = ctx.createRadialGradient(cx, baseY - h * 0.35, 0, cx, baseY - h * 0.35, w * 0.62);
    g.addColorStop(0, rgba(pal.glow, 0.5));
    g.addColorStop(0.5, rgba(pal.glow, 0.18));
    g.addColorStop(1, rgba(pal.glow, 0));
    ctx.fillStyle = g;
    ctx.fillRect(cx - w * 0.7, baseY - h * 1.05, w * 1.4, h * 1.2);
  }
  const list: MushroomShape[] = [];
  const n = Math.max(1, o.count);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const big = i === Math.floor(n / 2);
    const k = big ? rand.range(0.92, 1) : rand.range(0.5, 0.8) * (1 - Math.abs(t - 0.5) * 0.3);
    const capW = w * 0.38 * k * (n === 1 ? 1.15 : 1);
    const stemH = h * 0.5 * k * rand.range(0.8, 1.15);
    list.push({
      x: cx + (t - 0.5) * (n === 1 ? 0 : w * 0.66) + rand.range(-1.5, 1.5),
      y: baseY - rand.range(0, h * 0.1),
      capW,
      capH: capW * rand.range(0.5, 0.64),
      stemH,
      stemW: capW * rand.range(0.26, 0.34),
      lean: rand.range(-1.2, 1.2) * k,
    });
  }
  list.sort((a, b) => a.y - b.y);
  for (const m of list) mushroom(ctx, rand, m, pal, ink);
}

/* ------------------------------------------------------------------------------------ */
/* Stumps and logs                                                                      */
/* ------------------------------------------------------------------------------------ */

export type StumpKind = 'cut' | 'broken' | 'mossy' | 'hollow';

export interface StumpOptions {
  cx: number;
  baseY: number;
  /** Diameter at the foot. */
  w: number;
  /** Height of the trunk. */
  h: number;
  kind: StumpKind;
  bark: string;
  wood: string;
  rand: Rng;
  ink?: string;
  shadow?: boolean;
}

function barkStrokes(ctx: Ctx2D, rand: Rng, x0: number, x1: number, y0: number, y1: number, n: number, color: string, width: number): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = x0 + ((i + rand.range(0.2, 0.8)) / n) * (x1 - x0);
    const a = y0 + (y1 - y0) * rand.range(0, 0.35);
    const b = y1 - (y1 - y0) * rand.range(0, 0.3);
    ctx.beginPath();
    ctx.moveTo(x, a);
    ctx.quadraticCurveTo(x + rand.range(-1.2, 1.2), (a + b) / 2, x + rand.range(-0.8, 0.8), b);
    ctx.stroke();
  }
  ctx.restore();
}

/** A tree stump seen from above: bark sides, flaring roots and a ringed top. */
export function drawStump(ctx: Ctx2D, o: StumpOptions): void {
  const { rand, cx, baseY, w, h } = o;
  const ink = o.ink ?? INK;
  const bark = shades(o.bark);
  const wood = shades(o.wood);
  const r = w * 0.43;
  const ry = r * 0.36;
  const baseCy = baseY - ry;
  const topR = r * 0.84;
  const topRy = topR * 0.36;
  const topY = baseCy - h;
  if (o.shadow !== false) softBlob(ctx, cx + r * 0.3, baseY - 1, r * 1.55, r * 0.5, '#1d160c', 0.34);

  // Roots flare out of the foot; darker than the bark so pale stumps keep a clear silhouette.
  const rootColor = mix(o.bark, '#5a4430', 0.4);
  const roots: Vec2[][] = [
    [[cx - r * 0.8, baseCy - h * 0.2], [cx - r * 1.28, baseY - 1]],
    [[cx + r * 0.8, baseCy - h * 0.2], [cx + r * 1.24, baseY - 0.5]],
    [[cx - r * 0.35, baseCy + ry * 0.7], [cx - r * 0.55, baseY + 1]],
    [[cx + r * 0.35, baseCy + ry * 0.7], [cx + r * 0.6, baseY + 0.5]],
  ];
  roots.forEach((p, i) => tube(ctx, p, Math.max(3, r * 0.34), Math.max(1.4, r * 0.14), rootColor, { ink, inkW: 0.9, shaded: false, round: i < 2 }));

  // Trunk silhouette.
  const rightTop: Vec2 = [cx + topR, topY];
  const pts: Vec2[] = [[cx - topR, topY], rightTop];
  for (let i = 0; i <= 12; i++) {
    const t = (i / 12) * Math.PI;
    pts.push([cx + Math.cos(t) * r, baseCy + Math.sin(t) * ry]);
  }
  shape(ctx, pts, {
    fill: linearGradient(ctx, cx - r, 0, cx + r, 0, [[0, bark.highlight], [0.2, bark.light], [0.55, bark.base], [0.86, bark.shade], [1, bark.deep]]),
    stroke: ink,
    width: 1.6,
  });
  barkStrokes(ctx, rand, cx - r * 0.82, cx + r * 0.82, topY + topRy * 0.6, baseCy + ry * 0.7, 6, rgba(bark.deep, 0.55), 0.9);
  barkStrokes(ctx, rand, cx - r * 0.9, cx - r * 0.2, topY + topRy, baseCy + ry * 0.4, 2, rgba(bark.highlight, 0.7), 0.8);

  // Top face.
  if (o.kind === 'broken') {
    const jag: Vec2[] = [];
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = cx - topR + t * topR * 2;
      const up = (0.25 + 0.75 * Math.abs(Math.sin(t * Math.PI * 2.4 + 0.7))) * h * 0.5 * (1 - Math.abs(t - 0.5) * 0.7) * (i % 2 ? 1 : 0.55);
      jag.push([x, topY - up]);
    }
    const poly: Vec2[] = [[cx - topR, topY + 1.5], ...jag, [cx + topR, topY + 1.5]];
    for (let i = 8; i >= 0; i--) {
      const t = (i / 8) * Math.PI;
      poly.push([cx + Math.cos(t) * topR, topY + Math.sin(t) * topRy]);
    }
    shape(ctx, poly, {
      fill: linearGradient(ctx, cx - topR, topY, cx + topR, topY, [wood.highlight, wood.light, wood.base, wood.shade]),
      stroke: ink,
      width: 1.5,
    });
    barkStrokes(ctx, rand, cx - topR * 0.8, cx + topR * 0.8, topY - h * 0.4, topY + topRy * 0.5, 4, rgba(wood.deep, 0.5), 0.8);
    ellipse(ctx, cx, topY + topRy * 0.3, topR * 0.5, topRy * 0.45, { fill: wood.shade, alpha: 0.7 });
  } else {
    ellipse(ctx, cx, topY, topR, topRy, { fill: ink, stroke: ink, width: 1.6 });
    ellipse(ctx, cx, topY, topR * 0.97, topRy * 0.95, {
      fill: radialGradient(ctx, cx + topR * 0.1, topY, topR * 0.05, topR * 1.1, [[0, wood.highlight], [0.5, wood.light], [1, wood.base]], cx - topR * 0.3, topY - topRy * 0.3),
    });
    ellipse(ctx, cx, topY, topR * 0.9, topRy * 0.88, { stroke: rgba(bark.base, 0.9), width: Math.max(0.8, r * 0.1) });
    if (o.kind === 'hollow') {
      ellipse(ctx, cx + topR * 0.05, topY + topRy * 0.05, topR * 0.56, topRy * 0.56, { fill: '#2a2015', stroke: rgba(wood.deep, 0.8), width: 1 });
      ellipse(ctx, cx - topR * 0.08, topY - topRy * 0.15, topR * 0.4, topRy * 0.34, { fill: '#3d2f20', alpha: 0.9 });
    } else {
      for (let i = 1; i <= 3; i++) ellipse(ctx, cx + i * 0.2, topY, topR * 0.22 * i + 0.2, topRy * 0.22 * i + 0.1, { stroke: rgba(wood.deep, 0.55), width: 0.7 });
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, topY);
      ctx.lineTo(cx + topR * 0.7, topY - topRy * 0.3);
      ctx.strokeStyle = rgba(wood.deep, 0.5);
      ctx.lineWidth = 0.7;
      ctx.stroke();
      ctx.restore();
    }
  }

  if (o.kind === 'mossy') {
    const moss: Lobe[] = [
      { x: cx - r * 0.55, y: topY + topRy * 0.2, rx: r * 0.34, ry: r * 0.2 },
      { x: cx - r * 0.1, y: topY - topRy * 0.5, rx: r * 0.28, ry: r * 0.16 },
      { x: cx - r * 0.75, y: baseCy - h * 0.1, rx: r * 0.32, ry: r * 0.24 },
      { x: cx + r * 0.62, y: baseCy + ry * 0.2, rx: r * 0.26, ry: r * 0.17 },
    ];
    moss.sort((a, b) => a.y - b.y);
    paintLobes(ctx, rand, moss, { base: '#6e9a3a', ink, inkW: 0.8, marks: 1, bumps: 5, amp: 0.1 });
  }
}

export interface LogOptions {
  cx: number;
  baseY: number;
  /** Length of the log. */
  w: number;
  /** Diameter of the log. */
  h: number;
  bark: string;
  wood: string;
  rand: Rng;
  moss?: boolean;
  /** Short branch stubs on the back. */
  stubs?: number;
  /** Mirror the cut end to the right. */
  flip?: boolean;
  /** Shelf fungi on the bark. */
  fungi?: string;
  ink?: string;
  shadow?: boolean;
  /** Tilt in radians. */
  tilt?: number;
}

/** A fallen log lying across the map with a ringed cut end. */
export function drawLog(ctx: Ctx2D, o: LogOptions): void {
  const { rand } = o;
  const ink = o.ink ?? INK;
  const bark = shades(o.bark);
  const wood = shades(o.wood);
  const r = o.h / 2;
  const half = o.w / 2 - r * 0.4;
  const dir = o.flip ? -1 : 1;
  if (o.shadow !== false) softBlob(ctx, o.cx + r * 0.3, o.baseY - 1, o.w * 0.5, r * 0.62, '#1d160c', 0.34);

  ctx.save();
  ctx.translate(o.cx, o.baseY - r * 1.02);
  ctx.rotate((o.tilt ?? 0) * dir);
  ctx.scale(dir, 1);

  const stubs = o.stubs ?? 0;
  for (let i = 0; i < stubs; i++) {
    const x = -half * 0.1 + (i / Math.max(1, stubs)) * half * 1.3 + rand.range(-2, 2);
    const len = r * rand.range(0.4, 0.7);
    const stub: Vec2[] = [[x, -r * 0.5], [x + rand.range(-2, 2.5), -r - len]];
    tube(ctx, stub, r * 0.85, r * 0.58, o.bark, { ink, inkW: 0.9, shaded: false });
    ellipse(ctx, stub[1]![0], stub[1]![1], r * 0.3, r * 0.17, { fill: o.wood, stroke: ink, width: 0.7 });
  }

  // Far (bark) end first, then the body, then the lit cut face on the left.
  const bodyTop = -r;
  const bodyBot = r;
  ellipse(ctx, half, 0, r * 0.4, r, { fill: ink, stroke: ink, width: 1.8 });
  shape(ctx, [[-half, bodyTop], [half, bodyTop], [half, bodyBot], [-half, bodyBot]], { fill: ink, stroke: ink, width: 1.8 });
  ellipse(ctx, half, 0, r * 0.4 - 0.4, r - 0.4, { fill: linearGradient(ctx, 0, -r, 0, r, [bark.light, bark.base, bark.deep]) });
  shape(ctx, [[-half, bodyTop + 0.4], [half, bodyTop + 0.4], [half, bodyBot - 0.4], [-half, bodyBot - 0.4]], {
    fill: linearGradient(ctx, 0, -r, 0, r, [[0, bark.highlight], [0.25, bark.light], [0.6, bark.base], [1, bark.deep]]),
  });
  // Long bark furrows.
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const y = -r * 0.8 + (i / 6) * r * 1.6 + rand.range(-1, 1);
    const x0 = rand.range(-half, half * 0.5);
    const x1 = Math.min(half * 0.96, x0 + rand.range(half * 0.25, half * 0.9));
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.quadraticCurveTo((x0 + x1) / 2, y + rand.range(-1.3, 1.3), x1, y + rand.range(-0.6, 0.6));
    ctx.strokeStyle = i < 3 ? rgba(bark.highlight, 0.55) : rgba(bark.deep, 0.55);
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }
  ctx.restore();
  // A knot.
  const kx = rand.range(-half * 0.3, half * 0.6);
  ellipse(ctx, kx, rand.range(-0.2, 0.4) * r, r * 0.26, r * 0.19, { fill: bark.shade, stroke: rgba(INK, 0.7), width: 0.8 });

  ellipse(ctx, -half, 0, r * 0.4, r, { fill: ink, stroke: ink, width: 1.8 });
  ellipse(ctx, -half, 0, r * 0.4 - 0.4, r - 0.4, { fill: radialGradient(ctx, -half + r * 0.1, 0, r * 0.05, r * 1.1, [[0, wood.highlight], [0.55, wood.light], [1, wood.base]], -half - r * 0.1, -r * 0.3) });
  for (let i = 1; i <= 3; i++) ellipse(ctx, -half, 0, r * 0.4 * (i / 4) + 0.2, r * (i / 4) + 0.2, { stroke: rgba(wood.deep, 0.55), width: 0.7 });

  if (o.moss) {
    const lobes: Lobe[] = [];
    const count = rand.int(2, 3);
    for (let i = 0; i < count; i++) lobes.push({ x: rand.range(-half * 0.2, half * 0.9), y: -r * rand.range(0.62, 0.92), rx: r * rand.range(0.7, 1.1), ry: r * rand.range(0.3, 0.42) });
    lobes.sort((a, b) => a.y - b.y);
    paintLobes(ctx, rand, lobes, { base: '#6e9a3a', ink, inkW: 0.8, marks: 1, bumps: 5, amp: 0.1 });
  }
  if (o.fungi) {
    for (let i = 0; i < 2; i++) {
      const fx = half * rand.range(0.1, 0.8);
      const fy = r * rand.range(0.1, 0.5);
      const f = shades(o.fungi);
      shape(ctx, [[fx - r * 0.34, fy], [fx - r * 0.3, fy - r * 0.26], [fx, fy - r * 0.36], [fx + r * 0.3, fy - r * 0.26], [fx + r * 0.34, fy]], { fill: f.base, stroke: ink, width: 0.8, smooth: true });
      ellipse(ctx, fx, fy - r * 0.04, r * 0.3, r * 0.09, { fill: f.shade, alpha: 0.8 });
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------------------------------ */
/* Briars and ivy                                                                       */
/* ------------------------------------------------------------------------------------ */

export interface BriarOptions {
  cx: number;
  baseY: number;
  w: number;
  h: number;
  cane: string;
  leaf: string;
  /** Wild roses. */
  bloom?: string;
  /** Dark berries. */
  berry?: string;
  rand: Rng;
  ink?: string;
}

function thorn(ctx: Ctx2D, x: number, y: number, ang: number, len: number, ink: string): void {
  const bx = Math.cos(ang + Math.PI / 2) * len * 0.34;
  const by = Math.sin(ang + Math.PI / 2) * len * 0.34;
  const tip: Vec2 = [x + Math.cos(ang) * len, y + Math.sin(ang) * len];
  shape(ctx, [[x - bx, y - by], tip, [x + bx, y + by]], { fill: '#e6d9b8', stroke: ink, width: 0.6 });
}

/** A bramble thicket: a dense dome of leaves wrapped in arching thorny canes. */
export function drawBriar(ctx: Ctx2D, o: BriarOptions): void {
  const { rand, cx, baseY, w, h } = o;
  const ink = o.ink ?? INK;
  const leaf = shades(o.leaf);
  softBlob(ctx, cx + w * 0.06, baseY - 1, w * 0.55, w * 0.14, '#1d160c', 0.34);

  const cane = (side: number, spread: number, lift: number, droop: number): Vec2[] => {
    const start: Vec2 = [cx + side * w * rand.range(0.02, 0.12), baseY - rand.range(0, 3)];
    const peak: Vec2 = [cx + side * w * spread * 0.55, baseY - h * lift];
    const end: Vec2 = [cx + side * w * spread, baseY - h * droop];
    return [...quadPts(start, [cx + side * w * 0.05, peak[1] - h * 0.12], peak, 5), ...quadPts(peak, [cx + side * w * spread * 0.85, peak[1] - h * 0.04], end, 5).slice(1)];
  };
  const paintCane = (pts: Vec2[], thick: number): void => {
    tube(ctx, pts, thick, thick * 0.4, o.cane, { ink, inkW: 0.85, shaded: false });
    for (let k = 2; k < pts.length - 1; k++) {
      const p = pts[k]!;
      const q = pts[k + 1]!;
      const tang = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const side = k % 2 === 0 ? 1 : -1;
      thorn(ctx, p[0], p[1], tang + side * (Math.PI / 2 - 0.45), thick * 1.25, ink);
    }
  };

  // Back canes poke out at the sides.
  paintCane(cane(-1, 0.5, 0.62, 0.14), 3.2);
  paintCane(cane(1, 0.5, 0.58, 0.18), 3.2);

  // The leaf mass.
  const lobes: Lobe[] = [];
  const nb = 4;
  for (let i = 0; i < nb; i++) {
    const t = i / (nb - 1);
    const r = h * rand.range(0.27, 0.32);
    lobes.push({ x: cx + (t - 0.5) * (w * 0.62 - r) + rand.range(-1, 1), y: baseY - r * 0.9, rx: r * 1.2, ry: r });
  }
  for (let i = 0; i < 3; i++) {
    const r = h * rand.range(0.25, 0.3);
    lobes.push({ x: cx + (i - 1) * w * 0.22 + rand.range(-1.5, 1.5), y: baseY - h * 0.66 + r * 0.5 + (i === 1 ? -h * 0.05 : 0), rx: r * 1.15, ry: r });
  }
  lobes.sort((a, b) => a.y - b.y);
  paintLobes(ctx, rand, lobes, { base: o.leaf, ink, inkW: Math.max(0.9, w * 0.022), marks: 3, bumps: 9, amp: 0.13 });
  for (let i = 0; i < 9; i++) {
    const l = rand.pick(lobes);
    const a = rand.range(Math.PI, TAU);
    const d = rand.range(0.2, 0.75);
    const x = l.x + Math.cos(a) * l.rx * d;
    const y = l.y + Math.sin(a) * l.ry * d * 0.8;
    ellipse(ctx, x, y, 2.7, 1.3, { rotation: rand.range(-1, 1), fill: i % 2 ? leaf.light : leaf.highlight, stroke: rgba(ink, 0.7), width: 0.5 });
  }

  // Front canes arch like hoops over the mass, with big pale thorns.
  const hoop = (x0: number, x1: number, peak: number): Vec2[] => {
    const a: Vec2 = [cx + x0 * w, baseY - rand.range(0, 2.5)];
    const b: Vec2 = [cx + x1 * w, baseY - rand.range(0, 3)];
    return quadPts(a, [(a[0] + b[0]) / 2 + rand.range(-2, 2), baseY - peak * h * 2], b, 9);
  };
  paintCane(hoop(-0.44, 0.02, 0.5), 2.7);
  paintCane(hoop(-0.02, 0.45, 0.46), 2.7);
  const shift = rand.chance(0.5) ? -0.08 : 0.08;
  paintCane(hoop(shift - 0.22, shift + 0.2, 0.72), 2.5);

  const marks = o.bloom ? 4 : o.berry ? 9 : 0;
  for (let i = 0; i < marks; i++) {
    const l = rand.pick(lobes);
    const a = rand.range(Math.PI * 0.9, TAU * 0.98);
    const d = rand.range(0.2, 0.7);
    const x = l.x + Math.cos(a) * l.rx * d;
    const y = l.y + Math.sin(a) * l.ry * d * 0.85;
    if (o.bloom) {
      const r = 2.5;
      dot(ctx, x, y, r + 1.1, rgba(ink, 0.9));
      for (let k = 0; k < 5; k++) dot(ctx, x + Math.cos((k * TAU) / 5 + x) * r * 0.75, y + Math.sin((k * TAU) / 5 + x) * r * 0.75, r * 0.74, o.bloom);
      dot(ctx, x, y, r * 0.45, '#f3cf55');
    } else if (o.berry) {
      dot(ctx, x, y, 2.3, ink);
      dot(ctx, x, y, 1.65, o.berry);
      dot(ctx, x - 0.55, y - 0.55, 0.55, 'rgba(255,255,255,0.75)');
    }
  }
}

export interface IvyOptions {
  cx: number;
  baseY: number;
  w: number;
  h: number;
  leaf: string;
  rand: Rng;
  count?: number;
  ink?: string;
}

const IVY_LEAF: Vec2[] = [
  [0, -1],
  [0.26, -0.55],
  [0.86, -0.42],
  [0.56, 0.02],
  [0.82, 0.52],
  [0.18, 0.42],
  [0, 0.72],
  [-0.18, 0.42],
  [-0.82, 0.52],
  [-0.56, 0.02],
  [-0.86, -0.42],
  [-0.26, -0.55],
];

/** One five-pointed ivy leaf with veins, pointing along `ang` (0 = up). */
export function ivyLeaf(ctx: Ctx2D, x: number, y: number, size: number, ang: number, color: string, ink: string): void {
  const t = shades(color);
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const pts: Vec2[] = IVY_LEAF.map((p): Vec2 => [x + (p[0] * c - p[1] * s) * size, y + (p[0] * s + p[1] * c) * size]);
  const lit = -(s * -1 + c * -1) > 0;
  shape(ctx, pts, {
    fill: linearGradient(ctx, x - size, y - size, x + size, y + size, [lit ? t.light : t.base, t.base, t.shade]),
    stroke: ink,
    width: Math.max(0.6, size * 0.14),
  });
  const tip: Vec2 = [x - s * size * 0.85, y - c * size * 0.85];
  const tail: Vec2 = [x + s * size * 0.6, y + c * size * 0.6];
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(tail[0], tail[1]);
  ctx.lineTo(tip[0], tip[1]);
  ctx.strokeStyle = rgba(t.highlight, 0.7);
  ctx.lineWidth = Math.max(0.5, size * 0.1);
  ctx.stroke();
  ctx.restore();
}

/** A mound of overlapping ivy leaves with a few trailing tendrils. */
export function drawIvy(ctx: Ctx2D, o: IvyOptions): void {
  const { rand, cx, baseY, w, h } = o;
  const ink = o.ink ?? INK;
  softBlob(ctx, cx + w * 0.06, baseY - 1, w * 0.55, w * 0.14, '#1d160c', 0.34);
  softBlob(ctx, cx, baseY - 2, w * 0.45, w * 0.12, '#355a28', 0.5);
  const n = o.count ?? 22;
  const leaves: { x: number; y: number; size: number; ang: number; color: string }[] = [];
  const pal = [o.leaf, shades(o.leaf).light, shades(o.leaf).shade];
  for (let i = 0; i < n; i++) {
    const a = rand.range(0, TAU);
    const d = Math.sqrt(rand.next());
    const x = cx + Math.cos(a) * w * 0.4 * d;
    const yy = Math.sin(a) * h * 0.36 * d;
    const y = baseY - h * 0.38 + yy;
    const size = Math.max(3.4, w * rand.range(0.1, 0.15));
    leaves.push({ x, y, size, ang: Math.atan2(yy, x - cx) + Math.PI / 2 + rand.range(-0.5, 0.5), color: pal[rand.int(0, 2)]! });
  }
  leaves.sort((p, q) => p.y - q.y);
  // Tendrils creeping out of the mound.
  for (let i = 0; i < 3; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const start: Vec2 = [cx + side * w * 0.2, baseY - h * 0.15];
    const end: Vec2 = [cx + side * w * rand.range(0.4, 0.48), baseY - rand.range(0, 3)];
    const pts = quadPts(start, [(start[0] + end[0]) / 2, baseY + 1], end, 5);
    taper(ctx, pts, 2.4, 1.2, ink);
    taper(ctx, pts, 1.2, 0.5, shades(o.leaf).shade);
    ivyLeaf(ctx, end[0], end[1] - 1, Math.max(3, w * 0.09), side * 1.2, o.leaf, ink);
  }
  for (const l of leaves) ivyLeaf(ctx, l.x, l.y, l.size, l.ang, l.color, ink);
}

export interface VinesOptions {
  cx: number;
  baseY: number;
  w: number;
  h: number;
  leaf: string;
  rand: Rng;
  stems?: number;
  /** Grapes or berries hanging from the vine. */
  fruit?: string;
  /** Trumpet flowers. */
  bloom?: string;
  ink?: string;
}

/** A creeping tangle of vines: wandering stems with alternate leaves, curling tendrils and fruit or flowers. */
export function drawVines(ctx: Ctx2D, o: VinesOptions): void {
  const { rand, cx, baseY, w, h } = o;
  const ink = o.ink ?? INK;
  const tones = shades(o.leaf);
  const stem = mix(tones.shade, '#5a4430', 0.45);
  softBlob(ctx, cx + w * 0.06, baseY - 1, w * 0.5, w * 0.12, '#1d160c', 0.3);
  softBlob(ctx, cx, baseY - 2, w * 0.4, w * 0.1, '#355a28', 0.45);

  const n = o.stems ?? 5;
  const rootY = baseY - h * 0.2;
  const leaves: { x: number; y: number; size: number; ang: number; color: string }[] = [];
  const fruit: Vec2[] = [];
  const leafColors = [o.leaf, tones.light, tones.shade];

  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0.5 : i / (n - 1);
    let ang = -Math.PI + 0.35 + f * (Math.PI - 0.7) + rand.range(-0.28, 0.28);
    if (rand.chance(0.25)) ang = rand.range(0.2, Math.PI - 0.2);
    const reach = w * rand.range(0.3, 0.46) * (1 + Math.abs(Math.cos(ang)) * 0.1);
    const steps = 9;
    const wob = rand.range(0.5, 0.95);
    const phase = rand.range(0, TAU);
    const pts: Vec2[] = [[cx + rand.range(-2, 2), rootY]];
    let dir = ang;
    for (let k = 1; k <= steps; k++) {
      dir += Math.sin(phase + k * 0.85) * 0.2 * wob;
      const last = pts[k - 1]!;
      const step = reach / steps;
      const nx = last[0] + Math.cos(dir) * step;
      const ny = last[1] + Math.sin(dir) * step * 0.74;
      pts.push([Math.min(w - 3, Math.max(3, nx)), Math.min(baseY - 1, Math.max(h * 0.18, ny))]);
    }
    tube(ctx, pts, 2.2, 1, stem, { ink, inkW: 0.8, shaded: false });
    for (let k = 2; k <= steps; k++) {
      const p = pts[k]!;
      const q = pts[k - 1]!;
      const side = k % 2 === 0 ? 1 : -1;
      const heading = Math.atan2(p[0] - q[0], -(p[1] - q[1]));
      const size = Math.max(3.2, w * rand.range(0.075, 0.11)) * (k === steps ? 0.8 : 1);
      const lx = p[0] + Math.cos(heading) * side * 1.5;
      const ly = p[1] + Math.sin(heading) * side * 1.5;
      leaves.push({ x: lx, y: ly, size, ang: heading + side * rand.range(0.7, 1.25), color: rand.pick(leafColors) });
      if (o.fruit && k > 3 && rand.chance(0.45)) fruit.push([p[0] + side * 1.2, p[1] + 2.5]);
      if (o.bloom && k > 3 && rand.chance(0.4)) fruit.push([p[0] - side * 2, p[1] + 0.5]);
    }
    // Curling tendril at the tip.
    const tip = pts[steps]!;
    const prev = pts[steps - 1]!;
    const base = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]);
    const turn = rand.chance(0.5) ? 1 : -1;
    const R = 4.2;
    const ccx = tip[0] + Math.cos(base + (turn * Math.PI) / 2) * R;
    const ccy = tip[1] + Math.sin(base + (turn * Math.PI) / 2) * R * 0.8;
    const curl: Vec2[] = [];
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      const phi = base - (turn * Math.PI) / 2 + turn * t * 4.6;
      const r = R * (1 - t * 0.78);
      curl.push([ccx + Math.cos(phi) * r, ccy + Math.sin(phi) * r * 0.8]);
    }
    taper(ctx, curl, 1.9, 0.9, ink);
    taper(ctx, curl, 0.9, 0.4, tones.base);
  }

  leaves.sort((p, q) => p.y - q.y);
  for (const l of leaves) ivyLeaf(ctx, l.x, l.y, l.size, l.ang, l.color, ink);

  for (const [x, y] of fruit) {
    if (o.fruit) {
      const r = Math.max(1.5, w * 0.036);
      const grape = [[0, 0], [-r * 0.9, -r * 0.8], [r * 0.9, -r * 0.8], [0, -r * 1.7]];
      for (const g of grape) dot(ctx, x + g[0]!, y + g[1]!, r + 0.7, ink);
      for (const g of grape) {
        dot(ctx, x + g[0]!, y + g[1]!, r, o.fruit);
        dot(ctx, x + g[0]! - r * 0.3, y + g[1]! - r * 0.3, r * 0.34, 'rgba(255,255,255,0.65)');
      }
    } else if (o.bloom) {
      const r = Math.max(2, w * 0.045);
      dot(ctx, x, y, r + 0.9, ink);
      for (let k = 0; k < 5; k++) dot(ctx, x + Math.cos((k * TAU) / 5 + x) * r * 0.7, y + Math.sin((k * TAU) / 5 + x) * r * 0.7, r * 0.66, o.bloom);
      dot(ctx, x, y, r * 0.4, '#f6dc6a');
    }
  }
}
