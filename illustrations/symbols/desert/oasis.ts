import { defineSymbol } from '../../kit/define';
import { drawOasis, type OasisSpec } from '../../parts/nature-oasis';

const oasis = defineSymbol({
  id: 'desert.oasis',
  name: 'Oasis',
  category: 'desert',
  size: [140, 100],
  anchor: [0.5, 0.78],
  order: 140,
  tags: ['oasis', 'water', 'pond', 'palm', 'palms', 'desert', 'lake', 'spring'],
  placement: 'land',
  variants: 6,
  draw({ ctx, rand, variant }) {
    const specs: OasisSpec[] = [
      // classic: wide pool framed by four palms
      {
        patch: { cx: 70, cy: 74, rx: 60, ry: 23 },
        pools: [{ cx: 70, cy: 75, rx: 32, ry: 14 }],
        palms: [
          { x: 38, y: 66, w: 44, h: 56, lean: -0.12 },
          { x: 98, y: 63, w: 46, h: 58, lean: 0.1 },
          { x: 112, y: 82, w: 36, h: 44, lean: 0.14 },
          { x: 28, y: 86, w: 34, h: 42, lean: -0.14 },
        ],
        bushes: [
          { x: 66, y: 60, w: 18, h: 12 },
          { x: 86, y: 94, w: 18, h: 10 },
        ],
        reeds: [
          { x: 52, y: 91, h: 16, n: 8 },
          { x: 104, y: 91, h: 13, n: 6 },
        ],
        tufts: [[18, 74, 7], [126, 68, 7], [44, 94, 6]],
        rocks: [[80, 94, 3], [62, 95, 2]],
      },
      // small pond with two leaning palms
      {
        patch: { cx: 70, cy: 76, rx: 44, ry: 17 },
        pools: [{ cx: 70, cy: 77, rx: 20, ry: 9 }],
        palms: [
          { x: 52, y: 70, w: 44, h: 56, lean: -0.2 },
          { x: 92, y: 68, w: 42, h: 52, lean: 0.18 },
        ],
        bushes: [{ x: 72, y: 66, w: 16, h: 10 }],
        reeds: [{ x: 56, y: 88, h: 12, n: 6 }],
        tufts: [[36, 80, 6], [108, 78, 6], [82, 90, 5]],
        rocks: [[100, 86, 3]],
      },
      // long lake with reeds along the shore
      {
        patch: { cx: 70, cy: 76, rx: 66, ry: 22 },
        pools: [{ cx: 70, cy: 77, rx: 50, ry: 12, rotation: -0.06 }],
        palms: [
          { x: 32, y: 80, w: 38, h: 50, lean: -0.1 },
          { x: 54, y: 66, w: 36, h: 46, lean: 0.06 },
          { x: 108, y: 74, w: 38, h: 52, lean: 0.12 },
        ],
        bushes: [{ x: 94, y: 64, w: 20, h: 12 }],
        reeds: [
          { x: 50, y: 91, h: 15, n: 8 },
          { x: 72, y: 93, h: 12, n: 6 },
          { x: 98, y: 91, h: 15, n: 8 },
        ],
        tufts: [[14, 88, 6], [130, 88, 6]],
        rocks: [[84, 94, 2]],
      },
      // round pond ringed by palms
      {
        patch: { cx: 70, cy: 74, rx: 58, ry: 24 },
        pools: [{ cx: 70, cy: 76, rx: 24, ry: 11 }],
        palms: [
          { x: 70, y: 62, w: 40, h: 50, lean: 0.05 },
          { x: 38, y: 72, w: 42, h: 52, lean: -0.14 },
          { x: 104, y: 72, w: 42, h: 52, lean: 0.14 },
          { x: 48, y: 92, w: 32, h: 38, lean: -0.1 },
          { x: 94, y: 92, w: 32, h: 38, lean: 0.1 },
        ],
        bushes: [{ x: 24, y: 86, w: 18, h: 11 }, { x: 118, y: 86, w: 18, h: 11 }],
        tufts: [[70, 94, 6]],
        rocks: [[108, 94, 2.5]],
      },
      // nearly dried out
      {
        dry: true,
        patch: { cx: 70, cy: 76, rx: 46, ry: 18 },
        pools: [{ cx: 68, cy: 78, rx: 18, ry: 8 }],
        palms: [{ x: 98, y: 72, w: 40, h: 52, lean: 0.16 }],
        bushes: [{ x: 46, y: 74, w: 18, h: 11 }],
        tufts: [[36, 84, 7], [58, 90, 6], [92, 88, 7], [110, 84, 6]],
        rocks: [[44, 90, 3], [80, 92, 2.5], [28, 76, 2]],
      },
      // twin pools
      {
        patch: { cx: 70, cy: 76, rx: 62, ry: 23 },
        pools: [
          { cx: 50, cy: 76, rx: 22, ry: 10, rotation: -0.1 },
          { cx: 94, cy: 83, rx: 18, ry: 8, rotation: 0.1 },
        ],
        palms: [
          { x: 33, y: 68, w: 42, h: 54, lean: -0.14 },
          { x: 74, y: 64, w: 44, h: 56, lean: 0.04 },
          { x: 110, y: 78, w: 38, h: 48, lean: 0.14 },
        ],
        bushes: [{ x: 60, y: 92, w: 18, h: 10 }],
        reeds: [{ x: 72, y: 84, h: 12, n: 6 }],
        tufts: [[20, 84, 6], [128, 86, 6]],
        rocks: [[112, 94, 2.5]],
      },
    ];
    drawOasis(ctx, rand, specs[variant % specs.length]!);
  },
});

export default oasis;
