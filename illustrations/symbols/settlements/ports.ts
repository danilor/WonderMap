import { defineSymbol } from '../../kit/define';
import type { Vec2 } from '../../kit/types';
import { ROOF, WALL } from '../../parts/building';
import { addBox, addGround, addTower } from '../../parts/settle-castle';
import { STONE, createStage } from '../../parts/settle-geom';
import type { Stage } from '../../parts/settle-geom';
import { addBoat, addCrane, addPier, addQuay, addSea } from '../../parts/settle-harbor';
import { addSmoke } from '../../parts/settle-ruin';
import { addLogPile, addPalm, addRack } from '../../parts/settle-shore';
import { addBarrel, addCrate, addDirt, addPath, addStall, addTree } from '../../parts/settle-props';
import { addChurch, addDistrict, addHouse, addTownWall, raised } from '../../parts/settle-town';
import { addTimberBox } from '../../parts/settle-wood';

type Builder = (st: Stage) => void;

const FLAG = '#c0392b';
const BLUE = '#4d6fa0';
const TEAL = '#4f7f86';

/** The bay in front of the quay: water towards -v, i.e. the lower right of the sprite. */
const BAY: Vec2[] = [[-12, 2], [34, 1.5], [74, 1.5], [100, 1], [108, -12], [102, -30], [74, -40], [32, -42], [-4, -36], [-16, -18]];

function addBay(st: Stage): void {
  addSea(st, BAY, { shore: { from: 3, count: 8 } });
}

/** A busy trading harbour: timber piers, a crane, warehouses and a cog at the quay. */
const merchant: Builder = (st) => {
  addBay(st);
  addQuay(st, { u0: -8, u1: 92, v0: 0, v1: 8, h: 3, bollards: [2, 16, 30, 44, 58, 72, 86] });
  addPath(st, [[-6, 12.5], [88, 12.5]], 4);
  addPath(st, [[42, 12.5], [42, 50]], 3.4);
  addPier(st, { u: 14, v: 0.5, len: 24, w: 5 });
  addPier(st, { u: 60, v: 0.5, len: 17, w: 5 });
  addBoat(st, { u: 24.2, v: -14.5, dir: 'v', len: 26, beam: 8.4, bow: -1, hull: '#7c5a3c', trim: '#e7d6a6', sheer: 4.6, mast: { h: 22, sail: '#efe3c3', stripe: '#b2503a', kind: 'square', flag: FLAG }, cargo: 'barrels' });
  addBoat(st, { u: 68.8, v: -9.5, dir: 'v', len: 17, beam: 6, bow: -1, hull: '#8a6a45', mast: { h: 15, sail: '#e8dcb8', kind: 'lateen' }, cargo: 'crates' });
  addBoat(st, { u: 4, v: -7, dir: 'v', len: 8.5, beam: 3.4, hull: '#9a6f45', oars: 2 });
  addBoat(st, { u: 44, v: -8, dir: 'u', len: 9, beam: 3.6, hull: '#6f4f33', cargo: 'fish' });
  addBoat(st, { u: 82, v: -26, dir: 'u', len: 22, beam: 7.6, bow: 1, hull: '#5b4630', trim: '#d9c28a', sheer: 4.2, mast: { h: 21, sail: '#f1e6c6', stripe: '#4d6fa0', kind: 'square', flag: '#4d6fa0' } });
  const hall = { wall: WALL.timber, roof: ROOF.brown };
  addTimberBox(st, { u: 58, v: 13, a: 26, b: 11, h: 9, wood: '#b58f5c', planks: 'horizontal', roof: { kind: 'gable', color: ROOF.thatch, h: 9, ridge: 'u', over: 1.2 }, door: { face: 'v', w: 8, h: 7, at: 0.5 }, windows: 1 });
  addHouse(st, -1, 13.5, 20, 10, { ...hall, wallH: 8, roofH: 8 });
  addChurch(st, 28, 32, { roof: ROOF.slate });
  addBox(st, { u: 74, v: 30, a: 9, b: 9, h: 16, stone: STONE.warm, roof: { kind: 'pyramid', color: ROOF.teal, h: 10 }, windows: { glow: '#ffd27a', rows: 2, scale: 0.7 }, flag: FLAG });
  addDistrict(st, { poly: [[-4, 14], [88, 14], [88, 50], [-4, 50]], avoid: [[-4, 12, 22, 25], [55, 12, 85, 25], [26, 30, 53, 43], [38, 12, 46, 52], [72, 28, 85, 41]], size: [7, 10], tall: 0.3 });
  addCrane(raised(st, 3), { u: 21, v: 1.4, h: 25, jib: 9.5 });
  const dock = raised(st, 3);
  for (const [u, v] of [[6, 4], [8.5, 5], [37, 3.6], [46, 5], [51, 3.2], [88, 5]] as const) addBarrel(dock, u, v, 1.7, 3.4);
  for (const [u, v] of [[35, 5.5], [78, 4], [54, 2.4]] as const) addCrate(dock, u, v, 3.4, 3, 3, '#c9a06a');
  addTree(st, -8, 34, { w: 14, h: 19 });
  addTree(st, 94, 26, { w: 14, h: 19 });
};

const FORT_BAY: Vec2[] = [[-12, 2], [34, 1.5], [74, 1.5], [100, 1], [112, -12], [108, -30], [80, -42], [32, -44], [-4, -38], [-16, -18]];

/** A walled harbour town: crenellated wall, a stone mole with a watchtower and a galley at the quay. */
const fortified: Builder = (st) => {
  addSea(st, FORT_BAY, { shore: { from: 3, count: 8 } });
  addQuay(st, { u0: -6, u1: 97, v0: -30, v1: 8, poly: [[-6, 0], [88, 0], [88, -30], [97, -30], [97, 8], [-6, 8]], foam: [0, 1, 2], h: 3, stone: STONE.gray, bollards: [6, 20, 34, 48, 62, 76], bollardV: 1.4 });
  addPath(st, [[-4, 10.8], [94, 10.8]], 3.2);
  addPath(st, [[41, 22], [41, 50]], 4);
  addPier(st, { u: 10, v: 0.5, len: 15, w: 4.4 });
  addBoat(st, { u: 52, v: -5.4, dir: 'u', len: 32, beam: 6.4, bow: 1, hull: '#4f3f2e', trim: '#d9c28a', sheer: 3.4, oars: 9, mast: { h: 19, sail: '#efe3c3', stripe: BLUE, kind: 'lateen', flag: FLAG } });
  addBoat(st, { u: 76, v: -22, dir: 'u', len: 19, beam: 7, bow: -1, hull: '#7c5a3c', sheer: 4, mast: { h: 17, sail: '#efe3c3', stripe: '#b2503a', kind: 'square', flag: BLUE } });
  addBoat(st, { u: 17, v: -9, dir: 'v', len: 8.5, beam: 3.4, hull: '#9a6f45', oars: 2 });
  addBoat(st, { u: 103, v: -14, dir: 'v', len: 10, beam: 3.8, hull: '#6f4f33', cargo: 'fish' });
  addTownWall(st, [[0, 15], [80, 15], [80, 52], [0, 52]], {
    stone: STONE.gray,
    h: 8,
    t: 3.4,
    crenels: true,
    gate: { edge: 0, face: 'v', at: 0.5, w: 8, boxH: 17, roof: BLUE, roofH: 8, flag: FLAG },
    tower: { r: 4.2, h: 15, top: 'cone', roofs: [BLUE, TEAL], mid: { every: 28, r: 3, h: 12, top: 'crenel' } },
  });
  addBox(st, { u: 56, v: 27, a: 16, b: 13, h: 21, stone: STONE.warm, top: 'crenel', windows: { glow: '#ffd27a', rows: 2, scale: 0.7 }, turrets: { r: 2.6, h: 8, top: 'cone', roof: BLUE, inset: 0.4 }, flag: FLAG });
  addChurch(st, 5, 31, { roof: ROOF.slate });
  addDistrict(st, { poly: [[5, 20], [76, 20], [76, 48], [5, 48]], avoid: [[34, 14, 48, 50], [54, 25, 74, 42], [3, 29, 31, 42]], size: [7, 10], tall: 0.5, height: 1.1, roofs: [ROOF.red, ROOF.slate, ROOF.blue, ROOF.red, ROOF.teal] });
  const mole = raised(st, 3);
  addTower(mole, { u: 92.5, v: -25.5, r: 4.8, h: 17, stone: STONE.gray, top: 'crenel', flag: FLAG, slits: 1 });
  addTower(mole, { u: -1, v: 5, r: 4.2, h: 20, stone: STONE.gray, top: 'cone', roof: BLUE, roofH: 9, flag: FLAG, slits: 1 });
  for (const [u, v] of [[24, 4.6], [26.6, 5.8], [66, 4.4]] as const) addBarrel(mole, u, v, 1.7, 3.4);
  for (const [u, v] of [[30, 4.2], [58, 3]] as const) addCrate(mole, u, v, 3.4, 3, 3, '#c9a06a');
  addTree(st, 88, 38, { w: 14, h: 19 });
  addTree(st, -9, 40, { w: 14, h: 19 });
};

const NORTH_SEA = { deep: '#27607f', mid: '#33789b', shallow: '#78b9c4' };

/** A longship harbour: dark timber jetties, longships with dragon prows, a long hall and drying racks on the beach. */
const northern: Builder = (st) => {
  addSea(st, BAY, { shore: { from: 0, count: 10 }, colors: NORTH_SEA });
  addDirt(st, 46, 4, 68, 10, '#d3bf8e', 0.9);
  const wood = '#6b4f33';
  addPier(st, { u: 12, v: 1, len: 24, w: 4.4, wood });
  addPier(st, { u: 46, v: 1, len: 28, w: 4.4, wood });
  addPier(st, { u: 78, v: 1, len: 16, w: 4.4, wood });
  const shields = ['#b2503a', '#e0b86a', '#4d6fa0', '#efe3c3', '#b2503a', '#2f2820'];
  addBoat(st, { u: 19, v: -14, dir: 'v', len: 26, beam: 7, bow: -1, prow: 'dragon', hull: '#5b4630', trim: '#d9c28a', sheer: 4.8, oars: 7, shields, mast: { h: 22, sail: '#d9ccb0', stripe: '#b2503a', kind: 'square', flag: '#b2503a' } });
  addBoat(st, { u: 53, v: -16, dir: 'v', len: 28, beam: 7.4, bow: -1, prow: 'dragon', hull: '#4a3a2b', trim: '#c9a46a', sheer: 5, oars: 8, shields, mast: { h: 23, sail: '#efe6cc', stripe: '#4d6fa0', kind: 'furled', flag: FLAG } });
  addBoat(st, { u: 84, v: -10, dir: 'v', len: 17, beam: 6.2, bow: -1, hull: '#6f5233', trim: '#c9a46a', sheer: 4, mast: { h: 15, sail: '#e8dcb8', kind: 'square' }, cargo: 'barrels' });
  addBoat(st, { u: 33, v: -9, dir: 'u', len: 8.5, beam: 3.4, hull: '#8a6a45', oars: 2 });
  addTimberBox(st, { u: 12, v: 16, a: 34, b: 12, h: 8, wood: '#5f4631', planks: 'vertical', roof: { kind: 'gable', color: '#8f7a4a', h: 11, ridge: 'u', over: 1.6 }, door: { face: 'v', w: 5, h: 6.4, at: 0.3 }, windows: 1 });
  addSmoke(st, 29, 22, 20, 5, 3.4);
  addTimberBox(st, { u: 56, v: 14, a: 18, b: 12, h: 7, wood: '#6a4f36', planks: 'vertical', roof: { kind: 'gable', color: '#7a6540', h: 9, ridge: 'v', over: 1.2 }, door: { face: 'v', w: 8, h: 6, at: 0.5 } });
  addDistrict(st, { poly: [[-4, 31], [84, 31], [84, 52], [-4, 52]], avoid: [[10, 14, 48, 30], [54, 12, 76, 28]], size: [6, 9], tall: 0.15, height: 0.85, roofs: [ROOF.thatch, '#8f7a4a', ROOF.brown], walls: ['#6a4f36', '#7c5a3c', WALL.timber] });
  addRack(st, { u: -6, v: 8, len: 16, hang: 'fish' });
  addRack(st, { u: 74, v: 8, len: 12, hang: 'net' });
  addLogPile(st, { u: 52, v: 32, len: 9 });
  addTree(st, -10, 34, { kind: 'pine', w: 13, h: 22 });
  addTree(st, 90, 40, { kind: 'pine', w: 13, h: 22 });
  addTree(st, 84, 24, { kind: 'pine', w: 12, h: 20 });
};

const SOUTH_SEA = { deep: '#2480a8', mid: '#37a6b8', shallow: '#a8e6dc' };
const SANDSTONE = '#e6d3a4';

/** A bazaar harbour: sun-bleached flat-roofed houses, domes and a minaret, stalls on the quay, dhows and palms. */
const southern: Builder = (st) => {
  addSea(st, BAY, { shore: { from: 3, count: 8 }, colors: SOUTH_SEA });
  addQuay(st, { u0: -8, u1: 92, v0: 0, v1: 8, h: 3, stone: '#d5c395', bollards: [2, 18, 34, 50, 66, 84] });
  addPath(st, [[-6, 11.5], [90, 11.5]], 3.6, '#dcc99a');
  addPier(st, { u: 14, v: 0.5, len: 22, w: 4.6, wood: '#b88f5a' });
  addPier(st, { u: 62, v: 0.5, len: 16, w: 4.6, wood: '#b88f5a' });
  addBoat(st, { u: 22, v: -13, dir: 'v', len: 25, beam: 6.4, bow: -1, hull: '#c9a06a', trim: '#f2e6c4', sheer: 4.4, mast: { h: 25, sail: '#f7efd6', stripe: TEAL, kind: 'lateen' }, cargo: 'crates' });
  addBoat(st, { u: 69, v: -9, dir: 'v', len: 17, beam: 5.6, bow: -1, hull: '#a67c4d', trim: '#f2e6c4', mast: { h: 18, sail: '#f4ead0', kind: 'lateen' } });
  addBoat(st, { u: 4, v: -7, dir: 'v', len: 8.5, beam: 3.4, hull: '#c9a06a', oars: 2 });
  addBoat(st, { u: 84, v: -24, dir: 'u', len: 22, beam: 7, bow: 1, hull: '#b08a5a', trim: '#f2e6c4', sheer: 4, mast: { h: 22, sail: '#f4ead0', stripe: BLUE, kind: 'lateen' } });
  const bazaar = raised(st, 3);
  addStall(bazaar, 8, 2.6, '#c0392b', '#e0b050');
  addStall(bazaar, 36, 2.6, '#3d8db4', '#d9a441');
  addStall(bazaar, 76, 2.6, '#e0a030', '#c0392b');
  for (const [u, v] of [[26, 4.4], [29, 5.6], [52, 4.2]] as const) addBarrel(bazaar, u, v, 1.7, 3.4);
  addCrate(bazaar, 44, 4, 3.4, 3, 3, '#c9a06a');
  addGround(st, [[-8, 9], [90, 9], [92, 30], [86, 54], [-6, 56], [-12, 30]], '#dcc89a', 0.85);
  const walls = [SANDSTONE, '#f0dfb7', '#dcc08c', '#ecd5a0'];
  let k = 0;
  const house = (u: number, v: number, a: number, b: number, h: number, dome?: string, hut = false) => {
    const stone = walls[k++ % walls.length]!;
    addBox(st, { u, v, a, b, h, stone, top: 'flat', plain: true, windows: { rows: 1, scale: 0.75 } });
    if (dome) addTower(raised(st, h), { u: u + a / 2, v: v + b / 2, r: Math.min(a, b) * 0.4, h: 1.5, stone, top: 'dome', roof: dome, roofH: Math.min(a, b) * 0.62, noShadow: true, bias: -2 });
    if (hut) addBox(raised(st, h), { u: u + 1.5, v: v + 1.5, a: 4.5, b: 4, h: 3.2, stone, top: 'flat', plain: true, windows: false, noShadow: true, bias: -2 });
  };
  house(-2, 14, 13, 10, 8, undefined, true);
  house(14, 14, 11, 10, 10, TEAL);
  house(27, 14, 12, 9, 7);
  house(41, 14, 14, 10, 9, undefined, true);
  house(-4, 27, 13, 11, 10);
  house(11, 27, 13, 12, 12, BLUE);
  house(28, 27, 14, 11, 9, undefined, true);
  house(45, 27, 14, 11, 11);
  house(62, 33, 15, 11, 9, TEAL);
  house(6, 42, 14, 10, 9, BLUE);
  house(26, 41, 14, 11, 8);
  house(44, 41, 14, 10, 10, undefined, true);
  house(66, 46, 14, 9, 8);
  addBox(st, { u: 58, v: 14, a: 22, b: 16, h: 12, stone: '#f0dfb7', top: 'flat', plain: true, windows: { rows: 1, scale: 0.8 } });
  addTower(raised(st, 12), { u: 69, v: 22, r: 7, h: 2, stone: '#f0dfb7', top: 'dome', roof: TEAL, roofH: 11, noShadow: true, bias: -2 });
  addTower(st, { u: 85, v: 15, r: 2.2, h: 28, stone: '#f3e6c0', top: 'spire', roof: TEAL, roofH: 10, slits: 1 });
  addPalm(st, -8, 17, { h: 24 });
  addPalm(st, 90, 26, { h: 26 });
  addPalm(st, 84, 42, { h: 22 });
  addPalm(st, 4, 54, { h: 22 });
};

const BUILDERS: Builder[] = [merchant, fortified, northern, southern];
const BASE = [0.8, 0.8, 0.8, 0.8];
const SHIFT = [-34, -34, -34, -34];

export default defineSymbol({
  id: 'settlement.port',
  name: 'Port',
  category: 'settlements',
  size: [180, 128],
  anchor: [0.5, 0.66],
  order: 70,
  tags: ['settlement', 'port', 'harbor', 'harbour', 'quay', 'docks', 'coast', 'trade'],
  placement: 'land',
  variants: 4,
  draw(d) {
    const { ctx, w, h, rand, variant } = d;
    const i = variant % BUILDERS.length;
    const stage = createStage(ctx, rand, w / 2 + SHIFT[i]!, h * BASE[i]!);
    BUILDERS[i]!(stage);
    stage.scene.render(ctx);
  },
});
