import { defineFrame } from '../kit/define';
import { rect } from '../kit/draw';
import { mix, rgba } from '../kit/colors';
import type { Ctx2D } from '../kit/types';

const GAP = 7;

/** Draw a chessboard-like graduated strip between two rules, the classic atlas border. */
function strip(ctx: Ctx2D, x: number, y: number, len: number, thick: number, vertical: boolean, ink: string): void {
  const cells = Math.max(2, Math.round(len / 18));
  const step = len / cells;
  ctx.fillStyle = ink;
  for (let i = 0; i < cells; i += 2) {
    if (vertical) ctx.fillRect(x, y + i * step, thick, step);
    else ctx.fillRect(x + i * step, y, step, thick);
  }
}

function cornerOrnament(ctx: Ctx2D, x: number, y: number, size: number, ink: string, fill: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = fill;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.4;
  ctx.fillRect(-size, -size, size * 2, size * 2);
  ctx.strokeRect(-size, -size, size * 2, size * 2);
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.75);
  ctx.lineTo(size * 0.75, 0);
  ctx.lineTo(0, size * 0.75);
  ctx.lineTo(-size * 0.75, 0);
  ctx.closePath();
  ctx.fillStyle = ink;
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Atlas-style border: outer rule, graduated strip, inner rule and corner medallions. */
export default defineFrame({
  id: 'ornate',
  name: 'Ornate atlas border',
  inset: 40,
  draw({ ctx, width, height, theme }) {
    const ink = theme.ink;
    const paper = mix(theme.paper.color, '#ffffff', 0.25);
    const o = 8;
    const bandOuter = o + 3;
    const bandInner = bandOuter + GAP;

    // Paper-colored band behind the strip so land never shows through it.
    ctx.save();
    ctx.fillStyle = rgba(paper, 0.88);
    ctx.fillRect(0, 0, width, bandInner + 12);
    ctx.fillRect(0, height - bandInner - 12, width, bandInner + 12);
    ctx.fillRect(0, 0, bandInner + 12, height);
    ctx.fillRect(width - bandInner - 12, 0, bandInner + 12, height);
    ctx.restore();

    rect(ctx, o, o, width - o * 2, height - o * 2, { stroke: ink, width: 3 });
    rect(ctx, bandOuter, bandOuter, width - bandOuter * 2, height - bandOuter * 2, { stroke: ink, width: 0.9 });
    rect(ctx, bandInner, bandInner, width - bandInner * 2, height - bandInner * 2, { stroke: ink, width: 1.6 });

    const t = GAP - 2.5;
    const span = (len: number) => len - bandOuter * 2 - 8;
    strip(ctx, bandOuter + 4, bandOuter + 1.8, span(width), t, false, ink);
    strip(ctx, bandOuter + 4, height - bandOuter - 1.8 - t, span(width), t, false, ink);
    strip(ctx, bandOuter + 1.8, bandOuter + 4, span(height), t, true, ink);
    strip(ctx, width - bandOuter - 1.8 - t, bandOuter + 4, span(height), t, true, ink);

    const c = 13;
    const cx = bandOuter + 8;
    for (const [x, y] of [
      [cx, cx],
      [width - cx, cx],
      [cx, height - cx],
      [width - cx, height - cx],
    ] as const) {
      cornerOrnament(ctx, x, y, c, ink, paper);
    }
  },
});
