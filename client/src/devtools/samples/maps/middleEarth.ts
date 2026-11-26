import { MapBuilder } from '../MapBuilder';
import type { BuildResult } from '../MapBuilder';
import { circle, ellipse } from '../geometry';
import type { Polygon } from '../geometry';

/**
 * Middle-earth as it is printed in The Lord of the Rings, drawn from memory of the books' maps: Eriador from the Blue Mountains to the
 * Misty Mountains, Wilderland with Mirkwood and the Lonely Mountain, Rohan and Gondor along the Anduin, Mordor, and the deserts of Harad and
 * Khand. The red dotted line is the road of the Ring. An unofficial fan tribute; the names belong to their owners.
 */

const WIDTH = 5200;
const HEIGHT = 3400;

type Spot = readonly [number, number];

/** Places are written as shares of the map, the way they are read off a printed map, and turned into pixels here. */
const at = (fx: number, fy: number): Spot => [Math.round(fx * WIDTH), Math.round(fy * HEIGHT)];
const poly = (points: readonly Spot[]): Polygon => points.map(([fx, fy]) => at(fx, fy));
const rect = (fx0: number, fy0: number, fx1: number, fy1: number): Polygon =>
  poly([[fx0, fy0], [fx1, fy0], [fx1, fy1], [fx0, fy1]]);
const ring = (fx: number, fy: number, r: number): Polygon => circle(...at(fx, fy), r, 14);
const oval = (fx: number, fy: number, rx: number, ry: number, rotation = 0): Polygon => ellipse(...at(fx, fy), rx, ry, rotation, 14);

const COAST = { amp: 28, scale: 240, gain: 0.6, octaves: 5 } as const;
const SEA: Polygon = [[0, 0], [WIDTH, 0], [WIDTH, HEIGHT], [0, HEIGHT]];

/** The land runs off the east and south edges of the map: Middle-earth goes on beyond what is drawn. */
const MIDDLE_EARTH: Polygon = poly([
  [0.050, 0.150], [0.058, 0.115], [0.080, 0.090], [0.115, 0.078], [0.150, 0.070], [0.185, 0.078], [0.213, 0.098],
  [0.222, 0.125], [0.212, 0.150], [0.228, 0.172], [0.256, 0.158], [0.282, 0.118], [0.318, 0.092],
  [0.380, 0.080], [0.450, 0.074], [0.520, 0.070], [0.600, 0.064], [0.680, 0.058], [0.780, 0.064], [0.900, 0.058], [1.030, 0.062],
  [1.030, 1.080], [0.560, 1.080],
  [0.530, 1.030], [0.500, 0.980], [0.470, 0.930], [0.440, 0.890], [0.418, 0.860], [0.405, 0.836],
  [0.425, 0.816], [0.455, 0.802], [0.495, 0.790], [0.535, 0.772], [0.570, 0.752], [0.590, 0.736],
  [0.575, 0.718], [0.548, 0.710], [0.520, 0.698], [0.480, 0.692], [0.440, 0.696], [0.414, 0.708], [0.396, 0.732],
  [0.370, 0.735], [0.350, 0.708], [0.325, 0.692], [0.295, 0.684],
  [0.270, 0.644], [0.245, 0.598], [0.222, 0.562], [0.205, 0.528], [0.180, 0.488], [0.155, 0.458], [0.138, 0.436],
  [0.115, 0.418], [0.085, 0.392], [0.062, 0.352], [0.052, 0.322],
  [0.062, 0.292], [0.095, 0.282], [0.125, 0.277], [0.142, 0.264], [0.122, 0.250], [0.090, 0.248], [0.062, 0.240],
  [0.050, 0.215], [0.047, 0.182],
]);

const FORODWAITH = poly([[0.030, 0.040], [0.420, 0.040], [0.420, 0.110], [0.300, 0.125], [0.200, 0.118], [0.030, 0.128]]);
const COLD_NORTH = poly([[0.030, 0.040], [0.640, 0.040], [0.640, 0.150], [0.470, 0.170], [0.300, 0.200], [0.210, 0.205], [0.030, 0.190]]);
const NORTH_EAST_WASTES = poly([[0.800, 0.040], [1.050, 0.040], [1.050, 0.170], [0.800, 0.150]]);
const ANGMAR = poly([[0.290, 0.100], [0.375, 0.095], [0.405, 0.140], [0.385, 0.195], [0.325, 0.195], [0.290, 0.150]]);
const WITHERED_HEATH = poly([[0.640, 0.060], [0.790, 0.060], [0.810, 0.115], [0.740, 0.130], [0.660, 0.118]]);
const DUNLAND = poly([[0.300, 0.420], [0.375, 0.420], [0.385, 0.470], [0.340, 0.500], [0.290, 0.480]]);
const BARROW_DOWNS = poly([[0.235, 0.325], [0.285, 0.320], [0.290, 0.370], [0.245, 0.380]]);
const SWANFLEET = poly([[0.205, 0.430], [0.262, 0.425], [0.270, 0.490], [0.215, 0.495]]);
const BROWN_LANDS = poly([[0.510, 0.395], [0.600, 0.395], [0.610, 0.440], [0.555, 0.450], [0.510, 0.438]]);
const DEAD_MARSHES = poly([[0.560, 0.488], [0.612, 0.480], [0.622, 0.502], [0.598, 0.525], [0.565, 0.520]]);
const DAGORLAD = poly([[0.605, 0.425], [0.700, 0.425], [0.710, 0.490], [0.625, 0.495]]);
const MORDOR = poly([
  [0.598, 0.510], [0.680, 0.490], [0.790, 0.495], [0.815, 0.560], [0.800, 0.650], [0.760, 0.710], [0.680, 0.715], [0.625, 0.705], [0.605, 0.640],
]);
const RHUN = poly([[0.830, 0.170], [1.050, 0.165], [1.050, 0.490], [0.830, 0.490]]);
const KHAND = poly([[0.810, 0.500], [1.050, 0.485], [1.050, 0.750], [0.810, 0.745]]);
const HARAD = poly([[0.380, 0.795], [0.600, 0.780], [0.650, 0.745], [0.760, 0.738], [1.050, 0.738], [1.050, 1.090], [0.400, 1.090]]);
const FAR_HARAD = poly([[0.610, 1.000], [0.880, 0.935], [1.050, 0.905], [1.050, 1.090], [0.570, 1.090]]);

const ERED_LUIN_NORTH = poly([[0.088, 0.100], [0.090, 0.150], [0.094, 0.200]]);
const ERED_LUIN_SOUTH = poly([[0.100, 0.300], [0.092, 0.335], [0.098, 0.375]]);
const MISTY_MOUNTAINS = poly([
  [0.425, 0.105], [0.418, 0.150], [0.408, 0.205], [0.402, 0.255], [0.404, 0.300], [0.408, 0.345], [0.403, 0.385], [0.397, 0.425], [0.393, 0.458],
]);
const GREY_MOUNTAINS = poly([[0.430, 0.108], [0.490, 0.118], [0.550, 0.108], [0.605, 0.113], [0.650, 0.100]]);
const IRON_HILLS = poly([[0.738, 0.135], [0.768, 0.165], [0.800, 0.195]]);
const WHITE_MOUNTAINS = poly([[0.372, 0.560], [0.415, 0.575], [0.460, 0.590], [0.495, 0.598], [0.515, 0.590]]);
const EPHEL_DUATH = poly([[0.600, 0.505], [0.608, 0.550], [0.612, 0.600], [0.618, 0.650], [0.626, 0.695]]);
const ERED_LITHUI = poly([[0.628, 0.500], [0.680, 0.493], [0.735, 0.488], [0.790, 0.498]]);
const WEATHER_HILLS = poly([[0.282, 0.258], [0.305, 0.270], [0.328, 0.256]]);
const NORTH_DOWNS = poly([[0.232, 0.180], [0.266, 0.192], [0.302, 0.200]]);

const MIRKWOOD = poly([[0.505, 0.125], [0.570, 0.110], [0.615, 0.130], [0.622, 0.240], [0.600, 0.335], [0.560, 0.385], [0.515, 0.375], [0.508, 0.280]]);
const LOTHLORIEN = poly([[0.432, 0.378], [0.462, 0.376], [0.466, 0.430], [0.440, 0.438], [0.428, 0.410]]);
const FANGORN = poly([[0.405, 0.455], [0.455, 0.450], [0.466, 0.485], [0.452, 0.508], [0.412, 0.502]]);
const OLD_FOREST = poly([[0.195, 0.335], [0.228, 0.332], [0.236, 0.372], [0.205, 0.380]]);
const EMYN_MUIL = poly([[0.520, 0.472], [0.575, 0.465], [0.583, 0.505], [0.540, 0.515]]);
const ITHILIEN = poly([[0.562, 0.520], [0.598, 0.530], [0.604, 0.600], [0.580, 0.640], [0.560, 0.585]]);

function lands(b: MapBuilder): void {
  b.land(MIDDLE_EARTH, 'grass', COAST);
  b.paint(COLD_NORTH, 'tundra', { amp: 30, scale: 200 });
  b.paint(FORODWAITH, 'snow', { amp: 24, scale: 160 });
  b.paint(NORTH_EAST_WASTES, 'tundra', { amp: 30, scale: 200 });
  b.paint(ANGMAR, 'stone', { amp: 20, scale: 140 });
  b.paint(WITHERED_HEATH, 'earth', { amp: 24, scale: 160 });
  b.paint(DUNLAND, 'earth', { amp: 24, scale: 160 });
  b.paint(BARROW_DOWNS, 'earth', { amp: 18, scale: 120 });
  b.paint(SWANFLEET, 'swamp', { amp: 22, scale: 140 });
  b.paint(BROWN_LANDS, 'earth', { amp: 24, scale: 160 });
  b.paint(DEAD_MARSHES, 'swamp', { amp: 16, scale: 100 });
  b.paint(DAGORLAD, 'clay', { amp: 24, scale: 160 });
  b.paint(MORDOR, 'ash', { amp: 24, scale: 160 });
  b.paint(RHUN, 'earth', { amp: 30, scale: 200 });
  b.paint(KHAND, 'clay', { amp: 30, scale: 200 });
  b.paint(HARAD, 'desert', { amp: 30, scale: 200 });
  b.paint(FAR_HARAD, 'jungle', { amp: 30, scale: 200 });

  b.band(ERED_LUIN_NORTH, 60, 'stone');
  b.band(ERED_LUIN_SOUTH, 60, 'stone');
  b.band(MISTY_MOUNTAINS, 75, 'stone');
  b.band(GREY_MOUNTAINS, 60, 'stone');
  b.band(IRON_HILLS, 60, 'stone');
  b.band(WHITE_MOUNTAINS, 70, 'stone');
  b.band(EPHEL_DUATH, 55, 'stone');
  b.band(ERED_LITHUI, 55, 'stone');

  b.lake(oval(0.775, 0.360, 240, 270, 0.15), { amp: 14, scale: 140 });
  b.lake(oval(0.755, 0.685, 150, 90, 0.1), { amp: 10, scale: 100 });
  b.lake(oval(0.648, 0.228, 90, 42, -0.3), { amp: 8, scale: 70 });
  b.lake(oval(0.195, 0.205, 100, 60, 0.1), { amp: 8, scale: 70 });
  b.lake(oval(0.538, 0.488, 55, 85, 0.15), { amp: 8, scale: 60 });

  b.island(...at(0.505, 0.742), 85, 45, 'grass', { rotation: 0.1, ...COAST });
  for (const [fx, fy, r] of [[0.030, 0.405, 30], [0.036, 0.43, 22], [0.205, 0.062, 26], [0.31, 0.058, 22]] as const) b.island(...at(fx, fy), r, r * 0.7, 'stone', COAST);
}

function eriador(b: MapBuilder): void {
  /* The cold north and Forochel */
  b.scatter({ brush: 'ice.hills', area: FORODWAITH, inset: 15, hole: 0.5, on: ['snow'] });
  b.scatter({ brush: 'ice.drifts', area: FORODWAITH, inset: 15, hole: 0.55, gap: 1.2, on: ['snow'] });
  b.scatter({ brush: 'ice.dead-trees', area: FORODWAITH, inset: 15, hole: 0.7, on: ['snow'] });
  b.scatter({ brush: 'forest.pine', area: COLD_NORTH, on: ['tundra'], inset: 25, hole: 0.45, gap: 1.1 });
  b.scatter({ brush: 'forest.snowy', area: COLD_NORTH, on: ['tundra', 'snow'], inset: 25, hole: 0.6, gap: 1.3 });
  b.scatter({ brush: 'hills.snowy', area: COLD_NORTH, on: ['tundra'], inset: 25, hole: 0.7, gap: 1.2 });

  /* Lindon and the Blue Mountains */
  b.scatter({ brush: 'mountains.gray', area: b.ridge(ERED_LUIN_NORTH, 170, 15), gap: 0.9, peak: 0.2 });
  b.scatter({ brush: 'mountains.gray', area: b.ridge(ERED_LUIN_SOUTH, 170, 15), gap: 0.9, peak: 0.2 });
  b.scatter({ brush: 'forest.blossom', area: rect(0.052, 0.12, 0.080, 0.23), warp: 20, soft: 30, inset: 14, hole: 0.3 });
  b.scatter({ brush: 'forest.blossom', area: rect(0.056, 0.30, 0.088, 0.38), warp: 20, soft: 30, inset: 14, hole: 0.3 });
  b.scatter({ brush: 'hills.green', area: rect(0.100, 0.215, 0.200, 0.250), warp: 30, soft: 50, hole: 0.5 });

  /* The Shire and the Brandywine */
  b.scatter({ brush: 'veg.farmland', area: ring(0.155, 0.300, 230), warp: 40, soft: 80, hole: 0.3 });
  b.scatter({ brush: 'veg.wheat', area: ring(0.155, 0.300, 250), warp: 40, soft: 90, hole: 0.45 });
  b.scatter({ brush: 'hills.green', area: rect(0.112, 0.270, 0.200, 0.340), warp: 40, soft: 70, hole: 0.55 });
  b.scatter({ brush: 'forest.oak', area: rect(0.110, 0.320, 0.185, 0.365), warp: 30, soft: 50, hole: 0.45 });
  b.scatter({ brush: 'veg.flowers', area: ring(0.155, 0.300, 220), warp: 30, soft: 60, hole: 0.5, gap: 1.6 });
  b.scatter({ brush: 'forest.dark', area: OLD_FOREST, warp: 24, soft: 40, inset: 10 });
  b.scatter({ brush: 'forest.oak', area: poly([[0.070, 0.390], [0.140, 0.420], [0.130, 0.445], [0.080, 0.410]]), warp: 20, soft: 30, hole: 0.3 });

  /* The Barrow-downs, the Weather Hills and the North Downs */
  b.scatter({ brush: 'hills.brown', area: BARROW_DOWNS, warp: 20, soft: 40, hole: 0.3 });
  b.scatter({ brush: 'hills.green', area: b.ridge(WEATHER_HILLS, 150, 15), hole: 0.2 });
  b.scatter({ brush: 'hills.green', area: b.ridge(NORTH_DOWNS, 160, 15), hole: 0.2 });
  b.scatter({ brush: 'hills.dry', area: ring(0.345, 0.218, 150), warp: 30, soft: 50, hole: 0.4 });
  b.scatter({ brush: 'crags.gray', area: ring(0.345, 0.218, 120), warp: 30, soft: 50, hole: 0.55 });
  b.scatter({ brush: 'forest.oak', area: poly([[0.310, 0.292], [0.360, 0.292], [0.366, 0.335], [0.324, 0.348]]), warp: 24, soft: 40 });
  b.scatter({ brush: 'forest.pine', area: poly([[0.240, 0.215], [0.300, 0.230], [0.290, 0.250], [0.245, 0.240]]), warp: 20, soft: 30, hole: 0.4 });

  /* Angmar and the north end of the Misty Mountains */
  b.scatter({ brush: 'mountains.black', area: ANGMAR, warp: 24, soft: 40, gap: 0.95, hole: 0.2 });
  b.scatter({ brush: 'mountains.snowy', area: b.ridge(poly([[0.300, 0.150], [0.350, 0.170], [0.390, 0.160]]), 180, 15), gap: 0.95 });
  b.scatter({ brush: 'mountains.gray', area: b.ridge(MISTY_MOUNTAINS, 230, 25), gap: 0.85, peak: 0.2 });
  b.scatter({ brush: 'crags.gray', area: b.ridge(MISTY_MOUNTAINS, 380, 30), gap: 1.1, hole: 0.5 });
  b.scatter({ brush: 'hills.green', area: rect(0.320, 0.330, 0.372, 0.400), warp: 30, soft: 50, hole: 0.5 });

  /* Minhiriath, Tharbad and Dunland */
  b.scatter({ brush: 'swamp.marsh', area: SWANFLEET, on: ['swamp'], hole: 0.3 });
  b.scatter({ brush: 'swamp.trees', area: SWANFLEET, on: ['swamp'], hole: 0.4 });
  b.scatter({ brush: 'swamp.mist', area: SWANFLEET, on: ['swamp'], hole: 0.6 });
  b.scatter({ brush: 'hills.brown', area: DUNLAND, warp: 30, soft: 50, hole: 0.3 });
  b.scatter({ brush: 'forest.dark', area: poly([[0.275, 0.500], [0.335, 0.500], [0.340, 0.545], [0.285, 0.552]]), warp: 30, soft: 50 });
  b.scatter({ brush: 'forest.oak', area: poly([[0.150, 0.440], [0.200, 0.425], [0.205, 0.490], [0.170, 0.490]]), warp: 24, soft: 40, hole: 0.3 });
  b.scatter({ brush: 'hills.green', area: rect(0.300, 0.540, 0.372, 0.610), warp: 30, soft: 50, hole: 0.5 });
}

function wilderland(b: MapBuilder): void {
  /* The Grey Mountains, the Withered Heath and the Iron Hills */
  b.scatter({ brush: 'mountains.gray', area: b.ridge(GREY_MOUNTAINS, 210, 20), gap: 0.9, peak: 0.2 });
  b.scatter({ brush: 'crags.brown', area: WITHERED_HEATH, on: ['earth'], hole: 0.55, gap: 1.1 });
  b.scatter({ brush: 'desert.bones', area: WITHERED_HEATH, on: ['earth'], hole: 0.8 });
  b.scatter({ brush: 'forest.dead', area: WITHERED_HEATH, on: ['earth'], hole: 0.6 });
  b.scatter({ brush: 'mountains.brown', area: b.ridge(IRON_HILLS, 200, 15), gap: 0.9 });
  b.scatter({ brush: 'hills.brown', area: b.ridge(IRON_HILLS, 380, 15), hole: 0.4 });
  b.scatter({ brush: 'forest.pine', area: NORTH_EAST_WASTES, on: ['tundra'], inset: 25, hole: 0.5, gap: 1.2 });

  /* Mirkwood */
  b.scatter({ brush: 'forest.dark', area: MIRKWOOD, warp: 50, soft: 70, inset: 14, gap: 0.9, hole: 0.05 });
  b.scatter({ brush: 'forest.dead', area: ring(0.545, 0.350, 220), warp: 30, soft: 50, hole: 0.5 });
  b.scatter({ brush: 'veg.mushrooms', area: MIRKWOOD, warp: 40, soft: 60, hole: 0.75, gap: 1.8 });
  b.scatter({ brush: 'swamp.mist', area: rect(0.510, 0.250, 0.600, 0.360), warp: 40, soft: 60, hole: 0.8 });

  /* The Vales of Anduin, the Wold and the Brown Lands */
  b.scatter({ brush: 'veg.tall-grass', area: rect(0.470, 0.150, 0.500, 0.380), warp: 30, soft: 50, hole: 0.4 });
  b.scatter({ brush: 'hills.green', area: rect(0.440, 0.140, 0.470, 0.320), warp: 30, soft: 50, hole: 0.5 });
  b.scatter({ brush: 'swamp.marsh', area: ring(0.478, 0.352, 70), on: ['grass'], hole: 0.3 });
  b.scatter({ brush: 'hills.dry', area: BROWN_LANDS, warp: 30, soft: 50, hole: 0.5 });
  b.scatter({ brush: 'desert.scrub', area: BROWN_LANDS, warp: 30, soft: 50, hole: 0.6, gap: 1.2 });
  b.scatter({ brush: 'forest.autumn', area: LOTHLORIEN, warp: 20, soft: 30, inset: 10, gap: 0.9, hole: 0.05 });

  /* The Lonely Mountain, Dale and the Long Lake: the mountain stands alone, with hills only on either side of it */
  b.scatter({ brush: 'hills.brown', area: ring(0.622, 0.172, 110), warp: 30, soft: 60, hole: 0.5 });
  b.scatter({ brush: 'hills.brown', area: ring(0.716, 0.172, 110), warp: 30, soft: 60, hole: 0.5 });
  b.scatter({ brush: 'crags.brown', area: rect(0.640, 0.098, 0.700, 0.125), warp: 20, soft: 30, hole: 0.5 });
  b.scatter({ brush: 'veg.farmland', area: ring(0.668, 0.205, 150), warp: 30, soft: 50, hole: 0.4 });
  b.scatter({ brush: 'forest.oak', area: poly([[0.625, 0.270], [0.700, 0.250], [0.715, 0.300], [0.650, 0.320]]), warp: 30, soft: 50, hole: 0.3 });
  b.scatter({ brush: 'veg.vineyard', area: ring(0.705, 0.300, 120), warp: 20, soft: 40, hole: 0.25 });

  /* Rhovanion and Rhûn */
  b.scatter({ brush: 'veg.tall-grass', area: rect(0.625, 0.320, 0.730, 0.440), warp: 40, soft: 70, hole: 0.45 });
  b.scatter({ brush: 'veg.tall-grass', area: RHUN, on: ['earth'], inset: 25, hole: 0.4, gap: 1.2 });
  b.scatter({ brush: 'desert.scrub', area: RHUN, on: ['earth'], inset: 25, hole: 0.65, gap: 1.2 });
  b.scatter({ brush: 'hills.dry', area: rect(0.860, 0.200, 1.000, 0.300), warp: 40, soft: 70, hole: 0.55 });
  b.scatter({ brush: 'forest.autumn', area: rect(0.850, 0.350, 0.960, 0.440), warp: 40, soft: 70, hole: 0.45 });
  b.scatter({ brush: 'crags.brown', area: DAGORLAD, on: ['clay'], hole: 0.6, gap: 1.2 });
  b.scatter({ brush: 'desert.bones', area: DAGORLAD, on: ['clay'], hole: 0.8 });
  b.scatter({ brush: 'desert.scrub', area: DAGORLAD, on: ['clay'], hole: 0.6, gap: 1.2 });
}

function rohanAndGondor(b: MapBuilder): void {
  /* Isengard, Fangorn and the Gap of Rohan */
  b.scatter({ brush: 'forest.dark', area: FANGORN, warp: 24, soft: 40, inset: 10, gap: 0.9, hole: 0.05 });
  b.scatter({ brush: 'forest.oak', area: ring(0.430, 0.480, 100), warp: 24, soft: 40, hole: 0.3 });
  b.scatter({ brush: 'hills.green', area: rect(0.340, 0.490, 0.400, 0.540), warp: 24, soft: 40, hole: 0.5 });

  /* Rohan */
  b.scatter({ brush: 'veg.tall-grass', area: rect(0.395, 0.505, 0.545, 0.570), warp: 40, soft: 70, hole: 0.2, gap: 1.2 });
  b.scatter({ brush: 'veg.meadow', area: rect(0.395, 0.505, 0.545, 0.570), warp: 40, soft: 70, hole: 0.5 });
  b.scatter({ brush: 'veg.flowers', area: rect(0.395, 0.505, 0.545, 0.570), warp: 40, soft: 70, hole: 0.55, gap: 1.8 });
  b.scatter({ brush: 'hills.green', area: rect(0.470, 0.440, 0.540, 0.470), warp: 30, soft: 50, hole: 0.55 });
  b.scatter({ brush: 'forest.oak', area: poly([[0.475, 0.572], [0.505, 0.560], [0.512, 0.595], [0.485, 0.600]]), warp: 20, soft: 30, hole: 0.25 });

  /* The White Mountains */
  b.scatter({ brush: 'mountains.snowy', area: b.ridge(WHITE_MOUNTAINS, 220, 25), gap: 0.85, peak: 0.25 });
  b.scatter({ brush: 'hills.green', area: b.ridge(WHITE_MOUNTAINS, 420, 25), hole: 0.4 });
  b.scatter({ brush: 'crags.gray', area: b.ridge(WHITE_MOUNTAINS, 340, 25), gap: 1.3, hole: 0.5 });

  /* Gondor */
  for (const [fx, fy, r] of [[0.535, 0.612, 150], [0.470, 0.660, 160], [0.360, 0.655, 130]] as const) {
    b.scatter({ brush: 'veg.farmland', area: ring(fx, fy, r), warp: 30, soft: 70, hole: 0.3 });
    b.scatter({ brush: 'veg.wheat', area: ring(fx, fy, r * 1.1), warp: 30, soft: 80, hole: 0.45 });
  }
  b.scatter({ brush: 'veg.vineyard', area: ring(0.410, 0.685, 110), warp: 24, soft: 40, hole: 0.35 });
  b.scatter({ brush: 'hills.green', area: rect(0.300, 0.600, 0.420, 0.660), warp: 30, soft: 50, hole: 0.5 });
  b.scatter({ brush: 'forest.oak', area: poly([[0.435, 0.618], [0.490, 0.612], [0.495, 0.645], [0.440, 0.650]]), warp: 24, soft: 40, hole: 0.4 });
  b.scatter({ brush: 'forest.blossom', area: ITHILIEN, warp: 24, soft: 40, inset: 10, hole: 0.2 });
  b.scatter({ brush: 'veg.flowers', area: ITHILIEN, warp: 24, soft: 40, hole: 0.45, gap: 1.6 });
  b.scatter({ brush: 'forest.palm', area: poly([[0.540, 0.696], [0.580, 0.718], [0.600, 0.730], [0.560, 0.728]]), inset: 8, hole: 0.4 });

  /* The Emyn Muil and the Dead Marshes */
  b.scatter({ brush: 'crags.gray', area: EMYN_MUIL, warp: 20, soft: 30, hole: 0.25 });
  b.scatter({ brush: 'hills.brown', area: EMYN_MUIL, warp: 20, soft: 30, hole: 0.55 });
  b.scatter({ brush: 'swamp.marsh', area: DEAD_MARSHES, on: ['swamp'], hole: 0.25 });
  b.scatter({ brush: 'swamp.mist', area: DEAD_MARSHES, on: ['swamp'], hole: 0.45 });
  b.scatter({ brush: 'swamp.fungus', area: DEAD_MARSHES, on: ['swamp'], hole: 0.6 });
}

function mordorAndSouth(b: MapBuilder): void {
  /* Mordor */
  b.scatter({ brush: 'mountains.black', area: b.ridge(EPHEL_DUATH, 190, 20), gap: 0.85, peak: 0.2 });
  b.scatter({ brush: 'mountains.black', area: b.ridge(ERED_LITHUI, 190, 20), gap: 0.85, peak: 0.2 });
  b.scatter({ brush: 'crags.gray', area: b.ridge(EPHEL_DUATH, 320, 20), gap: 1.2, hole: 0.5 });
  b.scatter({ brush: 'volcanic.peaks', area: MORDOR, on: ['ash'], hole: 0.5 });
  b.scatter({ brush: 'volcanic.lava', area: MORDOR, on: ['ash'], hole: 0.4 });
  b.scatter({ brush: 'volcanic.fissures', area: MORDOR, on: ['ash'], hole: 0.65 });
  b.scatter({ brush: 'volcanic.springs', area: MORDOR, on: ['ash'], hole: 0.8 });
  b.scatter({ brush: 'forest.dead', area: MORDOR, on: ['ash'], hole: 0.8, gap: 1.2 });
  b.scatter({ brush: 'veg.farmland', area: ring(0.740, 0.730, 140), warp: 30, soft: 60, hole: 0.4 });
  b.scatter({ brush: 'veg.wheat', area: ring(0.740, 0.730, 150), warp: 30, soft: 60, hole: 0.5 });

  /* Khand */
  b.scatter({ brush: 'desert.mesas', area: KHAND, on: ['clay'], inset: 20, hole: 0.55, gap: 1.5, size: 0.62 });
  b.scatter({ brush: 'hills.dry', area: KHAND, on: ['clay'], inset: 20, hole: 0.6, gap: 1.2 });
  b.scatter({ brush: 'crags.red', area: KHAND, on: ['clay'], inset: 20, hole: 0.6, gap: 1.2 });
  b.scatter({ brush: 'desert.scrub', area: KHAND, on: ['clay'], inset: 20, hole: 0.55, gap: 1.2 });
  b.scatter({ brush: 'desert.cacti', area: KHAND, on: ['clay'], inset: 20, hole: 0.7, gap: 1.2 });

  /* Harad */
  b.scatter({ brush: 'desert.dunes', area: HARAD, on: ['desert'], inset: 15, hole: 0.35 });
  b.scatter({ brush: 'desert.cacti', area: HARAD, on: ['desert'], inset: 15, hole: 0.6 });
  b.scatter({ brush: 'desert.scrub', area: HARAD, on: ['desert'], inset: 15, hole: 0.55, gap: 1.2 });
  b.scatter({ brush: 'desert.mesas', area: HARAD, on: ['desert'], inset: 15, hole: 0.7, gap: 1.6, size: 0.62 });
  b.scatter({ brush: 'forest.palm', area: poly([[0.430, 0.850], [0.480, 0.860], [0.490, 0.890], [0.440, 0.890]]), inset: 8, hole: 0.4 });
  b.scatter({ brush: 'forest.jungle', area: FAR_HARAD, on: ['jungle'], inset: 15, hole: 0.1, gap: 0.9 });
  b.scatter({ brush: 'swamp.trees', area: rect(0.600, 1.010, 0.700, 1.070), on: ['jungle'], hole: 0.5 });

  /* General cover */
  b.scatter({ brush: 'forest.patches', area: MIDDLE_EARTH, inset: 40, hole: 0.55, gap: 1.2, on: ['grass'] });
  b.scatter({ brush: 'veg.meadow', area: MIDDLE_EARTH, inset: 20, hole: 0.55, gap: 1.3, on: ['grass'] });
  b.scatter({ brush: 'veg.flowers', area: MIDDLE_EARTH, inset: 20, hole: 0.5, gap: 1.8, on: ['grass'] });
  b.scatter({ brush: 'veg.bushes', area: MIDDLE_EARTH, inset: 20, hole: 0.5, gap: 1.6, on: ['grass', 'earth'] });

  /* The islands */
  b.scatter({ brush: 'hills.green', area: ring(0.505, 0.742, 70), hole: 0.4, inset: 6 });
  b.scatter({ brush: 'hills.snowy', area: ring(0.205, 0.062, 26), hole: 0.5, inset: 4 });
}

function eriadorSites(b: MapBuilder): void {
  /* Lindon */
  b.site('settlement.port', ...at(0.118, 0.236), 'Grey Havens', { size: 0.58, side: 'above', labelSize: 30 });
  b.place('landmark.watchtower', ...at(0.172, 0.248), { size: 0.55, clear: 1 });
  b.place('landmark.watchtower', ...at(0.182, 0.256), { size: 0.45, clear: 1 });
  b.site('settlement.hamlet', ...at(0.075, 0.345), null, { size: 0.5 });

  /* The Shire */
  b.site('settlement.village', ...at(0.130, 0.292), 'Michel Delving', { size: 0.52, side: 'above', labelSize: 26 });
  b.site('settlement.hamlet', ...at(0.158, 0.296), 'Hobbiton', { size: 0.58, side: 'above', labelSize: 28 });
  b.place('landmark.windmill', ...at(0.146, 0.300), { size: 0.42, clear: 1 });
  b.site('settlement.hamlet', ...at(0.180, 0.304), 'Bywater', { size: 0.5, side: 'below', labelSize: 26 });
  b.site('settlement.hamlet', ...at(0.140, 0.322), null, { size: 0.5 });
  b.place('landmark.bridge.stone', ...at(0.196, 0.292), { size: 0.55, clear: 1 });
  b.site('settlement.hamlet', ...at(0.212, 0.312), 'Buckland', { size: 0.5, side: 'above', labelSize: 26 });

  /* The Old Forest, the Barrow-downs and Bree */
  b.place('landmark.standing-stones', ...at(0.262, 0.348), { size: 0.5, clear: 1 });
  b.place('landmark.shrine', ...at(0.275, 0.334), { size: 0.4, clear: 1 });
  b.site('settlement.town', ...at(0.254, 0.292), 'Bree', { size: 0.52, side: 'below', labelSize: 30 });
  b.site('settlement.hamlet', ...at(0.240, 0.282), null, { size: 0.45 });

  /* The North Kingdom */
  b.site('settlement.ruins', ...at(0.262, 0.172), 'Fornost', { size: 0.5, side: 'above', labelSize: 28 });
  b.site('settlement.ruins', ...at(0.200, 0.234), 'Annúminas', { size: 0.5, side: 'below', labelSize: 28 });

  /* The road east: Weathertop, the Trollshaws and Rivendell */
  b.site('landmark.ruined-tower', ...at(0.308, 0.266), 'Weathertop', { size: 0.7, side: 'above', labelSize: 30 });
  b.place('landmark.bridge.stone', ...at(0.337, 0.285), { size: 0.55, clear: 1 });
  for (const [fx, fy] of [[0.335, 0.322], [0.342, 0.330], [0.349, 0.322]] as const) b.place('rock.stack', ...at(fx, fy), { size: 0.7, clear: 1 });
  b.site('castle.keep', ...at(0.372, 0.274), 'Rivendell', { size: 0.6, side: 'below', labelSize: 32 });

  /* Angmar and the Misty Mountains */
  b.site('castle.dark', ...at(0.338, 0.128), 'Carn Dûm', { size: 0.55, side: 'below', labelSize: 28 });
  b.place('mountain.black', ...at(0.430, 0.102), { size: 1.2, clear: 1 });
  b.place('mountain.snowy', ...at(0.396, 0.336), { size: 1.2, clear: 1 });
  b.place('mountain.snowy', ...at(0.405, 0.388), { size: 1.2, clear: 1 });
  b.site('cave.mine', ...at(0.386, 0.382), 'Moria', { size: 0.7, side: 'left', labelSize: 32 });
  b.site('settlement.ruins', ...at(0.336, 0.372), 'Eregion', { size: 0.5, side: 'below', labelSize: 28 });

  /* Minhiriath and Dunland */
  b.site('settlement.ruins', ...at(0.236, 0.458), 'Tharbad', { size: 0.5, side: 'left', labelSize: 28 });
  b.place('landmark.bridge.stone', ...at(0.236, 0.470), { size: 0.5, clear: 1 });
  b.site('settlement.hamlet', ...at(0.320, 0.440), null, { size: 0.5 });
  b.site('settlement.hamlet', ...at(0.322, 0.482), null, { size: 0.5 });
  b.site('settlement.hamlet', ...at(0.300, 0.470), null, { size: 0.5 });
  b.site('settlement.hamlet', ...at(0.180, 0.470), null, { size: 0.5 });
}

function wilderlandSites(b: MapBuilder): void {
  /* The vales of the Anduin */
  b.site('settlement.hamlet', ...at(0.490, 0.262), 'Beorn', { size: 0.5, side: 'below', labelSize: 26 });
  b.place('landmark.monolith', ...at(0.469, 0.212), { size: 0.6, clear: 1 });
  b.site('castle.dark', ...at(0.545, 0.372), 'Dol Guldur', { size: 0.6, side: 'below', labelSize: 28 });
  b.site('cave.hill', ...at(0.587, 0.158), 'Elvenking\'s Halls', { size: 0.7, side: 'below', labelSize: 28, clear: 2 });
  b.site('settlement.village', ...at(0.595, 0.275), null, { size: 0.5 });

  /* Lothlórien */
  b.site('settlement.village', ...at(0.446, 0.408), 'Caras Galadhon', { size: 0.5, side: 'below', labelSize: 24 });

  /* Erebor, Dale and Esgaroth */
  b.place('mountain.snowy', ...at(0.668, 0.155), { size: 1.9, clear: 2 });
  b.place('cave.entrance', ...at(0.668, 0.170), { size: 0.45, clear: 1 });
  b.place('mountain.brown', ...at(0.636, 0.150), { size: 0.9, clear: 1 });
  b.place('mountain.brown', ...at(0.700, 0.150), { size: 0.9, clear: 1 });
  b.site('settlement.town', ...at(0.668, 0.200), 'Dale', { size: 0.52, side: 'right', labelSize: 28 });
  b.site('settlement.port', ...at(0.646, 0.252), 'Esgaroth', { size: 0.5, side: 'below', labelSize: 28 });
  b.site('settlement.walled-town', ...at(0.772, 0.168), null, { size: 0.5 });
  b.site('settlement.village', ...at(0.715, 0.292), 'Dorwinion', { size: 0.5, side: 'above', labelSize: 28 });

  /* Rhûn */
  for (const [fx, fy] of [[0.880, 0.250], [0.905, 0.268], [0.930, 0.245], [0.900, 0.410], [0.935, 0.395], [0.870, 0.440], [0.960, 0.330]] as const) {
    b.place('desert.camp', ...at(fx, fy), { size: 0.55, clear: 1 });
  }
  b.site('settlement.town', ...at(0.885, 0.388), null, { size: 0.5 });
  b.place('desert.oasis', ...at(0.850, 0.300), { size: 0.55 });
  b.place('desert.skull', ...at(0.960, 0.440), { size: 0.6 });
}

function rohanAndGondorSites(b: MapBuilder): void {
  /* Isengard and Rohan */
  b.site('landmark.wizard-tower', ...at(0.386, 0.490), 'Isengard', { size: 0.9, side: 'left', labelSize: 34 });
  b.place('landmark.bridge.wood', ...at(0.386, 0.516), { size: 0.5, clear: 1 });
  b.site('castle.fortress', ...at(0.398, 0.566), 'Helm\'s Deep', { size: 0.55, side: 'below', labelSize: 28 });
  b.site('castle.keep', ...at(0.488, 0.553), 'Edoras', { size: 0.6, side: 'below', labelSize: 32 });
  b.site('cave.entrance', ...at(0.452, 0.582), 'Paths of the Dead', { size: 0.5, side: 'below', labelSize: 22 });
  b.site('settlement.village', ...at(0.508, 0.528), null, { size: 0.5 });
  b.site('settlement.hamlet', ...at(0.410, 0.515), null, { size: 0.5 });
  b.site('settlement.hamlet', ...at(0.495, 0.505), null, { size: 0.5 });

  /* Gondor */
  b.site('settlement.city.large', ...at(0.522, 0.604), 'Minas Tirith', { size: 0.75, side: 'below', labelSize: 40 });
  b.place('mountain.snowy', ...at(0.505, 0.574), { size: 1.3, clear: 1 });
  b.site('settlement.ruins', ...at(0.553, 0.614), 'Osgiliath', { size: 0.62, side: 'above', labelSize: 28 });
  b.place('landmark.bridge.stone', ...at(0.553, 0.626), { size: 0.55, clear: 1 });
  b.site('castle.tower', ...at(0.547, 0.545), 'Cair Andros', { size: 0.45, side: 'right', labelSize: 22 });
  b.site('settlement.port', ...at(0.545, 0.682), 'Pelargir', { size: 0.62, side: 'left', labelSize: 32 });
  b.site('settlement.port', ...at(0.388, 0.718), 'Dol Amroth', { size: 0.62, side: 'above', labelSize: 32 });
  b.site('castle.tower', ...at(0.500, 0.742), 'Tolfalas', { size: 0.4, side: 'below', labelSize: 22 });
  b.place('landmark.monolith', ...at(0.425, 0.640), { size: 0.6, clear: 1 });
  b.site('settlement.village', ...at(0.340, 0.664), null, { size: 0.5 });
  b.site('settlement.village', ...at(0.455, 0.640), null, { size: 0.5 });
  b.site('settlement.hamlet', ...at(0.490, 0.660), null, { size: 0.5 });
  b.site('settlement.village', ...at(0.480, 0.620), null, { size: 0.5 });
  b.site('settlement.hamlet', ...at(0.362, 0.678), null, { size: 0.5 });
  b.site('settlement.village', ...at(0.572, 0.560), null, { size: 0.5 });
  b.place('landmark.standing-stones', ...at(0.572, 0.570), { size: 0.4, clear: 1 });
}

function mordorSites(b: MapBuilder): void {
  b.place('landmark.watchtower', ...at(0.604, 0.518), { size: 0.45, clear: 1 });
  b.place('landmark.watchtower', ...at(0.626, 0.514), { size: 0.45, clear: 1 });
  b.site('castle.fortress', ...at(0.615, 0.514), 'Black Gate', { size: 0.5, side: 'above', labelSize: 28 });
  b.site('castle.dark', ...at(0.600, 0.604), 'Minas Morgul', { size: 0.6, side: 'below', labelSize: 28 });
  b.site('landmark.watchtower', ...at(0.608, 0.566), 'Cirith Ungol', { size: 0.65, side: 'above', labelSize: 28 });
  b.place('cave.entrance', ...at(0.616, 0.574), { size: 0.4, clear: 1 });
  b.site('volcano.erupting', ...at(0.665, 0.593), 'Mount Doom', { size: 1, side: 'below', labelSize: 32 });
  b.site('castle.dark', ...at(0.742, 0.562), 'Barad-dûr', { size: 0.95, side: 'below', labelSize: 34 });
  b.place('lava.flow', ...at(0.688, 0.600), { size: 0.7, clear: 1 });
  b.site('settlement.village', ...at(0.715, 0.735), null, { size: 0.5 });
  b.site('settlement.hamlet', ...at(0.765, 0.725), null, { size: 0.5 });
}

function southSites(b: MapBuilder): void {
  b.site('settlement.city.large', ...at(0.448, 0.836), 'Umbar', { size: 0.7, side: 'right', labelSize: 40 });
  b.site('settlement.walled-town', ...at(0.640, 0.800), null, { size: 0.55 });
  b.place('desert.pyramids', ...at(0.700, 0.860), { size: 0.55, clear: 1 });
  b.place('desert.oasis', ...at(0.560, 0.880), { size: 0.6 });
  b.place('desert.camp', ...at(0.610, 0.840), { size: 0.5, clear: 1 });
  b.place('desert.camp', ...at(0.800, 0.800), { size: 0.5, clear: 1 });
  b.place('desert.skull', ...at(0.760, 0.790), { size: 0.6 });
  b.site('settlement.walled-town', ...at(0.880, 0.640), null, { size: 0.55 });
  b.place('desert.camp', ...at(0.850, 0.580), { size: 0.5, clear: 1 });
  b.place('desert.camp', ...at(0.950, 0.680), { size: 0.5, clear: 1 });
  b.place('desert.mesa', ...at(0.930, 0.560), { size: 0.7 });
  b.site('settlement.village', ...at(0.700, 0.960), null, { size: 0.5 });
  b.site('settlement.hamlet', ...at(0.860, 0.970), null, { size: 0.5 });
}

function waters(b: MapBuilder): void {
  /* The Anduin */
  b.path('river', poly([
    [0.462, 0.125], [0.470, 0.175], [0.464, 0.225], [0.474, 0.275], [0.480, 0.325], [0.474, 0.375], [0.484, 0.420], [0.506, 0.448], [0.530, 0.464], [0.538, 0.478],
  ]), 22, { wiggle: 34, bend: 380 });
  b.path('river', poly([[0.538, 0.536], [0.545, 0.560], [0.552, 0.585], [0.554, 0.615], [0.556, 0.645], [0.554, 0.675], [0.550, 0.700], [0.548, 0.712]]), 24, { wiggle: 16 });
  b.path('river', poly([[0.538, 0.478], [0.538, 0.510], [0.538, 0.536]]), 22, { wiggle: 4 });

  /* The Brandywine, the Lune and the Greyflood */
  b.path('river', poly([[0.210, 0.215], [0.215, 0.240], [0.205, 0.265], [0.196, 0.292], [0.186, 0.322], [0.166, 0.362], [0.152, 0.400], [0.138, 0.436]]), 20, { wiggle: 18 });
  b.path('river', poly([[0.178, 0.222], [0.158, 0.240], [0.142, 0.262]]), 14, { wiggle: 12 });
  b.path('river', poly([[0.150, 0.296], [0.168, 0.302], [0.190, 0.314]]), 10, { wiggle: 8 });
  b.path('river', poly([[0.345, 0.222], [0.340, 0.252], [0.333, 0.288], [0.300, 0.340], [0.262, 0.400], [0.240, 0.452], [0.222, 0.495], [0.206, 0.528]]), 18, { wiggle: 22 });
  b.path('river', poly([[0.372, 0.280], [0.358, 0.298], [0.335, 0.312]]), 12, { wiggle: 10 });

  /* The Isen, the Entwash, the Silverlode and the Celduin */
  b.path('river', poly([[0.388, 0.492], [0.360, 0.512], [0.318, 0.538], [0.278, 0.562], [0.246, 0.585], [0.232, 0.572]]), 16, { wiggle: 20 });
  b.path('river', poly([[0.455, 0.490], [0.490, 0.518], [0.520, 0.532], [0.543, 0.545]]), 14, { wiggle: 14 });
  b.path('river', poly([[0.408, 0.392], [0.436, 0.402], [0.466, 0.400], [0.481, 0.396]]), 12, { wiggle: 8 });
  b.path('river', poly([[0.668, 0.172], [0.664, 0.205], [0.652, 0.225]]), 12, { wiggle: 6 });
  b.path('river', poly([[0.662, 0.236], [0.690, 0.262], [0.715, 0.290], [0.735, 0.312]]), 16, { wiggle: 14 });
  b.path('river', poly([[0.590, 0.158], [0.612, 0.190], [0.630, 0.222]]), 12, { wiggle: 8 });
  b.path('river', poly([[0.626, 0.690], [0.605, 0.708], [0.575, 0.715]]), 12, { wiggle: 8 });
  b.path('river', poly([[0.455, 0.585], [0.470, 0.606], [0.470, 0.640], [0.480, 0.690]]), 10, { wiggle: 12 });

  /* The roads */
  b.path('road', poly([[0.118, 0.244], [0.130, 0.280], [0.158, 0.296], [0.196, 0.292], [0.254, 0.292], [0.308, 0.272], [0.337, 0.285], [0.372, 0.276]]), 10, { wiggle: 14 });
  b.path('road', poly([[0.372, 0.276], [0.404, 0.300], [0.440, 0.292], [0.472, 0.288]]), 9, { wiggle: 14 });
  b.path('road', poly([[0.472, 0.288], [0.520, 0.250], [0.570, 0.220], [0.612, 0.196], [0.646, 0.250]]), 8, { wiggle: 20 });
  b.path('road', poly([[0.254, 0.294], [0.246, 0.340], [0.240, 0.400], [0.236, 0.458], [0.250, 0.500], [0.310, 0.515], [0.386, 0.516]]), 9, { wiggle: 22 });
  b.path('road', poly([[0.386, 0.516], [0.430, 0.538], [0.488, 0.553], [0.505, 0.575], [0.522, 0.600]]), 9, { wiggle: 14 });
  b.path('road', poly([[0.522, 0.604], [0.540, 0.608], [0.553, 0.614]]), 9, { wiggle: 6 });
  b.path('road', poly([[0.553, 0.620], [0.548, 0.650], [0.545, 0.682]]), 9, { wiggle: 8 });
  b.path('road', poly([[0.522, 0.606], [0.490, 0.626], [0.450, 0.642], [0.410, 0.660], [0.390, 0.700]]), 9, { wiggle: 16 });
  b.path('road', poly([[0.553, 0.614], [0.572, 0.578], [0.592, 0.545], [0.615, 0.516]]), 8, { wiggle: 14 });
  b.path('road', poly([[0.572, 0.578], [0.590, 0.595], [0.600, 0.604]]), 8, { wiggle: 6 });
  b.path('road', poly([[0.448, 0.838], [0.500, 0.870], [0.570, 0.890], [0.650, 0.900], [0.740, 0.880]]), 8, { wiggle: 22 });

  /* The road of the Ring: from Hobbiton to the Cracks of Doom */
  b.path('route', poly([
    [0.158, 0.296], [0.186, 0.312], [0.205, 0.336], [0.226, 0.326], [0.254, 0.296], [0.282, 0.284], [0.308, 0.268], [0.340, 0.298], [0.372, 0.276],
    [0.360, 0.332], [0.386, 0.382], [0.416, 0.388], [0.446, 0.406], [0.478, 0.428], [0.510, 0.456], [0.538, 0.462], [0.530, 0.480],
    [0.552, 0.490], [0.582, 0.505], [0.612, 0.516], [0.598, 0.546], [0.608, 0.566], [0.640, 0.585], [0.665, 0.593],
  ]), 9, { wiggle: 12, clear: 0.4 });
}

function sea(b: MapBuilder): void {
  b.scatter({ brush: 'sea.waves', area: SEA, where: 'sea', inset: 30, hole: 0.65 });
  b.scatter({ brush: 'sea.reefs', area: SEA, where: 'sea', reach: 220, inset: 40, hole: 0.55, gap: 1.2 });
  b.scatter({ brush: 'sea.rocks', area: SEA, where: 'sea', reach: 260, inset: 40, hole: 0.55, gap: 1.2 });
  b.scatter({ brush: 'ice.bergs', area: rect(0.0, 0.0, 1.0, 0.06), where: 'sea', reach: 240, hole: 0.5 });
  b.scatter({ brush: 'ice.bergs', area: rect(0.19, 0.07, 0.31, 0.18), where: 'sea', hole: 0.45 });
  b.scatter({ brush: 'ice.bergs', area: rect(0.0, 0.05, 0.06, 0.20), where: 'sea', hole: 0.55 });

  b.place('sea.kraken', ...at(0.200, 0.780), { size: 1 });
  b.place('sea.whale', ...at(0.040, 0.560), { size: 0.9 });
  b.place('sea.whale', ...at(0.280, 0.045), { size: 0.8, flip: true });
  b.place('serpent.sea', ...at(0.290, 0.870), { size: 0.9, rotation: -0.25 });
  b.place('serpent.dragon', ...at(0.130, 0.700), { size: 0.9 });
  b.place('sea.whirlpool', ...at(0.340, 0.940), { size: 1 });
  b.place('wreck.graveyard', ...at(0.220, 0.965), { size: 0.9 });
  b.place('ship.galleon', ...at(0.030, 0.262), { size: 0.7 });
  b.place('ship.galleon', ...at(0.250, 0.750), { size: 0.9 });
  b.place('ship.galley', ...at(0.450, 0.752), { size: 0.8 });
  b.place('ship.galley', ...at(0.340, 0.765), { size: 0.8, flip: true });
  b.place('ship.pirate', ...at(0.385, 0.830), { size: 0.8 });
  b.place('ship.pirate', ...at(0.360, 0.880), { size: 0.8, flip: true });
  b.place('boat.fleet', ...at(0.330, 0.820), { size: 0.9 });
  b.place('boat.fishing', ...at(0.200, 0.600), { size: 1 });
  b.place('boat.fishing', ...at(0.110, 0.470), { size: 1 });
  b.place('ship.longship', ...at(0.245, 0.115), { size: 0.8 });
  b.place('ship.cog', ...at(0.470, 0.960), { size: 0.9 });
  b.place('wreck.ship', ...at(0.030, 0.340), { size: 0.7 });

  for (const [fx, fy] of [[0.120, 0.030], [0.870, 0.030], [0.060, 0.620], [0.060, 0.790], [0.020, 0.900]] as const) b.place('decor.cloud', ...at(fx, fy), { size: 1, clear: 0.5 });
  b.place('decor.compass.rose', ...at(0.130, 0.880), { size: 1, clear: 1 });
  b.place('decor.scale-bar', ...at(0.300, 0.985), { size: 1, clear: 1 });
}

function names(b: MapBuilder): void {
  b.label('MIDDLE-EARTH', ...at(0.500, 0.046), { style: 'title', size: 90 });

  b.label('LINDON', ...at(0.067, 0.185), { style: 'region', size: 30, spacing: 0.15, rotation: -Math.PI / 2 });
  b.label('ERIADOR', ...at(0.290, 0.418), { style: 'continent', size: 56, spacing: 0.28 });
  b.label('THE SHIRE', ...at(0.152, 0.352), { style: 'region', size: 32, spacing: 0.15 });
  b.label('ANGMAR', ...at(0.340, 0.172), { style: 'region', size: 34, spacing: 0.15 });
  b.label('DUNLAND', ...at(0.338, 0.455), { style: 'region', size: 30, spacing: 0.12 });
  b.label('ENEDWAITH', ...at(0.290, 0.535), { style: 'region', size: 32, spacing: 0.15 });
  b.label('ROHAN', ...at(0.443, 0.532), { style: 'region', size: 40, spacing: 0.2 });
  b.label('GONDOR', ...at(0.455, 0.668), { style: 'region', size: 60, spacing: 0.3 });
  b.label('ITHILIEN', ...at(0.580, 0.648), { style: 'region', size: 26, spacing: 0.12 });
  b.label('MORDOR', ...at(0.700, 0.648), { style: 'continent', size: 64, spacing: 0.3 });
  b.label('RHOVANION', ...at(0.665, 0.375), { style: 'region', size: 36, spacing: 0.15 });
  b.label('RHÛN', ...at(0.925, 0.330), { style: 'continent', size: 64, spacing: 0.3 });
  b.label('KHAND', ...at(0.900, 0.610), { style: 'continent', size: 64, spacing: 0.3 });
  b.label('HARAD', ...at(0.790, 0.860), { style: 'continent', size: 80, spacing: 0.35 });
  b.label('Far Harad', ...at(0.800, 0.985), { style: 'wild', size: 40 });

  b.label('Ered Luin', ...at(0.104, 0.130), { style: 'mountain', size: 28, rotation: -1.45 });
  b.label('Misty Mountains', ...at(0.388, 0.215), { style: 'mountain', size: 34, rotation: -1.45 });
  b.label('Grey Mountains', ...at(0.540, 0.094), { style: 'mountain', size: 28 });
  b.label('White Mountains', ...at(0.430, 0.612), { style: 'mountain', size: 30 });
  b.label('Ered Lithui', ...at(0.710, 0.478), { style: 'mountain', size: 26 });
  b.label('Ephel Dúath', ...at(0.628, 0.655), { style: 'mountain', size: 24, rotation: -1.45 });
  b.label('Iron Hills', ...at(0.790, 0.222), { style: 'mountain', size: 26 });
  b.label('The Lonely Mountain', ...at(0.668, 0.112), { style: 'mountain', size: 26 });
  b.label('Caradhras', ...at(0.372, 0.330), { style: 'mountain', size: 24 });
  b.label('Gundabad', ...at(0.455, 0.086), { style: 'mountain', size: 22 });
  b.label('Weather Hills', ...at(0.297, 0.303), { style: 'mountain', size: 22 });
  b.label('North Downs', ...at(0.266, 0.208), { style: 'mountain', size: 22 });

  b.label('Mirkwood', ...at(0.560, 0.255), { style: 'wild', size: 54 });
  b.label('Fangorn', ...at(0.435, 0.482), { style: 'wild', size: 34 });
  b.label('Lothlórien', ...at(0.446, 0.362), { style: 'wild', size: 32 });
  b.label('Old Forest', ...at(0.215, 0.392), { style: 'wild', size: 26 });
  b.label('Barrow-downs', ...at(0.268, 0.372), { style: 'wild', size: 22 });
  b.label('Trollshaws', ...at(0.343, 0.352), { style: 'wild', size: 22 });
  b.label('Emyn Muil', ...at(0.560, 0.470), { style: 'wild', size: 26 });
  b.label('Dead Marshes', ...at(0.583, 0.508), { style: 'wild', size: 24 });
  b.label('Brown Lands', ...at(0.555, 0.418), { style: 'wild', size: 28 });
  b.label('Dagorlad', ...at(0.655, 0.460), { style: 'wild', size: 30 });
  b.label('Gorgoroth', ...at(0.700, 0.620), { style: 'wild', size: 28 });
  b.label('Withered Heath', ...at(0.715, 0.092), { style: 'wild', size: 30 });
  b.label('The Wold', ...at(0.505, 0.447), { style: 'wild', size: 22 });

  b.label('Belegaer', ...at(0.110, 0.560), { style: 'sea', size: 56, rotation: -Math.PI / 2 });
  b.label('Bay of Belfalas', ...at(0.350, 0.772), { style: 'sea', size: 32 });
  b.label('Gulf of Lune', ...at(0.070, 0.268), { style: 'sea', size: 22 });
  b.label('Ice Bay of Forochel', ...at(0.245, 0.060), { style: 'sea', size: 24 });
  b.label('Sea of Rhûn', ...at(0.775, 0.362), { style: 'sea', size: 34 });
  b.label('Sea of Núrnen', ...at(0.755, 0.688), { style: 'sea', size: 22 });
  b.label('Long Lake', ...at(0.648, 0.215), { style: 'sea', size: 18 });
  b.label('Nen Hithoel', ...at(0.538, 0.492), { style: 'sea', size: 16, rotation: -Math.PI / 2 });
  b.label('Anduin', ...at(0.492, 0.330), { style: 'sea', size: 22, rotation: -1.5 });
  b.label('Brandywine', ...at(0.150, 0.402), { style: 'sea', size: 18, rotation: -1.05 });
}

export function buildMiddleEarth(): BuildResult {
  const b = new MapBuilder({
    id: 'middle-earth',
    name: 'Middle-earth',
    width: WIDTH,
    height: HEIGHT,
    themeId: 'parchment',
    frameId: 'ornate',
    seed: 0x4d696464,
    unit: 1.5,
  });

  lands(b);
  eriador(b);
  wilderland(b);
  rohanAndGondor(b);
  mordorAndSouth(b);
  eriadorSites(b);
  wilderlandSites(b);
  rohanAndGondorSites(b);
  mordorSites(b);
  southSites(b);
  waters(b);
  sea(b);
  names(b);
  return b.build();
}
