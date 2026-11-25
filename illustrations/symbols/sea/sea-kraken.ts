import { defineSymbol } from '../../kit/define';
import { drawKraken } from '../../parts/sea-kraken';
import type { KrakenLook } from '../../parts/sea-kraken';
import { makePen } from '../../parts/ship-types';

/** Four krakens: a purple one rising from the deep, a red one crushing a cog, a bare bouquet of teal arms and a glowing abyssal peeker. */
const KRAKENS: KrakenLook[] = [
  {
    skin: { base: '#7b4f9c', belly: '#f0d2e2', fin: '#a77cc4', eye: '#f2c83a' },
    head: { x: 100, size: 1, lean: 0.3, rise: 1, iris: '#f2c83a', spot: '#cfa6e2', beak: '#eadba8' },
    arms: [
      { x: 58, stem: [[52, 110], [44, 90], [47, 68], [56, 50]], curl: 1, r: 12, turns: 1.3, w: 11 },
      { x: 144, stem: [[152, 110], [162, 88], [160, 64], [152, 44]], curl: -1, r: 11, turns: 1.3, w: 11 },
      { x: 30, stem: [[26, 112], [18, 100], [20, 88], [30, 82]], curl: 1, r: 9, turns: 1.2, w: 10 },
      { x: 174, stem: [[178, 112], [186, 100], [184, 88], [174, 82]], curl: -1, r: 9, turns: 1.2, w: 10 },
      { x: 76, stem: [[70, 119], [58, 113], [46, 114], [38, 106]], curl: -1, r: 8, turns: 1.1, w: 11, front: true },
      { x: 124, stem: [[130, 119], [142, 113], [154, 114], [162, 106]], curl: 1, r: 8, turns: 1.1, w: 11, front: true },
    ],
  },
  {
    skin: { base: '#b8483a', belly: '#f4dcb6', fin: '#e08a62', eye: '#f4e05a' },
    head: { x: 62, size: 0.9, lean: 0.4, rise: 1, wide: 0.9, iris: '#f6e05a', spot: '#e8946a', beak: '#efdfb0' },
    cog: { x: 152, y: 121, angle: 0.3, scale: 0.74 },
    arms: [
      { x: 178, stem: [[186, 108], [192, 86], [188, 62], [178, 44]], curl: -1, r: 12, turns: 1.3, w: 10 },
      { x: 18, stem: [[14, 110], [8, 92], [12, 74], [22, 64]], curl: 1, r: 10, turns: 1.2, w: 10 },
      { x: 104, stem: [[110, 108], [114, 90], [110, 74], [118, 62]], curl: 1, r: 9, turns: 1.2, w: 10 },
      { x: 112, stem: [[124, 118], [140, 112], [156, 106], [170, 108]], curl: -1, r: 9, turns: 1.2, w: 11, front: true },
    ],
  },
  {
    skin: { base: '#3d9a8f', belly: '#e8e6bc', fin: '#6fc0b0', eye: '#f2d24f' },
    arms: [
      { x: 100, stem: [[96, 106], [90, 84], [96, 60], [104, 38]], curl: 1, r: 12, turns: 1.4, w: 12 },
      { x: 58, stem: [[54, 108], [46, 88], [50, 70], [60, 60]], curl: -1, r: 11, turns: 1.2, w: 11 },
      { x: 146, stem: [[150, 108], [158, 88], [154, 70], [144, 60]], curl: 1, r: 11, turns: 1.2, w: 11 },
      { x: 28, stem: [[24, 114], [16, 100], [20, 88], [30, 84]], curl: 1, r: 9, turns: 1.1, w: 10 },
      { x: 174, stem: [[178, 114], [186, 100], [182, 88], [172, 84]], curl: -1, r: 9, turns: 1.1, w: 10 },
      { x: 80, stem: [[76, 119], [66, 112], [60, 100]], curl: -1, r: 8, turns: 1.1, w: 10, front: true },
      { x: 122, stem: [[126, 119], [136, 112], [142, 100]], curl: 1, r: 8, turns: 1.1, w: 10, front: true },
    ],
  },
  {
    skin: { base: '#3a3478', belly: '#7fe8f0', fin: '#7a64c8', eye: '#9ff6ff' },
    head: { x: 100, size: 0.95, lean: -0.2, rise: 0.78, wide: 1.1, crest: true, iris: '#9ff6ff', glow: '#5fe8ff', spot: '#7be0f0', beak: '#d8e2d0' },
    arms: [
      { x: 50, stem: [[44, 108], [34, 86], [38, 62], [50, 44]], curl: 1, r: 12, turns: 1.3, w: 10 },
      { x: 150, stem: [[156, 108], [166, 86], [162, 62], [150, 44]], curl: -1, r: 12, turns: 1.3, w: 10 },
      { x: 24, stem: [[18, 114], [10, 100], [14, 88], [24, 84]], curl: 1, r: 9, turns: 1.1, w: 9 },
      { x: 178, stem: [[184, 114], [192, 100], [188, 88], [178, 84]], curl: -1, r: 9, turns: 1.1, w: 9 },
      { x: 72, stem: [[64, 119], [52, 114], [44, 104]], curl: -1, r: 8, turns: 1.1, w: 10, front: true },
      { x: 128, stem: [[136, 119], [148, 114], [156, 104]], curl: 1, r: 8, turns: 1.1, w: 10, front: true },
    ],
  },
];

/** A kraken: eyes and a beak in a great domed head, ringed by curling arms. */
const kraken = defineSymbol({
  id: 'sea.kraken',
  name: 'Kraken',
  category: 'sea',
  size: [200, 160],
  anchor: [0.5, 0.82],
  order: 43,
  tags: ['kraken', 'monster', 'sea monster', 'tentacles', 'octopus', 'squid', 'beast', 'cthulhu'],
  placement: 'sea',
  rotatable: false,
  layer: 'object',
  variants: KRAKENS.length,
  draw({ ctx, w, h, rand, variant }) {
    drawKraken(makePen(ctx, rand), w, h, KRAKENS[variant % KRAKENS.length]!);
  },
});

export default kraken;
