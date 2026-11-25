import { defineSymbol } from '../../kit/define';
import type { Vec2 } from '../../kit/types';
import { addBox, addCrag, addGround, addRing, addTower, ringPoints } from '../../parts/settle-castle';
import { STONE, createStage, makeIso } from '../../parts/settle-geom';
import type { Stage } from '../../parts/settle-geom';
import { addBush, addDirt, addRocks, addTree, addTufts } from '../../parts/settle-props';

interface Place {
  ox: number;
  oy: number;
}
type Builder = (st: Stage, at: Place) => void;

const RED = '#b2503a';
const BLUE = '#4d6fa0';
const BROWN = '#7c5a3c';
const COURT = '#a8926b';
const FLAG = '#c0392b';

/** Classic square castle: four round towers, a twin-towered gatehouse and a tall keep. */
const classic: Builder = (st) => {
  const A = 58;
  const stone = STONE.gray;
  addDirt(st, A / 2, -11, 10, 9);
  addGround(st, [[3, 3], [A - 3, 3], [A - 3, A - 3], [3, A - 3]], COURT, 0.75);
  addRing(st, [[0, 0], [A, 0], [A, A], [0, A]], { stone, gate: { edge: 0, w: 20 } });
  const g0 = A / 2 - 10;
  addBox(st, { u: g0, v: -3, a: 20, b: 11, h: 26, stone, gate: { face: 'v', w: 9, h: 15 }, windows: false });
  addTower(st, { u: g0, v: -3, r: 5, h: 31, stone, top: 'cone', roof: RED, roofH: 13, slits: 1 });
  addTower(st, { u: g0 + 20, v: -3, r: 5, h: 31, stone, top: 'cone', roof: RED, roofH: 13, slits: 1, bias: -3 });
  addTower(st, { u: 0, v: 0, r: 8.5, h: 34, stone, top: 'cone', roof: RED, roofH: 17, slits: 2 });
  addTower(st, { u: A, v: 0, r: 8, h: 32, stone, top: 'cone', roof: RED, roofH: 16, slits: 2 });
  addTower(st, { u: A, v: A, r: 8, h: 33, stone, top: 'cone', roof: RED, roofH: 16, slits: 2, flag: FLAG });
  addTower(st, { u: 0, v: A, r: 8, h: 32, stone, top: 'cone', roof: RED, roofH: 16, slits: 2 });
  addBox(st, { u: 12, v: 26, a: 24, b: 24, h: 46, stone: STONE.warm, roof: { kind: 'hip', color: BLUE, h: 20 }, windows: { rows: 3 }, turrets: { r: 3.4, h: 9, roof: BLUE }, flag: FLAG });
  addBush(st, -7, 12, 4.5);
  addTree(st, -9, 30, { w: 15, h: 20 });
  addBush(st, 14, -10, 4);
  addRocks(st, A + 7, 12, 3, 5);
  addTree(st, A + 10, 26, { w: 14, h: 19, leaf: '#5f7f33' });
  addTufts(st, A / 2, -14, 3, 9);
};

/** Long Norman-style castle: a great hall, a round donjon and a square gate tower in the long wall. */
const hall: Builder = (st) => {
  const A = 78;
  const B = 40;
  const stone = STONE.warm;
  addDirt(st, 26, -11, 10, 9);
  addGround(st, [[3, 3], [A - 3, 3], [A - 3, B - 3], [3, B - 3]], COURT, 0.75);
  addRing(st, [[0, 0], [A, 0], [A, B], [0, B]], { stone, h: 16, gate: { edge: 0, w: 15, at: 0.34 } });
  const gx = A * 0.34 - 8;
  addBox(st, { u: gx, v: -3, a: 16, b: 12, h: 29, stone, gate: { face: 'v', w: 8, h: 15 }, windows: false, turrets: { r: 3.2, h: 8, roof: RED, inset: 2.6 }, flag: FLAG });
  addTower(st, { u: 0, v: 0, r: 9.5, h: 34, stone, top: 'crenel', slits: 2 });
  addTower(st, { u: A, v: 0, r: 8, h: 38, stone, top: 'cone', roof: BLUE, roofH: 17, slits: 2 });
  addTower(st, { u: A, v: B, r: 8, h: 34, stone, top: 'crenel', slits: 2 });
  addTower(st, { u: 0, v: B, r: 8, h: 30, stone, top: 'cone', roof: RED, roofH: 15, slits: 2 });
  addTower(st, { u: A * 0.7, v: 0, r: 5.5, h: 24, stone, top: 'flat', slits: 1 });
  addTower(st, { u: A / 2 + 4, v: B, r: 5.5, h: 25, stone, top: 'flat', slits: 1 });
  addBox(st, { u: 16, v: 11, a: 36, b: 17, h: 19, stone: STONE.pale, roof: { kind: 'gable', color: BROWN, h: 15, ridge: 'u' }, windows: { rows: 1 } });
  addTower(st, { u: 64, v: 22, r: 11, h: 42, stone, top: 'cone', roof: RED, roofH: 22, windows: 3, slits: 0, flag: '#2f5f9a' });
  addBush(st, -8, 6, 4.5);
  addTree(st, -7, B + 6, { w: 15, h: 20 });
  addRocks(st, A * 0.7 + 6, -9, 3, 6);
  addTree(st, A + 9, 10, { w: 14, h: 19, leaf: '#5f7f33' });
  addTufts(st, -14, B / 2, 3, 8);
};

/** Octagonal ring castle: eight small towers around a round donjon. */
const octagon: Builder = (st) => {
  const stone = STONE.pale;
  const R = 33;
  const c = 36;
  const pts = ringPoints(c, c, R, 8, Math.PI / 8);
  const gy = pts[5]![1];
  addDirt(st, c, gy - 9, 10, 8);
  addGround(st, ringPoints(c, c, R - 3, 8, Math.PI / 8), COURT, 0.75);
  addRing(st, pts, { stone, gate: { edge: 5, w: 14 } });
  addBox(st, { u: c - 8, v: gy - 5.5, a: 16, b: 11, h: 25, stone, gate: { face: 'v', w: 8, h: 14 }, windows: false });
  pts.forEach((p, i) => {
    addTower(st, { u: p[0], v: p[1], r: 6.4, h: 24 + (i % 2) * 5, stone, top: 'cone', roof: i % 2 ? RED : '#c4673f', roofH: 13, slits: 1, flag: i === 2 ? FLAG : undefined });
  });
  addTower(st, { u: c, v: c, r: 12.5, h: 40, stone: STONE.warm, top: 'cone', roof: BLUE, roofH: 22, windows: 3, flag: FLAG });
  addBush(st, 4, -2, 4.5);
  addTree(st, -10, 28, { w: 15, h: 20 });
  addRocks(st, 70, 8, 3, 5);
  addTufts(st, c, gy - 14, 3, 9);
};

/** Tall tower-house castle in a small walled yard. */
const towerHouse: Builder = (st) => {
  const A = 60;
  const B = 38;
  const stone = STONE.cold;
  addDirt(st, 15, -10, 9, 8);
  addGround(st, [[3, 3], [A - 3, 3], [A - 3, B - 3], [3, B - 3]], COURT, 0.75);
  addRing(st, [[0, 0], [A, 0], [A, B], [0, B]], { stone, h: 15, gate: { edge: 0, w: 17, at: 0.3 } });
  const gx = A * 0.3 - 8.5;
  addBox(st, { u: gx, v: -3, a: 17, b: 10, h: 23, stone, gate: { face: 'v', w: 8, h: 14 }, windows: false });
  addTower(st, { u: 0, v: 0, r: 7.5, h: 26, stone, top: 'cone', roof: RED, roofH: 14, slits: 2 });
  addTower(st, { u: A, v: 0, r: 7.5, h: 28, stone, top: 'cone', roof: RED, roofH: 14, slits: 2 });
  addTower(st, { u: A, v: B, r: 7.5, h: 30, stone, top: 'cone', roof: RED, roofH: 15, slits: 2 });
  addTower(st, { u: 0, v: B, r: 7.5, h: 26, stone, top: 'cone', roof: RED, roofH: 14, slits: 2 });
  addBox(st, { u: 8, v: 14, a: 14, b: 10, h: 9, stone: '#d8c9a4', plain: true, roof: { kind: 'gable', color: BROWN, h: 7, ridge: 'u' }, windows: false });
  addBox(st, { u: 30, v: 6, a: 24, b: 24, h: 52, stone: STONE.cold, roof: { kind: 'hip', color: '#4f8a85', h: 22 }, windows: { rows: 4 }, turrets: { r: 4.2, h: 15, roof: RED }, flag: '#d9a441' });
  addTree(st, -9, 16, { w: 15, h: 20 });
  addBush(st, -5, 28, 4);
  addBush(st, A + 6, 18, 4.5);
  addRocks(st, A + 8, 4, 3, 5);
  addTufts(st, 30, -12, 3, 10);
};

/** A castle perched on a rocky crag. */
const crag: Builder = (st, { ox, oy }) => {
  const E = 22;
  const rock: Vec2[] = [[-6, -2], [14, -9], [34, -5], [54, 2], [62, 22], [56, 44], [36, 56], [12, 54], [-4, 40], [-9, 18]];
  addCrag(st, { poly: rock, elev: E, color: '#8a7f6e', top: '#8aa05a' });
  const hi: Stage = { ...st, iso: makeIso(ox, oy - E) };
  const stone = STONE.gray;
  const wall: Vec2[] = [[4, 6], [40, 2], [54, 22], [46, 44], [16, 50], [2, 30]];
  addGround(hi, wall, COURT, 0.7);
  addRing(hi, wall, { stone, h: 14, gate: { edge: 0, w: 12 } });
  addBox(hi, { u: 15, v: -3, a: 16, b: 10, h: 23, stone, gate: { face: 'v', w: 8, h: 13 }, windows: false });
  addTower(hi, { u: 4, v: 6, r: 6.5, h: 26, stone, top: 'cone', roof: RED, roofH: 14, slits: 2 });
  addTower(hi, { u: 40, v: 2, r: 5.5, h: 24, stone, top: 'crenel', slits: 1 });
  addTower(hi, { u: 54, v: 22, r: 7, h: 32, stone, top: 'cone', roof: BLUE, roofH: 17, slits: 2, flag: FLAG });
  addTower(hi, { u: 46, v: 44, r: 6, h: 25, stone, top: 'cone', roof: RED, roofH: 13, slits: 1 });
  addTower(hi, { u: 16, v: 50, r: 7, h: 30, stone, top: 'crenel', slits: 2 });
  addTower(hi, { u: 2, v: 30, r: 6, h: 23, stone, top: 'cone', roof: RED, roofH: 12, slits: 1 });
  addBox(hi, { u: 17, v: 18, a: 20, b: 20, h: 38, stone: STONE.warm, roof: { kind: 'hip', color: BLUE, h: 18 }, windows: { rows: 3 }, turrets: { r: 3, h: 8, roof: BLUE } });
  addRocks(st, -12, 28, 3, 4);
  addRocks(st, 40, 60, 3, 5);
  addBush(st, 24, -14, 4);
  addBush(st, 66, 10, 4);
  addBush(st, 0, 56, 4);
  addTufts(st, 20, -14, 3, 10);
};

const BUILDERS: Builder[] = [classic, hall, octagon, towerHouse, crag];
/** Variants that stand on a crag need more headroom at the bottom of the design box. */
const BASE: number[] = [0.9, 0.9, 0.9, 0.9, 0.93];

export default defineSymbol({
  id: 'castle.keep',
  name: 'Castle',
  category: 'settlements',
  size: [168, 136],
  anchor: [0.5, 0.9],
  order: 40,
  tags: ['castle', 'fortress', 'keep', 'stronghold'],
  placement: 'land',
  variants: 5,
  draw(d) {
    const { ctx, w, h, rand, variant } = d;
    const i = variant % BUILDERS.length;
    const ox = w / 2;
    const oy = h * BASE[i]!;
    const stage = createStage(ctx, rand, ox, oy);
    BUILDERS[i]!(stage, { ox, oy });
    stage.scene.render(ctx);
  },
});
