import { defineSymbol } from '../../kit/define';
import { drawCoiled, drawSerpent } from '../../parts/sea-serpents';
import type { CoilLook, SerpentLook } from '../../parts/sea-serpents';
import { makePen } from '../../parts/ship-types';

/** Four coiled serpents: a tall tower, a wide thin spiral (mirrored), a low heap with a resting head and a long-whiskered elder. */
const COILS: CoilLook[] = [
  {
    skin: { base: '#4f9a8a', belly: '#e2e6b4', fin: '#e08a58', eye: '#f2d24f' },
    facing: -1,
    cx: 68,
    radius: [24, 32],
    pitch: 26,
    turns: 1.4,
    head: { at: [40, 30], size: 1, open: 0.4, tilt: 0.12, horns: 1 },
    neck: { out: [22, -4], into: 26 },
    widths: [[0, 10], [0.2, 13], [0.5, 15], [0.85, 12], [1, 3]],
    spikes: 0.55,
  },
  {
    skin: { base: '#4b7fb8', belly: '#ece0b4', fin: '#e6b84e', eye: '#f4e66a' },
    facing: 1,
    cx: 68,
    radius: [26, 36],
    pitch: 19,
    turns: 2.4,
    head: { at: [40, 40], size: 0.95, open: 0.14, tilt: 0.2, horns: 1, frill: true, tongue: false },
    neck: { out: [20, -10], into: 22 },
    widths: [[0, 9], [0.2, 11], [0.5, 13], [0.85, 10], [1, 3]],
    spikes: 0.5,
  },
  {
    skin: { base: '#b4503e', belly: '#f0d9a0', fin: '#e8b04e', eye: '#f6e45a' },
    facing: -1,
    cx: 68,
    radius: [30, 38],
    pitch: 16,
    turns: 1.8,
    head: { at: [42, 80], size: 0.95, open: 0.3, tilt: 0.3, horns: 1, frill: true },
    neck: { out: [26, -26], into: 24 },
    widths: [[0, 11], [0.2, 14], [0.5, 16], [0.85, 12], [1, 3]],
    spikes: 0.6,
  },
  {
    skin: { base: '#6f9a45', belly: '#ead99a', fin: '#c4623e', eye: '#f4c93a' },
    facing: -1,
    cx: 68,
    radius: [20, 28],
    pitch: 28,
    turns: 1.5,
    head: { at: [42, 28], size: 1, open: 0.3, tilt: 0.1, horns: 2, whiskers: true },
    neck: { out: [20, -6], into: 24 },
    widths: [[0, 9], [0.2, 12], [0.5, 14], [0.85, 11], [1, 3]],
    spikes: 0.5,
  },
];

/** A sea serpent coiled around itself, its head raised above the water. */
const coiled = defineSymbol({
  id: 'serpent.sea.coiled',
  name: 'Coiled Sea Serpent',
  category: 'sea',
  size: [136, 150],
  anchor: [0.5, 0.86],
  order: 41,
  tags: ['serpent', 'monster', 'sea monster', 'coiled', 'coil', 'dragon', 'beast'],
  placement: 'sea',
  rotatable: false,
  layer: 'object',
  variants: COILS.length,
  draw({ ctx, w, h, rand, variant }) {
    drawCoiled(makePen(ctx, rand), w, h, COILS[variant % COILS.length]!);
  },
});

const DWL = 104;

/** Eastern sea dragons: slim bodies, long branching horns, whiskers, a flowing mane and a fan of fins on the tail. */
const DRAGONS: SerpentLook[] = [
  {
    skin: { base: '#3f9b78', belly: '#ecdca0', fin: '#e8b84a', eye: '#f4d24a' },
    facing: -1,
    head: { at: [50, 32], size: 1.1, open: 0.45, tilt: 0.08, horns: 2, whiskers: true, frill: true, bone: '#f2e6c0' },
    neck: [[53, 35], [66, 25], [80, 27], [88, 40], [84, 55], [76, 68], [80, 84], [88, DWL - 0.5]],
    neckW: [9, 12],
    humps: [
      { x0: 104, x1: 148, h: 56, skew: 0.1, w: [12, 11] },
      { x0: 158, x1: 192, h: 36, skew: -0.05, w: [10, 8] },
    ],
    tail: [[198, DWL - 0.5], [204, 92], [210, 80], [210, 66], [203, 57], [194, 57]],
    tailW: 7,
    spikes: 0.95,
    spikeEvery: 4,
    spikeSweep: 0.7,
    tailFin: true,
  },
  {
    skin: { base: '#b03a3a', belly: '#f2d9a0', fin: '#e6b04a', eye: '#f6e45a' },
    facing: -1,
    head: { at: [40, 40], size: 1.15, open: 0.4, tilt: 0.2, horns: 2, whiskers: true, frill: true, bone: '#f2e6c0' },
    neck: [[43, 43], [56, 34], [70, 38], [74, 54], [70, 72], [72, 90], [78, DWL - 0.5]],
    neckW: [9, 13],
    humps: [{ x0: 92, x1: 150, h: 70, skew: 0.12, w: [13, 12] }],
    tail: [[162, DWL - 0.5], [168, 92], [180, 84], [194, 88], [204, 78], [206, 64]],
    tailW: 9,
    spikes: 0.95,
    spikeEvery: 4,
    spikeSweep: 0.7,
    tailFin: true,
  },
  {
    skin: { base: '#3f78b8', belly: '#e6eef2', fin: '#cfd8e0', eye: '#f4f08a' },
    facing: 1,
    head: { at: [54, 29], size: 1.05, open: 0.5, tilt: 0.1, horns: 2, whiskers: true, frill: true, bone: '#f4f0e0' },
    neck: [[57, 32], [70, 25], [84, 31], [86, 47], [80, 62], [84, 80], [90, DWL - 0.5]],
    neckW: [9, 12],
    humps: [
      { x0: 104, x1: 136, h: 30, w: [11, 10] },
      { x0: 142, x1: 172, h: 42, w: [10, 9] },
      { x0: 178, x1: 198, h: 24, w: [8, 7] },
    ],
    tail: [[202, DWL - 0.5], [205, 94], [200, 84]],
    tailW: 6,
    spikes: 0.9,
    spikeEvery: 4,
    spikeSweep: 0.7,
    tailFin: true,
  },
  {
    skin: { base: '#d9d2c0', belly: '#f6f0dc', fin: '#c0453a', eye: '#d84a3a' },
    facing: -1,
    head: { at: [34, 62], size: 1.1, open: 0.35, tilt: 0.18, horns: 2, whiskers: true, frill: true, bone: '#8e2e2a' },
    neck: [[37, 65], [50, 58], [62, 66], [66, 80], [70, DWL - 0.5]],
    neckW: [10, 13],
    humps: [
      { x0: 82, x1: 114, h: 30, w: [12, 11] },
      { x0: 120, x1: 154, h: 36, w: [11, 10] },
      { x0: 160, x1: 188, h: 26, w: [9, 8] },
    ],
    tail: [[194, DWL - 0.5], [200, 96], [204, 86], [200, 76]],
    tailW: 7,
    spikes: 0.9,
    spikeEvery: 4,
    spikeSweep: 0.7,
    tailFin: true,
  },
];

/** An eastern-style sea dragon winding through the waves. */
const dragon = defineSymbol({
  id: 'serpent.dragon',
  name: 'Sea Dragon',
  category: 'sea',
  size: [224, 130],
  anchor: [0.5, 0.8],
  order: 42,
  tags: ['serpent', 'dragon', 'monster', 'sea monster', 'eastern', 'wyrm', 'beast'],
  placement: 'sea',
  rotatable: true,
  layer: 'object',
  variants: DRAGONS.length,
  draw({ ctx, w, h, rand, variant }) {
    drawSerpent(makePen(ctx, rand), w, h, DRAGONS[variant % DRAGONS.length]!);
  },
});

export default [coiled, dragon];
