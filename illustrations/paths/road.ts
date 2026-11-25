import { mix, rgba } from '../kit/colors';
import { definePathStyle } from '../kit/define';
import { line } from '../kit/draw';

export default definePathStyle({
  id: 'road',
  name: 'Road',
  icon: 'signpost-split-fill',
  width: 5,
  minWidth: 2,
  maxWidth: 14,
  order: 20,
  blurb: 'A packed-earth highway with dark edges',
  draw({ ctx, points, widths, theme }) {
    const w = widths[Math.floor(widths.length / 2)] ?? 5;
    const dirt = mix(theme.paper.color, '#b88a52', 0.55);
    line(ctx, points, rgba(theme.ink, 0.6), w + 2.4);
    line(ctx, points, dirt, w);
    line(ctx, points, rgba('#ffffff', 0.22), Math.max(0.8, w * 0.35));
  },
});
