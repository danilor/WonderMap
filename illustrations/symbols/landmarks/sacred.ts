import { addBox, addCrag, addGround, addTower, ringPoints } from '../../parts/settle-castle';
import { STONE } from '../../parts/settle-geom';
import type { Stage } from '../../parts/settle-geom';
import { addBeam, addFlame, addMenhir, addObelisk, landmark } from '../../parts/settle-land';
import { addBush, addCrate, addRocks, addTree, addTufts } from '../../parts/settle-props';
import { addColumn, addFallenColumn, addGravestone } from '../../parts/settle-ruin';
import { raised } from '../../parts/settle-town';

function pad(st: Stage, R = 22, color = '#8ea05f', alpha = 0.5, cu = 0, cv = 0): void {
  addGround(st, ringPoints(cu, cv, R, 9, st.rand.range(0, 1)), color, alpha);
}

/* ------------------------------------------------------------------------------------ */
/* Temples                                                                               */
/* ------------------------------------------------------------------------------------ */

function templeGreek(st: Stage): void {
  const marble = '#e6dfcb';
  pad(st, 30, '#9aa766', 0.45);
  addBox(st, { u: -26, v: -15, a: 52, b: 30, h: 3, stone: '#cfc7b2', top: 'flat', plain: true, windows: false });
  const up = raised(st, 3);
  addBox(up, { u: -24, v: -13, a: 48, b: 26, h: 3, stone: '#d8d0bb', top: 'flat', plain: true, windows: false, noShadow: true, bias: -1 });
  const top = raised(st, 6);
  addBox(top, {
    u: -18,
    v: -8,
    a: 36,
    b: 16,
    h: 21,
    stone: marble,
    plain: true,
    windows: false,
    roof: { kind: 'gable', ridge: 'u', color: '#c7694b', h: 11, over: 5.5 },
    gate: { face: 'u', w: 5, h: 10 },
    noShadow: true,
    bias: -2,
  });
  for (let k = 0; k < 6; k++) {
    const u = -20 + k * 8;
    addColumn(top, u, -11, { h: 21, r: 2.3, stone: marble });
    addColumn(top, u, 11, { h: 21, r: 2.3, stone: marble });
  }
  addColumn(top, -20, -3.5, { h: 21, r: 2.3, stone: marble });
  addColumn(top, -20, 3.5, { h: 21, r: 2.3, stone: marble });
  addFallenColumn(st, 22, -22, 11, 'v', 2.2, marble);
  addBush(st, -28, 14, 4.4, '#6f9a4c');
  addTree(st, 28, 18, { kind: 'pine', w: 14, h: 22 });
  addTufts(st, 0, -24, 6, 12);
}

function templeRound(st: Stage): void {
  pad(st, 26, '#9aa766', 0.45);
  const marble = '#e8e1ce';
  const R = 12.5;
  addTower(st, { u: 0, v: 0, r: 19, h: 4, stone: '#cfc7b2', top: 'flat', noShadow: false, bias: 3 });
  addTower(raised(st, 4), { u: 0, v: 0, r: 16.5, h: 3, stone: '#d8d0bb', top: 'flat', noShadow: true, bias: 2 });
  const base = raised(st, 7);
  addTower(base, { u: 0, v: 0, r: 8.4, h: 17, stone: '#ece4d0', windows: 1, glow: '#2a2015', noShadow: true, bias: 1 });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.4;
    addColumn(base, Math.cos(a) * R, Math.sin(a) * R, { h: 17, r: 2.1, stone: marble });
  }
  addTower(raised(st, 24), { u: 0, v: 0, r: 15, h: 3, stone: '#d8d0bb', top: 'flat', noShadow: true, bias: 0.5 });
  addTower(raised(st, 27), { u: 0, v: 0, r: 9, h: 4, stone: '#ece4d0', top: 'dome', roof: '#d9a441', roofH: 22, flag: '#c0392b', noShadow: true, bias: -1 });
  addBush(st, 22, 4, 4.2, '#6f9a4c');
  addBush(st, -22, 8, 4.2, '#7aa04c');
  addTufts(st, 4, -22, 6, 12);
}

function templePagoda(st: Stage): void {
  pad(st, 24, '#8a9a58', 0.45);
  addBox(st, { u: -15, v: -15, a: 30, b: 30, h: 3, stone: '#9a9488', top: 'flat', plain: true, windows: false });
  const red = '#b8453a';
  const tiers: ReadonlyArray<readonly [number, number, number]> = [
    [22, 11, 6],
    [17, 10, 5.5],
    [12, 9, 5],
  ];
  let z = 3;
  tiers.forEach(([a, h, rh], i) => {
    addBox(raised(st, z), {
      u: -a / 2,
      v: -a / 2,
      a,
      b: a,
      h,
      stone: red,
      plain: true,
      windows: { glow: '#f0b24a', rows: 1, scale: 0.8 },
      roof: { kind: 'pyramid', color: i === 0 ? '#3f6f68' : '#3a6a64', h: rh, over: 4.2 },
      gate: i === 0 ? { face: 'u', w: 5, h: 8 } : null,
      noShadow: i > 0,
      bias: -3 * i,
    });
    z += h + rh * 0.55;
  });
  const [sx, sy] = st.iso(0, 0, z + 6);
  st.scene.add(-80, () => {
    const { ctx } = st;
    ctx.save();
    ctx.strokeStyle = '#2a2015';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, sy + 2);
    ctx.lineTo(sx, sy - 16);
    ctx.stroke();
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    for (const k of [0, 1, 2]) {
      ctx.beginPath();
      ctx.ellipse(sx, sy - 4 - k * 4.5, 3.4 - k * 0.7, 1.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#d9a441';
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = '#2a2015';
      ctx.stroke();
    }
    ctx.restore();
  });
  addRocks(st, 20, 6, 3, 4);
  addBush(st, -20, 14, 4.2, '#6f9a4c');
}

/* ------------------------------------------------------------------------------------ */
/* Shrines                                                                               */
/* ------------------------------------------------------------------------------------ */

function shrineStone(st: Stage): void {
  pad(st, 18, '#8ea05f', 0.5);
  addBox(st, { u: -11, v: -9, a: 22, b: 18, h: 3, stone: '#aaa497', top: 'flat', plain: true, windows: false });
  addBox(raised(st, 3), { u: -7, v: -6, a: 14, b: 12, h: 13, stone: STONE.gray, windows: false, gate: { face: 'u', w: 6, h: 8 }, roof: { kind: 'gable', ridge: 'v', color: '#6d7079', h: 8, over: 1.8 }, noShadow: true, bias: -1 });
  addFlame(st, -12, -4, 3, 0.55, 8);
  addFlame(st, -12, 4, 3, 0.55, 8);
  addTufts(st, 12, -2, 6, 8, '#d96a8a', 3);
  addBush(st, 14, 10, 4, '#6f9a4c');
  addRocks(st, -14, 12, 2, 4);
}

function shrineTorii(st: Stage): void {
  pad(st, 24, '#7f9a62', 0.5, 0, 4);
  const red = '#c0392b';
  addBox(st, { u: 4, v: 4, a: 12, b: 10, h: 3, stone: '#aaa497', top: 'flat', plain: true, windows: false });
  addBox(raised(st, 3), { u: 6, v: 6, a: 8, b: 6, h: 9, stone: '#b58a58', plain: true, windows: false, roof: { kind: 'gable', ridge: 'v', color: '#4b4757', h: 6, over: 1.8 }, noShadow: true, bias: -1 });
  addBeam(st, [-7, 8, 0], [-7, 8, 26], { w: 2.8, wood: red, depth: 6 });
  addBeam(st, [7, -6, 0], [7, -6, 26], { w: 2.8, wood: red, depth: -14 });
  addBeam(st, [-8.5, 9.5, 20], [8.5, -7.5, 20], { w: 1.8, wood: red, depth: -14.5 });
  addBeam(st, [-11, 12, 27], [11, -10, 27], { w: 3.4, wood: '#2a2a33', depth: -16 });
  addBeam(st, [-9.5, 10.5, 24], [9.5, -8.5, 24], { w: 2, wood: red, depth: -15.5 });
  addBeam(st, [-3, 3, 0], [-3, 3, 6], { w: 3, wood: '#a7a295', depth: -2 });
  addBeam(st, [3, -1, 0], [3, -1, 6], { w: 3, wood: '#a7a295', depth: -4 });
  addTree(st, 16, -8, { kind: 'pine', w: 16, h: 26 });
  addTree(st, -16, 20, { kind: 'round', w: 14, h: 20, leaf: '#d98aa4' });
  addCrate(st, 12, -14, 3, 2.6, 2.6, '#b58a58');
}

function shrineCross(st: Stage): void {
  pad(st, 16, '#8ea05f', 0.5);
  addBox(st, { u: -8, v: -8, a: 16, b: 16, h: 2.4, stone: '#aaa497', top: 'flat', plain: true, windows: false });
  addBox(raised(st, 2.4), { u: -5.5, v: -5.5, a: 11, b: 11, h: 3.2, stone: '#b9b3a2', top: 'flat', plain: true, windows: false, noShadow: true, bias: -1 });
  addGravestone(raised(st, 5.6), 0, 0, { kind: 'celtic', h: 26, stone: '#8f8a7e' });
  addFlame(st, -10, 4, 0, 0.5, 8);
  addTufts(st, 11, 2, 6, 6, '#e8d65a', 3);
  addTufts(st, -2, -13, 5, 6, '#e8e8f0', 3);
  addBush(st, 14, -10, 4, '#6f9a4c');
}

/* ------------------------------------------------------------------------------------ */
/* Standing stones                                                                       */
/* ------------------------------------------------------------------------------------ */

function stoneRing(st: Stage, o: { n: number; R: number; h: number; moss: boolean; runes?: string; stone: string }): void {
  const { rand } = st;
  for (let k = 0; k < o.n; k++) {
    if (k === 3 && !o.runes) continue;
    const a = (k / o.n) * Math.PI * 2 + 0.3;
    const h = o.h * rand.range(0.72, 1.1);
    addMenhir(st, Math.cos(a) * o.R, Math.sin(a) * o.R, {
      h,
      w: h * rand.range(0.34, 0.5),
      stone: o.stone,
      lean: rand.range(-2.5, 2.5),
      moss: o.moss,
      ...(o.runes ? { runes: o.runes } : {}),
    });
  }
}

function stonesRing(st: Stage): void {
  pad(st, 30, '#8ea05f', 0.55);
  addBox(st, { u: -6, v: -4.5, a: 12, b: 9, h: 3.4, stone: '#a7a295', top: 'flat', plain: true, windows: false });
  stoneRing(st, { n: 9, R: 24, h: 24, moss: true, stone: '#9d998e' });
  addFallenColumn(st, 22, -23, 12, 'v', 2.8, '#9d998e');
  addTufts(st, 0, 0, 7, 22, '#7da043', 4);
  addRocks(st, -26, 16, 3, 4);
}

function stonesAvenue(st: Stage): void {
  pad(st, 30, '#8ea05f', 0.5, 0, 0);
  // Trilithon at the back, an avenue of stones leading towards the viewer.
  addMenhir(st, 6, 20, { h: 34, w: 11, stone: '#a39f93', moss: true });
  addMenhir(st, 6, 4, { h: 34, w: 11, stone: '#a39f93', moss: true, lean: 1 });
  addBox(raised(st, 31), { u: 2, v: 2, a: 8, b: 24, h: 6, stone: '#a39f93', top: 'flat', plain: true, windows: false, bias: -50, noShadow: true });
  for (let k = 0; k < 4; k++) {
    const u = -4 - k * 9;
    addMenhir(st, u, 8 - k * 0.8, { h: 19 - k * 1.5, w: 8, stone: '#9d998e', lean: (k % 2) * 2 - 1, moss: k % 2 === 0 });
    addMenhir(st, u, 18 + k * 0.6, { h: 21 - k * 1.8, w: 8, stone: '#9d998e', lean: 1.5 - (k % 2) * 3 });
  }
  addTufts(st, -10, 12, 8, 14, '#7da043', 4);
  addRocks(st, 24, 24, 3, 4);
}

function stonesRunes(st: Stage): void {
  pad(st, 30, '#6f9a6a', 0.55);
  const { ctx, iso, scene } = st;
  const [cx, cy] = iso(0, 0);
  scene.add(1e6 + 0.2, () => {
    ctx.save();
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26);
    g.addColorStop(0, 'rgba(150,230,255,0.7)');
    g.addColorStop(1, 'rgba(150,230,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 30, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  stoneRing(st, { n: 7, R: 22, h: 25, moss: true, runes: '#8ff0ff', stone: '#8d93a0' });
  addRocks(st, 0, 0, 2, 3, '#8d93a0');
  addTufts(st, 0, 0, 6, 20, '#6b9a55', 4);
}

/* ------------------------------------------------------------------------------------ */
/* Obelisks and monoliths                                                                */
/* ------------------------------------------------------------------------------------ */

function obeliskSand(st: Stage): void {
  pad(st, 20, '#b8a878', 0.5);
  addBox(st, { u: -13, v: -13, a: 26, b: 26, h: 3, stone: '#cbbf9f', top: 'flat', plain: true, windows: false });
  addBox(raised(st, 3), { u: -10, v: -10, a: 20, b: 20, h: 3, stone: '#d4c8a8', top: 'flat', plain: true, windows: false, noShadow: true, bias: -1 });
  addObelisk(raised(st, 6), 0, 0, { a: 11, h: 64, stone: '#d8cba6' });
  addRocks(st, 18, 10, 3, 4, '#b8a878');
}

function obeliskDark(st: Stage): void {
  pad(st, 22, '#5f7a5a', 0.55);
  const { ctx, iso, scene } = st;
  const [cx, cy] = iso(0, 0, 40);
  scene.add(1e6 + 0.2, () => {
    ctx.save();
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 34);
    g.addColorStop(0, 'rgba(120,220,255,0.45)');
    g.addColorStop(1, 'rgba(120,220,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 26, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  addBox(st, { u: -12, v: -12, a: 24, b: 24, h: 3, stone: '#5d5a6c', top: 'flat', plain: true, windows: false });
  addObelisk(raised(st, 3), 0, 0, { a: 11, h: 66, stone: '#4f4b63', glow: '#8ff0ff' });
  addRocks(st, 17, 9, 3, 4, '#4f4b63');
  addRocks(st, -17, 14, 2, 4, '#4f4b63');
}

function obeliskPair(st: Stage): void {
  pad(st, 26, '#8ea05f', 0.5);
  addBox(st, { u: -24, v: -12, a: 48, b: 24, h: 3, stone: '#b9b3a2', top: 'flat', plain: true, windows: false });
  addObelisk(raised(st, 3), 11, -3, { a: 9, h: 52, stone: '#bcb4a0' });
  addObelisk(raised(st, 3), -11, 3, { a: 9, h: 40, stone: '#bcb4a0' });
  addFallenColumn(st, 16, 18, 12, 'u', 2.6, '#bcb4a0');
  addBush(st, -26, -10, 4.2, '#6f9a4c');
}

function monolithRune(st: Stage): void {
  pad(st, 18, '#7f9a62', 0.5);
  addCrag(st, { poly: [[-9, -7], [3, -10], [11, -2], [9, 8], [-3, 10], [-11, 3]], elev: 4, color: '#8c8579' });
  addMenhir(raised(st, 4), 0, 0, { h: 56, w: 20, stone: '#7e8294', moss: true, runes: '#8ff0ff', lean: 1.5 });
  addRocks(st, 14, 8, 3, 4);
  addTufts(st, -8, 14, 5, 6, '#6b9a55', 4);
}

function dolmen(st: Stage): void {
  pad(st, 22, '#8ea05f', 0.5);
  addMenhir(st, 0, 14, { h: 24, w: 12, stone: '#9a968b', moss: true });
  addMenhir(st, 0, -6, { h: 26, w: 12, stone: '#9a968b', lean: 1.2 });
  addBox(raised(st, 22), { u: -6, v: -9, a: 12, b: 26, h: 5, stone: '#a39f93', top: 'flat', plain: true, windows: false, bias: -50, noShadow: true });
  addMenhir(st, -9, 4, { h: 15, w: 9, stone: '#8d897e', moss: true });
  addRocks(st, 16, 8, 3, 4);
  addBush(st, -14, 16, 4, '#6f9a4c');
  addTufts(st, 6, -14, 5, 7);
}

function stoneArch(st: Stage): void {
  pad(st, 20, '#6f9a6a', 0.55);
  const { ctx, iso, scene } = st;
  const [cx, cy] = iso(0, 4, 19);
  scene.add(4, () => {
    ctx.save();
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 20);
    g.addColorStop(0, 'rgba(190,150,255,0.9)');
    g.addColorStop(1, 'rgba(120,80,220,0.1)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 10, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  addMenhir(st, 0, 14, { h: 40, w: 10, stone: '#80849a', runes: '#c9a6ff', moss: true });
  addMenhir(st, 0, -6, { h: 40, w: 10, stone: '#80849a', runes: '#c9a6ff', lean: -1 });
  addBox(raised(st, 36), { u: -3, v: -9, a: 6, b: 26, h: 5, stone: '#7d8196', top: 'flat', plain: true, windows: false, bias: -50, noShadow: true });
  addRocks(st, 14, 4, 3, 4, '#80849a');
  addTufts(st, -12, 10, 5, 6, '#6b9a55', 4);
}

export default [
  landmark({
    id: 'landmark.temple',
    name: 'Temple',
    size: [120, 124],
    base: 0.8,
    order: 60,
    tags: ['temple', 'holy', 'church', 'religion', 'ancient'],
    builders: [templeGreek, templeRound, templePagoda],
  }),
  landmark({
    id: 'landmark.shrine',
    name: 'Shrine',
    size: [76, 84],
    base: 0.84,
    order: 70,
    tags: ['shrine', 'holy', 'sacred', 'wayside'],
    builders: [shrineStone, shrineTorii, shrineCross],
  }),
  landmark({
    id: 'landmark.standing-stones',
    name: 'Standing Stones',
    size: [124, 88],
    base: 0.74,
    order: 80,
    tags: ['stones', 'circle', 'henge', 'ancient', 'druid'],
    builders: [stonesRing, stonesAvenue, stonesRunes],
  }),
  landmark({
    id: 'landmark.obelisk',
    name: 'Obelisk',
    size: [76, 108],
    base: 0.88,
    order: 90,
    tags: ['obelisk', 'monument', 'ancient'],
    builders: [obeliskSand, obeliskDark, obeliskPair],
  }),
  landmark({
    id: 'landmark.monolith',
    name: 'Monolith',
    size: [80, 100],
    base: 0.86,
    order: 100,
    tags: ['monolith', 'rune', 'dolmen', 'portal', 'ancient'],
    builders: [monolithRune, dolmen, stoneArch],
  }),
];
