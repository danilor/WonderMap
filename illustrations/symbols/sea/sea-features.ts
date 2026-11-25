import { defineSymbol } from '../../kit/define';
import type { Rock } from '../../parts/sea-rock';
import { STONE, paintRock, stoneTone } from '../../parts/sea-rock';
import { gull } from '../../parts/ship-wreck';
import { makePen } from '../../parts/ship-types';

const ROCK_TAGS = ['rock', 'stone', 'sea', 'stack', 'skerry', 'reef', 'hazard'];

interface RockScene {
  rocks: Rock[];
  gulls?: Array<[number, number, number]>;
}

/** Origin (0, 0) is the middle of the waterline. */
const ROCKS: RockScene[] = [
  { rocks: [{ x: 0, y: 0, w: 42, h: 30, tone: stoneTone(STONE.grey), flat: 0.3, summit: -0.15 }] },
  {
    rocks: [
      { x: -17, y: 3, w: 16, h: 13, tone: stoneTone(STONE.grey), summit: 0.1 },
      { x: 2, y: 0, w: 26, h: 48, tone: stoneTone(STONE.warm), summit: 0.35 },
    ],
  },
  {
    rocks: [
      { x: -13, y: 2, w: 28, h: 34, tone: stoneTone(STONE.dark), summit: -0.3 },
      { x: 12, y: 0, w: 26, h: 22, tone: stoneTone(STONE.grey), summit: 0.35 },
    ],
  },
  { rocks: [{ x: 0, y: 0, w: 56, h: 38, tone: stoneTone(STONE.warm), flat: 0.35, arch: true }] },
  { rocks: [{ x: 0, y: 0, w: 52, h: 24, tone: stoneTone(STONE.grey), flat: 0.85, cap: '#7aa05a' }], gulls: [[-8, -23, 0.8], [9, -23.5, 0.7]] },
  {
    rocks: [
      { x: -14, y: 2, w: 18, h: 18, tone: stoneTone(STONE.green), summit: -0.2 },
      { x: 4, y: 0, w: 30, h: 38, tone: stoneTone(STONE.dark), summit: 0.2 },
      { x: 20, y: 3, w: 14, h: 12, tone: stoneTone(STONE.grey), summit: 0.4 },
    ],
  },
];

const seaRock = defineSymbol({
  id: 'sea.rock',
  name: 'Sea Rock',
  category: 'sea',
  size: [72, 66],
  anchor: [0.5, 0.78],
  order: 60,
  tags: ROCK_TAGS,
  placement: 'sea',
  layer: 'object',
  variants: ROCKS.length,
  draw({ ctx, w, h, rand, variant }) {
    ctx.translate(w / 2, h * 0.78);
    const pen = makePen(ctx, rand);
    const scene = ROCKS[variant % ROCKS.length]!;
    for (const r of [...scene.rocks].sort((a, b) => a.y - b.y)) paintRock(pen, r);
    for (const [x, y, s] of scene.gulls ?? []) gull(pen, x, y, s, x < 0 ? 1 : -1);
  },
});

export default [seaRock];
