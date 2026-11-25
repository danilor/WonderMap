import { defineSymbol } from '../../kit/define';
import { addBox, addGround, addRuinBox, addRuinRing, addRuinWall, addTower, ringPoints } from '../../parts/settle-castle';
import { STONE, createStage, makeIso } from '../../parts/settle-geom';
import type { Stage } from '../../parts/settle-geom';
import { addBush, addDirt, addMound, addPath, addRocks, addRubble, addTree, addTufts } from '../../parts/settle-props';

interface Place {
  ox: number;
  oy: number;
}
type Builder = (st: Stage, at: Place) => void;

const GRASS = '#8b9a5b';
const OLD_ROOF = '#7d6a55';
const LEAF = '#5f8a3e';

/** A square ward with three stumps of towers, a gutted keep and a tree growing through the courtyard. */
const fallenKeep: Builder = (st) => {
  const A = 60;
  const stone = STONE.gray;
  addDirt(st, 24, -10, 10, 8, '#a8926b', 0.5);
  addGround(st, [[3, 3], [A - 3, 3], [A - 3, A - 3], [3, A - 3]], GRASS, 0.55);
  addRuinRing(st, [[0, 0], [A, 0], [A, A], [0, A]], { stone, h: 15, broken: 0.78, moss: true, gaps: { 0: [0.36, 0.56], 3: [0.62, 0.82] } });
  addRuinBox(st, { u: 17, v: 14, a: 28, b: 26, h: 36, t: 4.6, stone: STONE.warm, moss: true, breach: 'v', floor: '#7a7457' });
  addTower(st, { u: 0, v: 0, r: 7.2, h: 25, stone, top: 'broken', moss: true, slits: 1 });
  addTower(st, { u: A, v: 0, r: 6.6, h: 19, stone, top: 'broken', moss: true });
  addTower(st, { u: 0, v: A, r: 6.6, h: 23, stone, top: 'broken', moss: true, slits: 1 });
  addRubble(st, A - 3, A - 3, 9, 6, stone);
  addRubble(st, 28, -5, 5, 5, stone);
  addTree(st, 47, 46, { kind: 'round', w: 22, h: 27, leaf: LEAF });
  addBush(st, 10, 36, 3.8, '#6b8a3b');
  addBush(st, 52, 12, 3.4, '#6b8a3b');
  addTree(st, -12, 22, { kind: 'dead', w: 13, h: 19 });
  addRocks(st, A + 10, 22, 3, 5, '#8d887d');
  addTufts(st, A / 2, -14, 4, 12, '#7da043');
};

/** A tall surviving gatehouse (one tower still roofed) with a crumbling curtain and open back. */
const gatehouse: Builder = (st) => {
  const stone = STONE.gray;
  addDirt(st, 21, -12, 11, 9, '#a8926b', 0.5);
  addPath(st, [[21, -6], [25, -20]], 7);
  addGround(st, [[12, 8], [80, 8], [80, 44], [12, 44]], GRASS, 0.5);
  addRuinWall(st, { p: [34, 5], q: [86, 5], h: 17, t: 4, stone, broken: 0.78, moss: true, gap: [0.46, 0.6], ends: [17, 16] });
  addRuinWall(st, { p: [86, 5], q: [86, 50], h: 16, t: 4, stone, broken: 0.82, moss: true, gap: [0.5, 0.74], ends: [16, 9] });
  addRuinWall(st, { p: [8, 5], q: [8, 40], h: 16, t: 4, stone, broken: 0.8, moss: true, gap: [0.58, 0.8], ends: [16, 8] });
  addRuinWall(st, { p: [86, 50], q: [62, 50], h: 12, t: 4, stone, broken: 0.9, moss: true, ends: [9, 5] });
  addBox(st, { u: 8, v: -2, a: 26, b: 14, h: 30, stone, gate: { face: 'v', w: 10, h: 18 }, windows: false, slits: 1 });
  addTower(st, { u: 8, v: 5, r: 7.8, h: 35, stone, top: 'cone', roof: OLD_ROOF, roofH: 20, slits: 3, moss: true });
  addTower(st, { u: 34, v: 5, r: 7.8, h: 27, stone, top: 'broken', moss: true, slits: 2, bias: -3 });
  addTower(st, { u: 86, v: 5, r: 7, h: 24, stone, top: 'broken', moss: true, slits: 1 });
  addTower(st, { u: 86, v: 50, r: 6, h: 14, stone, top: 'broken', moss: true });
  addTower(st, { u: 8, v: 40, r: 5.8, h: 13, stone, top: 'broken', moss: true });
  addRuinBox(st, { u: 44, v: 18, a: 20, b: 16, h: 17, t: 3.4, stone: STONE.warm, moss: true, floor: '#7a7457' });
  addRubble(st, 60, 8, 6, 6, stone);
  addRubble(st, 76, 34, 5, 6, stone);
  addTree(st, 30, 30, { kind: 'round', w: 20, h: 24, leaf: LEAF });
  addBush(st, 66, 26, 3.6, '#6b8a3b');
  addBush(st, 20, 24, 3.2, '#6b8a3b');
  addTree(st, 98, 18, { kind: 'dead', w: 13, h: 19 });
  addRocks(st, -6, 22, 3, 5, '#8d887d');
};

/** A broken shell keep and tower stumps on a grassy motte. */
const hillRuin: Builder = (st, { ox, oy }) => {
  const H = 15;
  const stone = STONE.pale;
  const C = 22;
  addMound(st, C, C, 46, 36, H, '#7f9a4c');
  const hi: Stage = { ...st, iso: makeIso(ox, oy - H) };
  const ring = ringPoints(C, C, 27, 9, 0.35);
  addGround(hi, ringPoints(C, C, 25, 9, 0.35), '#86a14f', 0.5);
  addRuinRing(hi, ring, { stone, h: 17, broken: 0.82, moss: true, gaps: { 1: [0.2, 0.62], 6: [0.3, 0.6] } });
  [0, 3, 5, 7].forEach((i) => {
    const p = ring[i]!;
    addTower(hi, { u: p[0], v: p[1], r: 5.6, h: 25 - i * 1.4, stone, top: 'broken', moss: true, slits: 1 });
  });
  addTower(hi, { u: C + 2, v: C + 2, r: 9.4, h: 37, stone: STONE.warm, top: 'broken', moss: true, slits: 2, windows: 1, glow: '#2a2015' });
  addRubble(hi, C - 8, C - 10, 6, 6, stone);
  addBush(hi, C + 15, C - 8, 3.4, '#6b8a3b');
  addTree(st, C - 36, C + 8, { kind: 'dead', w: 14, h: 20 });
  addTree(st, C + 44, C - 6, { kind: 'round', w: 18, h: 22, leaf: LEAF });
  addRocks(st, C + 8, C - 40, 3, 5, '#8d887d');
};

/** A seven-sided ward almost swallowed by an enormous old tree. */
const overgrown: Builder = (st) => {
  const C = 34;
  const R = 34;
  const stone = STONE.warm;
  const ring = ringPoints(C, C, R, 7, 0.2);
  addGround(st, ringPoints(C, C, R * 0.92, 7, 0.2), '#7f9a4c', 0.7);
  addRuinRing(st, ring, { stone, h: 18, broken: 0.7, moss: true, gaps: { 0: [0.3, 0.52], 4: [0.4, 0.68] } });
  [0, 2, 4, 6].forEach((i) => {
    const p = ring[i]!;
    addTower(st, { u: p[0], v: p[1], r: 6, h: 22 + (i % 3) * 2, stone, top: 'broken', moss: true, slits: 1 });
  });
  addTree(st, C + 3, C + 4, { kind: 'round', w: 38, h: 44, leaf: '#4f7f36' });
  addBush(st, C - 18, C + 6, 4, '#6b8a3b');
  addBush(st, C + 20, C - 12, 3.6, '#5f8a3e');
  addRubble(st, C + 8, C - 20, 6, 6, stone);
  addRocks(st, 62, 20, 3, 5, '#8d887d');
  addTufts(st, 22, -8, 4, 12, '#7da043');
};

const BUILDERS: Builder[] = [fallenKeep, gatehouse, hillRuin, overgrown];
const SHIFT: number[] = [0, -18, 0, 0];
const BASE: number[] = [0.9, 0.9, 0.9, 0.9];
const SCALE: number[] = [1.2, 1.2, 1.25, 1.3];

export default defineSymbol({
  id: 'castle.ruins',
  name: 'Castle Ruins',
  category: 'settlements',
  size: [168, 136],
  anchor: [0.5, 0.9],
  order: 43,
  tags: ['castle', 'ruins', 'ruin', 'abandoned', 'fortress', 'overgrown', 'derelict'],
  placement: 'land',
  variants: 4,
  draw(d) {
    const { ctx, w, h, rand, variant } = d;
    const i = variant % BUILDERS.length;
    const ox = w / 2 + SHIFT[i]!;
    const oy = h * BASE[i]!;
    const stage = createStage(ctx, rand, ox, oy);
    BUILDERS[i]!(stage, { ox, oy });
    ctx.save();
    ctx.translate(w / 2, oy);
    ctx.scale(SCALE[i]!, SCALE[i]!);
    ctx.translate(-w / 2, -oy);
    stage.scene.render(ctx);
    ctx.restore();
  },
});
