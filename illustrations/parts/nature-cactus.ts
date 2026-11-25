import { rgba } from '../kit/colors';
import { dot, ellipse, radialGradient, shades, shape, softBlob, taper } from '../kit/draw';
import { TAU } from '../kit/math';
import { blob, normals, resample } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { INK, quadPts } from './nature-common';

export const CACTUS_GREEN = '#6c9e55';
const SPINE = '#f3e4ac';
const LIGHT: Vec2 = [-0.7071, -0.7071];

/** Offsets a path towards the lit side: the stripe rides the edge that faces the top-left and crosses the centre where the path runs along the light. */
export function litStripe(pts: readonly Vec2[], d: number): Vec2[] {
  const nm = normals(pts);
  return pts.map((p, i): Vec2 => {
    const n = nm[i]!;
    const m = d * (n[0] * LIGHT[0] + n[1] * LIGHT[1]);
    return [p[0] + n[0] * m, p[1] + n[1] * m];
  });
}

/** Little four petal blossom with an ink edge. */
export function blossom(ctx: Ctx2D, x: number, y: number, r: number, ink: string, petal = '#fff3d6', center = '#f1bd2c'): void {
  ctx.save();
  ctx.fillStyle = petal;
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(0.5, r * 0.3);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU - 1.2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.55, r * 0.4, a, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  dot(ctx, x, y, r * 0.34, center);
}

/* ------------------------------------------------------------------------------------ */
/* Saguaro                                                                              */
/* ------------------------------------------------------------------------------------ */

export interface ArmSpec {
  side: -1 | 1;
  /** Where the arm leaves the trunk: 0 = ground, 1 = top. */
  at: number;
  /** Sideways reach of the elbow in px. */
  reach: number;
  /** How far the arm climbs above the elbow in px. */
  rise: number;
}

export interface SaguaroOptions {
  cx: number;
  baseY: number;
  h: number;
  trunkW: number;
  arms: readonly ArmSpec[];
  rand: Rng;
  skin?: string;
  ink?: string;
  /** Sideways drift of the top of the trunk in px. */
  lean?: number;
  bloom?: boolean;
  shadow?: boolean;
}

interface Limb {
  pts: Vec2[];
  w0: number;
  w1: number;
}

/** A tall columnar cactus with elbow arms, ribs and rows of pale spines. */
export function drawSaguaro(ctx: Ctx2D, o: SaguaroOptions): void {
  const { rand, cx, baseY, h, trunkW } = o;
  const ink = o.ink ?? INK;
  const skin = o.skin ?? CACTUS_GREEN;
  const tones = shades(skin);
  const inkW = Math.max(1, trunkW * 0.13);
  const lean = o.lean ?? 0;
  const trunkX = (t: number): number => cx + lean * t * t;

  const trunk: Vec2[] = [];
  for (let i = 0; i <= 10; i++) trunk.push([trunkX(i / 10), baseY - h * (i / 10)]);
  const limbs: Limb[] = [{ pts: trunk, w0: trunkW * 1.12, w1: trunkW * 0.94 }];
  let reachMax = 0;
  for (const a of o.arms) {
    const ya = baseY - h * a.at;
    const xa = trunkX(a.at);
    const start: Vec2 = [xa + a.side * trunkW * 0.2, ya];
    const ex = xa + a.side * (trunkW * 0.55 + a.reach);
    const tip: Vec2 = [ex, ya - a.rise];
    limbs.push({ pts: [...quadPts(start, [ex, ya + trunkW * 0.18], [ex, ya - trunkW * 0.9], 8), tip], w0: trunkW * 0.74, w1: trunkW * 0.66 });
    reachMax = Math.max(reachMax, a.reach + trunkW);
  }

  if (o.shadow !== false) {
    softBlob(ctx, cx + trunkW * 0.8, baseY + 0.5, trunkW * 1.3 + reachMax * 0.6, trunkW * 0.5, '#1d160c', 0.32);
    softBlob(ctx, cx, baseY, trunkW * 1.1, trunkW * 0.34, '#6a4a22', 0.4);
  }

  for (const l of limbs) {
    taper(ctx, l.pts, l.w0 + inkW * 2, l.w1 + inkW * 2, ink);
    const e = l.pts[l.pts.length - 1]!;
    dot(ctx, e[0], e[1], l.w1 / 2 + inkW, ink);
  }
  for (const l of limbs) {
    taper(ctx, l.pts, l.w0, l.w1, skin);
    const e = l.pts[l.pts.length - 1]!;
    dot(ctx, e[0], e[1], l.w1 / 2, skin);
  }

  limbs.forEach((l, li) => {
    const dense = resample(l.pts, 2);
    const wAt = (i: number): number => l.w0 + (l.w1 - l.w0) * (i / Math.max(1, dense.length - 1));
    // Body shading: a deep stripe on the far side and a light stripe on the lit side.
    taper(ctx, litStripe(dense, -l.w0 * 0.3), l.w0 * 0.4, l.w1 * 0.36, rgba(tones.deep, 0.5));
    taper(ctx, litStripe(dense, l.w0 * 0.24), l.w0 * 0.26, l.w1 * 0.2, rgba(tones.highlight, 0.7));

    // Ribs run the full length and carry staggered spines.
    const nm = normals(dense);
    const ribs = li === 0 ? [-0.62, -0.2, 0.22, 0.64] : [-0.5, 0, 0.5];
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = rgba(tones.deep, 0.5);
    ctx.beginPath();
    ribs.forEach((u) => {
      for (let i = 2; i < dense.length - 2; i++) {
        const p = dense[i]!;
        const n = nm[i]!;
        const off = (u * wAt(i)) / 2;
        const x = p[0] + n[0] * off;
        const y = p[1] + n[1] * off;
        if (i === 2) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    ctx.strokeStyle = rgba(SPINE, 0.9);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ribs.forEach((u, ri) => {
      for (let i = 3 + (ri % 2) * 2; i < dense.length - 2; i += 4) {
        const p = dense[i]!;
        const n = nm[i]!;
        const off = (u * wAt(i)) / 2;
        const x = p[0] + n[0] * off;
        const y = p[1] + n[1] * off;
        ctx.moveTo(x - 1.1, y - 0.3);
        ctx.lineTo(x + 1.1, y + 0.3);
        ctx.moveTo(x - 0.3, y - 1.1);
        ctx.lineTo(x + 0.3, y + 1.1);
      }
    });
    ctx.stroke();
    ctx.restore();

    if (o.bloom) {
      const e = l.pts[l.pts.length - 1]!;
      const r = Math.max(1.5, l.w1 * 0.26);
      blossom(ctx, e[0] + rand.range(-1, 1) * r, e[1] - l.w1 * 0.1, r, ink);
      if (li === 0) blossom(ctx, e[0] - l.w1 * 0.3, e[1] + l.w1 * 0.45, r * 0.8, ink);
    }
  });
}

/* ------------------------------------------------------------------------------------ */
/* Barrel cactus                                                                        */
/* ------------------------------------------------------------------------------------ */

export interface BarrelOptions {
  cx: number;
  baseY: number;
  /** Horizontal radius of the body. */
  r: number;
  /** Height over width of the body. */
  tall: number;
  rand: Rng;
  skin?: string;
  spine?: string;
  /** Colour of the flowers on the crown; none when omitted. */
  bloom?: string;
  ribs?: number;
  ink?: string;
  shadow?: boolean;
}

/** A fat ribbed ball with tufts of spines and a crown of flowers. */
export function drawBarrel(ctx: Ctx2D, o: BarrelOptions): void {
  const { rand, cx, baseY, r } = o;
  const ink = o.ink ?? INK;
  const skin = o.skin ?? CACTUS_GREEN;
  const tones = shades(skin);
  const spine = o.spine ?? SPINE;
  const elev = 0.66;
  const sinE = Math.sin(elev);
  const cosE = Math.cos(elev);
  const rv = r * o.tall;
  const ry = Math.hypot(rv * cosE, r * sinE);
  const cy = baseY - ry + 1;
  const inkW = Math.max(1, r * 0.11);
  const ribCount = o.ribs ?? 9;

  if (o.shadow !== false) {
    softBlob(ctx, cx + r * 0.3, baseY + 0.5, r * 1.4, r * 0.42, '#1d160c', 0.34);
    softBlob(ctx, cx, baseY, r * 1.05, r * 0.3, '#6a4a22', 0.4);
  }

  const body = blob(rand, cx, cy, r, ry, { points: 18, jitter: 0.02 });
  shape(ctx, body, { fill: ink, stroke: ink, width: inkW * 2, smooth: true });
  const fill = radialGradient(
    ctx,
    cx + r * 0.2,
    cy + ry * 0.25,
    r * 0.12,
    r * 1.4,
    [
      [0, tones.highlight],
      [0.28, tones.light],
      [0.6, tones.base],
      [0.86, tones.shade],
      [1, tones.deep],
    ],
    cx - r * 0.38,
    cy - ry * 0.42,
  );
  shape(ctx, body, { fill, smooth: true });

  const project = (lam: number, phi: number): { p: Vec2; vis: boolean } => {
    const X = r * Math.cos(phi) * Math.sin(lam);
    const Y = rv * Math.sin(phi);
    const Z = r * Math.cos(phi) * Math.cos(lam);
    const ny = Math.sin(phi) / rv;
    const nz = (Math.cos(phi) * Math.cos(lam)) / r;
    return { p: [cx + X, cy - (Y * cosE - Z * sinE)], vis: ny * sinE + nz * cosE > 0.015 };
  };

  const stations = [1.18, 0.92, 0.66, 0.4, 0.14, -0.14, -0.42];
  const ribPaths: Vec2[][] = [];
  const stars: Vec2[] = [];
  for (let j = 0; j < ribCount; j++) {
    const lam = -Math.PI / 2 + ((j + 0.5) * Math.PI) / ribCount + rand.range(-0.03, 0.03);
    const path: Vec2[] = [];
    for (let k = 0; k <= 18; k++) {
      const phi = Math.PI / 2 - 0.05 - (k / 18) * 1.75;
      const q = project(lam, phi);
      if (q.vis) path.push(q.p);
    }
    ribPaths.push(path);
    for (const phi of stations) {
      const q = project(lam, phi);
      if (q.vis) stars.push(q.p);
    }
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Ribs: a dark valley with a light flank beside it.
  ctx.lineWidth = Math.max(0.7, r * 0.06);
  ctx.strokeStyle = rgba(tones.deep, 0.62);
  ctx.beginPath();
  for (const path of ribPaths) {
    path.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
  }
  ctx.stroke();
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = rgba(tones.highlight, 0.42);
  ctx.beginPath();
  for (const path of ribPaths) {
    path.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0] - 0.8, p[1] - 0.3) : ctx.lineTo(p[0] - 0.8, p[1] - 0.3)));
  }
  ctx.stroke();

  // Spine tufts at the areoles.
  const sl = Math.max(1.2, r * 0.13);
  ctx.strokeStyle = rgba(spine, 0.95);
  ctx.lineWidth = Math.max(0.55, r * 0.045);
  ctx.beginPath();
  for (const s of stars) {
    for (const a of [-2.2, -1.57, -0.95, -0.35]) {
      ctx.moveTo(s[0], s[1]);
      ctx.lineTo(s[0] + Math.cos(a) * sl, s[1] + Math.sin(a) * sl);
    }
  }
  ctx.stroke();
  ctx.restore();

  // Rim shadow under the lower right edge keeps the ball round.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.92, ry * 0.92, 0, -0.35, Math.PI * 0.62);
  ctx.strokeStyle = rgba(tones.deep, 0.35);
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.stroke();
  ctx.restore();

  // Crown: a woolly pit, with flowers when in bloom.
  const pole = project(0, Math.PI / 2).p;
  ellipse(ctx, pole[0], pole[1] + 0.4, r * 0.3, r * 0.14, { fill: rgba(tones.deep, 0.7) });
  ellipse(ctx, pole[0], pole[1] - 0.1, r * 0.22, r * 0.09, { fill: rgba('#f6ecc4', 0.85) });
  if (o.bloom) {
    const n = 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rand.range(-0.3, 0.3);
      blossom(ctx, pole[0] + Math.cos(a) * r * 0.36, pole[1] + Math.sin(a) * r * 0.14 - 0.8, Math.max(1.6, r * 0.2), ink, o.bloom, '#f7d44a');
    }
  }
}

/* ------------------------------------------------------------------------------------ */
/* Prickly pear                                                                         */
/* ------------------------------------------------------------------------------------ */

export interface PearOptions {
  cx: number;
  baseY: number;
  /** Maximum height of the cluster. */
  h: number;
  /** Maximum width of the cluster. */
  w: number;
  rand: Rng;
  skin?: string;
  /** Colour of the fruits on the rim of the pads. */
  fruit?: string;
  /** Colour of the flowers on the rim of the pads. */
  flower?: string;
  pads?: number;
  ink?: string;
  shadow?: boolean;
}

interface Pad {
  x: number;
  y: number;
  rx: number;
  ry: number;
  a: number;
  gen: number;
}

/** Flat oval pads growing out of each other, dotted with spines. */
export function drawPricklyPear(ctx: Ctx2D, o: PearOptions): void {
  const { rand, cx, baseY } = o;
  const ink = o.ink ?? INK;
  const skin = o.skin ?? '#5f9a5c';
  const tones = shades(skin);

  const first: Pad = { x: cx, y: baseY - o.h * 0.2, rx: o.h * 0.2, ry: o.h * 0.25, a: rand.range(-0.12, 0.12), gen: 0 };
  const pads: Pad[] = [first];
  const total = o.pads ?? rand.int(5, 7);
  let frontier: Pad[] = [first];
  while (pads.length < total && frontier.length) {
    const next: Pad[] = [];
    if (rand.chance(0.5)) frontier.reverse();
    for (const p of frontier) {
      const turns = p.gen === 0 ? [-0.85, 0.04, 0.88] : p.gen === 1 ? [-0.6, 0.6] : [-0.45, 0.45];
      for (const turn of turns) {
        if (pads.length >= total) break;
        if (p.gen > 0 && rand.chance(0.25)) continue;
        const ac = p.a + turn + rand.range(-0.22, 0.22);
        const s = p.gen === 0 ? rand.range(0.84, 0.96) : rand.range(0.78, 0.9);
        const rx = p.rx * s;
        const ry = p.ry * s;
        const rimX = p.x + Math.sin(ac) * p.rx * 0.95;
        const rimY = p.y - Math.cos(ac) * p.ry * 0.95;
        const pad: Pad = { x: rimX + Math.sin(ac) * ry * 0.72, y: rimY - Math.cos(ac) * ry * 0.72, rx, ry, a: ac, gen: p.gen + 1 };
        pads.push(pad);
        next.push(pad);
      }
    }
    frontier = next;
  }

  // Fit the cluster into its box.
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  for (const p of pads) {
    const ex = Math.hypot(p.rx * Math.cos(p.a), p.ry * Math.sin(p.a));
    const ey = Math.hypot(p.rx * Math.sin(p.a), p.ry * Math.cos(p.a));
    minX = Math.min(minX, p.x - ex);
    maxX = Math.max(maxX, p.x + ex);
    minY = Math.min(minY, p.y - ey);
  }
  const k = Math.min(1, o.w / (maxX - minX), o.h / (baseY - minY));
  const shift = cx - (minX + maxX) / 2;
  for (const p of pads) {
    p.x = cx + (p.x + shift - cx) * k;
    p.y = baseY + (p.y - baseY) * k;
    p.rx *= k;
    p.ry *= k;
  }

  if (o.shadow !== false) {
    softBlob(ctx, cx + o.w * 0.1, baseY + 0.5, o.w * 0.5, o.h * 0.1, '#1d160c', 0.32);
    softBlob(ctx, cx, baseY, o.w * 0.3, o.h * 0.07, '#6a4a22', 0.4);
  }

  const inkW = Math.max(0.9, first.rx * 0.11);
  for (const p of pads) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.a);
    const outline = blob(rand, 0, 0, p.rx, p.ry, { points: 14, jitter: 0.035 });
    shape(ctx, outline, { fill: ink, stroke: ink, width: inkW * 2, smooth: true });
    const gx = -0.4 * p.rx;
    const gy = -0.46 * p.ry;
    const fx = gx * Math.cos(p.a) + gy * Math.sin(p.a);
    const fy = -gx * Math.sin(p.a) + gy * Math.cos(p.a);
    const fill = radialGradient(
      ctx,
      -fx * 0.5,
      -fy * 0.5,
      p.ry * 0.12,
      Math.max(p.rx, p.ry) * 1.45,
      [
        [0, tones.highlight],
        [0.3, tones.light],
        [0.62, tones.base],
        [0.9, tones.shade],
        [1, tones.deep],
      ],
      fx,
      fy,
    );
    shape(ctx, outline, { fill, smooth: true });

    // Areoles with a few pale spines each.
    ctx.strokeStyle = rgba(SPINE, 0.95);
    ctx.lineWidth = 0.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    let row = 0;
    for (let v = -p.ry * 0.68; v <= p.ry * 0.7; v += p.ry * 0.4, row++) {
      for (let u = -p.rx * 0.6 + (row % 2) * p.rx * 0.28; u <= p.rx * 0.62; u += p.rx * 0.56) {
        if ((u * u) / (p.rx * p.rx) + (v * v) / (p.ry * p.ry) > 0.66) continue;
        ctx.moveTo(u, v);
        ctx.lineTo(u - 1.1, v - 1.4);
        ctx.moveTo(u, v);
        ctx.lineTo(u + 1.1, v - 1.3);
        ctx.moveTo(u, v);
        ctx.lineTo(u, v - 1.7);
      }
    }
    ctx.stroke();

    if (p.gen >= 1 && (o.fruit || o.flower)) {
      const n = p.gen >= 2 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const u = ((i + 0.5) / n - 0.5) * p.rx * 1.2 + rand.range(-0.6, 0.6);
        const v = -p.ry * (0.88 - Math.abs(u / p.rx) * 0.35);
        if (o.fruit && (!o.flower || i % 2 === 0)) {
          const fr = Math.max(1.6, p.rx * 0.2);
          ellipse(ctx, u, v - fr * 0.3, fr, fr * 1.3, { fill: o.fruit, stroke: ink, width: 0.7 });
          ellipse(ctx, u - fr * 0.3, v - fr * 0.7, fr * 0.3, fr * 0.4, { fill: rgba('#ffffff', 0.45) });
        } else if (o.flower) {
          const fr = Math.max(1.5, p.rx * 0.2);
          blossom(ctx, u, v - fr * 0.4, fr, ink, o.flower, '#e0662a');
        }
      }
    }
    ctx.restore();
  }
}
