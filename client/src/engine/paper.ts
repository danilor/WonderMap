import { context2d, createCanvas, darken, mix, parseColor, rgba, tileFbm } from '@wondermap/illustrations/kit';
import type { MapTheme } from '@wondermap/illustrations';

/** The final "printed on paper" touches: a faint fibre texture and darker edges. */

const TILE = 512;
const tiles = new Map<string, HTMLCanvasElement>();

function paperTile(theme: MapTheme): HTMLCanvasElement {
  const hit = tiles.get(theme.id);
  if (hit) return hit;
  const canvas = createCanvas(TILE, TILE);
  const ctx = context2d(canvas, true);
  const img = ctx.getImageData(0, 0, TILE, TILE);
  const [pr, pg, pb] = parseColor(mix('#ffffff', theme.paper.color, 0.55));
  const d = img.data;
  let grain = 1234567;
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const u = x / TILE;
      const v = y / TILE;
      const blotch = tileFbm(u, v, 5, 11, 4, 0.55);
      const fibre = tileFbm(u * 2, v * 0.5, 40, 29, 2, 0.5);
      grain = (Math.imul(grain, 1664525) + 1013904223) >>> 0;
      const speck = (grain >>> 8) / 16777216;
      const g = 0.62 + 0.3 * blotch + 0.1 * fibre + 0.08 * speck;
      const i = (y * TILE + x) * 4;
      const k = Math.min(1, g);
      d[i] = pr * k;
      d[i + 1] = pg * k;
      d[i + 2] = pb * k;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  tiles.set(theme.id, canvas);
  return canvas;
}

/** Paints the paper overlay over the map rectangle. `ctx` is in map space. */
export function drawPaper(ctx: CanvasRenderingContext2D, theme: MapTheme, width: number, height: number): void {
  const { strength, vignette, color } = theme.paper;
  if (strength > 0.005) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = Math.min(1, strength);
    const pattern = ctx.createPattern(paperTile(theme), 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
  }
  if (vignette > 0.005) {
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(width / 2, height / 2);
    const g = ctx.createRadialGradient(0, 0, 0.55, 0, 0, 1.45);
    const edge = darken(color, 0.62);
    g.addColorStop(0, rgba(edge, 0));
    g.addColorStop(1, rgba(edge, Math.min(0.9, vignette * 1.6)));
    ctx.fillStyle = g;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
}

export function clearPaperCache(): void {
  tiles.clear();
}
