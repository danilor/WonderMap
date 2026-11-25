import { terrainById } from '@wondermap/illustrations';
import type { MapTheme } from '@wondermap/illustrations';
import { getTerrainTile, tileResolution } from '../engine/terrain/tiles';

export type Backdrop = 'none' | 'sea' | 'paper' | 'grass' | 'earth' | 'sand' | 'snow' | 'swamp' | 'stone';

export const BACKDROPS: readonly { id: Backdrop; label: string }[] = [
  { id: 'none', label: 'Transparent' },
  { id: 'grass', label: 'Grass' },
  { id: 'earth', label: 'Brown earth' },
  { id: 'sand', label: 'Sand' },
  { id: 'snow', label: 'Snow' },
  { id: 'swamp', label: 'Swamp' },
  { id: 'stone', label: 'Gray rock' },
  { id: 'sea', label: 'Sea' },
  { id: 'paper', label: 'Paper' },
];

/** Fill a canvas with a terrain/sea/paper backdrop. `pixelScale` = bitmap pixels per CSS pixel × zoom. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, kind: Backdrop, theme: MapTheme, width: number, height: number, pixelScale: number): void {
  ctx.clearRect(0, 0, width, height);
  if (kind === 'none') return;
  if (kind === 'sea') {
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, theme.sea.mid);
    g.addColorStop(1, theme.sea.deep);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  if (kind === 'paper') {
    ctx.fillStyle = theme.paper.color;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  const terrain = terrainById.get(kind);
  if (!terrain) return;
  const res = tileResolution(pixelScale);
  const tile = getTerrainTile(terrain, theme, res);
  const pattern = ctx.createPattern(tile, 'repeat');
  if (!pattern) return;
  ctx.save();
  // One tile pixel = 1/res map px; stretch it to the display scale.
  const k = pixelScale / res;
  ctx.scale(k, k);
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width / k, height / k);
  ctx.restore();
}
