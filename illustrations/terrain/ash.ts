import { defineTerrain } from '../kit/define';
import { darken, lighten, rgba } from '../kit/colors';
import { TAU } from '../kit/math';
import { blotches, noiseTile, speckles, wrapped } from '../kit/texture';

export default defineTerrain({
  id: 'ash',
  name: 'Volcanic ash',
  swatch: '#4d4540',
  order: 120,
  group: 'dry',
  beach: false,
  blurb: 'Black cinder fields with glowing cracks',
  colors: { base: '#4a423e', light: '#6a5e57', dark: '#2e2825' },
  texture({ ctx, size, rand, seed, colors }) {
    noiseTile(ctx, size, { colors, seed, cells: 5, contrast: 1.2, grain: 0.45 });
    blotches(ctx, size, rand, { count: 14, color: '#000000', radius: [14, 36], alpha: 0.2, squash: 0.65 });
    blotches(ctx, size, rand, { count: 8, color: lighten(colors.light, 0.2), radius: [14, 32], alpha: 0.14, squash: 0.65 });
    // Lava seams: wide dim glow, then a thin hot core.
    for (let i = 0; i < 12; i++) {
      let a = rand.range(0, TAU);
      const pts: Array<[number, number]> = [[0, 0]];
      const n = rand.int(4, 8);
      for (let s = 0; s < n; s++) {
        a += rand.range(-0.8, 0.8);
        const l = rand.range(6, 15);
        const last = pts[pts.length - 1]!;
        pts.push([last[0] + Math.cos(a) * l, last[1] + Math.sin(a) * l]);
      }
      wrapped(size, rand.range(0, size), rand.range(0, size), 110, (ox, oy) => {
        for (const [color, width] of [
          [rgba('#e0521a', 0.28), 4],
          [rgba('#ff9a3d', 0.85), 1.1],
        ] as const) {
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          pts.forEach((p, k) => (k === 0 ? ctx.moveTo(ox, oy) : ctx.lineTo(ox + p[0], oy + p[1])));
          ctx.stroke();
        }
      });
    }
    speckles(ctx, size, rand, { count: 110, color: darken(colors.dark, 0.4), radius: [0.5, 1.3], alpha: 0.6 });
    speckles(ctx, size, rand, { count: 40, color: '#ff9a3d', radius: [0.5, 1], alpha: 0.7 });
  },
});
