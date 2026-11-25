import { getTheme } from '@wondermap/illustrations';
import type { ItemKind, ItemRef, MapDocument, Rect } from '../model/types';
import { labelBounds, labelContains } from './labels';
import { distanceToPath, pathGeometry } from './paths';
import { defOf, intersects, orderSymbols, symbolBounds, symbolHit, symbolPaintBounds } from './symbols';

/** Finding things on the map: under the cursor, inside a rectangle, and their bounds. */

const ALL_KINDS: readonly ItemKind[] = ['symbol', 'path', 'label'];

/** Items under a point from top-most to bottom-most. `slop` (map px) makes small things easier to hit. */
export function pickStack(doc: MapDocument, x: number, y: number, slop: number, kinds: readonly ItemKind[] = ALL_KINDS): ItemRef[] {
  const theme = getTheme(doc.themeId);
  const out: ItemRef[] = [];
  const order = orderSymbols(doc.symbols);
  const wantSymbols = kinds.includes('symbol');

  if (kinds.includes('label')) {
    for (let i = doc.labels.length - 1; i >= 0; i--) {
      const l = doc.labels[i]!;
      if (labelContains(l, theme, x, y, slop)) out.push({ kind: 'label', id: l.id });
    }
  }
  const symbolsOf = (list: readonly (typeof doc.symbols)[number][]) => {
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i]!;
      const def = defOf(s);
      if (def && symbolHit(s, def, theme, x, y, slop)) out.push({ kind: 'symbol', id: s.id });
    }
  };
  if (wantSymbols) {
    symbolsOf(order.air);
    symbolsOf(order.landmarks);
    symbolsOf(order.objects);
  }
  if (kinds.includes('path')) {
    for (let i = doc.paths.length - 1; i >= 0; i--) {
      const p = doc.paths[i]!;
      const b = pathGeometry(p).bounds;
      if (x < b.x0 - slop || x > b.x1 + slop || y < b.y0 - slop || y > b.y1 + slop) continue;
      if (distanceToPath(p, x, y) <= p.width / 2 + slop) out.push({ kind: 'path', id: p.id });
    }
  }
  if (wantSymbols) symbolsOf(order.ground);
  return out;
}

export function pickAt(doc: MapDocument, x: number, y: number, slop: number, kinds?: readonly ItemKind[]): ItemRef | null {
  return pickStack(doc, x, y, slop, kinds)[0] ?? null;
}

/** Everything touched by a circle (used by the eraser). */
export function pickInCircle(doc: MapDocument, x: number, y: number, radius: number, kinds: readonly ItemKind[] = ALL_KINDS): ItemRef[] {
  const theme = getTheme(doc.themeId);
  const out: ItemRef[] = [];
  const box: Rect = { x0: x - radius, y0: y - radius, x1: x + radius, y1: y + radius };
  if (kinds.includes('label')) {
    for (const l of doc.labels) {
      if (intersects(labelBounds(l, theme), box) && labelContains(l, theme, x, y, radius)) out.push({ kind: 'label', id: l.id });
    }
  }
  if (kinds.includes('symbol')) {
    for (const s of doc.symbols) {
      const def = defOf(s);
      if (def && intersects(symbolPaintBounds(s, def), box) && symbolHit(s, def, theme, x, y, radius)) out.push({ kind: 'symbol', id: s.id });
    }
  }
  if (kinds.includes('path')) {
    for (const p of doc.paths) {
      if (intersects(pathGeometry(p).bounds, box) && distanceToPath(p, x, y) <= p.width / 2 + radius) out.push({ kind: 'path', id: p.id });
    }
  }
  return out;
}

/** Everything whose box overlaps `rect` (marquee selection). */
export function pickInRect(doc: MapDocument, rect: Rect, kinds: readonly ItemKind[] = ALL_KINDS): ItemRef[] {
  const theme = getTheme(doc.themeId);
  const out: ItemRef[] = [];
  if (kinds.includes('symbol')) {
    for (const s of doc.symbols) {
      const def = defOf(s);
      if (!def) continue;
      const b = symbolBounds(s, def);
      // The anchor is the symbol's "position": mostly-empty corners of a big box should not catch the marquee.
      if (intersects(b, rect) && s.x >= rect.x0 - (b.x1 - b.x0) * 0.25 && s.x <= rect.x1 + (b.x1 - b.x0) * 0.25) out.push({ kind: 'symbol', id: s.id });
    }
  }
  if (kinds.includes('path')) {
    for (const p of doc.paths) {
      const g = pathGeometry(p);
      if (intersects(g.bounds, rect) && g.points.some(([px, py]) => px >= rect.x0 && px <= rect.x1 && py >= rect.y0 && py <= rect.y1)) out.push({ kind: 'path', id: p.id });
    }
  }
  if (kinds.includes('label')) {
    for (const l of doc.labels) {
      if (intersects(labelBounds(l, theme), rect)) out.push({ kind: 'label', id: l.id });
    }
  }
  return out;
}

export function boundsOfItem(doc: MapDocument, ref: ItemRef): Rect | null {
  switch (ref.kind) {
    case 'symbol': {
      const s = doc.symbols.find((item) => item.id === ref.id);
      const def = s && defOf(s);
      return s && def ? symbolBounds(s, def) : null;
    }
    case 'label': {
      const l = doc.labels.find((item) => item.id === ref.id);
      return l ? labelBounds(l, getTheme(doc.themeId)) : null;
    }
    case 'path': {
      const p = doc.paths.find((item) => item.id === ref.id);
      return p ? pathGeometry(p).bounds : null;
    }
  }
}

export function unionBounds(rects: readonly Rect[]): Rect | null {
  if (!rects.length) return null;
  return rects.reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }));
}

export function boundsOfItems(doc: MapDocument, refs: readonly ItemRef[]): Rect | null {
  const rects: Rect[] = [];
  for (const ref of refs) {
    const b = boundsOfItem(doc, ref);
    if (b) rects.push(b);
  }
  return unionBounds(rects);
}
