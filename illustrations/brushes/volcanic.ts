import { defineBrush } from '../kit/define';

/** Scatter brushes for volcanic ground. */
export default [
  defineBrush({
    id: 'volcanic.lava',
    name: 'Lava fields',
    category: 'volcanic',
    blurb: 'Glowing lava flows and pools',
    items: [
      { symbol: 'lava.flow', weight: 3 },
      { symbol: 'lava.pool', weight: 2 },
    ],
    spacing: 66,
    scale: [0.8, 1.3],
    order: 10,
  }),
  defineBrush({
    id: 'volcanic.peaks',
    name: 'Volcanic peaks',
    category: 'volcanic',
    blurb: 'A smoking range of ash cones and dormant volcanoes',
    items: [
      { symbol: 'volcano.ash', weight: 3 },
      { symbol: 'volcano.dormant', weight: 3 },
      { symbol: 'volcano.active', weight: 1.5 },
      { symbol: 'volcano.crater', weight: 1 },
    ],
    spacing: 110,
    scale: [0.8, 1.15],
    order: 20,
  }),
  defineBrush({
    id: 'volcanic.springs',
    name: 'Geysers & hot springs',
    category: 'volcanic',
    blurb: 'Steaming vents and bubbling pools',
    items: [
      { symbol: 'volcano.geyser', weight: 2 },
      { symbol: 'volcano.hotspring', weight: 3 },
      { symbol: 'cave.sinkhole', weight: 0.5 },
    ],
    spacing: 72,
    scale: [0.8, 1.25],
    order: 30,
  }),
  defineBrush({
    id: 'volcanic.fissures',
    name: 'Rifts & sinkholes',
    category: 'volcanic',
    blurb: 'Cracks in the broken earth',
    items: [
      { symbol: 'cave.rift', weight: 3 },
      { symbol: 'cave.sinkhole', weight: 2 },
      { symbol: 'rock.boulders', weight: 1 },
    ],
    spacing: 80,
    scale: [0.8, 1.3],
    order: 40,
  }),
];
