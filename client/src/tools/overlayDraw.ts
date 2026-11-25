/** Small drawing helpers shared by the tool overlays. Everything is drawn in map space with zoom-independent line widths. */

export function brushCircle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, zoom: number, color = '#ffffff'): void {
  ctx.save();
  ctx.lineWidth = 3 / zoom;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.5 / zoom;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 2.2 / zoom, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

export function dashedRect(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, zoom: number, color = '#ffffff'): void {
  ctx.save();
  ctx.lineWidth = 3 / zoom;
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.setLineDash([]);
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  ctx.lineWidth = 1.5 / zoom;
  ctx.strokeStyle = color;
  ctx.setLineDash([6 / zoom, 5 / zoom]);
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
}

export function handle(ctx: CanvasRenderingContext2D, x: number, y: number, zoom: number, shape: 'square' | 'circle' = 'square'): void {
  const r = 5.5 / zoom;
  ctx.save();
  ctx.lineWidth = 1.5 / zoom;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1b2a3a';
  ctx.beginPath();
  if (shape === 'circle') ctx.arc(x, y, r, 0, Math.PI * 2);
  else ctx.rect(x - r, y - r, r * 2, r * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
