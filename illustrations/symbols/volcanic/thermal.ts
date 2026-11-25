import { defineSymbol } from '../../kit/define';
import type { Ctx2D, Rng } from '../../kit/types';
import { INK } from '../../parts/relief-common';
import { SINTER, drawGeyser, drawHotSpring, type SinterTones } from '../../parts/relief-thermal';

interface GeyserSpec {
  w: number;
  h: number;
  tones: SinterTones;
  jet: number;
  sprays?: number;
  steam?: number;
  lean?: number;
  /** Small neighbouring vent that only steams. */
  twin?: { dx: number; w: number; h: number };
}

const GEYSERS: GeyserSpec[] = [
  { w: 42, h: 16, tones: SINTER.cream, jet: 40, sprays: 2, steam: 9 },
  { w: 46, h: 14, tones: SINTER.gray, jet: 28, sprays: 4 },
  { w: 40, h: 18, tones: SINTER.rust, jet: 0 },
  { w: 40, h: 16, tones: SINTER.cream, jet: 36, sprays: 2, steam: 8, twin: { dx: -22, w: 26, h: 11 } },
  { w: 38, h: 15, tones: SINTER.gray, jet: 34, sprays: 2, steam: 8, lean: 8 },
  { w: 54, h: 20, tones: SINTER.rust, jet: 26, sprays: 3, steam: 7 },
];

function geyser(ctx: Ctx2D, rand: Rng, s: GeyserSpec, w: number, h: number): void {
  const cx = w / 2;
  const baseY = h - 14;
  if (s.twin) drawGeyser(ctx, { cx: cx + s.twin.dx, baseY: baseY - 3, w: s.twin.w, h: s.twin.h, rand, ink: INK, tones: s.tones, jet: 0 });
  drawGeyser(ctx, { cx: s.twin ? cx + 8 : cx, baseY, w: s.w, h: s.h, rand, ink: INK, tones: s.tones, jet: s.jet, sprays: s.sprays, steam: s.steam, lean: s.lean });
}

interface SpringSpec {
  rx: number;
  ry: number;
  crust: SinterTones;
  bands: string[];
  lobes?: number;
  mud?: boolean;
  rocks?: number;
  /** A smaller pool stepping up behind the main one. */
  upper?: { dx: number; dy: number; rx: number; ry: number };
}

const SPRINGS: SpringSpec[] = [
  { rx: 18, ry: 8.5, crust: SINTER.cream, bands: ['#e0d160', '#7fd3b8', '#45bccb', '#2488b5'] },
  { rx: 20, ry: 9, crust: SINTER.gray, bands: ['#9fe0dc', '#58c4d4', '#2f9cc4'], lobes: 2 },
  { rx: 19, ry: 8.5, crust: SINTER.rust, bands: ['#e6e46a', '#c8d23e', '#a2b82a'], lobes: 3 },
  { rx: 17, ry: 8, crust: SINTER.gray, bands: ['#a08a6c', '#7d6a52'], mud: true, rocks: 6 },
  { rx: 19, ry: 8.5, crust: SINTER.cream, bands: ['#a6dd92', '#6cba78', '#3c9a70'], lobes: 2 },
  { rx: 18, ry: 8, crust: SINTER.rust, bands: ['#8fd9ec', '#5aa6e8', '#3a6fd0'], upper: { dx: 14, dy: -12, rx: 10, ry: 4.4 } },
];

function spring(ctx: Ctx2D, rand: Rng, s: SpringSpec, w: number, h: number): void {
  const cx = w / 2 - (s.upper ? 4 : 0);
  const cy = h - 22;
  if (s.upper) {
    drawHotSpring(ctx, { cx: cx + s.upper.dx, cy: cy + s.upper.dy, rx: s.upper.rx, ry: s.upper.ry, rand, ink: INK, crust: s.crust, bands: s.bands, rocks: 2 });
  }
  drawHotSpring(ctx, { cx, cy, rx: s.rx, ry: s.ry, rand, ink: INK, crust: s.crust, bands: s.bands, lobes: s.lobes, mud: s.mud, rocks: s.rocks });
}

export default [
  defineSymbol({
    id: 'volcano.geyser',
    name: 'Geyser',
    category: 'volcanic',
    size: [76, 100],
    anchor: [0.5, 0.86],
    order: 600,
    tags: ['geyser', 'hot', 'steam', 'water', 'spring', 'volcanic'],
    placement: 'land',
    variants: GEYSERS.length,
    draw({ ctx, rand, variant, w, h }) {
      geyser(ctx, rand, GEYSERS[variant % GEYSERS.length]!, w, h);
    },
  }),
  defineSymbol({
    id: 'volcano.hotspring',
    name: 'Hot Spring',
    category: 'volcanic',
    size: [84, 64],
    anchor: [0.5, 0.66],
    order: 610,
    tags: ['hot spring', 'pool', 'steam', 'water', 'mud', 'sulfur', 'volcanic'],
    placement: 'land',
    variants: SPRINGS.length,
    draw({ ctx, rand, variant, w, h }) {
      spring(ctx, rand, SPRINGS[variant % SPRINGS.length]!, w, h);
    },
  }),
];
