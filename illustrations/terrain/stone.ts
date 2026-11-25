import { defineTerrain } from '../kit/define';
import { darken, lighten, rgba } from '../kit/colors';
import { TAU } from '../kit/math';
import { blotches, noiseTile, speckles, wrapped } from '../kit/texture';

export default defineTerrain({
  id: 'stone',
  name: 'Gray rock',
  swatch: '#8e8e86',
  order: 40,
  group: 'land',
  blurb: 'Bare gray rock, scree and highlands',
  colors: { base: '#8e8e87', light: '#aaaaa1', dark: '#6e6e69' },
  texture({ ctx, size, rand, seed, colors }) {
    noiseTile(ctx, size, { colors, seed, cells: 5, contrast: 1.1, grain: 0.45 });
    blotches(ctx, size, rand, { count: 12, color: darken(colors.dark, 0.2), radius: [14, 34], alpha: 0.15, squash: 0.7 });
    // Pebbles: a light cap and a dark underside.
    for (let i = 0; i < 90; i++) {
      const x = rand.range(0, size);
      const y = rand.range(0, size);
      const r = rand.range(1.4, 3.4);
      wrapped(size, x, y, r + 1, (px, py) => {
        ctx.fillStyle = rgba(darken(colors.dark, 0.3), 0.5);
        ctx.beginPath();
        ctx.ellipse(px + 0.6, py + 0.8, r, r * 0.75, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = rgba(lighten(colors.light, 0.2), 0.7);
        ctx.beginPath();
        ctx.ellipse(px, py, r, r * 0.75, 0, 0, TAU);
        ctx.fill();
      });
    }
    // Hairline cracks.
    ctx.strokeStyle = rgba(darken(colors.dark, 0.35), 0.45);
    ctx.lineWidth = 0.8;
    ctx.lineCap = 'round';
    for (let i = 0; i < 18; i++) {
      let x = rand.range(0, size);
      let y = rand.range(0, size);
      let a = rand.range(0, TAU);
      const segs = rand.int(3, 6);
      const pts: Array<[number, number]> = [[x, y]];
      for (let s = 0; s < segs; s++) {
        a += rand.range(-0.8, 0.8);
        const l = rand.range(5, 12);
        x += Math.cos(a) * l;
        y += Math.sin(a) * l;
        pts.push([x, y]);
      }
      wrapped(size, pts[0]![0], pts[0]![1], 70, (ox, oy) => {
        ctx.beginPath();
        pts.forEach((p, k) => (k === 0 ? ctx.moveTo(ox, oy) : ctx.lineTo(ox + p[0] - pts[0]![0], oy + p[1] - pts[0]![1])));
        ctx.stroke();
      });
    }
    speckles(ctx, size, rand, { count: 80, color: lighten(colors.light, 0.3), radius: [0.5, 1.1], alpha: 0.5 });
  },
});
