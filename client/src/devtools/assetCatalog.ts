import { DEFAULT_THEME_ID, brushes, fontList, frames, labelStyles, pathStyles, symbolById, symbols, terrains, themes } from '@wondermap/illustrations';
import type { MapTheme } from '@wondermap/illustrations';

/**
 * The list of pictures that make up ASSETS.md, and where each one is stored.
 * Pure data (no drawing), so tests and the Markdown writer can use it without a browser.
 */

export type AssetKind = 'terrain' | 'symbol' | 'brush' | 'path' | 'label' | 'font' | 'theme' | 'frame';

export interface AssetEntry {
  kind: AssetKind;
  /** Id in the illustrations catalog. */
  id: string;
  /** Frames are shown once per theme, so they also carry the theme they are drawn with. */
  themeId?: string;
}

/** Where the pictures live, relative to the repository root. */
export const ASSETS_DIR = 'docs/assets';

export const IMAGE = { ext: 'webp', mime: 'image/webp', quality: 0.9 } as const;

/** Bitmap pixels per CSS pixel in the files: sharp on high-density screens, still small. */
export const PIXEL_RATIO = 2;

/** Width (CSS px) at which each kind of picture is shown in ASSETS.md. */
export const DISPLAY_WIDTH: Record<AssetKind, number> = {
  terrain: 270,
  symbol: 128,
  brush: 270,
  path: 270,
  label: 270,
  font: 270,
  theme: 400,
  frame: 300,
};

const FOLDER: Record<Exclude<AssetKind, 'symbol'>, string> = {
  terrain: 'terrains',
  brush: 'brushes',
  path: 'paths',
  label: 'labels',
  font: 'fonts',
  theme: 'themes',
  frame: 'frames',
};

/** The default theme comes first everywhere, so the pictures lead with what new maps look like. */
export const orderedThemes: readonly MapTheme[] = [...themes].sort((a, b) => Number(b.id === DEFAULT_THEME_ID) - Number(a.id === DEFAULT_THEME_ID));

/** Every picture, in the order of the catalog. */
export function listAssets(): AssetEntry[] {
  return [
    ...terrains.map((t): AssetEntry => ({ kind: 'terrain', id: t.id })),
    ...symbols.map((s): AssetEntry => ({ kind: 'symbol', id: s.id })),
    ...brushes.map((b): AssetEntry => ({ kind: 'brush', id: b.id })),
    ...pathStyles.map((p): AssetEntry => ({ kind: 'path', id: p.id })),
    ...labelStyles.map((l): AssetEntry => ({ kind: 'label', id: l.id })),
    ...fontList.map((f): AssetEntry => ({ kind: 'font', id: f.id })),
    ...orderedThemes.map((t): AssetEntry => ({ kind: 'theme', id: t.id })),
    ...orderedThemes.flatMap((t) => frames.map((f): AssetEntry => ({ kind: 'frame', id: f.id, themeId: t.id }))),
  ];
}

/** Path of the picture, relative to the repository root and always with forward slashes. */
export function assetFile(entry: AssetEntry): string {
  const folder = entry.kind === 'symbol' ? `symbols/${symbolById.get(entry.id)?.category ?? 'unknown'}` : FOLDER[entry.kind];
  const name = entry.themeId ? `${entry.themeId}-${entry.id}` : entry.id;
  return `${ASSETS_DIR}/${folder}/${name}.${IMAGE.ext}`;
}
