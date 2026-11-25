import { defineBrush } from '../kit/define';

/** Scatter brushes for wetlands. */
export default [
  defineBrush({
    id: 'swamp.marsh',
    name: 'Marsh',
    category: 'swamp',
    blurb: 'Reeds, bogs, pools and lily pads',
    items: [
      { symbol: 'swamp.reeds', weight: 4 },
      { symbol: 'swamp.pool', weight: 2 },
      { symbol: 'swamp.bog', weight: 2 },
      { symbol: 'swamp.lilies', weight: 2 },
    ],
    spacing: 38,
    scale: [0.8, 1.3],
    order: 10,
  }),
  defineBrush({
    id: 'swamp.trees',
    name: 'Swamp trees',
    category: 'swamp',
    blurb: 'Willows, mangroves and dead trunks',
    items: [
      { symbol: 'swamp.willow', weight: 3 },
      { symbol: 'swamp.mangrove', weight: 3 },
      { symbol: 'swamp.dead-tree', weight: 2 },
      { symbol: 'swamp.log', weight: 1 },
    ],
    spacing: 52,
    scale: [0.8, 1.2],
    order: 20,
  }),
  defineBrush({
    id: 'swamp.fungus',
    name: 'Bog fungus',
    category: 'swamp',
    blurb: 'Mushrooms with the odd skull',
    items: [
      { symbol: 'swamp.mushrooms', weight: 5 },
      { symbol: 'swamp.skull', weight: 0.3 },
      { symbol: 'swamp.log', weight: 1 },
    ],
    spacing: 36,
    scale: [0.8, 1.3],
    order: 30,
  }),
  defineBrush({
    id: 'swamp.mist',
    name: 'Swamp mist',
    category: 'swamp',
    blurb: 'Drifting fog and will-o-the-wisps',
    items: [
      { symbol: 'swamp.mist', weight: 4 },
      { symbol: 'swamp.wisp', weight: 1 },
    ],
    spacing: 84,
    scale: [0.9, 1.4],
    jitter: 0.5,
    order: 40,
  }),
];
