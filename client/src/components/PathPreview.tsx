import { useEffect, useRef } from 'react';
import type { MapTheme, ResolvedPathStyle } from '@wondermap/illustrations';
import { drawPath } from '../engine/paths';
import type { MapPath } from '../model/types';

interface Props {
  style: ResolvedPathStyle;
  theme: MapTheme;
  width?: number;
  height?: number;
}

/** A short wavy sample of a path style, drawn with the same code as the map. */
export function PathPreview({ style, theme, width = 92, height = 38 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#86a35f';
    ctx.fillRect(0, 0, width, height);
    const mid = height / 2;
    const path: MapPath = {
      id: `preview-${style.id}`,
      style: style.id,
      width: Math.min(style.width, height * 0.35),
      points: [
        [6, mid + 8],
        [width * 0.3, mid - 9],
        [width * 0.62, mid + 9],
        [width - 6, mid - 6],
      ],
    };
    drawPath(ctx, path, theme, dpr);
  }, [style, theme, width, height]);

  return <canvas ref={ref} className="preview" style={{ width, height, display: 'block' }} />;
}
