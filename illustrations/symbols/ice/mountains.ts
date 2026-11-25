import { defineSymbol } from '../../kit/define';
import type { Ctx2D, Rng, SymbolDef } from '../../kit/types';
import { drawIceMountain, drawSnowFoot } from '../../parts/relief-ice';

interface PeakSpec {
  /** Center x and size as shares of the box. */
  x: number;
  w: number;
  h: number;
  /** Ground offset as a share of the box height (negative = further back). */
  y?: number;
  lean?: number;
  rugged?: number;
  snow?: number;
  glacier?: 'left' | 'right';
}

function massif(ctx: Ctx2D, rand: Rng, w: number, h: number, baseY: number, peaks: readonly PeakSpec[], foot: number): void {
  let x0 = w;
  let x1 = 0;
  peaks.forEach((p, i) => {
    const pw = w * p.w * rand.range(0.95, 1.05);
    const cx = Math.min(w - pw * 0.5 - 1, Math.max(pw * 0.5 + 1, w * p.x));
    const by = baseY + h * (p.y ?? 0);
    drawIceMountain(ctx, {
      cx,
      baseY: by,
      w: pw,
      h: Math.min(h * p.h * rand.range(0.95, 1.05), by - 3),
      lean: p.lean ?? rand.range(-0.08, 0.08),
      rugged: p.rugged,
      snow: p.snow,
      glacier: p.glacier,
      rand,
      shadow: i >= peaks.length - 2,
    });
    x0 = Math.min(x0, cx - pw * 0.42);
    x1 = Math.max(x1, cx + pw * 0.42);
  });
  drawSnowFoot(ctx, { x0: Math.max(1, x0), x1: Math.min(w - 1, x1), y: baseY - 1, h: foot, rand, blocks: 2 });
}

const MOUNTAINS: readonly (readonly PeakSpec[])[] = [
  [{ x: 0.5, w: 0.94, h: 0.9, rugged: 1.3 }],
  [{ x: 0.27, w: 0.5, h: 0.56, y: -0.02 }, { x: 0.64, w: 0.66, h: 0.88, glacier: 'right' }],
  [{ x: 0.2, w: 0.46, h: 0.56, y: -0.03 }, { x: 0.8, w: 0.46, h: 0.62, y: -0.03 }, { x: 0.5, w: 0.62, h: 0.9 }],
  [{ x: 0.5, w: 1, h: 0.66, rugged: 1.25, snow: 0.85, glacier: 'left' }],
  [{ x: 0.8, w: 0.36, h: 0.42, y: -0.02 }, { x: 0.44, w: 0.66, h: 0.94, lean: -0.08, rugged: 1.5 }],
];

const mountain = defineSymbol({
  id: 'ice.mountain',
  name: 'Ice Mountain',
  category: 'ice',
  size: [112, 104],
  anchor: [0.5, 0.9],
  variants: MOUNTAINS.length,
  order: 800,
  placement: 'land',
  tags: ['glacier', 'snow', 'frozen', 'peak', 'arctic', 'winter', 'mountain'],
  draw({ ctx, rand, variant, w, h }) {
    massif(ctx, rand, w, h, h * 0.9, MOUNTAINS[variant % MOUNTAINS.length]!, 6);
  },
});

const RANGES: readonly (readonly PeakSpec[])[] = [
  [
    { x: 0.2, w: 0.3, h: 0.5, y: -0.1 },
    { x: 0.62, w: 0.34, h: 0.58, y: -0.1 },
    { x: 0.4, w: 0.36, h: 0.82, y: -0.02, glacier: 'right' },
    { x: 0.8, w: 0.3, h: 0.66 },
    { x: 0.15, w: 0.3, h: 0.6, y: 0.0 },
  ],
  [
    { x: 0.5, w: 0.34, h: 0.62, y: -0.1 },
    { x: 0.22, w: 0.38, h: 0.84, y: -0.02 },
    { x: 0.78, w: 0.38, h: 0.8, y: -0.02, glacier: 'left' },
    { x: 0.5, w: 0.4, h: 0.7, y: 0.02 },
  ],
  [
    { x: 0.16, w: 0.28, h: 0.5, y: -0.08 },
    { x: 0.84, w: 0.28, h: 0.5, y: -0.08 },
    { x: 0.35, w: 0.36, h: 0.8, y: -0.03 },
    { x: 0.66, w: 0.4, h: 0.96, y: 0.0, rugged: 1.5 },
  ],
];

const range = defineSymbol({
  id: 'ice.mountain.range',
  name: 'Ice Range',
  category: 'ice',
  size: [200, 112],
  anchor: [0.5, 0.9],
  variants: RANGES.length,
  order: 810,
  placement: 'land',
  tags: ['glacier', 'snow', 'frozen', 'range', 'arctic', 'winter', 'mountains', 'ridge'],
  draw({ ctx, rand, variant, w, h }) {
    massif(ctx, rand, w, h, h * 0.9, RANGES[variant % RANGES.length]!, 7);
  },
});

const defs: SymbolDef[] = [mountain, range];
export default defs;
