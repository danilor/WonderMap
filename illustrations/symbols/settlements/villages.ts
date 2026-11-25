import { defineSymbol } from '../../kit/define';
import { softBlob } from '../../kit/draw';
import { TAU } from '../../kit/math';
import type { DrawContext, SymbolDef } from '../../kit/types';
import { ROOF, WALL, drawHouse } from '../../parts/building';
import { FOLIAGE, drawRoundTree } from '../../parts/tree';

const INK = '#2a2015';

interface ClusterSpec {
  id: string;
  name: string;
  size: readonly [number, number];
  houses: number;
  /** Larger values make bigger houses. */
  scale: number;
  trees: number;
  order: number;
  tags: string[];
  roofs: readonly string[];
}

const ROOFS = [ROOF.red, ROOF.brown, ROOF.slate, ROOF.thatch, ROOF.teal, ROOF.blue];
const WALLS = [WALL.plaster, WALL.timber, WALL.white, WALL.stone];

interface Spot {
  x: number;
  y: number;
  kind: 'house' | 'tree';
}

/** Houses and a few trees packed around a dirt patch, drawn back to front. */
function cluster(s: ClusterSpec): SymbolDef {
  return defineSymbol({
    id: s.id,
    name: s.name,
    category: 'settlements',
    size: s.size,
    anchor: [0.5, 0.86],
    order: s.order,
    tags: ['settlement', ...s.tags],
    placement: 'land',
    variants: 6,
    draw({ ctx, w, h, rand }: DrawContext) {
      softBlob(ctx, w / 2, h * 0.7, w * 0.52, h * 0.28, '#7c5d34', 0.38);

      const spots: Spot[] = [];
      const minDx = 17 * s.scale;
      const minDy = 8 * s.scale;
      for (let guard = 0; spots.length < s.houses && guard < 600; guard++) {
        const a = rand.range(0, TAU);
        const r = Math.sqrt(rand.next());
        const x = w / 2 + Math.cos(a) * r * w * 0.34;
        const y = h * 0.64 + Math.sin(a) * r * h * 0.2;
        if (spots.some((p) => Math.abs(p.x - x) < minDx && Math.abs(p.y - y) < minDy)) continue;
        spots.push({ x, y, kind: 'house' });
      }
      for (let i = 0; i < s.trees; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const x = w / 2 + side * rand.range(0.34, 0.46) * w;
        // Keep the whole 26 px crown inside the box.
        spots.push({ x: Math.min(w - 16, Math.max(16, x)), y: h * rand.range(0.5, 0.82), kind: 'tree' });
      }
      spots.sort((p, q) => p.y - q.y);

      for (const p of spots) {
        if (p.kind === 'tree') {
          drawRoundTree(ctx, { cx: p.x, baseY: p.y, w: 26, h: 30, leaf: FOLIAGE.green, ink: INK, rand: rand.fork(Math.round(p.x)) });
          continue;
        }
        const k = s.scale * rand.range(0.85, 1.15);
        drawHouse(ctx, {
          x: p.x,
          y: p.y,
          a: rand.range(12, 18) * k,
          b: rand.range(10, 14) * k,
          wallH: rand.range(7, 9.5) * k,
          roofH: rand.range(7, 10) * k,
          wall: rand.pick(WALLS),
          roof: rand.pick(s.roofs),
          ink: INK,
          chimney: rand.chance(0.55),
          rand,
        });
      }
    },
  });
}

export default [
  cluster({ id: 'settlement.hamlet', name: 'Hamlet', size: [84, 64], houses: 3, scale: 0.8, trees: 2, order: 10, tags: ['hamlet', 'village', 'small'], roofs: [ROOF.thatch, ROOF.brown] }),
  cluster({ id: 'settlement.village', name: 'Village', size: [112, 80], houses: 5, scale: 0.9, trees: 3, order: 20, tags: ['village'], roofs: [ROOF.thatch, ROOF.brown, ROOF.red] }),
  cluster({ id: 'settlement.town', name: 'Town', size: [144, 100], houses: 9, scale: 1, trees: 2, order: 30, tags: ['town'], roofs: ROOFS }),
];
