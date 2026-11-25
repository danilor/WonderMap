import { pickInCircle } from '../engine/picking';
import { removeItems } from '../model/ops';
import type { ItemKind, Point } from '../model/types';
import { useEditor } from '../store/editorStore';
import { invalidateOverlay } from './overlayBus';
import { brushCircle } from './overlayDraw';
import type { Tool } from './types';

/** Removes symbols, paths and labels under a round brush while dragging. */
export function createEraserTool(): Tool {
  let active = false;
  let last: Point | null = null;
  let removed = 0;
  let hover: Point | null = null;

  const kinds = (): ItemKind[] => {
    const o = useEditor.getState().options.eraser;
    const out: ItemKind[] = [];
    if (o.symbols) out.push('symbol');
    if (o.paths) out.push('path');
    if (o.labels) out.push('label');
    return out;
  };

  const eraseAt = (x: number, y: number) => {
    const s = useEditor.getState();
    const refs = pickInCircle(s.doc, x, y, s.options.eraser.size, kinds());
    if (!refs.length) return;
    removed += refs.length;
    s.update(removeItems(s.doc, refs.map((r) => r.id)));
  };

  const sweep = (from: Point, to: Point) => {
    const size = useEditor.getState().options.eraser.size;
    const dist = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const steps = Math.max(1, Math.ceil(dist / Math.max(4, size * 0.5)));
    for (let i = 1; i <= steps; i++) eraseAt(from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps);
  };

  const finish = (keep: boolean) => {
    if (!active) return;
    active = false;
    last = null;
    useEditor.getState().end(keep && removed > 0);
    removed = 0;
  };

  return {
    cursor: () => 'none',
    down(p) {
      useEditor.getState().begin();
      active = true;
      removed = 0;
      last = [p.x, p.y];
      eraseAt(p.x, p.y);
    },
    move(p, pressed) {
      hover = [p.x, p.y];
      if (pressed && active && last) {
        const next: Point = [p.x, p.y];
        sweep(last, next);
        last = next;
      }
      invalidateOverlay();
    },
    up() {
      finish(true);
    },
    cancel() {
      finish(false);
    },
    overlay(ctx, o) {
      const at = hover ?? o.hover;
      if (at) brushCircle(ctx, at[0], at[1], useEditor.getState().options.eraser.size, o.zoom, '#ff9a8a');
    },
  };
}
