import { defineSymbol } from '../../kit/define';
import type { SymbolDef } from '../../kit/types';
import { LIP, drawRift, drawSinkhole, type GroundTones, type PitFloor, type RiftFill } from '../../parts/relief-chasm';
import { INK, STONE } from '../../parts/relief-common';

interface SinkSpec {
  lip: GroundTones;
  wall: string;
  floor: PitFloor;
  ring: number;
  rx: number;
  jag?: number;
  edge?: string;
  roots?: boolean;
  grass?: string;
  chips: number;
  cracks: number;
  rock: string;
}

const SINKHOLES: readonly SinkSpec[] = [
  { lip: LIP.earth, wall: '#8a6a45', floor: 'dark', ring: 0.3, rx: 27, chips: 5, cracks: 4, rock: STONE.brown },
  { lip: LIP.grass, wall: '#8a6440', floor: 'dark', ring: 0.34, rx: 26, edge: '#7b5a38', roots: true, grass: '#4a7a35', chips: 3, cracks: 2, rock: STONE.gray },
  { lip: LIP.limestone, wall: '#a79e8a', floor: 'water', ring: 0.3, rx: 26, grass: '#6f9a4a', chips: 4, cracks: 2, rock: STONE.pale },
  { lip: LIP.earth, wall: '#7b5b3e', floor: 'rubble', ring: 0.26, rx: 28, jag: 0.17, chips: 7, cracks: 5, rock: STONE.brown },
  { lip: LIP.sand, wall: '#b8925a', floor: 'dark', ring: 0.32, rx: 26, chips: 4, cracks: 3, rock: STONE.sand },
  { lip: LIP.basalt, wall: '#4b3b38', floor: 'ember', ring: 0.28, rx: 26, chips: 5, cracks: 4, rock: STONE.basalt },
];

const sinkhole = defineSymbol({
  id: 'cave.sinkhole',
  name: 'Sinkhole',
  category: 'volcanic',
  size: [84, 64],
  anchor: [0.5, 0.5],
  variants: SINKHOLES.length,
  layer: 'ground',
  order: 660,
  placement: 'land',
  tags: ['pit', 'hole', 'cenote', 'collapse', 'cave', 'chasm'],
  draw({ ctx, rand, variant, w, h }) {
    const spec = SINKHOLES[variant % SINKHOLES.length]!;
    drawSinkhole(ctx, {
      cx: w / 2,
      cy: h / 2 - 1,
      rx: spec.rx * rand.range(0.96, 1.04),
      ry: spec.rx * rand.range(0.6, 0.66),
      rand,
      ink: INK,
      lip: spec.lip,
      wall: spec.wall,
      floor: spec.floor,
      ring: spec.ring,
      jag: spec.jag,
      edge: spec.edge,
      roots: spec.roots,
      grass: spec.grass,
      chips: spec.chips,
      cracks: spec.cracks,
      rock: spec.rock,
    });
  },
});

interface RiftSpec {
  lip: GroundTones;
  wall: string;
  fill?: RiftFill;
  width: number;
  bend: number;
  y?: number;
  branches: number;
  chips: number;
  rock: string;
  grass?: string;
  bridge?: boolean;
}

const RIFTS: readonly RiftSpec[] = [
  { lip: LIP.earth, wall: '#7f6040', width: 15, bend: 0.16, branches: 4, chips: 5, rock: STONE.brown },
  { lip: LIP.basalt, wall: '#4a3a38', fill: 'lava', width: 14, bend: 0.14, branches: 4, chips: 4, rock: STONE.basalt },
  { lip: LIP.earth, wall: '#7f6040', width: 17, bend: 0.08, branches: 2, chips: 3, rock: STONE.brown, grass: '#4a7a35', bridge: true },
  { lip: LIP.limestone, wall: '#8d8a86', fill: 'mist', width: 15, bend: 0.12, y: 0.62, branches: 3, chips: 4, rock: STONE.pale },
  { lip: LIP.sand, wall: '#a07c4c', width: 11, bend: 0.2, branches: 5, chips: 5, rock: STONE.sand },
  { lip: LIP.grass, wall: '#7f6040', width: 14, bend: 0.16, branches: 3, chips: 3, rock: STONE.gray, grass: '#4a7a35' },
];

const rift = defineSymbol({
  id: 'cave.rift',
  name: 'Chasm',
  category: 'volcanic',
  size: [120, 56],
  anchor: [0.5, 0.5],
  variants: RIFTS.length,
  layer: 'ground',
  order: 670,
  placement: 'land',
  rotatable: true,
  tags: ['rift', 'crack', 'fissure', 'canyon', 'gorge', 'ravine', 'bridge'],
  draw({ ctx, rand, variant, w, h }) {
    const spec = RIFTS[variant % RIFTS.length]!;
    drawRift(ctx, {
      w,
      h,
      rand,
      ink: INK,
      lip: spec.lip,
      wall: spec.wall,
      fill: spec.fill,
      width: spec.width,
      bend: spec.bend,
      y: spec.y,
      branches: spec.branches,
      chips: spec.chips,
      rock: spec.rock,
      grass: spec.grass,
      bridge: spec.bridge,
    });
  },
});

const defs: SymbolDef[] = [sinkhole, rift];
export default defs;
