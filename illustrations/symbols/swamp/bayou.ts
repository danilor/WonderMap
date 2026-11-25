import { defineSymbol } from '../../kit/define';
import { REED, drawReeds } from '../../parts/nature-marsh';
import { drawMangrove, drawStiltHut, drawWillow } from '../../parts/nature-bayou';
import { WATER, drawPool } from '../../parts/nature-water';
import { FOLIAGE } from '../../parts/tree';
import type { Ctx2D, Rng } from '../../kit/types';

function shallows(ctx: Ctx2D, rand: Rng, cx: number, cy: number, rx: number, ry: number): void {
  drawPool(ctx, rand, { cx, cy, rx, ry, pal: WATER.murk, lumpy: 0.6, ripples: 2, glints: 1 });
}

const willow = defineSymbol({
  id: 'swamp.willow',
  name: 'Weeping willow',
  category: 'swamp',
  size: [72, 76],
  anchor: [0.5, 0.92],
  order: 90,
  tags: ['willow', 'weeping willow', 'tree', 'swamp', 'marsh', 'drooping', 'hanging', 'bog', 'riverside'],
  placement: 'land',
  variants: 5,
  draw({ ctx, rand, variant }) {
    switch (variant % 5) {
      case 0:
        shallows(ctx, rand, 36, 70, 25, 6);
        drawWillow(ctx, { cx: 36, baseY: 69, w: 66, h: 64, leaf: FOLIAGE.swamp, rand, shadow: false });
        break;
      case 1:
        drawWillow(ctx, { cx: 36, baseY: 69, w: 54, h: 66, leaf: FOLIAGE.olive, rand, skirt: 0.75, lean: -0.06 });
        break;
      case 2:
        drawWillow(ctx, { cx: 36, baseY: 69, w: 70, h: 54, leaf: FOLIAGE.swamp, rand });
        break;
      case 3:
        shallows(ctx, rand, 36, 70, 22, 5.5);
        drawWillow(ctx, { cx: 35, baseY: 69, w: 60, h: 66, leaf: FOLIAGE.dark, rand, lean: 0.08, shadow: false });
        break;
      default:
        drawWillow(ctx, { cx: 36, baseY: 69, w: 62, h: 62, leaf: '#8f9a3c', rand, skirt: 0.9 });
        break;
    }
  },
});

const mangrove = defineSymbol({
  id: 'swamp.mangrove',
  name: 'Mangrove',
  category: 'swamp',
  size: [72, 72],
  anchor: [0.5, 0.9],
  order: 100,
  tags: ['mangrove', 'stilt roots', 'roots', 'tree', 'swamp', 'mangrove swamp', 'bayou', 'tropical', 'water tree'],
  placement: 'land',
  variants: 4,
  draw({ ctx, rand, variant }) {
    shallows(ctx, rand, 36, 65, 31, 8);
    switch (variant % 4) {
      case 0:
        drawMangrove(ctx, { cx: 36, baseY: 65, w: 64, h: 36, leaf: '#4a7a3a', rand, roots: 7, rootH: 26 });
        break;
      case 1:
        drawMangrove(ctx, { cx: 36, baseY: 65, w: 68, h: 30, leaf: '#3f6a34', rand, roots: 9, rootH: 22 });
        break;
      case 2:
        drawMangrove(ctx, { cx: 21, baseY: 65, w: 38, h: 28, leaf: '#4a7a3a', rand, roots: 5, rootH: 20 });
        drawMangrove(ctx, { cx: 50, baseY: 66, w: 44, h: 32, leaf: '#3f6a34', rand, roots: 5, rootH: 24 });
        break;
      default:
        drawMangrove(ctx, { cx: 36, baseY: 65, w: 54, h: 32, leaf: '#55803a', rand, roots: 6, rootH: 32 });
        break;
    }
  },
});

const hut = defineSymbol({
  id: 'swamp.hut',
  name: 'Witch hut on stilts',
  category: 'swamp',
  size: [72, 88],
  anchor: [0.5, 0.9],
  order: 110,
  tags: ['hut', 'witch', 'witch hut', 'stilt house', 'stilts', 'shack', 'cabin', 'swamp', 'bog', 'hermit', 'settlement', 'house'],
  placement: 'land',
  variants: 4,
  draw({ ctx, rand, variant }) {
    shallows(ctx, rand, 36, 79, 29, 7);
    const base = { cx: 36, groundY: 78, rand };
    switch (variant % 4) {
      case 0:
        drawStiltHut(ctx, { ...base, a: 22, b: 18, lift: 18, wallH: 13, roofH: 15, wall: '#8f7b5a', roof: '#b99a55', lantern: true });
        break;
      case 1:
        drawStiltHut(ctx, { ...base, a: 18, b: 16, lift: 19, wallH: 12, roofH: 14, wall: '#7d6a4c', roof: '#6b8a47', hip: true });
        break;
      case 2:
        drawStiltHut(ctx, { ...base, a: 24, b: 19, lift: 17, wallH: 13, roofH: 14, wall: '#9a8564', roof: '#7c5a3c', ridge: 'y', lantern: true });
        break;
      default:
        drawStiltHut(ctx, { ...base, a: 16, b: 14, lift: 22, wallH: 12, roofH: 13, wall: '#867150', roof: '#5f6b7a', lantern: true });
        break;
    }
    drawReeds(ctx, { cx: 9, baseY: 82, w: 10, h: 18, blades: 4, cattails: 1, pal: REED.green, rand, shadow: false });
    drawReeds(ctx, { cx: 63, baseY: 83, w: 10, h: 16, blades: 4, cattails: 1, pal: REED.green, rand, shadow: false });
  },
});

export default [willow, mangrove, hut];
