import { combineSeed, createRng } from '@wondermap/illustrations/kit';
import { getFrame } from '@wondermap/illustrations';
import type { MapTheme } from '@wondermap/illustrations';
import type { MapDocument, MapSymbol, Rect } from '../model/types';
import { drawLabel, labelBounds } from './labels';
import { drawPaper } from './paper';
import { drawPath, pathGeometry } from './paths';
import { drawSymbol } from './sprites/spriteCache';
import { defOf, intersects, orderSymbols, symbolPaintBounds } from './symbols';

/**
 * Everything that sits on top of the terrain. Shared by the live editor view and by image export, so the exported
 * picture is guaranteed to match what you see. `ctx` must be in map space (1 unit = 1 map px).
 */

export interface SceneOptions {
  /** Visible map rectangle (map px); anything outside is skipped. */
  view: Rect;
  /** Bitmap pixels per map pixel (zoom × device pixel ratio, or the export scale). */
  pixelScale: number;
  /** Draw the helper grid (editor option, off for exports unless requested). */
  grid: boolean;
}

function drawSymbols(ctx: CanvasRenderingContext2D, list: readonly MapSymbol[], theme: MapTheme, view: Rect, pixelScale: number): void {
  for (const s of list) {
    const def = defOf(s);
    if (!def || !intersects(symbolPaintBounds(s, def), view)) continue;
    drawSymbol(ctx, def, theme, s, pixelScale);
  }
}

/** Symbols lying on the ground, then paths, then upright objects and landmarks (back to front) and flying things. */
export function drawObjects(ctx: CanvasRenderingContext2D, doc: MapDocument, theme: MapTheme, o: SceneOptions): void {
  const order = orderSymbols(doc.symbols);
  drawSymbols(ctx, order.ground, theme, o.view, o.pixelScale);
  for (const path of doc.paths) {
    if (intersects(pathGeometry(path).bounds, o.view)) drawPath(ctx, path, theme, o.pixelScale);
  }
  drawSymbols(ctx, order.objects, theme, o.view, o.pixelScale);
  drawSymbols(ctx, order.landmarks, theme, o.view, o.pixelScale);
  drawSymbols(ctx, order.air, theme, o.view, o.pixelScale);
}

export function drawLabels(ctx: CanvasRenderingContext2D, doc: MapDocument, theme: MapTheme, o: SceneOptions): void {
  for (const label of doc.labels) {
    if (label.text && intersects(labelBounds(label, theme), o.view)) drawLabel(ctx, label, theme);
  }
}

export function drawGrid(ctx: CanvasRenderingContext2D, doc: MapDocument, o: SceneOptions): void {
  const step = Math.max(10, doc.settings.gridSize);
  const { view } = o;
  ctx.save();
  ctx.beginPath();
  const x0 = Math.max(0, Math.floor(view.x0 / step) * step);
  const y0 = Math.max(0, Math.floor(view.y0 / step) * step);
  for (let x = x0; x <= Math.min(doc.width, view.x1); x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, doc.height);
  }
  for (let y = y0; y <= Math.min(doc.height, view.y1); y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(doc.width, y);
  }
  ctx.lineWidth = Math.max(1, 1.2 / o.pixelScale);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.stroke();
  ctx.lineWidth = Math.max(0.5, 0.6 / o.pixelScale);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.stroke();
  ctx.restore();
}

/** Paper texture, labels, the frame and the optional grid. */
export function drawFinish(ctx: CanvasRenderingContext2D, doc: MapDocument, theme: MapTheme, o: SceneOptions): void {
  drawPaper(ctx, theme, doc.width, doc.height);
  drawLabels(ctx, doc, theme, o);
  const frame = getFrame(doc.frameId);
  ctx.save();
  frame.draw({ ctx, width: doc.width, height: doc.height, theme, rand: createRng(combineSeed('frame', doc.seed)) });
  ctx.restore();
  if (o.grid) drawGrid(ctx, doc, o);
}
