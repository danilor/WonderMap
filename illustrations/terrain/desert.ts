import { defineTerrain } from '../kit/define';
import { darken, lighten } from '../kit/colors';
import { blotches, noiseTile, speckles, waves } from '../kit/texture';

export default defineTerrain({
  id: 'desert',
  name: 'Desert',
  swatch: '#dcb873',
  order: 60,
  group: 'dry',
  blurb: 'Golden dunes',
  colors: { base: '#dbb872', light: '#ecd18e', dark: '#c0984f' },
  texture({ ctx, size, rand, seed, colors }) {
    noiseTile(ctx, size, { colors, seed, cells: 3, contrast: 1.1, grain: 0.35 });
    blotches(ctx, size, rand, { count: 10, color: lighten(colors.light, 0.25), radius: [22, 50], alpha: 0.2, squash: 0.5 });
    // Long dune ripples running mostly sideways.
    waves(ctx, size, rand, { count: 22, color: darken(colors.dark, 0.2), width: 1.3, amplitude: 3.4, wavelength: 56, length: [70, 150], alpha: 0.3, angle: -0.12 });
    waves(ctx, size, rand, { count: 22, color: lighten(colors.light, 0.3), width: 1.1, amplitude: 3, wavelength: 50, length: [60, 130], alpha: 0.4, angle: -0.12 });
    speckles(ctx, size, rand, { count: 160, color: darken(colors.dark, 0.25), radius: [0.4, 0.9], alpha: 0.4 });
  },
});
