import { mix, rgba } from '../kit/colors';
import { clipped, dot, ellipse, line, linearGradient, radialGradient, shades, shape, taper } from '../kit/draw';
import { TAU, lerp } from '../kit/math';
import { catmullRom } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';

/**
 * Building blocks for ships: hulls, castles, masts, sails, flags, rigging and a few props.
 * Everything draws in a local frame where `(0, 0)` is the middle of the waterline, +x is the bow and +y is down.
 */

export const WOOD = {
  oak: '#8d5b36',
  dark: '#5f3d25',
  red: '#9a4034',
  pale: '#b78d5a',
  pine: '#c39a63',
  black: '#3b3534',
  navy: '#38526f',
  teal: '#3d7471',
} as const;

export const CLOTH = {
  cream: '#efe4c4',
  white: '#f7f2e4',
  sand: '#dbc89b',
  red: '#b8443a',
  blue: '#4a6f9d',
  black: '#35353f',
  rust: '#b46a3c',
  green: '#52875a',
  yellow: '#d9ab3b',
  purple: '#7a4f86',
} as const;

export interface Pen {
  ctx: Ctx2D;
  rand: Rng;
  ink: string;
  /** Line-width multiplier: above 1 when a ship is drawn small, so outlines keep their weight. */
  u: number;
}

/* ------------------------------------------------------------------------------------ */
/* Hull                                                                                 */
/* ------------------------------------------------------------------------------------ */

export interface HullSpec {
  /** X of the stern / bow where they meet the sheer line (top edge). */
  sternX: number;
  bowX: number;
  /** X of the stern / bow where they meet the waterline. A bow that is further forward at the top is raked. */
  sternWl: number;
  bowWl: number;
  /** Sheer height above the waterline at the stern, amidships and at the bow. */
  sternH: number;
  waistH: number;
  bowH: number;
  /** How quickly the sheer rises toward the stern / bow (bigger = flatter in the middle). */
  sweepA?: number;
  sweepB?: number;
  /** How far the keel line lifts out of the water at the ends. */
  lift?: number;
  /** Visible depth of the deck beyond the near rail (3/4 view). */
  deck?: number;
  /** How far the hull is drawn below the waterline (hidden by foam). */
  depth?: number;
  /** Outward bulge of the stem / sternpost curve (negative = hollow). */
  stemBow?: number;
  stemStern?: number;
}

export interface Hull {
  spec: HullSpec;
  /** Sheer line from stern to bow. */
  top: Vec2[];
  /** Waterline from stern to bow. */
  bot: Vec2[];
  /** Far rail (deck sliver is between `top` and `far`). */
  far: Vec2[];
  outline: Vec2[];
  /** Point on the sheer line (0 = stern, 1 = bow). */
  sheer(t: number): Vec2;
  /** Point between the sheer (k = 0) and the waterline (k = 1). */
  at(t: number, k: number): Vec2;
}

function along(pts: readonly Vec2[], t: number): Vec2 {
  const f = Math.max(0, Math.min(1, t)) * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(f));
  const r = f - i;
  return [lerp(pts[i]![0], pts[i + 1]![0], r), lerp(pts[i]![1], pts[i + 1]![1], r)];
}

function bulgeLine(a: Vec2, b: Vec2, bulge: number, steps = 6): Vec2[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = dy / len;
  const ny = -dx / len;
  const out: Vec2[] = [];
  for (let j = 1; j < steps; j++) {
    const k = j / steps;
    const o = Math.sin(Math.PI * k) * bulge;
    out.push([a[0] + dx * k + nx * o, a[1] + dy * k + ny * o]);
  }
  return out;
}

export function buildHull(spec: HullSpec, n = 30): Hull {
  const sweepA = spec.sweepA ?? 2.4;
  const sweepB = spec.sweepB ?? 2.4;
  const lift = spec.lift ?? 2;
  const depth = spec.depth ?? 1.6;
  const deck = spec.deck ?? 4;
  const top: Vec2[] = [];
  const bot: Vec2[] = [];
  const far: Vec2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const rise = spec.waistH + (spec.sternH - spec.waistH) * (1 - t) ** sweepA + (spec.bowH - spec.waistH) * t ** sweepB;
    const p: Vec2 = [lerp(spec.sternX, spec.bowX, t), -rise];
    top.push(p);
    bot.push([lerp(spec.sternWl, spec.bowWl, t), -lift * ((1 - t) ** 4 + t ** 4) + depth]);
    far.push([p[0], p[1] - deck * Math.sin(Math.PI * t) ** 0.7]);
  }
  const outline: Vec2[] = [...top, ...bulgeLine(top[n]!, bot[n]!, spec.stemBow ?? 1.5), ...bot.slice().reverse(), ...bulgeLine(bot[0]!, top[0]!, spec.stemStern ?? 0)];
  return {
    spec,
    top,
    bot,
    far,
    outline,
    sheer: (t) => along(top, t),
    at: (t, k) => {
      const a = along(top, t);
      const b = along(bot, t);
      return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
    },
  };
}

export interface HullPaint {
  wood: string;
  deck?: string;
  /** Number of plank rows (default 4). */
  planks?: number;
  /** Overlapping boards: each row gets a lit upper edge. */
  clinker?: boolean;
  /** Painted stripes, as fractions of the hull height measured from the sheer. */
  bands?: ReadonlyArray<{ from: number; to: number; color: string }>;
  rail?: string;
  /** Darkness of the wet band at the waterline (default 0.4). */
  wet?: number;
}

function row(hull: Hull, k: number, from = 0, to = 1): Vec2[] {
  const out: Vec2[] = [];
  const n = hull.top.length - 1;
  for (let i = Math.round(from * n); i <= Math.round(to * n); i++) {
    const a = hull.top[i]!;
    const b = hull.bot[i]!;
    out.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k)]);
  }
  return out;
}

export function paintHull(pen: Pen, hull: Hull, p: HullPaint): void {
  const { ctx, ink, u, rand } = pen;
  const tones = shades(p.wood);
  const deckTones = shades(p.deck ?? mix(p.wood, '#f0d9a2', 0.45));
  const { top, far, outline } = hull;
  const x0 = hull.spec.sternX;
  const x1 = hull.spec.bowX;
  const yTop = Math.min(...top.map((q) => q[1]));

  // Deck sliver: the inside of the far rail and the planks you see in the 3/4 view.
  const deckPoly: Vec2[] = [...top, ...far.slice().reverse()];
  shape(ctx, deckPoly, { fill: linearGradient(ctx, x0, 0, x1, 0, [deckTones.light, deckTones.base, deckTones.shade]), stroke: ink, width: 1 * u });
  shape(ctx, far.map((q): Vec2 => [q[0], q[1] + 1.1 * u]), { stroke: rgba(tones.deep, 0.55), width: 0.9 * u, closed: false });

  // Hull body: ink first, then fills, so the outline stays clean.
  shape(ctx, outline, { fill: ink, stroke: ink, width: 2.5 * u });
  shape(ctx, outline, { fill: linearGradient(ctx, x0, yTop, x1, 2, [tones.light, tones.base, tones.shade]) });

  clipped(ctx, outline, () => {
    for (const b of p.bands ?? []) {
      shape(ctx, [...row(hull, b.from), ...row(hull, b.to).reverse()], { fill: b.color });
    }
    const rows = p.planks ?? 4;
    for (let k = 1; k < rows; k++) {
      const pts = row(hull, k / rows).map((q): Vec2 => [q[0], q[1] + rand.range(-0.25, 0.25)]);
      shape(ctx, pts, { stroke: rgba(tones.deep, 0.55), width: 0.75 * u, closed: false });
      if (p.clinker) shape(ctx, pts.map((q): Vec2 => [q[0], q[1] + 0.9 * u]), { stroke: rgba(tones.highlight, 0.35), width: 0.7 * u, closed: false });
    }
    // Wet band and a cool shade toward the bow keep the hull from looking flat.
    const wet = p.wet ?? 0.4;
    shape(ctx, outline, { fill: linearGradient(ctx, 0, yTop * 0.45, 0, 2, [rgba(tones.deep, 0), rgba(tones.deep, wet)]) });
    shape(ctx, outline, { fill: linearGradient(ctx, x0, 0, x1, 0, [rgba(tones.highlight, 0.18), rgba(tones.deep, 0), rgba(tones.deep, 0.28)]) });
  });

  // Top rail along the sheer.
  const railW = 1.9 * u;
  const rail: Vec2[] = [...top, ...top.slice().reverse().map((q): Vec2 => [q[0], q[1] + railW])];
  shape(ctx, rail, { fill: p.rail ?? tones.highlight, alpha: p.rail ? 1 : 0.55 });
  shape(ctx, top, { stroke: ink, width: 1.1 * u, closed: false });
}

/* ------------------------------------------------------------------------------------ */
/* Castles (raised platforms)                                                           */
/* ------------------------------------------------------------------------------------ */

export interface CastleSpec {
  t0: number;
  t1: number;
  /** Height of the platform above the highest sheer point inside its span. */
  rise: number;
  wood: string;
  /** Merlons along the parapet (0 = a plain rail). */
  merlons?: number;
  windows?: number;
  /** Visible depth of the platform top. */
  deck?: number;
  trim?: string;
}

/** A raised stern or fore castle sitting on the sheer line. Returns the top-left and top-right corners of its roof. */
export function paintCastle(pen: Pen, hull: Hull, c: CastleSpec): { left: Vec2; right: Vec2 } {
  const { ctx, ink, u } = pen;
  const tones = shades(c.wood);
  const base: Vec2[] = [];
  const steps = 8;
  let topY = Infinity;
  for (let i = 0; i <= steps; i++) {
    const p = hull.sheer(lerp(c.t0, c.t1, i / steps));
    base.push(p);
    topY = Math.min(topY, p[1]);
  }
  topY -= c.rise;
  const xa = base[0]![0];
  const xb = base[steps]![0];
  const face: Vec2[] = [[xa, topY], [xb, topY], ...base.slice().reverse()];
  const d = c.deck ?? 3.2;

  // Roof (the platform seen from above) behind the front face.
  const roof: Vec2[] = [[xa, topY], [xb, topY], [xb - 1.2, topY - d], [xa + 1.2, topY - d]];
  shape(ctx, roof, { fill: linearGradient(ctx, xa, 0, xb, 0, [mix(c.wood, '#f0d9a2', 0.55), mix(c.wood, '#f0d9a2', 0.3)]), stroke: ink, width: 1 * u });

  shape(ctx, face, { fill: ink, stroke: ink, width: 2.2 * u });
  shape(ctx, face, { fill: linearGradient(ctx, xa, topY, xb, topY + c.rise * 1.2, [tones.light, tones.base, tones.shade]) });
  clipped(ctx, face, () => {
    for (let k = 1; k < 3; k++) {
      const y = topY + (c.rise * 1.1 * k) / 3;
      line(ctx, [[xa - 1, y], [xb + 1, y]], rgba(tones.deep, 0.5), 0.7 * u);
    }
    if (c.trim) shape(ctx, [[xa, topY], [xb, topY], [xb, topY + 1.6 * u], [xa, topY + 1.6 * u]], { fill: c.trim });
    shape(ctx, face, { fill: linearGradient(ctx, 0, topY, 0, topY + c.rise * 1.6, [rgba(tones.deep, 0), rgba(tones.deep, 0.32)]) });
  });

  // Little lit windows.
  const wins = c.windows ?? 0;
  for (let i = 0; i < wins; i++) {
    const wx = lerp(xa, xb, (i + 0.5) / wins);
    const wy = topY + c.rise * 0.42;
    shape(ctx, [[wx - 1.3 * u, wy], [wx + 1.3 * u, wy], [wx + 1.3 * u, wy + 2.6 * u], [wx - 1.3 * u, wy + 2.6 * u]], { fill: '#f1cf72', stroke: ink, width: 0.7 * u });
  }

  const m = c.merlons ?? 0;
  if (m > 0) {
    const span = xb - xa;
    const cw = span / (m * 2 - 1);
    for (let i = 0; i < m; i++) {
      const mx = xa + i * cw * 2;
      shape(ctx, [[mx, topY + 0.3], [mx + cw, topY + 0.3], [mx + cw, topY - 2.4 * u], [mx, topY - 2.4 * u]], { fill: tones.light, stroke: ink, width: 0.8 * u });
    }
  } else {
    shape(ctx, [[xa, topY], [xb, topY]], { stroke: ink, width: 1.1 * u, closed: false });
  }
  return { left: [xa, topY - d], right: [xb, topY - d] };
}

/* ------------------------------------------------------------------------------------ */
/* Masts, yards, rigging, flags                                                         */
/* ------------------------------------------------------------------------------------ */

export function paintMast(pen: Pen, x: number, baseY: number, topY: number, o: { w?: number; wood?: string; lean?: number } = {}): void {
  const { ctx, ink, u } = pen;
  const w0 = o.w ?? 2.8;
  const w1 = w0 * 0.62;
  const lean = o.lean ?? 0;
  const tones = shades(o.wood ?? WOOD.dark);
  const quad = (a: number, b: number): Vec2[] => [[x - a / 2, baseY], [x + lean - b / 2, topY], [x + lean + b / 2, topY], [x + a / 2, baseY]];
  shape(ctx, quad(w0 + 1.8 * u, w1 + 1.8 * u), { fill: ink });
  shape(ctx, quad(w0, w1), { fill: linearGradient(ctx, x - w0 / 2, 0, x + w0 / 2, 0, [tones.light, tones.base, tones.shade]) });
}

export function paintYard(pen: Pen, x0: number, y0: number, x1: number, y1: number, o: { w?: number; wood?: string } = {}): void {
  const { ctx, ink, u } = pen;
  const w = o.w ?? 1.9;
  const tones = shades(o.wood ?? WOOD.dark);
  line(ctx, [[x0, y0], [x1, y1]], ink, w + 1.7 * u);
  line(ctx, [[x0, y0], [x1, y1]], tones.base, w);
  line(ctx, [[x0 + 1, y0 - w * 0.2], [x1 - 1, y1 - w * 0.2]], rgba(tones.highlight, 0.6), Math.max(0.5, w * 0.3));
}

export function paintRope(pen: Pen, a: Vec2, b: Vec2, o: { alpha?: number; sag?: number } = {}): void {
  const { ctx, ink, u } = pen;
  const pts: Vec2[] = o.sag ? [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + o.sag], b] : [a, b];
  shape(ctx, pts, { stroke: rgba(ink, o.alpha ?? 0.55), width: 0.65 * u, closed: false, smooth: !!o.sag });
}

export interface FlagSpec {
  /** Pole end of the flag. */
  x: number;
  y: number;
  len: number;
  h: number;
  color: string;
  /** `pennant` narrows to a point, `swallow` has a forked end, `square` is a plain banner. */
  kind?: 'pennant' | 'swallow' | 'square';
  stripe?: string;
  /** Streams to the right (+1, with the wind behind the ship) or to the left (-1). */
  dir?: 1 | -1;
  phase?: number;
}

export function paintFlag(pen: Pen, f: FlagSpec): void {
  const { ctx, ink, u } = pen;
  const dir = f.dir ?? 1;
  const kind = f.kind ?? 'pennant';
  const phase = f.phase ?? 0;
  const n = 9;
  const topEdge: Vec2[] = [];
  const botEdge: Vec2[] = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const wave = Math.sin(s * 5.2 + phase) * f.h * 0.3 * Math.min(1, s * 1.6);
    const hh = kind === 'pennant' ? f.h * (1 - s * 0.9) : f.h;
    topEdge.push([f.x + dir * f.len * s, f.y + wave]);
    botEdge.push([f.x + dir * f.len * s, f.y + wave + hh]);
  }
  if (kind === 'swallow') {
    const last = botEdge[n]!;
    const notch: Vec2 = [last[0] - dir * f.len * 0.28, (topEdge[n]![1] + last[1]) / 2];
    botEdge.splice(n, 1, last, notch, topEdge[n]!);
    topEdge.splice(n, 1);
  }
  const outline: Vec2[] = [...topEdge, ...botEdge.slice().reverse()];
  const tones = shades(f.color);
  shape(ctx, outline, { fill: linearGradient(ctx, f.x, f.y, f.x + dir * f.len, f.y + f.h, [tones.light, f.color, tones.shade]), stroke: ink, width: 0.9 * u });
  if (f.stripe) {
    clipped(ctx, outline, () => {
      const a = topEdge.map((q): Vec2 => [q[0], q[1] + f.h * 0.34]);
      const b = topEdge.map((q): Vec2 => [q[0], q[1] + f.h * 0.62]);
      shape(ctx, [...a, ...b.slice().reverse()], { fill: f.stripe });
    });
  }
}

/** A small round crow's nest near the masthead. */
export function paintCrowsNest(pen: Pen, x: number, y: number, w: number, wood: string = WOOD.dark): void {
  const { ctx, ink, u } = pen;
  const tones = shades(wood);
  const poly: Vec2[] = [[x - w / 2, y - 3.2 * u], [x + w / 2, y - 3.2 * u], [x + w * 0.36, y + 1.6 * u], [x - w * 0.36, y + 1.6 * u]];
  shape(ctx, poly, { fill: linearGradient(ctx, x - w / 2, 0, x + w / 2, 0, [tones.light, tones.base, tones.shade]), stroke: ink, width: 0.9 * u });
  line(ctx, [[x - w / 2, y - 3.2 * u], [x + w / 2, y - 3.2 * u]], tones.highlight, 0.8 * u);
}

/* ------------------------------------------------------------------------------------ */
/* Sails                                                                                */
/* ------------------------------------------------------------------------------------ */

export interface SquareSail {
  /** Center of the top edge (the yard). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Foot width relative to the top (default 1.12). */
  foot?: number;
  /** How far the middle billows forward (default 14% of the width). */
  belly?: number;
  /** How far the foot curves up in the middle. */
  roach?: number;
  cloth: string;
  stripes?: { a: string; b: string; count: number };
  /** Horizontal seams (default 2). */
  seams?: number;
  /** 0..1: ragged foot and holes. */
  tatter?: number;
  /** Color of the yard; `null` = no yard. */
  yard?: string | null;
  /** Paint a symbol in the middle of the sail (cross, skull…). */
  mark?: (pen: Pen, cx: number, cy: number, w: number, h: number) => void;
  /** Vertical drop of the right end of the yard. */
  tilt?: number;
}

export function squareSail(pen: Pen, s: SquareSail): void {
  const { ctx, ink, u, rand } = pen;
  const tones = shades(s.cloth);
  const foot = s.foot ?? 1.12;
  const belly = s.belly ?? s.w * 0.14;
  const roach = s.roach ?? s.h * 0.07;
  const tilt = s.tilt ?? 0;
  const tatter = s.tatter ?? 0;
  const jag = new Map<number, number>();
  const P = (uu: number, v: number): Vec2 => {
    const wv = s.w * (1 + (foot - 1) * v);
    const bulge = belly * Math.sin(Math.PI * Math.min(1, v * 1.06)) ** 0.85;
    const xl = s.x - wv / 2 + bulge * 0.3;
    const xr = s.x + wv / 2 + bulge;
    const yb = s.y + s.h - roach * Math.sin(Math.PI * uu);
    return [xl + (xr - xl) * uu, s.y + tilt * uu + (yb - s.y) * v];
  };
  const steps = 9;
  const outline: Vec2[] = [];
  for (let i = 0; i <= steps; i++) outline.push(P(i / steps, 0));
  for (let i = 1; i <= 8; i++) outline.push(P(1, i / 8));
  for (let i = steps; i >= 0; i--) {
    const uu = i / steps;
    let v = 1;
    if (tatter > 0) {
      if (!jag.has(i)) jag.set(i, (i % 2 === 0 ? 1 : 0.35) * rand.range(0.4, 1) * tatter * 0.2);
      v = 1 + (jag.get(i) ?? 0);
    }
    outline.push(P(uu, v));
  }
  for (let i = 7; i >= 1; i--) outline.push(P(0, i / 8));

  shape(ctx, outline, { fill: s.cloth });
  clipped(ctx, outline, () => {
    if (s.stripes) {
      const { a, b, count } = s.stripes;
      for (let i = 0; i < count; i++) {
        const col = i % 2 === 0 ? a : b;
        const u0 = i / count;
        const u1 = (i + 1) / count;
        const left: Vec2[] = [];
        const right: Vec2[] = [];
        for (let j = 0; j <= 8; j++) {
          left.push(P(u0, j / 8));
          right.push(P(u1, j / 8));
        }
        shape(ctx, [...left, ...right.reverse()], { fill: col });
      }
    }
    if (s.mark) {
      const c = P(0.5, 0.48);
      s.mark(pen, c[0], c[1], s.w * 0.9, s.h);
    }
    // Soft light from the top-left, cool shade toward the lower right.
    shape(ctx, outline, {
      fill: linearGradient(ctx, s.x - s.w / 2, s.y, s.x + s.w / 2 + belly, s.y + s.h, [rgba(tones.highlight, 0.5), rgba(tones.highlight, 0), rgba(tones.deep, 0.1), rgba(tones.deep, 0.5)]),
    });
    // Folds: a lit flank and a shaded flank per crease.
    const folds = [0.26, 0.5, 0.76];
    for (const fu of folds) {
      const du = 0.075;
      const lit: Vec2[] = [];
      const dark: Vec2[] = [];
      const lit2: Vec2[] = [];
      for (let j = 0; j <= 8; j++) {
        const v = j / 8;
        lit.push(P(fu - du, v));
        dark.push(P(fu, v));
        lit2.push(P(fu + du, v));
      }
      shape(ctx, [...lit, ...dark.slice().reverse()], { fill: rgba(tones.highlight, 0.2) });
      shape(ctx, [...dark, ...lit2.slice().reverse()], { fill: rgba(tones.deep, 0.22) });
      shape(ctx, dark.slice(1), { stroke: rgba(tones.deep, 0.38), width: 0.6 * u, closed: false });
    }
    const seams = s.seams ?? 2;
    for (let k = 1; k <= seams; k++) {
      const pts: Vec2[] = [];
      for (let i = 0; i <= steps; i++) pts.push(P(i / steps, k / (seams + 1)));
      shape(ctx, pts, { stroke: rgba(tones.deep, 0.32), width: 0.6 * u, closed: false });
    }
    // The sail hangs from the yard: shadow right under it.
    shape(ctx, outline, { fill: linearGradient(ctx, 0, s.y, 0, s.y + s.h * 0.22, [rgba(tones.deep, 0.4), rgba(tones.deep, 0)]) });
    if (tatter > 0) {
      const holes = Math.round(tatter * 4);
      for (let i = 0; i < holes; i++) {
        const c = P(rand.range(0.15, 0.85), rand.range(0.25, 0.8));
        const r = rand.range(0.9, 2.2) * (0.6 + tatter);
        shape(ctx, [[c[0] - r, c[1]], [c[0] - r * 0.2, c[1] - r * 0.9], [c[0] + r, c[1] - r * 0.3], [c[0] + r * 0.6, c[1] + r * 0.8], [c[0] - r * 0.5, c[1] + r * 0.7]], { fill: rgba(ink, 0.7), stroke: rgba(ink, 0.9), width: 0.6 * u });
      }
    }
  });
  shape(ctx, outline, { stroke: rgba(ink, 0.92), width: 1 * u });

  if (s.yard !== null) {
    const a = P(0, 0);
    const b = P(1, 0);
    paintYard(pen, a[0] - s.w * 0.06 - 1, a[1] - 0.4, b[0] + s.w * 0.06 + 1, b[1] - 0.4, { wood: s.yard ?? WOOD.dark, w: Math.max(1.5, s.w * 0.04) });
  }
}

export interface LateenSail {
  /** Forward end of the yard (low). */
  tack: Vec2;
  /** Upper end of the yard. */
  peak: Vec2;
  /** Aft-bottom corner. */
  clew: Vec2;
  cloth: string;
  /** How far the foot and the leech curve inward (default 10% of the edge). */
  hollow?: number;
  /** Radial creases (default 4). */
  creases?: number;
  stripes?: { a: string; b: string; count: number };
  tatter?: number;
  yard?: string | null;
  mark?: (pen: Pen, cx: number, cy: number, w: number, h: number) => void;
}

/** A triangular sail on a slanted yard, creased in a fan from the aft corner. */
export function lateenSail(pen: Pen, s: LateenSail): void {
  const { ctx, ink, u, rand } = pen;
  const tones = shades(s.cloth);
  const hollow = s.hollow ?? 0.1;
  const { tack, peak, clew } = s;
  const edge = (a: Vec2, b: Vec2, amt: number, steps = 8): Vec2[] => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const out: Vec2[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const o = Math.sin(Math.PI * t) * amt * len;
      out.push([a[0] + dx * t + nx * o, a[1] + dy * t + ny * o]);
    }
    return out;
  };
  // Pick the sign so that the foot and leech curve toward the inside of the triangle.
  const cx = (tack[0] + peak[0] + clew[0]) / 3;
  const cy = (tack[1] + peak[1] + clew[1]) / 3;
  const inward = (a: Vec2, b: Vec2): number => {
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    return (-dy * (cx - mx) + dx * (cy - my)) >= 0 ? 1 : -1;
  };
  const leech = edge(peak, clew, hollow * inward(peak, clew));
  const foot = edge(clew, tack, hollow * 0.7 * inward(clew, tack));
  const luff = edge(tack, peak, -0.02 * inward(tack, peak), 6);
  const tatter = s.tatter ?? 0;
  if (tatter > 0) {
    for (let i = 1; i < foot.length - 1; i++) {
      const p = foot[i]!;
      foot[i] = [p[0] + rand.range(-1, 1) * tatter * 2, p[1] + (i % 2 ? 1 : -0.3) * rand.range(0.5, 2.6) * tatter];
    }
  }
  const outline: Vec2[] = [...luff, ...leech.slice(1), ...foot.slice(1, -1)];
  const w = Math.max(tack[0], peak[0], clew[0]) - Math.min(tack[0], peak[0], clew[0]);
  const h = Math.max(tack[1], peak[1], clew[1]) - Math.min(tack[1], peak[1], clew[1]);

  shape(ctx, outline, { fill: s.cloth });
  clipped(ctx, outline, () => {
    if (s.stripes) {
      const { a, b, count } = s.stripes;
      for (let i = 0; i < count; i += 1) {
        if (i % 2 === 1) continue;
        const t0 = i / count;
        const t1 = (i + 1) / count;
        const p0 = along(luff, t0);
        const p1 = along(luff, t1);
        shape(ctx, [clew, p0, p1], { fill: a });
      }
      void b;
    }
    if (s.mark) {
      const c: Vec2 = [(tack[0] + peak[0] + clew[0] * 2) / 4, (tack[1] + peak[1] + clew[1] * 2) / 4];
      s.mark(pen, c[0], c[1], w * 0.5, h * 0.5);
    }
    const lo = Math.min(tack[1], peak[1], clew[1]);
    const hi = Math.max(tack[1], peak[1], clew[1]);
    shape(ctx, outline, {
      fill: linearGradient(ctx, Math.min(tack[0], peak[0], clew[0]), lo, Math.max(tack[0], peak[0], clew[0]), hi, [rgba(tones.highlight, 0.5), rgba(tones.highlight, 0), rgba(tones.deep, 0.5)]),
    });
    const creases = s.creases ?? 4;
    for (let i = 1; i <= creases; i++) {
      const t = i / (creases + 1);
      const target = along(luff, t);
      const mid: Vec2 = [lerp(clew[0], target[0], 0.5) + (target[1] - clew[1]) * 0.05, lerp(clew[1], target[1], 0.5) - (target[0] - clew[0]) * 0.03];
      const next = along(luff, t + 0.5 / (creases + 1));
      shape(ctx, [clew, mid, target, next], { fill: rgba(tones.deep, i % 2 ? 0.2 : 0.08), smooth: false });
      shape(ctx, [clew, mid, target], { stroke: rgba(tones.deep, 0.36), width: 0.6 * u, closed: false, smooth: true });
    }
    shape(ctx, outline, { stroke: rgba(tones.deep, 0.3), width: 2.4 * u });
    if (tatter > 0) {
      for (let i = 0; i < Math.round(tatter * 3); i++) {
        const t = rand.range(0.2, 0.75);
        const c = along(luff, t);
        const q: Vec2 = [lerp(c[0], clew[0], rand.range(0.35, 0.6)), lerp(c[1], clew[1], rand.range(0.35, 0.6))];
        const r = rand.range(1, 2.1);
        shape(ctx, [[q[0] - r, q[1]], [q[0], q[1] - r], [q[0] + r, q[1] + 0.3], [q[0] - 0.2, q[1] + r]], { fill: rgba(ink, 0.7) });
      }
    }
  });
  shape(ctx, outline, { stroke: rgba(ink, 0.92), width: 1 * u });
  if (s.yard !== null) {
    const dx = peak[0] - tack[0];
    const dy = peak[1] - tack[1];
    const len = Math.hypot(dx, dy) || 1;
    const ex = (dx / len) * 3;
    const ey = (dy / len) * 3;
    paintYard(pen, tack[0] - ex, tack[1] - ey, peak[0] + ex, peak[1] + ey, { wood: s.yard ?? WOOD.dark, w: 1.8 });
  }
}

/* ------------------------------------------------------------------------------------ */
/* Props                                                                                */
/* ------------------------------------------------------------------------------------ */

export function paintBarrel(pen: Pen, cx: number, baseY: number, w: number, h: number, wood: string = WOOD.pale): void {
  const { ctx, ink, u } = pen;
  const tones = shades(wood);
  const body: Vec2[] = [[cx - w * 0.42, baseY], [cx - w * 0.5, baseY - h * 0.5], [cx - w * 0.42, baseY - h], [cx + w * 0.42, baseY - h], [cx + w * 0.5, baseY - h * 0.5], [cx + w * 0.42, baseY]];
  shape(ctx, body, { fill: linearGradient(ctx, cx - w / 2, 0, cx + w / 2, 0, [tones.light, tones.base, tones.shade]), stroke: ink, width: 0.9 * u });
  line(ctx, [[cx - w * 0.47, baseY - h * 0.3], [cx + w * 0.47, baseY - h * 0.3]], rgba(tones.deep, 0.8), 0.7 * u);
  line(ctx, [[cx - w * 0.47, baseY - h * 0.7], [cx + w * 0.47, baseY - h * 0.7]], rgba(tones.deep, 0.8), 0.7 * u);
  ellipse(ctx, cx, baseY - h, w * 0.4, h * 0.14, { fill: tones.highlight, stroke: ink, width: 0.7 * u });
}

export function paintCrate(pen: Pen, x: number, baseY: number, w: number, h: number, wood: string = WOOD.pale): void {
  const { ctx, ink, u } = pen;
  const tones = shades(wood);
  shape(ctx, [[x, baseY], [x + w, baseY], [x + w, baseY - h], [x, baseY - h]], { fill: linearGradient(ctx, x, baseY - h, x + w, baseY, [tones.light, tones.shade]), stroke: ink, width: 0.9 * u });
  line(ctx, [[x, baseY - h], [x + w, baseY]], rgba(tones.deep, 0.6), 0.6 * u);
  line(ctx, [[x + w, baseY - h], [x, baseY]], rgba(tones.deep, 0.6), 0.6 * u);
}

/** A tiny sailor: head, body and optional hat. Height is the whole figure. */
export function paintSailor(pen: Pen, x: number, baseY: number, h: number, o: { shirt?: string; hat?: string | null; skin?: string; arm?: number } = {}): void {
  const { ctx, ink, u } = pen;
  const shirt = o.shirt ?? CLOTH.blue;
  const skin = o.skin ?? '#e0b48a';
  const bw = h * 0.36;
  shape(ctx, [[x - bw / 2, baseY], [x - bw * 0.42, baseY - h * 0.58], [x + bw * 0.42, baseY - h * 0.58], [x + bw / 2, baseY]], { fill: linearGradient(ctx, x - bw / 2, 0, x + bw / 2, 0, [mix(shirt, '#fff4d2', 0.2), mix(shirt, '#16122e', 0.35)]), stroke: ink, width: 0.8 * u });
  if (o.arm) line(ctx, [[x + bw * 0.3, baseY - h * 0.5], [x + bw * 0.3 + o.arm, baseY - h * 0.8]], skin, 1 * u);
  dot(ctx, x, baseY - h * 0.74, h * 0.18, ink);
  dot(ctx, x, baseY - h * 0.74, h * 0.18 - 0.5 * u, skin);
  if (o.hat !== null) {
    const hat = o.hat ?? '#6b4a2b';
    shape(ctx, [[x - h * 0.24, baseY - h * 0.82], [x + h * 0.24, baseY - h * 0.82], [x + h * 0.14, baseY - h * 1.0], [x - h * 0.14, baseY - h * 1.0]], { fill: hat, stroke: ink, width: 0.7 * u });
  }
}

/** A round shield with a boss. */
export function paintShield(pen: Pen, cx: number, cy: number, r: number, color: string, accent: string): void {
  const { ctx, ink, u } = pen;
  const tones = shades(color);
  dot(ctx, cx, cy, r + 0.9 * u, ink);
  dot(ctx, cx, cy, r, radialGradient(ctx, cx, cy, r * 0.1, r * 1.1, [tones.light, color, tones.shade], cx - r * 0.35, cy - r * 0.35));
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.clip();
  shape(ctx, [[cx - r, cy], [cx + r, cy]], { stroke: accent, width: r * 0.34, closed: false });
  ctx.restore();
  dot(ctx, cx, cy, r * 0.32, mix(accent, '#2a2015', 0.2));
  dot(ctx, cx - r * 0.1, cy - r * 0.1, r * 0.12, rgba('#ffffff', 0.7));
}

/** Skull and crossbones (pirate flags and sails). */
export function paintSkull(pen: Pen, cx: number, cy: number, r: number, bone = '#f4eedc', dark = '#1c1a1d'): void {
  const { ctx } = pen;
  const bw = r * 0.34;
  for (const k of [-1, 1]) {
    const a: Vec2 = [cx - k * r * 1.25, cy + r * 0.5];
    const b: Vec2 = [cx + k * r * 1.25, cy + r * 1.7];
    line(ctx, [a, b], bone, bw);
    dot(ctx, a[0], a[1], bw * 0.7, bone);
    dot(ctx, b[0], b[1], bw * 0.7, bone);
  }
  ellipse(ctx, cx, cy, r, r * 0.9, { fill: bone });
  shape(ctx, [[cx - r * 0.55, cy + r * 0.55], [cx + r * 0.55, cy + r * 0.55], [cx + r * 0.45, cy + r * 1.15], [cx - r * 0.45, cy + r * 1.15]], { fill: bone });
  dot(ctx, cx - r * 0.38, cy - r * 0.02, r * 0.27, dark);
  dot(ctx, cx + r * 0.38, cy - r * 0.02, r * 0.27, dark);
  shape(ctx, [[cx, cy + r * 0.18], [cx - r * 0.12, cy + r * 0.46], [cx + r * 0.12, cy + r * 0.46]], { fill: dark });
  for (const k of [-0.2, 0.2]) line(ctx, [[cx + r * k, cy + r * 0.72], [cx + r * k, cy + r * 1.1]], dark, Math.max(0.4, r * 0.06));
}

/** A cross patee used on lateen sails. */
export function paintCross(pen: Pen, cx: number, cy: number, w: number, color: string): void {
  const { ctx } = pen;
  const a = w * 0.5;
  const t = w * 0.13;
  const arm = (dx: number, dy: number): Vec2[] => (dx !== 0
    ? [[cx + dx * t, cy - t], [cx + dx * a, cy - t * 1.6], [cx + dx * a, cy + t * 1.6], [cx + dx * t, cy + t]]
    : [[cx - t, cy + dy * t], [cx - t * 1.6, cy + dy * a], [cx + t * 1.6, cy + dy * a], [cx + t, cy + dy * t]]);
  shape(ctx, [[cx - t, cy - t], [cx + t, cy - t], [cx + t, cy + t], [cx - t, cy + t]], { fill: color });
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) shape(ctx, arm(dx, dy), { fill: color });
}

/** A drooping oar: a thin shaft from the rowlock down to a blade. */
export function paintOar(pen: Pen, from: Vec2, to: Vec2, wood: string = WOOD.pale): void {
  const { ctx, ink, u } = pen;
  const tones = shades(wood);
  line(ctx, [from, to], ink, 2 * u);
  line(ctx, [from, to], tones.base, 1.1 * u);
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const b0: Vec2 = [to[0] - ux * 3.2, to[1] - uy * 3.2];
  const blade: Vec2[] = [[b0[0] + nx * 1.3, b0[1] + ny * 1.3], [to[0] + nx * 1.1 + ux * 1.4, to[1] + ny * 1.1 + uy * 1.4], [to[0] - nx * 1.1 + ux * 1.4, to[1] - ny * 1.1 + uy * 1.4], [b0[0] - nx * 1.3, b0[1] - ny * 1.3]];
  shape(ctx, blade, { fill: tones.light, stroke: ink, width: 0.8 * u });
}

/** Smooth curve helper for decorative carvings (figureheads, sternposts). */
export function curve(pts: readonly Vec2[], samples = 8): Vec2[] {
  return catmullRom(pts, samples);
}

export { taper };
