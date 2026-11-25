import { getTheme } from '@wondermap/illustrations';
import { labelBounds } from '../engine/labels';
import { boundsOfItem } from '../engine/picking';
import { defOf } from '../engine/symbols';
import type { ItemRef, MapDocument, Point, Rect } from '../model/types';

/** Geometry of the handles shown around a single selected item. Pure functions, so they are easy to test. */

export type HandleHit = { kind: 'scale' } | { kind: 'rotate' } | { kind: 'node'; index: number };

export interface SelectionFrame {
  ref: ItemRef;
  bounds: Rect;
  /** The item's own position: scaling and rotating happen around it. */
  pivot: Point;
  scaleHandle: Point | null;
  rotateHandle: Point | null;
  /** Control points of a path. */
  nodes: readonly Point[] | null;
}

/** CSS px between the top of the box and the rotation handle. */
export const ROTATE_OFFSET = 26;
/** CSS px: how close the pointer has to be to grab a handle. */
export const HANDLE_RADIUS = 9;

export function frameOf(doc: MapDocument, ref: ItemRef, px: number): SelectionFrame | null {
  const bounds = boundsOfItem(doc, ref);
  if (!bounds) return null;
  const top: Point = [(bounds.x0 + bounds.x1) / 2, bounds.y0 - ROTATE_OFFSET * px];
  const corner: Point = [bounds.x1, bounds.y1];
  switch (ref.kind) {
    case 'symbol': {
      const s = doc.symbols.find((item) => item.id === ref.id);
      const def = s && defOf(s);
      if (!s || !def) return null;
      return { ref, bounds, pivot: [s.x, s.y], scaleHandle: corner, rotateHandle: def.rotatable ? top : null, nodes: null };
    }
    case 'label': {
      const l = doc.labels.find((item) => item.id === ref.id);
      if (!l) return null;
      return { ref, bounds: labelBounds(l, getTheme(doc.themeId)), pivot: [l.x, l.y], scaleHandle: corner, rotateHandle: top, nodes: null };
    }
    case 'path': {
      const p = doc.paths.find((item) => item.id === ref.id);
      if (!p) return null;
      return { ref, bounds, pivot: p.points[0] ?? [0, 0], scaleHandle: null, rotateHandle: null, nodes: p.points };
    }
  }
}

export function hitHandle(frame: SelectionFrame, x: number, y: number, px: number): HandleHit | null {
  const reach = HANDLE_RADIUS * px;
  const near = (p: Point | null) => p !== null && Math.hypot(p[0] - x, p[1] - y) <= reach;
  if (near(frame.rotateHandle)) return { kind: 'rotate' };
  if (near(frame.scaleHandle)) return { kind: 'scale' };
  if (frame.nodes) {
    let best = -1;
    let bestDist = reach;
    frame.nodes.forEach((n, index) => {
      const d = Math.hypot(n[0] - x, n[1] - y);
      if (d <= bestDist) {
        best = index;
        bestDist = d;
      }
    });
    if (best >= 0) return { kind: 'node', index: best };
  }
  return null;
}

/** The point of the polyline closest to `(x, y)`, and the index of the segment it lies on. */
export function nearestOnPolyline(points: readonly Point[], x: number, y: number): { index: number; point: Point; distance: number } | null {
  let best: { index: number; point: Point; distance: number } | null = null;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i]!;
    const [bx, by] = points[i + 1]!;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
    const point: Point = [ax + dx * t, ay + dy * t];
    const distance = Math.hypot(point[0] - x, point[1] - y);
    if (!best || distance < best.distance) best = { index: i, point, distance };
  }
  return best;
}

export const snapAngle = (radians: number, step = Math.PI / 12): number => Math.round(radians / step) * step;

export function normalizeAngle(radians: number): number {
  const twoPi = Math.PI * 2;
  let a = radians % twoPi;
  if (a > Math.PI) a -= twoPi;
  else if (a < -Math.PI) a += twoPi;
  return a;
}
