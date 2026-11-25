import { defineSymbol } from '../../kit/define';
import type { SymbolDef } from '../../kit/types';
import { drawFlowerPatch, type FlowerKind } from '../../parts/nature-foliage';

interface FlowerSpec {
  id: string;
  name: string;
  kinds: FlowerKind[];
  colors: string[];
  order: number;
  tags: string[];
  size?: [number, number];
  count?: [number, number];
  r?: number;
}

function flowers(s: FlowerSpec): SymbolDef {
  return defineSymbol({
    id: s.id,
    name: s.name,
    category: 'vegetation',
    size: s.size ?? [44, 40],
    anchor: [0.5, 0.9],
    order: s.order,
    tags: ['flower', 'flowers', 'wildflower', 'plant', ...s.tags],
    placement: 'land',
    variants: 6,
    draw({ ctx, w, h, rand, variant }) {
      const [lo, hi] = s.count ?? [6, 9];
      drawFlowerPatch(ctx, {
        cx: w / 2,
        baseY: h * 0.9,
        w: variant % 3 === 0 ? w * 0.7 : w * 0.95,
        h: h * rand.range(0.82, 0.98),
        kinds: s.kinds,
        colors: s.colors,
        count: variant % 3 === 0 ? Math.max(3, lo - 2) : rand.int(lo, hi),
        r: s.r,
        rand,
      });
    },
  });
}

export default [
  flowers({ id: 'flower.red', name: 'Red Poppies', kinds: ['poppy'], colors: ['#d63a2b', '#e4503a', '#c42a2a'], order: 10, tags: ['red', 'poppy'] }),
  flowers({ id: 'flower.yellow', name: 'Yellow Buttercups', kinds: ['buttercup'], colors: ['#f2cb2c', '#f7dc4c', '#e8b822'], order: 20, tags: ['yellow', 'buttercup', 'dandelion'] }),
  flowers({ id: 'flower.white', name: 'White Daisies', kinds: ['daisy'], colors: ['#fbf7ea', '#ffffff', '#f2eddc'], order: 30, tags: ['white', 'daisy'] }),
  flowers({ id: 'flower.purple', name: 'Lavender', kinds: ['lavender'], colors: ['#9a74d0', '#8a62c6', '#b08ae0'], order: 40, tags: ['purple', 'violet', 'lavender'], count: [5, 7] }),
  flowers({ id: 'flower.blue', name: 'Bluebells', kinds: ['bell'], colors: ['#4a78d4', '#5d8ae4', '#3f66bd'], order: 50, tags: ['blue', 'bluebell', 'bell'], count: [5, 7] }),
  flowers({ id: 'flower.tulip', name: 'Tulips', kinds: ['tulip'], colors: ['#e5456f', '#f08a3a', '#f2cb3a', '#d8353a'], order: 60, tags: ['tulip', 'pink', 'orange', 'colorful'], count: [5, 7] }),
  flowers({
    id: 'flower.meadow',
    name: 'Wildflower Meadow',
    kinds: ['poppy', 'daisy', 'buttercup', 'bell', 'lavender'],
    colors: ['#d63a2b', '#fbf7ea', '#f2cb2c', '#4a78d4', '#9a74d0'],
    order: 70,
    tags: ['meadow', 'mixed', 'colorful', 'field'],
    size: [64, 44],
    count: [10, 14],
  }),
];
