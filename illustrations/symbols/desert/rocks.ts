import { defineSymbol } from '../../kit/define';
import { stackTiers, type RockTier } from '../../parts/nature-rock';
import { ORANGE, PALE, RED, TAN, UMBER, paintTower, scatter, skirt, type Stone, type TowerPlan } from '../../parts/nature-stone';

/* ------------------------------------------------------------------------------------ */
/* Mesa                                                                                 */
/* ------------------------------------------------------------------------------------ */

const mesa = defineSymbol({
  id: 'desert.mesa',
  name: 'Mesa',
  category: 'desert',
  size: [116, 96],
  anchor: [0.5, 0.82],
  order: 80,
  tags: ['mesa', 'plateau', 'rock', 'desert', 'cliff', 'badlands', 'red rock'],
  placement: 'land',
  variants: 6,
  draw({ ctx, w, h, rand, variant }) {
    const cx = w / 2;
    const baseY = h * 0.82;
    const plans: TowerPlan[][] = [
      // classic red mesa
      [
        {
          cx,
          baseY,
          rx: 44,
          squash: 0.22,
          square: 3,
          wobble: 0.06,
          rough: 0.6,
          top: RED.top,
          tufts: 2,
          rocks: 1,
          tiers: [skirt(RED, 15, 1.14, 0.88), ...stackTiers(RED.bands, [15, 14, 12], [0.88, 0.87, 0.85, 0.83])],
        },
      ],
      // stepped orange mesa
      [
        {
          cx,
          baseY,
          rx: 44,
          squash: 0.22,
          square: 2.6,
          wobble: 0.07,
          rough: 0.6,
          top: ORANGE.top,
          tufts: 1,
          rocks: 2,
          tiers: [skirt(ORANGE, 13, 1.12, 0.92), ...stackTiers(ORANGE.bands, [14, 11], [0.92, 0.9, 0.88]), ...stackTiers(ORANGE.bands.slice(2), [13, 9], [0.62, 0.61, 0.6])],
        },
      ],
      // twin mesas
      [
        { cx: cx + 22, baseY: baseY - 14, rx: 30, squash: 0.24, square: 3, rough: 0.6, top: TAN.top, tufts: 1, tiers: [skirt(TAN, 8, 1.1, 0.86), ...stackTiers(TAN.bands, [10, 9, 8], [0.86, 0.86, 0.85, 0.84])] },
        { cx: cx - 20, baseY: baseY + 1, rx: 33, squash: 0.24, square: 3, rough: 0.6, top: RED.top, tufts: 1, rocks: 1, tiers: [skirt(RED, 12, 1.12, 0.88), ...stackTiers(RED.bands, [14, 12, 10], [0.88, 0.87, 0.85, 0.84])] },
      ],
      // pale sandstone with a dark cap rock
      [
        {
          cx,
          baseY,
          rx: 44,
          squash: 0.22,
          square: 2.4,
          wobble: 0.07,
          rough: 0.6,
          top: UMBER.top,
          tufts: 1,
          rocks: 2,
          tiers: [skirt(PALE, 13, 1.1, 0.78), ...stackTiers(PALE.bands, [14, 12, 10], [0.78, 0.77, 0.76, 0.75]), { h: 9, r0: 0.88, r1: 0.86, color: UMBER.bands[1]!, lines: 0 }],
        },
      ],
      // brown mesa with scrub on top
      [
        {
          cx,
          baseY,
          rx: 44,
          squash: 0.22,
          square: 3.4,
          wobble: 0.08,
          rough: 0.6,
          top: UMBER.top,
          tufts: 3,
          rocks: 2,
          tiers: [skirt(UMBER, 14, 1.12, 0.86), ...stackTiers(UMBER.bands, [15, 13, 12], [0.86, 0.85, 0.84, 0.83])],
        },
      ],
      // long low mesa
      [
        {
          cx,
          baseY: baseY + 2,
          rx: 50,
          squash: 0.2,
          square: 3.2,
          wobble: 0.05,
          rough: 0.6,
          top: TAN.top,
          tufts: 2,
          rocks: 1,
          tiers: [skirt(TAN, 10, 1.1, 0.9), ...stackTiers(TAN.bands, [10, 9, 9, 7], [0.9, 0.89, 0.88, 0.87, 0.86])],
        },
      ],
    ];
    const plan = plans[variant % plans.length]!;
    for (const p of plan) paintTower(ctx, rand, p);
    const lead = plan[plan.length - 1]!;
    scatter(ctx, rand, lead.cx, lead.baseY, lead.rx, lead.rx * (lead.squash ?? 0.3), 4, 2);
  },
});

/* ------------------------------------------------------------------------------------ */
/* Butte                                                                                */
/* ------------------------------------------------------------------------------------ */

const butte = defineSymbol({
  id: 'desert.butte',
  name: 'Butte',
  category: 'desert',
  size: [84, 112],
  anchor: [0.5, 0.86],
  order: 90,
  tags: ['butte', 'rock', 'pillar', 'tower', 'desert', 'badlands', 'red rock'],
  placement: 'land',
  variants: 6,
  draw({ ctx, w, h, rand, variant }) {
    const cx = w / 2;
    const baseY = h * 0.86;
    const common = { squash: 0.26, rough: 0.7 };
    const plans: TowerPlan[][] = [
      // classic red tower
      [{ ...common, cx, baseY, rx: 26, square: 2.6, wobble: 0.06, top: RED.top, tufts: 1, tiers: [skirt(RED, 14, 1.3, 0.8), ...stackTiers(RED.bands, [20, 17, 15], [0.8, 0.79, 0.78, 0.77])] }],
      // mushroom cap on a narrow stem
      [
        {
          ...common,
          cx,
          baseY,
          rx: 28,
          square: 2.4,
          wobble: 0.07,
          rough: 0.9,
          top: RED.top,
          tufts: 1,
          rocks: 1,
          tiers: [skirt(ORANGE, 14, 1.2, 0.62), ...stackTiers(ORANGE.bands, [18, 14], [0.62, 0.56, 0.5]), { h: 14, r0: 0.98, r1: 0.94, color: RED.bands[1]!, lines: 1, grooves: 0.4 }],
        },
      ],
      // slim pinnacle
      [
        {
          ...common,
          cx,
          baseY,
          rx: 20,
          squash: 0.28,
          square: 2.2,
          wobble: 0.08,
          rough: 0.9,
          top: TAN.top,
          tiers: [skirt(TAN, 16, 1.7, 0.72), ...stackTiers(TAN.bands, [22, 18, 16], [0.72, 0.68, 0.62, 0.52])],
        },
      ],
      // twin buttes
      [
        { ...common, cx: cx + 16, baseY: baseY - 8, rx: 20, square: 2.6, top: PALE.top, tiers: [skirt(PALE, 10, 1.25, 0.8), ...stackTiers(PALE.bands, [16, 14, 14], [0.8, 0.79, 0.78, 0.76])] },
        { ...common, cx: cx - 14, baseY: baseY + 2, rx: 23, square: 2.6, top: RED.top, tufts: 1, tiers: [skirt(RED, 12, 1.25, 0.82), ...stackTiers(RED.bands, [14, 12, 12], [0.82, 0.8, 0.79, 0.77])] },
      ],
      // pale butte with a dark band
      [
        {
          ...common,
          cx,
          baseY,
          rx: 25,
          square: 2.8,
          top: PALE.top,
          tufts: 1,
          rocks: 1,
          tiers: [skirt(PALE, 13, 1.25, 0.8), ...stackTiers([PALE.bands[0]!, PALE.bands[1]!, UMBER.bands[1]!, PALE.bands[2]!], [14, 12, 8, 14], [0.8, 0.79, 0.79, 0.8, 0.8])],
        },
      ],
      // stepped orange butte
      [
        {
          ...common,
          cx,
          baseY,
          rx: 28,
          square: 2.6,
          top: ORANGE.top,
          tufts: 1,
          tiers: [skirt(ORANGE, 12, 1.25, 0.92), ...stackTiers(ORANGE.bands, [14, 12], [0.92, 0.9, 0.88]), ...stackTiers(ORANGE.bands.slice(2), [16, 14], [0.56, 0.55, 0.52])],
        },
      ],
    ];
    const plan = plans[variant % plans.length]!;
    for (const p of plan) paintTower(ctx, rand, p);
    const lead = plan[plan.length - 1]!;
    scatter(ctx, rand, lead.cx, lead.baseY, lead.rx * 1.2, lead.rx * (lead.squash ?? 0.3), 4, 2);
  },
});

/* ------------------------------------------------------------------------------------ */
/* Hoodoos                                                                              */
/* ------------------------------------------------------------------------------------ */

interface Hoodoo {
  stone: Stone;
  cx: number;
  baseY: number;
  rx: number;
  skirtH: number;
  /** Heights of the stem bands and the footprint scale at each boundary. */
  bands: number[];
  r: number[];
  cap?: { h: number; r: number; color: string };
  rocks?: number;
  fin?: boolean;
}

function hoodoo(s: Hoodoo): TowerPlan {
  const tiers: RockTier[] = [skirt(s.stone, s.skirtH, s.fin ? 1.2 : 1.5, s.r[0]!), ...stackTiers(s.stone.bands, s.bands, s.r, { grooves: 0.5, lines: 1 })];
  if (s.cap) tiers.push({ h: s.cap.h, r0: s.cap.r, r1: s.cap.r - 0.05, color: s.cap.color, lines: 0, grooves: 0.4 });
  return {
    cx: s.cx,
    baseY: s.baseY,
    rx: s.rx,
    squash: s.fin ? 0.13 : 0.3,
    square: s.fin ? 3.4 : 2.2,
    wobble: 0.08,
    rough: 0.9,
    inkW: 1.2,
    top: s.cap ? s.cap.color : s.stone.top,
    tiers,
    rocks: s.rocks,
    shadow: 10,
  };
}

const spires = defineSymbol({
  id: 'desert.spires',
  name: 'Sandstone Spires',
  category: 'desert',
  size: [104, 108],
  anchor: [0.5, 0.86],
  order: 100,
  tags: ['spires', 'hoodoo', 'pillars', 'rock', 'desert', 'badlands', 'sandstone', 'balanced rock'],
  placement: 'land',
  variants: 6,
  draw({ ctx, w, h, rand, variant }) {
    const cx = w / 2;
    const y0 = h * 0.86;
    const cap = (r: number, color: string, hh = 11) => ({ h: hh, r, color });
    const groups: Hoodoo[][] = [
      // trio of capped hoodoos
      [
        { stone: RED, cx: cx + 8, baseY: y0 - 6, rx: 11, skirtH: 7, bands: [14, 10, 8], r: [0.66, 0.5, 0.46, 0.5], cap: cap(1, UMBER.bands[2]!) },
        { stone: RED, cx: cx - 22, baseY: y0 + 1, rx: 14, skirtH: 8, bands: [16, 12, 9], r: [0.7, 0.52, 0.46, 0.5], cap: cap(1.02, RED.bands[0]!, 12) },
        { stone: ORANGE, cx: cx + 28, baseY: y0 + 3, rx: 9, skirtH: 6, bands: [11, 8], r: [0.7, 0.54, 0.5], cap: cap(0.98, ORANGE.bands[0]!, 8) },
      ],
      // slim pillars with ragged tops
      [
        { stone: TAN, cx: cx - 4, baseY: y0 - 8, rx: 10, skirtH: 6, bands: [16, 12, 10], r: [0.72, 0.66, 0.58, 0.46] },
        { stone: TAN, cx: cx + 22, baseY: y0 - 3, rx: 9, skirtH: 6, bands: [12, 10, 8], r: [0.74, 0.68, 0.6, 0.5] },
        { stone: TAN, cx: cx - 28, baseY: y0 - 1, rx: 8, skirtH: 5, bands: [10, 8, 7], r: [0.76, 0.7, 0.62, 0.52] },
        { stone: PALE, cx: cx + 4, baseY: y0 + 5, rx: 11, skirtH: 6, bands: [12, 9, 7], r: [0.74, 0.66, 0.58, 0.46] },
      ],
      // balanced rock
      [
        { stone: UMBER, cx: cx - 26, baseY: y0 - 2, rx: 9, skirtH: 5, bands: [10, 8], r: [0.72, 0.58, 0.52], cap: cap(0.96, UMBER.bands[0]!, 7) },
        { stone: RED, cx: cx + 22, baseY: y0 - 3, rx: 9, skirtH: 6, bands: [12, 9], r: [0.7, 0.56, 0.5], cap: cap(0.96, RED.bands[0]!, 8) },
        { stone: RED, cx, baseY: y0 + 2, rx: 15, skirtH: 9, bands: [18, 14, 10], r: [0.6, 0.42, 0.38, 0.44], cap: cap(1.15, UMBER.bands[1]!, 15), rocks: 1 },
      ],
      // rock fins
      [
        { stone: ORANGE, cx: cx + 12, baseY: y0 - 6, rx: 22, skirtH: 6, bands: [24, 18, 14], r: [0.78, 0.66, 0.5, 0.26], fin: true },
        { stone: RED, cx: cx - 16, baseY: y0 + 4, rx: 15, skirtH: 6, bands: [16, 12, 9], r: [0.8, 0.68, 0.5, 0.28], fin: true },
      ],
      // pale cones with boulder caps
      [
        { stone: PALE, cx: cx - 10, baseY: y0 - 2, rx: 16, skirtH: 4, bands: [18, 16, 12], r: [1, 0.74, 0.5, 0.3], rocks: 2 },
        { stone: PALE, cx: cx + 24, baseY: y0 + 2, rx: 12, skirtH: 3, bands: [12, 10, 8], r: [1, 0.74, 0.5, 0.3], rocks: 1 },
        { stone: TAN, cx: cx - 32, baseY: y0 + 4, rx: 8, skirtH: 3, bands: [9, 7], r: [1, 0.7, 0.4], rocks: 1 },
      ],
      // banded red pillars
      [
        { stone: RED, cx: cx - 20, baseY: y0 - 4, rx: 12, skirtH: 7, bands: [18, 14, 12], r: [0.7, 0.62, 0.56, 0.5], cap: cap(0.72, ORANGE.bands[1]!, 6) },
        { stone: RED, cx: cx + 16, baseY: y0 - 2, rx: 13, skirtH: 7, bands: [14, 12, 8], r: [0.72, 0.64, 0.56, 0.5] },
        { stone: ORANGE, cx: cx - 2, baseY: y0 + 5, rx: 10, skirtH: 6, bands: [10, 8, 6], r: [0.74, 0.66, 0.6, 0.54] },
      ],
    ];
    const group = groups[variant % groups.length]!;
    const plans = group.map(hoodoo).sort((a, b) => a.baseY - b.baseY);
    for (const p of plans) paintTower(ctx, rand, p);
    scatter(ctx, rand, cx, y0 + 2, 40, 7, 4, 2);
  },
});

export default [mesa, butte, spires];
