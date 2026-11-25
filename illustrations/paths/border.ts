import { mix, rgba } from '../kit/colors';
import { definePathStyle } from '../kit/define';
import { line } from '../kit/draw';

export default definePathStyle({
  id: 'border',
  name: 'Border',
  icon: 'border-outer',
  width: 3,
  minWidth: 1.5,
  maxWidth: 8,
  order: 40,
  blurb: 'Dash-dot political border with a soft glow',
  draw({ ctx, points, widths, theme }) {
    const w = widths[Math.floor(widths.length / 2)] ?? 3;
    const color = mix(theme.ink, '#8c1d1d', 0.7);
    line(ctx, points, rgba(color, 0.14), w * 4.2);
    line(ctx, points, rgba(color, 0.22), w * 2.4);
    line(ctx, points, rgba(color, 0.95), w, { cap: 'butt', dash: [w * 4, w * 1.6, w * 0.8, w * 1.6] });
  },
});
