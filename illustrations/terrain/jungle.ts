import { defineTerrain } from '../kit/define';
import { darken, lighten } from '../kit/colors';
import { blotches, noiseTile, speckles, ticks } from '../kit/texture';

export default defineTerrain({
  id: 'jungle',
  name: 'Jungle floor',
  swatch: '#4f7b3b',
  order: 110,
  group: 'wet',
  blurb: 'Lush, dark tropical green',
  colors: { base: '#4d7a3a', light: '#66995a', dark: '#385d2b' },
  texture({ ctx, size, rand, seed, colors }) {
    noiseTile(ctx, size, { colors, seed, cells: 5, contrast: 1.25, grain: 0.4 });
    blotches(ctx, size, rand, { count: 22, color: darken(colors.dark, 0.3), radius: [10, 30], alpha: 0.24, squash: 0.8 });
    blotches(ctx, size, rand, { count: 12, color: lighten(colors.light, 0.15), radius: [10, 26], alpha: 0.2, squash: 0.8 });
    ticks(ctx, size, rand, { count: 520, color: darken(colors.dark, 0.3), length: [3, 7], width: 1, spread: 1.0, alpha: 0.5 });
    ticks(ctx, size, rand, { count: 220, color: lighten(colors.light, 0.25), length: [3, 6], width: 0.9, spread: 1.0, alpha: 0.45 });
    speckles(ctx, size, rand, { count: 14, color: '#f0a1b2', radius: [0.8, 1.4], alpha: 0.7 });
  },
});
