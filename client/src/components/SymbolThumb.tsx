import { useEffect, useRef } from 'react';
import type { MapTheme, ResolvedSymbol } from '@wondermap/illustrations';
import { drawSymbol } from '../engine/sprites/spriteCache';
import { backdropFor, drawBackdrop } from '../utils/backdrop';

interface Props {
  def: ResolvedSymbol;
  theme: MapTheme;
  width: number;
  height: number;
  variant?: number;
}

/** One symbol, centred and shrunk to fit a fixed box on a fitting backdrop. */
export function SymbolThumb({ def, theme, width, height, variant = 0 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    drawBackdrop(ctx, backdropFor(def), theme, canvas.width, canvas.height, dpr * 0.5);
    ctx.scale(dpr, dpr);
    const [w, h] = def.size;
    const fit = Math.min(1, (width - 8) / w, (height - 8) / h);
    drawSymbol(
      ctx,
      def,
      theme,
      { x: width / 2 + (def.anchor[0] - 0.5) * w * fit, y: height / 2 + (def.anchor[1] - 0.5) * h * fit, scale: fit, rotation: 0, flip: false, variant },
      dpr * fit,
    );
  }, [def, theme, width, height, variant]);

  return <canvas ref={ref} style={{ width, height, display: 'block' }} />;
}
