import { useEffect, useRef } from 'react';
import type { MapTheme, ResolvedSymbol } from '@wondermap/illustrations';
import { drawSymbol } from '../engine/sprites/spriteCache';
import { drawBackdrop, type Backdrop } from '../utils/backdrop';

interface Props {
  def: ResolvedSymbol;
  theme: MapTheme;
  variant?: number;
  /** CSS pixels per design unit. */
  zoom?: number;
  backdrop?: Backdrop;
  /** Show the design box and the anchor point (for art authors). */
  debug?: boolean;
  /** Extra margin around the box in design units. */
  pad?: number;
}

/** Draws one symbol variant on a small canvas. Used by the library panel and the art gallery. */
export function SymbolPreview({ def, theme, variant = 0, zoom = 1, backdrop = 'none', debug = false, pad = 0 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [w, h] = def.size;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = (w + pad * 2) * zoom;
    const ch = (h + pad * 2) * zoom;
    canvas.width = Math.ceil(cw * dpr);
    canvas.height = Math.ceil(ch * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawBackdrop(ctx, backdrop, theme, canvas.width, canvas.height, dpr * zoom);
    ctx.save();
    ctx.scale(dpr * zoom, dpr * zoom);
    ctx.translate(pad, pad);
    drawSymbol(ctx, def, theme, { x: def.anchor[0] * w, y: def.anchor[1] * h, scale: 1, rotation: 0, flip: false, variant }, dpr * zoom);
    if (debug) {
      ctx.strokeStyle = 'rgba(255,0,80,0.7)';
      ctx.lineWidth = 1 / zoom;
      ctx.strokeRect(0, 0, w, h);
      ctx.beginPath();
      const ax = def.anchor[0] * w;
      const ay = def.anchor[1] * h;
      ctx.moveTo(ax - 5, ay);
      ctx.lineTo(ax + 5, ay);
      ctx.moveTo(ax, ay - 5);
      ctx.lineTo(ax, ay + 5);
      ctx.stroke();
    }
    ctx.restore();
  }, [def, theme, variant, zoom, backdrop, debug, pad, w, h]);

  return <canvas ref={ref} style={{ width: (w + pad * 2) * zoom, height: (h + pad * 2) * zoom, display: 'block' }} />;
}
