import { ensureFonts, getTheme } from '@wondermap/illustrations';
import { LIMITS } from '../model/types';
import type { MapDocument } from '../model/types';
import { fileSlug } from '../utils/files';
import { drawFinish, drawObjects } from './scene';
import { TerrainRenderer } from './terrain/TerrainRenderer';

/** Image export: renders the whole map offscreen with exactly the same drawing code as the editor view. */

export type ExportFormat = 'png' | 'jpeg' | 'webp';

export interface ExportOptions {
  /** Bitmap pixels per map pixel (multiples of 0.5). */
  scale: number;
  grid?: boolean;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

export const FORMAT_INFO: Record<ExportFormat, { mime: string; ext: string; label: string }> = {
  png: { mime: 'image/png', ext: 'png', label: 'PNG (lossless)' },
  jpeg: { mime: 'image/jpeg', ext: 'jpg', label: 'JPEG (smaller)' },
  webp: { mime: 'image/webp', ext: 'webp', label: 'WebP (small, sharp)' },
};

export function exportSize(doc: Pick<MapDocument, 'width' | 'height'>, scale: number): { width: number; height: number; pixels: number } {
  const width = Math.round(doc.width * scale);
  const height = Math.round(doc.height * scale);
  return { width, height, pixels: width * height };
}

/** The largest export scale (a multiple of 0.5, at most 4) that stays within the pixel limit. */
export function maxExportScale(doc: Pick<MapDocument, 'width' | 'height'>): number {
  let best = 0.5;
  for (let s = 0.5; s <= 4; s += 0.5) if (exportSize(doc, s).pixels <= LIMITS.maxExportPixels) best = s;
  return best;
}

export async function renderMapToCanvas(doc: MapDocument, o: ExportOptions): Promise<HTMLCanvasElement> {
  const { width, height, pixels } = exportSize(doc, o.scale);
  if (pixels > LIMITS.maxExportPixels) {
    throw new Error(`The image would have ${(pixels / 1e6).toFixed(0)} megapixels; the limit is ${LIMITS.maxExportPixels / 1e6}. Choose a smaller scale.`);
  }
  await ensureFonts();
  const theme = getTheme(doc.themeId);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser could not create a canvas of that size. Try a smaller scale.');

  const terrain = new TerrainRenderer();
  try {
    terrain.sync({ layer: doc.terrain, settings: doc.settings, theme, seed: doc.seed });
    // Terrain takes nearly all of the time, so it reports 0..0.9 and the finishing touches the rest.
    await terrain.renderTo(ctx, o.scale, (f) => o.onProgress?.(f * 0.9), o.signal);
    if (o.signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
    ctx.setTransform(o.scale, 0, 0, o.scale, 0, 0);
    const scene = { view: { x0: 0, y0: 0, x1: doc.width, y1: doc.height }, pixelScale: o.scale, grid: o.grid ?? false };
    drawObjects(ctx, doc, theme, scene);
    drawFinish(ctx, doc, theme, scene);
    o.onProgress?.(1);
  } finally {
    terrain.dispose();
  }
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, format: ExportFormat, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The browser could not encode the image. Try a smaller scale or another format.'))),
      FORMAT_INFO[format].mime,
      quality,
    );
  });
}

export async function exportMapBlob(doc: MapDocument, format: ExportFormat, o: ExportOptions & { quality?: number }): Promise<Blob> {
  const canvas = await renderMapToCanvas(doc, o);
  const blob = await toBlob(canvas, format, o.quality ?? 0.92);
  canvas.width = canvas.height = 0;
  return blob;
}

/** Small JPEG picture of the map for the library. */
export async function renderThumbnail(doc: MapDocument, maxWidth = 360): Promise<string> {
  const full = await renderMapToCanvas(doc, { scale: 0.5 });
  const ratio = Math.min(1, maxWidth / full.width);
  const thumb = document.createElement('canvas');
  thumb.width = Math.max(1, Math.round(full.width * ratio));
  thumb.height = Math.max(1, Math.round(full.height * ratio));
  const ctx = thumb.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(full, 0, 0, thumb.width, thumb.height);
  full.width = full.height = 0;
  return thumb.toDataURL('image/jpeg', 0.8);
}

export function exportFileName(doc: Pick<MapDocument, 'name'>, format: ExportFormat): string {
  return `${fileSlug(doc.name)}.${FORMAT_INFO[format].ext}`;
}
