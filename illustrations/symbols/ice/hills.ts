import { defineSymbol } from '../../kit/define';
import { rgba } from '../../kit/colors';
import { clipped, shape } from '../../kit/draw';
import type { Ctx2D, Rng, SymbolDef } from '../../kit/types';
import { COOL_INK, STONE, drawBoulder, shifted } from '../../parts/relief-common';
import { drawHill, type HillGeometry, type HillPalette } from '../../parts/relief-hill';
import { sparkle } from '../../parts/relief-ice';

const ICE_HILL: HillPalette = { lit: '#ffffff', base: '#e6f0fa', shade: '#b8cde6', deep: '#8aa6cf', tuft: '#8b8a62', tuftLight: '#d8cf9a' };
const BLUE_HILL: HillPalette = { lit: '#eaf4fc', base: '#c4d9ee', shade: '#93b0d6', deep: '#6d8dbb', tuft: '#7d8a6a', tuftLight: '#cfd9a6' };

interface HillSpec {
  x: number;
  w: number;
  h: number;
  /** Ground offset in design units (negative = further back). */
  y?: number;
  apex?: number;
  curve?: number;
  snow?: number;
  tufts?: number;
  rocks?: number;
  palette?: HillPalette;
}

/** Wind-carved ripples across the slope. */
function ripples(ctx: Ctx2D, rand: Rng, g: HillGeometry, count: number): void {
  clipped(ctx, g.polygon, () => {
    for (let i = 0; i < count; i++) {
      const x = g.left + g.w * rand.range(0.14, 0.86);
      const top = g.topAt(x);
      const y = top + (g.bottom - top) * rand.range(0.3, 0.8);
      const len = g.w * rand.range(0.08, 0.16);
      const pts: [number, number][] = [[x - len / 2, y + 0.7], [x, y - 0.5], [x + len / 2, y + 0.5]];
      shape(ctx, pts, { stroke: rgba('#6f8fc0', 0.45), width: 0.8, closed: false, smooth: true });
      shape(ctx, shifted(pts, -0.4, -1), { stroke: rgba('#ffffff', 0.85), width: 0.7, closed: false, smooth: true });
    }
  });
}

function hills(ctx: Ctx2D, rand: Rng, w: number, baseY: number, list: readonly HillSpec[]): void {
  list.forEach((s, i) => {
    const hw = s.w * rand.range(0.95, 1.05);
    const hh = s.h * rand.range(0.95, 1.05);
    const cx = Math.min(w - hw / 2 - 1, Math.max(hw / 2 + 1, s.x));
    const g = drawHill(ctx, {
      cx,
      baseY: baseY + (s.y ?? 0),
      w: hw,
      h: hh,
      palette: s.palette ?? ICE_HILL,
      ink: COOL_INK,
      rand,
      apex: s.apex,
      curve: s.curve,
      snow: s.snow ?? 0,
      tufts: s.tufts ?? 0,
      shadow: i >= list.length - 2,
    });
    ripples(ctx, rand, g, Math.round(hw / 14));
    if (hh > 26) sparkle(ctx, g.apex[0] - hw * 0.1, g.apex[1] + hh * 0.24, 2.2);
    const rocks = s.rocks ?? 0;
    for (let k = 0; k < rocks; k++) {
      const rx = rand.range(2.6, 3.8);
      const bx = g.left + g.w * (0.1 + (0.8 * (k + rand.range(0.2, 0.8))) / rocks);
      drawBoulder(ctx, { cx: bx, cy: g.bottom - rx * 0.5, rx, ry: rx * 0.75, rock: STONE.gray, ink: COOL_INK, rand, snow: true, shadow: true });
    }
  });
}

const SINGLE: readonly (readonly HillSpec[])[] = [
  [{ x: 46, w: 84, h: 38 }],
  [{ x: 44, w: 90, h: 28, curve: 0.9, apex: 0.4, tufts: 7 }],
  [{ x: 30, w: 52, h: 30, y: -3, palette: BLUE_HILL }, { x: 58, w: 66, h: 38, snow: 0.3 }],
  [{ x: 46, w: 62, h: 46, curve: 0.55, apex: 0.46, rocks: 1 }],
  [{ x: 44, w: 80, h: 36, rocks: 2, tufts: 9, palette: BLUE_HILL }],
  [{ x: 24, w: 40, h: 22, y: -2 }, { x: 52, w: 72, h: 40, apex: 0.58, snow: 0.32 }],
];

const hill = defineSymbol({
  id: 'ice.hill',
  name: 'Snowy Ice Hill',
  category: 'ice',
  size: [92, 60],
  anchor: [0.5, 0.8],
  variants: SINGLE.length,
  order: 820,
  placement: 'land',
  tags: ['snow', 'frozen', 'hill', 'arctic', 'tundra', 'winter', 'mound'],
  draw({ ctx, rand, variant, w, h }) {
    hills(ctx, rand, w, h * 0.8, SINGLE[variant % SINGLE.length]!);
  },
});

const CLUSTERS: readonly (readonly HillSpec[])[] = [
  [{ x: 38, w: 60, h: 28, y: -6, palette: BLUE_HILL }, { x: 108, w: 64, h: 30, y: -6, palette: BLUE_HILL }, { x: 74, w: 84, h: 40, y: 2, snow: 0.3 }],
  [{ x: 30, w: 52, h: 26, y: -2, tufts: 5 }, { x: 80, w: 70, h: 38, y: -4, apex: 0.45, rocks: 1 }, { x: 122, w: 56, h: 28, y: 1, palette: BLUE_HILL }],
  [{ x: 36, w: 64, h: 32, y: -4 }, { x: 96, w: 74, h: 36, y: -4, curve: 0.85, palette: BLUE_HILL, tufts: 6 }, { x: 66, w: 56, h: 30, y: 4, apex: 0.6 }, { x: 124, w: 40, h: 22, y: 3 }],
];

const cluster = defineSymbol({
  id: 'ice.hill.cluster',
  name: 'Snowy Hills',
  category: 'ice',
  size: [156, 72],
  anchor: [0.5, 0.8],
  variants: CLUSTERS.length,
  order: 830,
  placement: 'land',
  tags: ['snow', 'frozen', 'hills', 'arctic', 'tundra', 'winter', 'cluster'],
  draw({ ctx, rand, variant, w, h }) {
    hills(ctx, rand, w, h * 0.8, CLUSTERS[variant % CLUSTERS.length]!);
  },
});

const defs: SymbolDef[] = [hill, cluster];
export default defs;
