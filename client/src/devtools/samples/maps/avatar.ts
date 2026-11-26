import { MapBuilder } from '../MapBuilder';
import type { BuildResult } from '../MapBuilder';
import { circle, ellipse } from '../geometry';
import type { Polygon } from '../geometry';

/**
 * The world of Avatar: The Last Airbender, drawn from memory of the series' map: the Fire Nation islands in the west,
 * the Earth Kingdom across the middle and east, the Water Tribes at the poles and an Air Temple at each point of the compass.
 * An unofficial fan tribute; the names belong to their owners.
 */

const WIDTH = 4200;
const HEIGHT = 2800;

const EARTH_KINGDOM: Polygon = [
  [1480, 2000], [1560, 2060], [1700, 2080], [1790, 2150], [1900, 2120], [2010, 2060], [2160, 2090], [2290, 2160], [2420, 2110],
  [2520, 2020], [2620, 1960], [2720, 1990], [2800, 2090], [2920, 2160], [3050, 2120], [3130, 1980], [3150, 1800], [3180, 1600],
  [3360, 1600], [3400, 1780], [3380, 1980], [3440, 2100], [3560, 2150], [3700, 2090], [3820, 2020], [3900, 1900], [3960, 1780],
  [3920, 1650], [3990, 1520], [3950, 1360], [4010, 1200], [3950, 1060], [3860, 940], [3780, 800], [3660, 740], [3600, 640],
  [3520, 700], [3460, 800], [3390, 740], [3350, 620], [3250, 560], [3120, 600], [2990, 570], [2870, 620], [2750, 560],
  [2620, 600], [2500, 540], [2380, 600], [2300, 700], [2200, 660], [2090, 700], [1990, 640], [1880, 660], [1800, 740],
  [1700, 800], [1600, 860], [1520, 940], [1460, 1040], [1410, 1130], [1350, 1220], [1380, 1340], [1330, 1450], [1370, 1560],
  [1320, 1660], [1380, 1760], [1430, 1870],
];

const NORTH_POLE: Polygon = [
  [1480, 260], [1560, 170], [1700, 130], [1860, 160], [1980, 110], [2150, 140], [2290, 100], [2460, 150], [2620, 120],
  [2780, 170], [2880, 260], [2820, 340], [2680, 330], [2600, 410], [2470, 380], [2330, 430], [2200, 380], [2040, 430],
  [1900, 380], [1760, 420], [1620, 380], [1520, 340],
];

const SOUTH_POLE: Polygon = [
  [1280, 2580], [1380, 2480], [1540, 2470], [1620, 2400], [1780, 2440], [1940, 2400], [2120, 2450], [2300, 2400],
  [2480, 2440], [2640, 2400], [2820, 2450], [2940, 2550], [2900, 2660], [2760, 2700], [2640, 2670], [2480, 2720],
  [2300, 2690], [2140, 2720], [1960, 2690], [1800, 2710], [1640, 2690], [1470, 2710], [1340, 2660],
];

const NORTH_ICE: Polygon = [[1680, 220], [2100, 190], [2420, 250], [2300, 330], [1900, 340], [1700, 300]];
const SOUTH_ICE: Polygon = [[1480, 2540], [2000, 2500], [2540, 2530], [2720, 2610], [2300, 2650], [1800, 2650], [1500, 2630]];

const SI_WONG_DESERT: Polygon = [
  [2000, 1330], [2200, 1250], [2450, 1270], [2640, 1370], [2680, 1560], [2560, 1720], [2300, 1780], [2060, 1700], [1950, 1530],
];

const FOGGY_SWAMP: Polygon = [[1440, 1800], [1600, 1740], [1780, 1760], [1860, 1860], [1800, 1990], [1620, 2020], [1470, 1960]];
const JUNGLE: Polygon = [[1380, 1700], [1900, 1650], [1990, 1900], [1920, 2130], [1450, 2060]];

const GREAT_DIVIDE: Polygon = [[1960, 1030], [2150, 1070], [2330, 1140], [2480, 1200]];
const KOLAU: Polygon = [[1470, 1240], [1600, 1320], [1740, 1400], [1880, 1470]];
const SERPENTS_PASS: Polygon = [[2640, 1090], [2760, 1000], [2900, 960], [3030, 920], [3060, 975], [2940, 1040], [2820, 1090], [2680, 1135]];
const LAKE_LAOGAI: Polygon = ellipse(3540, 1090, 90, 58, 0.4, 10);

interface Isle {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rotation?: number;
  terrain: string;
}

const FIRE_ISLES: Isle[] = [
  { x: 560, y: 1130, rx: 230, ry: 190, rotation: -0.3, terrain: 'ash' },
  { x: 620, y: 560, rx: 110, ry: 80, terrain: 'ash' },
  { x: 390, y: 760, rx: 60, ry: 50, terrain: 'stone' },
  { x: 760, y: 880, rx: 110, ry: 70, rotation: 0.6, terrain: 'ash' },
  { x: 420, y: 440, rx: 120, ry: 70, terrain: 'ash' },
  { x: 800, y: 440, rx: 90, ry: 60, terrain: 'ash' },
  { x: 960, y: 820, rx: 80, ry: 55, terrain: 'ash' },
  { x: 1000, y: 1040, rx: 60, ry: 100, terrain: 'ash' },
  { x: 1000, y: 1330, rx: 90, ry: 60, terrain: 'ash' },
  { x: 560, y: 1520, rx: 120, ry: 80, terrain: 'ash' },
  { x: 780, y: 1560, rx: 90, ry: 60, terrain: 'ash' },
  { x: 400, y: 1680, rx: 70, ry: 50, terrain: 'ash' },
];

const AIR_TEMPLES: Array<{ name: string; x: number; y: number; rx: number; ry: number }> = [
  { name: 'Western Air Temple', x: 1100, y: 320, rx: 120, ry: 85 },
  { name: 'Southern Air Temple', x: 850, y: 2120, rx: 130, ry: 90 },
  { name: 'Eastern Air Temple', x: 3650, y: 2400, rx: 140, ry: 95 },
  { name: 'Northern Air Temple', x: 3150, y: 300, rx: 130, ry: 85 },
];

const COAST = { gain: 0.62, octaves: 5 } as const;
const SEA: Polygon = [[0, 0], [WIDTH, 0], [WIDTH, HEIGHT], [0, HEIGHT]];

const isleArea = (i: { x: number; y: number; rx: number; ry: number; rotation?: number }, share = 0.85) =>
  ellipse(i.x, i.y, i.rx * share, i.ry * share, i.rotation ?? 0, 14);

function lands(b: MapBuilder): void {
  b.land(EARTH_KINGDOM, 'grass', { amp: 40, scale: 300, ...COAST });
  b.paint(JUNGLE, 'jungle', { amp: 50, scale: 260 });
  b.paint(SI_WONG_DESERT, 'desert', { amp: 40, scale: 260 });
  b.paint(FOGGY_SWAMP, 'swamp', { amp: 30, scale: 200 });
  b.band(GREAT_DIVIDE, 90, 'stone');
  b.band(KOLAU, 110, 'earth');
  b.lake(SERPENTS_PASS, { amp: 10, scale: 100 });
  b.lake(LAKE_LAOGAI, { amp: 8, scale: 80 });

  b.land(NORTH_POLE, 'snow', { amp: 30, scale: 260, ...COAST });
  b.land(SOUTH_POLE, 'snow', { amp: 30, scale: 260, ...COAST });
  b.paint(NORTH_ICE, 'ice', { amp: 30, scale: 200 });
  b.paint(SOUTH_ICE, 'ice', { amp: 30, scale: 200 });

  for (const isle of FIRE_ISLES) b.island(isle.x, isle.y, isle.rx, isle.ry, isle.terrain, { rotation: isle.rotation, ...COAST });
  for (const temple of AIR_TEMPLES) b.island(temple.x, temple.y, temple.rx, temple.ry, 'stone', COAST);
  b.island(2150, 2290, 130, 60, 'grass', { rotation: 0.2, ...COAST });
  b.island(1150, 2300, 100, 55, 'grass', COAST);
  b.island(3300, 2350, 60, 40, 'grass', COAST);
  b.island(3800, 420, 60, 40, 'grass', COAST);
}

function earthKingdom(b: MapBuilder): void {
  /* Mountains and canyons */
  b.scatter({ brush: 'mountains.brown', area: b.ridge(KOLAU, 240, 30), gap: 0.85, peak: 0.25 });
  b.scatter({ brush: 'hills.brown', area: b.ridge(KOLAU, 460, 30), hole: 0.35 });
  b.scatter({ brush: 'crags.brown', area: b.ridge(GREAT_DIVIDE, 300, 20), gap: 1.15, hole: 0.35 });
  GREAT_DIVIDE.forEach((from, i) => {
    const to = GREAT_DIVIDE[i + 1];
    if (!to) return;
    const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
    for (let k = 0; k < 2; k++) {
      const t = k / 2;
      b.place('cave.rift', from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, { rotation: angle, size: 1.15, clear: 1 });
    }
  });

  /* Forests */
  b.scatter({ brush: 'forest.dark', area: [[1540, 760], [1800, 720], [1900, 900], [1860, 1130], [1640, 1150], [1520, 980]], warp: 50, soft: 80, inset: 30 });
  b.scatter({ brush: 'forest.oak', area: [[2750, 700], [3000, 680], [3050, 800], [2850, 860]], warp: 40, soft: 60 });
  b.scatter({ brush: 'forest.blossom', area: [[3550, 1250], [3800, 1200], [3900, 1450], [3700, 1560], [3500, 1450]], warp: 50, soft: 80 });
  b.scatter({ brush: 'forest.oak', area: [[2850, 1700], [3050, 1650], [3100, 1950], [2900, 2020], [2760, 1900]], warp: 50, soft: 80 });
  b.scatter({ brush: 'forest.autumn', area: [[3700, 800], [3880, 900], [3880, 1100], [3720, 1100]], warp: 40, soft: 60 });
  b.scatter({ brush: 'forest.jungle', area: [[1440, 1680], [1900, 1640], [1960, 1740], [1500, 1760]], warp: 40, soft: 60, on: ['jungle'] });
  b.scatter({ brush: 'forest.patches', area: EARTH_KINGDOM, inset: 40, hole: 0.55, gap: 1.2 });

  /* Farmland around the great cities */
  for (const [x, y, r] of [[3250, 900, 420], [2540, 1900, 330], [1650, 1500, 260]] as const) {
    b.scatter({ brush: 'veg.farmland', area: circle(x, y, r, 14), warp: 40, soft: 90, hole: 0.3 });
    b.scatter({ brush: 'veg.wheat', area: circle(x, y, r * 1.1, 14), warp: 40, soft: 100, hole: 0.45 });
  }

  /* Hills and grassland */
  b.scatter({ brush: 'hills.green', area: [[2000, 720], [2400, 700], [2650, 760], [2500, 900], [2200, 880]], warp: 60, soft: 90, hole: 0.3 });
  b.scatter({ brush: 'hills.green', area: [[3700, 1600], [3920, 1700], [3860, 1950], [3600, 2000], [3560, 1800]], warp: 60, soft: 90, hole: 0.3 });
  b.scatter({ brush: 'hills.green', area: [[2750, 1250], [3050, 1230], [3150, 1450], [2900, 1520], [2720, 1420]], warp: 60, soft: 90, hole: 0.4 });
  b.scatter({ brush: 'veg.meadow', area: EARTH_KINGDOM, inset: 20, hole: 0.55, gap: 1.3, on: ['grass', 'jungle'] });
  b.scatter({ brush: 'veg.flowers', area: EARTH_KINGDOM, inset: 20, hole: 0.5, gap: 1.8, on: ['grass'] });
  b.scatter({ brush: 'veg.bushes', area: EARTH_KINGDOM, inset: 20, hole: 0.5, gap: 1.6, on: ['grass', 'earth'] });

  /* The Si Wong Desert */
  b.scatter({ brush: 'desert.mesas', area: SI_WONG_DESERT, on: ['desert'], inset: 20, hole: 0.4 });
  b.scatter({ brush: 'desert.dunes', area: SI_WONG_DESERT, on: ['desert'], inset: 20, hole: 0.25 });
  b.scatter({ brush: 'desert.cacti', area: SI_WONG_DESERT, on: ['desert'], inset: 20, hole: 0.55 });
  b.scatter({ brush: 'desert.scrub', area: SI_WONG_DESERT, on: ['desert'], inset: 20, hole: 0.6, gap: 1.2 });
  b.scatter({ brush: 'desert.bones', area: SI_WONG_DESERT, on: ['desert'], inset: 20, hole: 0.8 });

  /* The Foggy Swamp */
  b.scatter({ brush: 'swamp.trees', area: FOGGY_SWAMP, on: ['swamp'], hole: 0.15 });
  b.scatter({ brush: 'swamp.marsh', area: FOGGY_SWAMP, on: ['swamp'], hole: 0.3 });
  b.scatter({ brush: 'swamp.fungus', area: FOGGY_SWAMP, on: ['swamp'], hole: 0.6 });
  b.scatter({ brush: 'swamp.mist', area: FOGGY_SWAMP, on: ['swamp'], hole: 0.5 });
}

function fireNation(b: MapBuilder): void {
  for (const isle of FIRE_ISLES) {
    const area = isleArea(isle);
    b.scatter({ brush: isle.terrain === 'stone' ? 'crags.gray' : 'mountains.black', area, hole: 0.45, inset: 10, gap: 0.9 });
    b.scatter({ brush: 'volcanic.peaks', area, hole: 0.35, inset: 10 });
    b.scatter({ brush: 'volcanic.lava', area, hole: 0.4, inset: 10 });
    b.scatter({ brush: 'volcanic.springs', area, hole: 0.7, inset: 10 });
  }
  b.scatter({ brush: 'forest.palm', area: isleArea(FIRE_ISLES[1]!, 0.9), hole: 0.3, inset: 8 });
  b.scatter({ brush: 'forest.palm', area: isleArea(FIRE_ISLES[4]!, 0.9), hole: 0.5, inset: 8 });

  const capital = FIRE_ISLES[0]!;
  b.place('volcano.active', capital.x - 120, capital.y - 80, { size: 1.1 });
  b.place('volcano.dormant', capital.x + 140, capital.y - 70, { size: 1.0 });
  b.site('settlement.city.large', capital.x - 10, capital.y + 110, 'Fire Nation Capital', { size: 0.85 });
  b.site('castle.fortress', capital.x + 150, capital.y + 70, null, { size: 0.6 });

  b.site('settlement.town', 620, 575, 'Ember Island', { size: 0.8 });
  b.site('castle.fortress', 390, 790, 'Boiling Rock', { size: 0.5, side: 'left' });
  b.site('settlement.port', 760, 905, 'Fire Fountain City', { size: 0.7 });
  b.site('settlement.village', 420, 470, null, { size: 0.8 });
  b.site('settlement.village', 810, 465, null, { size: 0.8 });
  b.site('settlement.hamlet', 960, 835, null, { size: 0.8 });
  b.site('settlement.port', 1000, 1090, null, { size: 0.7 });
  b.site('settlement.village', 1010, 1345, null, { size: 0.8 });
  b.site('volcano.erupting', 555, 1510, null, { size: 0.9 });
  b.site('settlement.port', 780, 1580, null, { size: 0.7 });
  b.site('settlement.hamlet', 410, 1695, null, { size: 0.8 });
}

function poles(b: MapBuilder): void {
  for (const area of [NORTH_POLE, SOUTH_POLE]) {
    b.scatter({ brush: 'ice.mountains', area, inset: 15, hole: 0.45 });
    b.scatter({ brush: 'ice.hills', area, inset: 15, hole: 0.5 });
    b.scatter({ brush: 'ice.drifts', area, inset: 15, hole: 0.55, gap: 1.2 });
  }
  b.scatter({ brush: 'ice.bergs', area: [[1300, 40], [3050, 40], [3050, 600], [1300, 600]], where: 'sea', reach: 240, hole: 0.4 });
  b.scatter({ brush: 'ice.bergs', area: [[1150, 2300], [3100, 2300], [3100, 2800], [1150, 2800]], where: 'sea', reach: 240, hole: 0.4 });

  b.site('settlement.walled-town', 2000, 245, 'Northern Water Tribe', { size: 1, labelSize: 36 });
  b.place('ice.frozen-lake', 2350, 270, { size: 0.8, clear: 1 });
  for (const [x, y] of [[1720, 270], [1840, 300], [2200, 330], [2500, 330], [2620, 260]] as const) b.place('ice.igloo', x, y, { size: 0.9, clear: 1 });

  b.site('settlement.town', 1900, 2560, 'Southern Water Tribe', { size: 1, labelSize: 36 });
  for (const [x, y] of [[1760, 2590], [1790, 2640], [2050, 2600], [2200, 2570], [2380, 2600], [2520, 2640]] as const) b.place('ice.igloo', x, y, { size: 0.9, clear: 1 });
  b.place('ice.cave', 2650, 2610, { size: 0.9, clear: 1 });
}

function islands(b: MapBuilder): void {
  for (const temple of AIR_TEMPLES) {
    b.scatter({ brush: 'mountains.snowy', area: isleArea(temple, 0.9), hole: 0.3, inset: 6, gap: 0.9 });
    b.scatter({ brush: 'crags.gray', area: isleArea(temple, 0.9), hole: 0.6, inset: 6 });
    b.site('landmark.temple', temple.x, temple.y + 30, temple.name, { size: 0.95 });
  }

  b.scatter({ brush: 'forest.oak', area: [[2020, 2240], [2280, 2240], [2280, 2340], [2020, 2340]], inset: 6, hole: 0.2 });
  b.scatter({ brush: 'forest.palm', area: [[1070, 2260], [1240, 2260], [1240, 2340], [1070, 2340]], inset: 6, hole: 0.2 });
  b.site('settlement.village', 2110, 2285, 'Kyoshi Island', { size: 0.85, side: 'above' });
  b.site('settlement.hamlet', 2230, 2290, null, { size: 0.8 });
  b.site('settlement.village', 1150, 2305, 'Whale Tail Island', { size: 0.8, side: 'above' });
  b.site('settlement.hamlet', 3300, 2350, null, { size: 0.8 });
  b.site('settlement.hamlet', 3800, 425, null, { size: 0.8 });
}

function towns(b: MapBuilder): void {
  b.site('settlement.city.large', 3250, 900, 'Ba Sing Se', { size: 1.05 });
  b.site('settlement.city', 1650, 1500, 'Omashu', { size: 0.95 });
  b.site('settlement.city', 2540, 1900, 'Gaoling');
  b.site('settlement.port', 3490, 1960, null, { size: 0.9 });

  b.site('desert.oasis', 2200, 1480, 'Misty Palms Oasis', { size: 0.9, style: 'landmark' });
  b.place('desert.oasis', 2490, 1570, { size: 0.8 });
  b.place('desert.pyramids', 2380, 1440, { size: 0.8 });
  b.place('desert.camp', 2110, 1590, { size: 0.8 });
  b.place('desert.camp', 2560, 1440, { size: 0.8 });
  b.place('desert.rock-arch', 2290, 1340, { size: 0.9 });

  b.site('settlement.hamlet', 3520, 1450, null);
  b.site('settlement.village', 3700, 1320, null);
  b.site('settlement.village', 2820, 1540, null);
  b.site('settlement.hamlet', 3050, 1260, null);
  b.site('settlement.village', 2300, 830, null);
  b.site('settlement.fort', 1980, 960, null, { size: 0.9 });
  b.site('settlement.hamlet', 3800, 1060, null);
  b.site('settlement.village', 3650, 1830, null);
  b.site('settlement.hamlet', 1480, 1100, null);
  b.site('settlement.village', 2000, 1820, null);

  b.place('swamp.hut', 1560, 1880, { size: 1 });
  b.place('swamp.hut', 1700, 1900, { size: 0.9 });
  b.place('swamp.hut', 1620, 1800, { size: 0.9 });
  b.place('swamp.willow', 1760, 1960, { size: 1.2, clear: 1 });

  b.place('landmark.lighthouse', 3140, 1640, { size: 0.8, clear: 1 });
  b.place('landmark.windmill', 3120, 1020, { size: 0.8, clear: 1 });
  b.place('landmark.windmill', 3370, 1060, { size: 0.8, clear: 1 });
  b.place('landmark.watchtower', 1800, 1240, { size: 0.8, clear: 1 });
}

function waters(b: MapBuilder): void {
  b.path('river', [[3020, 930], [3100, 1000], [3300, 1090], [3450, 1080]], 20, { wiggle: 30 });
  b.path('river', [[3560, 1030], [3590, 900], [3520, 800]], 20, { wiggle: 20 });
  b.path('river', [[1700, 1580], [1760, 1700], [1800, 1830], [1760, 1980], [1790, 2130]], 20, { wiggle: 40 });
  b.path('river', [[2800, 1400], [2950, 1500], [3100, 1560], [3260, 1640]], 20, { wiggle: 40 });
  b.path('river', [[3800, 1300], [3700, 1430], [3560, 1540], [3340, 1650]], 20, { wiggle: 40 });
  b.path('river', [[2200, 1000], [2300, 850], [2320, 650]], 18, { wiggle: 40 });

  b.path('road', [[1700, 1480], [1900, 1250], [2100, 1160], [2400, 1100], [2650, 1030], [2900, 980], [3120, 930]], 10, { wiggle: 30 });
  b.path('road', [[2540, 1900], [2800, 1700], [2950, 1400], [3100, 1150], [3200, 1000]], 10, { wiggle: 40 });
  b.path('road', [[3350, 960], [3500, 1200], [3650, 1320], [3700, 1400]], 10, { wiggle: 30 });
  b.path('road', [[3150, 920], [3000, 1250], [2820, 1540]], 8, { wiggle: 30 });
}

function sea(b: MapBuilder): void {
  b.scatter({ brush: 'sea.waves', area: SEA, where: 'sea', inset: 30, hole: 0.65 });
  b.scatter({ brush: 'sea.reefs', area: SEA, where: 'sea', reach: 220, inset: 40, hole: 0.5, gap: 1.2 });
  b.scatter({ brush: 'sea.rocks', area: SEA, where: 'sea', reach: 260, inset: 40, hole: 0.5, gap: 1.2 });

  b.place('sea.whirlpool', 1100, 1850, { size: 1 });
  b.place('sea.kraken', 250, 2050, { size: 1 });
  b.place('serpent.sea', 2850, 1010, { size: 0.9, rotation: -0.35 });
  b.place('sea.whale', 1150, 2560, { size: 1 });
  b.place('sea.whale', 3300, 2600, { size: 0.9, flip: true });
  b.place('sea.whale', 1050, 650, { size: 0.9 });
  b.place('wreck.graveyard', 780, 2620, { size: 0.9 });
  b.place('boat.fleet', 1230, 1450, { size: 1 });
  b.place('ship.galleon', 1200, 750, { size: 0.9 });
  b.place('ship.galleon', 1250, 1700, { size: 0.9, flip: true });
  b.place('ship.longship', 280, 1200, { size: 0.9 });
  b.place('boat.fishing', 2000, 2200, { size: 1 });
  b.place('boat.fishing', 1050, 2200, { size: 1 });
  b.place('ship.cog', 2900, 2300, { size: 1 });
  b.place('boat.fishing', 2450, 2300, { size: 1 });

  for (const [x, y] of [[190, 260], [1270, 640], [3970, 2330], [1280, 2640], [3900, 620]] as const) b.place('decor.cloud', x, y, { size: 1, clear: 0.5 });
  b.place('decor.compass.rose', 330, 2450, { size: 1, clear: 1 });
  b.place('decor.scale-bar', 3500, 2690, { size: 1, clear: 1 });
}

function names(b: MapBuilder): void {
  b.label('EARTH KINGDOM', 3270, 1400, { style: 'continent', size: 62, spacing: 0.12, curve: 0.08 });
  b.label('FIRE NATION', 560, 270, { style: 'region', spacing: 0.3 });
  b.label('NORTH POLE', 2650, 215, { style: 'region', size: 48, spacing: 0.3 });
  b.label('SOUTH POLE', 2480, 2690, { style: 'region', size: 48, spacing: 0.3 });
  b.label('SI WONG DESERT', 2330, 1700, { style: 'region', size: 50, spacing: 0.15 });
  b.label('Foggy Swamp', 1650, 1900, { style: 'wild' });
  b.label('Wulong Forest', 1700, 1000, { style: 'wild', rotation: -0.1 });
  b.label('Kolau Mountains', 1620, 1280, { style: 'mountain', rotation: 0.5 });
  b.label('The Great Divide', 2230, 1030, { style: 'landmark', rotation: 0.3, spacing: 0.1 });
  b.label('Mo Ce Sea', 1240, 1000, { style: 'sea', rotation: -Math.PI / 2 });
  b.label('Chameleon Bay', 3480, 530, { style: 'sea', size: 40 });
  b.label('Full Moon Bay', 3250, 2230, { style: 'sea', size: 40 });
  b.label("Serpent's Pass", 2850, 1015, { style: 'sea', size: 34, rotation: -0.35 });
  b.label('Lake Laogai', 3540, 1180, { style: 'sea', size: 28 });
  b.label('THE FOUR NATIONS', 3680, 190, { style: 'title', size: 70 });
}

export function buildAvatar(): BuildResult {
  const b = new MapBuilder({
    id: 'avatar-four-nations',
    name: 'The Four Nations',
    width: WIDTH,
    height: HEIGHT,
    themeId: 'wonder',
    frameId: 'ornate',
    seed: 0x41764174,
    unit: 1.3,
  });

  lands(b);
  earthKingdom(b);
  fireNation(b);
  poles(b);
  islands(b);
  towns(b);
  waters(b);
  sea(b);
  names(b);
  return b.build();
}
