import type { Rect, TerrainLayer } from '../../model/types';

/**
 * Blurred copies of the terrain grid. The renderer samples these (bilinearly) to get smooth coastlines,
 * shallow water, beaches and soft transitions between terrains from a coarse 4 px grid.
 *
 * All arrays are Uint8 (0..255 = 0..1). Updates are incremental: only the changed region is re-blurred.
 */

export interface BlurSpec {
  radius: number;
  passes: number;
}

export const BLUR = {
  /** Smooths the coast line itself. */
  coast: { radius: 1, passes: 2 },
  /** Distance-to-coast on land: inner shade and beaches. */
  mid: { radius: 3, passes: 2 },
  /** Distance-to-coast in the sea: shallows and ripples. */
  big: { radius: 7, passes: 2 },
  /** Transition between two land terrains. */
  weight: { radius: 2, passes: 2 },
} as const satisfies Record<string, BlurSpec>;

/** How far (in cells) a changed cell can influence the blurred fields. */
export const FIELD_REACH = Math.max(...Object.values(BLUR).map((b) => b.radius * b.passes)) + 2;

export class TerrainFields {
  cols = 0;
  rows = 0;
  coast = new Uint8Array(0);
  mid = new Uint8Array(0);
  big = new Uint8Array(0);
  /** Blurred indicator of every terrain value present in the map. */
  weights = new Map<number, Uint8Array>();

  private bufA = new Float32Array(0);
  private bufB = new Float32Array(0);

  /** Rebuilds everything from scratch (also handles a changed map size). */
  rebuild(layer: TerrainLayer): void {
    this.cols = layer.cols;
    this.rows = layer.rows;
    const n = layer.cols * layer.rows;
    this.coast = new Uint8Array(n);
    this.mid = new Uint8Array(n);
    this.big = new Uint8Array(n);
    this.weights = new Map();
    this.update(layer, { x0: 0, y0: 0, x1: layer.cols, y1: layer.rows });
  }

  /** Refreshes all fields for cells that changed inside `changed` (cell units, max exclusive). */
  update(layer: TerrainLayer, changed: Rect): void {
    const land = (v: number) => (v !== 0 ? 255 : 0);
    this.blur(layer, land, BLUR.coast, changed, this.coast);
    this.blur(layer, land, BLUR.mid, changed, this.mid);
    this.blur(layer, land, BLUR.big, changed, this.big);

    // Terrains that are new in the changed region need an (all-zero) array first; they cannot exist elsewhere.
    const present = new Set<number>();
    const { cols, data } = layer;
    for (let y = changed.y0; y < changed.y1; y++) {
      for (let x = changed.x0; x < changed.x1; x++) present.add(data[y * cols + x]!);
    }
    for (const v of present) {
      if (v > 0 && !this.weights.has(v)) this.weights.set(v, new Uint8Array(layer.cols * layer.rows));
    }
    for (const [v, out] of this.weights) this.blur(layer, (c) => (c === v ? 255 : 0), BLUR.weight, changed, out);
  }

  /** Terrain values that currently have any weight (used to skip empty terrains). */
  values(): number[] {
    return [...this.weights.keys()].sort((a, b) => a - b);
  }

  private blur(layer: TerrainLayer, indicator: (v: number) => number, spec: BlurSpec, changed: Rect, out: Uint8Array): void {
    const reach = spec.radius * spec.passes;
    const { cols, rows, data } = layer;
    // Output region that may change, and the (larger) window we blur to get it exactly right.
    const ox0 = Math.max(0, changed.x0 - reach);
    const oy0 = Math.max(0, changed.y0 - reach);
    const ox1 = Math.min(cols, changed.x1 + reach);
    const oy1 = Math.min(rows, changed.y1 + reach);
    if (ox1 <= ox0 || oy1 <= oy0) return;
    const wx0 = ox0 - reach;
    const wy0 = oy0 - reach;
    const w = ox1 - ox0 + reach * 2;
    const h = oy1 - oy0 + reach * 2;
    if (this.bufA.length < w * h) {
      this.bufA = new Float32Array(w * h);
      this.bufB = new Float32Array(w * h);
    }
    let a = this.bufA;
    let b = this.bufB;

    // Edge cells are replicated so land running off the map edge does not create a coast there.
    for (let y = 0; y < h; y++) {
      const sy = Math.min(rows - 1, Math.max(0, wy0 + y));
      const row = sy * cols;
      for (let x = 0; x < w; x++) {
        const sx = Math.min(cols - 1, Math.max(0, wx0 + x));
        a[y * w + x] = indicator(data[row + sx]!);
      }
    }

    for (let p = 0; p < spec.passes; p++) {
      boxBlurRows(a, b, w, h, spec.radius);
      boxBlurCols(b, a, w, h, spec.radius);
    }

    for (let y = oy0; y < oy1; y++) {
      for (let x = ox0; x < ox1; x++) {
        out[y * cols + x] = Math.round(a[(y - wy0) * w + (x - wx0)]!);
      }
    }
  }
}

function boxBlurRows(src: Float32Array, dst: Float32Array, w: number, h: number, r: number): void {
  const inv = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += src[row + Math.min(w - 1, Math.max(0, i))]!;
    for (let x = 0; x < w; x++) {
      dst[row + x] = sum * inv;
      sum += src[row + Math.min(w - 1, x + r + 1)]! - src[row + Math.max(0, x - r)]!;
    }
  }
}

function boxBlurCols(src: Float32Array, dst: Float32Array, w: number, h: number, r: number): void {
  const inv = 1 / (2 * r + 1);
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += src[Math.min(h - 1, Math.max(0, i)) * w + x]!;
    for (let y = 0; y < h; y++) {
      dst[y * w + x] = sum * inv;
      sum += src[Math.min(h - 1, y + r + 1) * w + x]! - src[Math.max(0, y - r) * w + x]!;
    }
  }
}

/** Bounding box (cells, max exclusive) of the cells that differ between two equally sized arrays, or `null`. */
export function diffRect(a: Uint8Array, b: Uint8Array, cols: number, rows: number): Rect | null {
  let x0 = cols;
  let y0 = rows;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < rows; y++) {
    const row = y * cols;
    for (let x = 0; x < cols; x++) {
      if (a[row + x] !== b[row + x]) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}
