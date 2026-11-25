import { rgba } from '../../kit/colors';
import { defineSymbol } from '../../kit/define';
import { clipped, ellipse, shape, softBlob, stipple } from '../../kit/draw';
import { blob } from '../../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../../kit/types';
import { INK, STONE, drawBoulder } from '../../parts/relief-common';
import { LAVA, drawLavaRiver } from '../../parts/relief-fire';

/** Points from `a` to `b` that sway sideways; both ends stay put. */
function swayPath(rand: Rng, a: Vec2, b: Vec2, n: number, amp: number): Vec2[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const ph = rand.range(0, 6);
  const out: Vec2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const off = amp * (Math.sin(t * 5.4 + ph) * 0.7 + Math.sin(t * 11.3 + ph * 2) * 0.3) * Math.sin(Math.PI * t) ** 0.6;
    out.push([a[0] + dx * t + nx * off, a[1] + dy * t + ny * off]);
  }
  return out;
}

interface Branch {
  /** Where along the main stream it splits off (0-1). */
  t: number;
  to: Vec2;
  amp: number;
  widths: number[];
}

interface FlowSpec {
  from: Vec2;
  to: Vec2;
  amp: number;
  widths: number[];
  cool?: number;
  branches?: Branch[];
  /** Short toes fanning out of the front of the flow. */
  toes?: number;
}

function flow(ctx: Ctx2D, rand: Rng, s: FlowSpec, w: number, h: number): void {
  const P = (p: Vec2): Vec2 => [p[0] * w, p[1] * h];
  const main = swayPath(rand, P(s.from), P(s.to), 8, s.amp);
  const mid: Vec2 = [(main[0]![0] + main[main.length - 1]![0]) / 2, (main[0]![1] + main[main.length - 1]![1]) / 2];
  softBlob(ctx, mid[0], mid[1], w * 0.52, h * 0.4, '#1f120d', 0.34);
  const cool = s.cool ?? 0;
  for (const b of s.branches ?? []) {
    const k = b.t * (main.length - 1);
    const i = Math.min(main.length - 2, Math.floor(k));
    const p0: Vec2 = [main[i]![0] + (main[i + 1]![0] - main[i]![0]) * (k - i), main[i]![1] + (main[i + 1]![1] - main[i]![1]) * (k - i)];
    drawLavaRiver(ctx, rand, swayPath(rand, p0, P(b.to), 6, b.amp), b.widths, { cool: cool + 0.1, capStart: false });
  }
  drawLavaRiver(ctx, rand, main, s.widths, { cool });
  const end = main[main.length - 1]!;
  const last = main[main.length - 2]!;
  const ang = Math.atan2(end[1] - last[1], end[0] - last[0]);
  const wEnd = s.widths[s.widths.length - 1]!;
  for (let i = 0; i < (s.toes ?? 0); i++) {
    const a = ang + (i - ((s.toes ?? 1) - 1) / 2) * 0.55 + rand.range(-0.12, 0.12);
    const len = rand.range(0.7, 1.1) * wEnd;
    const tx = Math.min(w - 3 - wEnd * 0.15, end[0] + Math.cos(a) * len);
    const ty = Math.max(3 + wEnd * 0.15, Math.min(h - 3 - wEnd * 0.15, end[1] + Math.sin(a) * len));
    drawLavaRiver(ctx, rand, [[end[0] - Math.cos(a) * 2, end[1] - Math.sin(a) * 2], [(end[0] + tx) / 2, (end[1] + ty) / 2 + rand.range(-1, 1)], [tx, ty]], [wEnd * 0.5, wEnd * 0.42, wEnd * 0.3], { glow: false, cool: cool + 0.1, capStart: false });
  }
  // Cooled lumps of rock caught along the edges.
  const lumps = 3 + Math.round(w / 40);
  for (let i = 0; i < lumps; i++) {
    const p = main[rand.int(1, main.length - 2)]!;
    const wd = s.widths[Math.min(s.widths.length - 1, Math.round((main.indexOf(p) / (main.length - 1)) * (s.widths.length - 1)))]!;
    const side = rand.sign();
    const r = rand.range(1.4, 2.6);
    drawBoulder(ctx, { cx: p[0] + side * rand.range(0.6, 1.1) * wd * 0.55, cy: p[1] + rand.range(-1, 1) * wd * 0.5, rx: r, ry: r * 0.75, rock: STONE.basalt, ink: INK, rand, shadow: false, simple: true });
  }
}

const FLOWS: FlowSpec[] = [
  { from: [0.07, 0.62], to: [0.8, 0.44], amp: 9, widths: [1.8, 4.5, 6.5, 8.5, 11, 14], toes: 3 },
  { from: [0.06, 0.5], to: [0.84, 0.3], amp: 7, widths: [2, 5, 7, 8, 9, 10], branches: [{ t: 0.45, to: [0.9, 0.82], amp: 6, widths: [2, 4.5, 6, 7.5, 8.5] }], toes: 2 },
  { from: [0.08, 0.35], to: [0.74, 0.6], amp: 6, widths: [3, 8, 11, 15, 18, 20], toes: 4 },
  { from: [0.06, 0.45], to: [0.94, 0.55], amp: 8, widths: [2, 3.6, 4.6, 5, 5.6, 5.6], branches: [{ t: 0.3, to: [0.86, 0.15], amp: 5, widths: [2, 3.2, 3.8, 4.6] }, { t: 0.5, to: [0.9, 0.86], amp: 5, widths: [2, 3.2, 4.2, 4.8] }] },
  { from: [0.07, 0.55], to: [0.8, 0.42], amp: 10, widths: [2.5, 6, 8.5, 10, 12, 13], cool: 0.75, toes: 3 },
];

interface PoolSpec {
  rx: number;
  ry: number;
  lobes: number;
  rot: number;
  plates: number;
  cool?: number;
  rocks: number;
  /** A crusted island in the middle. */
  island?: boolean;
  /** A second, smaller pool beside the first. */
  twin?: { dx: number; dy: number; rx: number; ry: number };
}

const POOLS: PoolSpec[] = [
  { rx: 24, ry: 17, lobes: 3, rot: 0.1, plates: 4, rocks: 6 },
  { rx: 28, ry: 13, lobes: 2, rot: -0.25, plates: 6, rocks: 7 },
  { rx: 22, ry: 18, lobes: 4, rot: 0.4, plates: 3, rocks: 5, island: true },
  { rx: 17, ry: 12, lobes: 3, rot: 0, plates: 3, rocks: 5, twin: { dx: 24, dy: 6, rx: 10, ry: 7 } },
  { rx: 25, ry: 17, lobes: 3, rot: 0.2, plates: 10, cool: 0.6, rocks: 6 },
  { rx: 21, ry: 14, lobes: 3, rot: 0.55, plates: 1, rocks: 9 },
];

function lavaPool(ctx: Ctx2D, rand: Rng, cx: number, cy: number, s: { rx: number; ry: number; lobes: number; rot: number; plates: number; cool?: number; rocks: number; island?: boolean }): void {
  const cool = s.cool ?? 0;
  softBlob(ctx, cx, cy, s.rx * 1.55, s.ry * 1.55, '#1f120d', 0.38);
  softBlob(ctx, cx, cy, s.rx * 1.25, s.ry * 1.25, LAVA.glow, 0.26 * (1 - cool * 0.6));
  const out = blob(rand, cx, cy, s.rx, s.ry, { points: 22, jitter: 0.06, lobes: s.lobes, lobeAmp: 0.12, rotation: s.rot });
  const scale = (k: number, dx = 0, dy = 0): Vec2[] => out.map((p): Vec2 => [cx + (p[0] - cx) * k + dx, cy + (p[1] - cy) * k + dy]);
  shape(ctx, scale(1.16), { fill: LAVA.crust, stroke: rgba('#140a07', 0.9), width: 1.2 });
  shape(ctx, scale(1), { fill: cool > 0.4 ? LAVA.deep : LAVA.red });
  shape(ctx, scale(0.78, -0.4, -0.3), { fill: cool > 0.4 ? LAVA.red : LAVA.mid });
  if (cool < 0.8) {
    shape(ctx, scale(0.52, -0.8, -0.5), { fill: LAVA.hot });
    shape(ctx, scale(0.26, -1.2, -0.7), { fill: LAVA.core });
  }
  const body = scale(1);
  clipped(ctx, body, () => {
    for (let i = 0; i < s.plates; i++) {
      const a = rand.range(0, 6.28);
      const d = Math.sqrt(rand.next()) * 0.85;
      const r = rand.range(0.14, 0.26) * s.rx;
      const px = cx + Math.cos(a) * s.rx * d;
      const py = cy + Math.sin(a) * s.ry * d;
      const plate = blob(rand, px, py, r * 1.3, r * 0.85, { points: 9, jitter: 0.22, rotation: rand.range(-0.6, 0.6) });
      shape(ctx, plate, { fill: rgba(LAVA.crust, 0.9), stroke: rgba(LAVA.hot, 0.55), width: 0.7 });
    }
    for (let i = 0; i < 4; i++) {
      const bx = cx + rand.range(-0.55, 0.55) * s.rx;
      const by = cy + rand.range(-0.55, 0.55) * s.ry;
      ellipse(ctx, bx, by, 1.8, 1.3, { stroke: rgba(LAVA.core, 0.85), width: 0.8 });
    }
    if (s.island) {
      const isl = blob(rand, cx + s.rx * 0.08, cy, s.rx * 0.3, s.ry * 0.3, { points: 10, jitter: 0.16 });
      shape(ctx, isl, { fill: STONE.basalt, stroke: rgba(INK, 0.9), width: 1 });
      shape(ctx, isl.map((p): Vec2 => [cx + (p[0] - cx) * 0.6 + s.rx * 0.03 - 1, cy + (p[1] - cy) * 0.6 - 1]), { fill: rgba(STONE.gray, 0.5) });
    }
  });
  stipple(ctx, rand, scale(1.1), Math.round(s.rx * 0.8), { color: '#120807', radius: 0.8, alpha: 0.5 });
  const items: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < s.rocks; i++) {
    const a = rand.range(0, 6.28);
    items.push({ x: cx + Math.cos(a) * s.rx * rand.range(1.2, 1.42), y: cy + Math.sin(a) * s.ry * rand.range(1.2, 1.45), r: rand.range(1.5, 3.2) });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) drawBoulder(ctx, { cx: it.x, cy: it.y, rx: it.r, ry: it.r * 0.78, rock: STONE.basalt, ink: INK, rand, shadow: false, simple: it.r < 2.3 });
}

function pool(ctx: Ctx2D, rand: Rng, s: PoolSpec, w: number, h: number): void {
  const cx = w / 2 - (s.twin ? 10 : 0);
  const cy = h / 2;
  if (s.twin) lavaPool(ctx, rand, cx + s.twin.dx, cy + s.twin.dy, { rx: s.twin.rx, ry: s.twin.ry, lobes: 2, rot: 0.3, plates: 1, rocks: 2 });
  lavaPool(ctx, rand, cx, cy, s);
}

export default [
  defineSymbol({
    id: 'lava.flow',
    name: 'Lava Flow',
    category: 'volcanic',
    size: [136, 68],
    anchor: [0.5, 0.5],
    layer: 'ground',
    rotatable: true,
    order: 700,
    tags: ['lava', 'flow', 'river', 'magma', 'fire', 'decal'],
    placement: 'land',
    variants: FLOWS.length,
    draw({ ctx, rand, variant, w, h }) {
      flow(ctx, rand, FLOWS[variant % FLOWS.length]!, w, h);
    },
  }),
  defineSymbol({
    id: 'lava.pool',
    name: 'Lava Pool',
    category: 'volcanic',
    size: [84, 64],
    anchor: [0.5, 0.5],
    layer: 'ground',
    rotatable: true,
    order: 710,
    tags: ['lava', 'pool', 'lake', 'magma', 'fire', 'decal'],
    placement: 'land',
    variants: POOLS.length,
    draw({ ctx, rand, variant, w, h }) {
      pool(ctx, rand, POOLS[variant % POOLS.length]!, w, h);
    },
  }),
];
