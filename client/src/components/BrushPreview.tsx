import { useEffect, useRef } from 'react';
import type { MapTheme, ResolvedBrush } from '@wondermap/illustrations';
import { symbolById } from '@wondermap/illustrations';
import { drawSymbol } from '../engine/sprites/spriteCache';
import { drawBackdrop } from '../utils/backdrop';
import { backdropFor } from './SymbolThumb';

interface Props {
  brush: ResolvedBrush;
  theme: MapTheme;
  width?: number;
  height?: number;
}

/** The brush's heaviest symbols side by side, so the palette shows what dragging will paint. */
export function BrushPreview({ brush, theme, width = 96, height = 66 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const picked = [...brush.items].sort((a, b) => b.weight - a.weight).slice(0, 4);
    const lead = picked[0] ? symbolById.get(picked[0].symbol) : undefined;
    drawBackdrop(ctx, lead ? backdropFor(lead) : 'grass', theme, canvas.width, canvas.height, dpr * 0.5);
    ctx.scale(dpr, dpr);

    picked.forEach((item, i) => {
      const def = symbolById.get(item.symbol);
      if (!def) return;
      const [w, h] = def.size;
      const fit = Math.min(1, (height * 0.7) / h, (width * 0.6) / w);
      const x = (width * (i + 0.5)) / picked.length;
      const y = height * 0.88 - (picked.length > 1 ? (i % 2) * height * 0.14 : 0);
      drawSymbol(
        ctx,
        def,
        theme,
        { x, y, scale: fit, rotation: 0, flip: i % 3 === 1, variant: i },
        dpr * fit,
      );
    });
  }, [brush, theme, width, height]);

  return <canvas ref={ref} style={{ width, height, display: 'block' }} />;
}
