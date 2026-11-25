import { defineTerrain } from '../kit/define';
import { darken, lighten } from '../kit/colors';
import { blotches, noiseTile, speckles, waves } from '../kit/texture';

export default defineTerrain({
  id: 'sand',
  name: 'Beach sand',
  swatch: '#e4d4a2',
  order: 50,
  group: 'dry',
  blurb: 'Pale sand for beaches and shores',
  colors: { base: '#e2d19f', light: '#f0e4ba', dark: '#cbb685' },
  texture({ ctx, size, rand, seed, colors }) {
    noiseTile(ctx, size, { colors, seed, cells: 3, contrast: 0.95, grain: 0.45 });
    blotches(ctx, size, rand, { count: 10, color: lighten(colors.light, 0.3), radius: [20, 48], alpha: 0.18, squash: 0.55 });
    waves(ctx, size, rand, { count: 16, color: darken(colors.dark, 0.1), width: 0.9, amplitude: 1.1, wavelength: 18, length: [24, 56], alpha: 0.26 });
    speckles(ctx, size, rand, { count: 190, color: darken(colors.dark, 0.2), radius: [0.4, 0.9], alpha: 0.55 });
    speckles(ctx, size, rand, { count: 110, color: '#fff7dc', radius: [0.4, 0.9], alpha: 0.7 });
  },
});
