import { makeId } from './document';
import { cloneTerrainLayer, fillTerrain, withTerrainId } from './terrainLayer';
import type { ItemKind, ItemRef, MapDocument, MapLabel, MapPath, MapSettings, MapSymbol, Point } from './types';

/** Pure edits of map items (symbols, paths, labels). Each returns a new document and leaves the input untouched. */

const touch = (doc: MapDocument): MapDocument => ({ ...doc, updatedAt: new Date().toISOString() });

export type NewSymbol = Omit<MapSymbol, 'id'> & { id?: string };
export type NewLabel = Omit<MapLabel, 'id'> & { id?: string };
export type NewPath = Omit<MapPath, 'id'> & { id?: string };

export function addSymbols(doc: MapDocument, list: readonly NewSymbol[]): MapDocument {
  if (!list.length) return doc;
  return touch({ ...doc, symbols: [...doc.symbols, ...list.map((s) => ({ ...s, id: s.id ?? makeId() }))] });
}

export function addLabel(doc: MapDocument, label: NewLabel): { doc: MapDocument; id: string } {
  const id = label.id ?? makeId();
  return { doc: touch({ ...doc, labels: [...doc.labels, { ...label, id }] }), id };
}

export function addPath(doc: MapDocument, path: NewPath): { doc: MapDocument; id: string } {
  const id = path.id ?? makeId();
  return { doc: touch({ ...doc, paths: [...doc.paths, { ...path, id }] }), id };
}

export function kindOf(doc: MapDocument, id: string): ItemKind | null {
  if (doc.symbols.some((s) => s.id === id)) return 'symbol';
  if (doc.labels.some((l) => l.id === id)) return 'label';
  if (doc.paths.some((p) => p.id === id)) return 'path';
  return null;
}

export function refsOf(doc: MapDocument, ids: readonly string[]): ItemRef[] {
  const out: ItemRef[] = [];
  for (const id of ids) {
    const kind = kindOf(doc, id);
    if (kind) out.push({ kind, id });
  }
  return out;
}

type Patch<T> = Partial<Omit<T, 'id'>> | ((item: T) => Partial<Omit<T, 'id'>>);
const resolve = <T>(patch: Patch<T>, item: T) => (typeof patch === 'function' ? patch(item) : patch);

export function updateSymbols(doc: MapDocument, ids: ReadonlySet<string> | readonly string[], patch: Patch<MapSymbol>): MapDocument {
  const set = ids instanceof Set ? ids : new Set(ids);
  return touch({ ...doc, symbols: doc.symbols.map((s) => (set.has(s.id) ? { ...s, ...resolve(patch, s) } : s)) });
}

export function updateLabels(doc: MapDocument, ids: ReadonlySet<string> | readonly string[], patch: Patch<MapLabel>): MapDocument {
  const set = ids instanceof Set ? ids : new Set(ids);
  return touch({ ...doc, labels: doc.labels.map((l) => (set.has(l.id) ? { ...l, ...resolve(patch, l) } : l)) });
}

export function updatePaths(doc: MapDocument, ids: ReadonlySet<string> | readonly string[], patch: Patch<MapPath>): MapDocument {
  const set = ids instanceof Set ? ids : new Set(ids);
  return touch({ ...doc, paths: doc.paths.map((p) => (set.has(p.id) ? { ...p, ...resolve(patch, p) } : p)) });
}

export function moveItems(doc: MapDocument, ids: readonly string[], dx: number, dy: number): MapDocument {
  const set = new Set(ids);
  return touch({
    ...doc,
    symbols: doc.symbols.map((s) => (set.has(s.id) ? { ...s, x: s.x + dx, y: s.y + dy } : s)),
    labels: doc.labels.map((l) => (set.has(l.id) ? { ...l, x: l.x + dx, y: l.y + dy } : l)),
    paths: doc.paths.map((p) => (set.has(p.id) ? { ...p, points: p.points.map(([x, y]): Point => [x + dx, y + dy]) } : p)),
  });
}

export function removeItems(doc: MapDocument, ids: readonly string[]): MapDocument {
  const set = new Set(ids);
  return touch({
    ...doc,
    symbols: doc.symbols.filter((s) => !set.has(s.id)),
    labels: doc.labels.filter((l) => !set.has(l.id)),
    paths: doc.paths.filter((p) => !set.has(p.id)),
  });
}

/** Copies items (shifted by `offset`) and returns the ids of the copies. */
export function duplicateItems(doc: MapDocument, ids: readonly string[], offset: Point = [24, 24]): { doc: MapDocument; ids: string[] } {
  const set = new Set(ids);
  const created: string[] = [];
  const fresh = () => {
    const id = makeId();
    created.push(id);
    return id;
  };
  const symbols = doc.symbols.filter((s) => set.has(s.id)).map((s) => ({ ...s, id: fresh(), x: s.x + offset[0], y: s.y + offset[1] }));
  const labels = doc.labels.filter((l) => set.has(l.id)).map((l) => ({ ...l, id: fresh(), x: l.x + offset[0], y: l.y + offset[1] }));
  const paths = doc.paths
    .filter((p) => set.has(p.id))
    .map((p) => ({ ...p, id: fresh(), points: p.points.map(([x, y]): Point => [x + offset[0], y + offset[1]]) }));
  if (!created.length) return { doc, ids: [] };
  return {
    doc: touch({ ...doc, symbols: [...doc.symbols, ...symbols], labels: [...doc.labels, ...labels], paths: [...doc.paths, ...paths] }),
    ids: created,
  };
}

/** Moves items to the end (front) or start (back) of their list; this changes stacking among equal depths and ground decals. */
export function reorderItems(doc: MapDocument, ids: readonly string[], where: 'front' | 'back'): MapDocument {
  const set = new Set(ids);
  const order = <T extends { id: string }>(list: T[]): T[] => {
    const picked = list.filter((i) => set.has(i.id));
    const rest = list.filter((i) => !set.has(i.id));
    return where === 'front' ? [...rest, ...picked] : [...picked, ...rest];
  };
  return touch({ ...doc, symbols: order(doc.symbols), labels: order(doc.labels), paths: order(doc.paths) });
}

/** Covers the whole map (or just the land) with one terrain. `null` turns everything into sea. */
export function floodTerrain(doc: MapDocument, terrainId: string | null, onlyLand = false): MapDocument {
  const copy = cloneTerrainLayer(doc.terrain);
  if (terrainId === null) {
    fillTerrain(copy, 0);
    return touch({ ...doc, terrain: copy });
  }
  const { layer, value } = withTerrainId(copy, terrainId);
  fillTerrain(layer, value, onlyLand);
  return touch({ ...doc, terrain: layer });
}

/* Map-level properties ------------------------------------------------------------------------ */

export function renameDocument(doc: MapDocument, name: string): MapDocument {
  const clean = name.trim();
  return !clean || clean === doc.name ? doc : touch({ ...doc, name: clean });
}

export function updateSettings(doc: MapDocument, patch: Partial<MapSettings>): MapDocument {
  return touch({ ...doc, settings: { ...doc.settings, ...patch } });
}

/** Switches the paper style and/or the border of the map. */
export function setLook(doc: MapDocument, look: { themeId?: string; frameId?: string }): MapDocument {
  return touch({ ...doc, ...look });
}
