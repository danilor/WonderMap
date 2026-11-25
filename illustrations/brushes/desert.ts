import { defineBrush } from '../kit/define';

/** Scatter brushes for dry lands. */
export default [
  defineBrush({
    id: 'desert.dunes',
    name: 'Dunes',
    category: 'desert',
    blurb: 'Rolling sand dunes',
    items: [
      { symbol: 'desert.dune', weight: 6 },
      { symbol: 'desert.dunes', weight: 2 },
    ],
    spacing: 64,
    scale: [0.8, 1.3],
    order: 10,
  }),
  defineBrush({
    id: 'desert.cacti',
    name: 'Cacti',
    category: 'desert',
    blurb: 'Saguaros, barrel cacti and prickly pears',
    items: [
      { symbol: 'cactus.saguaro', weight: 3 },
      { symbol: 'cactus.barrel', weight: 3 },
      { symbol: 'cactus.prickly-pear', weight: 3 },
      { symbol: 'desert.cactus-group', weight: 1 },
    ],
    spacing: 46,
    scale: [0.8, 1.25],
    order: 20,
  }),
  defineBrush({
    id: 'desert.scrub',
    name: 'Desert scrub',
    category: 'desert',
    blurb: 'Dry bushes, dead grass and cracked earth',
    items: [
      { symbol: 'bush.dry', weight: 4 },
      { symbol: 'grass.dry', weight: 3 },
      { symbol: 'grass.dry.tuft', weight: 3 },
      { symbol: 'desert.cracked', weight: 1 },
      { symbol: 'cactus.barrel', weight: 1 },
    ],
    spacing: 34,
    scale: [0.8, 1.3],
    order: 30,
  }),
  defineBrush({
    id: 'desert.mesas',
    name: 'Mesas & buttes',
    category: 'desert',
    blurb: 'Flat-topped rock towers and spires',
    items: [
      { symbol: 'desert.mesa', weight: 3 },
      { symbol: 'desert.butte', weight: 3 },
      { symbol: 'desert.spires', weight: 1 },
      { symbol: 'desert.rock-arch', weight: 0.5 },
    ],
    spacing: 92,
    scale: [0.8, 1.2],
    order: 40,
  }),
  defineBrush({
    id: 'desert.bones',
    name: 'Bones & tumbleweed',
    category: 'desert',
    blurb: 'Bleached skulls, dead trees and rolling tumbleweeds',
    items: [
      { symbol: 'desert.tumbleweed', weight: 4 },
      { symbol: 'desert.dead-tree', weight: 2 },
      { symbol: 'desert.skull', weight: 1.5 },
    ],
    spacing: 60,
    scale: [0.8, 1.25],
    jitter: 0.5,
    order: 50,
  }),
];
