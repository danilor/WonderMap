import { defineSymbol } from '../../kit/define';
import type { Vec2 } from '../../kit/types';
import { ROOF, WALL } from '../../parts/building';
import { addBox, addGround, addRing, addTower, addWall } from '../../parts/settle-castle';
import { STONE, createStage } from '../../parts/settle-geom';
import type { Stage } from '../../parts/settle-geom';
import { addBush, addDirt, addPath, addRocks, addStall, addTree, addTufts, addWell } from '../../parts/settle-props';
import { addChurch, addDistrict, addField, addHouse, addMinster, addTownWall, insetPoly, raised } from '../../parts/settle-town';
import type { Rect } from '../../parts/settle-town';

type Builder = (st: Stage) => void;

const RED = '#b2503a';
const BLUE = '#4d6fa0';
const TEAL = '#4f7f86';
const SLATE = '#56637a';
const FLAG = '#c0392b';
const COBBLE = '#b59d73';
const YARD = '#a8926b';
const CROP = '#c9b25e';

/** Rectangular imperial city: wide avenue from the gate to a plaza, a minster in the back corner. */
const imperial: Builder = (st) => {
  const A = 96;
  const B = 78;
  const cu = 28;
  const pts: Vec2[] = [[0, 0], [A, 0], [A, B], [0, B]];
  const minster: Rect = [52, 50, 89, 72];
  const plaza: Rect = [cu - 3.3, 30, cu + 24, 44];
  addDirt(st, cu, -13, 12, 9);
  addPath(st, [[cu, -5], [cu + 3, -23]], 7);
  addGround(st, [[3, 3], [A - 3, 3], [A - 3, B - 3], [3, B - 3]], COBBLE, 0.8);
  addDistrict(st, { poly: insetPoly(pts, 6), avoid: [[cu - 3.3, 0, cu + 3.3, B], plaza, minster], height: 1.2, tall: 0.28, roofs: [ROOF.red, ROOF.red, ROOF.brown, ROOF.slate, ROOF.teal] });
  addWell(st, cu + 10, 37);
  addStall(st, cu + 3.5, 32, RED);
  addStall(st, cu + 15, 32, BLUE, '#c7522f');
  addMinster(st, minster[0], minster[1], { stone: '#cdbf9f', roof: ROOF.slate, spire: BLUE, flag: FLAG });
  addTownWall(st, pts, { stone: STONE.warm, h: 9, t: 3.8, gate: { edge: 0, face: 'v', at: cu / A, w: 10, flag: FLAG }, tower: { r: 5.4, h: 17, roofs: [RED, TEAL, RED, BLUE], flag: FLAG, mid: { every: 32, r: 3.8, h: 13, top: 'crenel' } } });
  addHouse(st, -17, 22, 9, 8, { roof: ROOF.thatch });
  addTree(st, -12, 46, { w: 16, h: 21 });
  addTree(st, A + 10, 16, { w: 15, h: 20, leaf: '#5f7f33' });
  addField(st, A + 4, 36, 14, 26, CROP, 'v');
  addBush(st, cu + 14, -12, 4);
  addRocks(st, -10, 8, 3, 5);
};

/** Octagonal city around a walled citadel with a tall keep. */
const citadelCity: Builder = (st) => {
  const S = 92;
  const c = 27;
  const m = S / 2;
  const pts: Vec2[] = [[c, 0], [S - c, 0], [S, c], [S, S - c], [S - c, S], [c, S], [0, S - c], [0, c]];
  const y = 15;
  const inner: Vec2[] = [[m - y, m - y], [m + y, m - y], [m + y, m + y], [m - y, m + y]];
  addDirt(st, m, -12, 12, 9);
  addPath(st, [[m, -5], [m - 2, -22]], 7);
  addGround(st, insetPoly(pts, 3), COBBLE, 0.8);
  addGround(st, [[m - y - 2, m - y - 2], [m + y + 2, m - y - 2], [m + y + 2, m + y + 2], [m - y - 2, m + y + 2]], YARD, 0.85);
  addDistrict(st, { poly: insetPoly(pts, 6), avoid: [[m - 3.3, 0, m + 3.3, m - y], [m - y - 3, m - y - 3, m + y + 3, m + y + 3]], height: 1.2, tall: 0.3, roofs: [ROOF.red, ROOF.red, ROOF.brown, ROOF.slate, ROOF.blue] });
  addBox(st, { u: m - 10, v: m - 10, a: 20, b: 20, h: 34, stone: STONE.warm, roof: { kind: 'hip', color: BLUE, h: 16 }, windows: { rows: 3, scale: 0.9 }, turrets: { r: 3.2, h: 9, roof: RED, inset: 1.6 }, flag: FLAG });
  addRing(st, inner, { stone: STONE.pale, h: 7, t: 3, gate: { edge: 0, w: 8, at: 0.5 } });
  inner.forEach((p, i) => addTower(st, { u: p[0], v: p[1], r: 3.8, h: 13, stone: STONE.pale, top: 'cone', roof: [RED, TEAL, RED, BLUE][i], roofH: 8.5, slits: 1, flag: i === 2 ? FLAG : undefined }));
  addTownWall(st, pts, { stone: STONE.gray, h: 9, t: 3.8, gate: { edge: 0, face: 'v', w: 10, flag: FLAG }, tower: { r: 5.2, h: 16, roofs: [TEAL, RED, TEAL, BLUE], flag: FLAG, mid: { every: 30, r: 3.6, h: 12, top: 'crenel' } } });
  addTree(st, -9, 46, { w: 16, h: 21 });
  addTree(st, S + 9, 46, { w: 15, h: 20, leaf: '#5f7f33' });
  addBush(st, S + 6, 12, 4.2);
  addRocks(st, -11, 12, 3, 5);
  addTufts(st, m + 14, -13, 3, 8);
};

/** A castle with its own walls dominates the back corner; the town spreads in front of it. */
const castleCity: Builder = (st) => {
  const A = 98;
  const B = 72;
  const cu = 30;
  const pts: Vec2[] = [[0, 0], [A, 0], [A, B], [0, B]];
  const cx = 58;
  const cy = 28;
  const gx = 78;
  const church: Rect = [6, 46, 30, 56];
  addDirt(st, cu, -13, 12, 9);
  addPath(st, [[cu, -5], [cu + 3, -23]], 7);
  addGround(st, [[3, 3], [A - 3, 3], [A - 3, B - 3], [3, B - 3]], COBBLE, 0.8);
  addGround(st, [[cx + 2, cy + 2], [A - 2, cy + 2], [A - 2, B - 2], [cx + 2, B - 2]], YARD, 0.85);
  addDistrict(st, { poly: insetPoly(pts, 6), avoid: [[cu - 3.3, 0, cu + 3.3, B], [gx - 3.4, 0, gx + 3.4, cy + 2], [cx - 2, cy - 2, A, B], church], height: 1.2, tall: 0.25, roofs: [ROOF.red, ROOF.red, ROOF.brown, ROOF.slate, ROOF.thatch] });
  addWell(st, cu + 9, 24);
  addStall(st, cu + 4, 18, RED);
  addChurch(st, church[0], church[1], { spire: BLUE, roof: RED });
  addWall(st, { p: [cx, cy], q: [gx - 7, cy], stone: STONE.gray, h: 11, t: 3.6 });
  addWall(st, { p: [gx + 7, cy], q: [A, cy], stone: STONE.gray, h: 11, t: 3.6, cap: false });
  addWall(st, { p: [cx, cy], q: [cx, B], stone: STONE.gray, h: 11, t: 3.6, cap: false });
  addBox(st, { u: gx - 8, v: cy - 4, a: 16, b: 9, h: 22, stone: STONE.gray, windows: false, slits: 1, roof: { kind: 'hip', color: SLATE, h: 8 }, gate: { face: 'v', w: 7, h: 11 }, flag: FLAG });
  addBox(st, { u: 66, v: 38, a: 20, b: 22, h: 34, stone: STONE.warm, roof: { kind: 'hip', color: BLUE, h: 15 }, windows: { rows: 3, scale: 0.9 }, turrets: { r: 3.3, h: 9, roof: RED, inset: 1.6, flag: FLAG } });
  addTower(st, { u: cx, v: cy, r: 5.2, h: 21, stone: STONE.gray, top: 'cone', roof: RED, roofH: 12, slits: 1 });
  addTower(st, { u: A - 1, v: cy, r: 4.6, h: 19, stone: STONE.gray, top: 'cone', roof: TEAL, roofH: 11, slits: 1 });
  addTower(st, { u: cx, v: B - 1, r: 4.6, h: 19, stone: STONE.gray, top: 'cone', roof: TEAL, roofH: 11, slits: 1 });
  addTownWall(st, pts, { stone: STONE.warm, h: 9, t: 3.8, gate: { edge: 0, face: 'v', at: cu / A, w: 10, flag: FLAG }, tower: { r: 5.2, h: 16, roofs: [RED, BLUE, RED, TEAL], flag: FLAG, mid: { every: 36, r: 3.6, h: 12, top: 'crenel' } } });
  addTree(st, -10, 30, { w: 15, h: 20 });
  addHouse(st, -17, 8, 8, 8);
  addTree(st, A + 10, 10, { w: 15, h: 20, leaf: '#5f7f33' });
  addField(st, A + 4, 28, 14, 30, CROP, 'v');
  addBush(st, cu - 14, -11, 4.2);
};

/** Sun-baked city of domes and minarets inside pale sandstone walls. */
const domed: Builder = (st) => {
  const S = 90;
  const c = 22;
  const m = S / 2;
  const SAND = '#dcc491';
  const pts: Vec2[] = [[c, 0], [S - c, 0], [S, c], [S, S - c], [S - c, S], [c, S], [0, S - c], [0, c]];
  const roofs = [ROOF.red, '#c4703f', '#c4703f', ROOF.brown, ROOF.thatch];
  const walls = [WALL.white, WALL.white, WALL.plaster, '#ecd9b0'];
  const hall = 13;
  addDirt(st, m, -12, 12, 9);
  addPath(st, [[m, -5], [m + 2, -22]], 7);
  addGround(st, insetPoly(pts, 3), '#c9b27d', 0.85);
  addDistrict(st, { poly: insetPoly(pts, 6), avoid: [[m - 3.3, 0, m + 3.3, m - hall - 6], [m - hall - 7, m - hall - 7, m + hall + 7, m + hall + 7]], height: 1.1, tall: 0.22, roofs, walls, size: [8, 11] });
  addGround(st, [[m - hall - 5, m - hall - 5], [m + hall + 5, m - hall - 5], [m + hall + 5, m + hall + 5], [m - hall - 5, m + hall + 5]], '#d9c7a0', 0.9);
  addBox(st, { u: m - hall, v: m - hall, a: hall * 2, b: hall * 2, h: 13, stone: WALL.white, plain: true, windows: { rows: 1, scale: 0.8 }, gate: { face: 'v', w: 6, h: 8 } });
  addTower(raised(st, 13), { u: m, v: m, r: 10, h: 5, stone: WALL.white, top: 'dome', roof: TEAL, roofH: 24, noShadow: true, bias: -2 });
  for (const [du, dv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    addTower(st, { u: m + du * (hall + 3.5), v: m + dv * (hall + 3.5), r: 2.4, h: du + dv < 0 ? 30 : 36, stone: WALL.white, top: 'spire', roof: '#d1a43c', roofH: 12, slits: 0, windows: 1 });
  }
  addWell(st, m + 22, 22);
  addStall(st, m - 22, 22, RED);
  addTownWall(st, pts, { stone: SAND, h: 9, t: 3.8, gate: { edge: 0, face: 'v', w: 10, roof: BLUE, flag: FLAG }, tower: { r: 4.8, h: 15, roofs: [TEAL, BLUE, TEAL, BLUE], top: 'dome', flag: FLAG, mid: { every: 30, r: 3.4, h: 12, top: 'dome' } } });
  addTree(st, -10, 44, { w: 15, h: 20, leaf: '#8a9a3c' });
  addTree(st, S + 9, 14, { w: 15, h: 20, leaf: '#8a9a3c' });
  addBush(st, S + 7, 44, 4.2, '#9aa243');
  addRocks(st, -11, 10, 3, 5);
};

/** Dark gothic city: steep slate roofs, a huge cathedral and spiked towers. */
const gothic: Builder = (st) => {
  const A = 92;
  const B = 78;
  const k = 7;
  const pts: Vec2[] = [[k, 0], [A - k, 0], [A, B / 2], [A - k, B], [k, B], [0, B / 2]];
  const cu = 38;
  const cathedral: Rect = [47, 47, 84, 69];
  addDirt(st, cu, -12, 12, 9);
  addPath(st, [[cu, -5], [cu + 2, -22]], 7);
  addGround(st, insetPoly(pts, 3), '#a99f82', 0.85);
  addDistrict(st, { poly: insetPoly(pts, 6), avoid: [[cu - 3.3, 0, cu + 3.3, B], [cu - 3.3, 28, cu + 22, 40], cathedral], height: 1.45, tall: 0.5, size: [7, 10], roofs: [SLATE, SLATE, ROOF.slate, ROOF.brown, ROOF.blue], walls: [WALL.plaster, WALL.stone, WALL.dark, WALL.timber], hip: 0.1 });
  addWell(st, cu + 10, 33);
  addMinster(st, cathedral[0], cathedral[1], { stone: '#b9b5aa', roof: '#4b5568', spire: '#3f4a5e', flag: FLAG, scale: 1 });
  addTownWall(st, pts, { stone: STONE.cold, h: 9, t: 3.8, gate: { edge: 0, face: 'v', at: 0.4, w: 10, roof: '#3f4a5e', flag: FLAG }, tower: { r: 4.8, h: 20, top: 'spire', roofH: 15, roofs: ['#3f4a5e', '#56637a', '#3f4a5e'], flag: FLAG, mid: { every: 36, r: 3.6, h: 14, top: 'crenel' } } });
  addTree(st, -11, 14, { w: 14, h: 19, kind: 'dead' });
  addTree(st, A + 9, 60, { w: 14, h: 19, kind: 'dead' });
  addTree(st, A + 6, 12, { w: 15, h: 20, kind: 'pine' });
  addRocks(st, -9, 58, 3, 5);
  addTufts(st, cu + 12, -12, 3, 8);
};

const BUILDERS: Builder[] = [imperial, citadelCity, castleCity, domed, gothic];
const BASE = [0.9, 0.97, 0.94, 0.97, 0.9];
const SHIFT = [-8, 0, -11, 0, -4];

export default defineSymbol({
  id: 'settlement.city',
  name: 'City',
  category: 'settlements',
  size: [196, 150],
  anchor: [0.5, 0.88],
  order: 50,
  tags: ['settlement', 'city', 'walled', 'wall', 'capital', 'metropolis'],
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
