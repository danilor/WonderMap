import { defineSymbol } from '../../kit/define';
import type { Vec2 } from '../../kit/types';
import { ROOF, WALL } from '../../parts/building';
import { addCampfire, addPavilion, addTent } from '../../parts/settle-camp';
import { addBox, addCrag, addGround, addTower, ringPoints } from '../../parts/settle-castle';
import { STONE, createStage } from '../../parts/settle-geom';
import type { Stage } from '../../parts/settle-geom';
import { addBanner, addBarrel, addBush, addCrate, addDirt, addFence, addHaystack, addPalisade, addPath, addRocks, addTree, addTufts, addWell } from '../../parts/settle-props';
import { addTownWall, insetPoly, raised } from '../../parts/settle-town';
import { addTimberBox } from '../../parts/settle-wood';

type Builder = (st: Stage) => void;

const RED = '#b2503a';
const BLUE = '#4d6fa0';
const TEAL = '#4f7f86';
const FLAG = '#c0392b';
const YARD = '#a8926b';
const MUD = '#9c8660';
const LOG = '#a07c4e';

/** Log palisade with a timber gatehouse and watch towers on the corners. */
const palisade: Builder = (st) => {
  const A = 54;
  const B = 46;
  const cu = 22;
  const log = { h: 11, color: LOG };
  addDirt(st, cu, -10, 9, 7);
  addPath(st, [[cu, -4], [cu + 2, -18]], 6);
  addGround(st, [[1, 1], [A - 1, 1], [A - 1, B - 1], [1, B - 1]], MUD, 0.85);
  addPalisade(st, [0, 0], [A, 0], { ...log, gap: [cu - 5, cu + 5] });
  addPalisade(st, [A, 0], [A, B], log);
  addPalisade(st, [A, B], [0, B], log);
  addPalisade(st, [0, B], [0, 0], log);
  const post = { wood: LOG, planks: 'vertical' as const, windows: 1 };
  const roof = { kind: 'pyramid' as const, color: ROOF.brown, h: 9 };
  addTimberBox(st, { ...post, roof, u: cu - 11.5, v: -3, a: 6.5, b: 6.5, h: 21, bias: -3 });
  addTimberBox(st, { ...post, roof, u: cu + 5, v: -3, a: 6.5, b: 6.5, h: 21, bias: -3, flag: FLAG });
  addTimberBox(st, { ...post, roof, u: -3, v: -3, a: 7, b: 7, h: 17, bias: -3 });
  addTimberBox(st, { ...post, roof, u: A - 4, v: -3, a: 7, b: 7, h: 17, bias: -3 });
  addTimberBox(st, { ...post, roof, u: A - 4, v: B - 4, a: 7, b: 7, h: 17 });
  addTimberBox(st, { ...post, roof, u: -3, v: B - 4, a: 7, b: 7, h: 17 });
  addTimberBox(st, { u: 22, v: 30, a: 24, b: 11, h: 9, wood: '#b58f5c', planks: 'vertical', roof: { kind: 'gable', color: ROOF.thatch, h: 9, ridge: 'u', over: 1.2 }, door: { face: 'v', w: 5, h: 6.5, at: 0.35 }, windows: 2, glow: '#ffd27a' });
  addTent(st, 40, 12, { a: 10, b: 8, color: '#d8c9a4', trim: RED, ridge: 'u' });
  addTent(st, 43, 25, { a: 9, b: 8, color: '#c9d2b8', trim: BLUE, ridge: 'v' });
  addTent(st, 8, 30, { a: 9, b: 8, color: '#d8c9a4', trim: TEAL, ridge: 'v' });
  addCampfire(st, 30, 20, 0.85);
  addBanner(st, 18, 24, 15, FLAG);
  addBarrel(st, 12, 14, 1.8, 3.6);
  addBarrel(st, 14.5, 16, 1.6, 3.2);
  addHaystack(st, 8, 20, 3.4);
  addTree(st, -9, 14, { w: 15, h: 20, kind: 'pine' });
  addTree(st, A + 8, 30, { w: 14, h: 19, kind: 'pine' });
  addBush(st, cu + 12, -10, 4);
  addRocks(st, A + 6, 6, 3, 4);
};

/** A square stone fort: four round towers, a gatehouse and a squat keep. */
const stone: Builder = (st) => {
  const A = 52;
  const B = 52;
  const pts: Vec2[] = [[0, 0], [A, 0], [A, B], [0, B]];
  const cu = 20;
  addDirt(st, cu, -10, 9, 7);
  addPath(st, [[cu, -4], [cu + 2, -18]], 6);
  addGround(st, [[2, 2], [A - 2, 2], [A - 2, B - 2], [2, B - 2]], YARD, 0.9);
  addBox(st, { u: 28, v: 26, a: 17, b: 17, h: 28, stone: STONE.warm, roof: { kind: 'hip', color: BLUE, h: 12 }, windows: { rows: 3, scale: 0.9 }, turrets: { r: 3, h: 7, roof: RED, inset: 1.6 }, flag: FLAG });
  addBox(st, { u: 6, v: 24, a: 11, b: 20, h: 10, stone: STONE.pale, plain: true, roof: { kind: 'gable', color: ROOF.brown, h: 8, ridge: 'v', over: 1 }, windows: { rows: 1, scale: 0.8 } });
  addBox(st, { u: 8, v: 8, a: 12, b: 8, h: 8, stone: STONE.pale, plain: true, roof: { kind: 'gable', color: ROOF.red, h: 7, ridge: 'u', over: 1 }, windows: false });
  addWell(st, 22, 20);
  addBarrel(st, 38, 8, 1.8, 3.6);
  addCrate(st, 41, 9, 3.4, 3, 3);
  addTownWall(st, pts, { stone: STONE.gray, h: 10, t: 3.6, gate: { edge: 0, face: 'v', at: cu / A, w: 8, flag: FLAG }, tower: { r: 5, h: 19, roofs: [RED, BLUE, TEAL, RED], flag: FLAG } });
  addTree(st, -9, 30, { w: 15, h: 20 });
  addTree(st, A + 9, 14, { w: 14, h: 19, leaf: '#5f7f33' });
  addBush(st, cu + 12, -10, 4);
  addRocks(st, A + 6, 42, 3, 4);
  addTufts(st, -10, 8, 3, 6);
};

/** A five-pointed bastion fort of cold grey stone around a tall central tower. */
const bastion: Builder = (st) => {
  const C = 36;
  const pts = ringPoints(C, C, 32, 5, Math.PI / 4);
  const g0 = pts[2]!;
  const g1 = pts[3]!;
  const gx = (g0[0] + g1[0]) / 2;
  const gy = (g0[1] + g1[1]) / 2;
  addDirt(st, gx - 6, gy - 6, 9, 9);
  addPath(st, [[gx - 3, gy - 3], [gx - 14, gy - 14]], 6);
  addGround(st, insetPoly(pts, 3), YARD, 0.9);
  addTower(st, { u: C, v: C, r: 8.5, h: 26, stone: STONE.cold, top: 'cone', roof: BLUE, roofH: 17, windows: 2, slits: 1, flag: FLAG, bias: -4 });
  addBox(st, { u: C - 22, v: C - 6, a: 11, b: 12, h: 9, stone: STONE.pale, plain: true, roof: { kind: 'gable', color: ROOF.slate, h: 7, ridge: 'v', over: 1 }, windows: { rows: 1, scale: 0.8 } });
  addBox(st, { u: C + 8, v: C - 20, a: 13, b: 10, h: 9, stone: STONE.pale, plain: true, roof: { kind: 'gable', color: ROOF.slate, h: 7, ridge: 'u', over: 1 }, windows: { rows: 1, scale: 0.8 } });
  addWell(st, C - 14, C - 14);
  addTownWall(st, pts, { stone: STONE.cold, h: 10, t: 4, gate: { edge: 2, w: 8, flag: FLAG }, tower: { r: 5.2, h: 15, top: 'crenel', roofs: [BLUE], flag: FLAG } });
  addTree(st, -2, 40, { w: 15, h: 20, kind: 'pine' });
  addTree(st, 76, 26, { w: 14, h: 19, kind: 'pine' });
  addRocks(st, 70, 62, 3, 4);
  addBush(st, 6, 12, 4);
};

/** An iron-age hill fort: earth bank, log palisade, round thatched huts and a longhouse. */
const hillFort: Builder = (st) => {
  const E = 8;
  const C = 38;
  const jit = (): number => st.rand.range(-1.6, 1.6);
  const poly = ringPoints(C, C, 33, 9, 0.35).map((p): Vec2 => [p[0] + jit(), p[1] + jit()]);
  addCrag(st, { poly, elev: E, color: '#9a8a6a', top: '#86a257' });
  const hi = raised(st, E);
  const ring = insetPoly(poly, 3.5);
  let gate = 0;
  const near = (i: number): number => ring[i]![0] + ring[i]![1] + ring[(i + 1) % ring.length]![0] + ring[(i + 1) % ring.length]![1];
  ring.forEach((_, i) => {
    if (near(i) < near(gate)) gate = i;
  });
  const gp = ring[gate]!;
  const gq = ring[(gate + 1) % ring.length]!;
  const gl = Math.hypot(gq[0] - gp[0], gq[1] - gp[1]);
  addGround(hi, insetPoly(poly, 1), '#8f8a58', 0.5);
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % ring.length]!;
    addPalisade(hi, p, q, { h: 10, color: LOG, gap: i === gate ? [gl / 2 - 4.5, gl / 2 + 4.5] : undefined });
  });
  addPath(st, [[(gp[0] + gq[0]) / 2 - 3, (gp[1] + gq[1]) / 2 - 3], [(gp[0] + gq[0]) / 2 - 17, (gp[1] + gq[1]) / 2 - 17]], 6);
  const hut = (u: number, v: number, r = 4.6): void => addTower(hi, { u, v, r, h: 5, stone: '#cbb98f', top: 'cone', roof: ROOF.thatch, roofH: 9.5, slits: 0, windows: 0 });
  hut(26, 44);
  hut(50, 26);
  hut(30, 28, 5);
  hut(46, 46);
  hut(38, 52, 4.2);
  addTimberBox(hi, { u: 40, v: 32, a: 17, b: 8.5, h: 6, wood: '#b58f5c', planks: 'vertical', roof: { kind: 'gable', color: ROOF.thatch, h: 8, ridge: 'u', over: 1.2 }, door: { face: 'v', w: 3.6, h: 5, at: 0.5 }, windows: 0 });
  addCampfire(hi, 26, 34, 0.7);
  addHaystack(hi, 52, 40, 3.2);
  addFence(hi, [40, 20], [52, 20]);
  addTree(st, -6, 20, { w: 15, h: 20 });
  addTree(st, 76, 34, { w: 14, h: 19, leaf: '#5f7f33' });
  addBush(st, 24, -12, 4);
  addRocks(st, 70, 66, 3, 4);
};

/** A border outpost: low stone wall, a tall watchtower, a barracks, tents and a banner. */
const outpost: Builder = (st) => {
  const A = 52;
  const B = 42;
  const pts: Vec2[] = [[0, 0], [A, 0], [A, B], [0, B]];
  const cu = 20;
  addDirt(st, cu, -10, 9, 7);
  addPath(st, [[cu, -4], [cu + 2, -18]], 6);
  addGround(st, [[2, 2], [A - 2, 2], [A - 2, B - 2], [2, B - 2]], MUD, 0.85);
  addBox(st, { u: A - 19, v: B - 19, a: 14, b: 14, h: 34, stone: STONE.gray, top: 'crenel', windows: { rows: 3, scale: 0.8 }, slits: 1, flag: FLAG, turrets: { r: 2.6, h: 6, roof: RED, inset: 1.2 } });
  addBox(st, { u: 5, v: 20, a: 22, b: 11, h: 8, stone: WALL.plaster, plain: true, roof: { kind: 'gable', color: ROOF.thatch, h: 8, ridge: 'u', over: 1 }, windows: { rows: 1, scale: 0.8 } });
  addTimberBox(st, { u: 6, v: 6, a: 13, b: 8, h: 6, wood: LOG, planks: 'vertical', roof: { kind: 'gable', color: ROOF.brown, h: 6, ridge: 'u', over: 1 }, door: { face: 'v', w: 4, h: 4.6, at: 0.5 }, windows: 0 });
  addPavilion(st, 30, 8, { s: 10, color: '#efe6d2', trim: RED });
  addTent(st, 30, 26, { a: 8, b: 7, color: '#d8c9a4', trim: BLUE, ridge: 'v' });
  addCampfire(st, 12, 36, 0.75);
  addBanner(st, 36, 22, 17, FLAG);
  addHaystack(st, 4, 14, 3);
  addBarrel(st, 24, 6, 1.7, 3.4);
  addTownWall(st, pts, { stone: STONE.gray, h: 7, t: 3.2, gate: { edge: 0, face: 'v', at: cu / A, w: 8, boxH: 17, flag: FLAG }, tower: { r: 4, h: 11, top: 'crenel', roofs: [RED] } });
  addTree(st, -8, 26, { w: 14, h: 19, kind: 'pine' });
  addTree(st, A + 7, 12, { w: 14, h: 19, kind: 'pine' });
  addRocks(st, A + 6, 34, 3, 4);
  addBush(st, cu + 12, -10, 4);
};

const BUILDERS: Builder[] = [palisade, stone, bastion, hillFort, outpost];
const BASE = [0.9, 0.9, 0.94, 0.9, 0.9];
const SHIFT = [0, 0, 0, 0, 4];

export default defineSymbol({
  id: 'settlement.fort',
  name: 'Fort',
  category: 'settlements',
  size: [128, 104],
  anchor: [0.5, 0.88],
  order: 32,
  tags: ['settlement', 'fort', 'fortress', 'military', 'outpost', 'palisade', 'garrison'],
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
