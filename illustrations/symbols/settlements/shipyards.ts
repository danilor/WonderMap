import { defineSymbol } from '../../kit/define';
import type { Vec2 } from '../../kit/types';
import { ROOF, WALL } from '../../parts/building';
import { createStage } from '../../parts/settle-geom';
import type { Stage } from '../../parts/settle-geom';
import { addBoat, addSea } from '../../parts/settle-harbor';
import { addSmoke } from '../../parts/settle-ruin';
import { addLogPile, addPlankStack, addRack, addScaffold, addSlipway } from '../../parts/settle-shore';
import { addBarrel, addCrate, addDirt, addTree } from '../../parts/settle-props';
import { addDistrict, addHouse } from '../../parts/settle-town';
import { addTimberBox } from '../../parts/settle-wood';

type Builder = (st: Stage) => void;

const FLAG = '#c0392b';
const BLUE = '#4d6fa0';

const BAY: Vec2[] = [[-12, 2], [34, 1.5], [74, 1.5], [100, 1], [108, -12], [102, -30], [74, -40], [32, -42], [-4, -36], [-16, -18]];

/** Two launching ramps: a hull on timber scaffolding, a finished ship waiting for the tide and big thatched sheds. */
const slipways: Builder = (st) => {
  addSea(st, BAY, { shore: { from: 0, count: 10 } });
  addDirt(st, 44, 8, 62, 10, '#d0bc8e', 0.9);
  addDirt(st, 44, 26, 58, 14, '#a8926b', 0.55);
  addSlipway(st, { u: 12, v0: 24, v1: -12, w: 14 });
  addSlipway(st, { u: 52, v0: 24, v1: -12, w: 14 });
  addBoat(st, { u: 19, v: 14, dir: 'v', len: 24, beam: 8.4, bow: -1, hull: '#b08a58', trim: '#e0cfa0', sheer: 4.4, build: 0.4, dry: true, lift: 2 });
  addScaffold(st, { u: 12.5, v: 1, a: 13, b: 27, h: 20, levels: 3 });
  addBoat(st, { u: 59, v: 14, dir: 'v', len: 24, beam: 8.4, bow: -1, hull: '#7c5a3c', trim: '#e7d6a6', sheer: 4.6, build: 1, dry: true, lift: 2, mast: { h: 23, sail: '#efe3c3', stripe: '#b2503a', kind: 'furled', flag: FLAG } });
  addBoat(st, { u: 86, v: -16, dir: 'v', len: 22, beam: 7.4, bow: -1, hull: '#5b4630', trim: '#d9c28a', sheer: 4.2, mast: { h: 20, sail: '#efe3c3', stripe: BLUE, kind: 'square', flag: BLUE } });
  addBoat(st, { u: 34, v: -9, dir: 'u', len: 9, beam: 3.6, hull: '#8a6a45', oars: 2 });
  addTimberBox(st, { u: 72, v: 14, a: 20, b: 15, h: 9, wood: '#8a6a45', planks: 'vertical', roof: { kind: 'gable', color: ROOF.thatch, h: 9, ridge: 'u', over: 1.4 }, door: { face: 'v', w: 8, h: 7, at: 0.45 }, windows: 1 });
  addTimberBox(st, { u: -8, v: 30, a: 12, b: 10, h: 7, wood: '#7c5a3c', planks: 'horizontal', roof: { kind: 'hip', color: ROOF.brown, h: 7 }, door: { face: 'v', w: 4, h: 5, at: 0.5 } });
  addSmoke(st, -2, 35, 11, 5, 3);
  addPlankStack(st, 32, 14, 9, 3.6, 3.2);
  addPlankStack(st, 34, 20, 9, 3.6, 4.4, '#cdb073');
  addLogPile(st, { u: 28, v: 32, len: 10 });
  addLogPile(st, { u: 44, v: 34, len: 8, layers: 2 });
  for (const [u, v] of [[68, 10], [70.5, 11]] as const) addBarrel(st, u, v, 1.7, 3.4);
  addCrate(st, 40, 12, 3.4, 3, 3, '#c9a06a');
  addDistrict(st, { poly: [[-6, 42], [90, 42], [90, 56], [-6, 56]], avoid: [[26, 40, 52, 50]], size: [7, 10], tall: 0.2, height: 0.9, roofs: [ROOF.thatch, ROOF.brown, ROOF.red], walls: [WALL.timber, WALL.plaster] });
  addTree(st, 92, 34, { w: 14, h: 19 });
  addTree(st, -10, 46, { kind: 'pine', w: 13, h: 22 });
};

/** A small boatyard: ribs on the stocks under scaffolding, upturned hulls on trestles and a fisherman's shed. */
const boatyard: Builder = (st) => {
  addSea(st, BAY, { shore: { from: 0, count: 10 }, colors: { deep: '#2f6f8f', mid: '#3f8aa6' } });
  addDirt(st, 40, 8, 62, 10, '#d0bc8e', 0.9);
  addDirt(st, 40, 24, 56, 13, '#a8926b', 0.5);
  addSlipway(st, { u: 32, v0: 22, v1: -10, w: 11 });
  addBoat(st, { u: 37.5, v: 12, dir: 'v', len: 19, beam: 6.8, bow: -1, hull: '#b08a58', trim: '#e0cfa0', sheer: 3.6, build: 0.18, dry: true, lift: 2 });
  addScaffold(st, { u: 32, v: 2, a: 11, b: 21, h: 14, levels: 2 });
  addBoat(st, { u: 8, v: 12, dir: 'u', len: 11, beam: 4.2, hull: '#7c5a3c', dry: true, upturned: true, lift: 1.6 });
  addBoat(st, { u: 8, v: 21, dir: 'u', len: 10, beam: 4, hull: '#8a6a45', dry: true, upturned: true, lift: 1.6 });
  addBoat(st, { u: 62, v: -8, dir: 'v', len: 13, beam: 4.6, bow: -1, hull: '#6f4f33', mast: { h: 13, sail: '#e8dcb8', kind: 'lateen' }, cargo: 'fish' });
  addBoat(st, { u: 14, v: -12, dir: 'u', len: 9, beam: 3.6, hull: '#9a6f45', oars: 2 });
  addTimberBox(st, { u: 56, v: 18, a: 18, b: 12, h: 8, wood: '#7c5a3c', planks: 'vertical', roof: { kind: 'gable', color: ROOF.thatch, h: 9, ridge: 'u', over: 1.3 }, door: { face: 'v', w: 6, h: 6, at: 0.4 }, windows: 1 });
  addHouse(st, 6, 32, 12, 9, { wallH: 7, roofH: 7, wall: WALL.timber, roof: ROOF.thatch });
  addSmoke(st, 12, 37, 13, 5, 3);
  addRack(st, { u: 52, v: 8, len: 14, hang: 'net' });
  addPlankStack(st, 22, 26, 9, 3.6, 3.2);
  addLogPile(st, { u: 20, v: 36, len: 9 });
  addBarrel(st, 52, 25, 1.7, 3.4);
  addBarrel(st, 54.5, 26, 1.7, 3.4);
  addTree(st, 72, 36, { kind: 'pine', w: 13, h: 22 });
  addTree(st, 80, 28, { kind: 'pine', w: 12, h: 20 });
  addTree(st, -4, 42, { w: 14, h: 19 });
};

const BUILDERS: Builder[] = [slipways, boatyard];
const BASE = [0.8, 0.8];
const SHIFT = [-34, -34];

export default defineSymbol({
  id: 'settlement.shipyard',
  name: 'Shipyard',
  category: 'settlements',
  size: [180, 128],
  anchor: [0.5, 0.66],
  order: 72,
  tags: ['settlement', 'shipyard', 'harbor', 'harbour', 'dock', 'slipway', 'ship', 'boatyard', 'coast'],
  placement: 'land',
  variants: 2,
  draw(d) {
    const { ctx, w, h, rand, variant } = d;
    const i = variant % BUILDERS.length;
    const stage = createStage(ctx, rand, w / 2 + SHIFT[i]!, h * BASE[i]!);
    BUILDERS[i]!(stage);
    stage.scene.render(ctx);
  },
});
