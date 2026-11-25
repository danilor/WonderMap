import { mix, rgba } from '../kit/colors';
import { clipped, dot, ellipse, line, linearGradient, shades, shape, softBlob, taper } from '../kit/draw';
import { TAU, clamp, lerp } from '../kit/math';
import { catmullRom } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { FOAM, foamBlob, foamStrip, ripple } from './sea-fx';
import type { Hull, HullPaint, Pen } from './ship-parts';
import { WOOD, paintBarrel } from './ship-parts';

/** Pieces for shipwrecks: broken hulls with exposed ribs, snapped masts, shredded sails and flotsam. */

/** Sun-bleached, salt-soaked timber: duller and greyer than a ship's fresh paint. */
export function weathered(wood: string, amount = 0.3): string {
  return mix(wood, '#80786a', amount);
}

/** Pale, freshly splintered wood where something snapped. */
const SPLINTER = '#e9d2a2';

/** A ragged break line from `a` to `b`. */
export function zigzag(rand: Rng, a: Vec2, b: Vec2, amp: number, steps = 5): Vec2[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = dy / len;
  const ny = -dx / len;
  const out: Vec2[] = [a];
  for (let j = 1; j < steps; j++) {
    const k = (j + rand.range(-0.25, 0.25)) / steps;
    const o = (j % 2 ? 1 : -1) * amp * rand.range(0.5, 1.2);
    out.push([a[0] + dx * k + nx * o, a[1] + dy * k + ny * o]);
  }
  out.push(b);
  return out;
}

/* ------------------------------------------------------------------------------------ */
/* Broken hull                                                                          */
/* ------------------------------------------------------------------------------------ */

export interface Rib {
  /** Position along the hull (0 = stern, 1 = bow). */
  t: number;
  /** Height of the broken tip: 0 is the sheer, 1 the waterline, negative rises above the sheer. */
  top: number;
  lean?: number;
}

export interface WreckHull {
  wood: string;
  planks?: number;
  clinker?: boolean;
  bands?: HullPaint['bands'];
  /** The stretch of hull that survived (0..1 along its length). Cut ends are ragged. */
  from?: number;
  to?: number;
  /** Depth of the missing upper planking along the hull, as a fraction of its height (0 = intact). */
  gap?: (t: number) => number;
  ribs?: readonly Rib[];
  /** 0..1: blackened by fire. */
  char?: number;
  /** 0..1: algae along the waterline. */
  moss?: number;
  /** Ragged holes punched through the planking. */
  holes?: number;
  /** Painted inside the hull, after the ribs and before the planking (a mast standing in the hold). */
  inside?: () => void;
}

/** The top edge of the planking: a stair-step that follows the plank seams, with a few splintered ends. */
function brokenTop(rand: Rng, hull: Hull, i0: number, i1: number, rows: number, gap: (t: number) => number): Vec2[] {
  const n = hull.top.length - 1;
  const yAt = (i: number, k: number): Vec2 => [lerp(hull.top[i]![0], hull.bot[i]![0], k), lerp(hull.top[i]![1], hull.bot[i]![1], k)];
  const out: Vec2[] = [];
  let drift = 0;
  let prev = 0;
  for (let i = i0; i <= i1; i++) {
    const g = gap(i / n);
    let level = 0;
    if (g > 0) {
      if (rand.chance(0.5)) drift = clamp(drift + rand.range(-1, 1), -1.2, 1.2);
      level = clamp(Math.round(g * rows + drift), 0, rows - 1);
    }
    if (i > i0 && level !== prev) {
      const a = yAt(i, prev / rows);
      out.push([a[0] + rand.range(-0.5, 0.5), a[1]]);
    }
    out.push(yAt(i, level / rows));
    prev = level;
  }
  return out;
}

/** A hull with its upper planking torn away: dark interior, standing ribs, splintered plank ends. Returns the planking outline. */
export function paintWreckHull(pen: Pen, hull: Hull, p: WreckHull): Vec2[] {
  const { ctx, ink, u, rand } = pen;
  const n = hull.top.length - 1;
  const i0 = Math.round((p.from ?? 0) * n);
  const i1 = Math.round((p.to ?? 1) * n);
  const rows = p.planks ?? 4;
  const char = p.char ?? 0;
  const body = char > 0 ? mix(p.wood, '#1c1613', 0.7 * char) : p.wood;
  const tones = shades(body);
  const edge = brokenTop(rand, hull, i0, i1, rows, p.gap ?? (() => 0));
  const first = edge[0]!;
  const last = edge[edge.length - 1]!;
  const m = (hull.outline.length - 2 * (n + 1)) / 2;
  const bowEnd = hull.outline.slice(n + 1, n + 1 + m);
  const sternEnd = hull.outline.slice(2 * (n + 1) + m);
  const wall: Vec2[] = [
    ...edge,
    ...(i1 === n ? bowEnd : zigzag(rand, last, hull.bot[i1]!, 1.4 * u).slice(1, -1)),
    ...hull.bot.slice(i0, i1 + 1).reverse(),
    ...(i0 === 0 ? sternEnd : zigzag(rand, hull.bot[i0]!, first, 1.4 * u).slice(1, -1)),
  ];

  // Interior seen through the breach: the far wall's inner face, shadowed by the near wall.
  const far = hull.far.slice(i0, i1 + 1);
  const interior: Vec2[] = [
    ...far,
    ...(i1 === n ? [] : zigzag(rand, far[far.length - 1]!, last, 1.2 * u).slice(1, -1)),
    ...edge.slice().reverse(),
    ...(i0 === 0 ? [] : zigzag(rand, first, far[0]!, 1.2 * u).slice(1, -1)),
  ];
  const yMin = Math.min(...far.map((q) => q[1]));
  const yMax = Math.max(...edge.map((q) => q[1]));
  shape(ctx, interior, { fill: linearGradient(ctx, 0, yMin, 0, yMax + 1, [mix(body, '#150c07', 0.3), mix(body, '#150c07', 0.66)]), stroke: ink, width: 1 * u });
  clipped(ctx, interior, () => {
    for (let r = 1; r <= 3; r++) line(ctx, far.map((q): Vec2 => [q[0], q[1] + 2.3 * r]), rgba(tones.highlight, 0.2), 0.7 * u);
    shape(ctx, interior, { fill: linearGradient(ctx, 0, yMin, 0, yMax + 1, [rgba('#000000', 0), rgba('#000000', 0.38)]) });
    if (char > 0) shape(ctx, interior, { fill: linearGradient(ctx, 0, yMin, 0, yMax + 1, [rgba('#ff6a1a', 0), rgba('#ff6a1a', 0.42 * char)]) });
  });

  // Ribs stand in front of the interior; the planking hides their feet.
  const ribWood = mix(body, '#e8cf9d', 0.16 + 0.12 * char);
  const rt = shades(ribWood);
  for (const r of p.ribs ?? []) {
    const lean = r.lean ?? 0;
    const base = hull.at(r.t, 0.8);
    const mid = hull.at(r.t, (0.8 + r.top) / 2);
    const tip = hull.at(r.t, r.top);
    const pts = catmullRom([base, [mid[0] + lean * 0.45, mid[1]], [tip[0] + lean, tip[1]]], 6);
    const w0 = 2.7;
    const w1 = 2.1;
    taper(ctx, pts, w0 + 1.7 * u, w1 + 1.7 * u, ink);
    taper(ctx, pts, w0, w1, linearGradient(ctx, base[0] - w0, 0, base[0] + w0, 0, [rt.light, rt.base, rt.shade]));
    const tx = tip[0] + lean;
    const ty = tip[1];
    const hi = rand.range(2.2, 3.8);
    shape(ctx, [[tx - w1 / 2 - 0.2, ty + 0.8], [tx - w1 * 0.3, ty - hi * 0.6], [tx + 0.1, ty - 0.2], [tx + w1 * 0.3, ty - hi], [tx + w1 / 2 + 0.2, ty + 0.8]], { fill: char > 0 ? mix(SPLINTER, '#1c1613', 0.6) : SPLINTER, stroke: ink, width: 0.7 * u });
  }

  p.inside?.();

  // Planking.
  const x0 = hull.spec.sternX;
  const x1 = hull.spec.bowX;
  const yTop = Math.min(...hull.top.map((q) => q[1]));
  const rowPts = (k: number): Vec2[] => {
    const out: Vec2[] = [];
    for (let i = i0; i <= i1; i++) out.push([lerp(hull.top[i]![0], hull.bot[i]![0], k), lerp(hull.top[i]![1], hull.bot[i]![1], k)]);
    return out;
  };
  shape(ctx, wall, { fill: ink, stroke: ink, width: 2.5 * u });
  shape(ctx, wall, { fill: linearGradient(ctx, x0, yTop, x1, 2, [tones.light, tones.base, tones.shade]) });
  clipped(ctx, wall, () => {
    for (const b of p.bands ?? []) shape(ctx, [...rowPts(b.from), ...rowPts(b.to).reverse()], { fill: b.color, alpha: 0.85 });
    for (let k = 1; k < rows; k++) {
      const pts = rowPts(k / rows).map((q): Vec2 => [q[0], q[1] + rand.range(-0.3, 0.3)]);
      shape(ctx, pts, { stroke: rgba(tones.deep, 0.62), width: 0.8 * u, closed: false });
      if (p.clinker) shape(ctx, pts.map((q): Vec2 => [q[0], q[1] + 0.9 * u]), { stroke: rgba(tones.highlight, 0.3), width: 0.7 * u, closed: false });
    }
    // Butt joints between planks.
    for (let k = 0; k < rows; k++) {
      for (let j = 0; j < 3; j++) {
        const i = rand.int(Math.min(i1, i0 + 1), Math.max(i0, i1 - 1));
        const a: Vec2 = [lerp(hull.top[i]![0], hull.bot[i]![0], k / rows), lerp(hull.top[i]![1], hull.bot[i]![1], k / rows)];
        const b: Vec2 = [lerp(hull.top[i]![0], hull.bot[i]![0], (k + 1) / rows), lerp(hull.top[i]![1], hull.bot[i]![1], (k + 1) / rows)];
        line(ctx, [a, b], rgba(tones.deep, 0.5), 0.6 * u);
      }
    }
    // Cracks running down from the broken edge.
    for (let c = 0; c < 2; c++) {
      const s = edge[rand.int(1, Math.max(1, edge.length - 2))]!;
      const crack: Vec2[] = [s];
      for (let j = 1; j <= 3; j++) crack.push([s[0] + rand.range(-1.4, 1.4), s[1] + j * rand.range(1.6, 2.6)]);
      line(ctx, crack, rgba(ink, 0.55), 0.7 * u);
    }
    for (let h = 0; h < (p.holes ?? 0); h++) {
      const t = rand.range(lerp(i0 / n, i1 / n, 0.12), lerp(i0 / n, i1 / n, 0.88));
      const c = hull.at(t, rand.range(0.45, 0.72));
      const r = rand.range(1.7, 3);
      const pts: Vec2[] = [];
      for (let j = 0; j < 7; j++) {
        const a = (j / 7) * TAU;
        const rr = r * rand.range(0.65, 1.2);
        pts.push([c[0] + Math.cos(a) * rr * 1.25, c[1] + Math.sin(a) * rr * 0.85]);
      }
      shape(ctx, pts, { fill: '#100905', stroke: rgba(tones.highlight, 0.6), width: 1.3 * u });
      shape(ctx, pts, { stroke: ink, width: 0.7 * u });
    }
    // Algae along the waterline, a wet band, then light from the left.
    const moss = p.moss ?? 0.5;
    shape(ctx, wall, { fill: linearGradient(ctx, 0, -9, 0, 2, [rgba('#4a7f63', 0), rgba('#4a7f63', moss * 0.55)]) });
    shape(ctx, wall, { fill: linearGradient(ctx, 0, yTop * 0.45, 0, 2, [rgba(tones.deep, 0), rgba(tones.deep, 0.4)]) });
    shape(ctx, wall, { fill: linearGradient(ctx, x0, 0, x1, 0, [rgba(tones.highlight, 0.16), rgba(tones.deep, 0), rgba(tones.deep, 0.28)]) });
    if (char > 0) shape(ctx, wall, { fill: rgba('#0d0908', 0.32 * char) });
  });
  shape(ctx, edge.map((q): Vec2 => [q[0], q[1] + 0.9 * u]), { stroke: rgba(char > 0 ? tones.base : tones.highlight, 0.55), width: 0.8 * u, closed: false });
  if (char > 0) shape(ctx, edge.map((q): Vec2 => [q[0], q[1] + 0.6]), { stroke: rgba('#ff8a2a', 0.65 * char), width: 1.9 * u, closed: false });
  shape(ctx, edge, { stroke: ink, width: 1.1 * u, closed: false });
  return wall;
}

/* ------------------------------------------------------------------------------------ */
/* Masts, sails, rope                                                                   */
/* ------------------------------------------------------------------------------------ */

/** A mast snapped off at `topY`. Returns the broken tip. */
export function brokenMast(pen: Pen, x: number, baseY: number, topY: number, o: { w?: number; wood?: string; lean?: number } = {}): Vec2 {
  const { ctx, ink, u, rand } = pen;
  const w0 = o.w ?? 3;
  const w1 = w0 * 0.78;
  const lean = o.lean ?? 0;
  const tones = shades(o.wood ?? WOOD.dark);
  const pts = catmullRom([[x, baseY], [x + lean * 0.35, (baseY + topY) / 2], [x + lean, topY]], 6);
  taper(ctx, pts, w0 + 1.8 * u, w1 + 1.8 * u, ink);
  taper(ctx, pts, w0, w1, linearGradient(ctx, x - w0, 0, x + w0, 0, [tones.light, tones.base, tones.shade]));
  const tx = x + lean;
  const k = w1 / 2;
  shape(ctx, [[tx - k - 0.4, topY + 1.4], [tx - k * 0.5, topY - rand.range(2.2, 3.6)], [tx - 0.2, topY - 0.6], [tx + k * 0.3, topY - rand.range(3.6, 5.4)], [tx + k * 0.9, topY - 1], [tx + k + 0.4, topY + 1.4]], { fill: SPLINTER, stroke: ink, width: 0.8 * u });
  return [tx, topY];
}

/** A yard with a sail torn into long ribbons. `(x, y)` is the left end of the yard. */
export function shreds(pen: Pen, o: { x: number; y: number; w: number; h: number; cloth: string; tilt?: number; strips?: number; yard?: string | null }): void {
  const { ctx, ink, u, rand } = pen;
  const tones = shades(o.cloth);
  const n = o.strips ?? 5;
  const tilt = o.tilt ?? 0;
  const top: Vec2[] = [];
  for (let i = 0; i <= 6; i++) top.push([o.x + (o.w * i) / 6, o.y + (tilt * i) / 6]);
  const bottom: Vec2[] = [];
  const tears: Array<[Vec2, Vec2]> = [];
  for (let i = n; i >= 0; i--) {
    const px = o.x + (o.w * i) / n + Math.sin((i / n) * Math.PI) * o.w * 0.05;
    const py = o.y + (tilt * i) / n;
    const tip = i % 2 === 1 || i === 0 || i === n;
    const len = o.h * (tip ? rand.range(0.7, 1) : rand.range(0.3, 0.5));
    bottom.push([px + (tip ? rand.range(-0.8, 0.8) : 0), py + len]);
    if (!tip) tears.push([[px, py + 1], [px, py + len]]);
  }
  const outline: Vec2[] = [...top, ...bottom];
  shape(ctx, outline, { fill: linearGradient(ctx, o.x, 0, o.x + o.w, 0, [tones.highlight, o.cloth, tones.shade]) });
  clipped(ctx, outline, () => {
    for (const [a, b] of tears) line(ctx, [a, b], rgba(tones.deep, 0.5), 0.8 * u);
    shape(ctx, outline, { fill: linearGradient(ctx, 0, o.y, 0, o.y + o.h, [rgba(tones.deep, 0.35), rgba(tones.deep, 0)]) });
    for (let i = 0; i < 2; i++) {
      const c: Vec2 = [o.x + o.w * rand.range(0.2, 0.8), o.y + o.h * rand.range(0.25, 0.5)];
      const r = rand.range(1.2, 2.2);
      shape(ctx, [[c[0] - r, c[1]], [c[0], c[1] - r], [c[0] + r * 0.9, c[1] + r * 0.2], [c[0] + r * 0.2, c[1] + r]], { fill: rgba(ink, 0.7) });
    }
  });
  shape(ctx, outline, { stroke: rgba(ink, 0.92), width: 1 * u });
  if (o.yard !== null) {
    const a = top[0]!;
    const b = top[top.length - 1]!;
    const yt = shades(o.yard ?? WOOD.dark);
    line(ctx, [[a[0] - 2, a[1] - 0.3], [b[0] + 2, b[1] - 0.3]], ink, 3.4 * u);
    line(ctx, [[a[0] - 2, a[1] - 0.3], [b[0] + 2, b[1] - 0.3]], yt.base, 1.7);
  }
}

/** A frayed rope hanging from `a`. */
export function danglingRope(pen: Pen, a: Vec2, drop: number, sway = 1): void {
  const { ctx, ink, u } = pen;
  const pts: Vec2[] = [a, [a[0] + sway * 1.5, a[1] + drop * 0.45], [a[0] + sway * 0.4, a[1] + drop * 0.8], [a[0] + sway * 2.2, a[1] + drop]];
  shape(ctx, pts, { stroke: rgba(ink, 0.7), width: 0.7 * u, closed: false, smooth: true });
}

/* ------------------------------------------------------------------------------------ */
/* Flotsam                                                                              */
/* ------------------------------------------------------------------------------------ */

/** A plank floating on the sea. */
export function plankDebris(pen: Pen, x: number, y: number, len: number, angle = 0, wood: string = WOOD.pale): void {
  const { ctx, ink, u } = pen;
  const t = shades(weathered(wood, 0.2));
  const w = 2.7;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ellipse(ctx, 0.6, 1.4, len * 0.6, 1.9, { fill: rgba(FOAM, 0.55) });
  const poly: Vec2[] = [[-len / 2, -w / 2], [len / 2 - 1, -w / 2 + 0.2], [len / 2 + 0.9, 0.2], [len / 2 - 1.2, w / 2], [-len / 2 + 0.6, w / 2 - 0.2], [-len / 2 - 0.6, 0.3]];
  shape(ctx, poly, { fill: linearGradient(ctx, 0, -w / 2, 0, w / 2, [t.light, t.base, t.shade]), stroke: ink, width: 1 * u });
  dot(ctx, -len / 2 + 2.4, 0, 0.6, rgba(ink, 0.8));
  dot(ctx, len / 2 - 2.8, 0, 0.6, rgba(ink, 0.8));
  ctx.restore();
}

/** A barrel bobbing in the water. */
export function barrelDebris(pen: Pen, x: number, y: number, size = 6.4, wood: string = WOOD.pale): void {
  const { ctx, rand } = pen;
  paintBarrel(pen, x, y + 1.6, size, size * 1.05, weathered(wood, 0.2));
  foamStrip(ctx, rand, x - size * 0.9, x + size * 0.9, y, { depth: 1.8, scallop: 2.6, alpha: 0.9 });
}

/** A rope-wrapped bundle of planks, hatch cover or crate lid. */
export function wreckage(pen: Pen, x: number, y: number, s = 1): void {
  const { ctx, rand } = pen;
  plankDebris(pen, x - 4 * s, y, 11 * s, rand.range(-0.25, 0.1));
  plankDebris(pen, x + 3 * s, y - 1.6 * s, 8 * s, rand.range(0.1, 0.5), WOOD.oak);
  foamBlob(ctx, rand, x, y + 1, 9 * s, 2.2 * s, { alpha: 0.4, edge: false });
}

/** A ragged hole in a flat surface, with a pale splintered rim. */
export function splinterHole(pen: Pen, cx: number, cy: number, r: number): void {
  const { ctx, ink, u, rand } = pen;
  const pts: Vec2[] = [];
  const n = 9;
  for (let j = 0; j < n; j++) {
    const a = (j / n) * TAU + rand.range(-0.2, 0.2);
    const rr = r * (j % 2 ? rand.range(0.5, 0.75) : rand.range(0.95, 1.3));
    pts.push([cx + Math.cos(a) * rr * 1.2, cy + Math.sin(a) * rr * 0.9]);
  }
  shape(ctx, pts, { fill: '#120a06', stroke: SPLINTER, width: 1.5 * u });
  shape(ctx, pts, { stroke: ink, width: 0.7 * u });
}

/** A small perched gull in profile, facing right (`dir = -1` flips it). */
export function gull(pen: Pen, x: number, y: number, s = 1, dir = 1): void {
  const { ctx, ink, u } = pen;
  const w = (0.75 * u) / s;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * s, s);
  shape(ctx, [[-3.6, -3.2], [-8, -2.6], [-3.6, -1.2]], { fill: '#e6e3da', stroke: ink, width: w });
  ellipse(ctx, 0, -2.6, 4.6, 2.7, { fill: linearGradient(ctx, 0, -5.4, 0, 0, ['#fffefa', '#d3d1c8']), stroke: ink, width: w });
  shape(ctx, [[-3.4, -4], [1, -4.8], [3.2, -3], [-0.6, -1.7], [-6.4, -2.4]], { fill: '#8f969c', stroke: ink, width: w * 0.8 });
  ellipse(ctx, 3.9, -5.4, 2, 1.9, { fill: '#fffefa', stroke: ink, width: w });
  shape(ctx, [[5.5, -5.9], [8.2, -5.1], [5.6, -4.5]], { fill: '#e8b13a', stroke: ink, width: w * 0.8 });
  dot(ctx, 4.4, -5.9, 0.55, ink);
  line(ctx, [[-0.6, -0.3], [-0.6, 2.2]], ink, w * 1.2);
  line(ctx, [[1.2, -0.3], [1.2, 2.2]], ink, w * 1.2);
  ctx.restore();
}

/** Soft grey smoke drifting up from `(x, y)`. */
export function smoke(pen: Pen, x: number, y: number, rise: number): void {
  const { ctx, rand } = pen;
  const n = 6;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    const r = 2.4 + k * 5.4;
    softBlob(ctx, x + Math.sin(i * 1.9 + x) * (1.4 + k * 3), y - k * rise + rand.range(-1, 1), r * 1.15, r, '#3d3b3f', 0.34 * (1 - k * 0.55));
  }
}

/** Glowing embers scattered over charred timber. */
export function embers(pen: Pen, pts: ReadonlyArray<Vec2>): void {
  const { ctx } = pen;
  for (const [x, y] of pts) {
    dot(ctx, x, y, 1.9, rgba('#ff8a2a', 0.28));
    dot(ctx, x, y, 0.95, '#ffb347');
    dot(ctx, x, y, 0.45, '#fff0b0');
  }
}

/* ------------------------------------------------------------------------------------ */
/* The sea around a wreck                                                               */
/* ------------------------------------------------------------------------------------ */

export type Transform = (p: Vec2) => Vec2;

/** A rotation about `(pivot, 0)` followed by a translation, as a point transform (for locating where a hull meets the sea). */
export function rigid(dx: number, dy: number, angle: number, pivot = 0): Transform {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return (p) => {
    const x = p[0] - pivot;
    return [c * x - s * p[1] + pivot + dx, s * x + c * p[1] + dy];
  };
}

/** Applies the same transform as `rigid` to the canvas for the duration of `fn`. */
export function inFrame(ctx: Ctx2D, dx: number, dy: number, angle: number, pivot: number, fn: () => void): void {
  ctx.save();
  ctx.translate(pivot + dx, dy);
  ctx.rotate(angle);
  ctx.translate(-pivot, 0);
  fn();
  ctx.restore();
}

/** The x-range where a polygon crosses the water surface (y = 0 by default). */
export function waterSpan(poly: readonly Vec2[], tf: Transform, y = 0): [number, number] | null {
  const q = poly.map(tf);
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < q.length; i++) {
    const a = q[i]!;
    const b = q[(i + 1) % q.length]!;
    if ((a[1] - y) * (b[1] - y) < 0) {
      const x = a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]);
      lo = Math.min(lo, x);
      hi = Math.max(hi, x);
    }
  }
  return lo <= hi ? [lo, hi] : null;
}

/** Tints everything already drawn below the water surface, so a sunken hull fades into the sea. */
export function submerge(ctx: Ctx2D, x0: number, x1: number, o: { y?: number; depth?: number; color?: string; alpha?: number } = {}): void {
  const y = o.y ?? 0.3;
  const depth = o.depth ?? 40;
  const c = o.color ?? '#1b6d8e';
  const a = o.alpha ?? 0.62;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = linearGradient(ctx, 0, y, 0, y + depth, [rgba(c, a * 0.75), rgba(c, a)]);
  ctx.fillRect(x0, y, x1 - x0, depth);
  ctx.restore();
}

/** Foam and ripples where a wreck breaks the surface. */
export function surfaceFoam(pen: Pen, x0: number, x1: number, o: { y?: number; alpha?: number } = {}): void {
  const { ctx, rand } = pen;
  const y = o.y ?? 0.3;
  const alpha = o.alpha ?? 0.92;
  // Lapping foam in a few stretches, not one solid bar.
  let x = x0 - 1;
  while (x < x1) {
    const end = Math.min(x1 + 1, x + rand.range(9, 20));
    foamStrip(ctx, rand, x, end, y + rand.range(-0.2, 0.3), { depth: rand.range(2, 3.2), alpha, scallop: rand.range(3.2, 4.4) });
    x = end + rand.range(0, 3.5);
  }
  for (let xx = x0 + 3; xx < x1 - 8; xx += rand.range(14, 26)) foamStrip(ctx, rand, xx, xx + rand.range(6, 11), y + 2.8, { depth: 1.6, alpha: alpha * 0.6, scallop: 3 });
  foamBlob(ctx, rand, x0 - 2, y + 2.4, 5, 1.8, { alpha: 0.5, edge: false });
  foamBlob(ctx, rand, x1 + 2, y + 2.6, 6, 2, { alpha: 0.5, edge: false });
  ripple(ctx, x1 + 7, y + 5, 8, 2, { alpha: 0.5, rings: 2 });
  ripple(ctx, x0 - 7, y + 6, 6, 1.6, { alpha: 0.4, rings: 2 });
}

/** A sail floating on the water: limp, wrinkled cloth. */
export function floatingCloth(pen: Pen, cx: number, cy: number, w: number, cloth: string): void {
  const { ctx, ink, u, rand } = pen;
  const tones = shades(cloth);
  const pts: Vec2[] = [];
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const r = 1 + rand.range(-0.16, 0.16) + 0.14 * Math.sin(a * 3 + cx);
    pts.push([cx + Math.cos(a) * w * 0.5 * r, cy + Math.sin(a) * w * 0.17 * r]);
  }
  foamBlob(ctx, rand, cx, cy + 0.8, w * 0.55, w * 0.2, { alpha: 0.4, edge: false });
  shape(ctx, pts, { fill: linearGradient(ctx, cx - w / 2, cy - 3, cx + w / 2, cy + 3, [tones.highlight, cloth, tones.shade]), stroke: rgba(ink, 0.85), width: 0.9 * u, smooth: true });
  clipped(
    ctx,
    pts,
    () => {
      for (let i = 0; i < 4; i++) {
        const x = cx - w * 0.36 + (i * w * 0.72) / 3;
        line(ctx, [[x, cy - 2.4], [x + rand.range(-2, 2), cy + 2.4]], rgba(tones.deep, 0.45), 0.6 * u);
      }
    },
    true,
  );
}
