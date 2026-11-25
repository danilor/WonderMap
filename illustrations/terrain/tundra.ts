import { defineTerrain } from '../kit/define';
import { darken, lighten } from '../kit/colors';
import { blotches, noiseTile, speckles, ticks } from '../kit/texture';

export default defineTerrain({
  id: 'tundra',
  name: 'Tundra',
  swatch: '#a9b79c',
  order: 100,
  group: 'cold',
  blurb: 'Frosty moss and thin snow',
  colors: { base: '#a8b69b', light: '#cfdac4', dark: '#84967a' },
  texture({ ctx, size, rand, seed, colors }) {
    noiseTile(ctx, size, { colors, seed, cells: 4, contrast: 1.15, grain: 0.35 });
    blotches(ctx, size, rand, { count: 16, color: '#f3f8fa', radius: [14, 40], alpha: 0.32, squash: 0.6 });
    ticks(ctx, size, rand, { count: 360, color: darken(colors.dark, 0.2), length: [2.5, 5.5], width: 0.9, spread: 0.7, alpha: 0.5 });
    ticks(ctx, size, rand, { count: 160, color: lighten(colors.light, 0.3), length: [2, 4.5], width: 0.9, spread: 0.7, alpha: 0.6 });
    speckles(ctx, size, rand, { count: 70, color: '#ffffff', radius: [0.5, 1.1], alpha: 0.7 });
  },
});
