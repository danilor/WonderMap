import { defineSymbol } from '../../kit/define';
import type { Vec2 } from '../../kit/types';
import { ROOF, WALL } from '../../parts/building';
import { addBox, addGround, addTower, ringPoints } from '../../parts/settle-castle';
import { STONE, createStage } from '../../parts/settle-geom';
import type { Stage } from '../../parts/settle-geom';
import { addBarrel, addBush, addDirt, addHaystack, addPalisade, addPath, addRocks, addStall, addTree, addTufts, addWell } from '../../parts/settle-props';
import { addChurch, addDistrict, addField, addTownWall, insetPoly } from '../../parts/settle-town';
import type { Rect } from '../../parts/settle-town';
import { addTimberBox } from '../../parts/settle-wood';

type Builder = (st: Stage) => void;

const RED = '#b2503a';
const BLUE = '#4d6fa0';
const TEAL = '#4f7f86';
const FLAG = '#c0392b';
const COBBLE = '#b59d73';
const CROP = '#c9b25e';
const CROP2 = '#8fae52';
const WH = 8;

/** Square market town: church on the far side, a plaza behind the gatehouse. */
const marketstead: Builder = (st) => {
  const A = 76;
  const B = 62;
  const cu = 22;
  const pts: Vec2[] = [[0, 0], [A, 0], [A, B], [0, B]];
  const church: Rect = [46, 38, 70, 48];
  const plaza: Rect = [cu - 3.3, 22, cu + 19, 35];
  addDirt(st, cu, -12, 11, 8);
  addPath(st, [[cu, -5], [cu + 3, -21]], 6);
  addGround(st, [[3, 3], [A - 3, 3], [A - 3, B - 3], [3, B - 3]], COBBLE, 0.8);
  addDistrict(st, { poly: insetPoly(pts, 6), avoid: [[cu - 3.3, 0, cu + 3.3, B], plaza, church], height: 1.15 });
  addWell(st, cu + 9, 28.5);
  addStall(st, cu + 4, 24.5, RED);
  addStall(st, cu + 4, 30.5, BLUE, '#c7522f');
  addChurch(st, church[0], church[1], { spire: BLUE, roof: RED });
  addTownWall(st, pts, { stone: STONE.warm, h: WH, t: 3.4, gate: { edge: 0, face: 'v', at: cu / A, w: 9, flag: FLAG }, tower: { r: 5, h: 14, roofs: [RED, TEAL, RED, BLUE], flag: FLAG } });
  addBush(st, -8, 16, 4.4);
  addTree(st, -10, 38, { w: 15, h: 20 });
  addTree(st, A + 9, 14, { w: 15, h: 20, leaf: '#5f7f33' });
  addBush(st, cu + 12, -11, 4);
  addRocks(st, A + 7, 36, 3, 5);
  addTufts(st, cu - 11, -12, 3, 8);
};

/** Octagonal town around a market square with a town hall and a clock tower. */
const octagon: Builder = (st) => {
  const S = 70;
  const c = 17;
  const cu = S / 2;
  const pts: Vec2[] = [[c, 0], [S - c, 0], [S, c], [S, S - c], [S - c, S], [c, S], [0, S - c], [0, c]];
  const hall: Rect = [20, 33, 48, 48];
  const square: Rect = [cu - 14, 14, cu + 14, 29];
  addDirt(st, cu, -12, 11, 8);
  addPath(st, [[cu, -5], [cu - 2, -21]], 6);
  addGround(st, insetPoly(pts, 3), COBBLE, 0.8);
  addDistrict(st, { poly: insetPoly(pts, 6), avoid: [[cu - 3.3, 0, cu + 3.3, 15], square, hall], roofs: [ROOF.red, ROOF.red, ROOF.brown, ROOF.teal, ROOF.slate], height: 1.15 });
  addWell(st, cu, 21);
  addStall(st, cu - 12, 16, RED);
  addStall(st, cu + 7, 16, BLUE, '#c7522f');
  addBox(st, { u: hall[0] + 3, v: hall[1] + 1, a: 25, b: 13, h: 11, stone: WALL.plaster, plain: true, roof: { kind: 'gable', color: RED, h: 9, ridge: 'u', over: 1 }, windows: { rows: 1, scale: 0.8 }, gate: { face: 'v', w: 5, h: 7.5 } });
  addBox(st, { u: hall[0], v: hall[1], a: 8, b: 8, h: 24, stone: STONE.pale, roof: { kind: 'pyramid', color: TEAL, h: 14 }, windows: { rows: 2, scale: 0.7 }, bias: -2, flag: FLAG });
  addTownWall(st, pts, { stone: STONE.gray, h: WH, t: 3.4, gate: { edge: 0, face: 'v', w: 9, flag: FLAG }, tower: { r: 4.4, h: 13, roofs: [TEAL, RED, TEAL, BLUE] } });
  addTree(st, -8, 44, { w: 15, h: 20 });
  addBush(st, S + 7, 16, 4.2);
  addTree(st, S + 9, 44, { w: 14, h: 19, leaf: '#5f7f33' });
  addRocks(st, -10, 14, 3, 5);
  addTufts(st, cu + 13, -12, 3, 8);
};

/** Walled town with a small castle keep in its back corner. */
const keepTown: Builder = (st) => {
  const A = 80;
  const B = 60;
  const pts: Vec2[] = [[0, 0], [A, 0], [A, B], [0, B]];
  const at = 0.62;
  const gv = B * (1 - at);
  const keep: Rect = [54, 28, 72, 46];
  addDirt(st, -12, gv, 8, 11);
  addPath(st, [[-5, gv], [-22, gv - 3]], 6);
  addGround(st, [[3, 3], [A - 3, 3], [A - 3, B - 3], [3, B - 3]], COBBLE, 0.8);
  addGround(st, [[keep[0] - 3, keep[1] - 3], [keep[2] + 3, keep[1] - 3], [keep[2] + 3, keep[3] + 3], [keep[0] - 3, keep[3] + 3]], '#a8926b', 0.8);
  addDistrict(st, { poly: insetPoly(pts, 6), avoid: [[0, gv - 3.3, 52, gv + 3.3], [keep[0] - 4, keep[1] - 4, keep[2] + 4, keep[3] + 4]], roofs: [ROOF.red, ROOF.red, ROOF.brown, ROOF.slate, ROOF.thatch], height: 1.15 });
  addBox(st, { u: keep[0], v: keep[1], a: 18, b: 18, h: 30, stone: STONE.warm, roof: { kind: 'hip', color: BLUE, h: 14 }, windows: { rows: 3, scale: 0.9 }, turrets: { r: 3, h: 8, roof: RED, inset: 1.8 }, flag: FLAG });
  addWell(st, 38, gv + 7);
  addTownWall(st, pts, { stone: STONE.gray, h: WH + 1, t: 3.6, gate: { edge: 3, face: 'u', at, w: 9, flag: FLAG }, tower: { r: 5, h: 15, roofs: [RED, BLUE, RED, TEAL], flag: FLAG, mid: { every: 34, r: 3.4, h: 12, top: 'crenel' } } });
  addTree(st, -9, 6, { w: 15, h: 20 });
  addBush(st, 14, -10, 4.2);
  addTree(st, A + 9, 14, { w: 15, h: 20, leaf: '#5f7f33' });
  addRocks(st, A + 8, 38, 3, 5);
  addTufts(st, -12, B - 6, 3, 8);
};

/** Round town: a rotunda church in the middle, a diagonal main street. */
const round: Builder = (st) => {
  const R = 38;
  const C = 40;
  const pts = ringPoints(C, C, R, 10, 0.45);
  // The edge closest to the viewer carries the gate.
  let gate = 0;
  const score = (i: number): number => {
    const p = pts[i]!;
    const q = pts[(i + 1) % pts.length]!;
    return p[0] + p[1] + q[0] + q[1];
  };
  pts.forEach((_, i) => {
    if (score(i) < score(gate)) gate = i;
  });
  const gp = pts[gate]!;
  const gq = pts[(gate + 1) % pts.length]!;
  const gx = (gp[0] + gq[0]) / 2;
  const gy = (gp[1] + gq[1]) / 2;
  const avoid: Rect[] = [[C - 13, C - 13, C + 13, C + 13]];
  for (let k = 0; k <= 5; k++) {
    const x = gx + ((C - gx) * k) / 5;
    const y = gy + ((C - gy) * k) / 5;
    avoid.push([x - 3.4, y - 3.4, x + 3.4, y + 3.4]);
  }
  addDirt(st, gx - 8, gy - 8, 10, 10);
  addPath(st, [[gx - 4, gy - 4], [gx - 16, gy - 16]], 6);
  addGround(st, ringPoints(C, C, R - 3, 10, 0.45), COBBLE, 0.8);
  addDistrict(st, { poly: insetPoly(pts, 6), avoid, size: [8, 12], height: 1.15 });
  addTower(st, { u: C, v: C, r: 7, h: 20, stone: STONE.pale, top: 'spire', roof: BLUE, roofH: 22, windows: 2, slits: 0, flag: FLAG, bias: -4.5 });
  addBox(st, { u: C - 15, v: C - 5, a: 9, b: 10, h: 10, stone: STONE.pale, roof: { kind: 'gable', color: RED, h: 8, ridge: 'v', over: 1 }, windows: { rows: 1, scale: 0.8 } });
  addWell(st, C - 7, C - 11);
  addTownWall(st, pts, { stone: STONE.cold, h: WH, t: 3.4, gate: { edge: gate, w: 9, flag: FLAG }, tower: { r: 4.4, h: 13, roofs: [RED, TEAL, BLUE] } });
  addTree(st, -4, 50, { w: 15, h: 20 });
  addBush(st, 3, 6, 4);
  addTree(st, 80, 34, { w: 14, h: 19, leaf: '#5f7f33' });
  addRocks(st, 70, 6, 3, 5);
};

/** Frontier town behind a palisade: thatched houses, a long hall and watch posts. */
const frontier: Builder = (st) => {
  const A = 72;
  const B = 58;
  const cu = 32;
  const wood = '#a07c4e';
  const pts: Vec2[] = [[0, 0], [A, 0], [A, B], [0, B]];
  const hall: Rect = [26, 26, 56, 39];
  addDirt(st, cu, -13, 12, 9);
  addPath(st, [[cu, -5], [cu + 3, -21]], 7);
  addGround(st, [[2, 2], [A - 2, 2], [A - 2, B - 2], [2, B - 2]], '#a8926b', 0.8);
  addDistrict(st, {
    poly: insetPoly(pts, 6),
    avoid: [[cu - 3.6, 0, cu + 3.6, B], hall],
    roofs: [ROOF.thatch, ROOF.thatch, ROOF.brown, ROOF.red],
    walls: [WALL.timber, WALL.plaster, WALL.dark, WALL.timber],
    size: [8, 12],
    height: 1.1,
    hip: 0.55,
  });
  addTimberBox(st, { u: hall[0], v: hall[1], a: 30, b: 13, h: 11, wood: '#b58f5c', planks: 'vertical', roof: { kind: 'gable', color: ROOF.brown, h: 11, ridge: 'u', over: 1.2 }, door: { face: 'v', w: 5, h: 7, at: 0.3 }, windows: 2, glow: '#ffd27a' });
  addWell(st, cu + 9, 14);
  addBarrel(st, cu - 7, 8, 1.8, 3.6);
  addBarrel(st, cu - 9, 9.5, 1.6, 3.2);
  addHaystack(st, 8, 50, 3.6);
  addHaystack(st, 12, 54, 3);
  const log = { h: 12, color: wood };
  addPalisade(st, [0, 0], [A, 0], { ...log, gap: [cu - 5.5, cu + 5.5] });
  addPalisade(st, [A, 0], [A, B], log);
  addPalisade(st, [A, B], [0, B], log);
  addPalisade(st, [0, B], [0, 0], log);
  const post = { wood, roof: { kind: 'pyramid' as const, color: ROOF.brown, h: 9 }, planks: 'vertical' as const, windows: 1 };
  addTimberBox(st, { ...post, u: cu - 11.5, v: -3, a: 6, b: 6, h: 21, bias: -3 });
  addTimberBox(st, { ...post, u: cu + 5.5, v: -3, a: 6, b: 6, h: 21, bias: -3, flag: FLAG });
  addTimberBox(st, { ...post, u: -3, v: -3, a: 7, b: 7, h: 18, bias: -3 });
  addTimberBox(st, { ...post, u: A - 4, v: -3, a: 7, b: 7, h: 18, bias: -3 });
  addTimberBox(st, { ...post, u: A - 4, v: B - 4, a: 7, b: 7, h: 18 });
  addTimberBox(st, { ...post, u: -3, v: B - 4, a: 7, b: 7, h: 18 });
  addField(st, A + 4, 8, 14, 24, CROP, 'v');
  addField(st, A + 4, 35, 14, 14, CROP2, 'v');
  addTree(st, -9, 24, { w: 15, h: 20, kind: 'pine' });
  addTree(st, -8, 44, { w: 14, h: 19 });
  addBush(st, cu + 13, -12, 4);
  addRocks(st, cu - 15, -11, 3, 4);
};

const BUILDERS: Builder[] = [marketstead, octagon, keepTown, round, frontier];
const BASE = [0.9, 0.9, 0.9, 0.9, 0.9];
const SHIFT = [6, 0, -6, 0, -3];

export default defineSymbol({
  id: 'settlement.walled-town',
  name: 'Walled Town',
  category: 'settlements',
  size: [168, 126],
  anchor: [0.5, 0.88],
  order: 34,
  tags: ['settlement', 'town', 'walled', 'wall', 'fortified'],
  placement: 'land',
  variants: 5,
  draw(d) {
    const { ctx, w, h, rand, variant } = d;
    const i = variant % BUILDERS.length;
    const stage = createStage(ctx, rand, w / 2 + SHIFT[i]!, h * BASE[i]!);
    BUILDERS[i]!(stage);
    stage.scene.render(ctx);
  },
});
