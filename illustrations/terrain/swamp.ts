import { defineTerrain } from '../kit/define';
import { darken, lighten, rgba } from '../kit/colors';
import { blotches, noiseTile, ticks, waves } from '../kit/texture';

export default defineTerrain({
  id: 'swamp',
  name: 'Swamp',
  swatch: '#6f7d4b',
  order: 70,
  group: 'wet',
  blurb: 'Murky bogs and marshland',
  colors: { base: '#6e7c4c', light: '#889660', dark: '#4f5d36' },
  texture({ ctx, size, rand, seed, colors }) {
    noiseTile(ctx, size, { colors, seed, cells: 4, contrast: 1.2, grain: 0.3 });
    blotches(ctx, size, rand, { count: 18, color: '#2f4a3c', radius: [14, 38], alpha: 0.28, squash: 0.6 });
    blotches(ctx, size, rand, { count: 10, color: '#6b8f86', radius: [10, 26], alpha: 0.22, squash: 0.5 });
    waves(ctx, size, rand, { count: 26, color: rgba('#a8c7c0', 1), width: 0.9, amplitude: 0.9, wavelength: 14, length: [12, 28], alpha: 0.4 });
    ticks(ctx, size, rand, { count: 300, color: darken(colors.dark, 0.25), length: [3, 7], width: 0.9, spread: 0.4, alpha: 0.55 });
    ticks(ctx, size, rand, { count: 140, color: lighten(colors.light, 0.2), length: [3, 6], width: 0.8, spread: 0.4, alpha: 0.45 });
  },
});
