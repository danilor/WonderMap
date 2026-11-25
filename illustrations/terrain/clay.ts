import { defineTerrain } from '../kit/define';
import { darken, lighten } from '../kit/colors';
import { blotches, noiseTile, speckles, waves } from '../kit/texture';

export default defineTerrain({
  id: 'clay',
  name: 'Red lands',
  swatch: '#b4623f',
  order: 30,
  group: 'dry',
  blurb: 'Red clay, canyons and scorched country',
  colors: { base: '#b0603f', light: '#cb7b52', dark: '#8b4630' },
  texture({ ctx, size, rand, seed, colors }) {
    noiseTile(ctx, size, { colors, seed, cells: 4, contrast: 1.15, grain: 0.35 });
    blotches(ctx, size, rand, { count: 14, color: darken(colors.dark, 0.15), radius: [16, 40], alpha: 0.16, squash: 0.6 });
    waves(ctx, size, rand, { count: 26, color: darken(colors.dark, 0.2), width: 1, amplitude: 1.6, wavelength: 22, length: [26, 60], alpha: 0.32 });
    waves(ctx, size, rand, { count: 18, color: lighten(colors.light, 0.2), width: 0.9, amplitude: 1.4, wavelength: 20, length: [20, 46], alpha: 0.28 });
    speckles(ctx, size, rand, { count: 70, color: lighten(colors.light, 0.3), radius: [0.6, 1.2], alpha: 0.5 });
  },
});
