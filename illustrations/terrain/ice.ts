import { defineTerrain } from '../kit/define';
import { darken, rgba } from '../kit/colors';
import { TAU } from '../kit/math';
import { blotches, noiseTile, speckles, wrapped } from '../kit/texture';

export default defineTerrain({
  id: 'ice',
  name: 'Glacial ice',
  swatch: '#b9dbe8',
  order: 90,
  group: 'cold',
  blurb: 'Blue cracked ice sheets',
  colors: { base: '#bcdce9', light: '#e2f3f9', dark: '#8fbed3' },
  texture({ ctx, size, rand, seed, colors }) {
    noiseTile(ctx, size, { colors, seed, cells: 3, contrast: 1.15, grain: 0.2 });
    blotches(ctx, size, rand, { count: 12, color: '#ffffff', radius: [18, 46], alpha: 0.3, squash: 0.6 });
    // Fracture lines: dark blue core with a bright edge.
    for (let i = 0; i < 26; i++) {
      let a = rand.range(0, TAU);
      const pts: Array<[number, number]> = [[0, 0]];
      const n = rand.int(3, 7);
      for (let s = 0; s < n; s++) {
        a += rand.range(-0.9, 0.9);
        const l = rand.range(6, 18);
        const last = pts[pts.length - 1]!;
        pts.push([last[0] + Math.cos(a) * l, last[1] + Math.sin(a) * l]);
      }
      wrapped(size, rand.range(0, size), rand.range(0, size), 120, (ox, oy) => {
        for (const [color, width, dx] of [
          ['#f6fdff', 1.6, 0.9],
          [rgba(darken(colors.dark, 0.25), 0.8), 0.9, 0],
        ] as const) {
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.lineCap = 'round';
          ctx.beginPath();
          pts.forEach((p, k) => (k === 0 ? ctx.moveTo(ox + dx, oy) : ctx.lineTo(ox + p[0] + dx, oy + p[1])));
          ctx.stroke();
        }
      });
    }
    speckles(ctx, size, rand, { count: 60, color: '#ffffff', radius: [0.5, 1.1], alpha: 0.8 });
  },
});
