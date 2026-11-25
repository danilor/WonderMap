import { defineSymbol } from '../../kit/define';
import type { Vec2 } from '../../kit/types';
import { addBox, addCrag, addGround, addRing, addTower } from '../../parts/settle-castle';
import { STONE, createStage, makeIso } from '../../parts/settle-geom';
import type { Stage } from '../../parts/settle-geom';
import { addBush, addDirt, addPath, addRocks, addTree, addTufts } from '../../parts/settle-props';

interface Place {
  ox: number;
  oy: number;
}
type Builder = (st: Stage, at: Place) => void;

const SLATE = '#56637a';
const TEAL = '#4f7f86';
const RED = '#b2503a';
const COURT = '#a8926b';
const FLAG = '#c0392b';

/** Two concentric rings: a low outer wall with a barbican, a tall inner ward and a battlemented keep. */
const concentric: Builder = (st) => {
  const A = 70;
  const O = 17;
  const I = 36;
  const outer = STONE.cold;
  const inner = STONE.gray;
  addDirt(st, A / 2, -13, 11, 9);
  addPath(st, [[A / 2, -6], [A / 2 - 3, -20]], 7);
  addGround(st, [[3, 3], [A - 3, 3], [A - 3, A - 3], [3, A - 3]], COURT, 0.75);
  addRing(st, [[0, 0], [A, 0], [A, A], [0, A]], { stone: outer, h: 12, gate: { edge: 0, w: 16 } });
  addBox(st, { u: A / 2 - 8, v: -4, a: 16, b: 12, h: 22, stone: outer, gate: { face: 'v', w: 8, h: 13 }, windows: false, slits: 1 });
  const corners: Vec2[] = [[0, 0], [A, 0], [A, A], [0, A]];
  corners.forEach(([u, v], i) => addTower(st, { u: u!, v: v!, r: 7.8, h: 23 + (i % 2) * 3 + (i === 2 ? 4 : 0), stone: outer, top: 'crenel', slits: 2 }));
  addTower(st, { u: A / 2, v: A, r: 5.5, h: 21, stone: outer, top: 'flat', slits: 1 });
  addTower(st, { u: 0, v: A / 2, r: 5.5, h: 20, stone: outer, top: 'flat', slits: 1 });
  addTower(st, { u: A, v: A / 2, r: 5.5, h: 20, stone: outer, top: 'flat', slits: 1 });

  addRing(st, [[O, O], [O + I, O], [O + I, O + I], [O, O + I]], { stone: inner, h: 19 });
  const sq: Vec2[] = [[O, O], [O + I, O], [O + I, O + I], [O, O + I]];
  sq.forEach(([u, v], i) => addBox(st, { u: u! - 5, v: v! - 5, a: 10, b: 10, h: 30 + (i === 2 ? 4 : 0), stone: inner, slits: 2, bias: -4.5, windows: false, roof: i % 2 ? { kind: 'pyramid', color: SLATE, h: 12 } : undefined }));
  addBox(st, { u: O + 7, v: O + 8, a: 22, b: 22, h: 46, stone: inner, windows: { rows: 3 }, turrets: { r: 3.8, h: 10, top: 'cone', roof: SLATE, inset: 2.4 }, flag: FLAG });

  addBush(st, -9, 12, 4.5);
  addTree(st, -12, 38, { w: 15, h: 20 });
  addRocks(st, A + 9, 10, 3, 5);
  addBush(st, A + 8, 40, 4);
  addTufts(st, A / 2 + 12, -14, 3, 9);
};

/** A long front curtain with a twin-tower gatehouse, a great hall and a square donjon. */
const bastion: Builder = (st) => {
  const A = 96;
  const B = 38;
  const stone = STONE.gray;
  addDirt(st, A / 2, -13, 12, 9);
  addPath(st, [[A / 2, -6], [A / 2 + 4, -22]], 7);
  addGround(st, [[3, 3], [A - 3, 3], [A - 3, B - 3], [3, B - 3]], COURT, 0.75);
  addRing(st, [[0, 0], [A, 0], [A, B], [0, B]], { stone, h: 17, gate: { edge: 0, w: 22 } });
  const g = A / 2;
  addBox(st, { u: g - 11, v: -4, a: 22, b: 12, h: 29, stone, gate: { face: 'v', w: 9, h: 15 }, windows: false, slits: 1, flag: FLAG });
  addTower(st, { u: g - 11, v: -4, r: 7, h: 34, stone, top: 'cone', roof: SLATE, roofH: 15, slits: 2 });
  addTower(st, { u: g + 11, v: -4, r: 7, h: 34, stone, top: 'cone', roof: SLATE, roofH: 15, slits: 2, bias: -3 });
  addTower(st, { u: 0, v: 0, r: 9.5, h: 38, stone, top: 'cone', roof: SLATE, roofH: 19, slits: 2 });
  addTower(st, { u: A, v: 0, r: 9.5, h: 38, stone, top: 'cone', roof: SLATE, roofH: 19, slits: 2 });
  addTower(st, { u: A, v: B, r: 9, h: 33, stone, top: 'crenel', slits: 2 });
  addTower(st, { u: 0, v: B, r: 9, h: 33, stone, top: 'crenel', slits: 2 });
  addTower(st, { u: 22, v: 0, r: 5.5, h: 25, stone, top: 'flat', slits: 1 });
  addTower(st, { u: 74, v: 0, r: 5.5, h: 25, stone, top: 'flat', slits: 1 });
  addTower(st, { u: A / 2, v: B, r: 6.5, h: 29, stone, top: 'crenel', slits: 1 });
  addBox(st, { u: 10, v: 11, a: 42, b: 17, h: 20, stone: STONE.pale, roof: { kind: 'gable', color: TEAL, h: 15, ridge: 'u' }, windows: { rows: 1 } });
  addBox(st, { u: 62, v: 11, a: 22, b: 20, h: 48, stone: STONE.warm, roof: { kind: 'hip', color: SLATE, h: 18 }, windows: { rows: 3 }, turrets: { r: 3.2, h: 8, roof: RED }, flag: FLAG });
  addTree(st, -9, 16, { w: 15, h: 20 });
  addBush(st, -6, 36, 4.5);
  addRocks(st, A + 8, 22, 3, 5);
  addTree(st, A + 11, 8, { w: 14, h: 19, leaf: '#5f7f33' });
  addTufts(st, 20, -14, 3, 9);
};

/** A triangular fortress: three drum towers, a gatehouse in one flank and a great round donjon. */
const triangle: Builder = (st) => {
  const S = 74;
  const stone = STONE.cold;
  const pts: Vec2[] = [[0, 0], [S, 0], [0, S]];
  addDirt(st, S / 2, -13, 11, 9);
  addPath(st, [[S / 2, -6], [S / 2 + 2, -21]], 7);
  addGround(st, [[4, 3], [S - 8, 3], [3, S - 8]], COURT, 0.75);
  addRing(st, pts, { stone, h: 17, gate: { edge: 0, w: 16, at: 0.5 } });
  addBox(st, { u: S / 2 - 8, v: -4, a: 16, b: 12, h: 28, stone, gate: { face: 'v', w: 8, h: 14 }, windows: false, slits: 1, turrets: { r: 3, h: 7, top: 'cone', roof: RED, inset: 2.2 }, flag: FLAG });
  addTower(st, { u: 0, v: 0, r: 11, h: 36, stone, top: 'cone', roof: TEAL, roofH: 20, slits: 2 });
  addTower(st, { u: S, v: 0, r: 9.5, h: 33, stone, top: 'cone', roof: TEAL, roofH: 18, slits: 2 });
  addTower(st, { u: 0, v: S, r: 9.5, h: 33, stone, top: 'cone', roof: TEAL, roofH: 18, slits: 2 });
  addTower(st, { u: S / 2, v: S / 2, r: 5.5, h: 24, stone, top: 'flat', slits: 1 });
  addTower(st, { u: 0, v: S / 2, r: 5.5, h: 24, stone, top: 'flat', slits: 1 });
  addTower(st, { u: S * 0.28, v: S * 0.28, r: 12, h: 50, stone: STONE.warm, top: 'crenel', windows: 3, glow: '#f0c46a' });
  addBush(st, -9, 22, 4.5);
  addTree(st, -11, 50, { w: 15, h: 20 });
  addRocks(st, S + 8, 12, 3, 5);
  addBush(st, 24, S + 6, 4);
  addTufts(st, S / 2 + 14, -14, 3, 9);
};

/** A stepped crag fortress: a lower bailey on the terrace and a walled ward with the keep on the upper rock. */
const terraces: Builder = (st, { ox, oy }) => {
  const E1 = 15;
  const E2 = 14;
  addCrag(st, { poly: [[-12, -6], [30, -12], [72, -6], [88, 16], [84, 46], [64, 66], [20, 70], [-8, 56], [-18, 26]], elev: E1, color: '#8a7f6e', top: '#8aa05a' });
  const mid: Stage = { ...st, iso: makeIso(ox, oy - E1) };
  const stone = STONE.gray;
  // Lower bailey: a gate wall along the front of the terrace.
  addPath(mid, [[40, -14], [40, 6]], 6);
  addRing(mid, [[4, 4], [76, 4], [80, 22], [76, 40]], { stone, h: 11, gate: { edge: 0, w: 14, at: 0.5 }, skip: [3] });
  addBox(mid, { u: 32, v: 0, a: 14, b: 9, h: 21, stone, gate: { face: 'v', w: 7, h: 12 }, windows: false, slits: 1 });
  addTower(mid, { u: 4, v: 4, r: 5.5, h: 20, stone, top: 'cone', roof: RED, roofH: 11, slits: 1 });
  addTower(mid, { u: 76, v: 4, r: 5.5, h: 20, stone, top: 'cone', roof: RED, roofH: 11, slits: 1 });
  addTower(mid, { u: 80, v: 22, r: 5, h: 18, stone, top: 'flat', slits: 1 });
  addBox(mid, { u: 60, v: 40, a: 14, b: 12, h: 9, stone: STONE.pale, plain: true, roof: { kind: 'gable', color: '#7c5a3c', h: 7, ridge: 'u' }, windows: false });

  addCrag(mid, { poly: [[14, 14], [50, 10], [68, 28], [62, 52], [34, 60], [10, 46]], elev: E2, color: '#7f7566', top: COURT });
  const hi: Stage = { ...st, iso: makeIso(ox, oy - E1 - E2) };
  const ward: Vec2[] = [[18, 18], [48, 14], [62, 30], [56, 48], [34, 54], [14, 44]];
  addRing(hi, ward, { stone, h: 13, gate: { edge: 0, w: 10 } });
  ward.forEach(([u, v], i) => addTower(hi, { u: u!, v: v!, r: 5.6, h: 22 + (i === 2 ? 6 : 0), stone, top: i % 2 ? 'crenel' : 'cone', roof: i % 3 === 0 ? SLATE : TEAL, roofH: 12, slits: 1 }));
  addBox(hi, { u: 26, v: 26, a: 20, b: 18, h: 40, stone: STONE.warm, roof: { kind: 'hip', color: SLATE, h: 17 }, windows: { rows: 3 }, turrets: { r: 3, h: 8, roof: RED }, flag: FLAG });

  addTree(st, -14, 40, { w: 14, h: 19 });
  addRocks(st, 84, 62, 3, 5);
  addBush(st, 40, -20, 4);
  addBush(st, 90, 34, 4);
  addTufts(st, 20, -19, 3, 9);
};

const BUILDERS: Builder[] = [concentric, bastion, triangle, terraces];
/** Horizontal shift of the grid origin so that each footprint is centred in the sprite. */
const SHIFT: number[] = [0, -25, 0, 0];
const BASE: number[] = [0.9, 0.9, 0.9, 0.94];

export default defineSymbol({
  id: 'castle.fortress',
  name: 'Fortress',
  category: 'settlements',
  size: [184, 152],
  anchor: [0.5, 0.9],
  order: 41,
  tags: ['castle', 'fortress', 'stronghold', 'citadel', 'stone'],
  placement: 'land',
  variants: 4,
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
