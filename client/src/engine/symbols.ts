import { context2d, overdraw } from '@wondermap/illustrations/kit';
import { symbolById } from '@wondermap/illustrations';
import type { MapTheme, ResolvedSymbol } from '@wondermap/illustrations';
import type { MapSymbol, Rect } from '../model/types';
import { getSprite } from './sprites/spriteCache';

/** Placement helpers for symbols: draw order, bounds and pixel-accurate picking. */

export interface SymbolOrder {
  ground: MapSymbol[];
  /** Upright objects sorted back to front (by the y of their anchor). */
  objects: MapSymbol[];
  /** Settlements and other landmarks: sorted the same way but always drawn above the plain objects. */
  landmarks: MapSymbol[];
  air: MapSymbol[];
}

const orderCache = new WeakMap<readonly MapSymbol[], SymbolOrder>();

const BUCKET: Record<ResolvedSymbol['layer'], keyof SymbolOrder> = {
  ground: 'ground',
  object: 'objects',
  landmark: 'landmarks',
  air: 'air',
};

export function defOf(symbol: MapSymbol): ResolvedSymbol | undefined {
  return symbolById.get(symbol.asset);
}

export function orderSymbols(list: readonly MapSymbol[]): SymbolOrder {
  const hit = orderCache.get(list);
  if (hit) return hit;
  const order: SymbolOrder = { ground: [], objects: [], landmarks: [], air: [] };
  for (const s of list) {
    const def = defOf(s);
    if (!def) continue;
    order[BUCKET[def.layer]].push(s);
  }
  // Array.prototype.sort is stable, so symbols at the same depth keep their creation order.
  order.objects.sort((a, b) => a.y - b.y);
  order.landmarks.sort((a, b) => a.y - b.y);
  orderCache.set(list, order);
  return order;
}

/** Axis-aligned bounds of the placed symbol in map space. */
export function symbolBounds(s: MapSymbol, def: ResolvedSymbol): Rect {
  const [w, h] = def.size;
  const ax = def.anchor[0] * w;
  const ay = def.anchor[1] * h;
  const lx0 = -ax * s.scale;
  const lx1 = (w - ax) * s.scale;
  const ly0 = -ay * s.scale;
  const ly1 = (h - ay) * s.scale;
  if (!s.rotation) {
    // Mirroring flips the box around the anchor.
    const x0 = s.flip ? -lx1 : lx0;
    const x1 = s.flip ? -lx0 : lx1;
    return { x0: s.x + x0, y0: s.y + ly0, x1: s.x + x1, y1: s.y + ly1 };
  }
  const cos = Math.cos(s.rotation);
  const sin = Math.sin(s.rotation);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [cx, cy] of [
    [lx0, ly0],
    [lx1, ly0],
    [lx1, ly1],
    [lx0, ly1],
  ] as const) {
    const fx = s.flip ? -cx : cx;
    const x = s.x + fx * cos - cy * sin;
    const y = s.y + fx * sin + cy * cos;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}

/** Bounds of what may be painted: the box plus the sprite margin (for culling and hit pre-checks). */
export function symbolPaintBounds(s: MapSymbol, def: ResolvedSymbol): Rect {
  const b = symbolBounds(s, def);
  // Rotating the box can push its margin out by up to √2 of itself along an axis.
  const g = overdraw(def.size) * s.scale * (s.rotation ? 1.5 : 1);
  return { x0: b.x0 - g, y0: b.y0 - g, x1: b.x1 + g, y1: b.y1 + g };
}

export function intersects(a: Rect, b: Rect): boolean {
  return a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0;
}

interface Mask {
  data: Uint8Array;
  w: number;
  h: number;
}

const masks = new Map<string, Mask>();

/** Coarse opacity mask of a symbol variant (cached), used to click on the drawn pixels instead of the whole box. */
function maskOf(def: ResolvedSymbol, variant: number, theme: MapTheme): Mask {
  const v = ((variant % def.variants) + def.variants) % def.variants;
  const key = `${def.id}|${v}`;
  const hit = masks.get(key);
  if (hit) return hit;
  const sprite = getSprite(def, v, theme, 0.25);
  const { width, height } = sprite.canvas;
  const img = context2d(sprite.canvas, true).getImageData(0, 0, width, height);
  const data = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i++) data[i] = img.data[i * 4 + 3]! > 24 ? 1 : 0;
  const mask = { data, w: width, h: height };
  masks.set(key, mask);
  return mask;
}

/** Is the point on a drawn pixel of the symbol? `slop` (map px) grows the target. */
export function symbolHit(s: MapSymbol, def: ResolvedSymbol, theme: MapTheme, x: number, y: number, slop = 0): boolean {
  const dx = x - s.x;
  const dy = y - s.y;
  const cos = Math.cos(-s.rotation);
  const sin = Math.sin(-s.rotation);
  let lx = (dx * cos - dy * sin) / s.scale;
  const ly = (dx * sin + dy * cos) / s.scale;
  if (s.flip) lx = -lx;
  const [w, h] = def.size;
  const pad = overdraw(def.size);
  const u = lx + def.anchor[0] * w;
  const v = ly + def.anchor[1] * h;
  const reach = slop / s.scale;
  if (u < -pad - reach || v < -pad - reach || u > w + pad + reach || v > h + pad + reach) return false;
  const mask = maskOf(def, s.variant, theme);
  // The mask covers the padded sprite, so shift by the margin before scaling to mask pixels.
  const toMaskX = mask.w / (w + pad * 2);
  const toMaskY = mask.h / (h + pad * 2);
  const r = Math.ceil(reach * toMaskX);
  const cx = Math.floor((u + pad) * toMaskX);
  const cy = Math.floor((v + pad) * toMaskY);
  for (let j = -r; j <= r; j++) {
    const yy = cy + j;
    if (yy < 0 || yy >= mask.h) continue;
    for (let i = -r; i <= r; i++) {
      const xx = cx + i;
      if (xx >= 0 && xx < mask.w && mask.data[yy * mask.w + xx]) return true;
    }
  }
  return false;
}

export function clearSymbolMasks(): void {
  masks.clear();
}
