import { combineSeed, context2d, createCanvas, createRng, gradePixels, isIdentityGrade, overdraw } from '@wondermap/illustrations/kit';
import type { MapTheme } from '@wondermap/illustrations';
import type { ResolvedSymbol } from '@wondermap/illustrations';

/**
 * Rasterizes symbols once and reuses the bitmap while panning/zooming.
 * Sprites are cached per (symbol, variant, theme, resolution level) in an LRU bounded by total pixels.
 * The bitmap covers the design box plus an `overdraw` margin on every side, so art that spills slightly is not cut flat.
 */

export interface Sprite {
  canvas: HTMLCanvasElement;
  /** Bitmap pixels per design unit. */
  res: number;
  /** Margin (design units) around the design box that the bitmap also covers. */
  pad: number;
}

const LEVELS = [0.25, 0.5, 1, 2, 4];
const PIXEL_BUDGET = 48_000_000;

const cache = new Map<string, Sprite>();
let totalPixels = 0;
const reported = new Set<string>();

/** Smallest resolution level that is at least `pixelScale` (screen pixels per design unit). */
export function levelFor(pixelScale: number): number {
  for (const level of LEVELS) if (level >= pixelScale * 0.999) return level;
  return LEVELS[LEVELS.length - 1]!;
}

function paintFailure(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.strokeStyle = '#d33';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  ctx.beginPath();
  ctx.moveTo(2, 2);
  ctx.lineTo(w - 2, h - 2);
  ctx.moveTo(w - 2, 2);
  ctx.lineTo(2, h - 2);
  ctx.stroke();
}

function render(def: ResolvedSymbol, variant: number, theme: MapTheme, res: number): Sprite {
  const [w, h] = def.size;
  const pad = overdraw(def.size);
  const fullW = w + pad * 2;
  const fullH = h + pad * 2;
  const grade = !isIdentityGrade(theme.grade);
  const make = () => {
    const canvas = createCanvas(Math.ceil(fullW * res), Math.ceil(fullH * res));
    const ctx = context2d(canvas, grade);
    ctx.scale(canvas.width / fullW, canvas.height / fullH);
    ctx.translate(pad, pad);
    return { canvas, ctx };
  };
  let { canvas, ctx } = make();
  const seed = combineSeed(def.id, variant);
  try {
    def.draw({ ctx, w, h, rand: createRng(seed), variant, seed });
  } catch (error) {
    if (!reported.has(def.id)) {
      reported.add(def.id);
      console.error(`Symbol "${def.id}" failed to draw`, error);
    }
    // A throwing painter can leave clips/transforms behind, so start over on a clean canvas.
    ({ canvas, ctx } = make());
    paintFailure(ctx, w, h);
  }
  if (grade) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    gradePixels(img.data, theme.grade);
    ctx.putImageData(img, 0, 0);
  }
  return { canvas, res, pad };
}

export function getSprite(def: ResolvedSymbol, variant: number, theme: MapTheme, pixelScale: number): Sprite {
  const res = levelFor(pixelScale);
  const v = ((variant % def.variants) + def.variants) % def.variants;
  const key = `${def.id}|${v}|${theme.id}|${res}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const sprite = render(def, v, theme, res);
  cache.set(key, sprite);
  totalPixels += sprite.canvas.width * sprite.canvas.height;
  for (const [oldKey, old] of cache) {
    if (totalPixels <= PIXEL_BUDGET || oldKey === key) break;
    cache.delete(oldKey);
    totalPixels -= old.canvas.width * old.canvas.height;
  }
  return sprite;
}

export interface PlacedSymbol {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  flip: boolean;
  variant: number;
}

/** Bounding size of a placed symbol in map px (before rotation). */
export function symbolExtent(def: ResolvedSymbol, scale: number): { w: number; h: number } {
  return { w: def.size[0] * scale, h: def.size[1] * scale };
}

/** Draw a symbol so its anchor sits at `(p.x, p.y)`. `pixelScale` = bitmap pixels per map pixel (zoom × dpr). */
export function drawSymbol(ctx: CanvasRenderingContext2D, def: ResolvedSymbol, theme: MapTheme, p: PlacedSymbol, pixelScale: number): void {
  const sprite = getSprite(def, p.variant, theme, pixelScale * p.scale);
  const [w, h] = def.size;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.rotation) ctx.rotate(p.rotation);
  ctx.scale(p.flip ? -p.scale : p.scale, p.scale);
  ctx.drawImage(sprite.canvas, -def.anchor[0] * w - sprite.pad, -def.anchor[1] * h - sprite.pad, w + sprite.pad * 2, h + sprite.pad * 2);
  ctx.restore();
}

export function clearSpriteCache(): void {
  cache.clear();
  totalPixels = 0;
}
