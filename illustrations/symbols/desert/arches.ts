import { defineSymbol } from '../../kit/define';
import { drawArch, type ArchOptions } from '../../parts/nature-arch';
import { INK } from '../../parts/nature-common';
import { ORANGE, PALE, RED, TAN, UMBER } from '../../parts/nature-stone';

type ArchSpec = Omit<ArchOptions, 'cx' | 'gy' | 'ink' | 'rand'>;

const rockArch = defineSymbol({
  id: 'desert.rock-arch',
  name: 'Rock Arch',
  category: 'desert',
  size: [104, 96],
  anchor: [0.5, 0.86],
  order: 110,
  tags: ['arch', 'rock', 'natural bridge', 'window', 'desert', 'badlands', 'sandstone'],
  placement: 'land',
  variants: 6,
  draw({ ctx, w, h, rand, variant }) {
    const cx = w / 2;
    const gy = h * 0.86;
    const specs: ArchSpec[] = [
      // classic red arch
      { hw: 42, h: 60, p: 2.2, flare: 5, stone: RED, tufts: 1, holes: [{ cx, hw: 19, h: 37, p: 2.2 }] },
      // tall pointed arch
      { hw: 33, h: 68, p: 1.7, flare: 4, stone: ORANGE, holes: [{ cx, hw: 13, h: 46, p: 1.6 }] },
      // double arch
      { hw: 44, h: 52, p: 2.6, flare: 3, stone: TAN, holes: [{ cx: cx - 19, hw: 10.5, h: 28, p: 2.2 }, { cx: cx + 19, hw: 10.5, h: 24, p: 2.2 }] },
      // natural bridge
      { hw: 42, h: 44, p: 3.4, flare: 4, stone: PALE, band: 7, tufts: 2, holes: [{ cx, hw: 24, h: 27, p: 3 }] },
      // arch with a small window
      { hw: 42, h: 62, p: 2.2, flare: 4, stone: ORANGE, holes: [{ cx: cx - 8, hw: 15, h: 32, p: 2.3 }, { cx: cx + 22, hw: 6, h: 12, sill: 34 }] },
      // brown arch with scrub
      { hw: 40, h: 60, p: 2.4, flare: 4, stone: UMBER, tufts: 3, holes: [{ cx: cx + 3, hw: 17, h: 34, p: 2.4 }] },
    ];
    drawArch(ctx, { ...specs[variant % specs.length]!, cx, gy, ink: INK, rand });
  },
});

export default rockArch;
