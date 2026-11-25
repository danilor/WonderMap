import { useEffect, useRef } from 'react';
import type { MapTheme, ResolvedTerrain } from '@wondermap/illustrations';
import { getTerrainTile } from '../engine/terrain/tiles';

interface Props {
  def: ResolvedTerrain;
  theme: MapTheme;
  width: number;
  height: number;
}

/** A small patch of a terrain's texture, used by the terrain palette. */
export function TerrainSwatch({ def, theme, width, height }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const tile = getTerrainTile(def, theme, dpr > 1 ? 1 : 0.5);
    const pattern = ctx.createPattern(tile, 'repeat');
    ctx.fillStyle = pattern ?? def.swatch;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [def, theme, width, height]);

  return <canvas ref={ref} style={{ width, height, display: 'block' }} />;
}
