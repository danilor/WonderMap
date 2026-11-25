import { defineSymbol } from '../../kit/define';
import { ellipse, linearGradient, softBlob } from '../../kit/draw';
import { rgba } from '../../kit/colors';
import type { SymbolDef } from '../../kit/types';
import { drawCaveMouth, drawCrystal, drawCrystalCluster, drawOutcrop } from '../../parts/relief-cave';
import { COOL_INK, STONE, drawBoulder } from '../../parts/relief-common';
import { drawSnowFoot, sparkle } from '../../parts/relief-ice';
import { drawFrostTree, drawIgloo } from '../../parts/relief-polar';

const SPIKE_COLORS = ['#eafaff', '#c2e9fb', '#9bd3f2', '#d9f3ff', '#aee0f6'];

interface SpikeSpec {
  clusters: readonly { dx: number; h: number; count: number; spread: number }[];
  lone?: { dx: number; h: number; w: number; tilt: number };
}

const SPIKES: readonly SpikeSpec[] = [
  { clusters: [{ dx: 0, h: 56, count: 5, spread: 34 }] },
  { clusters: [{ dx: 0, h: 38, count: 8, spread: 54 }] },
  { clusters: [{ dx: -14, h: 44, count: 3, spread: 22 }, { dx: 14, h: 58, count: 4, spread: 26 }] },
  { clusters: [{ dx: 15, h: 24, count: 3, spread: 22 }], lone: { dx: -6, h: 64, w: 15, tilt: -0.08 } },
  { clusters: [{ dx: -19, h: 30, count: 4, spread: 24 }, { dx: 2, h: 52, count: 5, spread: 30 }, { dx: 21, h: 26, count: 3, spread: 20 }] },
];

const spikes = defineSymbol({
  id: 'ice.spikes',
  name: 'Ice Spikes',
  category: 'ice',
  size: [76, 80],
  anchor: [0.5, 0.86],
  variants: SPIKES.length,
  layer: 'object',
  order: 890,
  placement: 'land',
  tags: ['ice', 'spikes', 'crystal', 'frost', 'shard', 'frozen', 'arctic', 'polar'],
  draw({ ctx, rand, variant, w, h }) {
    const s = SPIKES[variant % SPIKES.length]!;
    const cx = w / 2;
    const baseY = h * 0.86;
    softBlob(ctx, cx + 2, baseY + 2, w * 0.42, 5, '#1d2535', 0.3);
    drawSnowFoot(ctx, { x0: cx - w * 0.4, x1: cx + w * 0.4, y: baseY, h: 7, rand, blocks: 0 });
    s.clusters
      .slice()
      .sort((a, b) => a.h - b.h)
      .forEach((c) => drawCrystalCluster(ctx, rand, { cx: cx + c.dx, baseY: baseY + 1, spread: c.spread, h: c.h, count: c.count, colors: SPIKE_COLORS, ink: COOL_INK, halo: 0.3 }));
    if (s.lone) drawCrystal(ctx, { x: cx + s.lone.dx, y: baseY, w: s.lone.w, h: s.lone.h, tilt: s.lone.tilt, color: SPIKE_COLORS[2]!, ink: COOL_INK, halo: 0.35 });
    const tall = Math.max(s.lone?.h ?? 0, ...s.clusters.map((c) => c.h));
    sparkle(ctx, cx - w * 0.08, baseY - tall * 0.82, 3);
  },
});

interface IglooSpec {
  door: -1 | 0 | 1;
  lit?: boolean;
  w: number;
  h: number;
  twin?: boolean;
}

const IGLOOS: readonly IglooSpec[] = [
  { door: 1, w: 42, h: 28 },
  { door: -1, w: 46, h: 25 },
  { door: 1, w: 40, h: 30, lit: true },
  { door: 1, w: 38, h: 27, twin: true },
];

const igloo = defineSymbol({
  id: 'ice.igloo',
  name: 'Igloo',
  category: 'ice',
  size: [76, 54],
  anchor: [0.5, 0.82],
  variants: IGLOOS.length,
  layer: 'object',
  order: 900,
  placement: 'land',
  tags: ['ice', 'igloo', 'snow', 'hut', 'house', 'arctic', 'polar', 'settlement', 'camp'],
  draw({ ctx, rand, variant, w, h }) {
    const s = IGLOOS[variant % IGLOOS.length]!;
    const baseY = h * 0.82;
    if (s.twin) drawIgloo(ctx, { cx: w * 0.28, baseY: baseY - 4, w: 26, h: 19, rand, door: 0 });
    drawIgloo(ctx, { cx: s.twin ? w * 0.54 : w * 0.5 - s.door * 3, baseY, w: s.w, h: s.h, rand, door: s.door, lit: s.lit });
  },
});

const trees = defineSymbol({
  id: 'ice.tree.dead',
  name: 'Frozen Dead Tree',
  category: 'ice',
  size: [60, 72],
  anchor: [0.5, 0.94],
  variants: 5,
  layer: 'object',
  order: 910,
  placement: 'land',
  tags: ['ice', 'tree', 'dead', 'frozen', 'bare', 'snow', 'winter', 'arctic', 'polar', 'frost'],
  draw({ ctx, rand, variant, w, h }) {
    const baseY = h * 0.94;
    const cx = w / 2;
    const fit = { xMin: 3, xMax: w - 3 };
    switch (variant % 5) {
      case 0:
        drawFrostTree(ctx, { cx, baseY, h: h * 0.88, rand, depth: 3, ...fit });
        break;
      case 1:
        drawFrostTree(ctx, { cx: cx - 3, baseY, h: h * 0.86, rand, depth: 3, lean: 0.9, ...fit });
        break;
      case 2:
        drawFrostTree(ctx, { cx, baseY, h: h * 0.62, rand, stump: true });
        break;
      case 3:
        drawFrostTree(ctx, { cx, baseY, h: h * 0.78, rand, depth: 3, lean: -0.3, ...fit });
        break;
      default:
        drawFrostTree(ctx, { cx: cx - 14, baseY: baseY - 3, h: h * 0.56, rand, depth: 2, lean: -0.4, ...fit });
        drawFrostTree(ctx, { cx: cx + 12, baseY, h: h * 0.8, rand, depth: 3, lean: 0.3, ...fit });
    }
  },
});

interface CaveSpec {
  w: number;
  h: number;
  rock: string;
  boxy: number;
  lean: number;
  ledges: number;
  mouth: { dx: number; w: number; h: number; arch: number; teeth: number };
}

const CAVES: readonly CaveSpec[] = [
  { w: 84, h: 58, rock: '#8fa3bd', boxy: 2.3, lean: 0.1, ledges: 2, mouth: { dx: 0, w: 30, h: 28, arch: 0.9, teeth: 3 } },
  { w: 74, h: 66, rock: '#7fb1dc', boxy: 2, lean: -0.15, ledges: 1, mouth: { dx: 3, w: 26, h: 30, arch: 1, teeth: 2 } },
  { w: 96, h: 46, rock: '#a3b2c6', boxy: 3, lean: 0, ledges: 2, mouth: { dx: -8, w: 34, h: 24, arch: 0.7, teeth: 4 } },
  { w: 70, h: 58, rock: '#6f8fb8', boxy: 2.6, lean: 0.25, ledges: 2, mouth: { dx: 2, w: 24, h: 27, arch: 0.85, teeth: 2 } },
];

const cave = defineSymbol({
  id: 'ice.cave',
  name: 'Ice Cave',
  category: 'ice',
  size: [104, 80],
  anchor: [0.5, 0.88],
  variants: CAVES.length,
  layer: 'object',
  order: 920,
  placement: 'land',
  tags: ['ice', 'cave', 'cavern', 'frozen', 'glacier', 'entrance', 'snow', 'arctic', 'polar', 'lair'],
  draw({ ctx, rand, variant, w, h }) {
    const s = CAVES[variant % CAVES.length]!;
    const cx = w / 2;
    const baseY = h * 0.88;
    const mx = cx + s.mouth.dx;
    softBlob(ctx, mx, baseY + 4, s.mouth.w * 1.4, 7, '#7fe8f0', 0.3);
    drawOutcrop(ctx, { cx, baseY, w: s.w, h: s.h, rock: s.rock, ink: COOL_INK, rand, boxy: s.boxy, lean: s.lean, ledges: s.ledges, cap: '#ffffff', capShare: 0.38 });
    drawCaveMouth(ctx, { cx: mx, baseY: baseY - 1, w: s.mouth.w, h: s.mouth.h, rock: s.rock, ink: COOL_INK, rand, arch: s.mouth.arch, teeth: s.mouth.teeth, glow: '#8ff0f0', floor: '#e6f4ff' });
    drawSnowFoot(ctx, { x0: cx - s.w * 0.52, x1: mx - s.mouth.w * 0.62, y: baseY + 2, h: 6, rand, blocks: 1 });
    drawSnowFoot(ctx, { x0: mx + s.mouth.w * 0.62, x1: cx + s.w * 0.52, y: baseY + 2, h: 6, rand, blocks: 1 });
  },
});

interface RockSpec {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rock: string;
}

const SLATE = '#8c97a8';
const ROCKS: readonly (readonly RockSpec[])[] = [
  [{ x: 32, y: 26, rx: 16, ry: 12, rock: STONE.gray }],
  [{ x: 22, y: 30, rx: 10, ry: 7.5, rock: SLATE }, { x: 41, y: 24, rx: 15, ry: 11, rock: STONE.gray }],
  [{ x: 17, y: 31, rx: 8, ry: 6, rock: SLATE }, { x: 34, y: 23, rx: 15, ry: 11, rock: STONE.gray }, { x: 51, y: 29, rx: 9.5, ry: 7, rock: SLATE }, { x: 40, y: 34, rx: 6, ry: 4.5, rock: STONE.gray }],
  [{ x: 30, y: 32, rx: 17, ry: 9.5, rock: SLATE }, { x: 28, y: 20, rx: 11, ry: 8, rock: STONE.gray }],
];

const rocks = defineSymbol({
  id: 'ice.rocks',
  name: 'Snowy Rocks',
  category: 'ice',
  size: [64, 46],
  anchor: [0.5, 0.82],
  variants: ROCKS.length,
  layer: 'object',
  order: 930,
  placement: 'land',
  tags: ['ice', 'rock', 'rocks', 'boulder', 'stone', 'snow', 'snowy', 'arctic', 'polar', 'winter'],
  draw({ ctx, rand, variant }) {
    const list = ROCKS[variant % ROCKS.length]!.slice().sort((a, b) => a.y - b.y);
    list.forEach((r) => {
      drawBoulder(ctx, { cx: r.x, cy: r.y, rx: r.rx, ry: r.ry, rock: r.rock, ink: COOL_INK, rand, snow: true, shadow: true });
      ellipse(ctx, r.x - r.rx * 0.1, r.y + r.ry * 0.72, r.rx * 1.05, r.ry * 0.28, { fill: linearGradient(ctx, r.x - r.rx, 0, r.x + r.rx, 0, ['#ffffff', '#e4eef9', '#bdd0e8']), stroke: rgba(COOL_INK, 0.45), width: 0.7 });
    });
  },
});

const defs: SymbolDef[] = [spikes, igloo, trees, cave, rocks];
export default defs;
