import { valueNoise } from '@wondermap/illustrations/kit';
import { CELL, type Point, type Rect, type TerrainLayer } from './types';

/** Pure helpers for the terrain grid: create, paint, expand and (de)serialize. */

export type BrushMode = 'paint' | 'recolor' | 'erase';

export function createTerrainLayer(width: number, height: number, cell = CELL): TerrainLayer {
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  return { cell, cols, rows, ids: [], data: new Uint8Array(cols * rows), rev: 0 };
}

/** Copy with its own data array (used when a gesture starts, so older snapshots stay untouched). */
export function cloneTerrainLayer(layer: TerrainLayer): TerrainLayer {
  return { ...layer, data: layer.data.slice(), rev: layer.rev + 1 };
}

/** Value used in `data` for a terrain id, or -1 when the layer does not use it yet. */
export function valueOfTerrain(layer: TerrainLayer, id: string): number {
  const idx = layer.ids.indexOf(id);
  return idx < 0 ? -1 : idx + 1;
}

/** Returns the layer and the cell value for `id`, registering the id when it is new (data is shared). */
export function withTerrainId(layer: TerrainLayer, id: string): { layer: TerrainLayer; value: number } {
  const found = valueOfTerrain(layer, id);
  if (found > 0) return { layer, value: found };
  if (layer.ids.length >= 250) throw new Error('Too many different terrains in one map');
  return { layer: { ...layer, ids: [...layer.ids, id] }, value: layer.ids.length + 1 };
}

export interface StrokeOptions {
  points: readonly Point[];
  /** Brush radius in map px. */
  radius: number;
  value: number;
  mode: BrushMode;
  /** Edge irregularity, 0..1. */
  roughness?: number;
  seed?: number;
}

/**
 * Paints a stroke into `layer.data` IN PLACE and bumps `rev`.
 * The stroke is a capsule chain; the radius is modulated by world-space noise so overlapping strokes share one natural edge.
 * Returns the touched cell rectangle (exclusive max) or `null` when nothing changed.
 */
export function paintStroke(layer: TerrainLayer, o: StrokeOptions): Rect | null {
  const { cell, cols, rows, data } = layer;
  const rough = o.roughness ?? 0.5;
  const seed = o.seed ?? 0;
  const pts = o.points.length === 1 ? [o.points[0]!, o.points[0]!] : o.points;
  const amp = 0.28 * rough;
  let minX = cols;
  let minY = rows;
  let maxX = -1;
  let maxY = -1;
  const target = o.mode === 'erase' ? 0 : o.value;

  for (let s = 0; s + 1 < pts.length; s++) {
    const a = pts[s]!;
    const b = pts[s + 1]!;
    const reach = o.radius * (1 + amp) + cell;
    const cx0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - reach) / cell));
    const cx1 = Math.min(cols - 1, Math.ceil((Math.max(a[0], b[0]) + reach) / cell));
    const cy0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - reach) / cell));
    const cy1 = Math.min(rows - 1, Math.ceil((Math.max(a[1], b[1]) + reach) / cell));
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;

    for (let cy = cy0; cy <= cy1; cy++) {
      const py = (cy + 0.5) * cell;
      for (let cx = cx0; cx <= cx1; cx++) {
        const px = (cx + 0.5) * cell;
        const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / len2)) : 0;
        const ex = px - (a[0] + dx * t);
        const ey = py - (a[1] + dy * t);
        const d2 = ex * ex + ey * ey;
        const edge = amp > 0 ? o.radius * (1 + (valueNoise(px / 26, py / 26, seed) - 0.5) * 2 * amp) : o.radius;
        if (d2 > edge * edge) continue;
        const i = cy * cols + cx;
        const before = data[i]!;
        if (before === target) continue;
        if (o.mode === 'recolor' && before === 0) continue;
        data[i] = target;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
      }
    }
  }

  if (maxX < 0) return null;
  layer.rev++;
  return { x0: minX, y0: minY, x1: maxX + 1, y1: maxY + 1 };
}

/** Fills the whole layer with one value (or the sea when 0) IN PLACE. */
export function fillTerrain(layer: TerrainLayer, value: number, onlyLand = false): void {
  const { data } = layer;
  if (onlyLand) {
    for (let i = 0; i < data.length; i++) if (data[i] !== 0) data[i] = value;
  } else {
    data.fill(value);
  }
  layer.rev++;
}

/** Grows (or crops, with negative numbers) the layer. Amounts are map px and must be multiples of the cell size. */
export function expandTerrainLayer(layer: TerrainLayer, d: { left: number; top: number; right: number; bottom: number }): TerrainLayer {
  const { cell } = layer;
  const l = Math.round(d.left / cell);
  const t = Math.round(d.top / cell);
  const cols = layer.cols + l + Math.round(d.right / cell);
  const rows = layer.rows + t + Math.round(d.bottom / cell);
  const data = new Uint8Array(cols * rows);
  for (let y = 0; y < layer.rows; y++) {
    const ny = y + t;
    if (ny < 0 || ny >= rows) continue;
    const x0 = Math.max(0, -l);
    const x1 = Math.min(layer.cols, cols - l);
    if (x1 <= x0) continue;
    data.set(layer.data.subarray(y * layer.cols + x0, y * layer.cols + x1), ny * cols + x0 + l);
  }
  return { cell, cols, rows, ids: layer.ids, data, rev: layer.rev + 1 };
}

/** Terrain id under a map position, or `null` for the sea / outside the map. */
export function terrainAt(layer: TerrainLayer, x: number, y: number): string | null {
  const cx = Math.floor(x / layer.cell);
  const cy = Math.floor(y / layer.cell);
  if (cx < 0 || cy < 0 || cx >= layer.cols || cy >= layer.rows) return null;
  const v = layer.data[cy * layer.cols + cx]!;
  return v === 0 ? null : (layer.ids[v - 1] ?? null);
}

/** Share of land cells (0..1). */
export function landRatio(layer: TerrainLayer): number {
  let n = 0;
  for (let i = 0; i < layer.data.length; i++) if (layer.data[i] !== 0) n++;
  return layer.data.length ? n / layer.data.length : 0;
}

/** Drops ids that no cell uses and renumbers the data (keeps saved files small and tidy). */
export function compactTerrainIds(layer: TerrainLayer): TerrainLayer {
  const used = new Uint8Array(layer.ids.length + 1);
  for (let i = 0; i < layer.data.length; i++) used[layer.data[i]!] = 1;
  if (layer.ids.every((_, i) => used[i + 1])) return layer;
  const remap = new Uint8Array(layer.ids.length + 1);
  const ids: string[] = [];
  layer.ids.forEach((id, i) => {
    if (used[i + 1]) {
      ids.push(id);
      remap[i + 1] = ids.length;
    }
  });
  const data = new Uint8Array(layer.data.length);
  for (let i = 0; i < data.length; i++) data[i] = remap[layer.data[i]!]!;
  return { ...layer, ids, data, rev: layer.rev + 1 };
}

/* ------------------------------------------------------------------------------------------- */
/* Serialization: run-length encoding keeps a mostly-empty 3200x2000 map around a few KB.       */
/* ------------------------------------------------------------------------------------------- */

export function encodeRle(data: Uint8Array): string {
  const bytes: number[] = [];
  let i = 0;
  while (i < data.length) {
    const v = data[i]!;
    let run = 1;
    while (i + run < data.length && data[i + run] === v) run++;
    bytes.push(v);
    let n = run;
    while (n >= 0x80) {
      bytes.push((n & 0x7f) | 0x80);
      n >>>= 7;
    }
    bytes.push(n);
    i += run;
  }
  let binary = '';
  const chunk = 0x8000;
  for (let o = 0; o < bytes.length; o += chunk) binary += String.fromCharCode(...bytes.slice(o, o + chunk));
  return btoa(binary);
}

export function decodeRle(text: string, length: number): Uint8Array {
  const binary = atob(text);
  const out = new Uint8Array(length);
  let p = 0;
  let i = 0;
  while (i < binary.length && p < length) {
    const v = binary.charCodeAt(i++);
    let run = 0;
    let shift = 0;
    for (;;) {
      const b = binary.charCodeAt(i++);
      run |= (b & 0x7f) << shift;
      if (b < 0x80) break;
      shift += 7;
    }
    out.fill(v, p, Math.min(length, p + run));
    p += run;
  }
  return out;
}
