import { LIMITS } from '../model/types';
import type { MapDocument } from '../model/types';

/**
 * Undo/redo bookkeeping. Snapshots are whole documents; they share every array that did not change, so they are cheap
 * except for the terrain grid, which is copied when a painting gesture starts. That is why the history is limited both
 * by length and by the bytes of distinct terrain arrays it keeps alive.
 */

/** Bytes of terrain data referenced by the given documents (a shared array counts once). */
export function terrainBytes(docs: Iterable<MapDocument>): number {
  const seen = new Set<Uint8Array>();
  let total = 0;
  for (const d of docs) {
    const data = d.terrain.data;
    if (seen.has(data)) continue;
    seen.add(data);
    total += data.byteLength;
  }
  return total;
}

export interface HistoryState {
  past: MapDocument[];
  future: MapDocument[];
}

/** Drops the oldest undo steps until the history fits the limits. */
export function trimHistory(
  h: HistoryState,
  current: MapDocument,
  depth: number = LIMITS.historyDepth,
  maxBytes: number = LIMITS.historyBytes,
): HistoryState {
  let past = h.past;
  if (past.length > depth) past = past.slice(past.length - depth);
  while (past.length > 1 && terrainBytes([...past, ...h.future, current]) > maxBytes) past = past.slice(1);
  return past === h.past ? h : { past, future: h.future };
}

/** Records `before` as an undo step for the change that produced `current`. */
export function recordChange(h: HistoryState, before: MapDocument, current: MapDocument): HistoryState {
  return trimHistory({ past: [...h.past, before], future: [] }, current);
}

export function undoStep(h: HistoryState, current: MapDocument): { history: HistoryState; doc: MapDocument } | null {
  const doc = h.past[h.past.length - 1];
  if (!doc) return null;
  return { doc, history: { past: h.past.slice(0, -1), future: [current, ...h.future] } };
}

export function redoStep(h: HistoryState, current: MapDocument): { history: HistoryState; doc: MapDocument } | null {
  const doc = h.future[0];
  if (!doc) return null;
  return { doc, history: { past: [...h.past, current], future: h.future.slice(1) } };
}
