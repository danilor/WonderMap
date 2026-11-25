import { rgba } from '../kit/colors';
import { definePathStyle } from '../kit/define';
import { line } from '../kit/draw';

export default definePathStyle({
  id: 'trail',
  name: 'Trail',
  icon: 'three-dots',
  width: 2.4,
  minWidth: 1,
  maxWidth: 6,
  order: 30,
  blurb: 'A dashed footpath',
  draw({ ctx, points, widths, theme }) {
    const w = widths[Math.floor(widths.length / 2)] ?? 2.4;
    line(ctx, points, rgba(theme.ink, 0.85), w, { cap: 'butt', dash: [w * 3.2, w * 2.6] });
  },
});
