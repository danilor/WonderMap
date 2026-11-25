import { boundsOfItem, pickAt, pickInRect } from '../engine/picking';
import { pathGeometry } from '../engine/paths';
import { duplicateItems, moveItems, refsOf, removeItems, reorderItems, updateLabels, updatePaths, updateSymbols } from '../model/ops';
import type { ItemRef, MapDocument, Point, Rect } from '../model/types';
import { useEditor } from '../store/editorStore';
import { invalidateOverlay } from './overlayBus';
import { dashedRect, handle } from './overlayDraw';
import { frameOf, hitHandle, nearestOnPolyline, normalizeAngle, snapAngle, HANDLE_RADIUS } from './selectionGeometry';
import type { Tool } from './types';

type Gesture =
  | { kind: 'move'; start: Point; ids: string[]; base: MapDocument; moved: boolean; copy: boolean }
  | { kind: 'marquee'; start: Point; current: Point; additive: boolean; keep: ItemRef[] }
  | { kind: 'scale'; ref: ItemRef; base: MapDocument; pivot: Point; startDist: number; startValue: number }
  | { kind: 'rotate'; ref: ItemRef; base: MapDocument; pivot: Point; startAngle: number; startValue: number }
  | { kind: 'node'; id: string; index: number; base: MapDocument };

/** Pointer movement (CSS px) before a click turns into a drag. */
const DRAG_SLOP = 3;
const MIN_SYMBOL_SCALE = 0.1;
const MAX_SYMBOL_SCALE = 12;
const MIN_LABEL_SIZE = 6;
const MAX_LABEL_SIZE = 600;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Pick, move, marquee-select, scale, rotate and edit things that are already on the map. */
export function createSelectTool(): Tool {
  let gesture: Gesture | null = null;
  let hover: ItemRef | null = null;
  let cursorName = 'default';

  const everything = (doc: MapDocument): ItemRef[] => [
    ...doc.symbols.map((s): ItemRef => ({ kind: 'symbol', id: s.id })),
    ...doc.paths.map((p): ItemRef => ({ kind: 'path', id: p.id })),
    ...doc.labels.map((l): ItemRef => ({ kind: 'label', id: l.id })),
  ];

  const startHandleGesture = (p: { x: number; y: number }, ref: ItemRef, hit: ReturnType<typeof hitHandle>): boolean => {
    const s = useEditor.getState();
    const frame = frameOf(s.doc, ref, 1);
    if (!frame || !hit) return false;
    const base = s.doc;
    if (hit.kind === 'node') {
      s.begin();
      gesture = { kind: 'node', id: ref.id, index: hit.index, base };
      return true;
    }
    const item = ref.kind === 'symbol' ? base.symbols.find((i) => i.id === ref.id) : base.labels.find((i) => i.id === ref.id);
    if (!item) return false;
    s.begin();
    if (hit.kind === 'scale') {
      const handlePos = frame.scaleHandle ?? [p.x, p.y];
      gesture = {
        kind: 'scale',
        ref,
        base,
        pivot: frame.pivot,
        startDist: Math.max(8, Math.hypot(handlePos[0] - frame.pivot[0], handlePos[1] - frame.pivot[1])),
        startValue: 'size' in item ? item.size : (item as { scale: number }).scale,
      };
    } else {
      gesture = {
        kind: 'rotate',
        ref,
        base,
        pivot: frame.pivot,
        startAngle: Math.atan2(p.y - frame.pivot[1], p.x - frame.pivot[0]),
        startValue: item.rotation,
      };
    }
    return true;
  };

  const updateHover = (x: number, y: number, px: number) => {
    const { doc, selection } = useEditor.getState();
    cursorName = 'default';
    hover = null;
    if (selection.length === 1) {
      const frame = frameOf(doc, selection[0]!, px);
      const hit = frame && hitHandle(frame, x, y, px);
      if (hit) {
        cursorName = hit.kind === 'scale' ? 'nwse-resize' : hit.kind === 'rotate' ? 'grab' : 'move';
        return;
      }
    }
    hover = pickAt(doc, x, y, 4 * px);
    if (hover) cursorName = 'move';
  };

  const nudge = (dx: number, dy: number): boolean => {
    const s = useEditor.getState();
    if (!s.selection.length) return false;
    s.commit(moveItems(s.doc, s.selection.map((r) => r.id), dx, dy));
    return true;
  };

  const cancel = () => {
    const g = gesture;
    gesture = null;
    if (g && g.kind !== 'marquee') useEditor.getState().end(false);
    invalidateOverlay();
  };

  return {
    cursor: () => (gesture?.kind === 'move' && gesture.moved ? 'grabbing' : gesture?.kind === 'marquee' ? 'crosshair' : cursorName),

    down(p) {
      const s = useEditor.getState();
      const { doc, selection } = s;
      if (selection.length === 1) {
        const frame = frameOf(doc, selection[0]!, p.px);
        const hit = frame && hitHandle(frame, p.x, p.y, p.px);
        if (hit && startHandleGesture(p, selection[0]!, hit)) return;
      }

      const picked = pickAt(doc, p.x, p.y, 4 * p.px);
      if (!picked) {
        if (!p.shift) s.select([]);
        gesture = { kind: 'marquee', start: [p.x, p.y], current: [p.x, p.y], additive: p.shift, keep: p.shift ? selection : [] };
        return;
      }

      const selected = selection.some((r) => r.id === picked.id);
      let ids: string[];
      if (p.shift && selected) {
        s.select(selection.filter((r) => r.id !== picked.id));
        return;
      } else if (p.shift) {
        const next = [...selection, picked];
        s.select(next);
        ids = next.map((r) => r.id);
      } else if (selected) {
        ids = selection.map((r) => r.id);
      } else {
        s.select([picked]);
        ids = [picked.id];
      }
      s.begin();
      gesture = { kind: 'move', start: [p.x, p.y], ids, base: s.doc, moved: false, copy: p.alt };
    },

    move(p, pressed) {
      const g = gesture;
      if (!g || !pressed) {
        if (!pressed) updateHover(p.x, p.y, p.px);
        invalidateOverlay();
        return;
      }
      const s = useEditor.getState();
      switch (g.kind) {
        case 'move': {
          const dx = p.x - g.start[0];
          const dy = p.y - g.start[1];
          if (!g.moved) {
            if (Math.hypot(dx, dy) < DRAG_SLOP * p.px) break;
            g.moved = true;
            if (g.copy) {
              const dup = duplicateItems(g.base, g.ids, [0, 0]);
              g.base = dup.doc;
              g.ids = dup.ids;
              s.update(dup.doc);
              s.select(refsOf(dup.doc, dup.ids));
            }
          }
          s.update(moveItems(g.base, g.ids, dx, dy));
          break;
        }
        case 'marquee':
          g.current = [p.x, p.y];
          break;
        case 'scale': {
          const factor = Math.hypot(p.x - g.pivot[0], p.y - g.pivot[1]) / g.startDist;
          if (g.ref.kind === 'symbol') s.update(updateSymbols(g.base, [g.ref.id], { scale: clamp(g.startValue * factor, MIN_SYMBOL_SCALE, MAX_SYMBOL_SCALE) }));
          else s.update(updateLabels(g.base, [g.ref.id], { size: clamp(Math.round(g.startValue * factor), MIN_LABEL_SIZE, MAX_LABEL_SIZE) }));
          break;
        }
        case 'rotate': {
          let rotation = g.startValue + (Math.atan2(p.y - g.pivot[1], p.x - g.pivot[0]) - g.startAngle);
          if (p.shift) rotation = snapAngle(rotation);
          rotation = normalizeAngle(rotation);
          if (g.ref.kind === 'symbol') s.update(updateSymbols(g.base, [g.ref.id], { rotation }));
          else s.update(updateLabels(g.base, [g.ref.id], { rotation }));
          break;
        }
        case 'node': {
          const path = g.base.paths.find((item) => item.id === g.id);
          if (!path) break;
          const points = path.points.map((pt, i): Point => (i === g.index ? [p.x, p.y] : pt));
          s.update(updatePaths(g.base, [g.id], { points }));
          break;
        }
      }
      invalidateOverlay();
    },

    up() {
      const g = gesture;
      gesture = null;
      if (!g) return;
      const s = useEditor.getState();
      if (g.kind === 'marquee') {
        const rect: Rect = {
          x0: Math.min(g.start[0], g.current[0]),
          y0: Math.min(g.start[1], g.current[1]),
          x1: Math.max(g.start[0], g.current[0]),
          y1: Math.max(g.start[1], g.current[1]),
        };
        if (rect.x1 - rect.x0 > 2 || rect.y1 - rect.y0 > 2) {
          const found = pickInRect(s.doc, rect);
          const seen = new Set(g.keep.map((r) => r.id));
          s.select([...g.keep, ...found.filter((r) => !seen.has(r.id))]);
        }
      } else {
        s.end(g.kind === 'move' ? g.moved : true);
      }
      invalidateOverlay();
    },

    doubleClick(p) {
      const s = useEditor.getState();
      const hit = pickAt(s.doc, p.x, p.y, 4 * p.px);
      if (!hit) return;
      if (hit.kind === 'label') {
        const label = s.doc.labels.find((l) => l.id === hit.id);
        if (label) s.setLabelEdit({ id: label.id, x: label.x, y: label.y, text: label.text, style: label.style, curve: label.curve });
        return;
      }
      if (hit.kind !== 'path') return;
      const path = s.doc.paths.find((item) => item.id === hit.id);
      if (!path) return;
      const reach = HANDLE_RADIUS * p.px;
      const nodeIndex = path.points.findIndex(([nx, ny]) => Math.hypot(nx - p.x, ny - p.y) <= reach);
      if (nodeIndex >= 0) {
        if (path.points.length > 2) s.commit(updatePaths(s.doc, [path.id], { points: path.points.filter((_, i) => i !== nodeIndex) }));
        return;
      }
      const near = nearestOnPolyline(path.points, p.x, p.y);
      if (near) {
        const points = [...path.points.slice(0, near.index + 1), near.point, ...path.points.slice(near.index + 1)];
        s.commit(updatePaths(s.doc, [path.id], { points }), [{ kind: 'path', id: path.id }]);
      }
    },

    key(e) {
      const s = useEditor.getState();
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Escape') {
        if (gesture) {
          cancel();
          return true;
        }
        if (!s.selection.length) return false;
        s.select([]);
        return true;
      }
      if (gesture) return false;
      if (mod && (e.key === 'a' || e.key === 'A')) {
        s.select(everything(s.doc));
        return true;
      }
      if (mod && (e.key === 'd' || e.key === 'D')) {
        if (!s.selection.length) return false;
        const dup = duplicateItems(s.doc, s.selection.map((r) => r.id));
        s.commit(dup.doc, refsOf(dup.doc, dup.ids));
        return true;
      }
      if (!s.selection.length) return false;
      const ids = s.selection.map((r) => r.id);
      const step = e.shiftKey ? 10 : 1;
      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          s.commit(removeItems(s.doc, ids), []);
          return true;
        case 'ArrowLeft':
          return nudge(-step, 0);
        case 'ArrowRight':
          return nudge(step, 0);
        case 'ArrowUp':
          return nudge(0, -step);
        case 'ArrowDown':
          return nudge(0, step);
        case 'PageUp':
          s.commit(reorderItems(s.doc, ids, 'front'));
          return true;
        case 'PageDown':
          s.commit(reorderItems(s.doc, ids, 'back'));
          return true;
        default:
          return false;
      }
    },

    cancel,

    overlay(ctx, o) {
      const { selection } = useEditor.getState();
      const { doc, zoom } = o;
      const px = 1 / zoom;

      if (hover && !gesture && !selection.some((r) => r.id === hover!.id)) {
        const b = boundsOfItem(doc, hover);
        if (b) dashedRect(ctx, b.x0, b.y0, b.x1, b.y1, zoom, 'rgba(255,255,255,0.75)');
      }

      for (const ref of selection) {
        if (ref.kind === 'path') {
          const path = doc.paths.find((item) => item.id === ref.id);
          if (!path) continue;
          const pts = pathGeometry(path).points;
          ctx.save();
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.beginPath();
          pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.lineWidth = path.width + 6 * px;
          ctx.strokeStyle = 'rgba(255, 215, 120, 0.35)';
          ctx.stroke();
          ctx.restore();
          continue;
        }
        const b = boundsOfItem(doc, ref);
        if (b) dashedRect(ctx, b.x0, b.y0, b.x1, b.y1, zoom, '#ffd36b');
      }

      if (selection.length === 1 && gesture?.kind !== 'marquee') {
        const frame = frameOf(doc, selection[0]!, px);
        if (frame) {
          if (frame.rotateHandle) {
            ctx.save();
            ctx.lineWidth = 1.5 * px;
            ctx.strokeStyle = '#ffd36b';
            ctx.beginPath();
            ctx.moveTo(frame.rotateHandle[0], frame.bounds.y0);
            ctx.lineTo(frame.rotateHandle[0], frame.rotateHandle[1]);
            ctx.stroke();
            ctx.restore();
            handle(ctx, frame.rotateHandle[0], frame.rotateHandle[1], zoom, 'circle');
          }
          if (frame.scaleHandle) handle(ctx, frame.scaleHandle[0], frame.scaleHandle[1], zoom);
          frame.nodes?.forEach(([x, y]) => handle(ctx, x, y, zoom, 'circle'));
        }
      }

      if (gesture?.kind === 'marquee') {
        const [x0, y0] = gesture.start;
        const [x1, y1] = gesture.current;
        ctx.save();
        ctx.fillStyle = 'rgba(120, 190, 255, 0.14)';
        ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
        ctx.restore();
        dashedRect(ctx, Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1), zoom, '#9fd0ff');
      }
    },
  };
}
