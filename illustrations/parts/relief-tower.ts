import { mix, rgba } from '../kit/colors';
import { clipped, linearGradient, shades, shape, softBlob, stipple, type Shades } from '../kit/draw';
import { jagged } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { drawBoulder, drawScree, pickDifferent, strataLines } from './relief-common';

export interface TowerOptions {
  cx: number;
  /** Ground line. */
  baseY: number;
  /** Width and height of the tower in design units. */
  w: number;
  h: number;
  /** Apex offset as a fraction of `w` (-0.3..0.3). */
  lean?: number;
  rock: string;
  ink: string;
  rand: Rng;
  /** 1 = straight flanks, >1 = steep top and wide foot (spires, horns). Default 1.05. */
  flare?: number;
  /** Silhouette segments per side. Default 6. */
  segs?: number;
  /** Chance of a sheer drop (instead of a sloping shoulder) per silhouette step (0..1). Default 0.5. */
  stairs?: number;
  /** Width of the broken summit as a fraction of `w`. Default 0.06. */
  crown?: number;
  /** Spacing of horizontal strata in px (0 = none). */
  strata?: number;
  /** Fraction of the height covered by snow (0 = none). */
  snow?: number;
  /** Extra darkness for gloomy rock (0..1). */
  gloom?: number;
  /** Soft ground shadow. Default true. */
  shadow?: boolean;
  /** Cool glaze over the rock (ice-coated crags). */
  glaze?: string;
}

export interface TowerGeometry {
  apex: Vec2;
  footL: Vec2;
  footR: Vec2;
  ridgeBase: Vec2;
  leftEdge: Vec2[];
  rightEdge: Vec2[];
  ridge: Vec2[];
  leftFace: Vec2[];
  rightFace: Vec2[];
  silhouette: Vec2[];
}

/** Silhouette edge from the summit to the foot: alternating sheer drops and sloping shoulders. */
function rockEdge(rand: Rng, from: Vec2, to: Vec2, n: number, flare: number, cliffy: number): Vec2[] {
  const sign = to[0] >= from[0] ? 1 : -1;
  const span = Math.abs(to[0] - from[0]);
  const drop = to[1] - from[1];
  const wx: number[] = [];
  const wy: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const cliff = rand.chance(i % 2 === 0 ? cliffy : 1 - cliffy);
    const reach = 0.3 + 1.4 * t ** Math.max(0.2, flare - 0.2);
    wx.push((cliff ? rand.range(0.12, 0.4) : rand.range(1, 1.8)) * reach);
    wy.push(cliff ? rand.range(1, 1.7) : rand.range(0.45, 0.95));
  }
  const sx = wx.reduce((a, b) => a + b, 0);
  const sy = wy.reduce((a, b) => a + b, 0);
  const out: Vec2[] = [from];
  let x = 0;
  let y = 0;
  for (let i = 0; i < n - 1; i++) {
    x += (wx[i]! / sx) * span;
    y += (wy[i]! / sy) * drop;
    out.push([from[0] + sign * x, from[1] + y]);
  }
  out.push(to);
  return out;
}

export function towerGeometry(o: TowerOptions): TowerGeometry {
  const { rand, cx, baseY, w, h } = o;
  const apex: Vec2 = [cx + (o.lean ?? 0) * w, baseY - h];
  const crown = (o.crown ?? 0.06) * w;
  const topL: Vec2 = [apex[0] - crown / 2, apex[1] + rand.range(0, h * 0.03)];
  const topR: Vec2 = [apex[0] + crown / 2, apex[1] + rand.range(0, h * 0.05)];
  const footL: Vec2 = [cx - w / 2, baseY - rand.range(0, h * 0.02)];
  const footR: Vec2 = [cx + w / 2, baseY - rand.range(0, h * 0.02)];
  const ridgeBase: Vec2 = [apex[0] + w * rand.range(0.0, 0.1), baseY + h * 0.03];
  const segs = o.segs ?? 6;
  const flare = o.flare ?? 1.05;
  const cliffy = o.stairs ?? 0.5;

  const leftEdge = rockEdge(rand, topL, footL, segs, flare, cliffy);
  const rightEdge = rockEdge(rand, topR, footR, segs, flare, cliffy);
  const ridgeTop: Vec2 = [apex[0], apex[1] + h * 0.02];
  const ridge = jagged(rand, ridgeTop, ridgeBase, 8, w * 0.014);
  const inner = ridge.slice(1, -1).reverse();

  const leftFace: Vec2[] = [...leftEdge, ridgeBase, ...inner, ridgeTop];
  const rightFace: Vec2[] = [ridgeTop, ...rightEdge, ridgeBase, ...inner];
  const silhouette: Vec2[] = [...leftEdge, ridgeBase, ...rightEdge.slice().reverse()];
  return { apex, footL, footR, ridgeBase, leftEdge, rightEdge, ridge, leftFace, rightFace, silhouette };
}

type Quad = readonly [Vec2, Vec2, Vec2, Vec2];

interface Band {
  poly: Vec2[];
  /** Silhouette segment (top-left, top-right) and ground points (bottom-right, bottom-left). */
  quad: Quad;
  /** Crease on the foot side of the band, from the silhouette down to the ground. */
  crease: Vec2[];
}

/** Bilinear point inside a band. */
function at(q: Quad, u: number, v: number): Vec2 {
  const tx = q[0][0] + (q[1][0] - q[0][0]) * u;
  const ty = q[0][1] + (q[1][1] - q[0][1]) * u;
  const bx = q[3][0] + (q[2][0] - q[3][0]) * u;
  const by = q[3][1] + (q[2][1] - q[3][1]) * u;
  return [tx + (bx - tx) * v, ty + (by - ty) * v];
}

/** Slice a face into buttresses: every silhouette vertex sends a crease down to the ground line. */
function bands(rand: Rng, edge: readonly Vec2[], g: TowerGeometry, o: TowerOptions, side: -1 | 1): Band[] {
  const m = edge.length - 1;
  const foot = edge[m]!;
  const out: Band[] = [];
  const ridgeTop: Vec2 = [g.apex[0], g.apex[1] + o.h * 0.02];
  const baseOf: Vec2[] = [g.ridgeBase];
  let prev = g.ridgeBase[0];
  const cx = g.apex[0];
  for (let j = 1; j < m; j++) {
    const e = edge[j]!;
    let bx = e[0] + Math.abs(e[0] - cx) * rand.range(0.04, 0.26) * side;
    // Keep creases ordered from the ridge to the foot.
    bx = side < 0 ? Math.min(bx, prev - 1.5) : Math.max(bx, prev + 1.5);
    bx = side < 0 ? Math.max(bx, foot[0] + 1.5) : Math.min(bx, foot[0] - 1.5);
    prev = bx;
    baseOf.push([bx, o.baseY + o.h * rand.range(0.01, 0.045)]);
  }
  baseOf.push(foot);
  for (let j = 1; j <= m; j++) {
    const quad: Quad = [edge[j - 1]!, edge[j]!, baseOf[j]!, baseOf[j - 1]!];
    const poly: Vec2[] = [...quad];
    if (j === 1) {
      // The first band also owns the ridge line.
      poly.push(...g.ridge.slice(1, -1).reverse(), ridgeTop);
    }
    out.push({ poly, quad, crease: jagged(rand, edge[j]!, baseOf[j]!, 3, 0.8) });
  }
  return out;
}

/** One jagged rock tower: buttresses with stacked plates, flutes, ledges, strata, cracks, snow and scree. */
export function drawTower(ctx: Ctx2D, o: TowerOptions): TowerGeometry {
  const { rand, ink } = o;
  const g = towerGeometry(o);
  const tones: Shades = shades(o.gloom ? mix(o.rock, '#1b1b22', o.gloom) : o.rock);
  const top = g.apex[1];
  const base = o.baseY;
  const detail = Math.min(1, Math.max(0.4, o.w / 56));

  if (o.shadow !== false) softBlob(ctx, o.cx + o.w * 0.16, base + o.h * 0.02, o.w * 0.66, o.h * 0.12, '#1d160c', 0.38);

  const litTones = [tones.light, mix(tones.light, tones.base, 0.4), mix(tones.light, tones.base, 0.75), tones.base];
  const darkTones = [mix(tones.base, tones.shade, 0.5), tones.shade, mix(tones.shade, tones.deep, 0.4), mix(tones.shade, tones.deep, 0.75)];
  const leftBands = bands(rand, g.leftEdge, g, o, -1);
  const rightBands = bands(rand, g.rightEdge, g, o, 1);

  const paintBands = (list: Band[], palette: readonly string[], lit: boolean): void => {
    let prev: string | undefined;
    for (const b of list) {
      const tone = pickDifferent(rand, palette, prev);
      prev = tone;
      const upper = lit ? mix(tone, tones.highlight, 0.14) : mix(tone, tones.base, 0.14);
      const lower = mix(tone, tones.deep, lit ? 0.3 : 0.28);
      const paint = linearGradient(ctx, 0, top, 0, base, [upper, tone, lower]);
      shape(ctx, b.poly, { fill: paint, stroke: paint, width: 0.7 });
    }
  };

  /** Stacked plates: slanted cuts with a lit lip, a shadow below and a tone shift per plate. */
  const plates = (list: Band[], lit: boolean): void => {
    for (const b of list) {
      const q = b.quad;
      const hgt = Math.abs(q[3][1] - q[0][1]);
      const k = hgt > 42 ? 3 : hgt > 20 ? 2 : 1;
      const cuts: { v: number; s: number }[] = [];
      for (let i = 0; i < k; i++) cuts.push({ v: (i + rand.range(0.3, 0.85)) / (k + 0.2), s: rand.range(-0.09, 0.09) });
      const lineAt = (c: { v: number; s: number }, u: number): Vec2 => at(q, u, c.v + c.s * (2 * u - 1));
      cuts.forEach((c, i) => {
        const nxt = cuts[i + 1];
        const lower: Vec2[] = [lineAt(c, 0), lineAt(c, 1), nxt ? lineAt(nxt, 1) : at(q, 1, 1), nxt ? lineAt(nxt, 0) : at(q, 0, 1)];
        const lighter = rand.chance(0.5);
        shape(ctx, lower, { fill: lighter ? rgba(tones.highlight, lit ? 0.24 : 0.1) : rgba(tones.deep, lit ? 0.22 : 0.26) });
        const a = lineAt(c, rand.range(0, 0.12));
        const z = lineAt(c, rand.range(0.8, 1));
        shape(ctx, [a, z], { stroke: rgba(tones.deep, lit ? 0.55 : 0.65), width: 1, closed: false });
        shape(ctx, [[a[0], a[1] + 1.2], [z[0], z[1] + 1.2]], { stroke: rgba(tones.highlight, lit ? 0.55 : 0.2), width: 0.9, closed: false });
      });
    }
  };

  /** Vertical flutes: a dark groove with a lit lip beside it. */
  const flutes = (list: Band[], lit: boolean): void => {
    for (const b of list) {
      const n = rand.int(1, detail > 0.7 ? 3 : 1);
      for (let i = 0; i < n; i++) {
        const u = rand.range(0.12, 0.88);
        const v0 = rand.range(0.02, 0.55);
        const v1 = Math.min(0.97, v0 + rand.range(0.18, 0.45));
        const p0 = at(b.quad, u, v0);
        const p1 = at(b.quad, u + rand.range(-0.05, 0.05), v1);
        shape(ctx, [p0, p1], { stroke: rgba(lit ? tones.deep : '#120f1c', lit ? 0.4 : 0.5), width: 0.9, closed: false });
        shape(ctx, [[p0[0] + 1, p0[1]], [p1[0] + 1, p1[1]]], { stroke: rgba(tones.highlight, lit ? 0.4 : 0.14), width: 0.7, closed: false });
      }
    }
  };

  clipped(ctx, g.silhouette, () => {
    paintBands(leftBands, litTones, true);
    paintBands(rightBands, darkTones, false);
    plates(leftBands, true);
    plates(rightBands, false);
    flutes(leftBands, true);
    flutes(rightBands, false);
  });

  // Creases between buttresses; the shaded side gets a thin dark shadow beside each one.
  for (const [list, lit] of [[leftBands, true], [rightBands, false]] as const) {
    for (const b of list.slice(0, -1)) {
      shape(ctx, b.crease, { stroke: rgba(ink, lit ? 0.42 : 0.55), width: Math.max(0.7, o.w * 0.008), closed: false });
      if (!lit) shape(ctx, b.crease.map((q): Vec2 => [q[0] + 1.3, q[1]]), { stroke: rgba(tones.deep, 0.5), width: Math.max(0.8, o.w * 0.012), closed: false });
    }
  }

  clipped(ctx, g.silhouette, () => {
    stipple(ctx, rand, g.rightFace, Math.round(o.w * 0.6 * detail), { color: tones.deep, radius: 0.5, alpha: 0.4 });
    stipple(ctx, rand, g.leftFace, Math.round(o.w * 0.45 * detail), { color: tones.highlight, radius: 0.45, alpha: 0.5 });
    if (o.strata) {
      strataLines(ctx, rand, g.leftFace, o.strata, tones.deep, 0.3);
      strataLines(ctx, rand, g.rightFace, o.strata, '#120f1c', 0.34);
    }
    // A couple of dark fissures running down the faces.
    const fissures = detail > 0.6 ? rand.int(1, 2) : 0;
    for (let i = 0; i < fissures; i++) {
      const edge = rand.chance(0.6) ? g.leftEdge : g.rightEdge;
      const dir = edge === g.leftEdge ? 1 : -1;
      const from = edge[rand.int(1, Math.max(1, edge.length - 3))]!;
      const start: Vec2 = [from[0] + dir * 2, from[1] + 1];
      const end: Vec2 = [start[0] + dir * o.w * rand.range(0.05, 0.14), start[1] + o.h * rand.range(0.2, 0.36)];
      shape(ctx, jagged(rand, start, end, 5, o.w * 0.014), { stroke: rgba(ink, 0.6), width: 0.9, closed: false });
    }
  });

  // Ledges catch light on top and cast a thin shadow below.
  const ledges = (edge: readonly Vec2[], lit: boolean, face: readonly Vec2[]): void => {
    clipped(ctx, face, () => {
      for (let i = 1; i < edge.length; i++) {
        const p = edge[i - 1]!;
        const q = edge[i]!;
        const dx = Math.abs(q[0] - p[0]);
        const dy = Math.abs(q[1] - p[1]);
        if (dx < 1.6 || dy > dx * 0.55) continue;
        const drop = Math.max(2.4, o.h * 0.04);
        shape(ctx, [p, q, [q[0], q[1] + drop], [p[0], p[1] + drop]], { fill: rgba(tones.deep, lit ? 0.32 : 0.42) });
        shape(ctx, [p, q], { stroke: rgba(tones.highlight, lit ? 0.85 : 0.4), width: Math.max(0.9, o.w * 0.011), closed: false });
      }
    });
  };
  ledges(g.leftEdge, true, g.leftFace);
  ledges(g.rightEdge, false, g.rightFace);

  if (o.glaze) shape(ctx, g.silhouette, { fill: rgba(o.glaze, 0.2) });

  // Foot shading blends the tower into the ground.
  shape(ctx, g.silhouette, { fill: linearGradient(ctx, 0, base - o.h * 0.34, 0, base + o.h * 0.04, [rgba(tones.deep, 0), rgba(tones.deep, 0.42)]) });

  if (o.snow && o.snow > 0) drawTowerSnow(ctx, g, o);

  // Talus fans pile up where the creases reach the ground.
  const fanTone = mix(tones.light, tones.base, 0.55);
  const mouths: Vec2[] = [g.ridgeBase, ...leftBands.slice(0, -1).map((b) => b.crease[b.crease.length - 1]!), ...rightBands.slice(0, -1).map((b) => b.crease[b.crease.length - 1]!)];
  for (const p of mouths) {
    const fh = o.h * rand.range(0.09, 0.19);
    const fw = o.w * rand.range(0.045, 0.085);
    const fan: Vec2[] = [[p[0] + rand.range(-1, 1), p[1] - fh], [p[0] - fw, p[1] + 1], [p[0] + fw * 0.9, p[1] + 1]];
    clipped(ctx, g.silhouette, () => shape(ctx, fan, { fill: linearGradient(ctx, 0, p[1] - fh, 0, p[1] + 1, [rgba(fanTone, 0), rgba(fanTone, 0.8)]) }));
  }

  // Sunlit edge and the ink line (heavier on the shaded flank).
  clipped(ctx, g.silhouette, () => {
    shape(ctx, g.leftEdge.map((p): Vec2 => [p[0] + o.w * 0.016, p[1] + o.w * 0.011]), { stroke: rgba(tones.highlight, 0.6), width: Math.max(0.9, o.w * 0.012), closed: false });
  });
  const inkW = Math.max(1.1, o.w * 0.015);
  shape(ctx, g.leftEdge, { stroke: ink, width: inkW, closed: false });
  shape(ctx, [g.leftEdge[0]!, g.rightEdge[0]!], { stroke: ink, width: inkW, closed: false });
  shape(ctx, g.rightEdge, { stroke: ink, width: inkW * 1.2, closed: false });
  shape(ctx, g.ridge, { stroke: rgba(ink, 0.62), width: Math.max(0.8, o.w * 0.011), closed: false });

  // Fallen rock at the foot.
  drawScree(ctx, rand, {
    x0: g.footL[0] - o.w * 0.04,
    x1: g.footR[0] + o.w * 0.06,
    y: base + o.h * 0.01,
    depth: o.h * 0.1,
    rock: o.rock,
    ink,
    count: Math.round(3 + o.w * 0.06),
    size: Math.max(1.4, o.w * 0.045),
  });
  if (o.w > 40) {
    const x = g.footL[0] + o.w * rand.range(0.1, 0.9);
    drawBoulder(ctx, { cx: x, cy: base + o.h * 0.03, rx: o.w * rand.range(0.035, 0.06), ry: o.w * 0.035, rock: o.rock, ink, rand, shadow: false });
  }
  return g;
}

function drawTowerSnow(ctx: Ctx2D, g: TowerGeometry, o: TowerOptions): void {
  const { rand } = o;
  const depth = o.h * (o.snow ?? 0.3);
  const edge: Vec2[] = [[g.apex[0] - o.w * 0.7, g.apex[1] - 4]];
  const teeth = 11;
  for (let i = 0; i <= teeth; i++) {
    const t = i / teeth;
    const x = g.apex[0] - o.w * 0.7 + o.w * 1.4 * t;
    const k = 1 - 0.55 * Math.abs(t - 0.5) * 2;
    const down = i % 2 === 0 ? 1 : 0.45;
    edge.push([x, g.apex[1] + depth * k * down * rand.range(0.7, 1.25)]);
  }
  edge.push([g.apex[0] + o.w * 0.7, g.apex[1] - 4]);
  const lit = linearGradient(ctx, g.apex[0] - o.w * 0.3, g.apex[1], g.apex[0] + o.w * 0.1, g.apex[1] + depth, ['#ffffff', '#eaf3fa', '#c9dcec']);
  const dark = linearGradient(ctx, g.apex[0], g.apex[1], g.apex[0] + o.w * 0.3, g.apex[1] + depth, ['#c8d8ea', '#a2b9d4', '#8199ba']);
  clipped(ctx, g.leftFace, () => shape(ctx, edge, { fill: lit }));
  clipped(ctx, g.rightFace, () => shape(ctx, edge, { fill: dark }));
  clipped(ctx, g.silhouette, () => shape(ctx, edge.slice(1, -1), { stroke: rgba('#41536f', 0.55), width: Math.max(0.7, o.w * 0.008), closed: false }));
}

export interface TowerSpec {
  /** Center x as a fraction of the box width. */
  x: number;
  /** Width / height as a fraction of the box width / height. */
  w: number;
  h: number;
  /** Ground offset as a fraction of the box height (positive = nearer the viewer). */
  y?: number;
  lean?: number;
  flare?: number;
  segs?: number;
  stairs?: number;
  crown?: number;
}

export interface MassifOptions {
  w: number;
  h: number;
  /** Ground line of the massif (towers shift from it by their `y`). */
  baseY: number;
  towers: readonly TowerSpec[];
  rock: string;
  ink: string;
  rand: Rng;
  strata?: number;
  snow?: number;
  gloom?: number;
  glaze?: string;
  /** Overall size jitter (0 = none). Default 0.06. */
  jitter?: number;
}

/** Several towers drawn in the given order (back to front), forming one massif. */
export function drawMassif(ctx: Ctx2D, o: MassifOptions): void {
  const j = o.jitter ?? 0.06;
  const tallest = Math.max(...o.towers.map((q) => q.h));
  o.towers.forEach((t, i) => {
    const w = o.w * t.w * (1 + o.rand.range(-j, j));
    const baseY = o.baseY + o.h * (t.y ?? 0);
    // Keep the foot (with its scree) and the summit inside the box.
    const half = w * 0.56;
    const cx = Math.min(o.w - half - 1, Math.max(half + 1, o.w * t.x));
    const h = Math.min(o.h * t.h * (1 + o.rand.range(-j, j)), baseY - 3);
    drawTower(ctx, {
      cx,
      baseY,
      w,
      h,
      lean: t.lean ?? o.rand.range(-0.08, 0.08),
      flare: t.flare,
      segs: t.segs,
      stairs: t.stairs,
      crown: t.crown,
      rock: o.rock,
      ink: o.ink,
      strata: o.strata,
      snow: o.snow ? o.snow * (0.55 + 0.45 * (t.h / tallest)) : 0,
      gloom: o.gloom,
      glaze: o.glaze,
      shadow: i >= o.towers.length - 2,
      rand: o.rand,
    });
  });
}
