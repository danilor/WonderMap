import { cloneTerrainLayer, paintStroke, withTerrainId } from '../model/terrainLayer';
import type { Point, TerrainLayer } from '../model/types';
import { useEditor } from '../store/editorStore';
import { invalidateOverlay } from './overlayBus';
import { brushCircle } from './overlayDraw';
import type { Tool } from './types';

/** Paints, recolors or erases terrain with a round brush. */
export function createTerrainTool(): Tool {
  let layer: TerrainLayer | null = null;
  let value = 0;
  let last: Point | null = null;
  let changed = false;
  let hover: Point | null = null;

  const stroke = (points: Point[]) => {
    const s = useEditor.getState();
    if (!layer) return;
    const rect = paintStroke(layer, {
      points,
      radius: s.options.terrain.size,
      value,
      mode: s.options.terrain.mode,
      roughness: s.doc.settings.roughness,
      seed: s.doc.seed,
    });
    if (rect) {
      changed = true;
      s.touch();
    }
  };

  const finish = (keep: boolean) => {
    if (!layer) return;
    layer = null;
    last = null;
    const s = useEditor.getState();
    if (keep && changed) s.update({ ...s.doc, updatedAt: new Date().toISOString() });
    s.end(keep && changed);
    changed = false;
  };

  return {
    cursor: () => 'none',
    down(p) {
      const s = useEditor.getState();
      const { id, mode } = s.options.terrain;
      s.begin();
      const copy = cloneTerrainLayer(s.doc.terrain);
      const registered = mode === 'erase' ? { layer: copy, value: 0 } : withTerrainId(copy, id);
      layer = registered.layer;
      value = registered.value;
      changed = false;
      s.update({ ...s.doc, terrain: layer });
      last = [p.x, p.y];
      stroke([last]);
    },
    move(p, pressed) {
      hover = [p.x, p.y];
      if (pressed && layer && last) {
        const next: Point = [p.x, p.y];
        stroke([last, next]);
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
      const s = useEditor.getState();
      const at = hover ?? o.hover;
      if (at) brushCircle(ctx, at[0], at[1], s.options.terrain.size, o.zoom, s.options.terrain.mode === 'erase' ? '#ff9a8a' : '#ffffff');
    },
  };
}
