import { defineSymbol } from '../../kit/define';
import { addBox, addCrag, addGround, addRing, addTower } from '../../parts/settle-castle';
import { STONE, WOOD, createStage, makeIso, smoke } from '../../parts/settle-geom';
import type { Stage } from '../../parts/settle-geom';
import { addBarrel, addBush, addDirt, addMound, addPalisade, addPath, addRocks, addTree, addTufts } from '../../parts/settle-props';
import { addTimberBox } from '../../parts/settle-wood';

interface Place {
  ox: number;
  oy: number;
}
type Builder = (st: Stage, at: Place) => void;

const RED = '#b2503a';
const TEAL = '#4f7f86';
const SLATE = '#56637a';
const COURT = '#a8926b';
const FLAG = '#c0392b';
const LIGHT = '#ffd27a';

/** A tall round tower inside a small square ward with a gatehouse. */
const roundKeep: Builder = (st) => {
  const A = 42;
  const stone = STONE.gray;
  addDirt(st, A / 2, -11, 10, 7);
  addPath(st, [[A / 2, -5], [A / 2 + 3, -18]], 6);
  addGround(st, [[2, 2], [A - 2, 2], [A - 2, A - 2], [2, A - 2]], COURT, 0.75);
  addRing(st, [[0, 0], [A, 0], [A, A], [0, A]], { stone, h: 11, gate: { edge: 0, w: 13 } });
  addBox(st, { u: A / 2 - 7, v: -3, a: 14, b: 9, h: 17, stone, gate: { face: 'v', w: 7, h: 11 }, windows: false, slits: 1 });
  addTower(st, { u: 0, v: 0, r: 5, h: 16, stone, top: 'cone', roof: RED, roofH: 11, slits: 1 });
  addTower(st, { u: A, v: 0, r: 5, h: 15, stone, top: 'cone', roof: RED, roofH: 11, slits: 1 });
  addTower(st, { u: 0, v: A, r: 5, h: 15, stone, top: 'cone', roof: RED, roofH: 11 });
  addTower(st, { u: A, v: A, r: 5, h: 16, stone, top: 'cone', roof: RED, roofH: 11 });
  addTower(st, { u: A / 2 + 2, v: A / 2 + 5, r: 11, h: 40, stone, top: 'cone', roof: TEAL, roofH: 30, slits: 3, windows: 2, glow: LIGHT, flag: FLAG });
  addTree(st, -11, 26, { w: 15, h: 20 });
  addBush(st, A + 9, 12, 4);
  addRocks(st, A + 10, 34, 3, 4);
  addTufts(st, A / 2 + 12, -14, 3, 8);
};

/** A square tower house with corner turrets and a gabled hall leaning against it. */
const towerHouse: Builder = (st) => {
  const stone = STONE.warm;
  addDirt(st, 22, -19, 12, 7);
  addPath(st, [[20, -12], [22, -26]], 6);
  addBox(st, { u: 2, v: 2, a: 24, b: 24, h: 50, stone, windows: { rows: 3, scale: 0.9, glow: LIGHT }, turrets: { r: 3.8, h: 11, top: 'cone', roof: SLATE, inset: 1.8 }, flag: FLAG });
  addBox(st, { u: 14, v: -13, a: 30, b: 15, h: 19, stone, roof: { kind: 'gable', color: RED, h: 12, ridge: 'u' }, windows: { rows: 1, glow: LIGHT }, gate: { face: 'u', w: 6.4, h: 9.5 } });
  addTree(st, -10, 14, { w: 17, h: 22 });
  addBush(st, 52, -6, 4);
  addRocks(st, 8, -12, 3, 4);
  addTufts(st, 36, 24, 3, 8);
};

/** A tall shaft with a wider battlemented head and a stair turret, standing on a rocky outcrop. */
const corbel: Builder = (st, { ox, oy }) => {
  const E = 10;
  const stone = STONE.cold;
  addCrag(st, { poly: [[2, -2], [32, -4], [40, 12], [34, 34], [16, 42], [-2, 30]], elev: E, color: '#8d8a84', top: '#8aa152' });
  const hi: Stage = { ...st, iso: makeIso(ox, oy - E) };
  const C = 19;
  addTower(hi, { u: C + 11, v: C - 9, r: 3.6, h: 38, stone, top: 'cone', roof: RED, roofH: 11, slits: 2, bias: -1 });
  addTower(hi, { u: C, v: C, r: 8.6, h: 30, stone, top: 'flat', slits: 3, windows: 1, glow: LIGHT });
  const top: Stage = { ...st, iso: makeIso(ox, oy - E - 30) };
  addTower(top, { u: C, v: C, r: 10.4, h: 13, stone, top: 'cone', roof: TEAL, roofH: 22, crown: true, windows: 2, glow: LIGHT, flag: FLAG });
  addTree(st, -12, 22, { w: 14, h: 19 });
  addRocks(st, 40, 40, 3, 5);
  addBush(st, 6, 48, 3.8);
};

/** A timber tower with a hoarding on a grassy motte, ringed by a palisade. */
const motte: Builder = (st, { ox, oy }) => {
  const H = 13;
  const C = 22;
  addMound(st, C, C, 36, 27, H, '#7f9a4c');
  const hi: Stage = { ...st, iso: makeIso(ox, oy - H) };
  const L = C - 18;
  const R = C + 18;
  const wood = '#a07c4e';
  addPalisade(hi, [L, L], [R, L], { h: 8, color: wood, gap: [12, 24] });
  addPalisade(hi, [R, L], [R, R], { h: 8, color: wood });
  addPalisade(hi, [L, L], [L, R], { h: 8, color: wood });
  addPalisade(hi, [L, R], [R, R], { h: 8, color: wood });
  addTimberBox(hi, { u: C - 7, v: C - 7, a: 14, b: 14, h: 22, wood: WOOD.base, door: { face: 'v', w: 4.6, h: 8 }, windows: 1 });
  const gal: Stage = { ...st, iso: makeIso(ox, oy - H - 22) };
  addTimberBox(gal, { u: C - 9.5, v: C - 9.5, a: 19, b: 19, h: 8, wood: WOOD.dark, windows: 2, roof: { kind: 'pyramid', color: '#7c5a3c', h: 15, over: 1.2 }, flag: FLAG });
  addBarrel(hi, C + 8, L + 3, 1.9, 3.8);
  addTree(st, C - 36, C + 6, { w: 17, h: 22 });
  addBush(st, C + 36, C - 4, 3.8);
  addRocks(st, C + 6, C - 36, 3, 4);
};

/** A slim square tower on a rocky stack with a blazing signal fire. */
const beacon: Builder = (st, { ox, oy }) => {
  const E = 9;
  const stone = STONE.slate;
  addCrag(st, { poly: [[-2, -2], [28, -4], [34, 14], [28, 30], [10, 34], [-6, 20]], elev: E, color: '#8d8a84', top: '#8aa152' });
  const hi: Stage = { ...st, iso: makeIso(ox, oy - E) };
  addBox(hi, { u: 6, v: 6, a: 16, b: 16, h: 46, stone, windows: { rows: 3, scale: 0.8, glow: LIGHT }, slits: 1, gate: { face: 'v', w: 6, h: 9 } });
  const top: Stage = { ...st, iso: makeIso(ox, oy - E - 46) };
  top.scene.add(6 + 6 + 16 + 0.5, () => {
    const { ctx, rand } = top;
    const [x, y] = top.iso(14, 14);
    ctx.save();
    // Iron basket.
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 7);
    ctx.lineTo(x + 6, y - 7);
    ctx.lineTo(x + 3.4, y - 1.5);
    ctx.lineTo(x - 3.4, y - 1.5);
    ctx.closePath();
    ctx.fillStyle = '#3b352f';
    ctx.fill();
    ctx.strokeStyle = '#2a2015';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Flames.
    const flame = (fx: number, fy: number, w: number, hh: number, color: string) => {
      ctx.beginPath();
      ctx.moveTo(fx - w, fy);
      ctx.bezierCurveTo(fx - w * 1.2, fy - hh * 0.5, fx - w * 0.2, fy - hh * 0.7, fx, fy - hh);
      ctx.bezierCurveTo(fx + w * 0.3, fy - hh * 0.65, fx + w * 1.2, fy - hh * 0.45, fx + w, fy);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#2a2015';
    flame(x, y - 6.5, 5.4, 15, '#e0642c');
    ctx.stroke();
    flame(x + 0.6, y - 6.5, 3.6, 10.5, '#f6a63a');
    flame(x + 0.2, y - 6.5, 1.9, 6, '#ffe28a');
    ctx.restore();
    smoke(ctx, x + 4, y - 24, 3, 4.2, rand);
  });
  addBarrel(hi, 26, 8, 2, 4);
  addBarrel(hi, 25, 13, 2, 4);
  addRocks(st, 36, 30, 3, 4);
  addTree(st, -12, 22, { kind: 'pine', w: 15, h: 24 });
  addTufts(st, 14, -10, 3, 7);
};

const BUILDERS: Builder[] = [roundKeep, towerHouse, corbel, motte, beacon];
const SHIFT: number[] = [0, -12, 0, 0, 0];
const BASE: number[] = [0.9, 0.9, 0.92, 0.92, 0.92];

export default defineSymbol({
  id: 'castle.tower',
  name: 'Fortified Tower',
  category: 'settlements',
  size: [112, 128],
  anchor: [0.5, 0.9],
  order: 44,
  tags: ['castle', 'tower', 'keep', 'outpost', 'watch', 'beacon', 'motte'],
  placement: 'land',
  variants: 5,
  draw(d) {
    const { ctx, w, h, rand, variant } = d;
    const i = variant % BUILDERS.length;
    const ox = w / 2 + SHIFT[i]!;
    const oy = h * BASE[i]!;
    const stage = createStage(ctx, rand, ox, oy);
    BUILDERS[i]!(stage, { ox, oy });
    stage.scene.render(ctx);
  },
});
