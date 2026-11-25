import { rgba } from '../../kit/colors';
import { defineSymbol } from '../../kit/define';
import { ellipse, shape, softBlob } from '../../kit/draw';
import { ribbon } from '../../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../../kit/types';
import { drawCaveMouth, drawCrystalCluster, drawBones, drawOutcrop, drawSkull } from '../../parts/relief-cave';
import { INK, STONE, drawBoulder, tuft } from '../../parts/relief-common';
import { HILL, drawBush, drawHill } from '../../parts/relief-hill';
import { FOLIAGE, drawDeadTree, drawPine, drawRoundTree } from '../../parts/tree';

interface Prop {
  kind: 'pine' | 'round' | 'dead' | 'bush';
  u: number;
  v: number;
  s: number;
}

interface MouthSpec {
  dx: number;
  w: number;
  h: number;
  arch: number;
  teeth: number;
  floor: string;
  eyes?: string;
  glow?: string;
  timber?: boolean;
  rim?: number;
}

interface EntranceSpec {
  rock: string;
  w: number;
  h: number;
  boxy: number;
  lean: number;
  ledges: number;
  cap?: string;
  capShare?: number;
  mouth: MouthSpec;
  props?: Prop[];
  boulders: number;
  /** Bones and a skull in front of the opening. */
  lair?: boolean;
  /** Rails and a lantern for mines. */
  rails?: boolean;
  /** A second, smaller outcrop beside the main one. */
  twin?: { dx: number; w: number; h: number };
}

const DIRT = '#cdb68c';

function drawProp(ctx: Ctx2D, rand: Rng, p: Prop, x: number, y: number): void {
  if (p.kind === 'pine') drawPine(ctx, { cx: x, baseY: y, w: p.s * 0.8, h: p.s * 1.5, leaf: FOLIAGE.dark, ink: INK, rand, tiers: 3 });
  else if (p.kind === 'round') drawRoundTree(ctx, { cx: x, baseY: y, w: p.s, h: p.s * 1.1, leaf: rand.chance(0.5) ? FOLIAGE.green : FOLIAGE.olive, ink: INK, rand, lobes: 3 });
  else if (p.kind === 'dead') drawDeadTree(ctx, { cx: x, baseY: y, w: p.s * 0.9, h: p.s * 1.4, leaf: FOLIAGE.autumn, ink: INK, rand });
  else drawBush(ctx, rand, x, y, p.s * 0.5, FOLIAGE.olive, INK);
}

function entrance(ctx: Ctx2D, rand: Rng, s: EntranceSpec, W: number, H: number): void {
  const cx = W / 2;
  const baseY = H * 0.88;
  const m = s.mouth;
  const mx = cx + m.dx;
  softBlob(ctx, mx, baseY + 4, m.w * 0.95, 7, m.floor, 0.6);
  if (s.twin) {
    const t = drawOutcrop(ctx, { cx: cx + s.twin.dx, baseY: baseY - 2, w: s.twin.w, h: s.twin.h, rock: s.rock, ink: INK, rand, boxy: s.boxy, lean: -s.lean, ledges: 1 });
    void t;
  }
  const rock = drawOutcrop(ctx, { cx, baseY, w: s.w, h: s.h, rock: s.rock, ink: INK, rand, boxy: s.boxy, lean: s.lean, ledges: s.ledges, cap: s.cap, capShare: s.capShare });
  const props = (s.props ?? []).slice().sort((a, b) => b.v - a.v);
  for (const p of props) {
    const at = rock.at(p.u, p.v);
    drawProp(ctx, rand, p, at[0], at[1] + 2);
  }
  drawCaveMouth(ctx, { cx: mx, baseY: baseY - 1, w: m.w, h: m.h, rock: s.rock, ink: INK, rand, arch: m.arch, teeth: m.teeth, eyes: m.eyes, glow: m.glow, floor: m.floor, timber: m.timber, rim: m.rim });

  if (s.rails) {
    const sleepers = 4;
    for (let i = 0; i < sleepers; i++) {
      const t = (i + 0.4) / sleepers;
      const y = baseY + 3 + t * 8;
      const half = m.w * (0.3 + 0.22 * t);
      shape(ctx, [[mx - half - 1.5, y], [mx + half + 1.5, y]], { stroke: INK, width: 2.4, closed: false });
      shape(ctx, [[mx - half - 1.5, y], [mx + half + 1.5, y]], { stroke: '#8a5e34', width: 1.4, closed: false });
    }
    for (const side of [-1, 1]) {
      shape(ctx, [[mx + side * m.w * 0.3, baseY + 1], [mx + side * m.w * 0.52, baseY + 12]], { stroke: INK, width: 1.7, closed: false });
      shape(ctx, [[mx + side * m.w * 0.3, baseY + 1], [mx + side * m.w * 0.52, baseY + 12]], { stroke: '#a7a7ad', width: 0.8, closed: false });
    }
    const lx = mx + m.w / 2 + 5;
    shape(ctx, [[lx, baseY + 2], [lx, baseY - 11]], { stroke: INK, width: 2.2, closed: false });
    shape(ctx, [[lx, baseY + 2], [lx, baseY - 11]], { stroke: '#8a5e34', width: 1.2, closed: false });
    softBlob(ctx, lx, baseY - 12, 7, 6, '#ffc060', 0.7);
    ellipse(ctx, lx, baseY - 12, 1.8, 2.2, { fill: '#ffe08a', stroke: INK, width: 0.8 });
  }

  if (s.lair) {
    drawBones(ctx, rand, mx - m.w * 0.55, baseY + 6, m.w * 0.3, 3, INK);
    drawSkull(ctx, mx + m.w * 0.62, baseY + 4, 3.1, INK);
  }

  const reach = s.w * 0.5;
  const mouthL = mx - m.w / 2 - 5;
  const mouthR = mx + m.w / 2 + 5;
  const placeLeft = mouthL - (cx - reach);
  const placeRight = cx + reach - mouthR;
  for (let i = 0; i < s.boulders; i++) {
    const left = i % 2 === 0 ? placeLeft > 6 : placeRight < 6;
    const x = left ? rand.range(cx - reach, mouthL) : rand.range(mouthR, cx + reach);
    const r = rand.range(2.6, 5.4);
    drawBoulder(ctx, { cx: x, cy: baseY + rand.range(1, 6), rx: r, ry: r * 0.82, rock: s.rock, ink: INK, rand, shadow: true, simple: r < 3.4 });
  }
  const tufts = Math.round(W / 14);
  for (let i = 0; i < tufts; i++) {
    const x = cx + rand.range(-0.55, 0.55) * s.w;
    if (Math.abs(x - mx) < m.w * 0.6) continue;
    tuft(ctx, x, baseY + rand.range(3, 8), rand.range(3, 4.4), '#5f7f3a');
  }
}

const ENTRANCES: EntranceSpec[] = [
  { rock: STONE.gray, w: 86, h: 56, boxy: 2.1, lean: -0.1, ledges: 1, mouth: { dx: 3, w: 32, h: 27, arch: 0.85, teeth: 3, floor: DIRT }, boulders: 5 },
  {
    rock: STONE.brown,
    w: 66,
    h: 58,
    boxy: 3.4,
    lean: 0.2,
    ledges: 2,
    cap: '#86a850',
    capShare: 0.1,
    mouth: { dx: -4, w: 21, h: 34, arch: 1.25, teeth: 2, floor: DIRT },
    props: [
      { kind: 'pine', u: -0.35, v: 0.92, s: 11 },
      { kind: 'pine', u: 0.3, v: 0.88, s: 9 },
    ],
    boulders: 4,
  },
  { rock: STONE.red, w: 90, h: 50, boxy: 2.8, lean: 0.05, ledges: 2, mouth: { dx: -2, w: 40, h: 22, arch: 0.5, teeth: 6, floor: '#d3b28a' }, boulders: 4, lair: true },
  { rock: STONE.dark, w: 76, h: 62, boxy: 2.5, lean: -0.25, ledges: 3, mouth: { dx: 4, w: 28, h: 31, arch: 1.0, teeth: 4, eyes: '#ffd84a', floor: '#9b8a70' }, boulders: 5 },
  {
    rock: STONE.pale,
    w: 60,
    h: 52,
    boxy: 2.7,
    lean: 0.1,
    ledges: 2,
    cap: '#7fa24f',
    capShare: 0.16,
    mouth: { dx: -9, w: 24, h: 25, arch: 0.8, teeth: 3, floor: DIRT },
    twin: { dx: 24, w: 40, h: 36 },
    props: [
      { kind: 'bush', u: 0.1, v: 0.86, s: 9 },
      { kind: 'dead', u: -0.4, v: 0.8, s: 11 },
    ],
    boulders: 4,
  },
];

const MINES: EntranceSpec[] = [
  { rock: STONE.brown, w: 84, h: 54, boxy: 2.4, lean: -0.1, ledges: 2, mouth: { dx: 0, w: 28, h: 27, arch: 0.3, teeth: 0, floor: '#a98a5a', glow: '#ffb347', timber: true }, boulders: 4, rails: true },
  { rock: STONE.gray, w: 76, h: 60, boxy: 3, lean: 0.2, ledges: 2, cap: '#86a850', capShare: 0.1, mouth: { dx: -3, w: 24, h: 29, arch: 0.3, teeth: 0, floor: '#a98a5a', glow: '#ffb347', timber: true }, props: [{ kind: 'pine', u: 0.1, v: 0.92, s: 10 }], boulders: 4, rails: true },
  { rock: STONE.red, w: 88, h: 48, boxy: 2.2, lean: 0.1, ledges: 1, mouth: { dx: 6, w: 31, h: 24, arch: 0.28, teeth: 0, floor: '#b8946a', glow: '#ffb347', timber: true }, boulders: 5, rails: true },
  { rock: STONE.pale, w: 70, h: 56, boxy: 2.8, lean: -0.3, ledges: 3, mouth: { dx: -2, w: 22, h: 28, arch: 0.32, teeth: 0, floor: '#a98a5a', glow: '#ffb347', timber: true }, boulders: 4, rails: true },
];

interface HillCaveSpec {
  palette: keyof typeof HILL;
  w: number;
  h: number;
  apex?: number;
  curve?: number;
  mouth: MouthSpec;
  /** Stones framing the opening. */
  frame: 'rim' | 'dolmen' | 'none';
  props?: { kind: Prop['kind']; dx: number; dy: number; s: number }[];
  trail?: boolean;
  lair?: boolean;
  twin?: { dx: number; w: number; h: number; palette: keyof typeof HILL };
}

function trail(ctx: Ctx2D, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number): void {
  const pts: Vec2[] = [];
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([x0 + (x1 - x0) * t + Math.sin(t * 5) * 3 * t, y0 + (y1 - y0) * t]);
  }
  const widths = pts.map((_, i) => w0 + ((w1 - w0) * i) / n);
  shape(ctx, ribbon(pts, widths), { fill: rgba(DIRT, 0.78), smooth: true });
  shape(ctx, ribbon(pts, widths.map((w) => w * 0.55)), { fill: rgba('#e9dbb8', 0.45), smooth: true });
}

function hillCave(ctx: Ctx2D, rand: Rng, s: HillCaveSpec, W: number, H: number): void {
  const cx = W / 2;
  const baseY = H * 0.78;
  const m = s.mouth;
  const mx = cx + m.dx;
  if (s.twin) drawHill(ctx, { cx: cx + s.twin.dx, baseY: baseY - 2, w: s.twin.w, h: s.twin.h, palette: HILL[s.twin.palette], ink: INK, rand, apex: 0.55, tufts: 6 });
  const hill = drawHill(ctx, { cx, baseY, w: s.w, h: s.h, palette: HILL[s.palette], ink: INK, rand, apex: s.apex, curve: s.curve, tufts: 12, rocks: 2 });
  const mouthBase = hill.bottom - 2.2;
  if (s.trail) trail(ctx, mx, mouthBase + 2, mx + rand.range(-5, 5), H - 3, m.w * 0.5, m.w * 0.8);
  for (const p of s.props ?? []) drawProp(ctx, rand, { kind: p.kind, u: 0, v: 0, s: p.s }, mx + p.dx, mouthBase + p.dy);
  if (s.frame === 'dolmen') {
    const hw = m.w / 2;
    for (const side of [-1, 1]) {
      const x = mx + side * (hw + 2.4);
      drawBoulder(ctx, { cx: x, cy: mouthBase - m.h * 0.35, rx: 3.6, ry: m.h * 0.5, rock: STONE.gray, ink: INK, rand, shadow: false });
    }
    drawBoulder(ctx, { cx: mx, cy: mouthBase - m.h - 1.5, rx: hw + 7, ry: 4.2, rock: STONE.pale, ink: INK, rand, shadow: false });
  }
  drawCaveMouth(ctx, { cx: mx, baseY: mouthBase, w: m.w, h: m.h, rock: s.frame === 'none' ? '#7a6a50' : STONE.gray, ink: INK, rand, arch: m.arch, teeth: m.teeth, eyes: m.eyes, glow: m.glow, floor: m.floor, rim: s.frame === 'none' ? 1.6 : m.rim });
  if (s.lair) {
    drawBones(ctx, rand, mx - m.w * 0.6, mouthBase + 5, m.w * 0.3, 3, INK);
    drawSkull(ctx, mx + m.w * 0.64, mouthBase + 3.5, 3, INK);
  }
  for (let i = 0; i < 4; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const r = rand.range(2.2, 3.6);
    drawBoulder(ctx, { cx: mx + side * (m.w / 2 + rand.range(5, 12)), cy: mouthBase + rand.range(2, 5), rx: r, ry: r * 0.8, rock: STONE.gray, ink: INK, rand, shadow: true, simple: r < 2.8 });
  }
}

const HILL_CAVES: HillCaveSpec[] = [
  { palette: 'green', w: 96, h: 56, mouth: { dx: 2, w: 26, h: 22, arch: 0.85, teeth: 2, floor: DIRT }, frame: 'rim' },
  { palette: 'green', w: 90, h: 52, apex: 0.4, mouth: { dx: 0, w: 24, h: 21, arch: 0.3, teeth: 0, floor: DIRT }, frame: 'dolmen', props: [{ kind: 'bush', dx: -26, dy: 4, s: 10 }] },
  { palette: 'brown', w: 94, h: 58, apex: 0.62, curve: 0.8, mouth: { dx: -3, w: 28, h: 23, arch: 1.0, teeth: 3, eyes: '#ffd84a', floor: '#b79d78' }, frame: 'rim' },
  {
    palette: 'green',
    w: 100,
    h: 50,
    apex: 0.5,
    mouth: { dx: 4, w: 25, h: 20, arch: 0.8, teeth: 2, floor: DIRT },
    frame: 'rim',
    trail: true,
    props: [
      { kind: 'round', dx: -34, dy: -4, s: 14 },
      { kind: 'round', dx: 36, dy: -6, s: 12 },
    ],
    twin: { dx: -30, w: 46, h: 36, palette: 'green' },
  },
  { palette: 'dry', w: 92, h: 54, apex: 0.45, mouth: { dx: 0, w: 30, h: 22, arch: 0.6, teeth: 4, floor: '#d5bd8f' }, frame: 'rim', lair: true },
];

interface CrystalCaveSpec {
  rock: string;
  w: number;
  h: number;
  boxy: number;
  lean: number;
  colors: string[];
  mouth: { dx: number; w: number; h: number; arch: number; teeth: number };
  outside: { dx: number; h: number; count: number }[];
}

function crystalCave(ctx: Ctx2D, rand: Rng, s: CrystalCaveSpec, W: number, H: number): void {
  const cx = W / 2;
  const baseY = H * 0.88;
  const m = s.mouth;
  const mx = cx + m.dx;
  const glow = s.colors[0]!;
  softBlob(ctx, mx, baseY + 5, m.w * 1.5, 11, glow, 0.5);
  drawOutcrop(ctx, { cx, baseY, w: s.w, h: s.h, rock: s.rock, ink: INK, rand, boxy: s.boxy, lean: s.lean, ledges: 2 });
  drawCaveMouth(ctx, {
    cx: mx,
    baseY: baseY - 1,
    w: m.w,
    h: m.h,
    rock: s.rock,
    ink: INK,
    rand,
    arch: m.arch,
    teeth: m.teeth,
    glow,
    floor: '#d8e8ff',
    inside: () => drawCrystalCluster(ctx, rand, { cx: mx, baseY: baseY + 1.5, spread: m.w * 0.9, h: m.h * 0.7, count: 5, colors: s.colors, ink: INK, halo: 0.5 }),
  });
  softBlob(ctx, mx, baseY + 6, m.w * 0.8, 5, '#ffffff', 0.16);
  for (const c of s.outside) {
    drawCrystalCluster(ctx, rand, { cx: cx + c.dx, baseY: baseY + 3 + rand.range(0, 3), spread: c.h * 0.9, h: c.h, count: c.count, colors: s.colors, ink: INK, halo: 0.4 });
  }
  const topAt = baseY - s.h * 0.92;
  drawCrystalCluster(ctx, rand, { cx: cx + s.lean * s.w * 0.14, baseY: topAt + 4, spread: 12, h: 14, count: 3, colors: s.colors, ink: INK, halo: 0.35 });
}

const CRYSTALS: CrystalCaveSpec[] = [
  { rock: '#6f6a86', w: 78, h: 54, boxy: 2.3, lean: -0.1, colors: ['#59d8f0', '#8ae9ff', '#3cb4e0'], mouth: { dx: 2, w: 28, h: 26, arch: 0.85, teeth: 3 }, outside: [{ dx: -30, h: 17, count: 4 }, { dx: 31, h: 13, count: 3 }] },
  { rock: '#7a6286', w: 70, h: 62, boxy: 3, lean: 0.2, colors: ['#a47bff', '#c8a2ff', '#8a5cf0'], mouth: { dx: -3, w: 22, h: 32, arch: 1.2, teeth: 2 }, outside: [{ dx: 28, h: 18, count: 4 }, { dx: -33, h: 11, count: 3 }] },
  { rock: '#7d6a73', w: 86, h: 48, boxy: 2.6, lean: 0, colors: ['#ff7fc8', '#ffa8dc', '#e85aa8'], mouth: { dx: 0, w: 34, h: 23, arch: 0.55, teeth: 5 }, outside: [{ dx: -36, h: 14, count: 3 }, { dx: 34, h: 17, count: 4 }] },
  { rock: '#58747a', w: 74, h: 58, boxy: 2.4, lean: -0.25, colors: ['#5fe39a', '#9af5be', '#3dc47a'], mouth: { dx: 4, w: 26, h: 28, arch: 0.95, teeth: 3 }, outside: [{ dx: -27, h: 15, count: 3 }, { dx: 34, h: 12, count: 3 }] },
  { rock: '#7e705a', w: 80, h: 56, boxy: 2.9, lean: 0.12, colors: ['#ffb14a', '#ffd27a', '#f08a2a'], mouth: { dx: -2, w: 30, h: 26, arch: 0.7, teeth: 4 }, outside: [{ dx: 30, h: 16, count: 4 }, { dx: -32, h: 12, count: 3 }] },
];

const entranceSymbol = (id: string, name: string, specs: EntranceSpec[], order: number, tags: string[]): ReturnType<typeof defineSymbol> =>
  defineSymbol({
    id,
    name,
    category: 'volcanic',
    size: [100, 86],
    anchor: [0.5, 0.88],
    layer: 'object',
    placement: 'land',
    order,
    tags,
    variants: specs.length,
    draw({ ctx, rand, variant, w, h }) {
      entrance(ctx, rand, specs[variant % specs.length]!, w, h);
    },
  });

export default [
  entranceSymbol('cave.entrance', 'Cave Entrance', ENTRANCES, 620, ['cave', 'cavern', 'entrance', 'rock', 'lair', 'dungeon']),
  defineSymbol({
    id: 'cave.hill',
    name: 'Hill Cave',
    category: 'volcanic',
    size: [112, 84],
    anchor: [0.5, 0.82],
    layer: 'object',
    placement: 'land',
    order: 630,
    tags: ['cave', 'hill', 'barrow', 'burrow', 'entrance', 'dungeon'],
    variants: HILL_CAVES.length,
    draw({ ctx, rand, variant, w, h }) {
      hillCave(ctx, rand, HILL_CAVES[variant % HILL_CAVES.length]!, w, h);
    },
  }),
  defineSymbol({
    id: 'cave.crystal',
    name: 'Crystal Cave',
    category: 'volcanic',
    size: [100, 86],
    anchor: [0.5, 0.88],
    layer: 'object',
    placement: 'land',
    order: 640,
    tags: ['cave', 'crystal', 'gem', 'glow', 'magic', 'mine'],
    variants: CRYSTALS.length,
    draw({ ctx, rand, variant, w, h }) {
      crystalCave(ctx, rand, CRYSTALS[variant % CRYSTALS.length]!, w, h);
    },
  }),
  entranceSymbol('cave.mine', 'Mine Entrance', MINES, 650, ['cave', 'mine', 'dwarf', 'dwarven', 'entrance', 'timber', 'rails']),
];
