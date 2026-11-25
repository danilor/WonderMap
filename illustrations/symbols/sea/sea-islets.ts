import { softBlob } from '../../kit/draw';
import { defineSymbol } from '../../kit/define';
import type { Rock } from '../../parts/sea-rock';
import { STONE, paintRock, stoneTone } from '../../parts/sea-rock';
import { drawIslet } from '../../parts/sea-islet';
import type { IsletLook } from '../../parts/sea-islet';
import { gull } from '../../parts/ship-wreck';
import { makePen } from '../../parts/ship-types';

interface Cluster {
  /** Radii of the pale shallows under the rocks. */
  halo: [number, number];
  rocks: Rock[];
  gulls?: Array<[number, number, number]>;
}

const grey = stoneTone(STONE.grey);
const warm = stoneTone(STONE.warm);
const dark = stoneTone(STONE.dark);
const green = stoneTone(STONE.green);

/** Origin (0, 0) is the middle of the waterline. */
const CLUSTERS: Cluster[] = [
  {
    halo: [66, 17],
    rocks: [
      { x: -38, y: -6, w: 24, h: 30, tone: grey, summit: -0.2 },
      { x: 32, y: -9, w: 28, h: 40, tone: warm, summit: 0.3 },
      { x: -4, y: -4, w: 34, h: 54, tone: dark, summit: 0.1 },
      { x: -28, y: 7, w: 20, h: 15, tone: grey, summit: 0.2 },
      { x: 14, y: 8, w: 22, h: 14, tone: warm, summit: -0.2 },
      { x: 50, y: 5, w: 12, h: 9, tone: grey },
    ],
  },
  {
    halo: [66, 16],
    rocks: [
      { x: -34, y: -4, w: 18, h: 44, tone: warm, flat: 0.7, summit: 0.1 },
      { x: -8, y: -8, w: 22, h: 58, tone: grey, flat: 0.55, summit: -0.15 },
      { x: 20, y: -3, w: 18, h: 48, tone: warm, flat: 0.8, summit: 0.2 },
      { x: 46, y: 2, w: 14, h: 30, tone: dark, flat: 0.5 },
      { x: -52, y: 4, w: 10, h: 14, tone: grey },
      { x: 8, y: 7, w: 14, h: 10, tone: dark },
    ],
    gulls: [[-8, -57, 0.8], [21, -47, 0.7]],
  },
  {
    halo: [72, 19],
    rocks: [
      { x: -56, y: 2, w: 18, h: 11, tone: dark, summit: 0.2 },
      { x: -38, y: -4, w: 22, h: 16, tone: green, summit: -0.3 },
      { x: -16, y: 3, w: 16, h: 9, tone: dark },
      { x: 2, y: -5, w: 26, h: 19, tone: dark, summit: 0.25 },
      { x: 26, y: 4, w: 18, h: 11, tone: grey, summit: -0.2 },
      { x: 44, y: -2, w: 22, h: 14, tone: green, summit: 0.1 },
      { x: 58, y: 5, w: 12, h: 7, tone: dark },
    ],
  },
  {
    halo: [66, 17],
    rocks: [
      { x: -26, y: 0, w: 38, h: 26, tone: grey, flat: 0.6, cap: '#7aa05a' },
      { x: 24, y: -4, w: 30, h: 34, tone: warm, flat: 0.5, cap: '#6f9a52', summit: 0.2 },
      { x: -2, y: 8, w: 16, h: 12, tone: dark },
      { x: 50, y: 6, w: 12, h: 9, tone: grey },
      { x: -52, y: 6, w: 10, h: 8, tone: dark },
    ],
    gulls: [[-30, -26, 0.8], [26, -34, 0.7], [-20, -26, 0.6]],
  },
];

/** A cluster of rocks and stacks standing in pale shallows. */
const rocks = defineSymbol({
  id: 'sea.rocks',
  name: 'Sea Rocks',
  category: 'sea',
  size: [140, 90],
  anchor: [0.5, 0.78],
  order: 61,
  tags: ['rocks', 'stone', 'sea', 'stacks', 'skerries', 'reef', 'hazard', 'cluster'],
  placement: 'sea',
  layer: 'object',
  variants: CLUSTERS.length,
  draw({ ctx, w, h, rand, variant }) {
    ctx.translate(w / 2, h * 0.78);
    const pen = makePen(ctx, rand);
    const c = CLUSTERS[variant % CLUSTERS.length]!;
    softBlob(ctx, 0, 3, c.halo[0], c.halo[1], '#46b4b8', 0.36);
    softBlob(ctx, 0, 3, c.halo[0] * 0.74, c.halo[1] * 0.7, '#9fe6dc', 0.42);
    for (const r of [...c.rocks].sort((a, b) => a.y - b.y)) paintRock(pen, r);
    for (const [x, y, s] of c.gulls ?? []) gull(pen, x, y, s, x < 0 ? 1 : -1);
  },
});

const ISLETS: IsletLook[] = [
  {
    rx: 34,
    ry: 11,
    sand: '#e6cf93',
    palms: [{ x: -8, y: 0, w: 30, h: 44, lean: 0.12 }],
    props: [{ kind: 'bush', x: 14, y: -1 }, { kind: 'shells', x: 4, y: 4 }],
    rocks: [{ x: 31, y: 7, w: 14, h: 12, tone: grey, summit: 0.2 }, { x: -29, y: 8, w: 10, h: 8, tone: dark }],
  },
  {
    rx: 38,
    ry: 12,
    sand: '#ead59c',
    palms: [{ x: -15, y: -1, w: 28, h: 40, lean: -0.1 }, { x: 12, y: 3, w: 24, h: 33, lean: 0.17 }],
    props: [{ kind: 'log', x: -3, y: 6 }],
    rocks: [{ x: 36, y: 6, w: 13, h: 10, tone: dark }],
  },
  {
    rx: 44,
    ry: 7,
    sand: '#efdcaa',
    props: [{ kind: 'log', x: -14, y: 1 }, { kind: 'shells', x: 12, y: 3 }, { kind: 'flag', x: 27, y: 0 }, { kind: 'barrel', x: -29, y: 2 }],
    rocks: [{ x: -40, y: 5, w: 12, h: 10, tone: grey }, { x: 42, y: 4, w: 10, h: 8, tone: dark }],
  },
  {
    rx: 31,
    ry: 11,
    sand: '#dcc68a',
    turf: { color: '#6a9a4c', rx: 21, ry: 7, x: -3, y: -1 },
    palms: [{ x: 11, y: 0, w: 26, h: 36, lean: 0.14 }],
    props: [{ kind: 'chest', x: -13, y: 3 }, { kind: 'bush', x: -12, y: -2, s: 0.9 }],
    rocks: [{ x: 30, y: 6, w: 12, h: 9, tone: green }],
  },
];

/** Waterline of the islet inside its 92 px tall box (the water ring needs room below it). */
const ISLET_BASE = 62;

/** A tiny sandy islet: palms, rocks, and sometimes something washed up. */
const islet = defineSymbol({
  id: 'sea.islet',
  name: 'Sandy Islet',
  category: 'sea',
  size: [104, 92],
  anchor: [0.5, ISLET_BASE / 92],
  order: 62,
  tags: ['islet', 'island', 'palm', 'sand', 'tropical', 'sandbar', 'treasure', 'beach', 'cay'],
  placement: 'sea',
  layer: 'object',
  variants: ISLETS.length,
  draw({ ctx, w, rand, variant }) {
    ctx.translate(w / 2, ISLET_BASE);
    drawIslet(makePen(ctx, rand), ISLETS[variant % ISLETS.length]!);
  },
});

export default [rocks, islet];
