import { mix, rgba } from '../kit/colors';
import { dot, linearGradient, shades, softBlob, tracePoly } from '../kit/draw';
import { TAU } from '../kit/math';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';

/**
 * Shared geometry for settlements and landmarks.
 *
 * Buildings live on a dimetric ground grid: `u` runs to the right/back, `v` to the left/back and `z` is height.
 * `makeIso(ox, oy)` maps grid coordinates to the sprite, `(ox, oy)` being the nearest ground corner.
 * Objects are collected in a `Scene` and painted far-to-near, with all their ground shadows merged into one soft shape.
 */

export const INK = '#2a2015';
export const K = 0.866;
export const EX: Vec2 = [K, -0.5];
export const EY: Vec2 = [-K, -0.5];

/** Stone palettes (light/shade tones are derived with `shades()`). */
export const STONE = {
  gray: '#b4aea0',
  warm: '#c3b394',
  pale: '#d4cab2',
  cold: '#a3a8ad',
  dark: '#807d78',
  slate: '#6d7079',
  basalt: '#4b4757',
  ash: '#8a867f',
} as const;

export const WOOD = { light: '#c9a06a', base: '#9a6f45', dark: '#6b4a2b', gray: '#8b7d6b' } as const;

export type Iso = (u: number, v: number, z?: number) => Vec2;

export function makeIso(ox: number, oy: number): Iso {
  return (u, v, z = 0) => [ox + (u - v) * K, oy - (u + v) * 0.5 - z];
}

/* ------------------------------------------------------------------------------------ */
/* Faces: a vertical plane with local x running along the face and local y pointing UP    */
/* ------------------------------------------------------------------------------------ */

export interface Face {
  /** Screen position of local (0, 0). */
  o: Vec2;
  /** Screen direction of local +x. */
  d: Vec2;
}

/** The lit face (normal towards -u). Local x runs left to right, so the wall's far end is at x = 0. */
export function leftFace(iso: Iso, u: number, v: number, b: number, z = 0): Face {
  return { o: iso(u, v + b, z), d: [K, 0.5] };
}

/** The shaded face (normal towards -v). Local x runs left to right. */
export function rightFace(iso: Iso, u: number, v: number, z = 0): Face {
  return { o: iso(u, v, z), d: [K, -0.5] };
}

export const facePt = (f: Face, s: number, z: number): Vec2 => [f.o[0] + f.d[0] * s, f.o[1] + f.d[1] * s - z];

/** Paint in a face's local frame (x along the face, y up). Strokes are slightly sheared, which is fine for details. */
export function inFace(ctx: Ctx2D, f: Face, fn: () => void): void {
  ctx.save();
  ctx.transform(f.d[0], f.d[1], 0, -1, f.o[0], f.o[1]);
  fn();
  ctx.restore();
}

/* ------------------------------------------------------------------------------------ */
/* Scene: painter's algorithm + merged soft shadows                                      */
/* ------------------------------------------------------------------------------------ */

export interface Scene {
  /** Register a ground shadow polygon (sprite space). */
  shadow(poly: readonly Vec2[]): void;
  /** Register an object. Larger `depth` (= u + v) is farther away and painted first. */
  add(depth: number, draw: () => void): void;
  render(ctx: Ctx2D, shadowAlpha?: number): void;
}

export function createScene(): Scene {
  const shadows: Vec2[][] = [];
  const pieces: { depth: number; seq: number; draw: () => void }[] = [];
  return {
    shadow(poly) {
      shadows.push(poly.slice());
    },
    add(depth, draw) {
      pieces.push({ depth, seq: pieces.length, draw });
    },
    render(ctx, shadowAlpha = 0.3) {
      if (shadows.length) {
        const scale = Math.max(0.2, ctx.getTransform().a);
        ctx.save();
        ctx.filter = `blur(${(1.1 * scale).toFixed(2)}px)`;
        ctx.fillStyle = rgba('#1d160c', shadowAlpha);
        ctx.beginPath();
        for (const s of shadows) tracePoly(ctx, s, true);
        ctx.fill();
        ctx.restore();
      }
      pieces.sort((a, b) => b.depth - a.depth || a.seq - b.seq);
      for (const p of pieces) p.draw();
    },
  };
}

/** Everything a builder needs: the canvas, the ground grid, the scene and the seeded generator. */
export interface Stage {
  ctx: Ctx2D;
  iso: Iso;
  scene: Scene;
  rand: Rng;
}

export function createStage(ctx: Ctx2D, rand: Rng, ox: number, oy: number): Stage {
  return { ctx, iso: makeIso(ox, oy), scene: createScene(), rand };
}

export function convexHull(points: readonly Vec2[]): Vec2[] {
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o: Vec2, a: Vec2, b: Vec2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Vec2[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Vec2[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/** Shadow of a prism: its footprint swept towards the lower right (light from the top left). */
export function shadowOf(footprint: readonly Vec2[], height: number, reach = 0.5): Vec2[] {
  const sx = height * reach;
  const sy = height * reach * 0.46;
  return convexHull([...footprint, ...footprint.map((p): Vec2 => [p[0] + sx, p[1] + sy])]);
}

export function ellipseFootprint(cx: number, cy: number, rx: number, ry: number, n = 10): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i < n; i++) out.push([cx + Math.cos((i / n) * TAU) * rx, cy + Math.sin((i / n) * TAU) * ry]);
  return out;
}

/** Footprint rectangle of a grid box in sprite space. */
export function boxFootprint(iso: Iso, u: number, v: number, a: number, b: number): Vec2[] {
  return [iso(u, v), iso(u + a, v), iso(u + a, v + b), iso(u, v + b)];
}

/* ------------------------------------------------------------------------------------ */
/* Textures and small details                                                            */
/* ------------------------------------------------------------------------------------ */

/** Masonry courses and staggered joints on a face (call inside `inFace`). */
export function masonry(ctx: Ctx2D, len: number, h: number, color: string, rand: Rng, o: { row?: number; block?: number; alpha?: number } = {}): void {
  const row = o.row ?? 4.2;
  const block = o.block ?? 6.5;
  ctx.save();
  ctx.strokeStyle = rgba(color, o.alpha ?? 0.3);
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  for (let z = row; z < h - 0.6; z += row) {
    ctx.moveTo(0, z);
    ctx.lineTo(len, z);
  }
  let r = 0;
  for (let z = 0; z < h - 0.6; z += row, r++) {
    let s = (r % 2) * block * 0.5 + rand.range(0.5, block * 0.5);
    while (s < len - 0.8) {
      ctx.moveTo(s, z);
      ctx.lineTo(s, Math.min(z + row, h));
      s += block * rand.range(0.75, 1.25);
    }
  }
  ctx.stroke();
  ctx.restore();
}

/** Mottled stone: a few faint lighter/darker patches so large faces never look like flat plastic. */
export function mottle(ctx: Ctx2D, len: number, h: number, tones: { light: string; deep: string }, rand: Rng, count: number): void {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const w = rand.range(2.5, 7);
    const hh = rand.range(1.8, 3.8);
    const x = rand.range(0, Math.max(0.1, len - w));
    const y = rand.range(0, Math.max(0.1, h - hh));
    ctx.fillStyle = rand.chance(0.5) ? rgba(tones.light, 0.16) : rgba(tones.deep, 0.14);
    ctx.fillRect(x, y, w, hh);
  }
  ctx.restore();
}

export interface WindowOpts {
  ink?: string;
  glow?: string;
  /** Stone frame color. */
  frame?: string;
}

/** An arched window with a warm lit interior. Call with a face and a local position (x center, y bottom). */
export function archWindow(ctx: Ctx2D, f: Face, s: number, z: number, w: number, h: number, o: WindowOpts = {}): void {
  const ink = o.ink ?? INK;
  inFace(ctx, f, () => {
    const path = (grow: number) => {
      ctx.beginPath();
      ctx.moveTo(s - w / 2 - grow, z - grow);
      ctx.lineTo(s - w / 2 - grow, z + h - w / 2);
      ctx.arc(s, z + h - w / 2, w / 2 + grow, Math.PI, 0, false);
      ctx.lineTo(s + w / 2 + grow, z - grow);
      ctx.closePath();
    };
    if (o.frame) {
      path(0.7);
      ctx.fillStyle = o.frame;
      ctx.fill();
    }
    path(0);
    ctx.fillStyle = linearGradient(ctx, 0, z, 0, z + h, [[0, '#2b2118'], [0.45, o.glow ?? '#e9b95a'], [1, '#6b4a2b']]);
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  });
}

export function slit(ctx: Ctx2D, f: Face, s: number, z: number, w = 1.4, h = 4.4): void {
  inFace(ctx, f, () => {
    ctx.fillStyle = '#2b2118';
    ctx.fillRect(s - w / 2, z, w, h);
  });
}

/** Arched gate with dark depth and a portcullis grid. */
export function gateway(ctx: Ctx2D, f: Face, s: number, w: number, h: number, o: { ink?: string; open?: boolean; wood?: string } = {}): void {
  const ink = o.ink ?? INK;
  inFace(ctx, f, () => {
    const arch = () => {
      ctx.beginPath();
      ctx.moveTo(s - w / 2, 0);
      ctx.lineTo(s - w / 2, h - w / 2);
      ctx.arc(s, h - w / 2, w / 2, Math.PI, 0, false);
      ctx.lineTo(s + w / 2, 0);
      ctx.closePath();
    };
    ctx.save();
    arch();
    ctx.fillStyle = '#1f1710';
    ctx.fill();
    ctx.clip();
    // Portcullis bars lowered a little way.
    ctx.strokeStyle = o.wood ?? '#7b5a37';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let x = s - w / 2 + 1.3; x < s + w / 2; x += 2.4) {
      ctx.moveTo(x, h * 0.35);
      ctx.lineTo(x, h);
    }
    for (let z = h * 0.5; z < h; z += 2.8) {
      ctx.moveTo(s - w / 2, z);
      ctx.lineTo(s + w / 2, z);
    }
    ctx.stroke();
    ctx.restore();
    arch();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.1;
    ctx.stroke();
  });
}

/** A few blades of grass or weeds, drawn as a loose tuft. */
export function tuft(ctx: Ctx2D, x: number, y: number, size: number, color: string, rand: Rng): void {
  const tones = shades(color);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const dx = (i - 1.5) * size * 0.35;
    ctx.strokeStyle = i % 2 ? tones.light : tones.shade;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x + dx * 0.6, y);
    ctx.quadraticCurveTo(x + dx * 0.9, y - size * 0.6, x + dx * 1.5 + rand.range(-0.8, 0.8), y - size * rand.range(0.8, 1.15));
    ctx.stroke();
  }
  ctx.restore();
}

/** A round bush with an ink outline. */
export function bush(ctx: Ctx2D, x: number, y: number, r: number, color: string, ink: string, rand: Rng): void {
  const tones = shades(color);
  softBlob(ctx, x + r * 0.15, y + r * 0.1, r * 1.25, r * 0.4, '#1d160c', 0.3);
  const lobes: [number, number, number][] = [
    [-0.45, 0.1, 0.62],
    [0.45, 0.12, 0.6],
    [0, -0.3, 0.7],
  ];
  for (const [lx, ly, lr] of lobes) dot(ctx, x + lx * r, y + ly * r, lr * r + 1, ink);
  for (const [lx, ly, lr] of lobes) {
    const g = ctx.createRadialGradient(x + (lx - 0.2) * r, y + (ly - 0.25) * r, 0, x + lx * r, y + ly * r, lr * r);
    g.addColorStop(0, tones.highlight);
    g.addColorStop(0.5, tones.base);
    g.addColorStop(1, tones.shade);
    dot(ctx, x + lx * r, y + ly * r, lr * r, g);
  }
  ctx.fillStyle = rgba(tones.highlight, 0.6);
  for (let i = 0; i < 3; i++) ctx.fillRect(x + rand.range(-0.6, 0.3) * r, y + rand.range(-0.7, 0) * r, 1, 1);
}

/** A loose group of small rocks. */
export function rocks(ctx: Ctx2D, x: number, y: number, n: number, spread: number, color: string, ink: string, rand: Rng): void {
  const tones = shades(color);
  for (let i = 0; i < n; i++) {
    const px = x + rand.range(-spread, spread);
    const py = y + rand.range(-spread * 0.35, spread * 0.35);
    const r = rand.range(1.6, 3.2);
    const pts: Vec2[] = [
      [px - r, py + r * 0.4],
      [px - r * 0.7, py - r * 0.6],
      [px + r * 0.1, py - r * 0.95],
      [px + r * 0.95, py - r * 0.3],
      [px + r, py + r * 0.45],
    ];
    ctx.beginPath();
    tracePoly(ctx, pts, true);
    ctx.fillStyle = linearGradient(ctx, px - r, py - r, px + r, py + r * 0.5, [tones.light, tones.base, tones.shade]);
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
}

/** Soft smoke puffs drifting up and to the right. */
export function smoke(ctx: Ctx2D, x: number, y: number, puffs: number, size: number, rand: Rng): void {
  for (let i = 0; i < puffs; i++) {
    const t = i / Math.max(1, puffs - 1);
    const r = size * (0.45 + 0.8 * t);
    const px = x + t * size * 1.6 + rand.range(-0.6, 0.6);
    const py = y - t * size * 2.4;
    softBlob(ctx, px, py, r, r * 0.9, mix('#f2f0ea', '#9a9690', t * 0.55), 0.62 - 0.22 * t);
  }
}

/** Earth/grass patch under a settlement: a few overlapping soft blobs. */
export function groundPatch(ctx: Ctx2D, cx: number, cy: number, rx: number, ry: number, rand: Rng, color = '#7c5d34', alpha = 0.34): void {
  softBlob(ctx, cx, cy, rx, ry, color, alpha);
  for (let i = 0; i < 4; i++) {
    softBlob(ctx, cx + rand.range(-0.5, 0.5) * rx, cy + rand.range(-0.4, 0.4) * ry, rx * rand.range(0.35, 0.6), ry * rand.range(0.4, 0.65), color, alpha * 0.8);
  }
}

/** Darken a point-lit surface toward the ground: a vertical shade overlay for faces or bodies. */
export function groundShade(ctx: Ctx2D, y0: number, y1: number, color: string, alpha: number): CanvasGradient {
  return linearGradient(ctx, 0, y0, 0, y1, [[0, rgba(color, 0)], [0.55, rgba(color, 0)], [1, rgba(color, alpha)]]);
}
