import { defineSymbol } from '../../kit/define';
import { addGround, addRuinBox, addRuinRing, addRuinWall, addTower, ringPoints } from '../../parts/settle-castle';
import { STONE, createStage } from '../../parts/settle-geom';
import type { Stage } from '../../parts/settle-geom';
import { addBush, addDirt, addFence, addPath, addRocks, addRubble, addTree, addTufts, addWell } from '../../parts/settle-props';
import { addArchway, addBeams, addColumn, addEmbers, addFallenColumn, addGable, addGravestone, addScorch, addSmoke, addTruss } from '../../parts/settle-ruin';
import { addHouse } from '../../parts/settle-town';

type Builder = (st: Stage) => void;

const GRASS = '#8b9a5b';
const OLD_ROOF = '#7d6a55';
const LEAF = '#5f8a3e';
const MOSS = '#6b8a3b';
const PLASTER = '#cdbf9c';

/** A main street with two rows of gutted houses, a well and fallen timbers. */
const street: Builder = (st) => {
  addGround(st, [[0, 22], [88, 22], [88, 36], [0, 36]], '#9a8a62', 0.55);
  addPath(st, [[-4, 29], [90, 29]], 7, '#b49c70', 0.6);
  const near: [number, number, number, number, string][] = [
    [2, 2, 16, 16, STONE.warm],
    [24, 3, 14, 17, PLASTER],
    [44, 2, 18, 15, STONE.gray],
    [68, 3, 15, 16, STONE.pale],
  ];
  const far: [number, number, number, number, string][] = [
    [6, 39, 18, 18, STONE.pale],
    [32, 40, 15, 17, STONE.warm],
    [56, 38, 20, 19, PLASTER],
  ];
  const stoneBox = (b: [number, number, number, number, string], breach?: 'u' | 'v'): void => {
    addRuinBox(st, { u: b[0], v: b[1], a: b[2], b: b[3], h: 15, t: 3.2, stone: b[4], broken: 0.72, moss: true, floor: '#6e6554', breach });
  };
  stoneBox(near[0]!, 'v');
  stoneBox(near[1]!);
  stoneBox(near[2]!, 'u');
  stoneBox(near[3]!);
  stoneBox(far[0]!);
  stoneBox(far[1]!, 'v');
  stoneBox(far[2]!);
  addTruss(st, { u: 47, v: 5, a: 12, b: 9, h: 9, rise: 6, wood: '#6a523a', burnt: 0.4 });
  addTruss(st, { u: 9, v: 42, a: 11, b: 11, h: 8, rise: 5, wood: '#6a523a', burnt: 0.5 });
  addWell(st, 41, 29);
  addRubble(st, 20, 28, 7, 6, STONE.gray);
  addRubble(st, 62, 30, 6, 7, STONE.gray);
  addBeams(st, 52, 28, 3, 5, '#6a523a');
  addTree(st, 74, 41, { kind: 'dead', w: 14, h: 20 });
  addTree(st, 26, 60, { kind: 'round', w: 18, h: 23, leaf: LEAF });
  addBush(st, 86, 24, 3.6, MOSS);
  addBush(st, 3, 36, 3.4, MOSS);
  addBush(st, 52, 62, 3.6, MOSS);
  addRocks(st, 90, 8, 3, 5, '#8d887d');
  addTufts(st, 40, -6, 4, 14, '#7da043');
};

/** A roofless church with one tall gable wall, a lone belfry stump and an overgrown churchyard. */
const church: Builder = (st) => {
  const stone = STONE.pale;
  addGround(st, [[-2, -2], [86, -2], [86, 62], [-2, 62]], GRASS, 0.45);
  addDirt(st, 48, 6, 18, 9, '#a8926b', 0.4);
  // Nave: near wall, far wall, east wall and the surviving west gable.
  addRuinWall(st, { p: [8, 24], q: [52, 24], h: 17, t: 3.6, stone, broken: 0.72, moss: true, gap: [0.45, 0.62], ends: [20, 14] });
  addRuinWall(st, { p: [8, 46], q: [52, 46], h: 19, t: 3.6, stone, broken: 0.6, moss: true, inner: true, ends: [20, 15] });
  addRuinWall(st, { p: [52, 24], q: [52, 46], h: 17, t: 3.6, stone, broken: 0.8, moss: true, inner: true, ends: [14, 12] });
  addGable(st, { u: 4, v: 24, w: 22, h: 21, peak: 13, t: 3.8, stone, moss: true, broken: 0.35, window: true, door: true });
  // Belfry stump.
  addRuinBox(st, { u: 54, v: 38, a: 11, b: 11, h: 34, t: 3.4, stone: STONE.warm, broken: 0.6, moss: true, floor: '#5e5646', breach: 'u' });
  // Churchyard.
  addFence(st, [56, 2], [84, 2], 3, '#7a6244');
  addFence(st, [84, 2], [84, 24], 3, '#7a6244');
  const graves: [number, number, 'slab' | 'cross' | 'round' | 'celtic' | 'obelisk'][] = [
    [60, 6, 'cross'], [67, 5, 'slab'], [74, 7, 'round'], [80, 6, 'cross'],
    [62, 13, 'slab'], [70, 14, 'celtic'], [77, 13, 'slab'],
    [58, 20, 'round'], [66, 21, 'obelisk'], [74, 20, 'cross'], [81, 20, 'slab'],
  ];
  graves.forEach(([u, v, kind], i) => addGravestone(st, u, v, { kind, h: kind === 'obelisk' ? 8 : 5.2, lean: (i % 3 - 1) * 0.12 }));
  addRuinBox(st, { u: 62, v: 36, a: 14, b: 13, h: 12, t: 3, stone: STONE.warm, broken: 0.75, moss: true, floor: '#6e6554' });
  addRubble(st, 30, 33, 7, 8, stone);
  addRubble(st, 6, 12, 5, 4, stone);
  addTree(st, 74, 54, { kind: 'dead', w: 15, h: 22 });
  addTree(st, 40, 58, { kind: 'round', w: 20, h: 25, leaf: LEAF });
  addTree(st, -6, 36, { kind: 'dead', w: 13, h: 19 });
  addBush(st, 22, 10, 3.6, MOSS);
  addBush(st, 52, 14, 3.4, MOSS);
  addTufts(st, 30, 2, 4, 12, '#7da043');
};

/** The collapsed ring wall of a city: broken towers around a tangle of roofless houses and a gable of the old cathedral. */
const city: Builder = (st) => {
  const C = 38;
  const stone = STONE.gray;
  const ring = ringPoints(C, C, 40, 8, Math.PI / 8);
  addGround(st, ringPoints(C, C, 37, 8, Math.PI / 8), GRASS, 0.55);
  addGround(st, ringPoints(C, C, 30, 8, Math.PI / 8), '#a09068', 0.4);
  addRuinRing(st, ring, { stone, h: 15, broken: 0.78, moss: true, gaps: { 1: [0.2, 0.55], 5: [0.3, 0.7] } });
  [0, 2, 3, 5, 6].forEach((i, k) => {
    const p = ring[i]!;
    addTower(st, { u: p[0], v: p[1], r: 6, h: 21 + k * 1.6, stone, top: 'broken', moss: true, slits: 1 });
  });
  const lots: [number, number, number, number][] = [
    [14, 14, 14, 12], [32, 12, 12, 13], [50, 16, 13, 11],
    [12, 34, 13, 14], [52, 36, 14, 12],
    [20, 54, 14, 11], [40, 56, 13, 10],
  ];
  lots.forEach(([u, v, a, b], i) => {
    if (i === 2 || i === 5) addHouse(st, u, v, a - 2, b - 2, { wallH: 8, roofH: 7, roof: OLD_ROOF, wall: STONE.pale });
    else addRuinBox(st, { u, v, a, b, h: 11 + (i % 3) * 2, t: 2.8, stone: i % 2 ? STONE.warm : PLASTER, broken: 0.7, moss: i % 2 === 0, floor: '#6e6554' });
  });
  addGable(st, { u: 30, v: 32, w: 18, h: 26, peak: 14, t: 3.6, stone: STONE.pale, moss: true, broken: 0.4 });
  addRuinBox(st, { u: 38, v: 34, a: 12, b: 11, h: 30, t: 3.4, stone: STONE.warm, broken: 0.62, moss: true, floor: '#5e5646', breach: 'v' });
  addRubble(st, 36, 50, 7, 6, stone);
  addRubble(st, 24, 28, 5, 4, stone);
  addTree(st, 46, 30, { kind: 'round', w: 20, h: 25, leaf: LEAF });
  addBush(st, 28, 46, 3.6, MOSS);
  addTree(st, -9, 30, { kind: 'dead', w: 14, h: 20 });
  addRocks(st, 80, 16, 3, 5, '#8d887d');
};

/** A village burned to the ground: black timber frames on scorched foundations, chimney stacks and drifting smoke. */
const burnt: Builder = (st) => {
  const char = '#5b5148';
  addScorch(st, 28, 28, 52, 28, '#3a3027', 0.5);
  addScorch(st, 28, 28, 34, 18, '#251e17', 0.45);
  const hs: [number, number, number, number][] = [[4, 4, 16, 14], [26, 5, 14, 15], [44, 4, 15, 13], [6, 34, 15, 15], [30, 36, 17, 14], [50, 34, 13, 13]];
  hs.forEach(([u, v, a, b], i) => {
    addRuinBox(st, { u, v, a, b, h: 5 + (i % 2) * 3, t: 2.6, stone: char, broken: 0.6, floor: '#2b241c' });
    if (i !== 2 && i !== 4) addTruss(st, { u: u + 1.5, v: v + 1.5, a: a - 3, b: b - 3, h: 8 + (i % 3), rise: 5 + (i % 2) * 2, burnt: 0.35 + (i % 3) * 0.2 });
    addBeams(st, u + a / 2, v + b / 2, 2, a / 3, '#3a2f25');
  });
  addTower(st, { u: 22, v: 27, r: 2.4, h: 17, stone: '#7a6f61', top: 'broken', slits: 0 });
  addTower(st, { u: 45, v: 30, r: 2.1, h: 14, stone: '#7a6f61', top: 'broken', slits: 0 });
  addEmbers(st, 36, 26, 5, 14);
  addEmbers(st, 20, 12, 3, 8);
  addEmbers(st, 40, 44, 3, 8);
  addRubble(st, 34, 28, 6, 5, '#6d655a');
  addSmoke(st, 22, 27, 18, 6, 4.2, true);
  addSmoke(st, 38, 12, 8, 6, 3.8, true);
  addSmoke(st, 40, 42, 8, 5, 3.6, true);
  addTree(st, 66, 10, { kind: 'dead', w: 14, h: 21, leaf: '#3a3128' });
  addTree(st, -8, 44, { kind: 'dead', w: 13, h: 19, leaf: '#3a3128' });
  addTree(st, 62, 58, { kind: 'dead', w: 12, h: 17, leaf: '#3a3128' });
  addRocks(st, 70, 36, 3, 4, '#7d776c');
};

/** An old forum: two colonnades leading to a broken triumphal arch, with houses crumbling around the edges. */
const overgrown: Builder = (st) => {
  addGround(st, [[8, 8], [62, 8], [62, 52], [8, 52]], '#b0a68a', 0.55);
  addGround(st, [[14, 24], [58, 24], [58, 36], [14, 36]], '#c4baa0', 0.45);
  const rowA: [number, number, number][] = [[8, 24, 0], [19, 14, 0.8], [30, 24, 0], [41, 18, 0.5]];
  const rowB: [number, number, number][] = [[8, 24, 0], [19, 24, 0], [30, 10, 0.9], [41, 24, 0]];
  rowA.forEach(([u, h, br]) => addColumn(st, u, 14, { h, r: 2.4, broken: br }));
  rowB.forEach(([u, h, br]) => addColumn(st, u, 46, { h, r: 2.4, broken: br }));
  addArchway(st, { u: 54, v: 22, w: 8.4, h: 28, pier: 3.8, t: 3.8, stone: STONE.pale, moss: true, broken: true });
  addFallenColumn(st, 22, 30, 12, 'u', 2.3);
  addFallenColumn(st, 40, 38, 7, 'v', 2.2);
  addRubble(st, 46, 32, 6, 6, STONE.pale);
  addRuinBox(st, { u: 28, v: -6, a: 15, b: 11, h: 11, t: 3, stone: STONE.warm, broken: 0.8, moss: true, floor: '#6a7a4c' });
  addRuinBox(st, { u: 4, v: 56, a: 16, b: 12, h: 13, t: 3, stone: STONE.pale, broken: 0.8, moss: true, floor: '#6a7a4c' });
  addRuinBox(st, { u: 34, v: 56, a: 14, b: 12, h: 10, t: 3, stone: STONE.warm, broken: 0.85, moss: true, floor: '#6a7a4c' });
  addTree(st, 52, 58, { kind: 'round', w: 26, h: 32, leaf: '#4f7f36' });
  addTree(st, -6, 36, { kind: 'round', w: 22, h: 28, leaf: '#5f8a3e' });
  addTree(st, 68, 8, { kind: 'round', w: 18, h: 23, leaf: '#6a9444' });
  addTree(st, 20, 68, { kind: 'pine', w: 15, h: 22 });
  addBush(st, 52, 2, 3.8, MOSS);
  addBush(st, 14, 36, 3.6, '#5f8a3e');
  addBush(st, 60, 40, 3.4, MOSS);
  addBush(st, 2, 6, 3.6, MOSS);
  addTufts(st, 34, 6, 5, 14, '#7da043');
};

const BUILDERS: Builder[] = [street, church, city, burnt, overgrown];
const BASE: number[] = [0.9, 0.9, 0.9, 0.9, 0.9];
const SHIFT: number[] = [0, 0, 0, 0, 0];
const SCALE: number[] = [1.06, 1, 1, 1.12, 1.06];

export default defineSymbol({
  id: 'settlement.ruins',
  name: 'Ruined Town',
  category: 'settlements',
  size: [150, 110],
  anchor: [0.5, 0.88],
  order: 36,
  tags: ['settlement', 'ruins', 'ruin', 'abandoned', 'ghost town', 'burnt', 'overgrown', 'derelict', 'church'],
  placement: 'land',
  variants: 5,
  draw(d) {
    const { ctx, w, h, rand, variant } = d;
    const i = variant % BUILDERS.length;
    const oy = h * BASE[i]!;
    const stage = createStage(ctx, rand, w / 2 + SHIFT[i]!, oy);
    BUILDERS[i]!(stage);
    ctx.save();
    ctx.translate(w / 2, oy);
    ctx.scale(SCALE[i]!, SCALE[i]!);
    ctx.translate(-w / 2, -oy);
    stage.scene.render(ctx);
    ctx.restore();
  },
});
