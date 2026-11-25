import { defineBrush } from '../kit/define';

/** Scatter brushes for the frozen north. */
export default [
  defineBrush({
    id: 'ice.mountains',
    name: 'Ice mountains',
    category: 'ice',
    blurb: 'Frosted peaks and ridges',
    items: [
      { symbol: 'ice.mountain', weight: 5 },
      { symbol: 'ice.mountain.range', weight: 1.5 },
    ],
    spacing: 72,
    scale: [0.8, 1.2],
    order: 10,
  }),
  defineBrush({
    id: 'ice.hills',
    name: 'Frozen hills',
    category: 'ice',
    blurb: 'Snow-covered rolling hills',
    items: [
      { symbol: 'ice.hill', weight: 4 },
      { symbol: 'ice.hill.cluster', weight: 1.5 },
    ],
    spacing: 60,
    scale: [0.8, 1.25],
    order: 20,
  }),
  defineBrush({
    id: 'ice.drifts',
    name: 'Snow drifts',
    category: 'ice',
    blurb: 'Windblown snow, ice rocks and spikes',
    items: [
      { symbol: 'ice.snowdrift', weight: 5 },
      { symbol: 'ice.rocks', weight: 2 },
      { symbol: 'ice.spikes', weight: 1 },
    ],
    spacing: 40,
    scale: [0.8, 1.3],
    order: 30,
  }),
  defineBrush({
    id: 'ice.bergs',
    name: 'Icebergs',
    category: 'ice',
    blurb: 'Bergs and floes drifting on the sea',
    items: [
      { symbol: 'ice.iceberg', weight: 3 },
      { symbol: 'ice.floe', weight: 4 },
    ],
    spacing: 96,
    scale: [0.7, 1.3],
    jitter: 0.6,
    order: 40,
  }),
  defineBrush({
    id: 'ice.dead-trees',
    name: 'Frozen trees',
    category: 'ice',
    blurb: 'Dead trees and snowy pines on the tundra',
    items: [
      { symbol: 'ice.tree.dead', weight: 3 },
      { symbol: 'tree.pine.snowy', weight: 3 },
      { symbol: 'ice.snowdrift', weight: 1 },
    ],
    spacing: 44,
    scale: [0.8, 1.2],
    order: 50,
  }),
];
