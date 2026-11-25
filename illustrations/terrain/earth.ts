import { defineTerrain } from '../kit/define';
import { darken, lighten } from '../kit/colors';
import { blotches, noiseTile, speckles, ticks } from '../kit/texture';

export default defineTerrain({
  id: 'earth',
  name: 'Brown earth',
  swatch: '#a98a5c',
  order: 20,
  group: 'land',
  blurb: 'Dry brown farmland, steppe and badlands',
  colors: { base: '#aa8b5d', light: '#c3a574', dark: '#8a6c43' },
  texture({ ctx, size, rand, seed, colors }) {
    noiseTile(ctx, size, { colors, seed, cells: 5, contrast: 1.1, grain: 0.4 });
    blotches(ctx, size, rand, { count: 14, color: darken(colors.dark, 0.1), radius: [14, 38], alpha: 0.14, squash: 0.65 });
    ticks(ctx, size, rand, { count: 300, color: darken(colors.dark, 0.18), length: [2, 5], width: 0.9, spread: 1.2, alpha: 0.45 });
    speckles(ctx, size, rand, { count: 90, color: lighten(colors.light, 0.25), radius: [0.6, 1.3], alpha: 0.55 });
    speckles(ctx, size, rand, { count: 60, color: darken(colors.dark, 0.3), radius: [0.6, 1.4], alpha: 0.45 });
  },
});
