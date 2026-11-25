import { getTheme } from '@wondermap/illustrations';
import { createTerrainLayer, decodeRle, encodeRle, expandTerrainLayer, compactTerrainIds } from './terrainLayer';
import {
  CELL,
  DEFAULT_SETTINGS,
  LIMITS,
  SCHEMA_VERSION,
  type MapDocument,
  type MapLabel,
  type MapPath,
  type MapSettings,
  type MapSymbol,
  type Point,
} from './types';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/** Short random id (also valid as a server map id). */
export function makeId(length = 12): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export function snapSize(value: number): number {
  return Math.max(CELL, Math.round(value / CELL) * CELL);
}

export interface NewDocumentOptions {
  id?: string;
  name?: string;
  width?: number;
  height?: number;
  themeId?: string;
  frameId?: string;
  seed?: number;
}

export function createDocument(o: NewDocumentOptions = {}): MapDocument {
  const width = snapSize(clamp(o.width ?? 3200, LIMITS.minSize, LIMITS.maxSize));
  const height = snapSize(clamp(o.height ?? 2000, LIMITS.minSize, LIMITS.maxSize));
  const theme = getTheme(o.themeId);
  const now = new Date().toISOString();
  return {
    schema: SCHEMA_VERSION,
    id: o.id ?? makeId(),
    name: o.name?.trim() || 'Untitled World',
    kind: 'world',
    width,
    height,
    themeId: theme.id,
    frameId: o.frameId ?? theme.frame,
    seed: o.seed ?? Math.floor(Math.random() * 2 ** 31),
    settings: { ...DEFAULT_SETTINGS },
    terrain: createTerrainLayer(width, height),
    paths: [],
    symbols: [],
    labels: [],
    createdAt: now,
    updatedAt: now,
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* ------------------------------------------------------------------------------------------- */
/* Canvas expansion                                                                            */
/* ------------------------------------------------------------------------------------------- */

export interface Expansion {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const NO_EXPANSION: Expansion = { left: 0, top: 0, right: 0, bottom: 0 };

/** Returns a human-readable reason when the expansion is not allowed, otherwise `null`. */
export function validateExpansion(doc: Pick<MapDocument, 'width' | 'height'>, d: Expansion): string | null {
  const w = doc.width + snapSize2(d.left) + snapSize2(d.right);
  const h = doc.height + snapSize2(d.top) + snapSize2(d.bottom);
  if (w < LIMITS.minSize || h < LIMITS.minSize) return `A map cannot be smaller than ${LIMITS.minSize} px.`;
  if (w > LIMITS.maxSize || h > LIMITS.maxSize) return `A map side cannot exceed ${LIMITS.maxSize} px.`;
  if (w * h > LIMITS.maxArea) return `The map would be too large (${Math.round((w * h) / 1e6)} MP, limit ${LIMITS.maxArea / 1e6} MP).`;
  return null;
}

const snapSize2 = (v: number) => Math.round(v / CELL) * CELL;

/** Adds canvas around the map. Everything on the map keeps its place; the new area is open sea. */
export function expandDocument(doc: MapDocument, d: Expansion): MapDocument {
  const e: Expansion = { left: snapSize2(d.left), top: snapSize2(d.top), right: snapSize2(d.right), bottom: snapSize2(d.bottom) };
  const error = validateExpansion(doc, e);
  if (error) throw new Error(error);
  const shift = (x: number, y: number): Point => [x + e.left, y + e.top];
  return {
    ...doc,
    width: doc.width + e.left + e.right,
    height: doc.height + e.top + e.bottom,
    terrain: expandTerrainLayer(doc.terrain, e),
    symbols: doc.symbols.map((s) => ({ ...s, x: s.x + e.left, y: s.y + e.top })),
    labels: doc.labels.map((l) => ({ ...l, x: l.x + e.left, y: l.y + e.top })),
    paths: doc.paths.map((p) => ({ ...p, points: p.points.map(([x, y]) => shift(x, y)) })),
    updatedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------------------------------- */
/* Serialization                                                                               */
/* ------------------------------------------------------------------------------------------- */

export interface SerializedDocument extends Omit<MapDocument, 'terrain'> {
  terrain: { cell: number; cols: number; rows: number; ids: string[]; rle: string };
}

export function serializeDocument(doc: MapDocument): SerializedDocument {
  const terrain = compactTerrainIds(doc.terrain);
  return {
    ...doc,
    terrain: { cell: terrain.cell, cols: terrain.cols, rows: terrain.rows, ids: [...terrain.ids], rle: encodeRle(terrain.data) },
  };
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

/** Validates untrusted JSON (file import / server response) and returns a clean document. Throws a readable error. */
export function parseDocument(raw: unknown): MapDocument {
  if (!isObj(raw)) throw new Error('This is not a WonderMap file.');
  if (typeof raw.schema !== 'number' || raw.schema > SCHEMA_VERSION) {
    throw new Error('This map was created with a newer version of WonderMap.');
  }
  const width = snapSize(clamp(num(raw.width, 3200), LIMITS.minSize, LIMITS.maxSize));
  const height = snapSize(clamp(num(raw.height, 2000), LIMITS.minSize, LIMITS.maxSize));
  if (width * height > LIMITS.maxArea) throw new Error('The map is too large to open.');

  const t = isObj(raw.terrain) ? raw.terrain : {};
  const cell = CELL;
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  if (num(t.cell, cell) !== cell || num(t.cols, cols) !== cols || num(t.rows, rows) !== rows) {
    throw new Error('The terrain data does not match the map size.');
  }
  const ids = Array.isArray(t.ids) ? t.ids.filter((v): v is string => typeof v === 'string').slice(0, 250) : [];
  const data = typeof t.rle === 'string' && t.rle ? decodeRle(t.rle, cols * rows) : new Uint8Array(cols * rows);
  for (let i = 0; i < data.length; i++) if (data[i]! > ids.length) data[i] = 0;

  const theme = getTheme(str(raw.themeId, ''));
  const s = isObj(raw.settings) ? raw.settings : {};
  const settings: MapSettings = {
    beaches: bool(s.beaches, DEFAULT_SETTINGS.beaches),
    shallows: bool(s.shallows, DEFAULT_SETTINGS.shallows),
    roughness: clamp(num(s.roughness, DEFAULT_SETTINGS.roughness), 0, 1),
    grid: bool(s.grid, DEFAULT_SETTINGS.grid),
    gridSize: clamp(num(s.gridSize, DEFAULT_SETTINGS.gridSize), 10, 1000),
  };

  const now = new Date().toISOString();
  return {
    schema: SCHEMA_VERSION,
    id: str(raw.id, '') || makeId(),
    name: str(raw.name, 'Untitled World').slice(0, 120) || 'Untitled World',
    kind: 'world',
    width,
    height,
    themeId: theme.id,
    frameId: str(raw.frameId, theme.frame),
    seed: Math.floor(num(raw.seed, 1)),
    settings,
    terrain: { cell, cols, rows, ids, data, rev: 0 },
    paths: (Array.isArray(raw.paths) ? raw.paths : []).filter(isObj).map(parsePath).filter((p): p is MapPath => p !== null),
    symbols: (Array.isArray(raw.symbols) ? raw.symbols : []).filter(isObj).map(parseSymbol).filter((v): v is MapSymbol => v !== null),
    labels: (Array.isArray(raw.labels) ? raw.labels : []).filter(isObj).map(parseLabel).filter((v): v is MapLabel => v !== null),
    createdAt: str(raw.createdAt, now),
    updatedAt: str(raw.updatedAt, now),
  };
}

function parseSymbol(o: Obj): MapSymbol | null {
  if (typeof o.asset !== 'string') return null;
  return {
    id: str(o.id, '') || makeId(),
    asset: o.asset,
    x: num(o.x, 0),
    y: num(o.y, 0),
    scale: clamp(num(o.scale, 1), 0.05, 20),
    rotation: num(o.rotation, 0),
    flip: bool(o.flip, false),
    variant: Math.max(0, Math.floor(num(o.variant, 0))),
  };
}

function parsePath(o: Obj): MapPath | null {
  if (typeof o.style !== 'string' || !Array.isArray(o.points)) return null;
  const points: Point[] = [];
  for (const p of o.points) {
    if (Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number') points.push([p[0], p[1]]);
  }
  if (points.length < 2) return null;
  return { id: str(o.id, '') || makeId(), style: o.style, points, width: clamp(num(o.width, 6), 0.5, 400) };
}

function parseLabel(o: Obj): MapLabel | null {
  if (typeof o.text !== 'string') return null;
  return {
    id: str(o.id, '') || makeId(),
    text: o.text.slice(0, 200),
    x: num(o.x, 0),
    y: num(o.y, 0),
    style: str(o.style, 'region'),
    size: clamp(num(o.size, 32), 4, 600),
    rotation: num(o.rotation, 0),
    curve: clamp(num(o.curve, 0), -1, 1),
    spacing: clamp(num(o.spacing, 0), -0.2, 4),
    color: typeof o.color === 'string' ? o.color : null,
  };
}

export function documentToJson(doc: MapDocument): string {
  return JSON.stringify(serializeDocument(doc));
}

export function documentFromJson(text: string): MapDocument {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('The file is not valid JSON.');
  }
  return parseDocument(raw);
}
