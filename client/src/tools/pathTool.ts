import { getTheme, pathStyleById } from '@wondermap/illustrations';
import { drawPath, simplifyStroke } from '../engine/paths';
import { addPath } from '../model/ops';
import type { MapPath, Point } from '../model/types';
import { useEditor } from '../store/editorStore';
import { invalidateOverlay } from './overlayBus';
import { brushCircle } from './overlayDraw';
import type { Tool } from './types';

const MAX_POINTS = 600;

/** Draws rivers, roads and borders freehand: the stroke is simplified and smoothed when you let go. */
export function createPathTool(): Tool {
  let points: Point[] | null = null;
  let hover: Point | null = null;
  let preview: MapPath | null = null;

  const widthFor = (): number => {
    const o = useEditor.getState().options.path;
    return o.width || pathStyleById.get(o.style)?.width || 5;
  };

  const refreshPreview = (px: number) => {
    if (!points) return;
    const simplified = simplifyStroke(points, Math.max(1, 2.2 * px));
    preview = { id: 'preview', style: useEditor.getState().options.path.style, points: simplified, width: widthFor() };
  };

  return {
    cursor: () => 'crosshair',
    down(p) {
      points = [[p.x, p.y]];
      preview = null;
    },
    move(p, pressed) {
      hover = [p.x, p.y];
      if (pressed && points) {
        const last = points[points.length - 1]!;
        if (Math.hypot(p.x - last[0], p.y - last[1]) >= Math.max(2, 3 * p.px) && points.length < MAX_POINTS * 8) {
          points.push([p.x, p.y]);
          refreshPreview(p.px);
        }
      }
      invalidateOverlay();
    },
    up(p) {
      const stroke = points;
      points = null;
      preview = null;
      invalidateOverlay();
      if (!stroke || stroke.length < 2) return;
      let simplified = simplifyStroke(stroke, Math.max(1, 2.2 * p.px));
      if (simplified.length > MAX_POINTS) simplified = simplifyStroke(stroke, 6);
      if (simplified.length < 2) return;
      const s = useEditor.getState();
      s.commit(addPath(s.doc, { style: s.options.path.style, points: simplified, width: widthFor() }).doc);
    },
    cancel() {
      points = null;
      preview = null;
      invalidateOverlay();
    },
    overlay(ctx, o) {
      if (preview) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        drawPath(ctx, preview, getTheme(o.doc.themeId), o.zoom * o.dpr);
        ctx.restore();
      }
      const at = hover ?? o.hover;
      if (at && !preview) brushCircle(ctx, at[0], at[1], Math.max(3, widthFor() / 2), o.zoom);
    },
  };
}
