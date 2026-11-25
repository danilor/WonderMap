import { defineSymbol } from '../../kit/define';
import type { SymbolDef } from '../../kit/types';
import { HOMESTEAD_SIZE, drawField, drawHaystack, drawHomestead, fieldQuad, type CropKind, type HayKind } from '../../parts/nature-farm';

interface PatchSpec {
  w: number;
  h: number;
  rows: number;
  skew: number;
  tilt: number;
}

const PATCHES: PatchSpec[] = [
  { w: 50, h: 30, rows: 4, skew: 2, tilt: 0 },
  { w: 54, h: 32, rows: 5, skew: -3, tilt: 3 },
  { w: 40, h: 34, rows: 4, skew: 3, tilt: -2 },
  { w: 52, h: 26, rows: 3, skew: 0, tilt: 2 },
  { w: 46, h: 36, rows: 5, skew: -2, tilt: 0 },
  { w: 54, h: 30, rows: 4, skew: 4, tilt: -3 },
];

function crop(id: string, name: string, order: number, kinds: CropKind[], soil: string, tags: string[]): SymbolDef {
  return defineSymbol({
    id,
    name,
    category: 'vegetation',
    size: [64, 54],
    anchor: [0.5, 0.74],
    order,
    tags: ['crop', 'crops', 'farm', 'field', 'farmland', ...tags],
    placement: 'land',
    variants: 6,
    draw({ ctx, w, h, rand, variant }) {
      const p = PATCHES[variant % PATCHES.length]!;
      drawField(ctx, {
        quad: fieldQuad(w / 2, h - 7 - p.h / 2, p.w, p.h, p.skew, p.tilt),
        rows: p.rows,
        kind: kinds[variant % kinds.length]!,
        soil,
        thickness: 2.6,
        rand,
      });
    },
  });
}

interface FieldSpec extends PatchSpec {
  kind: CropKind;
}

const FIELDS: FieldSpec[] = [
  { w: 62, h: 38, rows: 7, skew: 3, tilt: 0, kind: 'plowed' },
  { w: 58, h: 36, rows: 6, skew: -3, tilt: 4, kind: 'sprouts' },
  { w: 64, h: 32, rows: 6, skew: 0, tilt: -6, kind: 'plowed' },
  { w: 56, h: 40, rows: 7, skew: 4, tilt: 3, kind: 'stubble' },
  { w: 48, h: 40, rows: 7, skew: -2, tilt: 5, kind: 'plowed' },
  { w: 64, h: 36, rows: 6, skew: 2, tilt: -3, kind: 'sprouts' },
];

const field = defineSymbol({
  id: 'farm.field',
  name: 'Plowed Field',
  category: 'vegetation',
  size: [76, 50],
  anchor: [0.5, 0.5],
  layer: 'ground',
  order: 20,
  tags: ['farm', 'field', 'plowed', 'farmland', 'soil', 'furrows', 'crop'],
  placement: 'land',
  rotatable: true,
  variants: 6,
  draw({ ctx, w, h, rand, variant }) {
    const f = FIELDS[variant % FIELDS.length]!;
    drawField(ctx, { quad: fieldQuad(w / 2, h / 2, f.w, f.h, f.skew, f.tilt), rows: f.rows, kind: f.kind, soil: variant % 2 ? '#86593a' : '#7d5733', rand });
  },
});

interface HaySpec {
  kind: HayKind;
  count?: number;
  bulge?: number;
  small?: boolean;
  dark?: boolean;
}

const hay = (id: string, name: string, order: number, size: [number, number], specs: HaySpec[], tags: string[]): SymbolDef =>
  defineSymbol({
    id,
    name,
    category: 'vegetation',
    size,
    anchor: [0.5, 0.86],
    order,
    tags: ['hay', 'farm', 'straw', ...tags],
    placement: 'land',
    variants: specs.length,
    draw({ ctx, w, h, rand, variant }) {
      const s = specs[variant % specs.length]!;
      const stacked = s.kind === 'round' || s.kind === 'bales';
      drawHaystack(ctx, {
        cx: w / 2,
        baseY: h * 0.84,
        w: w * (stacked ? 0.92 : s.small ? 0.62 : 0.78),
        h: h * (s.kind === 'cone' ? (s.small ? 0.66 : 0.74) : s.kind === 'dome' ? (s.small ? 0.46 : 0.58 + (s.bulge ?? 0) * 0.14) : 0.7),
        kind: s.kind,
        count: s.count,
        bulge: s.bulge,
        straw: s.dark ? '#c9a24f' : '#dcb55c',
        rand,
      });
    },
  });

interface HomeSpec {
  layout: number;
  kinds: [CropKind, CropKind];
  barnWall: string;
  barnRoof: string;
  houseWall: string;
  houseRoof: string;
  hay: HayKind;
}

const HOMES: HomeSpec[] = [
  { layout: 0, kinds: ['wheat', 'plowed'], barnWall: '#b0482f', barnRoof: '#6a5a52', houseWall: '#e4d3ae', houseRoof: '#b2503a', hay: 'dome' },
  { layout: 1, kinds: ['lettuce', 'wheat'], barnWall: '#9a4a36', barnRoof: '#5f6b7a', houseWall: '#efe6d2', houseRoof: '#7c5a3c', hay: 'cone' },
  { layout: 2, kinds: ['wheat', 'cabbage'], barnWall: '#8c6a48', barnRoof: '#7c5a3c', houseWall: '#c9a67a', houseRoof: '#b99a55', hay: 'bales' },
  { layout: 0, kinds: ['cabbage', 'plowed'], barnWall: '#a8523a', barnRoof: '#5f6b7a', houseWall: '#b8b3a6', houseRoof: '#b2503a', hay: 'cone' },
  { layout: 1, kinds: ['pumpkin', 'wheat'], barnWall: '#b0482f', barnRoof: '#7c5a3c', houseWall: '#e4d3ae', houseRoof: '#b99a55', hay: 'round' },
  { layout: 2, kinds: ['corn', 'sprouts'], barnWall: '#7f4a3a', barnRoof: '#6a5a52', houseWall: '#efe6d2', houseRoof: '#4f8a85', hay: 'dome' },
];

const homestead = defineSymbol({
  id: 'farm.homestead',
  name: 'Homestead',
  category: 'vegetation',
  size: HOMESTEAD_SIZE,
  anchor: [0.5, 0.9],
  order: 50,
  tags: ['farm', 'farmstead', 'homestead', 'barn', 'farmhouse', 'ranch', 'settlement'],
  placement: 'land',
  variants: HOMES.length,
  draw({ ctx, rand, variant }) {
    drawHomestead(ctx, { ...HOMES[variant % HOMES.length]!, rand });
  },
});

export default [
  crop('crop.wheat', 'Wheat Field', 10, ['wheat'], '#8c6840', ['wheat', 'grain', 'golden', 'harvest']),
  crop('crop.green', 'Vegetable Patch', 12, ['lettuce', 'cabbage', 'purple'], '#7a5532', ['vegetables', 'green', 'cabbage', 'lettuce', 'garden']),
  crop('crop.corn', 'Cornfield', 14, ['corn'], '#86603a', ['corn', 'maize', 'tall']),
  crop('crop.pumpkin', 'Pumpkin Patch', 16, ['pumpkin'], '#7e5a38', ['pumpkin', 'orange', 'autumn', 'harvest']),
  field,
  homestead,
  hay(
    'farm.haystack',
    'Haystack',
    30,
    [46, 48],
    [{ kind: 'dome' }, { kind: 'cone' }, { kind: 'dome', bulge: 0.9, dark: true }, { kind: 'cone', small: true, bulge: 0.6 }, { kind: 'dome', small: true, bulge: 0.4 }, { kind: 'cone', dark: true, bulge: 1 }],
    ['haystack', 'stack', 'rick'],
  ),
  hay(
    'farm.bales',
    'Hay Bales',
    32,
    [60, 40],
    [{ kind: 'round', count: 2 }, { kind: 'bales', count: 3 }, { kind: 'round', count: 1 }, { kind: 'round', count: 3, dark: true }, { kind: 'bales', count: 2 }, { kind: 'bales', count: 1 }],
    ['bale', 'bales', 'roll'],
  ),
];
