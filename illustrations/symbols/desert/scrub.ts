import { defineSymbol } from '../../kit/define';
import { rgba } from '../../kit/colors';
import { line } from '../../kit/draw';
import { drawBeastSkull } from '../../parts/nature-bones';
import { quadPts } from '../../parts/nature-common';
import { drift } from '../../parts/nature-pyramid';
import { sandRock } from '../../parts/nature-sand';
import { drawTumbleweed, drawVulture } from '../../parts/nature-scrub';
import { drawSnag, SNAG_BARK } from '../../parts/nature-snag';
import { dryTuft } from '../../parts/nature-stone';
import type { Ctx2D } from '../../kit/types';

/** Little trailing streaks behind a rolling ball. */
function streaks(ctx: Ctx2D, x: number, y: number, len: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const yy = y + i * 4.2 - (count - 1) * 2.1;
    const l = len * (1 - Math.abs(i - (count - 1) / 2) * 0.22);
    line(ctx, quadPts([x - l, yy + 0.6], [x - l * 0.45, yy - 0.5], [x, yy], 4), rgba('#a88a58', 0.7), 1.1, { cap: 'round' });
  }
}

const tumbleweed = defineSymbol({
  id: 'desert.tumbleweed',
  name: 'Tumbleweed',
  category: 'desert',
  size: [40, 34],
  anchor: [0.5, 0.86],
  order: 170,
  tags: ['tumbleweed', 'weed', 'brush', 'dry', 'scrub', 'wind', 'desert', 'western', 'plant'],
  placement: 'land',
  variants: 6,
  draw({ ctx, rand, variant }) {
    switch (variant % 6) {
      case 0:
        dryTuft(ctx, rand, 34, 30, 6);
        sandRock(ctx, rand, 7, 31, 2.2);
        drawTumbleweed(ctx, { cx: 20, cy: 18, r: 11, rand });
        break;
      case 1:
        streaks(ctx, 17, 15, 11, 3);
        drawTumbleweed(ctx, { cx: 28, cy: 19, r: 9.5, rand });
        drawTumbleweed(ctx, { cx: 13, cy: 24, r: 5.5, rand, tone: 'gray' });
        break;
      case 2:
        drift(ctx, rand, 20, 31, 17, 3);
        drawTumbleweed(ctx, { cx: 13, cy: 22, r: 8, rand });
        drawTumbleweed(ctx, { cx: 27, cy: 23, r: 7, rand, tone: 'gray' });
        drawTumbleweed(ctx, { cx: 20, cy: 14, r: 7, rand });
        break;
      case 3:
        streaks(ctx, 11, 14, 9, 2);
        drawTumbleweed(ctx, { cx: 22, cy: 21, r: 9, rand, lift: 6 });
        break;
      case 4:
        dryTuft(ctx, rand, 34, 30, 6);
        drawTumbleweed(ctx, { cx: 14, cy: 23, r: 6.5, rand, tone: 'gray' });
        drawTumbleweed(ctx, { cx: 27, cy: 26, r: 5, rand });
        sandRock(ctx, rand, 5, 31, 2);
        break;
      default:
        drawTumbleweed(ctx, { cx: 17, cy: 19, r: 10, rand, tone: 'green' });
        drawTumbleweed(ctx, { cx: 31, cy: 26, r: 5, rand, tone: 'gray' });
        dryTuft(ctx, rand, 6, 31, 5);
        break;
    }
  },
});

const deadTree = defineSymbol({
  id: 'desert.dead-tree',
  name: 'Dead desert tree',
  category: 'desert',
  size: [56, 64],
  anchor: [0.5, 0.9],
  order: 180,
  tags: ['dead tree', 'snag', 'bare', 'bleached', 'desert', 'withered', 'vulture', 'skull', 'charred', 'tree'],
  placement: 'land',
  variants: 6,
  draw({ ctx, rand, variant }) {
    switch (variant % 6) {
      case 0:
        dryTuft(ctx, rand, 10, 59, 7);
        sandRock(ctx, rand, 46, 60, 3);
        drawSnag(ctx, { cx: 27, baseY: 57, h: 54, w: 8, bark: SNAG_BARK.bleached, rand, limbs: 3, sideLimbs: 1, lean: 0.05 });
        break;
      case 1:
        sandRock(ctx, rand, 8, 60, 2.6);
        drawSnag(ctx, { cx: 28, baseY: 57, h: 48, w: 11, bark: SNAG_BARK.silver, rand, limbs: 2, sideLimbs: 1, lean: -0.08, hollow: true, up: 0.26, trunkFrac: 0.5, spread: 0.8 });
        dryTuft(ctx, rand, 47, 60, 6);
        break;
      case 2: {
        const tips = drawSnag(ctx, { cx: 27, baseY: 57, h: 54, w: 8, bark: SNAG_BARK.bleached, rand, limbs: 4, spread: 0.9, up: 0.3 });
        const perch = [...tips].sort((a, b) => a[1] - b[1]).find((p) => p[0] > 14 && p[0] < 44) ?? tips[0]!;
        drawVulture(ctx, perch[0] + 1, perch[1] + 0.5, 0.95);
        sandRock(ctx, rand, 44, 60, 2.6);
        break;
      }
      case 3:
        drawSnag(ctx, { cx: 25, baseY: 56, h: 44, w: 11, bark: SNAG_BARK.silver, rand, limbs: 2, sideLimbs: 1, stubs: 2, trunkFrac: 0.55, lean: 0.05 });
        drawBeastSkull(ctx, { cx: 42, cy: 53, s: 0.3, horns: 'long' });
        dryTuft(ctx, rand, 10, 59, 7);
        break;
      case 4:
        drawSnag(ctx, { cx: 28, baseY: 57, h: 52, w: 9, bark: SNAG_BARK.charred, rand, limbs: 4, spread: 1.15, lean: -0.05, up: 0.12 });
        sandRock(ctx, rand, 11, 60, 2.6, '#8f7f68');
        sandRock(ctx, rand, 45, 61, 2, '#8f7f68');
        break;
      default:
        drawSnag(ctx, { cx: 37, baseY: 57, h: 38, w: 6.5, bark: SNAG_BARK.umber, rand, limbs: 2, sideLimbs: 0, lean: 0.1 });
        drawSnag(ctx, { cx: 21, baseY: 58, h: 52, w: 8.5, bark: SNAG_BARK.bleached, rand, limbs: 3, lean: -0.06 });
        dryTuft(ctx, rand, 46, 60, 6);
        break;
    }
  },
});

export default [tumbleweed, deadTree];
