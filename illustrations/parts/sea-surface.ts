import { rgba } from '../kit/colors';
import { clipped, dot, ellipse, line, linearGradient, radialGradient, shades, shape, softBlob, taper } from '../kit/draw';
import { TAU, lerp } from '../kit/math';
import { blob, catmullRom } from '../kit/shapes';
import type { Vec2 } from '../kit/types';
import { FOAM, waveMark } from './sea-fx';
import type { Pen } from './ship-parts';

/** Flat decals painted on the water: shallows and reefs, floating kelp, wave marks and whirlpools. */

/* ------------------------------------------------------------------------------------ */
/* Whirlpool                                                                            */
/* ------------------------------------------------------------------------------------ */

export interface WhirlLook {
  arms: number;
  /** Turns an arm makes from the rim to the eye. */
  turns: number;
  /** Radius of the eye as a share of the whole. */
  eye: number;
  dir: 1 | -1;
  debris?: boolean;
  /** Overall size: 1 fills the box. */
  size?: number;
}

export function drawWhirlpool(pen: Pen, w: number, h: number, look: WhirlLook): void {
  const { ctx, rand, ink, u } = pen;
  const cx = w / 2;
  const cy = h / 2;
  const k = look.size ?? 1;
  const rx = w * 0.46 * k;
  const ry = h * 0.44 * k;

  softBlob(ctx, cx, cy, rx * 1.12, ry * 1.12, '#0b3550', 0.3);
  // The funnel: the sea sinking toward the eye.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  ctx.fillStyle = radialGradient(ctx, 0, 0, 0, rx, [
    [0, '#02101c'],
    [look.eye, '#05203a'],
    [0.5, rgba('#0d4a6e', 0.8)],
    [0.82, rgba('#1d6e96', 0.34)],
    [1, rgba('#1d6e96', 0)],
  ]);
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, TAU);
  ctx.fill();
  ctx.restore();

  const spiral = (a0: number, reach: number, from: number, to: number): Vec2[] => {
    const pts: Vec2[] = [];
    const n = 22;
    for (let i = 0; i <= n; i++) {
      const t = lerp(from, to, i / n);
      const r = lerp(reach, look.eye * 1.15, Math.pow(t, 0.8));
      const a = a0 + look.dir * t * look.turns * TAU;
      pts.push([cx + Math.cos(a) * r * rx, cy + Math.sin(a) * r * ry]);
    }
    return pts;
  };
  const ribbon = (a0: number, reach: number, wMax: number, fill: string): void => {
    taper(ctx, spiral(a0, reach, 0, 0.42), 0.5, wMax, fill);
    taper(ctx, spiral(a0, reach, 0.42, 1), wMax, 0.5, fill);
  };

  for (let i = 0; i < look.arms; i++) {
    const a0 = (i / look.arms) * TAU + rand.range(-0.08, 0.08);
    ribbon(a0, 0.98, 6.2, rgba('#0a3a5a', 0.5));
    ribbon(a0 + 0.1 * look.dir, 0.96, 2.8, rgba(FOAM, 0.82));
    ribbon(a0 + 0.2 * look.dir, 0.9, 1.1, rgba('#7fc4de', 0.7));
    // Broken foam running along the arm.
    for (let j = 0; j < 4; j++) {
      const t0 = rand.range(0.1, 0.75);
      const seg = spiral(a0 - 0.07 * look.dir, 0.95, t0, t0 + rand.range(0.06, 0.12));
      line(ctx, seg, rgba(FOAM, 0.9), 1.2, { smooth: true });
    }
  }

  // The eye: a dark hole with a pale lip on the near side.
  const er = look.eye * 0.9;
  ellipse(ctx, cx, cy + 0.6, rx * er, ry * er, { fill: '#010b14' });
  ellipse(ctx, cx, cy + 0.6, rx * er, ry * er, { stroke: rgba('#5ca8c8', 0.55), width: 1.2 * u });
  ellipse(ctx, cx - rx * er * 0.2, cy - ry * er * 0.1, rx * er * 0.45, ry * er * 0.3, { fill: rgba('#0a3050', 0.7) });

  if (look.debris) {
    for (let i = 0; i < 5; i++) {
      const t = 0.18 + i * 0.15;
      const a = i * 1.7 + look.dir * t * look.turns * TAU;
      const r = lerp(0.95, look.eye * 1.15, Math.pow(t, 0.8)) * 0.92;
      const px = cx + Math.cos(a) * r * rx;
      const py = cy + Math.sin(a) * r * ry;
      const rot = a + (Math.PI / 2) * look.dir;
      if (i === 2) {
        ellipse(ctx, px, py + 1, 4.2, 2.8, { fill: '#6b4526', stroke: ink, width: 1 * u, rotation: 0.2 });
        ellipse(ctx, px - 0.4, py - 0.4, 3.2, 1.8, { fill: '#8a5f34', rotation: 0.2 });
      } else {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(rot * 0.6);
        shape(ctx, [[-6, -1.4], [6, -1.2], [6.4, 1.2], [-6.2, 1.5]], { fill: i % 2 ? '#a8825a' : '#7a5632', stroke: ink, width: 1 * u });
        line(ctx, [[-5, -0.5], [4, -0.4]], rgba('#e8cfa0', 0.6), 0.6 * u);
        ctx.restore();
      }
    }
  }
}

/* ------------------------------------------------------------------------------------ */
/* Floating kelp                                                                        */
/* ------------------------------------------------------------------------------------ */

export interface KelpLook {
  tone: string;
  bead: string;
  plants: Array<{ x: number; y: number; strands: number; len: number; spread?: number }>;
  /** Leaf blades along each strand. */
  blades?: boolean;
  /** Flat mat of lumps rather than long strands. */
  mat?: boolean;
}

function kelpStrand(pen: Pen, x: number, y: number, a0: number, len: number, wd: number, look: KelpLook): void {
  const { ctx, rand, ink, u } = pen;
  const T = shades(look.tone);
  const phase = rand.range(0, TAU);
  const pts: Vec2[] = [[x, y]];
  let a = a0;
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    a += Math.sin(phase + i * 1.15) * 0.55 + rand.range(-0.12, 0.12);
    const p = pts[i - 1]!;
    pts.push([p[0] + Math.cos(a) * (len / steps), p[1] + Math.sin(a) * (len / steps) * 0.78]);
  }
  const c = catmullRom(pts, 6);
  taper(ctx, c.map((p): Vec2 => [p[0] + 1.6, p[1] + 2.2]), wd + 0.6, 0.6, rgba('#06293d', 0.22));
  taper(ctx, c, wd + 1.6 * u, 0.8, rgba(ink, 0.9));
  taper(ctx, c, wd, 0.5, linearGradient(ctx, x - len * 0.5, y - len * 0.5, x + len * 0.5, y + len * 0.5, [T.light, T.base, T.shade]));
  line(ctx, c.slice(1, -4).map((p): Vec2 => [p[0] - 0.4, p[1] - 0.5]), rgba(T.highlight, 0.75), 0.8 * u, { smooth: true });
  for (let i = 8; i < c.length - 6; i += 7) {
    const p = c[i]!;
    const q = c[i + 1]!;
    const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    const side = (i / 7) % 2 === 0 ? 1 : -1;
    if (look.blades) {
      const bl = wd * rand.range(2, 3);
      const t: Vec2 = [p[0] + Math.cos(ang + side * 0.9) * bl, p[1] + Math.sin(ang + side * 0.9) * bl * 0.8];
      taper(ctx, [p, [(p[0] + t[0]) / 2 + 0.8, (p[1] + t[1]) / 2 - 0.8], t], wd * 0.7, 0.4, rgba(ink, 0.9));
      taper(ctx, [p, [(p[0] + t[0]) / 2 + 0.8, (p[1] + t[1]) / 2 - 0.8], t], wd * 0.45, 0.2, T.base);
    }
    dot(ctx, p[0] + side * wd * 0.9, p[1] - 0.6, wd * 0.46 + 0.5, rgba(ink, 0.85));
    dot(ctx, p[0] + side * wd * 0.9, p[1] - 0.6, wd * 0.46, look.bead);
    dot(ctx, p[0] + side * wd * 0.9 - 0.4, p[1] - 1, wd * 0.16, rgba('#ffffff', 0.7));
  }
}

export function drawKelp(pen: Pen, w: number, h: number, look: KelpLook): void {
  const { ctx, rand, ink, u } = pen;
  const T = shades(look.tone);
  softBlob(ctx, w / 2, h / 2 + 3, w * 0.5, h * 0.4, '#0a3550', 0.2);
  if (look.mat) {
    // A drifting raft of weed: overlapping lumps with berries.
    for (let i = 0; i < 22; i++) {
      const a = rand.range(0, TAU);
      const d = Math.sqrt(rand.next());
      const x = w / 2 + Math.cos(a) * d * w * 0.36;
      const y = h / 2 + Math.sin(a) * d * h * 0.3;
      const r = rand.range(5, 9);
      const lump = blob(rand, x, y, r, r * 0.66, { points: 11, jitter: 0.18, lobes: 4, lobeAmp: 0.14 });
      shape(ctx, lump.map((p): Vec2 => [p[0] + 1.2, p[1] + 1.8]), { fill: rgba('#06293d', 0.2), smooth: true });
      shape(ctx, lump, { fill: linearGradient(ctx, x - r, y - r, x + r, y + r, [T.highlight, T.light, T.base, T.shade]), stroke: rgba(ink, 0.85), width: 1 * u, smooth: true });
      line(ctx, [[x - r * 0.5, y - r * 0.1], [x, y + r * 0.2], [x + r * 0.45, y - r * 0.1]], rgba(T.deep, 0.55), 0.7 * u, { smooth: true });
      if (rand.chance(0.7)) {
        const bx = x + rand.range(-0.4, 0.4) * r;
        const by = y + rand.range(-0.3, 0.2) * r;
        dot(ctx, bx, by, 1.5, rgba(ink, 0.85));
        dot(ctx, bx, by, 1.1, look.bead);
      }
    }
    return;
  }
  for (const pl of look.plants) {
    const spread = pl.spread ?? 0.85;
    softBlob(ctx, pl.x, pl.y, pl.len * 0.4, pl.len * 0.22, '#06293d', 0.2);
    for (let s = 0; s < pl.strands; s++) {
      const a0 = -Math.PI / 2 + (s / Math.max(1, pl.strands - 1) - 0.5) * TAU * spread + rand.range(-0.25, 0.25);
      kelpStrand(pen, pl.x, pl.y, a0, pl.len * rand.range(0.75, 1.1), 3.4 + rand.range(-0.3, 0.5), look);
    }
    dot(ctx, pl.x, pl.y, 3.4, rgba(ink, 0.9));
    dot(ctx, pl.x - 0.3, pl.y - 0.3, 2.4, T.base);
  }
}

/* ------------------------------------------------------------------------------------ */
/* Waves                                                                                */
/* ------------------------------------------------------------------------------------ */

export interface WaveSpec {
  kind: 'curl' | 'swell' | 'ripple' | 'chop';
  x: number;
  y: number;
  w: number;
  flip?: boolean;
  curl?: number;
  alpha?: number;
}

export function drawWaves(pen: Pen, specs: readonly WaveSpec[]): void {
  const { ctx, rand, u } = pen;
  for (const s of specs) {
    const alpha = s.alpha ?? 1;
    if (s.kind === 'curl') {
      waveMark(ctx, s.x, s.y, s.w, { color: rgba(FOAM, 0.78), shade: rgba('#0a3a5a', 0.28), width: 1.3 * u, alpha, curl: s.curl, flip: s.flip });
    } else if (s.kind === 'swell') {
      // A long low swell: two thin arcs.
      for (const [dy, f] of [[0, 1], [3.2, 0.7]] as const) {
        const pts: Vec2[] = [[s.x - s.w * f * 0.5, s.y + dy + 0.6], [s.x - s.w * f * 0.2, s.y + dy - 1.2], [s.x + s.w * f * 0.15, s.y + dy - 1.4], [s.x + s.w * f * 0.5, s.y + dy + 0.5]];
        line(ctx, pts.map((p): Vec2 => [p[0] + 0.6, p[1] + 1]), rgba('#0a3a5a', 0.22 * alpha), 1.2 * u, { smooth: true });
        line(ctx, pts, rgba(FOAM, 0.62 * alpha), 1.1 * u, { smooth: true });
      }
    } else if (s.kind === 'ripple') {
      // A squiggle of small ripples.
      const pts: Vec2[] = [];
      const n = Math.max(4, Math.round(s.w / 5));
      for (let i = 0; i <= n; i++) pts.push([s.x - s.w / 2 + (s.w * i) / n, s.y + (i % 2 ? -1.4 : 1.4) * (s.curl ?? 1)]);
      line(ctx, pts.map((p): Vec2 => [p[0] + 0.6, p[1] + 1]), rgba('#0a3a5a', 0.22 * alpha), 1.2 * u, { smooth: true });
      line(ctx, pts, rgba(FOAM, 0.66 * alpha), 1.1 * u, { smooth: true });
    } else {
      // Choppy water: scattered short dashes.
      for (let i = 0; i < 6; i++) {
        const x = s.x + rand.range(-0.5, 0.5) * s.w;
        const y = s.y + rand.range(-0.5, 0.5) * s.w * 0.4;
        const l = rand.range(2.5, 5);
        line(ctx, [[x - l, y + 0.4], [x, y - 0.8], [x + l, y + 0.4]], rgba(FOAM, 0.64 * alpha), 1 * u, { smooth: true });
      }
    }
  }
}

/* ------------------------------------------------------------------------------------ */
/* Reefs and shoals                                                                     */
/* ------------------------------------------------------------------------------------ */

export type CoralKind = 'branch' | 'dome' | 'fan';

export interface ReefLook {
  /** Shape of the shallows, relative to the middle of the box. */
  rx: number;
  ry: number;
  lobes?: number;
  /** Sandy shallows or deep turquoise. */
  water: { rim: string; mid: string; core: string };
  /** A deeper lagoon in the middle (atoll). */
  lagoon?: { rx: number; ry: number };
  sand?: Array<[number, number, number, number]>;
  stones?: Array<[number, number, number]>;
  corals?: Array<{ x: number; y: number; s: number; color: string; kind?: CoralKind }>;
  breakers?: Array<[number, number, number, boolean?]>;
}

function coral(pen: Pen, x: number, y: number, s: number, color: string, kind: CoralKind): void {
  const { ctx, rand } = pen;
  const T = shades(color);
  const edge = rgba(T.deep, 0.9);
  softBlob(ctx, x + 1, y + 1.2, s * 0.9, s * 0.35, '#07304a', 0.28);
  if (kind === 'dome') {
    ellipse(ctx, x, y - s * 0.1, s * 0.62, s * 0.5, { fill: linearGradient(ctx, x - s * 0.6, y - s * 0.6, x + s * 0.6, y + s * 0.4, [T.highlight, T.light, T.base, T.shade]), stroke: edge, width: 0.9 });
    for (let i = 0; i < 3; i++) {
      const yy = y - s * 0.3 + i * s * 0.22;
      line(ctx, [[x - s * 0.42, yy], [x - s * 0.1, yy + s * 0.1], [x + s * 0.2, yy - s * 0.05], [x + s * 0.42, yy + s * 0.08]], rgba(T.deep, 0.5), 0.6, { smooth: true });
    }
    return;
  }
  if (kind === 'fan') {
    const arms = 7;
    for (let i = 0; i < arms; i++) {
      const a = -Math.PI * 0.95 + (i / (arms - 1)) * Math.PI * 0.9;
      const l = s * (0.8 + 0.22 * Math.sin((i / (arms - 1)) * Math.PI));
      const e: Vec2 = [x + Math.cos(a) * l * 0.8, y + Math.sin(a) * l * 0.9];
      line(ctx, [[x, y], e], edge, 1.7);
      line(ctx, [[x, y], e], i % 2 ? T.light : T.base, 0.9);
    }
    shape(ctx, [[x - s * 0.7, y - s * 0.6], [x, y - s * 0.95], [x + s * 0.7, y - s * 0.6]], { stroke: rgba(T.light, 0.8), width: 0.7, closed: false, smooth: true });
    return;
  }
  // Branching: a few fat fingers.
  const n = 5;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.46 + rand.range(-0.12, 0.12);
    const len = s * rand.range(0.7, 1.05) * (i === 2 ? 1.2 : 1);
    const mid: Vec2 = [x + Math.cos(a + 0.28) * len * 0.5, y + Math.sin(a) * len * 0.5];
    const end: Vec2 = [x + Math.cos(a) * len, y + Math.sin(a) * len * 0.85];
    const c = catmullRom([[x, y], mid, end], 5);
    taper(ctx, c, s * 0.46, s * 0.3, edge);
    dot(ctx, end[0], end[1], s * 0.24, edge);
    taper(ctx, c, s * 0.3, s * 0.18, i % 2 ? T.light : T.base);
    dot(ctx, end[0], end[1], s * 0.13, T.light);
  }
  ellipse(ctx, x, y, s * 0.4, s * 0.22, { fill: T.shade, stroke: edge, width: 0.8 });
}

export function drawReef(pen: Pen, w: number, h: number, look: ReefLook): void {
  const { ctx, rand, u } = pen;
  const cx = w / 2;
  const cy = h / 2;
  const poly = blob(rand, cx, cy, look.rx, look.ry, { points: 28, jitter: 0.045, lobes: look.lobes ?? 5, lobeAmp: 0.13 });
  const inner = poly.map((p): Vec2 => [lerp(cx, p[0], 0.62), lerp(cy, p[1], 0.62)]);

  // Feathered edge, then the shallows deepening toward the middle.
  for (const [wd, a] of [[22, 0.06], [15, 0.09], [9, 0.13], [4.5, 0.2]] as const) shape(ctx, poly, { stroke: rgba(look.water.rim, a), width: wd, smooth: true });
  shape(ctx, poly, { fill: radialGradient(ctx, cx, cy, 0, Math.max(look.rx, look.ry), [[0, rgba(look.water.core, 0.92)], [0.55, rgba(look.water.mid, 0.82)], [1, rgba(look.water.rim, 0.62)]]), smooth: true });
  shape(ctx, inner, { fill: rgba(look.water.core, 0.18), smooth: true });

  if (look.lagoon) {
    const lg = blob(rand, cx, cy, look.lagoon.rx, look.lagoon.ry, { points: 22, jitter: 0.05, lobes: 4, lobeAmp: 0.08 });
    shape(ctx, lg, { stroke: rgba('#e8fff8', 0.7), width: 3.4, smooth: true });
    shape(ctx, lg, { fill: radialGradient(ctx, cx, cy, 0, look.lagoon.rx, [[0, rgba('#0f6f93', 0.95)], [0.7, rgba('#1d93b0', 0.9)], [1, rgba('#47bcc4', 0.85)]]), smooth: true });
    shape(ctx, lg, { stroke: rgba('#0c4a64', 0.5), width: 1, smooth: true });
  }

  clipped(ctx, poly, () => {
    for (const [x, y, rx, ry] of look.sand ?? []) {
      const sb = blob(rand, x, y, rx, ry, { points: 14, jitter: 0.1, lobes: 3, lobeAmp: 0.1 });
      shape(ctx, sb, { stroke: rgba('#f6efd0', 0.5), width: 3.4, smooth: true });
      shape(ctx, sb, { fill: linearGradient(ctx, x - rx, y - ry, x + rx, y + ry, ['#f8efc8', '#ecd9a0', '#d2bd80']), stroke: rgba('#9a8550', 0.7), width: 0.8, smooth: true });
      for (let i = 0; i < 5; i++) dot(ctx, x + rand.range(-0.7, 0.7) * rx, y + rand.range(-0.6, 0.6) * ry, 0.5, rgba('#8a7440', 0.55));
    }
    for (const [x, y, r] of look.stones ?? []) {
      const st = blob(rand, x, y, r, r * 0.72, { points: 10, jitter: 0.2 });
      shape(ctx, st.map((p): Vec2 => [p[0] + 0.8, p[1] + 1.3]), { fill: rgba('#07304a', 0.3), smooth: true });
      shape(ctx, st, { fill: linearGradient(ctx, x - r, y - r, x + r, y + r, ['#4a7f8c', '#2d5f70', '#1b4254']), stroke: rgba('#0b2a38', 0.85), width: 0.9 * u, smooth: true });
      line(ctx, [[x - r * 0.6, y - r * 0.3], [x - r * 0.1, y - r * 0.5]], rgba('#9fd0d6', 0.6), 0.7);
    }
  }, true);

  for (const c of [...(look.corals ?? [])].sort((a, b) => a.y - b.y)) coral(pen, c.x, c.y, c.s, c.color, c.kind ?? 'branch');

  // Breakers along the edge where the swell trips over the shallows.
  for (const [x, y, ww, flip] of look.breakers ?? []) {
    waveMark(ctx, x, y, ww, { color: rgba(FOAM, 0.95), shade: rgba('#0a3a5a', 0.3), width: 1.4 * u, curl: 0.8, flip: flip ?? false });
  }
}
