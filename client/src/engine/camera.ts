import type { Point, Rect } from '../model/types';

/**
 * The camera looks at the map: `(x, y)` is the map point shown in the middle of the viewport,
 * `zoom` is screen pixels per map pixel.
 */
export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 8;

export const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export function screenToMap(cam: Camera, vw: number, vh: number, sx: number, sy: number): Point {
  return [cam.x + (sx - vw / 2) / cam.zoom, cam.y + (sy - vh / 2) / cam.zoom];
}

export function mapToScreen(cam: Camera, vw: number, vh: number, mx: number, my: number): Point {
  return [(mx - cam.x) * cam.zoom + vw / 2, (my - cam.y) * cam.zoom + vh / 2];
}

/** The map rectangle visible in the viewport. */
export function viewRect(cam: Camera, vw: number, vh: number): Rect {
  const hw = vw / 2 / cam.zoom;
  const hh = vh / 2 / cam.zoom;
  return { x0: cam.x - hw, y0: cam.y - hh, x1: cam.x + hw, y1: cam.y + hh };
}

/** Zoom by `factor` keeping the map point under screen position (sx, sy) fixed. */
export function zoomAt(cam: Camera, vw: number, vh: number, sx: number, sy: number, factor: number): Camera {
  const zoom = clampZoom(cam.zoom * factor);
  if (zoom === cam.zoom) return cam;
  const [mx, my] = screenToMap(cam, vw, vh, sx, sy);
  return { zoom, x: mx - (sx - vw / 2) / zoom, y: my - (sy - vh / 2) / zoom };
}

/** Camera that shows the whole map with some breathing room. */
export function fitCamera(vw: number, vh: number, mapW: number, mapH: number, padding = 56): Camera {
  const zoom = clampZoom(Math.min((vw - padding * 2) / mapW, (vh - padding * 2) / mapH));
  return { x: mapW / 2, y: mapH / 2, zoom: Math.max(zoom, MIN_ZOOM) };
}

/** True when the whole map is inside the viewport. */
export function showsWholeMap(cam: Camera, vw: number, vh: number, mapW: number, mapH: number): boolean {
  const v = viewRect(cam, vw, vh);
  return v.x0 <= 0 && v.y0 <= 0 && v.x1 >= mapW && v.y1 >= mapH;
}

/** Keeps at least a little of the map on screen so it can not be lost by panning. */
export function clampCamera(cam: Camera, vw: number, vh: number, mapW: number, mapH: number): Camera {
  const keepX = Math.min(vw * 0.3, mapW * cam.zoom * 0.5) / cam.zoom;
  const keepY = Math.min(vh * 0.3, mapH * cam.zoom * 0.5) / cam.zoom;
  const hw = vw / 2 / cam.zoom;
  const hh = vh / 2 / cam.zoom;
  const x = Math.min(mapW + hw - keepX, Math.max(-hw + keepX, cam.x));
  const y = Math.min(mapH + hh - keepY, Math.max(-hh + keepY, cam.y));
  return x === cam.x && y === cam.y ? cam : { ...cam, x, y };
}
