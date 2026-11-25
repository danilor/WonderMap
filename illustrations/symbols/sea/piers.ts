import { defineSymbol } from '../../kit/define';
import type { PierLook } from '../../parts/sea-pier';
import { drawPier } from '../../parts/sea-pier';
import { WOOD } from '../../parts/ship-parts';
import { makePen } from '../../parts/ship-types';

const PIERS: PierLook[] = [
  { len: 118, wood: WOOD.oak, ruin: 0, head: 'plain', props: true },
  { len: 108, wood: WOOD.pale, ruin: 0, head: 'lantern' },
  { len: 112, wood: WOOD.pine, ruin: 0.04, head: 'tee', props: true },
  { len: 78, wood: WOOD.dark, ruin: 0.06, head: 'plain' },
];

/** A wooden pier running out from the shore (the shore end is the anchor; rotate it to point out to sea). */
const pier = defineSymbol({
  id: 'sea.pier',
  name: 'Wooden Pier',
  category: 'sea',
  size: [152, 76],
  anchor: [0.07, 0.56],
  order: 44,
  tags: ['pier', 'jetty', 'dock', 'harbour', 'harbor', 'wharf', 'quay', 'wooden', 'port', 'lantern'],
  placement: 'any',
  layer: 'object',
  rotatable: true,
  variants: PIERS.length,
  draw({ ctx, rand, variant }) {
    drawPier(makePen(ctx, rand), PIERS[variant % PIERS.length]!);
  },
});

const DOCKS: PierLook[] = [
  { len: 118, wood: WOOD.oak, ruin: 0.55, head: 'plain' },
  { len: 122, wood: WOOD.pale, ruin: 0.42, head: 'plain', sag: true },
  { len: 112, wood: WOOD.dark, ruin: 0.92, head: 'plain' },
  { len: 112, wood: WOOD.pine, ruin: 0.62, head: 'tee', props: true, sag: true },
];

/** The rotten stump of a dock: planks gone, piles leaning, the outer end collapsed into the water. */
const dock = defineSymbol({
  id: 'wreck.dock',
  name: 'Ruined Dock',
  category: 'sea',
  size: [152, 76],
  anchor: [0.07, 0.56],
  order: 56,
  tags: ['wreck', 'dock', 'ruin', 'ruined', 'pier', 'broken', 'jetty', 'derelict', 'abandoned', 'harbour', 'wharf'],
  placement: 'any',
  layer: 'object',
  rotatable: true,
  variants: DOCKS.length,
  draw({ ctx, rand, variant }) {
    drawPier(makePen(ctx, rand), DOCKS[variant % DOCKS.length]!);
  },
});

export default [pier, dock];
