import { defineTerrain } from '../kit/define';
import { darken, lighten } from '../kit/colors';
import { blotches, noiseTile, speckles, ticks } from '../kit/texture';

export default defineTerrain({
  id: 'grass',
  name: 'Grassland',
  swatch: '#8fae58',
  order: 10,
  group: 'land',
  blurb: 'Green meadows and plains',
  colors: { base: '#8aa957', light: '#a3c068', dark: '#6c8c45' },
  texture({ ctx, size, rand, seed, colors }) {
    noiseTile(ctx, size, { colors, seed, cells: 4, contrast: 1.05, grain: 0.3 });
    blotches(ctx, size, rand, { count: 16, color: colors.light, radius: [18, 44], alpha: 0.16, squash: 0.7 });
    ticks(ctx, size, rand, { count: 560, color: darken(colors.dark, 0.1), length: [3, 6.5], width: 0.9, spread: 0.55, alpha: 0.5 });
    ticks(ctx, size, rand, { count: 280, color: lighten(colors.light, 0.25), length: [2.5, 5], width: 0.8, spread: 0.55, alpha: 0.5 });
    speckles(ctx, size, rand, { count: 26, color: '#f1e9b0', radius: [0.7, 1.2], alpha: 0.65 });
  },
});
