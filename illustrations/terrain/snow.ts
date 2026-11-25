import { defineTerrain } from '../kit/define';
import { darken, lighten } from '../kit/colors';
import { blotches, noiseTile, speckles } from '../kit/texture';

export default defineTerrain({
  id: 'snow',
  name: 'Snow',
  swatch: '#eef4f7',
  order: 80,
  group: 'cold',
  blurb: 'Deep fresh snow',
  colors: { base: '#e9f1f5', light: '#fbfdfe', dark: '#c4d6e0' },
  texture({ ctx, size, rand, seed, colors }) {
    noiseTile(ctx, size, { colors, seed, cells: 3, contrast: 0.9, grain: 0.25 });
    blotches(ctx, size, rand, { count: 14, color: '#ffffff', radius: [18, 44], alpha: 0.35, squash: 0.55 });
    blotches(ctx, size, rand, { count: 10, color: darken(colors.dark, 0.05), radius: [18, 40], alpha: 0.14, squash: 0.5 });
    speckles(ctx, size, rand, { count: 130, color: '#ffffff', radius: [0.5, 1.2], alpha: 0.85 });
    speckles(ctx, size, rand, { count: 40, color: lighten(darken(colors.dark, 0.1), 0.1), radius: [0.4, 0.9], alpha: 0.4 });
  },
});
