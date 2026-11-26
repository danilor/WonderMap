import { MapBuilder } from '../MapBuilder';
import type { BuildResult } from '../MapBuilder';
import { circle } from '../geometry';
import type { Polygon } from '../geometry';

/**
 * The known world of A Song of Ice and Fire / Game of Thrones, drawn from memory of the books' maps: Westeros on the left
 * from the Wall down to Dorne, the Narrow Sea, and the Free Cities, the Dothraki Sea, Valyria and Slaver's Bay of Essos.
 * An unofficial fan tribute; the names belong to their owners.
 */

const WIDTH = 5200;
const HEIGHT = 3400;

const WESTEROS: Polygon = [
  [540, 330], [620, 262], [760, 214], [920, 190], [1090, 200], [1240, 244], [1370, 318], [1470, 400], [1500, 500], [1470, 592],
  [1450, 650], [1402, 742], [1360, 832], [1372, 922], [1430, 990], [1478, 1050], [1440, 1120], [1352, 1152], [1290, 1210],
  [1222, 1268], [1166, 1332], [1196, 1410], [1300, 1440], [1400, 1466], [1470, 1490], [1480, 1560], [1470, 1620], [1480, 1690],
  [1470, 1740], [1462, 1802], [1424, 1862], [1402, 1932], [1384, 1984], [1424, 2024], [1500, 2060], [1562, 2096], [1560, 2136],
  [1470, 2152], [1380, 2132], [1300, 2102], [1240, 2088], [1270, 2180], [1350, 2250], [1450, 2300], [1560, 2312], [1620, 2372],
  [1590, 2440], [1530, 2500], [1480, 2560], [1446, 2610], [1400, 2662], [1340, 2704], [1330, 2784], [1400, 2864], [1486, 2930],
  [1556, 2988], [1536, 3066], [1452, 3108], [1340, 3100], [1220, 3124], [1100, 3142], [980, 3150], [850, 3132], [740, 3142],
  [640, 3118], [580, 3070], [500, 3020], [450, 2950], [440, 2860], [436, 2790], [440, 2700], [444, 2600], [472, 2500],
  [504, 2400], [520, 2300], [498, 2232], [440, 2160], [414, 2060], [420, 1990], [440, 1920], [500, 1850], [524, 1790],
  [560, 1712], [630, 1640], [708, 1592], [770, 1520], [762, 1442], [784, 1380], [728, 1300], [652, 1252], [604, 1172],
  [580, 1082], [560, 992], [524, 910], [510, 830], [520, 742], [540, 650], [520, 560], [508, 470], [518, 396],
];

const FINGERS: Polygon[] = [
  [[1440, 1470], [1530, 1436], [1640, 1432], [1690, 1458], [1610, 1482], [1500, 1508]],
  [[1450, 1550], [1560, 1530], [1670, 1544], [1700, 1572], [1600, 1584], [1470, 1600]],
  [[1450, 1630], [1550, 1616], [1650, 1642], [1660, 1668], [1570, 1666], [1470, 1680]],
];

const ESSOS: Polygon = [
  [2340, 640], [2420, 520], [2560, 450], [2750, 410], [2950, 370], [3200, 360], [3500, 330], [3800, 340], [4100, 320],
  [4400, 350], [4700, 330], [5300, 330], [5300, 2480], [5100, 2540], [4920, 2500], [4760, 2560], [4640, 2640], [4500, 2590],
  [4400, 2450], [4300, 2340], [4180, 2300], [4060, 2350], [3990, 2470], [3940, 2620], [3980, 2780], [4030, 2900], [3830, 3000],
  [3660, 2940], [3560, 2800], [3500, 2680], [3420, 2560], [3320, 2480], [3180, 2500], [3100, 2570], [2980, 2530], [2860, 2470],
  [2760, 2400], [2680, 2300], [2580, 2150], [2500, 2020], [2450, 1900], [2400, 1780], [2340, 1650], [2300, 1500], [2250, 1380],
  [2230, 1260], [2210, 1120], [2250, 980], [2290, 840], [2310, 720],
];

const BEYOND_THE_WALL: Polygon = [[380, 60], [1720, 60], [1720, 640], [380, 640]];
const THE_NORTH: Polygon = [[380, 640], [1720, 640], [1720, 1300], [380, 1300]];
const THE_NECK: Polygon = [[700, 1290], [1220, 1290], [1220, 1500], [700, 1500]];
const THE_WALL: Polygon = [[500, 648], [760, 640], [1000, 642], [1250, 638], [1470, 644]];
const WESTERLANDS: Polygon = [[380, 1840], [820, 1840], [860, 2200], [380, 2200]];
const DORNE: Polygon = [[480, 2780], [1700, 2780], [1700, 3200], [480, 3200]];
const DORNISH_MARSHES: Polygon = [[1180, 2960], [1420, 2940], [1480, 3050], [1260, 3100]];
const RED_MOUNTAINS: Polygon = [[640, 2800], [800, 2840], [950, 2850], [1100, 2820]];
const MOUNTAINS_OF_THE_MOON: Polygon = [[1060, 1500], [1090, 1650], [1130, 1780], [1180, 1870]];
const FROSTFANGS: Polygon = [[560, 520], [640, 430], [760, 370], [880, 330]];

const ESSOS_NORTH: Polygon = [[2200, 250], [5300, 250], [5300, 760], [4400, 700], [3400, 640], [2700, 700], [2200, 800]];
const RED_WASTE: Polygon = [[4300, 1980], [5000, 1940], [5300, 2000], [5300, 2500], [4900, 2480], [4600, 2380], [4300, 2260]];
const VALYRIA: Polygon = [[3560, 2540], [4140, 2400], [4140, 3050], [3560, 3050]];
const SLAVERS_COAST: Polygon = [[4140, 2200], [4640, 2200], [4640, 2640], [4140, 2600]];

const COAST = { amp: 28, scale: 240, gain: 0.6, octaves: 5 } as const;
const SEA: Polygon = [[0, 0], [WIDTH, 0], [WIDTH, HEIGHT], [0, HEIGHT]];

const ring = (x: number, y: number, r: number) => circle(x, y, r, 14);

function lands(b: MapBuilder): void {
  b.land(WESTEROS, 'grass', COAST);
  for (const finger of FINGERS) b.land(finger, 'stone', { amp: 8, scale: 70 });
  b.paint(BEYOND_THE_WALL, 'snow', { amp: 18, scale: 140 });
  b.paint(THE_NORTH, 'tundra', { amp: 18, scale: 140 });
  b.paint(THE_NECK, 'swamp', { amp: 26, scale: 160 });
  b.paint(WESTERLANDS, 'earth', { amp: 24, scale: 180 });
  b.paint(DORNE, 'desert', { amp: 24, scale: 180 });
  b.paint(DORNISH_MARSHES, 'swamp', { amp: 20, scale: 120 });
  b.band(THE_WALL, 17, 'ice', 0.15);
  b.band(RED_MOUNTAINS, 80, 'clay');
  b.band(MOUNTAINS_OF_THE_MOON, 80, 'stone');
  b.band(FROSTFANGS, 90, 'stone');
  b.lake(ring(1095, 1985, 55), { amp: 8, scale: 60 });

  b.island(358, 860, 86, 54, 'tundra', { rotation: 0.4, ...COAST });
  b.island(1650, 800, 112, 140, 'tundra', { rotation: 0.2, ...COAST });
  b.island(330, 1690, 110, 56, 'stone', { rotation: -0.3, ...COAST });
  b.island(190, 1620, 50, 36, 'stone', COAST);
  b.island(205, 1795, 58, 42, 'stone', COAST);
  b.island(320, 1850, 40, 30, 'stone', COAST);
  b.island(450, 1790, 36, 28, 'stone', COAST);
  b.island(330, 2180, 52, 40, 'grass', COAST);
  b.island(330, 2910, 86, 60, 'grass', COAST);
  for (const [x, y] of [[1560, 1770], [1610, 1825], [1535, 1845]] as const) b.island(x, y, 26, 20, 'stone', COAST);
  b.island(1700, 2200, 84, 56, 'ash', { rotation: 0.3, ...COAST });
  b.island(1650, 2030, 74, 46, 'earth', { rotation: -0.4, ...COAST });
  b.island(1640, 2790, 84, 52, 'grass', { rotation: 0.3, ...COAST });
  for (const [x, y, r] of [[1700, 2650, 30], [1810, 2600, 26], [1920, 2560, 32], [2020, 2500, 24], [2120, 2440, 30], [2200, 2380, 24], [2270, 2320, 26]] as const) {
    b.island(x, y, r, r * 0.7, 'stone', COAST);
  }

  b.land(ESSOS, 'grass', COAST);
  b.paint(ESSOS_NORTH, 'tundra', { amp: 40, scale: 220 });
  b.paint(RED_WASTE, 'desert', { amp: 40, scale: 220 });
  b.paint(VALYRIA, 'ash', { amp: 30, scale: 200 });
  b.paint(SLAVERS_COAST, 'clay', { amp: 30, scale: 200 });
  b.island(2230, 2230, 70, 44, 'earth', COAST);
  b.island(2640, 2680, 90, 60, 'grass', { rotation: 0.3, ...COAST });
  b.island(2130, 650, 80, 50, 'stone', COAST);
}

function westeros(b: MapBuilder): void {
  /* Beyond the Wall */
  b.scatter({ brush: 'mountains.snowy', area: b.ridge(FROSTFANGS, 230, 30), gap: 0.85, peak: 0.25 });
  b.scatter({ brush: 'hills.snowy', area: b.ridge(FROSTFANGS, 420, 30), hole: 0.35 });
  b.scatter({ brush: 'forest.snowy', area: [[620, 430], [1300, 430], [1300, 600], [620, 610]], warp: 40, soft: 60, inset: 20 });
  b.scatter({ brush: 'ice.hills', area: BEYOND_THE_WALL, inset: 15, hole: 0.5 });
  b.scatter({ brush: 'ice.drifts', area: BEYOND_THE_WALL, inset: 15, hole: 0.55, gap: 1.2 });
  b.scatter({ brush: 'ice.dead-trees', area: BEYOND_THE_WALL, inset: 15, hole: 0.7 });
  b.scatter({ brush: 'ice.mountains', area: [[900, 220], [1400, 300], [1400, 420], [900, 330]], inset: 15, hole: 0.4 });

  /* The North */
  b.scatter({ brush: 'forest.pine', area: [[560, 880], [800, 860], [830, 1180], [600, 1200]], warp: 50, soft: 70, inset: 20 });
  b.scatter({ brush: 'forest.pine', area: [[960, 660], [1420, 700], [1400, 900], [980, 860]], warp: 50, soft: 70, inset: 20 });
  b.scatter({ brush: 'forest.snowy', area: [[1000, 1060], [1300, 1060], [1300, 1260], [1020, 1260]], warp: 50, soft: 70, inset: 20 });
  b.scatter({ brush: 'hills.snowy', area: [[640, 660], [980, 680], [960, 800], [660, 800]], warp: 50, soft: 80, hole: 0.4 });
  b.scatter({ brush: 'hills.green', area: [[900, 1100], [1200, 1100], [1180, 1280], [900, 1280]], warp: 50, soft: 80, hole: 0.4 });
  b.scatter({ brush: 'mountains.gray', area: b.ridge([[620, 720], [660, 840], [640, 960]], 160, 20), gap: 0.9 });
  b.scatter({ brush: 'forest.patches', area: THE_NORTH, inset: 25, hole: 0.55, gap: 1.3, on: ['tundra'] });
  b.scatter({ brush: 'veg.bushes', area: THE_NORTH, inset: 20, hole: 0.6, gap: 1.8, on: ['tundra'] });

  /* The Neck */
  b.scatter({ brush: 'swamp.trees', area: THE_NECK, on: ['swamp'], hole: 0.2 });
  b.scatter({ brush: 'swamp.marsh', area: THE_NECK, on: ['swamp'], hole: 0.3 });
  b.scatter({ brush: 'swamp.mist', area: THE_NECK, on: ['swamp'], hole: 0.55 });

  /* The Vale and the Mountains of the Moon */
  b.scatter({ brush: 'mountains.gray', area: b.ridge(MOUNTAINS_OF_THE_MOON, 230, 25), gap: 0.85, peak: 0.2 });
  b.scatter({ brush: 'mountains.snowy', area: ring(1290, 1640, 100), gap: 0.8, hole: 0.2 });
  b.scatter({ brush: 'crags.gray', area: [[1100, 1470], [1500, 1470], [1500, 1560], [1100, 1560]], warp: 30, soft: 60, hole: 0.4 });
  b.scatter({ brush: 'hills.green', area: [[1140, 1700], [1440, 1700], [1440, 1860], [1160, 1860]], warp: 40, soft: 80, hole: 0.35 });
  b.scatter({ brush: 'veg.farmland', area: ring(1330, 1780, 150), warp: 30, soft: 60, hole: 0.3 });
  b.scatter({ brush: 'forest.oak', area: [[1160, 1620], [1260, 1580], [1300, 1760], [1180, 1780]], warp: 30, soft: 50 });

  /* The Riverlands */
  for (const [x, y, r] of [[860, 1790, 200], [1010, 1690, 160]] as const) {
    b.scatter({ brush: 'veg.farmland', area: ring(x, y, r), warp: 40, soft: 80, hole: 0.3 });
    b.scatter({ brush: 'veg.wheat', area: ring(x, y, r * 1.1), warp: 40, soft: 90, hole: 0.45 });
  }
  b.scatter({ brush: 'forest.oak', area: [[620, 1620], [740, 1600], [780, 1740], [650, 1780]], warp: 40, soft: 60 });
  b.scatter({ brush: 'forest.dark', area: [[980, 1850], [1090, 1830], [1110, 1930], [1000, 1950]], warp: 30, soft: 50 });
  b.scatter({ brush: 'hills.green', area: [[700, 1500], [980, 1500], [980, 1620], [700, 1640]], warp: 40, soft: 70, hole: 0.4 });

  /* The Westerlands */
  b.scatter({ brush: 'mountains.brown', area: b.ridge([[740, 1900], [770, 2000], [790, 2120]], 200, 20), gap: 0.9 });
  b.scatter({ brush: 'hills.brown', area: [[420, 1860], [760, 1860], [780, 2180], [440, 2180]], warp: 40, soft: 80, hole: 0.35 });
  b.scatter({ brush: 'hills.dry', area: [[420, 1860], [760, 1860], [780, 2180], [440, 2180]], warp: 40, soft: 80, hole: 0.5 });
  b.scatter({ brush: 'crags.brown', area: ring(560, 1990, 110), hole: 0.5 });
  b.scatter({ brush: 'forest.oak', area: [[420, 1900], [520, 1880], [540, 2000], [430, 2000]], warp: 30, soft: 50, hole: 0.4 });

  /* The Crownlands, the Reach and the Stormlands */
  b.scatter({ brush: 'forest.oak', area: [[1130, 2190], [1330, 2240], [1360, 2440], [1180, 2420]], warp: 50, soft: 70 });
  b.scatter({ brush: 'forest.dark', area: [[1180, 2440], [1420, 2480], [1420, 2610], [1230, 2590]], warp: 50, soft: 70 });
  b.scatter({ brush: 'hills.green', area: [[1000, 2090], [1300, 2100], [1330, 2200], [1020, 2200]], warp: 50, soft: 80, hole: 0.4 });
  b.scatter({ brush: 'hills.green', area: [[1000, 2300], [1300, 2300], [1250, 2480], [1020, 2480]], warp: 50, soft: 80, hole: 0.5 });
  b.scatter({ brush: 'mountains.gray', area: b.ridge([[1180, 2560], [1280, 2640], [1330, 2720]], 160, 20), gap: 0.9 });
  for (const [x, y, r] of [[830, 2420, 330], [1120, 2040, 200]] as const) {
    b.scatter({ brush: 'veg.farmland', area: ring(x, y, r), warp: 40, soft: 90, hole: 0.3 });
    b.scatter({ brush: 'veg.wheat', area: ring(x, y, r * 1.1), warp: 40, soft: 100, hole: 0.45 });
  }
  b.scatter({ brush: 'veg.vineyard', area: ring(330, 2910, 70), inset: 6, hole: 0.2 });
  b.scatter({ brush: 'forest.oak', area: [[560, 2560], [780, 2540], [820, 2700], [600, 2740]], warp: 40, soft: 70 });
  b.scatter({ brush: 'forest.oak', area: [[1620, 2760], [1700, 2780], [1690, 2830], [1590, 2820]], inset: 6, hole: 0.3 });

  /* Dorne */
  b.scatter({ brush: 'mountains.red', area: b.ridge(RED_MOUNTAINS, 220, 25), gap: 0.9, peak: 0.2 });
  b.scatter({ brush: 'crags.red', area: b.ridge(RED_MOUNTAINS, 340, 25), gap: 1.1, hole: 0.4 });
  b.scatter({ brush: 'desert.mesas', area: [[700, 2900], [1250, 2900], [1250, 3050], [700, 3050]], on: ['desert'], inset: 15, hole: 0.5 });
  b.scatter({ brush: 'desert.dunes', area: DORNE, on: ['desert'], inset: 15, hole: 0.4 });
  b.scatter({ brush: 'desert.cacti', area: DORNE, on: ['desert'], inset: 15, hole: 0.6 });
  b.scatter({ brush: 'desert.scrub', area: DORNE, on: ['desert'], inset: 15, hole: 0.6, gap: 1.2 });
  b.scatter({ brush: 'swamp.marsh', area: DORNISH_MARSHES, on: ['swamp'], hole: 0.3 });
  b.scatter({ brush: 'swamp.trees', area: DORNISH_MARSHES, on: ['swamp'], hole: 0.4 });
  b.scatter({ brush: 'forest.palm', area: [[1340, 3000], [1500, 3010], [1500, 3070], [1380, 3090]], inset: 6, hole: 0.4 });

  /* General cover */
  b.scatter({ brush: 'forest.patches', area: WESTEROS, inset: 40, hole: 0.55, gap: 1.2, on: ['grass', 'earth'] });
  b.scatter({ brush: 'veg.meadow', area: WESTEROS, inset: 20, hole: 0.55, gap: 1.3, on: ['grass'] });
  b.scatter({ brush: 'veg.flowers', area: WESTEROS, inset: 20, hole: 0.5, gap: 1.8, on: ['grass'] });
  b.scatter({ brush: 'veg.bushes', area: WESTEROS, inset: 20, hole: 0.5, gap: 1.6, on: ['grass', 'earth'] });

  /* The islands */
  b.scatter({ brush: 'mountains.snowy', area: ring(1650, 800, 110), hole: 0.3, inset: 8, gap: 0.9 });
  b.scatter({ brush: 'forest.snowy', area: ring(1650, 850, 100), hole: 0.3, inset: 8 });
  b.scatter({ brush: 'forest.pine', area: ring(358, 860, 70), hole: 0.3, inset: 6 });
  for (const [x, y, rx] of [[330, 1690, 95], [190, 1620, 40], [205, 1795, 48]] as const) {
    b.scatter({ brush: 'crags.gray', area: ring(x, y, rx), hole: 0.5, inset: 6 });
    b.scatter({ brush: 'hills.dry', area: ring(x, y, rx), hole: 0.5, inset: 6 });
  }
  b.scatter({ brush: 'mountains.black', area: ring(1700, 2200, 70), hole: 0.4, inset: 6, gap: 0.9 });
  b.scatter({ brush: 'hills.green', area: ring(1640, 2790, 70), hole: 0.4, inset: 6 });
  b.scatter({ brush: 'hills.brown', area: ring(1650, 2030, 60), hole: 0.4, inset: 6 });
}

function essos(b: MapBuilder): void {
  /* The northern shore */
  b.scatter({ brush: 'mountains.gray', area: b.ridge([[2400, 640], [2540, 560], [2700, 520]], 220, 25), gap: 0.9, peak: 0.2 });
  b.scatter({ brush: 'forest.pine', area: ESSOS_NORTH, on: ['tundra'], inset: 25, hole: 0.45, gap: 1.1 });
  b.scatter({ brush: 'hills.snowy', area: ESSOS_NORTH, on: ['tundra'], inset: 25, hole: 0.7, gap: 1.2 });
  b.scatter({ brush: 'ice.bergs', area: [[2200, 40], [5200, 40], [5200, 300], [2200, 300]], where: 'sea', reach: 240, hole: 0.5 });

  /* Mountains and hills */
  b.scatter({ brush: 'mountains.brown', area: b.ridge([[3650, 820], [3850, 760], [4050, 800]], 260, 30), gap: 0.9, peak: 0.2 });
  b.scatter({ brush: 'hills.brown', area: b.ridge([[3650, 820], [3850, 760], [4050, 800]], 480, 30), hole: 0.35 });
  b.scatter({ brush: 'hills.green', area: [[2800, 1120], [3100, 1100], [3140, 1300], [2840, 1320]], warp: 60, soft: 90, hole: 0.4 });
  b.scatter({ brush: 'hills.green', area: [[2500, 1500], [2800, 1480], [2820, 1700], [2540, 1720]], warp: 60, soft: 90, hole: 0.4 });
  b.scatter({ brush: 'mountains.brown', area: b.ridge([[4700, 900], [4900, 860], [5150, 900]], 240, 30), gap: 0.9 });

  /* Forests */
  b.scatter({ brush: 'forest.dark', area: [[3180, 1020], [3560, 1060], [3600, 1380], [3240, 1380]], warp: 60, soft: 90, inset: 20 });
  b.scatter({ brush: 'forest.oak', area: [[2500, 1000], [2780, 1000], [2800, 1280], [2520, 1260]], warp: 50, soft: 80, inset: 20 });
  b.scatter({ brush: 'forest.oak', area: [[2700, 1800], [3000, 1780], [3040, 2060], [2740, 2080]], warp: 50, soft: 80, inset: 20 });
  b.scatter({ brush: 'forest.autumn', area: [[3700, 1000], [4000, 1060], [4000, 1280], [3740, 1260]], warp: 50, soft: 80, inset: 20 });
  b.scatter({ brush: 'forest.jungle', area: [[3560, 2480], [3900, 2420], [3900, 2600], [3600, 2640]], warp: 40, soft: 70, hole: 0.4 });

  /* Farmland of the Free Cities */
  for (const [x, y, r] of [[2560, 1850, 220], [2850, 2330, 200], [3200, 2250, 230], [2950, 1350, 200]] as const) {
    b.scatter({ brush: 'veg.farmland', area: ring(x, y, r), warp: 40, soft: 90, hole: 0.3 });
    b.scatter({ brush: 'veg.wheat', area: ring(x, y, r * 1.1), warp: 40, soft: 100, hole: 0.45 });
  }
  b.scatter({ brush: 'veg.vineyard', area: ring(2640, 2680, 70), inset: 6, hole: 0.3 });
  b.scatter({ brush: 'veg.flowers', area: ring(2640, 2680, 80), inset: 6, hole: 0.3 });

  /* The Dothraki Sea */
  b.scatter({ brush: 'veg.tall-grass', area: [[3560, 1380], [4000, 1300], [4700, 1420], [5000, 1700], [4700, 2000], [4100, 2040], [3600, 1800]], warp: 80, soft: 120, hole: 0.2, gap: 1.2 });
  b.scatter({ brush: 'veg.flowers', area: [[3600, 1400], [4800, 1500], [4700, 1900], [3700, 1800]], warp: 80, soft: 120, hole: 0.55, gap: 1.8 });
  b.scatter({ brush: 'hills.dry', area: [[4100, 1560], [4500, 1540], [4500, 1760], [4150, 1780]], warp: 60, soft: 90, hole: 0.5 });

  /* The Red Waste and Qarth */
  b.scatter({ brush: 'desert.mesas', area: RED_WASTE, on: ['desert'], inset: 20, hole: 0.5 });
  b.scatter({ brush: 'desert.dunes', area: RED_WASTE, on: ['desert'], inset: 20, hole: 0.3 });
  b.scatter({ brush: 'desert.cacti', area: RED_WASTE, on: ['desert'], inset: 20, hole: 0.6 });
  b.scatter({ brush: 'desert.scrub', area: RED_WASTE, on: ['desert'], inset: 20, hole: 0.6, gap: 1.2 });
  b.scatter({ brush: 'desert.bones', area: RED_WASTE, on: ['desert'], inset: 20, hole: 0.8 });

  /* Valyria and the Smoking Sea */
  b.scatter({ brush: 'mountains.black', area: b.ridge([[3700, 2600], [3860, 2700], [4000, 2800]], 220, 20), gap: 0.9 });
  b.scatter({ brush: 'volcanic.peaks', area: VALYRIA, on: ['ash'], hole: 0.4 });
  b.scatter({ brush: 'volcanic.lava', area: VALYRIA, on: ['ash'], hole: 0.4 });
  b.scatter({ brush: 'volcanic.springs', area: VALYRIA, on: ['ash'], hole: 0.7 });
  b.scatter({ brush: 'volcanic.fissures', area: VALYRIA, on: ['ash'], hole: 0.7 });

  /* Slaver's Bay */
  b.scatter({ brush: 'crags.red', area: SLAVERS_COAST, on: ['clay'], hole: 0.6, gap: 1.2 });
  b.scatter({ brush: 'veg.wheat', area: [[4200, 2260], [4500, 2220], [4540, 2420], [4220, 2450]], warp: 40, soft: 70, hole: 0.5 });

  /* General cover */
  b.scatter({ brush: 'forest.patches', area: [[2200, 700], [3600, 700], [3600, 2600], [2200, 2600]], inset: 40, hole: 0.55, gap: 1.2, on: ['grass'] });
  b.scatter({ brush: 'veg.meadow', area: ESSOS, inset: 20, hole: 0.55, gap: 1.3, on: ['grass'] });
  b.scatter({ brush: 'veg.bushes', area: ESSOS, inset: 20, hole: 0.5, gap: 1.6, on: ['grass'] });

  /* The islands */
  b.scatter({ brush: 'mountains.gray', area: ring(2130, 650, 60), hole: 0.4, inset: 6, gap: 0.9 });
  b.scatter({ brush: 'hills.brown', area: ring(2230, 2230, 55), hole: 0.4, inset: 6 });
}

function castles(b: MapBuilder): void {
  /* The Wall and what lies beyond it */
  for (let x = 560; x <= 1440; x += 70) {
    if (Math.abs(x - 960) > 75 && Math.abs(x - 600) > 50 && Math.abs(x - 1420) > 60) b.place('ice.glacier', x, 656, { size: 0.5, clear: 1 });
  }
  for (const x of [790, 1140, 1280]) b.place('landmark.watchtower', x, 668, { size: 0.5, clear: 1 });
  b.site('castle.fortress', 960, 650, 'Castle Black', { size: 0.62, side: 'below', labelSize: 30 });
  b.site('castle.fortress', 1420, 660, 'Eastwatch', { size: 0.55, side: 'below', labelSize: 28 });
  b.site('castle.tower', 600, 650, 'Shadow Tower', { size: 0.55, side: 'below', labelSize: 26 });
  b.site('settlement.ruins', 1450, 440, 'Hardhome', { size: 0.55, side: 'left', labelSize: 32 });
  b.site('settlement.village', 1620, 840, 'Skagos', { size: 0.5, side: 'below', labelSize: 30 });
  b.place('landmark.standing-stones', 880, 520, { size: 0.5 });
  b.place('cave.entrance', 1010, 470, { size: 0.5 });

  /* The North */
  b.site('castle.fortress', 900, 1000, 'Winterfell', { size: 0.75 });
  b.site('settlement.port', 1190, 1232, 'White Harbor', { size: 0.62, side: 'left', labelSize: 34 });
  b.site('castle.keep', 1280, 950, 'Dreadfort', { size: 0.55, side: 'below', labelSize: 30 });
  b.site('castle.keep', 1310, 790, 'Karhold', { size: 0.5, side: 'below', labelSize: 28 });
  b.site('castle.keep', 1130, 790, 'Last Hearth', { size: 0.5, side: 'below', labelSize: 28 });
  b.site('castle.keep', 700, 1020, 'Deepwood Motte', { size: 0.5, side: 'below', labelSize: 28 });
  b.site('castle.keep', 790, 1180, 'Torrhen\'s Square', { size: 0.5, side: 'below', labelSize: 28 });
  b.site('castle.keep', 1040, 1110, 'Castle Cerwyn', { size: 0.5, side: 'below', labelSize: 28 });
  b.site('castle.ruins', 940, 1330, 'Moat Cailin', { size: 0.62, side: 'right', labelSize: 32 });
  b.site('castle.keep', 360, 860, 'Bear Island', { size: 0.5, side: 'below', labelSize: 30 });
  b.site('settlement.village', 1440, 1060, null, { size: 0.5 });
  b.site('settlement.hamlet', 860, 1260, null, { size: 0.55 });
  b.site('settlement.hamlet', 640, 1120, null, { size: 0.55 });

  /* The Neck, the Vale and the Riverlands */
  b.site('castle.tower', 1300, 1600, 'The Eyrie', { size: 0.66, side: 'above', labelSize: 34 });
  b.site('settlement.port', 1415, 1822, 'Gulltown', { size: 0.6, side: 'left', labelSize: 32 });
  b.site('castle.keep', 960, 1580, 'The Twins', { size: 0.58, side: 'left', labelSize: 32 });
  b.site('castle.fortress', 850, 1800, 'Riverrun', { size: 0.62, side: 'below', labelSize: 34 });
  b.site('castle.dark', 1070, 1880, 'Harrenhal', { size: 0.6, side: 'below', labelSize: 34 });
  b.site('castle.keep', 640, 1700, 'Seagard', { size: 0.52, side: 'below', labelSize: 30 });
  b.site('settlement.village', 1180, 1790, null, { size: 0.5 });
  b.site('settlement.hamlet', 1380, 1900, null, { size: 0.55 });
  b.site('settlement.village', 760, 1700, null, { size: 0.5 });
  b.site('settlement.hamlet', 980, 1760, null, { size: 0.55 });
  b.site('settlement.village', 700, 1900, null, { size: 0.5 });

  /* The Iron Islands and the West */
  b.site('castle.keep', 330, 1695, 'Pyke', { size: 0.6, side: 'below', labelSize: 34 });
  b.site('settlement.village', 205, 1795, 'Harlaw', { size: 0.45, side: 'below', labelSize: 26 });
  b.site('settlement.hamlet', 190, 1625, null, { size: 0.5 });
  b.site('castle.fortress', 540, 1960, 'Casterly Rock', { size: 0.7, side: 'right', labelSize: 34 });
  b.site('settlement.port', 560, 2090, 'Lannisport', { size: 0.58, side: 'right', labelSize: 32 });
  b.site('settlement.village', 340, 2180, 'Fair Isle', { size: 0.45, side: 'below', labelSize: 26 });
  b.site('settlement.hamlet', 640, 2150, null, { size: 0.55 });
  b.site('settlement.village', 880, 2110, null, { size: 0.5 });

  /* The Crownlands and the Reach */
  b.site('settlement.city.large', 1260, 2035, 'King\'s Landing', { size: 0.72, side: 'below', labelSize: 40 });
  b.site('castle.dark', 1700, 2200, 'Dragonstone', { size: 0.58, side: 'below', labelSize: 34 });
  b.site('castle.keep', 1650, 2030, 'Driftmark', { size: 0.5, side: 'above', labelSize: 28 });
  b.site('settlement.port', 1430, 2085, 'Duskendale', { size: 0.45, side: 'above', labelSize: 26 });
  b.site('castle.keep', 830, 2420, 'Highgarden', { size: 0.72, side: 'below', labelSize: 38 });
  b.site('settlement.city.large', 560, 2800, 'Oldtown', { size: 0.68, side: 'below', labelSize: 40 });
  b.place('landmark.lighthouse', 500, 2770, { size: 0.7, clear: 1 });
  b.site('castle.tower', 780, 2300, 'Horn Hill', { size: 0.46, side: 'right', labelSize: 26 });
  b.site('settlement.village', 330, 2915, 'The Arbor', { size: 0.5, side: 'below', labelSize: 28 });
  b.site('settlement.village', 700, 2600, null, { size: 0.5 });
  b.site('settlement.hamlet', 950, 2500, null, { size: 0.55 });
  b.site('settlement.village', 1100, 2400, null, { size: 0.5 });
  b.site('settlement.village', 620, 2420, null, { size: 0.5 });

  /* The Stormlands and Dorne */
  b.site('castle.fortress', 1370, 2640, 'Storm\'s End', { size: 0.66, side: 'left', labelSize: 34 });
  b.site('castle.keep', 1640, 2790, 'Tarth', { size: 0.5, side: 'below', labelSize: 28 });
  b.site('castle.keep', 1480, 3010, 'Sunspear', { size: 0.72, side: 'below', labelSize: 38 });
  b.site('castle.tower', 650, 3020, 'Starfall', { size: 0.55, side: 'below', labelSize: 30 });
  b.site('castle.fortress', 990, 2900, 'Yronwood', { size: 0.52, side: 'below', labelSize: 28 });
  b.site('castle.keep', 1180, 2990, null, { size: 0.4 });
  b.site('settlement.port', 1250, 3100, null, { size: 0.4 });
  b.site('settlement.village', 700, 2960, null, { size: 0.5 });
  b.site('settlement.hamlet', 900, 2980, null, { size: 0.55 });
  b.site('settlement.village', 1290, 2770, null, { size: 0.5 });
  b.place('landmark.shrine', 1160, 2830, { size: 0.6, clear: 1 });
  b.place('desert.oasis', 780, 2930, { size: 0.5 });
}

function freeCities(b: MapBuilder): void {
  b.site('settlement.city.large', 2310, 1260, 'Braavos', { size: 0.72, side: 'left', labelSize: 44 });
  b.place('landmark.monolith', 2230, 1200, { size: 0.8, clear: 1 });
  b.site('settlement.town', 2150, 660, 'Lorath', { size: 0.58, side: 'below', labelSize: 34 });
  b.site('settlement.city', 2450, 1900, 'Pentos', { size: 0.66, side: 'right', labelSize: 38 });
  b.site('settlement.walled-town', 2950, 1300, 'Norvos', { size: 0.6, side: 'below', labelSize: 34 });
  b.site('settlement.walled-town', 3350, 1250, 'Qohor', { size: 0.6, side: 'below', labelSize: 34 });
  b.site('settlement.port', 2230, 2230, 'Tyrosh', { size: 0.6, side: 'below', labelSize: 34 });
  b.site('settlement.city', 2860, 2460, 'Myr', { size: 0.64, side: 'below', labelSize: 38 });
  b.site('settlement.port', 2640, 2680, 'Lys', { size: 0.6, side: 'below', labelSize: 34 });
  b.site('settlement.city.large', 3330, 2470, 'Volantis', { size: 0.78, side: 'below', labelSize: 44 });
  b.place('landmark.bridge.stone', 3250, 2390, { size: 0.8, clear: 1 });
  b.site('settlement.village', 2700, 1500, null, { size: 0.55 });
  b.site('settlement.hamlet', 2800, 1700, null, { size: 0.55 });
  b.site('settlement.village', 3100, 1800, null, { size: 0.55 });
  b.site('settlement.hamlet', 3300, 2000, null, { size: 0.55 });
  b.site('settlement.village', 2650, 2200, null, { size: 0.55 });
  b.site('settlement.village', 3150, 1020, null, { size: 0.55 });
  b.site('settlement.hamlet', 2600, 900, null, { size: 0.55 });
}

function farEssos(b: MapBuilder): void {
  b.site('settlement.ruins', 3860, 2740, 'Valyria', { size: 0.7, side: 'below', labelSize: 40 });
  b.place('castle.ruins', 3720, 2690, { size: 0.55, clear: 1 });
  b.place('landmark.ruined-tower', 3900, 2690, { size: 0.6, clear: 1 });
  b.place('volcano.erupting', 3700, 2830, { size: 0.9 });
  b.place('volcano.active', 3800, 2900, { size: 0.9 });
  b.place('volcano.active', 3930, 2870, { size: 0.9 });
  b.place('volcano.crater', 3980, 2780, { size: 0.8 });
  b.place('lava.flow', 3770, 2790, { size: 0.9, clear: 1 });

  b.site('settlement.town', 4215, 2265, 'Astapor', { size: 0.58, side: 'left', labelSize: 34 });
  b.site('settlement.town', 4385, 2335, 'Yunkai', { size: 0.58, side: 'above', labelSize: 34 });
  b.site('settlement.city', 4520, 2470, 'Meereen', { size: 0.64, side: 'right', labelSize: 38 });
  b.place('desert.pyramid', 4560, 2400, { size: 0.55, clear: 1 });
  b.site('settlement.walled-town', 4880, 2490, 'Qarth', { size: 0.66, side: 'below', labelSize: 38 });
  b.place('landmark.obelisk', 4800, 2440, { size: 0.55, clear: 1 });
  b.place('landmark.obelisk', 4970, 2450, { size: 0.55, clear: 1 });

  for (const [x, y] of [[4180, 1700], [4260, 1660], [4320, 1730], [4230, 1780]] as const) b.place('desert.camp', x, y, { size: 0.55, clear: 1 });
  b.site('settlement.town', 4260, 1620, 'Vaes Dothrak', { size: 0.6, side: 'above', labelSize: 36 });
  b.place('desert.camp', 3900, 1580, { size: 0.5, clear: 1 });
  b.place('desert.camp', 4600, 1800, { size: 0.5, clear: 1 });
  b.place('desert.camp', 4750, 1560, { size: 0.5, clear: 1 });
  b.place('desert.camp', 4000, 1900, { size: 0.5, clear: 1 });
  b.place('desert.camp', 4950, 2080, { size: 0.5, clear: 1 });
  b.place('desert.oasis', 4600, 2100, { size: 0.6 });
  b.place('desert.pyramids', 4800, 2250, { size: 0.55, clear: 1 });
  b.place('desert.skull', 4500, 2000, { size: 0.6 });

  b.site('settlement.village', 3700, 1300, null, { size: 0.55 });
  b.site('settlement.hamlet', 3950, 1180, null, { size: 0.55 });
  b.site('settlement.village', 4500, 1100, null, { size: 0.55 });
  b.site('settlement.hamlet', 4750, 1250, null, { size: 0.55 });
  b.site('settlement.village', 3550, 2000, null, { size: 0.55 });
}

function waters(b: MapBuilder): void {
  /* Westeros */
  b.path('river', [[1000, 1000], [1100, 1100], [1180, 1160], [1250, 1230]], 18, { wiggle: 30 });
  b.path('river', [[1060, 1530], [1000, 1560], [950, 1620], [900, 1700], [870, 1790]], 16, { wiggle: 25 });
  b.path('river', [[1120, 1740], [1030, 1780], [940, 1790], [880, 1800]], 14, { wiggle: 20 });
  b.path('river', [[740, 1900], [790, 1850], [850, 1810]], 14, { wiggle: 20 });
  b.path('river', [[870, 1800], [950, 1850], [1010, 1915], [1050, 1955]], 20, { wiggle: 30 });
  b.path('river', [[1135, 1995], [1195, 2040], [1238, 2086]], 18, { wiggle: 15 });
  b.path('river', [[1000, 2400], [900, 2430], [760, 2470], [600, 2540], [470, 2560]], 20, { wiggle: 35 });
  b.path('river', [[830, 2790], [760, 2780], [660, 2770], [580, 2780]], 14, { wiggle: 20 });
  b.path('river', [[1000, 1850], [900, 1930], [780, 2000], [620, 2040]], 14, { wiggle: 30 });

  b.path('road', [[960, 665], [940, 820], [900, 1000], [920, 1200], [940, 1330], [950, 1470], [960, 1580], [1000, 1760], [1070, 1880], [1160, 1960], [1260, 2040]], 10, { wiggle: 24 });
  b.path('road', [[1200, 2070], [1100, 2200], [1000, 2300], [840, 2420], [700, 2620], [570, 2790]], 10, { wiggle: 24 });
  b.path('road', [[1260, 2040], [1100, 2000], [850, 1960], [560, 1990]], 9, { wiggle: 24 });
  b.path('road', [[1200, 2070], [1180, 2150], [1230, 2250], [1300, 2340], [1370, 2500], [1370, 2630]], 9, { wiggle: 24 });
  b.path('road', [[1300, 1610], [1380, 1700], [1415, 1815]], 8, { wiggle: 14 });

  /* Essos */
  b.path('river', [[3700, 900], [3600, 1100], [3400, 1220], [3250, 1400], [3200, 1600], [3220, 1850], [3280, 2100], [3330, 2380]], 24, { wiggle: 40, bend: 280 });
  b.path('river', [[2950, 1320], [3050, 1400], [3150, 1480], [3210, 1560]], 14, { wiggle: 25 });
  b.path('river', [[3600, 2000], [3500, 2100], [3380, 2200], [3300, 2260]], 14, { wiggle: 25 });
  b.path('river', [[4300, 1900], [4280, 2050], [4300, 2200]], 14, { wiggle: 25 });
  b.path('river', [[2400, 1900], [2300, 1850]], 10, { wiggle: 10 });

  b.path('road', [[3330, 2450], [3250, 2200], [3230, 1800], [3300, 1500], [3350, 1270]], 10, { wiggle: 30 });
  b.path('road', [[3380, 2480], [3600, 2650], [3850, 2740]], 9, { wiggle: 30 });
  b.path('road', [[3400, 2450], [3700, 2300], [4000, 2250], [4250, 2330], [4540, 2420]], 9, { wiggle: 30 });
  b.path('road', [[2470, 1900], [2700, 2000], [2860, 2300], [2870, 2450]], 9, { wiggle: 30 });
  b.path('road', [[2350, 1280], [2600, 1350], [2900, 1310]], 8, { wiggle: 25 });
}

function sea(b: MapBuilder): void {
  b.scatter({ brush: 'sea.waves', area: SEA, where: 'sea', inset: 30, hole: 0.65 });
  b.scatter({ brush: 'sea.reefs', area: SEA, where: 'sea', reach: 220, inset: 40, hole: 0.55, gap: 1.2 });
  b.scatter({ brush: 'sea.rocks', area: SEA, where: 'sea', reach: 260, inset: 40, hole: 0.55, gap: 1.2 });
  b.scatter({ brush: 'ice.bergs', area: [[300, 40], [1900, 40], [1900, 250], [300, 250]], where: 'sea', reach: 240, hole: 0.5 });

  b.place('sea.kraken', 120, 1400, { size: 1 });
  b.place('sea.whale', 200, 2500, { size: 1 });
  b.place('sea.whale', 2100, 1350, { size: 0.9, flip: true });
  b.place('serpent.sea', 1900, 1000, { size: 0.9, rotation: -0.3 });
  b.place('serpent.dragon', 1900, 2300, { size: 0.9 });
  b.place('sea.whirlpool', 2000, 3000, { size: 1 });
  b.place('wreck.graveyard', 1850, 2700, { size: 0.9 });
  b.place('ship.galleon', 1900, 1500, { size: 0.9 });
  b.place('ship.galleon', 2000, 1800, { size: 0.9, flip: true });
  b.place('ship.longship', 250, 1350, { size: 0.9 });
  b.place('ship.longship', 300, 1500, { size: 0.9 });
  b.place('boat.fleet', 1900, 2050, { size: 1 });
  b.place('boat.fishing', 1900, 1250, { size: 1 });
  b.place('ship.cog', 2000, 2800, { size: 1 });
  b.place('ship.caravel', 2050, 2150, { size: 1, flip: true });
  b.place('boat.fishing', 1750, 1380, { size: 1 });
  b.place('ship.galley', 3000, 2850, { size: 0.9 });
  b.place('ship.galleon', 3300, 2800, { size: 0.9 });
  b.place('boat.fishing', 4500, 2800, { size: 1 });
  b.place('ship.caravel', 4700, 2850, { size: 1 });
  b.place('wreck.ship', 4300, 2950, { size: 0.9 });
  b.place('sea.whale', 4000, 3250, { size: 0.9 });
  b.place('ship.pirate', 800, 3300, { size: 0.9 });

  for (const [x, y] of [[250, 330], [1700, 330], [2000, 600], [5000, 150], [260, 3050]] as const) b.place('decor.cloud', x, y, { size: 1, clear: 0.5 });
  b.place('decor.compass.rose', 4700, 3050, { size: 1, clear: 1 });
  b.place('decor.scale-bar', 2400, 3320, { size: 1, clear: 1 });
}

function names(b: MapBuilder): void {
  b.label('WESTEROS', 190, 1100, { style: 'continent', size: 72, spacing: 0.15, rotation: -Math.PI / 2 });
  b.label('ESSOS', 3900, 1900, { style: 'continent', size: 96, spacing: 0.3 });
  b.label('BEYOND THE WALL', 960, 330, { style: 'region', size: 42, spacing: 0.12 });
  b.label('THE NORTH', 800, 850, { style: 'region', size: 40, spacing: 0.18 });
  b.label('THE VALE', 1270, 1735, { style: 'region', size: 34, spacing: 0.15 });
  b.label('THE RIVERLANDS', 950, 1665, { style: 'region', size: 30, spacing: 0.1 });
  b.label('WESTERLANDS', 815, 2005, { style: 'region', size: 32, spacing: 0.1 });
  b.label('THE CROWNLANDS', 1030, 2215, { style: 'region', size: 30, spacing: 0.1 });
  b.label('THE REACH', 800, 2620, { style: 'region', size: 48, spacing: 0.25 });
  b.label('STORMLANDS', 1230, 2500, { style: 'region', size: 32, spacing: 0.1 });
  b.label('DORNE', 950, 3060, { style: 'region', size: 56, spacing: 0.3 });
  b.label('IRON ISLANDS', 330, 1560, { style: 'region', size: 34, spacing: 0.1 });
  b.label('THE FREE CITIES', 2850, 1050, { style: 'region', size: 44, spacing: 0.2 });
  b.label('LAND OF ALWAYS WINTER', 4300, 540, { style: 'region', size: 38, spacing: 0.1 });
  b.label('Dothraki Sea', 4350, 1400, { style: 'wild', size: 54 });
  b.label('The Red Waste', 4750, 2180, { style: 'wild', size: 46 });
  b.label('Frostfangs', 690, 500, { style: 'mountain', size: 34, rotation: -0.5 });
  b.label('Haunted Forest', 1170, 570, { style: 'wild', size: 36 });
  b.label('The Wall', 690, 598, { style: 'landmark', size: 30 });
  b.label('The Neck', 1070, 1420, { style: 'wild', size: 32 });
  b.label('The Fingers', 1600, 1405, { style: 'wild', size: 28 });
  b.label('Red Mountains', 770, 2810, { style: 'mountain', size: 28 });
  b.label('Kingswood', 1230, 2340, { style: 'wild', size: 28 });
  b.label('Bone Mountains', 3870, 880, { style: 'mountain', size: 30 });
  b.label('Forest of Qohor', 3400, 1120, { style: 'wild', size: 30 });
  b.label('The Fourteen Flames', 3880, 2570, { style: 'mountain', size: 26 });
  b.label('The Narrow Sea', 2000, 1700, { style: 'sea', size: 56, rotation: -Math.PI / 2 });
  b.label('Sunset Sea', 200, 2300, { style: 'sea', size: 48, rotation: -Math.PI / 2 });
  b.label('Shivering Sea', 1700, 130, { style: 'sea', size: 46 });
  b.label('Blackwater Bay', 1420, 2218, { style: 'sea', size: 26, rotation: 0.12 });
  b.label('The Bite', 1330, 1330, { style: 'sea', size: 28 });
  b.label('The Stepstones', 1960, 2480, { style: 'sea', size: 32, rotation: -0.5 });
  b.label('Summer Sea', 3000, 3000, { style: 'sea', size: 54 });
  b.label("Slaver's Bay", 4350, 2560, { style: 'sea', size: 32 });
  b.label('Smoking Sea', 3700, 3130, { style: 'sea', size: 34 });
  b.label('THE KNOWN WORLD', 3400, 170, { style: 'title', size: 80 });
}

export function buildWesteros(): BuildResult {
  const b = new MapBuilder({
    id: 'westeros-and-essos',
    name: 'Westeros & Essos',
    width: WIDTH,
    height: HEIGHT,
    themeId: 'parchment',
    frameId: 'ornate',
    seed: 0x57657374,
    unit: 1.5,
  });

  lands(b);
  westeros(b);
  essos(b);
  castles(b);
  freeCities(b);
  farEssos(b);
  waters(b);
  sea(b);
  names(b);
  return b.build();
}
