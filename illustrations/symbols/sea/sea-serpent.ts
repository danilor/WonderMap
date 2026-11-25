import { defineSymbol } from '../../kit/define';
import { drawSerpent } from '../../parts/sea-serpents';
import type { SerpentLook } from '../../parts/sea-serpents';
import { makePen } from '../../parts/ship-types';

const WL = 77;

/** Four serpents with different silhouettes: classic humps, a tall swan neck, a low triple coil and a mirrored one with a curling tail. */
const LOOKS: SerpentLook[] = [
  {
    skin: { base: '#4f9a8a', belly: '#e2e6b4', fin: '#e08a58', eye: '#f2d24f' },
    facing: -1,
    head: { at: [50, 30], size: 0.95, open: 0.4, tilt: 0.1, horns: 1 },
    neck: [[53, 33], [64, 27], [75, 30], [80, 42], [78, 56], [76, 68], [78, WL - 0.5]],
    neckW: [10, 14],
    humps: [
      { x0: 98, x1: 136, h: 36, skew: 0.08, w: [13, 12] },
      { x0: 144, x1: 172, h: 24, w: [11, 9] },
    ],
    tail: [[178, WL - 0.5], [183, 66], [188, 56], [192, 50]],
    tailW: 7,
    spikes: 0.55,
  },
  {
    skin: { base: '#4b7fb8', belly: '#ece0b4', fin: '#e6b84e', eye: '#f4e66a' },
    facing: -1,
    head: { at: [44, 21], size: 0.9, open: 0.14, tilt: 0.25, horns: 1, frill: true, tongue: false },
    neck: [[48, 24], [60, 17], [71, 20], [75, 33], [68, 46], [67, 60], [71, WL - 0.5]],
    neckW: [9, 14],
    humps: [{ x0: 94, x1: 140, h: 40, skew: 0.1, w: [14, 12] }],
    tail: [[150, WL - 0.5], [156, 60], [166, 47], [178, 44], [188, 50]],
    tailW: 10,
    spikes: 0.5,
  },
  {
    skin: { base: '#6f9a45', belly: '#ead99a', fin: '#c4623e', eye: '#f4c93a' },
    facing: -1,
    head: { at: [38, 52], size: 0.9, open: 0.35, tilt: 0.3, horns: 1, frill: true },
    neck: [[41, 55], [52, 52], [60, 58], [62, 68], [64, WL - 0.5]],
    neckW: [10, 13],
    humps: [
      { x0: 80, x1: 110, h: 26, w: [12, 11] },
      { x0: 118, x1: 148, h: 32, w: [11, 10] },
      { x0: 156, x1: 178, h: 20, w: [9, 7] },
    ],
    tail: [[184, WL - 0.5], [187, 70], [192, 63]],
    tailW: 6,
    spikes: 0.6,
  },
  {
    skin: { base: '#8a62a8', belly: '#eadcf0', fin: '#e27a62', eye: '#f2e06a' },
    facing: 1,
    head: { at: [52, 34], size: 1, open: 0.45, tilt: -0.1, horns: 1, frill: true },
    neck: [[55, 37], [66, 32], [76, 38], [78, 52], [72, 64], [74, WL - 0.5]],
    neckW: [10, 14],
    humps: [
      { x0: 92, x1: 126, h: 32, skew: -0.1, w: [13, 12] },
      { x0: 134, x1: 162, h: 44, skew: 0.1, w: [11, 9] },
    ],
    tail: [[170, WL - 0.5], [176, 66], [183, 60], [188, 66], [185, 72]],
    tailW: 7,
    spikes: 0.5,
  },
];

/** A sea serpent: head and neck out of the water, humps trailing behind and a flicking tail. */
export default defineSymbol({
  id: 'serpent.sea',
  name: 'Sea Serpent',
  category: 'sea',
  size: [200, 96],
  anchor: [0.5, 0.82],
  order: 40,
  tags: ['serpent', 'monster', 'sea monster', 'dragon', 'beast'],
  placement: 'sea',
  rotatable: true,
  layer: 'object',
  variants: LOOKS.length,
  draw({ ctx, w, h, rand, variant }) {
    drawSerpent(makePen(ctx, rand), w, h, LOOKS[variant % LOOKS.length]!);
  },
});
