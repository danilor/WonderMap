import { defineSymbol } from '../../kit/define';
import type { SymbolDef } from '../../kit/types';
import { BARK } from '../../parts/tree';
import { drawBriar, drawIvy, drawLog, drawMushrooms, drawStump, drawVines, type MushroomKind, type StumpKind } from '../../parts/nature-woodland';

const COUNTS = [1, 3, 2, 4, 3, 5];

function mushrooms(id: string, name: string, kind: MushroomKind, order: number, tags: string[]): SymbolDef {
  return defineSymbol({
    id,
    name,
    category: 'vegetation',
    size: [42, 38],
    anchor: [0.5, 0.9],
    order,
    tags: ['mushroom', 'fungus', 'toadstool', 'forest', ...tags],
    placement: 'land',
    variants: 6,
    draw({ ctx, w, h, rand, variant }) {
      const count = COUNTS[variant % COUNTS.length]!;
      drawMushrooms(ctx, { cx: w / 2, baseY: h * 0.9, w: count === 1 ? w * 0.7 : w * 0.94, h: h * 0.9, kind, count, rand });
    },
  });
}

const STUMP_KINDS: StumpKind[] = ['cut', 'mossy', 'broken', 'hollow', 'cut', 'mossy'];

function stump(id: string, name: string, bark: string, wood: string, order: number, tags: string[]): SymbolDef {
  return defineSymbol({
    id,
    name,
    category: 'vegetation',
    size: [40, 38],
    anchor: [0.5, 0.92],
    order,
    tags: ['stump', 'tree', 'wood', 'forest', 'logging', ...tags],
    placement: 'land',
    variants: 6,
    draw({ ctx, w, h, rand, variant }) {
      const kind = STUMP_KINDS[variant % STUMP_KINDS.length]!;
      const tall = kind === 'broken' ? 0.44 : variant % 3 === 1 ? 0.3 : 0.4;
      drawStump(ctx, {
        cx: w / 2,
        baseY: h * 0.9,
        w: w * (variant % 4 === 0 ? 0.86 : 0.74),
        h: h * tall * rand.range(0.92, 1.08),
        kind,
        bark,
        wood,
        rand,
      });
    },
  });
}

function log(id: string, name: string, bark: string, wood: string, mossy: boolean, order: number, tags: string[]): SymbolDef {
  return defineSymbol({
    id,
    name,
    category: 'vegetation',
    size: [66, 34],
    anchor: [0.5, 0.9],
    order,
    tags: ['log', 'fallen', 'tree', 'wood', 'forest', ...tags],
    placement: 'land',
    rotatable: true,
    variants: 6,
    draw({ ctx, w, h, rand, variant }) {
      const thick = h * (variant % 3 === 2 ? 0.5 : 0.62);
      drawLog(ctx, {
        cx: w / 2,
        baseY: h * 0.9,
        w: w * (variant % 3 === 1 ? 0.8 : 0.92),
        h: thick,
        bark,
        wood,
        rand,
        moss: mossy || variant % 3 === 1,
        stubs: variant % 2 === 0 ? 2 : 0,
        flip: variant >= 3,
        fungi: variant % 3 === 2 ? '#e0a050' : undefined,
        tilt: (variant % 3 - 1) * 0.04,
      });
    },
  });
}

const briar = (id: string, name: string, order: number, mode: 'plain' | 'rose' | 'berry', tags: string[]): SymbolDef =>
  defineSymbol({
    id,
    name,
    category: 'vegetation',
    size: [52, 44],
    anchor: [0.5, 0.9],
    order,
    tags: ['briar', 'thorn', 'bramble', 'brambles', 'bush', ...tags],
    placement: 'land',
    variants: 6,
    draw({ ctx, w, h, rand, variant }) {
      drawBriar(ctx, {
        cx: w / 2,
        baseY: h * 0.9,
        w: w * (variant % 3 === 1 ? 0.96 : 0.86),
        h: h * (variant % 3 === 1 ? 0.62 : 0.8),
        cane: variant % 2 ? '#5b3a30' : '#4e3b42',
        leaf: mode === 'berry' ? '#4f7f33' : '#62903a',
        bloom: mode === 'rose' ? (variant % 2 ? '#f4a6c0' : '#fbf1e6') : undefined,
        berry: mode === 'berry' ? '#3a2a5c' : undefined,
        rand,
      });
    },
  });

const ivy = defineSymbol({
  id: 'plant.ivy',
  name: 'Ivy',
  category: 'vegetation',
  size: [46, 36],
  anchor: [0.5, 0.9],
  order: 90,
  tags: ['ivy', 'vine', 'creeper', 'ground cover', 'plant'],
  placement: 'land',
  variants: 6,
  draw({ ctx, w, h, rand, variant }) {
    drawIvy(ctx, {
      cx: w / 2,
      baseY: h * 0.9,
      w: w * (variant % 3 === 1 ? 0.98 : 0.84),
      h: h * (variant % 3 === 1 ? 0.78 : 0.94),
      leaf: variant % 2 ? '#4c8a3a' : '#5f9a3c',
      count: variant % 3 === 1 ? 26 : 20,
      rand,
    });
  },
});

const vines = (id: string, name: string, order: number, leaf: string, extra: { fruit?: string; bloom?: string }, tags: string[]): SymbolDef =>
  defineSymbol({
    id,
    name,
    category: 'vegetation',
    size: [50, 38],
    anchor: [0.5, 0.9],
    order,
    tags: ['vine', 'vines', 'creeper', 'plant', ...tags],
    placement: 'land',
    variants: 6,
    draw({ ctx, w, h, rand, variant }) {
      drawVines(ctx, {
        cx: w / 2,
        baseY: h * 0.9,
        w: w * (variant % 3 === 1 ? 1 : 0.88),
        h,
        leaf,
        stems: 4 + (variant % 3),
        fruit: extra.fruit,
        bloom: extra.bloom,
        rand,
      });
    },
  });

export default [
  mushrooms('plant.mushroom', 'Fly Agaric', 'red', 10, ['red', 'amanita', 'poisonous']),
  mushrooms('plant.mushroom.brown', 'Brown Mushrooms', 'brown', 20, ['brown', 'porcini', 'edible']),
  mushrooms('plant.mushroom.orange', 'Orange Mushrooms', 'orange', 30, ['orange', 'chanterelle']),
  mushrooms('plant.mushroom.purple', 'Violet Mushrooms', 'purple', 40, ['purple', 'violet', 'magic']),
  mushrooms('plant.mushroom.glow', 'Glowshrooms', 'glow', 50, ['glow', 'glowing', 'cave', 'magic', 'blue']),
  stump('plant.stump', 'Tree Stump', BARK.brown, '#dcb987', 60, ['brown']),
  stump('plant.stump.birch', 'Birch Stump', BARK.birch, '#e8cf9c', 65, ['birch', 'white']),
  log('plant.log', 'Fallen Log', BARK.brown, '#d9b684', false, 70, ['brown']),
  log('plant.log.mossy', 'Mossy Log', '#6a5a46', '#cfae7c', true, 75, ['moss', 'mossy', 'gray']),
  briar('plant.briar', 'Briar Thicket', 80, 'plain', ['thorny', 'dark']),
  briar('plant.briar.rose', 'Wild Roses', 82, 'rose', ['rose', 'flowering', 'pink']),
  briar('plant.briar.berry', 'Bramble Berries', 84, 'berry', ['berry', 'blackberry', 'fruit']),
  ivy,
  vines('plant.vines', 'Creeping Vines', 92, '#5a9a3a', {}, ['green', 'ground cover']),
  vines('plant.vines.grape', 'Grape Vines', 94, '#5f9a35', { fruit: '#5b3a8a' }, ['grape', 'grapes', 'fruit', 'vineyard']),
  vines('plant.vines.flower', 'Flowering Vines', 96, '#4f8f3c', { bloom: '#f2a2c0' }, ['flower', 'flowering', 'pink', 'morning glory']),
];
