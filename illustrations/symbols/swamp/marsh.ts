import { defineSymbol } from '../../kit/define';
import { rgba } from '../../kit/colors';
import { ellipse, line, linearGradient, shape, taper } from '../../kit/draw';
import type { Ctx2D, Rng } from '../../kit/types';
import { INK, litOffset, quadPts } from '../../parts/nature-common';
import { REED, WISP, drawMist, drawReeds, drawWisp, glow } from '../../parts/nature-marsh';
import { WATER, drawPool } from '../../parts/nature-water';

const reeds = defineSymbol({
  id: 'swamp.reeds',
  name: 'Reeds and cattails',
  category: 'swamp',
  size: [36, 48],
  anchor: [0.5, 0.92],
  order: 40,
  tags: ['reeds', 'reed', 'cattail', 'cattails', 'bulrush', 'rushes', 'marsh', 'swamp', 'bog', 'water plant', 'grass'],
  placement: 'land',
  variants: 6,
  draw({ ctx, rand, variant }) {
    switch (variant % 6) {
      case 0:
        drawReeds(ctx, { cx: 18, baseY: 44, w: 28, h: 38, blades: 9, cattails: 0, pal: REED.green, rand });
        break;
      case 1:
        drawReeds(ctx, { cx: 18, baseY: 44, w: 26, h: 38, blades: 5, cattails: 4, pal: REED.green, rand });
        break;
      case 2:
        drawPool(ctx, rand, { cx: 18, cy: 43, rx: 16, ry: 5, pal: WATER.murk, lumpy: 0.5, ripples: 1, glints: 1 });
        drawReeds(ctx, { cx: 18, baseY: 43, w: 24, h: 38, blades: 4, cattails: 5, pal: REED.green, rand, shadow: false });
        break;
      case 3:
        drawReeds(ctx, { cx: 16, baseY: 44, w: 28, h: 36, blades: 10, cattails: 0, pal: REED.dry, rand, lean: 0.14 });
        break;
      case 4:
        drawReeds(ctx, { cx: 18, baseY: 44, w: 20, h: 40, blades: 3, cattails: 3, pal: REED.green, rand });
        break;
      default:
        drawPool(ctx, rand, { cx: 18, cy: 43, rx: 17, ry: 5, pal: WATER.murk, lumpy: 0.6, ripples: 2, glints: 1 });
        drawReeds(ctx, { cx: 18, baseY: 43, w: 32, h: 30, blades: 8, cattails: 3, pal: REED.green, rand, shadow: false });
        break;
    }
  },
});

const mist = defineSymbol({
  id: 'swamp.mist',
  name: 'Swamp mist',
  category: 'swamp',
  size: [96, 54],
  anchor: [0.5, 0.6],
  layer: 'air',
  order: 120,
  tags: ['mist', 'fog', 'haze', 'vapor', 'vapour', 'swamp', 'marsh', 'bog', 'atmosphere', 'cloud'],
  placement: 'any',
  rotatable: true,
  variants: 4,
  draw({ ctx, rand, variant }) {
    const color = '#e4eddc';
    switch (variant % 4) {
      case 0:
        drawMist(ctx, { cx: 48, cy: 28, rx: 42, ry: 13, puffs: 8, color, alpha: 0.85, rand });
        break;
      case 1:
        drawMist(ctx, { cx: 42, cy: 18, rx: 28, ry: 9, puffs: 5, color, alpha: 0.7, rand });
        drawMist(ctx, { cx: 54, cy: 36, rx: 38, ry: 12, puffs: 7, color, alpha: 0.85, rand });
        break;
      case 2:
        drawMist(ctx, { cx: 48, cy: 27, rx: 32, ry: 20, puffs: 6, color, alpha: 0.9, rand });
        break;
      default:
        drawMist(ctx, { cx: 48, cy: 27, rx: 44, ry: 9, puffs: 10, color, alpha: 0.65, rand });
        break;
    }
  },
});

/** A crooked pole with a caged lantern that glows in the dark. */
function lantern(ctx: Ctx2D, rand: Rng): void {
  const gold = WISP.amber;
  glow(ctx, 15, 25, 20, gold.glow, 0.5);
  const pole = quadPts([29, 50], [31, 30], [24, 7], 8);
  taper(ctx, pole, 5.4, 3.2, INK);
  taper(ctx, pole, 3.4, 1.7, '#6b4a2b');
  taper(ctx, litOffset(pole, 0.7), 1.1, 0.5, rgba('#c9a27a', 0.8));
  const arm = quadPts([24.5, 8], [20, 4.5], [15, 9], 5);
  taper(ctx, arm, 3.8, 2.8, INK);
  taper(ctx, arm, 2.2, 1.6, '#6b4a2b');
  line(ctx, [[15, 9], [15, 14]], INK, 2.2, { cap: 'round' });
  line(ctx, [[15, 9], [15, 14]], '#9a978a', 0.9, { cap: 'round' });
  shape(ctx, [[10.5, 18], [19.5, 18], [15, 13.2]], { fill: '#4a463e', stroke: INK, width: 1.2 });
  shape(ctx, [[11, 18], [19, 18], [19, 29], [11, 29]], {
    fill: linearGradient(ctx, 15, 18, 15, 29, ['#fff6c4', '#ffd470', '#ff9f33']),
    stroke: INK,
    width: 1.3,
  });
  for (const x of [13.4, 15, 16.6]) line(ctx, [[x, 18.4], [x, 28.6]], rgba(INK, 0.75), 0.7);
  shape(ctx, [[10.2, 29], [19.8, 29], [19.8, 31.2], [10.2, 31.2]], { fill: '#4a463e', stroke: INK, width: 1 });
  ellipse(ctx, 12.8, 20.5, 1, 2.2, { fill: '#ffffff', alpha: 0.7 });
  glow(ctx, 15, 23, 12, '#ffd470', 0.4);
  for (let i = 0; i < 3; i++) ellipse(ctx, 15 + rand.range(-9, 9), 12 + rand.range(-5, 12), 0.6, 0.6, { fill: '#fff3c4', alpha: 0.8 });
}

const wisp = defineSymbol({
  id: 'swamp.wisp',
  name: 'Will-o-the-wisp',
  category: 'swamp',
  size: [40, 52],
  anchor: [0.5, 0.8],
  layer: 'air',
  order: 130,
  tags: ['wisp', 'will-o-the-wisp', 'will o wisp', 'ghost light', 'spirit', 'light', 'glow', 'lantern', 'magic', 'swamp', 'haunted', 'spooky'],
  placement: 'any',
  variants: 5,
  draw({ ctx, rand, variant }) {
    switch (variant % 5) {
      case 0:
        drawWisp(ctx, { cx: 20, cy: 33, r: 6.5, pal: WISP.cyan, flame: 1.9, rand });
        break;
      case 1:
        drawWisp(ctx, { cx: 11, cy: 36, r: 4, pal: WISP.green, flame: 1.5, rand });
        drawWisp(ctx, { cx: 27, cy: 28, r: 5.2, pal: WISP.green, flame: 1.7, rand });
        drawWisp(ctx, { cx: 20, cy: 44, r: 3.2, pal: WISP.green, flame: 1.3, rand });
        break;
      case 2:
        drawWisp(ctx, { cx: 20, cy: 32, r: 7.5, pal: WISP.amber, flame: 1.6, rand });
        break;
      case 3:
        lantern(ctx, rand);
        break;
      default:
        drawWisp(ctx, { cx: 26, cy: 26, r: 5.4, pal: WISP.cyan, flame: 1.8, rand });
        drawWisp(ctx, { cx: 12, cy: 40, r: 3.4, pal: WISP.cyan, flame: 1.3, rand });
        break;
    }
  },
});

export default [reeds, mist, wisp];
