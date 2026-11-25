import { context2d, createCanvas } from '@wondermap/illustrations/kit';
import { terrainById, terrains as allTerrains } from '@wondermap/illustrations';
import type { MapTheme, ResolvedTerrain } from '@wondermap/illustrations';
import { CELL } from '../../model/types';
import type { MapSettings, Rect, TerrainLayer } from '../../model/types';
import { CHUNK, createJob, makePaintStyle, paintRows, releaseImage } from './chunkPainter';
import type { ChunkTerrain, PaintJob, PaintStyle } from './chunkPainter';
import { FIELD_REACH, TerrainFields, diffRect } from './fields';
import { getTerrainTileData, tileResolution } from './tiles';

/**
 * Turns the terrain grid into pictures. The map is cut into square chunks that are painted lazily, a few rows at a
 * time, so the editor never freezes: edits only repaint the chunks they touch, and stale pictures are shown until the
 * fresh ones are ready.
 */

export interface TerrainSource {
  layer: TerrainLayer;
  settings: MapSettings;
  theme: MapTheme;
  seed: number;
}

interface Entry {
  canvas: HTMLCanvasElement;
  level: number;
  /** Epoch at which painting of this picture started. */
  version: number;
  used: number;
}

interface Wanted {
  cx: number;
  cy: number;
  level: number;
}

interface ActiveJob extends Wanted {
  job: PaintJob;
  version: number;
}

const LEVELS = [0.5, 1, 2, 4];
/** Pixels kept in chunk pictures before the least recently used ones are dropped. */
const PIXEL_BUDGET = 40_000_000;
/** Extra cells around a change that need repainting (blur reach + the shifted shadow). */
const DIRTY_MARGIN = FIELD_REACH + 2;
const ROWS_PER_BAND = 8;

/** Chunk resolution (bitmap px per map px) for a given screen scale; allows slight upscaling. */
export function chunkLevel(pixelScale: number): number {
  for (const level of LEVELS) if (level >= pixelScale / 1.25) return level;
  return LEVELS[LEVELS.length - 1]!;
}

export class TerrainRenderer {
  private readonly fields = new TerrainFields();
  private layer: TerrainLayer | null = null;
  private shadow = new Uint8Array(0);
  private shadowIds: string[] = [];
  private theme: MapTheme | null = null;
  private settings: MapSettings | null = null;
  private seed = 0;
  private style: PaintStyle | null = null;

  private epoch = 1;
  private changedAt = new Uint32Array(0);
  private nx = 0;
  private ny = 0;

  private readonly entries = new Map<string, Entry>();
  private pixels = 0;
  private frame = 0;
  private wanted: Wanted[] = [];
  private active: ActiveJob | null = null;
  private bumped = 0;
  private syncedRev = -1;

  /** Increases whenever any chunk picture changes; the view redraws when it moves. */
  get revision(): number {
    return this.bumped;
  }

  /** Brings the renderer up to date with the document's terrain. Cheap when nothing changed. */
  sync(src: TerrainSource): void {
    const { layer, theme, settings, seed } = src;
    const styleChanged =
      theme !== this.theme || seed !== this.seed || !this.settings || settings.beaches !== this.settings.beaches || settings.shallows !== this.settings.shallows || settings.roughness !== this.settings.roughness;
    // Editing tools bump `rev` for every in-place change, so an unchanged grid needs no comparison at all.
    if (!styleChanged && layer === this.layer && layer.rev === this.syncedRev) return;
    this.syncedRev = layer.rev;
    const sameShape = this.layer && this.layer.cols === layer.cols && this.layer.rows === layer.rows && this.shadow.length === layer.data.length;
    const paletteKept = sameShape && this.shadowIds.length <= layer.ids.length && this.shadowIds.every((id, i) => layer.ids[i] === id);

    this.layer = layer;
    if (styleChanged || !paletteKept) {
      this.theme = theme;
      this.settings = { ...settings };
      this.seed = seed;
      this.style = makePaintStyle(theme, settings, seed);
      this.rebuildAll(layer);
      return;
    }
    // The grid is edited in place; compare with our own copy to find what changed.
    const diff = diffRect(this.shadow, layer.data, layer.cols, layer.rows);
    this.shadowIds = layer.ids.slice();
    if (!diff) return;
    this.fields.update(layer, diff);
    for (let y = diff.y0; y < diff.y1; y++) {
      const row = y * layer.cols;
      this.shadow.set(layer.data.subarray(row + diff.x0, row + diff.x1), row + diff.x0);
    }
    this.epoch++;
    const c0x = Math.max(0, Math.floor(((diff.x0 - DIRTY_MARGIN) * CELL) / CHUNK));
    const c0y = Math.max(0, Math.floor(((diff.y0 - DIRTY_MARGIN) * CELL) / CHUNK));
    const c1x = Math.min(this.nx - 1, Math.floor(((diff.x1 + DIRTY_MARGIN) * CELL) / CHUNK));
    const c1y = Math.min(this.ny - 1, Math.floor(((diff.y1 + DIRTY_MARGIN) * CELL) / CHUNK));
    for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) this.changedAt[cy * this.nx + cx] = this.epoch;
  }

  private rebuildAll(layer: TerrainLayer): void {
    this.fields.rebuild(layer);
    this.shadow = layer.data.slice();
    this.shadowIds = layer.ids.slice();
    this.nx = Math.ceil((layer.cols * CELL) / CHUNK);
    this.ny = Math.ceil((layer.rows * CELL) / CHUNK);
    this.epoch++;
    this.changedAt = new Uint32Array(this.nx * this.ny).fill(this.epoch);
    this.cancelActive();
  }

  private cancelActive(): void {
    if (this.active) {
      releaseImage(this.active.job.img);
      this.active = null;
    }
  }

  private key(level: number, cx: number, cy: number): string {
    return `${level}|${cx},${cy}`;
  }

  private isFresh(entry: Entry, cx: number, cy: number): boolean {
    return entry.version >= (this.changedAt[cy * this.nx + cx] ?? 0);
  }

  /**
   * Draws the terrain that overlaps `view` (map px). `ctx` must already be transformed to map space.
   * Returns how many chunks are still waiting for a fresh picture.
   */
  draw(ctx: CanvasRenderingContext2D, view: Rect, pixelScale: number): number {
    if (!this.layer) return 0;
    this.frame++;
    const level = chunkLevel(pixelScale);
    const cx0 = Math.max(0, Math.floor(view.x0 / CHUNK));
    const cy0 = Math.max(0, Math.floor(view.y0 / CHUNK));
    const cx1 = Math.min(this.nx - 1, Math.floor(view.x1 / CHUNK));
    const cy1 = Math.min(this.ny - 1, Math.floor(view.y1 / CHUNK));
    const midX = (view.x0 + view.x1) / 2;
    const midY = (view.y0 + view.y1) / 2;
    const wanted: Array<Wanted & { d: number }> = [];
    // Slight overlap hides hairline seams between neighbouring pictures.
    const seam = 1 / pixelScale;
    let pending = 0;

    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        let entry = this.entries.get(this.key(level, cx, cy));
        if (entry) entry.used = this.frame;
        if (!entry || !this.isFresh(entry, cx, cy)) {
          pending++;
          const dx = cx * CHUNK + CHUNK / 2 - midX;
          const dy = cy * CHUNK + CHUNK / 2 - midY;
          wanted.push({ cx, cy, level, d: dx * dx + dy * dy });
          if (!entry) entry = this.fallback(level, cx, cy);
        }
        if (entry) {
          entry.used = this.frame;
          ctx.drawImage(entry.canvas, cx * CHUNK, cy * CHUNK, CHUNK + seam, CHUNK + seam);
        }
      }
    }
    wanted.sort((a, b) => a.d - b.d);
    this.wanted = wanted;
    return pending;
  }

  /** Any picture of this chunk at another resolution, preferring a fresh one close to `level`. */
  private fallback(level: number, cx: number, cy: number): Entry | undefined {
    let best: Entry | undefined;
    let bestScore = Infinity;
    for (const other of LEVELS) {
      if (other === level) continue;
      const entry = this.entries.get(this.key(other, cx, cy));
      if (!entry) continue;
      const score = Math.abs(Math.log2(other / level)) + (this.isFresh(entry, cx, cy) ? 0 : 10);
      if (score < bestScore) {
        best = entry;
        bestScore = score;
      }
    }
    return best;
  }

  /** Paints wanted chunks for up to `budgetMs`. Returns `true` if more work is waiting. */
  pump(budgetMs: number): boolean {
    if (!this.layer || !this.style) return false;
    const start = performance.now();
    while (performance.now() - start < budgetMs) {
      if (!this.active && !this.startNext()) return false;
      const active = this.active!;
      if (this.changedAt[active.cy * this.nx + active.cx]! > active.version) {
        // The terrain changed while this chunk was being painted: start over with the new data.
        releaseImage(active.job.img);
        this.active = null;
        continue;
      }
      const done = paintRows(active.job, this.fields, this.style, ROWS_PER_BAND);
      if (done) this.finish(active);
    }
    return this.active !== null || this.wanted.some((w) => this.needs(w));
  }

  private needs(w: Wanted): boolean {
    const entry = this.entries.get(this.key(w.level, w.cx, w.cy));
    return !entry || !this.isFresh(entry, w.cx, w.cy);
  }

  private startNext(): boolean {
    const next = this.wanted.find((w) => this.needs(w));
    if (!next) return false;
    this.active = { ...next, job: this.makeJob(next.cx, next.cy, next.level), version: this.epoch };
    return true;
  }

  private makeJob(cx: number, cy: number, level: number): PaintJob {
    const layer = this.layer!;
    const theme = this.theme!;
    return createJob(this.fields, this.chunkTerrains(layer, theme, cx, cy, level), this.sandTile(theme, level), cx, cy, level);
  }

  private sandTile(theme: MapTheme, level: number) {
    if (!this.settings?.beaches) return null;
    const sand = terrainById.get('sand');
    return sand ? getTerrainTileData(sand, theme, tileResolution(level)) : null;
  }

  /** The terrains that can influence the pixels of one chunk. */
  private chunkTerrains(layer: TerrainLayer, theme: MapTheme, cx: number, cy: number, level: number): ChunkTerrain[] {
    const per = CHUNK / CELL;
    const m = FIELD_REACH;
    const x0 = Math.max(0, cx * per - m);
    const x1 = Math.min(layer.cols, (cx + 1) * per + m);
    const y0 = Math.max(0, cy * per - m);
    const y1 = Math.min(layer.rows, (cy + 1) * per + m);
    const present = new Set<number>();
    for (let y = y0; y < y1; y++) {
      const row = y * layer.cols;
      for (let x = x0; x < x1; x++) {
        const v = layer.data[row + x]!;
        if (v > 0) present.add(v);
      }
    }
    const res = tileResolution(level);
    const list: ChunkTerrain[] = [];
    for (const v of [...present].sort((a, b) => a - b)) {
      const weights = this.fields.weights.get(v);
      if (!weights) continue;
      const def: ResolvedTerrain = terrainById.get(layer.ids[v - 1] ?? '') ?? allTerrains[0]!;
      list.push({ weights, tile: getTerrainTileData(def, theme, res), beach: def.beach });
    }
    if (list.length === 0) {
      // Only sea (or ground that left the map): `landA` is zero here, but keep the painter's invariants.
      const def = allTerrains[0]!;
      list.push({ weights: new Uint8Array(0), tile: getTerrainTileData(def, theme, res), beach: false });
    }
    return list;
  }

  private finish(active: ActiveJob): void {
    const { cx, cy, level, job, version } = active;
    this.active = null;
    const key = this.key(level, cx, cy);
    let entry = this.entries.get(key);
    if (!entry) {
      const canvas = createCanvas(job.n, job.n);
      entry = { canvas, level, version, used: this.frame };
      this.entries.set(key, entry);
      this.pixels += job.n * job.n;
    }
    context2d(entry.canvas, false).putImageData(job.img, 0, 0);
    entry.version = version;
    entry.used = this.frame;
    releaseImage(job.img);
    this.bumped++;
    this.evict();
  }

  private evict(): void {
    if (this.pixels <= PIXEL_BUDGET) return;
    const sorted = [...this.entries.entries()].sort((a, b) => a[1].used - b[1].used);
    for (const [key, entry] of sorted) {
      if (this.pixels <= PIXEL_BUDGET * 0.85) break;
      if (entry.used >= this.frame - 1) continue;
      this.entries.delete(key);
      this.pixels -= entry.canvas.width * entry.canvas.height;
    }
  }

  /**
   * Paints the whole terrain into `target` (for export) at `scale` bitmap px per map px, bypassing the cache.
   * Yields to the browser between bands so the UI stays alive; `onProgress` gets 0..1.
   */
  async renderTo(target: CanvasRenderingContext2D, scale: number, onProgress?: (fraction: number) => void, signal?: AbortSignal): Promise<void> {
    if (!this.layer || !this.style) return;
    const total = this.nx * this.ny;
    let doneCount = 0;
    let sliceStart = performance.now();
    for (let cy = 0; cy < this.ny; cy++) {
      for (let cx = 0; cx < this.nx; cx++) {
        if (signal?.aborted) return;
        const job = this.makeJob(cx, cy, scale);
        let finished = false;
        while (!finished) {
          finished = paintRows(job, this.fields, this.style, 16);
          if (performance.now() - sliceStart > 24) {
            await new Promise<void>((resolve) => setTimeout(resolve, 0));
            sliceStart = performance.now();
          }
        }
        target.putImageData(job.img, Math.round(cx * CHUNK * scale), Math.round(cy * CHUNK * scale));
        releaseImage(job.img);
        onProgress?.(++doneCount / total);
      }
    }
  }

  dispose(): void {
    this.cancelActive();
    this.entries.clear();
    this.pixels = 0;
  }
}
