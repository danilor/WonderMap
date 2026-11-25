import { defineSymbol } from '../../kit/define';
import { SKY, STORM, drawCloud, drawFlock } from '../../parts/sea-sky';
import type { CloudKind, CloudTone, FlockKind } from '../../parts/sea-sky';

const CLOUDS: Array<[kind: CloudKind, tone: CloudTone]> = [
  ['cumulus', SKY],
  ['twin', SKY],
  ['streak', SKY],
  ['wisp', SKY],
  ['heavy', STORM],
];

const cloud = defineSymbol({
  id: 'decor.cloud',
  name: 'Cloud',
  category: 'decor',
  size: [200, 132],
  anchor: [0.5, 0.6],
  layer: 'air',
  placement: 'any',
  rotatable: true,
  variants: CLOUDS.length,
  tags: ['cloud', 'sky', 'weather', 'storm', 'air'],
  order: 20,
  draw: ({ ctx, w, rand, variant }) => {
    const [kind, tone] = CLOUDS[variant % CLOUDS.length]!;
    drawCloud(ctx, rand, w, kind, tone);
  },
});

const FLOCKS: FlockKind[] = ['vee', 'gulls', 'crows', 'pair'];

const birds = defineSymbol({
  id: 'decor.birds',
  name: 'Flock of Birds',
  category: 'decor',
  size: [140, 110],
  anchor: [0.5, 0.5],
  layer: 'air',
  placement: 'any',
  rotatable: true,
  variants: FLOCKS.length,
  tags: ['birds', 'flock', 'gulls', 'geese', 'crows', 'sky', 'air'],
  order: 21,
  draw: ({ ctx, w, h, rand, variant }) => drawFlock(ctx, rand, w, h, FLOCKS[variant % FLOCKS.length]!),
});

export default [cloud, birds];
