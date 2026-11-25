import { defineSymbol } from '../../kit/define';
import type { Vec2 } from '../../kit/types';
import { ROOF, WALL } from '../../parts/building';
import { addBox, addCrag, addGround, addRing, addTower, addWall, ringPoints } from '../../parts/settle-castle';
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
const CROP2 = '#8fae52';

interface GatedWall {
  stone: string;
  h: number;
  t: number;
  /** Gate width. */
  w: number;
  boxH: number;
  roof?: string;
  flag?: string;
}

/** An inner wall with a gap in it, closed by a gatehouse. */
function gatedWall(st: Stage, p: Vec2, q: Vec2, at: number, o: GatedWall): void {
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
  const d: Vec2 = [(q[0] - p[0]) / L, (q[1] - p[1]) / L];
  const c = L * at;
  const g = o.w / 2 + 2;
  const wall = { stone: o.stone, h: o.h, t: o.t, cap: false };
  addWall(st, { ...wall, p, q: [p[0] + d[0] * (c - g), p[1] + d[1] * (c - g)] });
  addWall(st, { ...wall, p: [p[0] + d[0] * (c + g), p[1] + d[1] * (c + g)], q });
  const cu = p[0] + d[0] * c;
  const cv = p[1] + d[1] * c;
  const face: 'u' | 'v' = Math.abs(d[0]) > Math.abs(d[1]) ? 'v' : 'u';
  const common = { h: o.boxH, stone: o.stone, windows: false as const, slits: 1, roof: o.roof ? { kind: 'hip' as const, color: o.roof, h: 8 } : undefined, flag: o.flag, gate: { face, w: o.w, h: Math.min(o.boxH * 0.6, 12) } };
  if (face === 'v') addBox(st, { ...common, u: cu - g - 1.5, v: cv - 3, a: 2 * g + 3, b: 10 });
  else addBox(st, { ...common, u: cu - 3, v: cv - g - 1.5, a: 10, b: 2 * g + 3 });
}

function cornerTower(st: Stage, u: number, v: number, o: { r: number; h: number; stone: string; roof: string; roofH?: number; flag?: string }): void {
  addTower(st, { u, v, r: o.r, h: o.h, stone: o.stone, top: 'cone', roof: o.roof, roofH: o.roofH ?? o.r * 2.2, slits: 1, flag: o.flag });
}

/** Three nested districts: lower town, upper town behind an inner wall and a palace ward in the far corner. */
const royal: Builder = (st) => {
  const A = 124;
  const B = 104;
  const cu = 34;
  const x0 = 50;
  const y0 = 38;
  const x1 = 90;
  const y1 = 64;
  const pts: Vec2[] = [[0, 0], [A, 0], [A, B], [0, B]];
  const minster: Rect = [52, 68, 87, 89];
  addDirt(st, cu, -13, 12, 9);
  addPath(st, [[cu, -5], [cu + 3, -24]], 7);
  addGround(st, [[3, 3], [A - 3, 3], [A - 3, B - 3], [3, B - 3]], COBBLE, 0.8);
  addGround(st, [[x1 + 2, y1 + 2], [A - 2, y1 + 2], [A - 2, B - 2], [x1 + 2, B - 2]], YARD, 0.85);
  addDistrict(st, { poly: insetPoly(pts, 6), avoid: [[cu - 3.3, 0, cu + 3.3, B], [cu - 3.3, 29, 112, 35.5], [x0 - 3, y0 - 3, A, B]], height: 1.1, tall: 0.15, size: [8, 11], roofs: [ROOF.thatch, ROOF.brown, ROOF.brown, ROOF.red, ROOF.slate], walls: [WALL.plaster, WALL.timber, WALL.dark, WALL.plaster] });
  addDistrict(st, { poly: [[x0 + 5, y0 + 5], [A - 6, y0 + 5], [A - 6, B - 6], [x0 + 5, B - 6]], avoid: [[101.7, y0, 108.3, y1 + 2], [minster[0] - 1, minster[1] - 1, minster[2] + 1, minster[3] + 1], [x1 - 2, y1 - 2, A, B]], height: 1.25, tall: 0.3, roofs: [ROOF.red, ROOF.red, ROOF.blue, ROOF.slate, ROOF.teal], walls: [WALL.plaster, WALL.white, WALL.white, WALL.stone] });
  addWell(st, cu + 10, 20);
  addStall(st, cu + 4, 14, RED);
  addStall(st, cu + 16, 14, BLUE, '#c7522f');
  addMinster(st, minster[0], minster[1], { stone: '#cdbf9f', roof: ROOF.slate, spire: BLUE, flag: FLAG, scale: 0.95 });
  // Palace ward.
  addBox(st, { u: 99, v: 76, a: 22, b: 20, h: 42, stone: STONE.warm, roof: { kind: 'hip', color: BLUE, h: 17 }, windows: { rows: 4, scale: 0.9 }, turrets: { r: 3.4, h: 9, roof: RED, inset: 1.7, flag: FLAG }, flag: FLAG });
  addBox(st, { u: 93, v: 68, a: 8, b: 10, h: 15, stone: STONE.pale, roof: { kind: 'gable', color: RED, h: 8, ridge: 'v' }, windows: { rows: 1, scale: 0.8 } });
  addBox(st, { u: 94, v: 88, a: 12, b: 8, h: 14, stone: STONE.pale, roof: { kind: 'gable', color: RED, h: 8, ridge: 'u' }, windows: { rows: 1, scale: 0.8 } });
  addWell(st, 112, 70);
  addBush(st, 96, 100, 3.4, '#6f9a45');
  gatedWall(st, [x1, y1], [A, y1], 0.55, { stone: STONE.gray, h: 13, t: 3.6, w: 8, boxH: 26, roof: SLATE, flag: FLAG });
  addWall(st, { p: [x1, y1], q: [x1, B], stone: STONE.gray, h: 13, t: 3.6, cap: false });
  gatedWall(st, [x0, y0], [A, y0], 0.72, { stone: STONE.warm, h: 11, t: 3.6, w: 9, boxH: 22, roof: BLUE, flag: FLAG });
  addWall(st, { p: [x0, y0], q: [x0, B], stone: STONE.warm, h: 11, t: 3.6, cap: false });
  cornerTower(st, x0, y0, { r: 5, h: 19, stone: STONE.warm, roof: TEAL });
  cornerTower(st, x0, B, { r: 5, h: 19, stone: STONE.warm, roof: RED });
  cornerTower(st, x1, y1, { r: 5.2, h: 24, stone: STONE.gray, roof: RED, flag: FLAG });
  cornerTower(st, A, y1, { r: 5, h: 22, stone: STONE.gray, roof: TEAL });
  cornerTower(st, x1, B, { r: 5, h: 22, stone: STONE.gray, roof: BLUE });
  addTownWall(st, pts, { stone: STONE.warm, h: 9, t: 3.8, gate: { edge: 0, face: 'v', at: cu / A, w: 11, flag: FLAG }, tower: { r: 5.6, h: 18, roofs: [RED, BLUE, TEAL, RED], flag: FLAG, mid: { every: 34, r: 4, h: 14, top: 'crenel' } } });
  addHouse(st, -18, 20, 9, 8, { roof: ROOF.thatch });
  addHouse(st, -17, 62, 8, 9);
  addTree(st, -12, 40, { w: 16, h: 21 });
  addTree(st, A + 10, 14, { w: 16, h: 21, leaf: '#5f7f33' });
  addField(st, A + 4, 36, 14, 26, CROP, 'v');
  addField(st, A + 4, 66, 14, 22, CROP2, 'v');
  addBush(st, cu + 14, -12, 4);
  addRocks(st, -10, 8, 3, 5);
};

/** A castle on a rocky hill towers over the walled city at its foot. */
const hill: Builder = (st) => {
  const A = 116;
  const B = 60;
  const cu = 40;
  const E = 26;
  const pts: Vec2[] = [[0, 0], [A, 0], [A, B], [0, B]];
  const church: Rect = [8, 38, 32, 48];
  const square: Rect = [cu + 3.3, 22, cu + 32, 36];
  addDirt(st, cu, -13, 12, 9);
  addPath(st, [[cu, -5], [cu - 3, -24]], 7);
  addGround(st, [[3, 3], [A - 3, 3], [A - 3, B - 3], [3, B - 3]], COBBLE, 0.8);
  addCrag(st, { poly: [[6, B + 2], [A - 6, B + 2], [A - 2, B + 22], [A - 16, B + 46], [26, B + 48], [2, B + 24]], elev: E, color: '#8a7f6e', top: '#8aa05a' });
  addDistrict(st, { poly: insetPoly(pts, 6), avoid: [[cu - 3.3, 0, cu + 3.3, B], square, church], height: 1.25, tall: 0.3, roofs: [ROOF.red, ROOF.red, ROOF.brown, ROOF.slate, ROOF.teal] });
  addWell(st, cu + 17, 29);
  addStall(st, cu + 8, 25, RED);
  addStall(st, cu + 8, 31, BLUE, '#c7522f');
  addChurch(st, church[0], church[1], { spire: BLUE, roof: RED });
  const hi = raised(st, E);
  const ring: Vec2[] = [[20, 72], [A - 18, 72], [A - 10, 86], [A - 22, 100], [34, 100], [14, 86]];
  addGround(hi, insetPoly(ring, 1), YARD, 0.9);
  addRing(hi, ring, { stone: STONE.gray, h: 12, t: 3.6, gate: { edge: 0, w: 10, at: 0.42 } });
  addBox(hi, { u: 52, v: 69, a: 14, b: 9, h: 24, stone: STONE.gray, gate: { face: 'v', w: 7, h: 12 }, windows: false, slits: 1, roof: { kind: 'hip', color: SLATE, h: 9 }, flag: FLAG });
  ring.forEach((p, i) => cornerTower(hi, p[0], p[1], { r: 5, h: 22 + (i === 2 ? 4 : 0), stone: STONE.gray, roof: [RED, TEAL, BLUE][i % 3]!, roofH: 12, flag: i === 3 ? FLAG : undefined }));
  addBox(hi, { u: 50, v: 82, a: 24, b: 18, h: 38, stone: STONE.warm, roof: { kind: 'hip', color: BLUE, h: 16 }, windows: { rows: 3, scale: 0.9 }, turrets: { r: 3.2, h: 9, roof: RED, inset: 1.6, flag: FLAG }, flag: FLAG });
  addBox(hi, { u: 80, v: 80, a: 16, b: 10, h: 14, stone: STONE.pale, roof: { kind: 'gable', color: RED, h: 8, ridge: 'u' }, windows: { rows: 1, scale: 0.8 } });
  addBox(hi, { u: 28, v: 80, a: 10, b: 10, h: 16, stone: STONE.pale, roof: { kind: 'pyramid', color: TEAL, h: 11 }, windows: { rows: 1, scale: 0.8 } });
  addTownWall(st, pts, { stone: STONE.warm, h: 9, t: 3.8, gate: { edge: 0, face: 'v', at: cu / A, w: 11, flag: FLAG }, tower: { r: 5.4, h: 17, roofs: [RED, TEAL, BLUE, RED], flag: FLAG, mid: { every: 38, r: 3.8, h: 13, top: 'crenel' } } });
  addTree(st, -11, 26, { w: 16, h: 21 });
  addTree(st, A + 10, 10, { w: 16, h: 21, leaf: '#5f7f33' });
  addField(st, A + 4, 28, 12, 26, CROP, 'v');
  addHouse(st, -17, 8, 8, 8);
  addBush(st, cu - 15, -12, 4.2);
  addRocks(st, A + 8, 60, 3, 5);
};

/** A round city of twelve towers around a great domed cathedral. */
const grand: Builder = (st) => {
  const R = 66;
  const C = 72;
  const pts = ringPoints(C, C, R, 12, 0);
  const gate = 7;
  const g0 = pts[gate]!;
  const g1 = pts[(gate + 1) % 12]!;
  const gx = (g0[0] + g1[0]) / 2;
  const gy = (g0[1] + g1[1]) / 2;
  const avoid: Rect[] = [[C - 27, C - 27, C + 27, C + 27]];
  for (let k = 0; k <= 5; k++) {
    const x = gx + ((C - 27 - gx) * k) / 5;
    avoid.push([x - 3.6, x - 3.6, x + 3.6, x + 3.6]);
  }
  const hall = 15;
  addDirt(st, gx - 8, gy - 8, 11, 11);
  addPath(st, [[gx - 4, gy - 4], [gx - 17, gy - 17]], 7);
  addGround(st, insetPoly(pts, 3), '#c9b27d', 0.85);
  addGround(st, [[C - 24, C - 24], [C + 24, C - 24], [C + 24, C + 24], [C - 24, C + 24]], '#d9c7a0', 0.9);
  addDistrict(st, { poly: insetPoly(pts, 7), avoid, height: 1.2, tall: 0.28, size: [8, 11], roofs: [ROOF.red, '#c4703f', '#c4703f', ROOF.brown, ROOF.teal], walls: [WALL.white, WALL.white, WALL.plaster, '#ecd9b0'] });
  addBox(st, { u: C - hall, v: C - hall, a: hall * 2, b: hall * 2, h: 14, stone: WALL.white, plain: true, windows: { rows: 1, scale: 0.8 }, gate: { face: 'v', w: 6, h: 9 } });
  addTower(raised(st, 14), { u: C, v: C, r: 12, h: 5, stone: WALL.white, top: 'dome', roof: TEAL, roofH: 32, noShadow: true, bias: -2 });
  for (const [du, dv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    addTower(st, { u: C + du * (hall + 4), v: C + dv * (hall + 4), r: 2.8, h: du + dv < 0 ? 34 : 40, stone: WALL.white, top: 'spire', roof: '#d1a43c', roofH: 13, slits: 0, windows: 1 });
  }
  addWell(st, C - 30, C + 6);
  addStall(st, C + 6, C - 30, RED);
  addTownWall(st, pts, { stone: STONE.pale, h: 10, t: 3.8, gate: { edge: gate, w: 11, flag: FLAG }, tower: { r: 5.2, h: 17, roofs: [TEAL, BLUE, RED], flag: FLAG, mid: { every: 40, r: 3.4, h: 12, top: 'crenel' } } });
  addTree(st, 2, 114, { w: 16, h: 21, leaf: '#8a9a3c' });
  addTree(st, 146, 40, { w: 15, h: 20, leaf: '#8a9a3c' });
  addBush(st, 132, 8, 4.4, '#9aa243');
  addRocks(st, 6, 20, 3, 5);
};

/** Two quarters (humble old town, prosperous new town) divided by a wall, with the royal keep at the back. */
const twin: Builder = (st) => {
  const A = 132;
  const B = 82;
  const mid = 64;
  const cuNew = 98;
  const pts: Vec2[] = [[0, 0], [A, 0], [A, B], [0, B]];
  const keep: Rect = [mid - 16, B - 28, mid + 16, B - 5];
  const minster: Rect = [74, 36, 111, 58];
  addDirt(st, cuNew, -13, 12, 9);
  addPath(st, [[cuNew, -5], [cuNew + 3, -24]], 7);
  addDirt(st, -13, 30, 9, 12);
  addPath(st, [[-5, 30], [-24, 27]], 7);
  addGround(st, [[3, 3], [A - 3, 3], [A - 3, B - 3], [3, B - 3]], COBBLE, 0.8);
  addDistrict(st, { poly: [[5, 6], [mid - 5, 6], [mid - 5, B - 5], [5, B - 5]], avoid: [[27, 24.5, mid, 35.5], [keep[0] - 3, keep[1] - 3, mid, B]], size: [7, 10], height: 1.05, tall: 0.1, roofs: [ROOF.thatch, ROOF.thatch, ROOF.brown, ROOF.brown, ROOF.red], walls: [WALL.timber, WALL.plaster, WALL.dark, WALL.timber] });
  addDistrict(st, { poly: [[mid + 5, 6], [A - 6, 6], [A - 6, B - 6], [mid + 5, B - 6]], avoid: [[cuNew - 3.3, 0, cuNew + 3.3, 36], [mid, 26.5, cuNew + 3.3, 33.5], minster, [keep[0] - 3, keep[1] - 3, keep[2] + 3, B]], size: [9, 13], height: 1.25, tall: 0.3, roofs: [ROOF.blue, ROOF.blue, ROOF.red, ROOF.teal, ROOF.slate], walls: [WALL.plaster, WALL.white, WALL.white, WALL.stone] });
  addWell(st, cuNew + 10, 16);
  addStall(st, cuNew + 4, 10, RED);
  addMinster(st, minster[0], minster[1], { stone: '#cdbf9f', roof: ROOF.slate, spire: BLUE, flag: FLAG, scale: 0.95 });
  addBox(st, { u: keep[0], v: keep[1], a: 32, b: 23, h: 40, stone: STONE.warm, roof: { kind: 'hip', color: BLUE, h: 17 }, windows: { rows: 3, scale: 0.9 }, turrets: { r: 3.4, h: 10, roof: RED, inset: 1.7, flag: FLAG }, flag: FLAG, gate: { face: 'v', w: 7, h: 10 } });
  addTower(st, { u: mid - 22, v: B - 12, r: 5, h: 30, stone: STONE.warm, top: 'cone', roof: TEAL, roofH: 14, slits: 1 });
  addTower(st, { u: mid + 22, v: B - 12, r: 5, h: 30, stone: STONE.warm, top: 'cone', roof: TEAL, roofH: 14, slits: 1, flag: FLAG });
  gatedWall(st, [mid, 0], [mid, keep[1] - 3], 0.46, { stone: STONE.gray, h: 11, t: 3.6, w: 9, boxH: 21, roof: SLATE, flag: FLAG });
  addTownWall(st, pts, { stone: STONE.warm, h: 9, t: 3.8, skip: [3], gate: { edge: 0, face: 'v', at: cuNew / A, w: 11, flag: FLAG }, tower: { r: 5.4, h: 17, roofs: [RED, BLUE, TEAL, RED], flag: FLAG, mid: { every: 34, r: 3.8, h: 13, top: 'crenel' } } });
  gatedWall(st, [0, B], [0, 0], 0.64, { stone: STONE.warm, h: 9, t: 3.8, w: 10, boxH: 20, roof: RED });
  addTree(st, -12, 54, { w: 16, h: 21 });
  addHouse(st, -19, 70, 8, 8, { roof: ROOF.thatch });
  addTree(st, A + 10, 22, { w: 16, h: 21, leaf: '#5f7f33' });
  addField(st, A + 4, 40, 14, 28, CROP, 'v');
  addBush(st, cuNew + 14, -12, 4);
  addTufts(st, 18, -12, 3, 8);
};

const BUILDERS: Builder[] = [royal, hill, grand, twin];
const BASE = [0.94, 0.95, 0.95, 0.93];
const SHIFT = [-9, -3, 0, -22];

export default defineSymbol({
  id: 'settlement.city.large',
  name: 'Capital',
  category: 'settlements',
  size: [248, 190],
  anchor: [0.5, 0.88],
  order: 60,
  tags: ['settlement', 'city', 'capital', 'metropolis', 'walled', 'palace', 'castle', 'large'],
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
