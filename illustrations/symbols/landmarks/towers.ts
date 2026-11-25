import { addBox, addCrag, addGround, addRuinWall, addTower, ringPoints } from '../../parts/settle-castle';
import type { TowerTop } from '../../parts/settle-castle';
import { STONE, ellipseFootprint, shadowOf } from '../../parts/settle-geom';
import type { Stage } from '../../parts/settle-geom';
import { addSea } from '../../parts/settle-harbor';
import { addBeam, addFlame, addLightRays, addSails, landmark } from '../../parts/settle-land';
import { addBarrel, addBush, addCrate, addRocks, addRubble, addTree, addTufts } from '../../parts/settle-props';
import { addSmoke } from '../../parts/settle-ruin';
import { raised } from '../../parts/settle-town';
import { addTimberBox } from '../../parts/settle-wood';

interface Seg {
  r: number;
  h: number;
  stone: string;
  top?: TowerTop;
  roof?: string;
  roofH?: number;
  flag?: string;
  windows?: number;
  slits?: number;
  glow?: string;
  moss?: boolean;
}

/** Stacks round tower segments on top of each other and returns the height reached. */
function stack(st: Stage, u: number, v: number, segs: readonly Seg[], z0 = 0): number {
  let z = z0;
  segs.forEach((s, i) => {
    addTower(z ? raised(st, z) : st, {
      u,
      v,
      r: s.r,
      h: s.h,
      stone: s.stone,
      top: s.top ?? 'flat',
      roof: s.roof ?? '#5a4a94',
      ...(s.roofH ? { roofH: s.roofH } : {}),
      ...(s.flag ? { flag: s.flag } : {}),
      windows: s.windows ?? 0,
      slits: s.slits ?? 0,
      glow: s.glow ?? '#ffd27a',
      moss: !!s.moss,
      noShadow: true,
      bias: -0.05 * (i + 1),
    });
    z += s.h;
  });
  const [first] = segs;
  if (first) {
    const [cx, cy] = st.iso(u, v, z0);
    st.scene.shadow(shadowOf(ellipseFootprint(cx, cy, first.r * 1.04, first.r * 0.38, 12), (z - z0) * 0.85, 0.5));
  }
  return z;
}

function pad(st: Stage, R = 20, color = '#8ea05f', alpha = 0.5, cu = 0, cv = 0): void {
  addGround(st, ringPoints(cu, cv, R, 9, st.rand.range(0, 1)), color, alpha);
}

/* ------------------------------------------------------------------------------------ */
/* Wizard tower                                                                          */
/* ------------------------------------------------------------------------------------ */

function wizardClassic(st: Stage): void {
  pad(st, 22);
  const stone = '#bdb6cc';
  stack(st, 0, 0, [
    { r: 12, h: 26, stone, slits: 2 },
    { r: 9.4, h: 36, stone: '#c8c1d6', windows: 1, slits: 1 },
    { r: 13.2, h: 12, stone: '#b3accb', windows: 3, glow: '#ffd27a', top: 'cone', roof: '#5a4a94', roofH: 32, flag: '#e8c34a' },
  ]);
  addRocks(st, 15, -8, 3, 5);
  addBush(st, -14, -6, 4.4, '#6f9a4c');
  addBush(st, 10, 14, 3.8, '#7aa04c');
  addTufts(st, 4, -14, 4, 8);
}

function wizardTwin(st: Stage): void {
  pad(st, 26, '#8ea05f', 0.5, 0, 10);
  const stone = '#b9b7cf';
  stack(st, 0, 0, [
    { r: 8.6, h: 52, stone, windows: 1, slits: 2, top: 'cone', roof: '#3f6fb0', roofH: 32, flag: '#e8c34a' },
  ]);
  stack(st, 0, 22, [
    { r: 7.2, h: 36, stone: '#c4c1d8', windows: 1, slits: 1, top: 'cone', roof: '#7a4aa0', roofH: 26 },
  ]);
  addBox(raised(st, 26), { u: -2.4, v: 6.5, a: 4.8, b: 10, h: 7, stone: '#b6b2cc', plain: true, windows: false, roof: { kind: 'gable', ridge: 'v', color: '#7a4aa0', h: 3.4 }, noShadow: true, bias: -2 });
  addRocks(st, 12, 4, 3, 5);
  addBush(st, -12, 8, 4.2, '#6f9a4c');
  addBush(st, 10, 30, 3.8, '#7aa04c');
}

function wizardCrystal(st: Stage): void {
  pad(st, 22, '#7f9a62', 0.5);
  const top = stack(st, 0, 0, [
    { r: 11.5, h: 30, stone: '#7a7694', slits: 2 },
    { r: 8.6, h: 34, stone: '#8a86a6', windows: 2, glow: '#9ee8ff' },
    { r: 11, h: 6, stone: '#6d6a85', top: 'crenel' },
  ]);
  const { ctx, iso, scene } = st;
  const [cx, cy] = iso(0, 0, top + 20);
  scene.add(-60, () => {
    ctx.save();
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 24);
    g.addColorStop(0, 'rgba(158,232,255,0.7)');
    g.addColorStop(1, 'rgba(158,232,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();
    const gem = (x: number, y: number, w: number, h: number): void => {
      ctx.lineJoin = 'round';
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#2a2015';
      ctx.fillStyle = '#d6f6ff';
      ctx.beginPath();
      ctx.moveTo(x, y - h);
      ctx.lineTo(x - w, y);
      ctx.lineTo(x, y + h * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#5fb7e6';
      ctx.beginPath();
      ctx.moveTo(x, y - h);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x, y + h * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.moveTo(x - w * 0.45, y - h * 0.15);
      ctx.lineTo(x - w * 0.2, y - h * 0.55);
      ctx.stroke();
    };
    gem(cx, cy, 6.5, 13);
    gem(cx - 17, cy + 6, 2.8, 5.5);
    gem(cx + 16, cy - 4, 2.4, 4.6);
    ctx.restore();
  });
  addRocks(st, 14, -8, 3, 5, '#8a86a6');
  addBush(st, -13, -4, 4, '#5f8a52');
  addTufts(st, 6, 14, 4, 8, '#6b9a55');
}

/* ------------------------------------------------------------------------------------ */
/* Watchtower                                                                            */
/* ------------------------------------------------------------------------------------ */

function watchWooden(st: Stage): void {
  pad(st, 22, '#8a9a58', 0.5);
  const H = 44;
  const wood = '#8f6840';
  // Back posts and braces first, front posts after the deck.
  addBeam(st, [8, 8, 0], [8, 8, H], { w: 2.6, wood, depth: 40 });
  addBeam(st, [-8, 8, 0], [-8, 8, H], { w: 2.6, wood, depth: 30 });
  addBeam(st, [8, -8, 0], [8, -8, H], { w: 2.6, wood, depth: 30 });
  addBeam(st, [-8, 8, 0], [8, 8, H * 0.55], { w: 1.4, wood, depth: 36 });
  addBeam(st, [8, 8, 0], [8, -8, H * 0.55], { w: 1.4, wood, depth: 34 });
  addTimberBox(raised(st, H), { u: -10, v: -10, a: 20, b: 20, h: 3, wood: '#a47a4c', noShadow: true, bias: 0 });
  addBeam(st, [-8, -8, 0], [-8, -8, H + 2], { w: 2.8, wood, depth: -30 });
  addBeam(st, [-8, -8, 0], [8, -8, H * 0.55], { w: 1.4, wood, depth: -28 });
  addBeam(st, [-8, -8, H * 0.25], [-8, 8, H * 0.8], { w: 1.4, wood, depth: -28 });
  addBeam(st, [-8, 8, 4], [-8, -8, H * 0.5], { w: 1.2, wood, depth: -28 });
  addBeam(st, [8, -8, 4], [-8, -8, H * 0.55], { w: 1.2, wood, depth: -28 });
  for (let k = 0; k < 7; k++) addBeam(st, [-10.5, -3 + k * 0.01, 3 + k * 5.6], [-10.5, 3, 3 + k * 5.6], { w: 1, wood: '#b58a58', depth: -30.5 });
  addTimberBox(raised(st, H + 3), { u: -7, v: -7, a: 14, b: 14, h: 11, wood: '#a47a4c', door: { face: 'u', w: 3, h: 6 }, windows: 1, roof: { kind: 'pyramid', color: '#6b4a2b', h: 12, over: 2 }, flag: '#c0392b', noShadow: false, bias: -1 });
  addCrate(st, -16, -10, 3.4, 3, 3, '#b58a58');
  addBarrel(st, -15, 4, 1.9, 3.8);
  addRocks(st, 14, 6, 3, 4);
  addTufts(st, 4, -16, 5, 8);
}

function watchStone(st: Stage): void {
  pad(st, 24, '#8a9a58', 0.5);
  stack(st, 0, 0, [
    { r: 11.5, h: 30, stone: STONE.gray, slits: 2 },
    { r: 9.2, h: 30, stone: STONE.warm, slits: 2, windows: 1, glow: '#f0b24a' },
    { r: 11.4, h: 7, stone: STONE.gray, top: 'crenel' },
  ]);
  const [bx, by] = st.iso(0, 0, 70);
  st.scene.add(-61, () => {
    const { ctx } = st;
    ctx.save();
    ctx.strokeStyle = '#2a2015';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(bx, by - 2);
    ctx.lineTo(bx, by - 22);
    ctx.stroke();
    ctx.fillStyle = '#c0392b';
    ctx.strokeStyle = '#2a2015';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(bx, by - 22);
    ctx.lineTo(bx + 13, by - 19);
    ctx.lineTo(bx + 9, by - 15.5);
    ctx.lineTo(bx + 13, by - 12);
    ctx.lineTo(bx, by - 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
  addTimberBox(st, { u: 8, v: -26, a: 12, b: 9, h: 7, wood: '#a47a4c', door: { face: 'u', w: 2.8, h: 5 }, roof: { kind: 'gable', ridge: 'u', color: '#8c4a38', h: 6, over: 1.6 }, windows: 1 });
  addRocks(st, -14, -10, 3, 5);
  addBush(st, -12, 12, 4.2, '#6f9a4c');
  addBarrel(st, 14, -14, 1.9, 3.8);
}

function watchBeacon(st: Stage): void {
  pad(st, 22, '#8a9a58', 0.5);
  const H = 46;
  addBox(st, { u: -9, v: -9, a: 18, b: 18, h: H, stone: STONE.warm, top: 'crenel', windows: { glow: '#f0b24a', rows: 1, scale: 0.9 }, slits: 2, gate: { face: 'v', w: 5, h: 8 } });
  addBox(raised(st, H), { u: -6, v: -6, a: 12, b: 12, h: 3, stone: STONE.gray, top: 'flat', plain: true, windows: false, noShadow: true, bias: -3 });
  addFlame(raised(st, H + 2), 0, 0, 0, 1.7, 14);
  addSmoke(raised(st, H + 12), 0, 0, 0, 4, 3.6, true);
  addCrate(st, 14, -12, 3.6, 3.2, 3.2, '#b58a58');
  addBarrel(st, 16, -6, 2, 4);
  addRocks(st, -15, 8, 3, 4);
  addBush(st, -14, -12, 4, '#6f9a4c');
}

/* ------------------------------------------------------------------------------------ */
/* Lighthouse                                                                            */
/* ------------------------------------------------------------------------------------ */

function lighthouseBase(st: Stage): Stage {
  addSea(st, [[6, -10], [26, -4], [40, -22], [30, -36], [10, -36], [-4, -24]], { shore: { from: 0, count: 6 }, ripples: 10 });
  addCrag(st, { poly: [[-14, -6], [-8, -13], [6, -14], [14, -8], [16, 4], [10, 12], [-4, 14], [-13, 8]], elev: 6, color: '#8c8579' });
  addRocks(st, 12, -24, 2, 3, '#7f796e');
  addRocks(st, 24, -14, 2, 3, '#7f796e');
  return raised(st, 6);
}

function lightBands(over: Stage, colors: readonly [string, string], gallery: string): void {
  const z = stack(over, 0, 0, [
    { r: 10.6, h: 20, stone: colors[0], slits: 1 },
    { r: 9.7, h: 18, stone: colors[1] },
    { r: 8.9, h: 18, stone: colors[0], windows: 1, glow: '#ffd27a' },
    { r: 8.1, h: 16, stone: colors[1] },
    { r: 10.4, h: 3, stone: gallery, top: 'crenel' },
  ]);
  stack(over, 0, 0, [
    { r: 5, h: 10, stone: '#f4d98a', windows: 0 },
    { r: 6.2, h: 3, stone: '#3a3340', top: 'cone', roof: '#b8453a', roofH: 10, flag: '#e8c34a' },
  ], z);
  addLightRays(over, 0, 0, z + 6, { len: 52 });
}

function lighthouseStriped(st: Stage): void {
  const over = lighthouseBase(st);
  lightBands(over, ['#efe8d6', '#b8453a'], '#4b4757');
  addBox(st, { u: -9, v: 15, a: 11, b: 9, h: 9, stone: '#e6dfcc', plain: true, windows: { glow: '#f0b24a', rows: 1, scale: 0.8 }, roof: { kind: 'gable', ridge: 'v', color: '#8c4a38', h: 6, over: 1.4 }, bias: 8 });
  addBush(st, -16, 6, 4, '#6f9a4c');
}

function lighthouseGrey(st: Stage): void {
  const over = lighthouseBase(st);
  lightBands(over, [STONE.gray, STONE.cold], '#6d7079');
  addTufts(st, -4, 10, 5, 8, '#7da043');
  addBush(st, -14, 8, 4, '#6f9a4c');
}

function lighthouseSquare(st: Stage): void {
  const over = lighthouseBase(st);
  addBox(over, { u: -9, v: -9, a: 18, b: 18, h: 52, stone: '#e8e0cc', top: 'flat', plain: true, windows: { glow: '#f0b24a', rows: 1, scale: 0.85 }, slits: 2 });
  const z = 52;
  addBox(raised(over, z), { u: -11, v: -11, a: 22, b: 22, h: 3, stone: '#4b4757', top: 'flat', plain: true, windows: false, noShadow: true, bias: -3 });
  stack(raised(over, z + 3), 0, 0, [
    { r: 6, h: 11, stone: '#f4d98a' },
    { r: 7, h: 3, stone: '#3a3340', top: 'cone', roof: '#b8453a', roofH: 10, flag: '#e8c34a' },
  ]);
  addLightRays(over, 0, 0, z + 9, { len: 52 });
  addBush(st, -16, 8, 4, '#6f9a4c');
}

/* ------------------------------------------------------------------------------------ */
/* Windmill                                                                              */
/* ------------------------------------------------------------------------------------ */

function field(st: Stage): void {
  addGround(st, [[-30, -4], [-8, -4], [-8, 18], [-30, 18]], '#d9b857', 0.8);
  addTufts(st, -19, 7, 9, 9, '#e6c868', 3.4);
}

function millTower(st: Stage): void {
  pad(st, 22);
  const z = stack(st, 0, 0, [
    { r: 12.6, h: 18, stone: '#d8cdb3', windows: 1, glow: '#f0b24a' },
    { r: 10.6, h: 22, stone: '#e0d6bd', windows: 1, slits: 1 },
    { r: 9.4, h: 4, stone: '#8c6a45', top: 'cone', roof: '#7a5236', roofH: 15, flag: '#c0392b' },
  ]);
  addSails(st, 0, 0, z + 3, { len: 36, rot: 0.55, d: 5.5 });
  addCrate(st, 14, -12, 3.8, 3.4, 3.4, '#b58a58');
  addBarrel(st, 17, -6, 2, 4);
  addBush(st, -16, 12, 4.2, '#6f9a4c');
  addTufts(st, 4, 16, 5, 8, '#7da043');
}

function millPost(st: Stage): void {
  pad(st, 24);
  const H = 12;
  addBeam(st, [-5, 5, 0], [-2, 2, H + 1], { w: 2.4, depth: 30 });
  addBeam(st, [5, -5, 0], [2, -2, H + 1], { w: 2.4, depth: -20 });
  addBeam(st, [5, 5, 0], [2, 2, H + 1], { w: 2.4, depth: 30 });
  addBeam(st, [-5, -5, 0], [-2, -2, H + 1], { w: 2.4, depth: -20 });
  addBeam(st, [0, 0, 0], [0, 0, H + 2], { w: 3.2, depth: 10 });
  addTimberBox(raised(st, H), { u: -9, v: -7, a: 18, b: 14, h: 18, wood: '#a47a4c', door: { face: 'u', w: 3, h: 6, at: 0.3 }, windows: 1, roof: { kind: 'gable', ridge: 'u', color: '#7a5236', h: 9, over: 1.8 }, bias: -2 });
  addSails(st, -1, -1, H + 19, { len: 29, rot: 0.3, d: 11, cloth: '#e9dfc4' });
  addCrate(st, 14, -12, 3.8, 3.4, 3.4, '#b58a58');
  addBarrel(st, -16, -2, 2, 4);
  addBush(st, -16, 12, 4, '#6f9a4c');
}

function millBrick(st: Stage): void {
  pad(st, 20, '#8ea05f', 0.45, 6, 4);
  field(st);
  const z = stack(st, 4, 4, [
    { r: 13.6, h: 20, stone: '#c4785a', windows: 1, glow: '#f0b24a' },
    { r: 11.2, h: 22, stone: '#cf8a6a', windows: 1, slits: 1 },
    { r: 12.8, h: 3, stone: '#8a867f', top: 'flat' },
    { r: 8.8, h: 5, stone: '#e8e0cc', top: 'cone', roof: '#6b4a2b', roofH: 14, flag: '#2f6f9a' },
  ]);
  addSails(st, 4, 4, z + 2, { len: 40, rot: 0.2, d: 6.5, cloth: '#efe7d2' });
  addBarrel(st, 20, -6, 2, 4);
  addCrate(st, 20, 0, 3.6, 3.4, 3.4, '#b58a58');
}

/* ------------------------------------------------------------------------------------ */
/* Ruined tower                                                                          */
/* ------------------------------------------------------------------------------------ */

function ruinRound(st: Stage): void {
  pad(st, 22, '#8a9a58', 0.5);
  addRuinWall(st, { p: [6, 16], q: [-14, 16], h: 14, t: 3.6, stone: STONE.gray, broken: 0.8, moss: true, ends: [14, 7] });
  addTower(st, { u: 0, v: 0, r: 13, h: 48, stone: STONE.gray, top: 'broken', slits: 2, windows: 1, glow: '#2a2015', moss: true });
  addRubble(st, 12, -10, 7, 8, STONE.gray);
  addRocks(st, -14, -4, 3, 4);
  addBush(st, 12, 12, 4.2, '#6f9a4c');
  addTufts(st, -4, -16, 5, 8);
}

function ruinSquare(st: Stage): void {
  pad(st, 24, '#8a9a58', 0.5);
  addRuinWall(st, { p: [-9, -9], q: [-9, 9], h: 40, t: 4, stone: STONE.warm, broken: 0.8, moss: true, ends: [40, 26] });
  addRuinWall(st, { p: [-9, 9], q: [9, 9], h: 36, t: 4, stone: STONE.warm, broken: 0.9, moss: true, ends: [26, 12] });
  addRuinWall(st, { p: [-9, -9], q: [9, -9], h: 28, t: 4, stone: STONE.warm, broken: 0.9, moss: true, ends: [40, 10], gap: [0.35, 0.7] });
  addRubble(st, 14, -10, 8, 8, STONE.warm);
  addRubble(st, -4, -16, 5, 5, STONE.warm);
  addTree(st, 16, 12, { kind: 'dead', w: 14, h: 20 });
  addTufts(st, -14, 10, 5, 7);
}

function ruinCrag(st: Stage): void {
  pad(st, 22, '#7f8f55', 0.45);
  addCrag(st, { poly: [[-14, -12], [12, -14], [15, 12], [-12, 14]], elev: 9, color: '#837b6f' });
  const up = raised(st, 9);
  addTower(up, { u: -2, v: 0, r: 11, h: 42, stone: STONE.dark, top: 'broken', slits: 2, moss: true });
  addRuinWall(up, { p: [8, -8], q: [8, 8], h: 12, t: 3.4, stone: STONE.dark, broken: 0.8, moss: true, ends: [12, 6] });
  addRubble(up, 6, -9, 6, 5, STONE.dark);
  addRubble(st, -17, 10, 5, 5, STONE.dark);
  addTree(st, 20, 6, { kind: 'dead', w: 12, h: 18 });
}

export default [
  landmark({
    id: 'landmark.wizard-tower',
    name: 'Wizard Tower',
    size: [96, 140],
    base: 0.9,
    order: 10,
    tags: ['wizard', 'tower', 'magic', 'mage'],
    builders: [wizardClassic, wizardTwin, wizardCrystal],
  }),
  landmark({
    id: 'landmark.watchtower',
    name: 'Watchtower',
    size: [88, 128],
    base: 0.9,
    order: 20,
    tags: ['watch', 'tower', 'lookout', 'beacon'],
    builders: [watchWooden, watchStone, watchBeacon],
  }),
  landmark({
    id: 'landmark.lighthouse',
    name: 'Lighthouse',
    size: [128, 144],
    base: 0.86,
    order: 30,
    tags: ['lighthouse', 'coast', 'sea', 'light'],
    builders: [lighthouseStriped, lighthouseGrey, lighthouseSquare],
  }),
  landmark({
    id: 'landmark.windmill',
    name: 'Windmill',
    size: [112, 128],
    base: 0.88,
    order: 40,
    tags: ['windmill', 'mill', 'farm'],
    builders: [millTower, millPost, millBrick],
  }),
  landmark({
    id: 'landmark.ruined-tower',
    name: 'Ruined Tower',
    size: [96, 112],
    base: 0.88,
    order: 50,
    tags: ['ruins', 'tower', 'ancient', 'broken'],
    builders: [ruinRound, ruinSquare, ruinCrag],
  }),
];
