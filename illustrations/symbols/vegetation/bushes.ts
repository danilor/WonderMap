import { defineSymbol } from '../../kit/define';
import type { SymbolDef } from '../../kit/types';
import { drawBush, drawDryBush } from '../../parts/nature-foliage';
import { FOLIAGE } from '../../parts/tree';

interface BushSpec {
  id: string;
  name: string;
  leaf: string;
  order: number;
  tags: string[];
  palette?: readonly string[];
  flowers?: readonly string[];
  berries?: string;
}

/** A leafy bush. Variants cycle through a tidy dome, a wide low shrub and a tall lumpy one. */
function bush(s: BushSpec): SymbolDef {
  return defineSymbol({
    id: s.id,
    name: s.name,
    category: 'vegetation',
    size: [48, 40],
    anchor: [0.5, 0.9],
    order: s.order,
    tags: ['bush', 'shrub', ...s.tags],
    placement: 'land',
    variants: 6,
    draw({ ctx, w, h, rand, variant }) {
      const form = (variant % 3) as 0 | 1 | 2;
      const bw = w * (form === 1 ? rand.range(0.9, 0.97) : rand.range(0.72, 0.84));
      const bh = h * (form === 1 ? 0.66 : form === 2 ? 0.9 : 0.78) * rand.range(0.95, 1.05);
      drawBush(ctx, {
        cx: w / 2 + rand.range(-1, 1),
        baseY: h * 0.9,
        w: bw,
        h: bh,
        leaf: s.leaf,
        palette: s.palette,
        form,
        rand,
        flowers: s.flowers ? { colors: s.flowers, count: rand.int(8, 13) } : undefined,
        berries: s.berries ? { color: s.berries, count: rand.int(8, 12) } : undefined,
      });
    },
  });
}

const dry = defineSymbol({
  id: 'bush.dry',
  name: 'Dry Bush',
  category: 'vegetation',
  size: [48, 40],
  anchor: [0.5, 0.9],
  order: 80,
  tags: ['bush', 'shrub', 'dry', 'dead', 'scrub', 'brush', 'wasteland'],
  placement: 'land',
  variants: 6,
  draw({ ctx, w, h, rand, variant }) {
    drawDryBush(ctx, {
      cx: w / 2,
      baseY: h * 0.9,
      w: w * rand.range(0.72, 0.9),
      h: h * (variant % 2 ? 0.8 : 0.66) * rand.range(0.95, 1.05),
      twig: '#6e5232',
      leaf: variant % 3 === 0 ? '#b79a52' : variant % 3 === 1 ? '#a89040' : '#a07a3e',
      twigs: rand.int(7, 10),
      rand,
    });
  },
});

export default [
  bush({ id: 'bush.green', name: 'Green Bush', leaf: FOLIAGE.green, order: 10, tags: ['green'] }),
  bush({ id: 'bush.dark', name: 'Dark Bush', leaf: '#4c6c34', order: 20, tags: ['dark', 'evergreen'] }),
  bush({ id: 'bush.autumn', name: 'Autumn Bush', leaf: FOLIAGE.autumn, palette: ['#c9772b', '#b4492e', '#d4a032', '#be5a2a'], order: 30, tags: ['autumn', 'fall', 'orange', 'red'] }),
  bush({ id: 'bush.flowering', name: 'Flowering Bush', leaf: '#6a9a3e', flowers: ['#ee8fb4', '#f4b6cf', '#ffffff'], order: 40, tags: ['flower', 'flowering', 'pink', 'blossom'] }),
  bush({ id: 'bush.flowering.white', name: 'White Flowering Bush', leaf: '#6a9a3e', flowers: ['#ffffff', '#fbf3d8', '#f1ecd2'], order: 50, tags: ['flower', 'flowering', 'white', 'jasmine'] }),
  bush({ id: 'bush.flowering.purple', name: 'Lilac Bush', leaf: '#628f3c', flowers: ['#a98ad6', '#c4a8e8', '#8a68c4'], order: 60, tags: ['flower', 'flowering', 'purple', 'lilac'] }),
  bush({ id: 'bush.berry', name: 'Berry Bush', leaf: '#5d9138', berries: '#c8283a', order: 70, tags: ['berry', 'berries', 'fruit', 'red'] }),
  bush({ id: 'bush.berry.blue', name: 'Blueberry Bush', leaf: '#587f36', berries: '#4a63c0', order: 75, tags: ['berry', 'berries', 'fruit', 'blue'] }),
  dry,
];
