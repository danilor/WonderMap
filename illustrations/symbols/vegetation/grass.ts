import { defineSymbol } from '../../kit/define';
import type { SymbolDef } from '../../kit/types';
import { INK } from '../../parts/nature-common';
import { drawGrassClump } from '../../parts/nature-foliage';

interface GrassPalette {
  dark: string;
  base: string;
  light: string;
  tint: string;
  seed?: string;
}

const GREEN: GrassPalette = { dark: '#4a7a2d', base: '#6ea23a', light: '#a6d15c', tint: '#4f7f30' };
const LUSH: GrassPalette = { dark: '#3b6a2b', base: '#58903a', light: '#8cbc55', tint: '#3f6b2d' };
const DRY: GrassPalette = { dark: '#9b7a33', base: '#c9a64e', light: '#ecd286', tint: '#a8873c', seed: '#e8d28c' };
const MEADOW: GrassPalette = { dark: '#52822f', base: '#78ac42', light: '#b5db6a', tint: '#58852f', seed: '#d9c872' };

interface ClumpSpec {
  id: string;
  name: string;
  pal: GrassPalette;
  size: [number, number];
  /** Tufts per sprite: [min, max]. */
  tufts: [number, number];
  /** Blade height as a fraction of the sprite height. */
  tall: number;
  blades: [number, number];
  layer: 'ground' | 'object';
  order: number;
  tags: string[];
  variants?: number;
}

function clump(s: ClumpSpec): SymbolDef {
  return defineSymbol({
    id: s.id,
    name: s.name,
    category: 'vegetation',
    size: s.size,
    anchor: [0.5, 0.9],
    layer: s.layer,
    order: s.order,
    tags: ['grass', 'plant', ...s.tags],
    placement: 'land',
    variants: s.variants ?? 6,
    draw({ ctx, w, h, rand, variant }) {
      const lone = variant % 3 === 0;
      const tufts = lone ? 1 : rand.int(s.tufts[0], s.tufts[1]);
      drawGrassClump(ctx, {
        cx: w / 2,
        baseY: h * 0.9,
        w: lone ? w * 0.55 : w * 0.9,
        h: h * s.tall * (lone ? rand.range(0.9, 1.05) : rand.range(0.88, 1)),
        tufts,
        count: rand.int(s.blades[0], s.blades[1]),
        dark: s.pal.dark,
        base: s.pal.base,
        light: s.pal.light,
        ink: INK,
        seed: s.pal.seed,
        tint: s.pal.tint,
        rand,
      });
    },
  });
}

export default [
  clump({ id: 'grass.tuft', name: 'Grass Tuft', pal: GREEN, size: [30, 24], tufts: [1, 2], tall: 0.78, blades: [5, 7], layer: 'ground', order: 10, tags: ['tuft', 'small', 'green'] }),
  clump({ id: 'grass.tufts', name: 'Grass Tufts', pal: GREEN, size: [58, 30], tufts: [3, 5], tall: 0.7, blades: [5, 7], layer: 'ground', order: 20, tags: ['tuft', 'patch', 'green', 'tufts'] }),
  clump({ id: 'grass.lush', name: 'Lush Grass', pal: LUSH, size: [44, 34], tufts: [2, 3], tall: 0.82, blades: [6, 8], layer: 'object', order: 30, tags: ['tuft', 'lush', 'dark', 'green'] }),
  clump({ id: 'grass.tall', name: 'Tall Grass', pal: MEADOW, size: [48, 52], tufts: [2, 4], tall: 0.8, blades: [6, 9], layer: 'object', order: 40, tags: ['tall', 'meadow', 'seed', 'reeds'] }),
  clump({ id: 'grass.dry', name: 'Dry Grass', pal: DRY, size: [46, 46], tufts: [2, 4], tall: 0.78, blades: [6, 8], layer: 'object', order: 50, tags: ['dry', 'tall', 'golden', 'savanna', 'steppe'] }),
  clump({ id: 'grass.dry.tuft', name: 'Dry Grass Tuft', pal: DRY, size: [30, 24], tufts: [1, 2], tall: 0.8, blades: [5, 7], layer: 'ground', order: 60, tags: ['dry', 'tuft', 'small', 'golden', 'steppe'] }),
];
