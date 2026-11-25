import { mix, parseColor, rgba } from './colors';
import { TAU } from './math';
import { tileFbm } from './noise';
import { context2d, createCanvas } from './surface';
import type { Ctx2D, Rng, TerrainColors } from './types';

/**
 * Helpers for painting SEAMLESS terrain tiles.
 * A tile is repeated across the map, so anything drawn near an edge must also appear on the opposite edge.
 * `wrapped()` takes care of that; `noiseTile()` is already periodic.
 */

/** Call `draw(x, y)` at the position and at the wrapped copies needed so a shape of radius `reach` tiles. */
export function wrapped(size: number, x: number, y: number, reach: number, draw: (x: number, y: number) => void): void {
  const xs = [x];
  const ys = [y];
  if (x - reach < 0) xs.push(x + size);
  if (x + reach > size) xs.push(x - size);
  if (y - reach < 0) ys.push(y + size);
  if (y + reach > size) ys.push(y - size);
  for (const xx of xs) for (const yy of ys) draw(xx, yy);
}

export interface NoiseTileOptions {
  colors: TerrainColors;
  seed: number;
  /** Lattice cells across the tile for the first octave (integer). Default 4. */
  cells?: number;
  octaves?: number;
  /** 0..2: how far noise pushes toward the light/dark colors. Default 1. */
  contrast?: number;
  /** Second, finer noise layer strength (0..1) for a grainy look. Default 0.35. */
  grain?: number;
}

/**
 * Fill the tile with periodic fractal noise blended between the `dark`, `base` and `light` colors.
 * The noise is computed at 1 px per design unit and drawn scaled, so it stays smooth at any render scale.
 */
export function noiseTile(ctx: Ctx2D, size: number, o: NoiseTileOptions): void {
  const px = Math.max(8, Math.round(size));
  const scratch = createCanvas(px, px);
  const sctx = context2d(scratch);
  const img = sctx.createImageData(px, px);
  const data = img.data;
  const base = parseColor(o.colors.base);
  const light = parseColor(o.colors.light);
  const dark = parseColor(o.colors.dark);
  const cells = Math.max(1, Math.round(o.cells ?? 4));
  const contrast = o.contrast ?? 1;
  const grain = o.grain ?? 0.35;
  const octaves = o.octaves ?? 4;
  for (let y = 0; y < px; y++) {
    for (let x = 0; x < px; x++) {
      const u = x / px;
      const v = y / px;
      let n = tileFbm(u, v, cells, o.seed, octaves);
      if (grain > 0) n += (tileFbm(u, v, cells * 8, o.seed + 77, 2) - 0.5) * grain;
      const t = Math.max(-1, Math.min(1, (n - 0.5) * 3.2 * contrast));
      const to = t >= 0 ? light : dark;
      const k = Math.abs(t);
      const i = (y * px + x) * 4;
      data[i] = base[0] + (to[0] - base[0]) * k;
      data[i + 1] = base[1] + (to[1] - base[1]) * k;
      data[i + 2] = base[2] + (to[2] - base[2]) * k;
      data[i + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(scratch, 0, 0, size, size);
  ctx.restore();
}

export interface TickOptions {
  count: number;
  color: string;
  /** Length range in tile px. */
  length: readonly [number, number];
  width?: number;
  /** Main direction in radians; `spread` is the random deviation. */
  angle?: number;
  spread?: number;
  alpha?: number;
}

/** Many short pen ticks (grass blades, fur, scrub). */
export function ticks(ctx: Ctx2D, size: number, rand: Rng, o: TickOptions): void {
  ctx.save();
  ctx.strokeStyle = o.color;
  ctx.lineWidth = o.width ?? 1;
  ctx.lineCap = 'round';
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  const angle = o.angle ?? -Math.PI / 2;
  const spread = o.spread ?? 0.6;
  ctx.beginPath();
  for (let i = 0; i < o.count; i++) {
    const x = rand.range(0, size);
    const y = rand.range(0, size);
    const len = rand.range(o.length[0], o.length[1]);
    const a = angle + rand.range(-spread, spread);
    wrapped(size, x, y, len, (px, py) => {
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len);
    });
  }
  ctx.stroke();
  ctx.restore();
}

export interface SpeckleOptions {
  count: number;
  color: string;
  radius: readonly [number, number];
  alpha?: number;
}

/** Tiny round dots (pebbles, sand grains, snow sparkle). */
export function speckles(ctx: Ctx2D, size: number, rand: Rng, o: SpeckleOptions): void {
  ctx.save();
  ctx.fillStyle = o.color;
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.beginPath();
  for (let i = 0; i < o.count; i++) {
    const x = rand.range(0, size);
    const y = rand.range(0, size);
    const r = rand.range(o.radius[0], o.radius[1]);
    wrapped(size, x, y, r, (px, py) => {
      ctx.moveTo(px + r, py);
      ctx.arc(px, py, r, 0, TAU);
    });
  }
  ctx.fill();
  ctx.restore();
}

export interface BlotchOptions {
  count: number;
  color: string;
  radius: readonly [number, number];
  alpha: number;
  /** Squash factor on the y radius (1 = round). */
  squash?: number;
}

/** Soft translucent patches that break up flat color (mud, moss, bleaching). */
export function blotches(ctx: Ctx2D, size: number, rand: Rng, o: BlotchOptions): void {
  const squash = o.squash ?? 1;
  for (let i = 0; i < o.count; i++) {
    const x = rand.range(0, size);
    const y = rand.range(0, size);
    const r = rand.range(o.radius[0], o.radius[1]);
    wrapped(size, x, y, r, (px, py) => {
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(1, squash);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, rgba(o.color, o.alpha));
      g.addColorStop(1, rgba(o.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.fill();
      ctx.restore();
    });
  }
}

export interface WaveOptions {
  count: number;
  color: string;
  width?: number;
  amplitude: number;
  wavelength: number;
  /** Length of each wavy line in tile px. */
  length: readonly [number, number];
  alpha?: number;
  angle?: number;
}

/** Short wavy strokes (dunes, ripples, swamp water). */
export function waves(ctx: Ctx2D, size: number, rand: Rng, o: WaveOptions): void {
  ctx.save();
  ctx.strokeStyle = o.color;
  ctx.lineWidth = o.width ?? 1.2;
  ctx.lineCap = 'round';
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  const angle = o.angle ?? 0;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  for (let i = 0; i < o.count; i++) {
    const x = rand.range(0, size);
    const y = rand.range(0, size);
    const len = rand.range(o.length[0], o.length[1]);
    const phase = rand.range(0, TAU);
    wrapped(size, x, y, len, (px, py) => {
      ctx.beginPath();
      for (let s = 0; s <= len; s += 2) {
        const off = Math.sin((s / o.wavelength) * TAU + phase) * o.amplitude;
        const lx = s - len / 2;
        const X = px + lx * ca - off * sa;
        const Y = py + lx * sa + off * ca;
        if (s === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      }
      ctx.stroke();
    });
  }
  ctx.restore();
}

/** Tint helper so terrain files can derive tile accents from their three palette colors. */
export function accent(colors: TerrainColors, toward: string, amount: number): string {
  return mix(colors.base, toward, amount);
}
