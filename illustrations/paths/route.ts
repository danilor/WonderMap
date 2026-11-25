import { mix, rgba } from '../kit/colors';
import { definePathStyle } from '../kit/define';
import { line } from '../kit/draw';

export default definePathStyle({
  id: 'route',
  name: 'Sea route',
  icon: 'arrow-down-right',
  width: 3,
  minWidth: 1.5,
  maxWidth: 7,
  order: 50,
  blurb: 'A dotted trade or voyage route',
  draw({ ctx, points, widths, theme }) {
    const w = widths[Math.floor(widths.length / 2)] ?? 3;
    const color = mix(theme.ink, '#a3321f', 0.65);
    line(ctx, points, rgba(theme.label.halo, 0.6), w + 3, { dash: [0.01, w * 2.6] });
    line(ctx, points, rgba(color, 0.95), w, { dash: [0.01, w * 2.6] });
  },
});
