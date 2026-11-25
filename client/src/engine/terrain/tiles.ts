import { combineSeed, context2d, createCanvas, createRng, gradePixels, isIdentityGrade } from '@wondermap/illustrations/kit';
import type { MapTheme, ResolvedTerrain } from '@wondermap/illustrations';

/**
 * Terrain tiles: each terrain paints one seamless tile, graded by the theme, then repeated as a pattern.
 * `res` is bitmap pixels per map pixel; it is clamped so a tile never gets huge.
 */

const cache = new Map<string, HTMLCanvasElement>();

export function tileResolution(pixelScale: number): number {
  return pixelScale <= 0.5 ? 0.5 : pixelScale <= 1 ? 1 : 2;
}

export function getTerrainTile(def: ResolvedTerrain, theme: MapTheme, res: number): HTMLCanvasElement {
  const key = `${def.id}|${theme.id}|${res}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const px = Math.round(def.tileSize * res);
  const canvas = createCanvas(px, px);
  const grade = !isIdentityGrade(theme.grade);
  const ctx = context2d(canvas, grade);
  ctx.scale(px / def.tileSize, px / def.tileSize);
  const seed = combineSeed('terrain', def.id);
  def.texture({ ctx, size: def.tileSize, rand: createRng(seed), seed, colors: def.colors });
  if (grade) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const img = ctx.getImageData(0, 0, px, px);
    gradePixels(img.data, theme.grade);
    ctx.putImageData(img, 0, 0);
  }
  cache.set(key, canvas);
  return canvas;
}

export function clearTerrainTiles(): void {
  cache.clear();
  dataCache.clear();
}

export interface TileData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  /** Bitmap pixels per map pixel. */
  res: number;
}

const dataCache = new Map<string, TileData>();

/** Pixel data of a terrain tile, for the CPU terrain painter. */
export function getTerrainTileData(def: ResolvedTerrain, theme: MapTheme, res: number): TileData {
  const key = `${def.id}|${theme.id}|${res}`;
  const hit = dataCache.get(key);
  if (hit) return hit;
  const canvas = getTerrainTile(def, theme, res);
  const ctx = context2d(canvas, true);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const tile: TileData = { data: img.data, width: canvas.width, height: canvas.height, res };
  dataCache.set(key, tile);
  return tile;
}
