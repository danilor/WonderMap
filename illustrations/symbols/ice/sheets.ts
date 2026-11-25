import { defineSymbol } from '../../kit/define';
import type { SymbolDef } from '../../kit/types';
import { drawFrozenLake, drawGlacier, drawSnowdrift, type DriftOptions, type GlacierOptions, type LakeOptions } from '../../parts/relief-sheet';

type GlacierSpec = Omit<GlacierOptions, 'cx' | 'cy' | 'rand'>;
type LakeSpec = Omit<LakeOptions, 'cx' | 'cy' | 'rand'>;
type DriftSpec = Omit<DriftOptions, 'rand' | 'baseY'> & { dy: number };

const GLACIERS: readonly GlacierSpec[] = [
  { rx: 68, ry: 34, crevasses: 9 },
  { rx: 60, ry: 40, crevasses: 7, moraine: true },
  { rx: 70, ry: 28, crevasses: 6, pond: true },
  { rx: 56, ry: 42, crevasses: 10, moraine: true, pond: true },
];

const glacier = defineSymbol({
  id: 'ice.glacier',
  name: 'Glacier',
  category: 'ice',
  size: [160, 100],
  anchor: [0.5, 0.5],
  variants: GLACIERS.length,
  layer: 'ground',
  order: 860,
  placement: 'land',
  rotatable: true,
  tags: ['ice', 'glacier', 'frozen', 'crevasse', 'snow', 'arctic', 'polar', 'sheet'],
  draw({ ctx, rand, variant, w, h }) {
    drawGlacier(ctx, { cx: w / 2, cy: h / 2, rand, ...GLACIERS[variant % GLACIERS.length]! });
  },
});

const LAKES: readonly LakeSpec[] = [
  { rx: 46, ry: 30, snowy: 0.1 },
  { rx: 44, ry: 32, snowy: 0.7, hole: true },
  { rx: 50, ry: 26, snowy: 0.3 },
  { rx: 40, ry: 33, snowy: 0.5, hole: true },
];

const lake = defineSymbol({
  id: 'ice.frozen-lake',
  name: 'Frozen Lake',
  category: 'ice',
  size: [124, 88],
  anchor: [0.5, 0.5],
  variants: LAKES.length,
  layer: 'ground',
  order: 870,
  placement: 'land',
  rotatable: true,
  tags: ['ice', 'lake', 'frozen', 'pond', 'snow', 'arctic', 'polar', 'winter'],
  draw({ ctx, rand, variant, w, h }) {
    drawFrozenLake(ctx, { cx: w / 2, cy: h / 2, rand, ...LAKES[variant % LAKES.length]! });
  },
});

const DRIFTS: readonly (readonly DriftSpec[])[] = [
  [{ cx: 36, dy: 0, w: 54, h: 15, crest: 0.62, ripples: 5 }],
  [{ cx: 36, dy: 0, w: 66, h: 12, crest: 0.45, ripples: 6 }],
  [{ cx: 36, dy: 0, w: 36, h: 14, crest: 0.7, ripples: 3 }],
  [{ cx: 26, dy: -3, w: 38, h: 12, crest: 0.6, ripples: 3 }, { cx: 46, dy: 3, w: 44, h: 16, crest: 0.58, ripples: 4 }],
  [{ cx: 20, dy: 0, w: 28, h: 9, crest: 0.6, ripples: 2 }, { cx: 42, dy: -4, w: 34, h: 13, crest: 0.64, ripples: 3 }, { cx: 56, dy: 4, w: 24, h: 8, crest: 0.55, ripples: 2 }],
  [{ cx: 36, dy: 0, w: 62, h: 19, crest: 0.34, ripples: 4 }],
];

const drift = defineSymbol({
  id: 'ice.snowdrift',
  name: 'Snowdrift',
  category: 'ice',
  size: [72, 36],
  anchor: [0.5, 0.7],
  variants: DRIFTS.length,
  layer: 'ground',
  order: 880,
  placement: 'land',
  tags: ['ice', 'snow', 'drift', 'dune', 'winter', 'arctic', 'polar', 'ground'],
  draw({ ctx, rand, variant, h }) {
    const base = h * 0.7;
    DRIFTS[variant % DRIFTS.length]!
      .slice()
      .sort((a, b) => a.dy - b.dy)
      .forEach((d) => drawSnowdrift(ctx, { cx: d.cx, baseY: base + d.dy, w: d.w, h: d.h, crest: d.crest, ripples: d.ripples, rand }));
  },
});

const defs: SymbolDef[] = [glacier, lake, drift];
export default defs;
