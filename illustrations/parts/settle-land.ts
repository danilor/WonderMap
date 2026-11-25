import { mix, rgba } from '../kit/colors';
import { defineSymbol } from '../kit/define';
import { ellipse, linearGradient, shades, shape, softBlob } from '../kit/draw';
import type { SymbolDef, Vec2 } from '../kit/types';
import { drawPrism } from './settle-castle';
import { INK, boxFootprint, createStage, ellipseFootprint, shadowOf } from './settle-geom';
import type { Stage } from './settle-geom';

/** Helpers for the landmark symbols: a factory for multi-variant symbols and a few bespoke props. */

export type LandBuilder = (st: Stage) => void;

export interface LandSpec {
  id: string;
  name: string;
  size: readonly [number, number];
  /** Ground line of the drawing as a fraction of the height (also the anchor's y). */
  base?: number;
  order?: number;
  tags: readonly string[];
  placement?: 'land' | 'sea' | 'any';
  rotatable?: boolean;
  builders: readonly LandBuilder[];
  variants?: number;
}

export function landmark(s: LandSpec): SymbolDef {
  const base = s.base ?? 0.86;
  return defineSymbol({
    id: s.id,
    name: s.name,
    category: 'landmarks',
    size: s.size,
    anchor: [0.5, base],
    ...(s.order !== undefined ? { order: s.order } : {}),
    tags: s.tags,
    placement: s.placement ?? 'land',
    ...(s.rotatable ? { rotatable: true } : {}),
    variants: s.variants ?? s.builders.length,
    draw(d) {
      const stage = createStage(d.ctx, d.rand, d.w / 2, d.h * base);
      s.builders[d.variant % s.builders.length]!(stage);
      stage.scene.render(d.ctx);
    },
  });
}

export interface MenhirOpts {
  h: number;
  w?: number;
  stone?: string;
  /** Horizontal drift of the top in pixels. */
  lean?: number;
  moss?: boolean;
  /** Colour of glowing runes carved into the lit face. */
  runes?: string;
}

const MENHIR: readonly Vec2[] = [[-0.5, 0.02], [-0.47, -0.42], [-0.36, -0.8], [-0.14, -1], [0.14, -0.97], [0.38, -0.72], [0.5, -0.32], [0.5, 0.03]];

/** A rough standing stone: lit left half, shaded right half, cracks, moss and optional glowing runes. */
export function addMenhir(st: Stage, u: number, v: number, o: MenhirOpts): void {
  const { ctx, iso, scene, rand } = st;
  const [x, y] = iso(u, v);
  const w = o.w ?? o.h * 0.42;
  const lean = o.lean ?? 0;
  const tones = shades(o.stone ?? '#9d998e');
  const seed = rand.fork(rand.int(0, 1e9));
  const P = (q: Vec2): Vec2 => [x + q[0] * w - q[1] * lean, y + q[1] * o.h];
  const pts = MENHIR.map((q, i) => P(i > 0 && i < MENHIR.length - 2 ? [q[0] + seed.range(-0.05, 0.05), q[1] + seed.range(-0.04, 0.04)] : q));
  const top = P([-0.02, -1]);
  const foot = P([0.1, 0.03]);
  const crack = [seed.range(-0.25, 0.1), seed.range(0.2, 0.5)] as const;
  scene.shadow(shadowOf(ellipseFootprint(x, y, w * 0.6, w * 0.3, 8), o.h * 0.8, 0.5));
  scene.add(u + v, () => {
    ctx.save();
    ctx.lineJoin = 'round';
    const lit: Vec2[] = [pts[0]!, pts[1]!, pts[2]!, pts[3]!, top, foot];
    const dark: Vec2[] = [top, pts[4]!, pts[5]!, pts[6]!, pts[7]!, foot];
    shape(ctx, lit, { fill: linearGradient(ctx, x - w / 2, y - o.h, x + w * 0.1, y, [tones.highlight, tones.light, tones.base]) });
    shape(ctx, dark, { fill: linearGradient(ctx, x, y - o.h, x + w / 2, y, [tones.base, tones.shade]) });
    ctx.save();
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = rgba(tones.deep, 0.6);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    const c0 = P([crack[0], -crack[1] - 0.35]);
    ctx.moveTo(c0[0], c0[1]);
    ctx.lineTo(c0[0] + 1.2, c0[1] + o.h * 0.14);
    ctx.lineTo(c0[0] - 0.8, c0[1] + o.h * 0.26);
    ctx.stroke();
    if (o.moss) {
      ctx.fillStyle = rgba('#6f9a45', 0.85);
      for (let k = 0; k < 5; k++) ctx.fillRect(x - w * 0.5 + k * w * 0.2 + seed.range(-1, 1), y - seed.range(2, o.h * 0.22), seed.range(2, 4.5), 4);
      ctx.fillStyle = rgba('#8dbb5a', 0.8);
      ctx.fillRect(x - w * 0.46, y - o.h * 0.16, w * 0.5, 1.4);
    }
    if (o.runes) {
      for (const [a, wd] of [[4.2, rgba(o.runes, 0.35)], [1.1, o.runes]] as const) {
        ctx.strokeStyle = wd;
        ctx.lineWidth = a;
        ctx.lineCap = 'round';
        for (let k = 0; k < 3; k++) {
          const p = P([-0.22, -0.3 - k * 0.2]);
          ctx.beginPath();
          ctx.moveTo(p[0], p[1] - 2.4);
          ctx.lineTo(p[0], p[1] + 2.4);
          ctx.moveTo(p[0], p[1] - 0.6);
          ctx.lineTo(p[0] + 2.6, p[1] - 2.6);
          ctx.moveTo(p[0], p[1] + 0.8);
          ctx.lineTo(p[0] + 2.2, p[1] - 0.6);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = rgba(tones.deep, 0.55);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(top[0], top[1]);
    ctx.lineTo(foot[0], foot[1]);
    ctx.stroke();
    ctx.restore();
  });
}

export interface ObeliskOpts {
  a: number;
  h: number;
  stone?: string;
  /** Colour of the glowing glyphs; none leaves plain carvings. */
  glow?: string;
}

/** A tapering four-sided shaft on a plinth, topped by a pyramidion. */
export function addObelisk(st: Stage, u: number, v: number, o: ObeliskOpts): void {
  const { ctx, iso, scene } = st;
  const tones = shades(o.stone ?? '#b9b2a0');
  const A = o.a / 2;
  const B = A * 0.58;
  const z0 = 3.4;
  const z1 = o.h;
  const P = 1.6 * A;
  const plinth: Vec2[] = [[u - P, v - P], [u + P, v - P], [u + P, v + P], [u - P, v + P]];
  scene.shadow(shadowOf(boxFootprint(iso, u - P, v - P, P * 2, P * 2), o.h * 0.9, 0.55));
  scene.add(u + v, () => {
    drawPrism(ctx, iso, { poly: plinth, h: z0, stone: mix(o.stone ?? '#b9b2a0', '#7d776a', 0.35), lineWidth: 1 });
    const q = (du: number, dv: number, r: number, z: number): Vec2 => iso(u + du * r, v + dv * r, z);
    const left: Vec2[] = [q(-1, -1, A, z0), q(-1, 1, A, z0), q(-1, 1, B, z1), q(-1, -1, B, z1)];
    const right: Vec2[] = [q(-1, -1, A, z0), q(1, -1, A, z0), q(1, -1, B, z1), q(-1, -1, B, z1)];
    const apex = iso(u, v, z1 + B * 2);
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1;
    ctx.strokeStyle = INK;
    shape(ctx, left, { fill: linearGradient(ctx, left[0]![0], left[0]![1], left[3]![0], left[3]![1], [tones.light, tones.highlight]), stroke: INK, width: 1 });
    shape(ctx, right, { fill: linearGradient(ctx, right[0]![0], right[0]![1], right[3]![0], right[3]![1], [tones.shade, tones.base]), stroke: INK, width: 1 });
    shape(ctx, [q(-1, -1, B, z1), q(-1, 1, B, z1), apex], { fill: tones.highlight, stroke: INK, width: 1 });
    shape(ctx, [q(-1, -1, B, z1), q(1, -1, B, z1), apex], { fill: tones.light, stroke: INK, width: 1 });
    // Carved bands and glyphs on the lit face.
    const F = (s: number, t: number): Vec2 => {
      const b = q(-1, -1 + 2 * s, A, z0);
      const tt = q(-1, -1 + 2 * s, B, z1);
      return [b[0] + (tt[0] - b[0]) * t, b[1] + (tt[1] - b[1]) * t];
    };
    ctx.lineCap = 'round';
    for (const [w, col] of [[o.glow ? 3.6 : 0, o.glow ? rgba(o.glow, 0.35) : ''], [0.9, o.glow ?? rgba(tones.deep, 0.7)]] as const) {
      if (!w) continue;
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const t = 0.12 + k * 0.17;
        const a = F(0.26, t);
        const b = F(0.74, t);
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        for (const s of [0.4, 0.6]) {
          const c = F(s, t);
          const d = F(s, t + 0.07);
          ctx.moveTo(c[0], c[1]);
          ctx.lineTo(d[0], d[1]);
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  });
}

/** Four lattice sails on a hub in front of a mill tower. `rot` is the angle of the first sail in radians. */
export function addSails(st: Stage, u: number, v: number, z: number, o: { len: number; rot: number; cloth?: string; d?: number }): void {
  const { ctx, iso, scene } = st;
  const d = o.d ?? 4;
  const [hx, hy] = iso(u - d, v - d, z);
  scene.add(u + v - 2 * d - 0.5, () => {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      ctx.save();
      ctx.rotate(o.rot + (k * Math.PI) / 2);
      const x0 = o.len * 0.2;
      const wd = o.len * 0.2;
      ctx.fillStyle = o.cloth ?? '#e9dfc4';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.rect(x0, 0.8, o.len - x0, wd);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = rgba('#7c5a3c', 0.9);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (let i = 1; i < 5; i++) {
        const x = x0 + ((o.len - x0) * i) / 5;
        ctx.moveTo(x, 0.8);
        ctx.lineTo(x, 0.8 + wd);
      }
      ctx.moveTo(x0, 0.8 + wd / 2);
      ctx.lineTo(o.len, 0.8 + wd / 2);
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(o.len, 0);
      ctx.stroke();
      ctx.strokeStyle = '#8a6a45';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }
    ellipse(ctx, 0, 0, 2.4, 2.4, { fill: '#6f4f33', stroke: INK, width: 1 });
    ctx.restore();
  });
}

/** A wooden beam between two 3D points (posts, braces, rails). */
export function addBeam(st: Stage, a: readonly [number, number, number], b: readonly [number, number, number], o: { w?: number; wood?: string; depth?: number } = {}): void {
  const { ctx, iso, scene } = st;
  const p = iso(a[0], a[1], a[2]);
  const q = iso(b[0], b[1], b[2]);
  const w = o.w ?? 2;
  scene.add(o.depth ?? Math.min(a[0] + a[1], b[0] + b[1]), () => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(q[0], q[1]);
    ctx.strokeStyle = INK;
    ctx.lineWidth = w + 1.5;
    ctx.stroke();
    ctx.strokeStyle = o.wood ?? '#9a6f45';
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.strokeStyle = rgba('#d9b27c', 0.65);
    ctx.lineWidth = w * 0.32;
    ctx.stroke();
    ctx.restore();
  });
}

/** Translucent wedges of light fanning out sideways from a lantern. */
export function addLightRays(st: Stage, u: number, v: number, z: number, o: { len: number; color?: string; spread?: number }): void {
  const { ctx, iso, scene } = st;
  const [x, y] = iso(u, v, z);
  const color = o.color ?? '#ffe08a';
  const s = o.spread ?? 0.2;
  scene.add(u + v - 60, () => {
    ctx.save();
    softBlob(ctx, x, y, o.len * 0.2, o.len * 0.16, color, 0.5);
    for (const a of [0.1, Math.PI - 0.1]) {
      const g = ctx.createRadialGradient(x, y, 2, x, y, o.len);
      g.addColorStop(0, rgba(color, 0.55));
      g.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a - s) * o.len, y + Math.sin(a - s) * o.len * 0.5);
      ctx.lineTo(x + Math.cos(a + s) * o.len, y + Math.sin(a + s) * o.len * 0.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  });
}

/** A flickering flame with a soft glow, standing at a ground position raised by `z`. */
export function addFlame(st: Stage, u: number, v: number, z: number, size = 1, bias = 0): void {
  const { ctx, iso, scene } = st;
  const [x, y] = iso(u, v, z);
  scene.add(u + v - 0.4 - bias, () => {
    ctx.save();
    softBlob(ctx, x, y - 4 * size, 8 * size, 6 * size, '#ffb347', 0.35);
    const flame = (s: number, col: string): void => {
      shape(ctx, [[x - 3 * s, y], [x - 3.2 * s, y - 3 * s], [x - 1 * s, y - 6 * s], [x - 0.6 * s, y - 9 * s], [x + 1.4 * s, y - 5.5 * s], [x + 3 * s, y - 3 * s], [x + 3 * s, y]], { fill: col, smooth: true, stroke: s > 0.8 * size ? INK : undefined, width: 0.8 });
    };
    flame(size, '#e5702a');
    flame(size * 0.66, '#ffb347');
    flame(size * 0.34, '#fff1b0');
    ctx.restore();
  });
}
