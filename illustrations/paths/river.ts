import { mix, rgba } from '../kit/colors';
import { definePathStyle } from '../kit/define';
import { shape } from '../kit/draw';
import { ribbon } from '../kit/shapes';

export default definePathStyle({
  id: 'river',
  name: 'River',
  icon: 'water',
  width: 11,
  minWidth: 3,
  maxWidth: 40,
  taper: true,
  order: 10,
  blurb: 'Flows from the first point to the last and widens toward the mouth',
  draw({ ctx, points, widths, theme }) {
    const bank = mix(theme.sea.deep, theme.ink, 0.35);
    const body = ribbon(points, widths.map((w) => w + 1.6));
    const water = ribbon(points, widths);
    const core = ribbon(
      points,
      widths.map((w) => w * 0.45),
    );
    shape(ctx, body, { fill: rgba(bank, 0.9) });
    shape(ctx, water, { fill: theme.sea.mid });
    shape(ctx, core, { fill: rgba(theme.sea.shallow, 0.55) });
  },
});
