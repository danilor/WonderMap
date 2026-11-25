import { defineSymbol } from '../../kit/define';
import type { SymbolDef } from '../../kit/types';
import { drawFern } from '../../parts/nature-foliage';

interface FernSpec {
  id: string;
  name: string;
  leaf: string;
  order: number;
  tags: string[];
  size: [number, number];
  fronds: [number, number];
  tall: number;
}

function fern(s: FernSpec): SymbolDef {
  return defineSymbol({
    id: s.id,
    name: s.name,
    category: 'vegetation',
    size: s.size,
    anchor: [0.5, 0.9],
    order: s.order,
    tags: ['fern', 'plant', 'undergrowth', ...s.tags],
    placement: 'land',
    variants: 6,
    draw({ ctx, w, h, rand, variant }) {
      drawFern(ctx, {
        cx: w / 2,
        baseY: h * 0.9,
        w: w * (variant % 3 === 1 ? 0.98 : 0.86),
        h: h * s.tall * rand.range(0.9, 1.05) * (variant % 3 === 2 ? 1.08 : 1),
        fronds: variant % 3 === 0 ? s.fronds[0] : rand.int(s.fronds[0], s.fronds[1]),
        leaf: s.leaf,
        rand,
      });
    },
  });
}

export default [
  fern({ id: 'plant.fern', name: 'Fern', leaf: '#5f9a3c', order: 10, tags: ['green', 'forest'], size: [46, 40], fronds: [5, 7], tall: 0.82 }),
  fern({ id: 'plant.fern.dark', name: 'Deep Fern', leaf: '#3f7a3c', order: 20, tags: ['dark', 'jungle', 'forest'], size: [46, 40], fronds: [5, 7], tall: 0.82 }),
  fern({ id: 'plant.fern.golden', name: 'Autumn Fern', leaf: '#b8923a', order: 30, tags: ['autumn', 'golden', 'brown', 'bracken'], size: [46, 40], fronds: [5, 7], tall: 0.82 }),
  fern({ id: 'plant.bracken', name: 'Tall Bracken', leaf: '#6e9a3a', order: 40, tags: ['bracken', 'tall', 'moor'], size: [44, 52], fronds: [6, 8], tall: 0.94 }),
];
