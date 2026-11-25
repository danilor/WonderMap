import { defineSymbol } from '../../kit/define';
import type { Ctx2D, Rng, SymbolDef } from '../../kit/types';
import { BERG_PROFILES, bergShape, drawBergTop, drawBergUnder, drawFloe, drawTabularBerg, type BergOptions, type BergShape } from '../../parts/relief-berg';

type BergSpec = Omit<BergOptions, 'rand' | 'profile'> & { profile: keyof typeof BERG_PROFILES };

/** Hidden ice first, then the visible parts from back to front. */
function bergs(ctx: Ctx2D, rand: Rng, list: readonly BergSpec[], limit: number): void {
  const shapes: BergShape[] = list.map((s) => bergShape({ ...s, depth: Math.min(s.depth ?? 0.8, (limit - s.waterY) / s.h), profile: BERG_PROFILES[s.profile], rand }));
  shapes.forEach((s) => drawBergUnder(ctx, s));
  shapes.slice().sort((a, b) => a.o.waterY - b.o.waterY).forEach((s) => drawBergTop(ctx, s));
}

const iceberg = defineSymbol({
  id: 'ice.iceberg',
  name: 'Iceberg',
  category: 'ice',
  size: [112, 100],
  anchor: [0.5, 0.62],
  variants: 7,
  layer: 'object',
  order: 840,
  placement: 'sea',
  tags: ['ice', 'berg', 'glacier', 'frozen', 'arctic', 'polar', 'sea', 'floating'],
  draw({ ctx, rand, variant, w, h }) {
    const cx = w / 2;
    const waterY = h * 0.62;
    const limit = h - 2;
    switch (variant % 7) {
      case 0:
        bergs(ctx, rand, [{ cx, waterY, w: 72, h: 54, profile: 'horn', depth: 0.8, snow: 0.7 }], limit);
        break;
      case 1:
        drawTabularBerg(ctx, { cx, waterY, w: 84, h: 30, rand });
        break;
      case 2:
        bergs(ctx, rand, [{ cx, waterY, w: 84, h: 48, profile: 'twin', depth: 0.85, snow: 0.65 }], limit);
        break;
      case 3:
        bergs(ctx, rand, [{ cx, waterY, w: 78, h: 42, profile: 'dome', depth: 0.9, snow: 0.8 }], limit);
        break;
      case 4:
        bergs(ctx, rand, [{ cx, waterY, w: 88, h: 46, profile: 'wedge', depth: 0.7, snow: 0.6 }], limit);
        break;
      case 5:
        bergs(ctx, rand, [
          { cx: 44, waterY: waterY - 2, w: 60, h: 48, profile: 'shard', depth: 0.8, snow: 0.7 },
          { cx: 90, waterY: waterY + 5, w: 30, h: 22, profile: 'horn', depth: 0.7, snow: 0.7 },
        ], limit);
        drawFloe(ctx, { cx: 18, cy: waterY + 12, rx: 8, ry: 4, rand, sides: 6, cracks: 0 });
        drawFloe(ctx, { cx: 62, cy: waterY + 15, rx: 5, ry: 2.8, rand, sides: 6, cracks: 0 });
        break;
      default:
        drawTabularBerg(ctx, { cx, waterY, w: 90, h: 38, step: true, rand });
    }
  },
});

interface FloeSpec {
  x: number;
  y: number;
  rx: number;
  ry: number;
  sides?: number;
  cracks?: number;
}

function floes(ctx: Ctx2D, rand: Rng, list: readonly FloeSpec[]): void {
  list.slice().sort((a, b) => a.y - b.y).forEach((f) => drawFloe(ctx, { cx: f.x, cy: f.y, rx: f.rx, ry: f.ry, rand, sides: f.sides, cracks: f.cracks }));
}

const FLOES: readonly (readonly FloeSpec[])[] = [
  [{ x: 52, y: 28, rx: 40, ry: 19, sides: 9, cracks: 2 }],
  [{ x: 34, y: 28, rx: 26, ry: 14, sides: 7, cracks: 1 }, { x: 74, y: 36, rx: 20, ry: 11, sides: 6, cracks: 1 }],
  [{ x: 22, y: 22, rx: 13, ry: 7, sides: 6, cracks: 0 }, { x: 54, y: 34, rx: 17, ry: 9, sides: 7, cracks: 1 }, { x: 82, y: 22, rx: 11, ry: 6, sides: 6, cracks: 0 }, { x: 40, y: 46, rx: 9, ry: 5, sides: 5, cracks: 0 }],
  [{ x: 32, y: 30, rx: 26, ry: 16, sides: 6, cracks: 1 }, { x: 70, y: 28, rx: 25, ry: 15, sides: 6, cracks: 1 }],
  [{ x: 14, y: 30, rx: 10, ry: 6, sides: 6, cracks: 0 }, { x: 33, y: 28, rx: 14, ry: 8, sides: 7, cracks: 0 }, { x: 56, y: 31, rx: 17, ry: 9, sides: 7, cracks: 1 }, { x: 79, y: 29, rx: 12, ry: 7, sides: 6, cracks: 0 }, { x: 94, y: 32, rx: 6, ry: 4, sides: 5, cracks: 0 }],
  [{ x: 46, y: 28, rx: 32, ry: 17, sides: 8, cracks: 2 }, { x: 88, y: 40, rx: 9, ry: 5, sides: 6, cracks: 0 }, { x: 18, y: 46, rx: 7, ry: 4, sides: 5, cracks: 0 }],
];

const floe = defineSymbol({
  id: 'ice.floe',
  name: 'Ice Floe',
  category: 'ice',
  size: [104, 64],
  anchor: [0.5, 0.5],
  variants: FLOES.length,
  layer: 'ground',
  order: 850,
  placement: 'sea',
  rotatable: true,
  tags: ['ice', 'floe', 'pack', 'frozen', 'arctic', 'polar', 'sea', 'floating', 'sheet'],
  draw({ ctx, rand, variant }) {
    floes(ctx, rand, FLOES[variant % FLOES.length]!);
  },
});

const defs: SymbolDef[] = [iceberg, floe];
export default defs;
