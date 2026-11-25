import { create } from 'zustand';
import { symbols, terrains } from '@wondermap/illustrations';
import { fitCamera, zoomAt } from '../engine/camera';
import type { Camera } from '../engine/camera';
import { createDocument } from '../model/document';
import type { BrushMode } from '../model/terrainLayer';
import type { ItemRef, MapDocument, Point } from '../model/types';
import { recordChange, redoStep, undoStep } from './history';
import type { HistoryState } from './history';

export type ToolId = 'select' | 'pan' | 'terrain' | 'symbol' | 'path' | 'label' | 'eraser';

export interface ToolOptions {
  terrain: { id: string; mode: BrushMode; /** Brush radius in map px. */ size: number };
  symbol: {
    id: string;
    /** Scatter brush id; `null` stamps single symbols. */
    brush: string | null;
    scale: number;
    /** Radius of the scatter brush in map px. */
    radius: number;
    randomScale: boolean;
    randomFlip: boolean;
    randomVariant: boolean;
  };
  path: { style: string; /** 0 = the style's default. */ width: number };
  label: { style: string; curve: number };
  eraser: { size: number; symbols: boolean; paths: boolean; labels: boolean };
}

export interface LabelEdit {
  /** Existing label being edited; absent for a new one. */
  id?: string;
  x: number;
  y: number;
  text: string;
  style: string;
  curve: number;
}

function defaultOptions(): ToolOptions {
  const firstSymbol = symbols.find((s) => s.id === 'mountain.brown') ?? symbols[0];
  return {
    terrain: { id: terrains.find((t) => t.id === 'grass')?.id ?? terrains[0]?.id ?? 'grass', mode: 'paint', size: 70 },
    symbol: { id: firstSymbol?.id ?? '', brush: null, scale: 1, radius: 80, randomScale: true, randomFlip: true, randomVariant: true },
    path: { style: 'river', width: 0 },
    label: { style: 'city', curve: 0 },
    eraser: { size: 40, symbols: true, paths: true, labels: true },
  };
}

export interface EditorState {
  doc: MapDocument;
  /** Grows with every change of the document, including in-place terrain edits. */
  docRev: number;
  savedRev: number;
  history: HistoryState;
  selection: ItemRef[];
  tool: ToolId;
  options: ToolOptions;
  camera: Camera;
  viewport: { width: number; height: number };
  /** Pointer position in map px (status bar). */
  cursor: Point | null;
  labelEdit: LabelEdit | null;

  open(doc: MapDocument): void;
  /** One undoable change. */
  commit(next: MapDocument, selection?: ItemRef[]): void;
  /** Gestures group many live updates into one undo step. */
  begin(): void;
  update(next: MapDocument): void;
  /** In-place terrain edits: tell subscribers that the document changed without replacing anything. */
  touch(): void;
  /** Finishes a gesture. `changed = false` throws the gesture's edits away. */
  end(changed?: boolean): void;
  undo(): void;
  redo(): void;

  setTool(tool: ToolId): void;
  setOption<K extends keyof ToolOptions>(key: K, patch: Partial<ToolOptions[K]>): void;
  select(refs: ItemRef[]): void;
  setLabelEdit(edit: LabelEdit | null): void;
  setCursor(p: Point | null): void;
  markSaved(rev: number): void;

  setCamera(cam: Camera): void;
  setViewport(width: number, height: number): void;
  fit(): void;
  zoomBy(factor: number): void;
}

let gestureBase: MapDocument | null = null;

function idsOf(doc: MapDocument): Set<string> {
  const ids = new Set<string>();
  for (const s of doc.symbols) ids.add(s.id);
  for (const l of doc.labels) ids.add(l.id);
  for (const p of doc.paths) ids.add(p.id);
  return ids;
}

function pruneSelection(selection: ItemRef[], doc: MapDocument): ItemRef[] {
  if (!selection.length) return selection;
  const ids = idsOf(doc);
  const kept = selection.filter((r) => ids.has(r.id));
  return kept.length === selection.length ? selection : kept;
}

/** Undoing or redoing a canvas expansion moves the map's origin, so frame the whole map again. */
function refit(s: EditorState, next: MapDocument): Partial<EditorState> {
  if (next.width === s.doc.width && next.height === s.doc.height) return {};
  return { camera: fitCamera(s.viewport.width, s.viewport.height, next.width, next.height) };
}

export const useEditor = create<EditorState>()((set, get) => ({
  doc: createDocument({ name: 'Untitled' }),
  docRev: 0,
  savedRev: 0,
  history: { past: [], future: [] },
  selection: [],
  tool: 'terrain',
  options: defaultOptions(),
  camera: { x: 0, y: 0, zoom: 1 },
  viewport: { width: 800, height: 600 },
  cursor: null,
  labelEdit: null,

  open(doc) {
    gestureBase = null;
    const { viewport } = get();
    set({
      doc,
      docRev: 0,
      savedRev: 0,
      history: { past: [], future: [] },
      selection: [],
      labelEdit: null,
      camera: fitCamera(viewport.width, viewport.height, doc.width, doc.height),
    });
  },

  commit(next, selection) {
    const s = get();
    if (next === s.doc) return;
    set({
      doc: next,
      docRev: s.docRev + 1,
      history: recordChange(s.history, s.doc, next),
      selection: selection ?? pruneSelection(s.selection, next),
    });
  },

  begin() {
    gestureBase = get().doc;
  },

  update(next) {
    set((s) => ({ doc: next, docRev: s.docRev + 1 }));
  },

  touch() {
    set((s) => ({ doc: { ...s.doc }, docRev: s.docRev + 1 }));
  },

  end(changed = true) {
    const base = gestureBase;
    gestureBase = null;
    const s = get();
    if (!base || base === s.doc) return;
    if (!changed) {
      set({ doc: base, docRev: s.docRev + 1 });
      return;
    }
    set({ history: recordChange(s.history, base, s.doc), selection: pruneSelection(s.selection, s.doc) });
  },

  undo() {
    const s = get();
    if (gestureBase) return;
    const step = undoStep(s.history, s.doc);
    if (!step) return;
    set({ doc: step.doc, history: step.history, docRev: s.docRev + 1, selection: pruneSelection(s.selection, step.doc), ...refit(s, step.doc) });
  },

  redo() {
    const s = get();
    if (gestureBase) return;
    const step = redoStep(s.history, s.doc);
    if (!step) return;
    set({ doc: step.doc, history: step.history, docRev: s.docRev + 1, selection: pruneSelection(s.selection, step.doc), ...refit(s, step.doc) });
  },

  setTool(tool) {
    if (tool === get().tool) return;
    set({ tool, labelEdit: null, selection: tool === 'select' ? get().selection : [] });
  },

  setOption(key, patch) {
    set((s) => ({ options: { ...s.options, [key]: { ...s.options[key], ...patch } } }));
  },

  select(refs) {
    set({ selection: refs });
  },

  setLabelEdit(edit) {
    set({ labelEdit: edit });
  },

  setCursor(p) {
    set({ cursor: p });
  },

  markSaved(rev) {
    set({ savedRev: rev });
  },

  setCamera(camera) {
    set({ camera });
  },

  setViewport(width, height) {
    set({ viewport: { width, height } });
  },

  fit() {
    const { viewport, doc } = get();
    set({ camera: fitCamera(viewport.width, viewport.height, doc.width, doc.height) });
  },

  zoomBy(factor) {
    const { camera, viewport } = get();
    set({ camera: zoomAt(camera, viewport.width, viewport.height, viewport.width / 2, viewport.height / 2, factor) });
  },
}));

export const isDirty = (s: Pick<EditorState, 'docRev' | 'savedRev'>) => s.docRev !== s.savedRev;
export const canUndo = (s: Pick<EditorState, 'history'>) => s.history.past.length > 0;
export const canRedo = (s: Pick<EditorState, 'history'>) => s.history.future.length > 0;

// Dev only: editing an art file re-runs this module through the catalog import, and the second store instance would
// silently replace the open map with an empty one. A full page reload is the simple and safe answer.
if (import.meta.hot) {
  if (import.meta.hot.data.loaded) location.reload();
  import.meta.hot.data.loaded = true;
}
