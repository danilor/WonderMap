/**
 * The map document: everything that is saved in a `.wondermap.json` file and sent to the server.
 *
 * Documents are treated as immutable: every edit produces a new object (structural sharing keeps this cheap),
 * which gives undo/redo for free. The only deliberate exception is `TerrainLayer.data`, a large byte array that
 * painting tools mutate in place and announce by bumping `rev` (see `engine/terrain`).
 */

export const SCHEMA_VERSION = 1;

/** Terrain is stored on a grid of this many map pixels per cell. All map sizes are multiples of it. */
export const CELL = 4;

export type Point = [x: number, y: number];

export interface TerrainLayer {
  cell: number;
  cols: number;
  rows: number;
  /** Terrain ids used by this layer. A cell value `v > 0` means `ids[v - 1]`; `0` is the sea. */
  ids: readonly string[];
  data: Uint8Array;
  /** Bumped by every in-place change of `data`. */
  rev: number;
}

export interface MapSymbol {
  id: string;
  /** Symbol id from the illustrations catalog. */
  asset: string;
  /** Position of the symbol's anchor point (map px). */
  x: number;
  y: number;
  scale: number;
  /** Radians. */
  rotation: number;
  flip: boolean;
  variant: number;
}

export interface MapPath {
  id: string;
  /** Path style id from the illustrations catalog (river, road…). */
  style: string;
  points: Point[];
  width: number;
}

export interface MapLabel {
  id: string;
  text: string;
  x: number;
  y: number;
  /** Label style id from the illustrations catalog. */
  style: string;
  /** Font size in map px. */
  size: number;
  /** Radians. */
  rotation: number;
  /** -1..1: bends the text along a circular arc (0 = straight). */
  curve: number;
  /** Extra letter spacing in em, added to the style's own spacing. */
  spacing: number;
  /** `null` = use the style / theme color. */
  color: string | null;
}

export interface MapSettings {
  /** Automatically paint a sand beach where land meets the sea. */
  beaches: boolean;
  /** Show the light-blue shallow water and ripples around coasts. */
  shallows: boolean;
  /** 0..1 how jagged the coastline is. */
  roughness: number;
  /** Editor-only helper grid. */
  grid: boolean;
  gridSize: number;
}

export interface MapDocument {
  schema: typeof SCHEMA_VERSION;
  id: string;
  name: string;
  kind: 'world';
  width: number;
  height: number;
  themeId: string;
  frameId: string;
  /** Drives the coastline noise so the same map always renders the same. */
  seed: number;
  settings: MapSettings;
  terrain: TerrainLayer;
  paths: MapPath[];
  symbols: MapSymbol[];
  labels: MapLabel[];
  createdAt: string;
  updatedAt: string;
}

export type ItemKind = 'symbol' | 'path' | 'label';

export interface ItemRef {
  kind: ItemKind;
  id: string;
}

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const DEFAULT_SETTINGS: MapSettings = {
  beaches: true,
  shallows: true,
  roughness: 0.5,
  grid: false,
  gridSize: 100,
};

export const LIMITS = {
  minSize: 400,
  /** Largest side of a map in px. */
  maxSize: 10000,
  /** Largest map area in px². */
  maxArea: 40_000_000,
  maxExportPixels: 64_000_000,
  historyDepth: 100,
  /** Soft cap for the memory held by undo snapshots of the terrain. */
  historyBytes: 160_000_000,
} as const;

export const MAP_PRESETS: readonly { id: string; name: string; width: number; height: number }[] = [
  { id: 'region', name: 'Region (2400 × 1600)', width: 2400, height: 1600 },
  { id: 'world', name: 'World (3200 × 2000)', width: 3200, height: 2000 },
  { id: 'continent', name: 'Continent (4800 × 3200)', width: 4800, height: 3200 },
  { id: 'square', name: 'Square (2800 × 2800)', width: 2800, height: 2800 },
];
