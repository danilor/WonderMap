import { defineSymbol } from '../../kit/define';
import { drawWhale } from '../../parts/sea-whale';
import type { WhaleLook } from '../../parts/sea-whale';
import { makePen } from '../../parts/ship-types';

const WL = 81;

/** Four whales: a blue whale cruising with its spout, a fluke dive, a breaching humpback and an orca. */
const WHALES: WhaleLook[] = [
  {
    skin: { base: '#6f94b8', belly: '#dbe6ea', fin: '#5d82a8', eye: '#1b2430' },
    spine: [[10, WL - 6], [24, WL - 7], [46, WL - 5], [72, WL - 1], [96, WL + 5], [118, WL + 8], [132, WL + 8], [142, WL + 5]],
    widths: [2, 13, 23, 28, 22, 14, 8, 5],
    belly: 1,
    plates: 0.28,
    eye: { t: 0.12, k: 0.2 },
    mouth: { t0: 0, t1: 0.22, k: 0.3, lift: 0.12 },
    blowhole: 0.24,
    dorsal: { t: 0.68, h: 11, sweep: 5 },
    flukes: { size: 0.7, span: 0.55, len: 0.8 },
    spout: { t: 0.24, h: 24, spread: 13 },
    foam: [[8, 64], [96, 114]],
  },
  {
    skin: { base: '#58586e', belly: '#c9c9d4', fin: '#4a4a60', eye: '#1b2430' },
    spine: [[14, WL + 10], [32, WL + 13], [56, WL + 13], [80, WL + 10], [97, WL + 4], [106, WL - 8], [109, WL - 22], [109, WL - 32]],
    widths: [2, 12, 19, 18, 15, 11, 8, 6.5],
    belly: 1,
    plates: 0,
    flukes: { size: 0.9, span: 1, len: 1, air: true, drips: true },
    foam: [[92, 126]],
  },
  {
    skin: { base: '#3f536c', belly: '#eef0ea', fin: '#35475e', eye: '#1b2430' },
    spine: [[24, 14], [36, 22], [56, 37], [78, 53], [96, 67], [108, 79], [114, WL + 6]],
    widths: [2, 15, 25, 25, 17, 10, 5],
    belly: 1,
    plates: 0.46,
    pleats: 2.4,
    eye: { t: 0.1, k: 0.12 },
    mouth: { t0: 0, t1: 0.2, k: 0.28, lift: 0.1 },
    flipper: { t: 0.3, path: [[0, 0], [-10, 12], [-22, 22], [-31, 27]], w: 8, color: '#eef0ea' },
    flukes: { size: 0.5, span: 0.7, len: 0.8 },
    foam: [],
    splash: 116,
  },
  {
    skin: { base: '#232b36', belly: '#f6f6f0', fin: '#1c232d', eye: '#f6f6f0' },
    spine: [[12, WL - 5], [28, WL - 8], [54, WL - 5], [82, WL + 1], [106, WL + 7], [122, WL + 10], [134, WL + 9]],
    widths: [2, 17, 25, 21, 13, 8, 5],
    belly: 1,
    plates: 0.46,
    eye: { t: 0.1, k: 0.08 },
    mouth: { t0: 0, t1: 0.2, k: 0.32, lift: 0.06 },
    marks: 'orca',
    dorsal: { t: 0.4, h: 22, sweep: 6, wide: 7 },
    flukes: { size: 0.7, span: 0.55, len: 0.8 },
    foam: [[8, 100]],
  },
];

/** A whale: mostly a dim shape under the waves, with the back, the fin or the flukes breaking the surface. */
const whale = defineSymbol({
  id: 'sea.whale',
  name: 'Whale',
  category: 'sea',
  size: [168, 104],
  anchor: [0.5, 0.78],
  order: 44,
  tags: ['whale', 'sea monster', 'spout', 'orca', 'humpback', 'blue whale', 'animal', 'beast'],
  placement: 'sea',
  rotatable: false,
  layer: 'object',
  variants: WHALES.length,
  draw({ ctx, w, h, rand, variant }) {
    drawWhale(makePen(ctx, rand), w, h, WHALES[variant % WHALES.length]!);
  },
});

export default whale;
