import { defineSymbol } from '../../kit/define';
import { drawKelp, drawReef, drawWaves, drawWhirlpool } from '../../parts/sea-surface';
import type { KelpLook, ReefLook, WaveSpec, WhirlLook } from '../../parts/sea-surface';
import { makePen } from '../../parts/ship-types';

/** Four reefs: a coral garden, a sandy shoal, a rocky shoal with breakers and a ring atoll. */
const REEFS: ReefLook[] = [
  {
    rx: 66,
    ry: 40,
    water: { rim: '#3fb7b8', mid: '#6fdccc', core: '#a9f0e0' },
    sand: [[80, 54, 13, 7]],
    stones: [[46, 62, 6], [104, 36, 5]],
    corals: [
      { x: 50, y: 46, s: 12, color: '#e86a82' },
      { x: 66, y: 60, s: 9, color: '#f2a14e', kind: 'dome' },
      { x: 92, y: 40, s: 13, color: '#a56ac8', kind: 'fan' },
      { x: 110, y: 58, s: 11, color: '#f08a6a' },
      { x: 94, y: 64, s: 8, color: '#e8c84a', kind: 'dome' },
      { x: 62, y: 38, s: 8, color: '#f2a14e' },
      { x: 34, y: 58, s: 9, color: '#d8607a', kind: 'dome' },
      { x: 122, y: 44, s: 9, color: '#a56ac8' },
      { x: 80, y: 38, s: 7, color: '#e86a82', kind: 'dome' },
      { x: 52, y: 70, s: 7, color: '#e8c84a', kind: 'fan' },
    ],
    breakers: [[20, 56, 16, true], [138, 52, 16], [78, 91, 20], [50, 16, 14, true]],
  },
  {
    rx: 62,
    ry: 34,
    lobes: 4,
    water: { rim: '#46b8bc', mid: '#8fe0d0', core: '#cbf6e4' },
    sand: [[74, 52, 32, 11], [110, 58, 15, 6], [44, 58, 13, 5]],
    stones: [[96, 42, 4]],
    corals: [{ x: 58, y: 40, s: 7, color: '#f08a6a' }, { x: 108, y: 44, s: 6, color: '#e86a82', kind: 'dome' }],
    breakers: [[24, 54, 16, true], [134, 56, 16], [70, 86, 22], [100, 20, 14]],
  },
  {
    rx: 62,
    ry: 38,
    water: { rim: '#3a9ca8', mid: '#4db8bc', core: '#7ad0cc' },
    stones: [[52, 48, 9], [72, 60, 7], [92, 42, 10], [110, 58, 8], [78, 52, 6], [62, 36, 6], [96, 64, 6], [38, 60, 5]],
    corals: [{ x: 66, y: 46, s: 6, color: '#a56ac8' }],
    breakers: [[18, 52, 18, true], [136, 50, 18], [58, 92, 20, true], [100, 90, 20], [46, 14, 16, true], [112, 16, 16]],
  },
  {
    rx: 70,
    ry: 44,
    lobes: 6,
    water: { rim: '#3fb7b8', mid: '#7fe0d2', core: '#b4f2e4' },
    lagoon: { rx: 34, ry: 20 },
    sand: [[34, 54, 9, 5], [124, 50, 9, 5], [80, 14, 10, 4]],
    stones: [[24, 40, 5], [132, 62, 5]],
    corals: [
      { x: 28, y: 46, s: 8, color: '#e86a82', kind: 'dome' },
      { x: 44, y: 80, s: 9, color: '#f2a14e' },
      { x: 78, y: 86, s: 10, color: '#a56ac8', kind: 'fan' },
      { x: 114, y: 80, s: 9, color: '#e8c84a', kind: 'dome' },
      { x: 128, y: 36, s: 9, color: '#f08a6a' },
      { x: 106, y: 20, s: 8, color: '#e86a82' },
      { x: 52, y: 20, s: 8, color: '#a56ac8', kind: 'dome' },
      { x: 30, y: 66, s: 7, color: '#f2a14e', kind: 'dome' },
    ],
    breakers: [[12, 50, 16, true], [146, 56, 16], [78, 96, 22], [40, 10, 14, true], [118, 10, 14]],
  },
];

const reef = defineSymbol({
  id: 'sea.reef',
  name: 'Shallow Reef',
  category: 'sea',
  size: [156, 104],
  anchor: [0.5, 0.5],
  order: 63,
  tags: ['reef', 'shallows', 'shoal', 'coral', 'atoll', 'sandbar', 'lagoon', 'hazard', 'shallow water'],
  placement: 'sea',
  layer: 'ground',
  variants: REEFS.length,
  draw({ ctx, w, h, rand, variant }) {
    drawReef(makePen(ctx, rand), w, h, REEFS[variant % REEFS.length]!);
  },
});

/** Floating weed: a kelp bed, a sargassum raft, eelgrass and a thicket of red kelp. */
const KELPS: KelpLook[] = [
  {
    tone: '#6f8f34',
    bead: '#d9b04a',
    blades: true,
    plants: [{ x: 38, y: 50, strands: 6, len: 26 }, { x: 84, y: 44, strands: 6, len: 28 }, { x: 60, y: 66, strands: 4, len: 18 }],
  },
  { tone: '#b0892f', bead: '#e8cf6a', mat: true, plants: [] },
  {
    tone: '#3f9a6a',
    bead: '#bfe8a0',
    plants: [
      { x: 30, y: 50, strands: 5, len: 20 },
      { x: 60, y: 42, strands: 6, len: 22 },
      { x: 90, y: 52, strands: 5, len: 20 },
      { x: 48, y: 66, strands: 4, len: 14 },
      { x: 76, y: 68, strands: 4, len: 14 },
    ],
  },
  {
    tone: '#8a4a3a',
    bead: '#e8b87a',
    blades: true,
    plants: [{ x: 42, y: 48, strands: 7, len: 30 }, { x: 80, y: 52, strands: 6, len: 26 }],
  },
];

const kelp = defineSymbol({
  id: 'sea.kelp',
  name: 'Kelp',
  category: 'sea',
  size: [120, 90],
  anchor: [0.5, 0.5],
  order: 64,
  tags: ['kelp', 'seaweed', 'weed', 'sargassum', 'eelgrass', 'algae', 'floating', 'plant'],
  placement: 'sea',
  layer: 'ground',
  variants: KELPS.length,
  draw({ ctx, w, h, rand, variant }) {
    drawKelp(makePen(ctx, rand), w, h, KELPS[variant % KELPS.length]!);
  },
});

/** Eight little wave marks: curls, pairs, long swells, ripples and choppy dashes. */
const WAVES: WaveSpec[][] = [
  [{ kind: 'curl', x: 40, y: 24, w: 36 }],
  [{ kind: 'curl', x: 30, y: 24, w: 34 }, { kind: 'curl', x: 62, y: 17, w: 18, alpha: 0.8 }],
  [{ kind: 'curl', x: 18, y: 26, w: 20 }, { kind: 'curl', x: 42, y: 19, w: 22, flip: true }, { kind: 'curl', x: 64, y: 27, w: 18 }],
  [{ kind: 'swell', x: 40, y: 13, w: 66 }, { kind: 'swell', x: 36, y: 26, w: 56, alpha: 0.8 }],
  [{ kind: 'ripple', x: 40, y: 13, w: 56 }, { kind: 'ripple', x: 40, y: 25, w: 40, curl: 0.8, alpha: 0.8 }],
  [{ kind: 'chop', x: 40, y: 20, w: 62 }],
  [{ kind: 'curl', x: 26, y: 24, w: 26 }, { kind: 'curl', x: 56, y: 24, w: 26, flip: true }],
  [{ kind: 'curl', x: 40, y: 25, w: 42, curl: 1.15 }, { kind: 'swell', x: 40, y: 34, w: 60, alpha: 0.7 }],
];

const waves = defineSymbol({
  id: 'sea.waves',
  name: 'Waves',
  category: 'sea',
  size: [80, 40],
  anchor: [0.5, 0.6],
  order: 65,
  tags: ['waves', 'swell', 'ripple', 'water', 'sea', 'surf', 'decoration'],
  placement: 'sea',
  layer: 'ground',
  variants: WAVES.length,
  draw({ ctx, rand, variant }) {
    drawWaves(makePen(ctx, rand), WAVES[variant % WAVES.length]!);
  },
});

const WHIRLS: WhirlLook[] = [
  { arms: 3, turns: 0.9, eye: 0.14, dir: 1 },
  { arms: 5, turns: 1.1, eye: 0.11, dir: -1 },
  { arms: 3, turns: 0.8, eye: 0.16, dir: 1, debris: true },
  { arms: 2, turns: 0.7, eye: 0.18, dir: -1, size: 0.62 },
];

const whirlpool = defineSymbol({
  id: 'sea.whirlpool',
  name: 'Whirlpool',
  category: 'sea',
  size: [132, 100],
  anchor: [0.5, 0.5],
  order: 66,
  tags: ['whirlpool', 'maelstrom', 'vortex', 'eddy', 'hazard', 'current', 'charybdis'],
  placement: 'sea',
  layer: 'ground',
  variants: WHIRLS.length,
  draw({ ctx, w, h, rand, variant }) {
    drawWhirlpool(makePen(ctx, rand), w, h, WHIRLS[variant % WHIRLS.length]!);
  },
});

export default [reef, kelp, waves, whirlpool];
