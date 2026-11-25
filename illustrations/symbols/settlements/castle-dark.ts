import { defineSymbol } from '../../kit/define';
import { addBox, addCrag, addGround, addRing, addTower } from '../../parts/settle-castle';
import { STONE, createStage, inFace, leftFace, makeIso } from '../../parts/settle-geom';
import type { Stage } from '../../parts/settle-geom';
import { addBush, addDirt, addRocks, addTree, addTufts } from '../../parts/settle-props';

interface Place {
  ox: number;
  oy: number;
}
type Builder = (st: Stage, at: Place) => void;

const DARK = STONE.basalt;
const SPIRE = '#37303f';
const SPIRE2 = '#4d4259';
const GLOW = '#ff6a3d';
const ASH = '#4a433c';
const YARD = '#5d544a';
const BANNER = '#8b1f2e';

/** Black citadel: a spiked square ring around a keep with a steep roof. */
const citadel: Builder = (st) => {
  const A = 54;
  addDirt(st, A / 2, -12, 12, 9, ASH, 0.65);
  addGround(st, [[3, 3], [A - 3, 3], [A - 3, A - 3], [3, A - 3]], YARD, 0.85);
  addRing(st, [[0, 0], [A, 0], [A, A], [0, A]], { stone: DARK, h: 17, gate: { edge: 0, w: 14 } });
  addBox(st, { u: A / 2 - 7, v: -3, a: 14, b: 10, h: 25, stone: DARK, gate: { face: 'v', w: 8, h: 14 }, windows: false, roof: { kind: 'hip', color: SPIRE, h: 13 } });
  addTower(st, { u: 0, v: 0, r: 6.5, h: 32, stone: DARK, top: 'spire', roof: SPIRE, roofH: 26, crown: true, slits: 2 });
  addTower(st, { u: A, v: 0, r: 6.5, h: 36, stone: DARK, top: 'spire', roof: SPIRE2, roofH: 28, crown: true, slits: 2 });
  addTower(st, { u: A, v: A, r: 7, h: 44, stone: DARK, top: 'spire', roof: SPIRE, roofH: 32, crown: true, windows: 1, glow: GLOW });
  addTower(st, { u: 0, v: A, r: 6.5, h: 34, stone: DARK, top: 'spire', roof: SPIRE2, roofH: 28, crown: true, slits: 2 });
  addBox(st, { u: 14, v: 15, a: 25, b: 25, h: 46, stone: DARK, roof: { kind: 'pyramid', color: SPIRE, h: 36 }, windows: { glow: GLOW, rows: 3 }, turrets: { r: 3.4, h: 10, top: 'spire', roof: SPIRE2, inset: 2.2 }, flag: BANNER });
  addTree(st, -11, 16, { kind: 'dead', w: 15, h: 23 });
  addRocks(st, A + 9, 14, 3, 5, '#6a6572');
  addTree(st, A + 12, 38, { kind: 'dead', w: 13, h: 20 });
  addTufts(st, A / 2, -16, 3, 11, '#6c6a45');
};

/** Two gigantic spired towers around a gate, the keep tower looming behind on a black crag. */
const twin: Builder = (st, { ox, oy }) => {
  const E = 14;
  addCrag(st, { poly: [[-14, -8], [58, -12], [72, 10], [66, 50], [42, 66], [2, 62], [-16, 34]], elev: E, color: '#554f61', top: '#6b665f' });
  const hi: Stage = { ...st, iso: makeIso(ox, oy - E) };
  addGround(hi, [[2, 4], [48, 4], [48, 50], [2, 50]], YARD, 0.8);
  addRing(hi, [[0, 0], [50, 0], [50, 54], [0, 54]], { stone: DARK, h: 12, gate: { edge: 0, w: 22, at: 0.5 } });
  addBox(hi, { u: 14, v: -3, a: 22, b: 12, h: 30, stone: DARK, gate: { face: 'v', w: 10, h: 18 }, windows: false, slits: 1 });
  addTower(hi, { u: 14, v: -3, r: 7.5, h: 52, stone: DARK, top: 'spire', roof: SPIRE, roofH: 34, crown: true, slits: 3, windows: 1, glow: GLOW });
  addTower(hi, { u: 36, v: -3, r: 7.5, h: 56, stone: DARK, top: 'spire', roof: SPIRE2, roofH: 36, crown: true, slits: 3, bias: -3 });
  addTower(hi, { u: 0, v: 0, r: 4.6, h: 27, stone: DARK, top: 'spire', roof: SPIRE, roofH: 18, slits: 1 });
  addTower(hi, { u: 50, v: 0, r: 4.6, h: 27, stone: DARK, top: 'spire', roof: SPIRE, roofH: 18, slits: 1 });
  addTower(hi, { u: 50, v: 54, r: 5.2, h: 32, stone: DARK, top: 'spire', roof: SPIRE2, roofH: 22, slits: 1 });
  addTower(hi, { u: 0, v: 54, r: 5.2, h: 30, stone: DARK, top: 'spire', roof: SPIRE, roofH: 22, slits: 1 });
  addTower(hi, { u: 25, v: 32, r: 9, h: 52, stone: DARK, top: 'spire', roof: SPIRE, roofH: 38, crown: true, windows: 3, glow: GLOW, flag: BANNER });
  addTree(st, -16, 50, { kind: 'dead', w: 14, h: 22 });
  addRocks(st, 74, 40, 3, 5, '#6a6572');
  addRocks(st, 22, -20, 3, 6, '#6a6572');
  addBush(st, 62, 66, 3.6, '#5c6b3c');
};

/** A crooked cluster of black spires without any walls. */
const spires: Builder = (st, { ox, oy }) => {
  const E = 20;
  addCrag(st, { poly: [[-8, -4], [38, -10], [68, 8], [66, 40], [42, 60], [6, 58], [-12, 32]], elev: E, color: '#4f4a5a', top: '#68645d' });
  const hi: Stage = { ...st, iso: makeIso(ox, oy - E) };
  addBox(hi, { u: 12, v: 22, a: 14, b: 12, h: 16, stone: DARK, roof: { kind: 'gable', color: SPIRE, h: 12, ridge: 'u' }, windows: { glow: GLOW, rows: 1 } });
  addBox(hi, { u: 34, v: 12, a: 12, b: 14, h: 20, stone: STONE.slate, roof: { kind: 'hip', color: SPIRE2, h: 12 }, windows: { glow: GLOW, rows: 1 } });
  addTower(hi, { u: 10, v: 8, r: 6, h: 34, stone: DARK, top: 'spire', roof: SPIRE, roofH: 30, crown: true, slits: 2 });
  addTower(hi, { u: 40, v: 6, r: 5, h: 44, stone: STONE.slate, top: 'spire', roof: SPIRE2, roofH: 30, slits: 3 });
  addTower(hi, { u: 54, v: 26, r: 6, h: 38, stone: DARK, top: 'spire', roof: SPIRE, roofH: 26, crown: true, windows: 1, glow: GLOW });
  addTower(hi, { u: 44, v: 46, r: 6.8, h: 46, stone: STONE.slate, top: 'spire', roof: SPIRE, roofH: 32, crown: true, slits: 2 });
  addTower(hi, { u: 16, v: 46, r: 6, h: 32, stone: DARK, top: 'spire', roof: SPIRE2, roofH: 26, slits: 2 });
  addTower(hi, { u: 0, v: 30, r: 5, h: 26, stone: STONE.slate, top: 'spire', roof: SPIRE, roofH: 22, slits: 1 });
  addTower(hi, { u: 30, v: 30, r: 8.5, h: 62, stone: DARK, top: 'spire', roof: SPIRE, roofH: 42, crown: true, windows: 3, glow: GLOW, flag: BANNER });
  addTree(st, -14, 12, { kind: 'dead', w: 15, h: 22 });
  addRocks(st, 70, 50, 4, 5, '#6a6572');
  addRocks(st, 8, 66, 3, 5, '#6a6572');
};

/** A gothic cathedral-fortress: a dark nave with a rose window and two spired front towers. */
const cathedral: Builder = (st) => {
  const A = 54;
  const B = 30;
  const U0 = 10;
  const V0 = 14;
  addDirt(st, 12, 8, 18, 16, ASH, 0.65);
  addGround(st, [[0, 4], [A + 14, 4], [A + 14, 56], [0, 56]], YARD, 0.5);
  // Nave with a steep roof; the lit gable end carries the portal and rose window.
  addBox(st, { u: U0, v: V0, a: A, b: B, h: 30, stone: STONE.slate, roof: { kind: 'gable', color: SPIRE, h: 26, ridge: 'u' }, windows: { glow: GLOW, rows: 1, scale: 0.9 }, gate: { face: 'u', w: 8, h: 13 } });
  st.scene.add(U0 + V0 + (A + B) / 2 - 0.2, () => {
    const f = leftFace(st.iso, U0, V0, B, 0);
    inFace(st.ctx, f, () => {
      const c = st.ctx;
      const cx = B / 2;
      const cz = 22;
      c.beginPath();
      c.arc(cx, cz, 5.4, 0, Math.PI * 2);
      c.fillStyle = GLOW;
      c.fill();
      c.strokeStyle = '#2a2015';
      c.lineWidth = 1.1;
      c.stroke();
      c.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI;
        c.moveTo(cx - Math.cos(a) * 5.4, cz - Math.sin(a) * 5.4);
        c.lineTo(cx + Math.cos(a) * 5.4, cz + Math.sin(a) * 5.4);
      }
      c.lineWidth = 0.8;
      c.stroke();
    });
  });
  // Front towers flanking the facade, nearly flush with it.
  addBox(st, { u: U0 - 3, v: V0 - 5, a: 11, b: 10, h: 44, stone: DARK, roof: { kind: 'pyramid', color: SPIRE2, h: 30 }, windows: { glow: GLOW, rows: 2, scale: 0.8 }, bias: -2 });
  addBox(st, { u: U0 - 3, v: V0 + B - 5, a: 11, b: 10, h: 40, stone: DARK, roof: { kind: 'pyramid', color: SPIRE, h: 28 }, windows: { glow: GLOW, rows: 2, scale: 0.8 }, bias: -2 });
  // Crossing spire, rear tower.
  addTower(st, { u: U0 + A - 4, v: V0 + B / 2, r: 6.4, h: 46, stone: DARK, top: 'spire', roof: SPIRE, roofH: 32, crown: true, slits: 2, windows: 1, glow: GLOW });
  addTower(st, { u: U0 + A * 0.52, v: V0 + B / 2, r: 3.4, h: 6, stone: DARK, top: 'spire', roof: SPIRE2, roofH: 34, noShadow: true, bias: -2 });
  addTree(st, -8, 8, { kind: 'dead', w: 15, h: 22 });
  addTree(st, -6, 52, { kind: 'dead', w: 13, h: 20 });
  addRocks(st, A + 18, 20, 3, 5, '#6a6572');
  addRocks(st, 0, 28, 3, 4, '#6a6572');
  addTufts(st, 6, -4, 3, 8, '#6c6a45');
};

const BUILDERS: Builder[] = [citadel, twin, spires, cathedral];
const SHIFT: number[] = [0, 0, 0, 0];
const BASE: number[] = [0.9, 0.94, 0.94, 0.9];

export default defineSymbol({
  id: 'castle.dark',
  name: 'Dark Castle',
  category: 'settlements',
  size: [168, 160],
  anchor: [0.5, 0.9],
  order: 42,
  tags: ['castle', 'dark', 'evil', 'citadel', 'necromancer', 'fortress'],
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
