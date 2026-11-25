import { defineSymbol } from '../../kit/define';
import type { SymbolDef } from '../../kit/types';
import { INK, STONE, drawBoulder, tuft, type BoulderOptions } from '../../parts/relief-common';
import { drawMesa } from '../../parts/relief-butte';
import { drawArch, drawCairn, drawHoodoo } from '../../parts/relief-stack';
import { drawMassif, drawTower, type TowerSpec } from '../../parts/relief-tower';

type Layout = readonly TowerSpec[];

/** Towers are listed back to front; `y` is the ground offset (negative = further away). */
const SINGLE_LAYOUTS: readonly Layout[] = [
  // Main massif with two lower flankers.
  [
    { x: 0.24, w: 0.46, h: 0.5, y: -0.05, lean: -0.1 },
    { x: 0.78, w: 0.42, h: 0.46, y: -0.05, lean: 0.1 },
    { x: 0.5, w: 0.8, h: 0.84, y: 0.01, segs: 7 },
  ],
  // Twin horns.
  [
    { x: 0.3, w: 0.54, h: 0.66, y: -0.02, flare: 1.4, lean: -0.06, segs: 7 },
    { x: 0.68, w: 0.6, h: 0.86, y: 0.02, flare: 1.5, lean: 0.06, segs: 7 },
  ],
  // Lone leaning horn with stumps.
  [
    { x: 0.2, w: 0.34, h: 0.34, y: -0.01 },
    { x: 0.84, w: 0.32, h: 0.4, y: 0 },
    { x: 0.5, w: 0.66, h: 0.88, y: 0.01, flare: 1.6, lean: 0.12, segs: 8 },
  ],
  // Sawtooth ridge.
  [
    { x: 0.5, w: 0.4, h: 0.6, y: -0.05, flare: 1.3 },
    { x: 0.2, w: 0.38, h: 0.5, y: -0.01, lean: -0.1 },
    { x: 0.8, w: 0.38, h: 0.56, y: -0.01, lean: 0.1 },
    { x: 0.36, w: 0.4, h: 0.74, y: 0.02, flare: 1.4 },
    { x: 0.66, w: 0.42, h: 0.64, y: 0.03, flare: 1.4 },
  ],
  // Broad crowned massif.
  [
    { x: 0.2, w: 0.32, h: 0.4, y: 0 },
    { x: 0.82, w: 0.3, h: 0.36, y: 0.01 },
    { x: 0.5, w: 0.88, h: 0.72, y: 0.02, crown: 0.14, flare: 1, segs: 7, stairs: 0.65 },
  ],
  // Three needles.
  [
    { x: 0.5, w: 0.36, h: 0.9, y: -0.02, flare: 1.8, segs: 7 },
    { x: 0.26, w: 0.34, h: 0.6, y: 0.02, flare: 1.7, lean: -0.08 },
    { x: 0.76, w: 0.36, h: 0.72, y: 0.03, flare: 1.7, lean: 0.08 },
  ],
];

const RANGE_LAYOUTS: readonly Layout[] = [
  // Long wall with a central summit.
  [
    { x: 0.12, w: 0.32, h: 0.5, y: -0.07 },
    { x: 0.88, w: 0.32, h: 0.5, y: -0.07 },
    { x: 0.5, w: 0.44, h: 0.88, y: -0.06, flare: 1.3, segs: 7 },
    { x: 0.28, w: 0.4, h: 0.62, y: -0.01 },
    { x: 0.74, w: 0.4, h: 0.58, y: -0.01 },
    { x: 0.5, w: 0.42, h: 0.4, y: 0.07 },
  ],
  // Two massifs with a saddle.
  [
    { x: 0.5, w: 0.34, h: 0.46, y: -0.07 },
    { x: 0.27, w: 0.46, h: 0.8, y: -0.03, flare: 1.3, segs: 7 },
    { x: 0.75, w: 0.46, h: 0.72, y: -0.03, flare: 1.3, segs: 7 },
    { x: 0.1, w: 0.3, h: 0.4, y: 0.05 },
    { x: 0.5, w: 0.42, h: 0.4, y: 0.07 },
    { x: 0.91, w: 0.28, h: 0.38, y: 0.05 },
  ],
  // Sawtooth.
  [
    { x: 0.16, w: 0.3, h: 0.5, y: -0.05, flare: 1.4 },
    { x: 0.42, w: 0.3, h: 0.74, y: -0.05, flare: 1.5 },
    { x: 0.68, w: 0.32, h: 0.62, y: -0.05, flare: 1.4 },
    { x: 0.9, w: 0.28, h: 0.46, y: -0.04, flare: 1.4 },
    { x: 0.3, w: 0.34, h: 0.5, y: 0.05, flare: 1.4 },
    { x: 0.64, w: 0.36, h: 0.46, y: 0.07 },
  ],
  // Rising ridge.
  [
    { x: 0.8, w: 0.4, h: 0.86, y: -0.05, flare: 1.4, lean: 0.06, segs: 7 },
    { x: 0.58, w: 0.38, h: 0.7, y: -0.03, flare: 1.3 },
    { x: 0.36, w: 0.38, h: 0.56, y: 0 },
    { x: 0.14, w: 0.32, h: 0.42, y: 0.04 },
    { x: 0.72, w: 0.34, h: 0.4, y: 0.07 },
    { x: 0.46, w: 0.32, h: 0.34, y: 0.08 },
  ],
];

interface CragSpec {
  idSuffix: string;
  name: string;
  rock: string;
  strata?: number;
  snow?: number;
  gloom?: number;
  glaze?: string;
  tags: string[];
  order: number;
}

function single(s: CragSpec): SymbolDef {
  return defineSymbol({
    id: `crag.${s.idSuffix}`,
    name: s.name,
    category: 'mountains',
    size: [112, 104],
    anchor: [0.5, 0.9],
    order: s.order,
    tags: ['mountain', 'crag', 'rocky', 'cliff', ...s.tags],
    placement: 'land',
    variants: SINGLE_LAYOUTS.length,
    draw({ ctx, w, h, rand, variant }) {
      drawMassif(ctx, {
        w,
        h,
        baseY: h * 0.9,
        towers: SINGLE_LAYOUTS[variant % SINGLE_LAYOUTS.length]!,
        rock: s.rock,
        ink: INK,
        strata: s.strata,
        snow: s.snow,
        gloom: s.gloom,
        glaze: s.glaze,
        rand,
      });
    },
  });
}

function range(s: CragSpec): SymbolDef {
  return defineSymbol({
    id: `crag.range.${s.idSuffix}`,
    name: `${s.name} Range`,
    category: 'mountains',
    size: [200, 128],
    anchor: [0.5, 0.9],
    order: s.order + 100,
    tags: ['mountain', 'range', 'chain', 'crag', 'rocky', ...s.tags],
    placement: 'land',
    variants: RANGE_LAYOUTS.length,
    draw({ ctx, w, h, rand, variant }) {
      drawMassif(ctx, {
        w,
        h,
        baseY: h * 0.88,
        towers: RANGE_LAYOUTS[variant % RANGE_LAYOUTS.length]!,
        rock: s.rock,
        ink: INK,
        strata: s.strata,
        snow: s.snow,
        gloom: s.gloom,
        glaze: s.glaze,
        rand,
      });
    },
  });
}

const SPIRE_LAYOUTS: readonly Layout[] = [
  // Needle with two stumps.
  [
    { x: 0.2, w: 0.36, h: 0.3, y: 0, flare: 1.4 },
    { x: 0.82, w: 0.3, h: 0.24, y: 0.01, flare: 1.4 },
    { x: 0.5, w: 0.52, h: 0.98, y: 0.02, flare: 1.9, lean: 0.04, segs: 8 },
  ],
  // Twin spires.
  [
    { x: 0.3, w: 0.46, h: 0.7, y: -0.01, flare: 1.8, lean: -0.05, segs: 7 },
    { x: 0.7, w: 0.5, h: 0.95, y: 0.02, flare: 1.9, lean: 0.05, segs: 8 },
  ],
  // Leaning horn.
  [
    { x: 0.22, w: 0.26, h: 0.26, y: 0.03 },
    { x: 0.52, w: 0.7, h: 0.9, y: 0.02, flare: 1.6, lean: 0.16, segs: 8, crown: 0.1 },
  ],
  // Fat pillar with a flat top.
  [
    { x: 0.5, w: 0.6, h: 0.86, y: 0.02, flare: 1.1, crown: 0.4, stairs: 0.8 },
    { x: 0.14, w: 0.26, h: 0.22, y: 0.03 },
    { x: 0.88, w: 0.24, h: 0.3, y: 0.02 },
  ],
  // Bundle of needles.
  [
    { x: 0.5, w: 0.36, h: 0.8, y: -0.02, flare: 1.8 },
    { x: 0.3, w: 0.34, h: 0.62, y: 0, flare: 1.8, lean: -0.1 },
    { x: 0.7, w: 0.34, h: 0.7, y: 0.01, flare: 1.8, lean: 0.1 },
    { x: 0.5, w: 0.3, h: 0.4, y: 0.04, flare: 1.6 },
  ],
  // Tower on a pedestal.
  [
    { x: 0.5, w: 0.46, h: 0.92, y: -0.01, flare: 1.4, crown: 0.14, stairs: 0.85, segs: 8 },
    { x: 0.5, w: 0.84, h: 0.46, y: 0.02, crown: 0.3, stairs: 0.8 },
  ],
];

function spire(s: CragSpec): SymbolDef {
  return defineSymbol({
    id: `crag.spire${s.idSuffix === 'gray' ? '' : `.${s.idSuffix}`}`,
    name: `${s.name} Spire`,
    category: 'mountains',
    size: [72, 112],
    anchor: [0.5, 0.92],
    order: s.order + 50,
    tags: ['mountain', 'spire', 'needle', 'pillar', 'tower', 'crag', 'rocky', ...s.tags],
    placement: 'land',
    variants: SPIRE_LAYOUTS.length,
    draw({ ctx, w, h, rand, variant }) {
      drawMassif(ctx, {
        w,
        h,
        baseY: h * 0.92,
        towers: SPIRE_LAYOUTS[variant % SPIRE_LAYOUTS.length]!,
        rock: s.rock,
        ink: INK,
        strata: s.strata,
        rand,
      });
    },
  });
}

interface PlateauSpec {
  idSuffix: string;
  name: string;
  rock: string;
  top: string;
  tuft: string;
  order: number;
  tags: string[];
}

function plateau(s: PlateauSpec): SymbolDef {
  return defineSymbol({
    id: `crag.plateau${s.idSuffix}`,
    name: `${s.name} Plateau`,
    category: 'mountains',
    size: [128, 100],
    anchor: [0.5, 0.9],
    order: s.order,
    tags: ['mountain', 'plateau', 'mesa', 'butte', 'cliff', 'tabletop', 'rocky', ...s.tags],
    placement: 'land',
    variants: 6,
    draw({ ctx, w, h, rand, variant }) {
      const g = h * 0.9;
      const base = { rock: s.rock, top: s.top, tuftColor: s.tuft, ink: INK, rand };
      switch (variant % 6) {
        case 0:
          drawMesa(ctx, { ...base, cx: w * 0.5, groundY: g, rx: 44, ry: 14, wall: 34 });
          break;
        case 1:
          drawMesa(ctx, { ...base, cx: w * 0.5, groundY: g, rx: 24, ry: 9, wall: 58, strata: 7, taper: 1.1, talus: 0.28 });
          break;
        case 2:
          drawMesa(ctx, { ...base, cx: w * 0.5, groundY: g, rx: 48, ry: 14, wall: 24, strata: 3, talus: 0.35 });
          drawMesa(ctx, { ...base, cx: w * 0.5 + 5, groundY: g - 31, rx: 26, ry: 9, wall: 28, strata: 4, talus: 0.25, shadow: false });
          break;
        case 3:
          drawMesa(ctx, { ...base, cx: w * 0.7, groundY: g - 8, rx: 26, ry: 9, wall: 46, strata: 6, talus: 0.25 });
          drawMesa(ctx, { ...base, cx: w * 0.3, groundY: g, rx: 32, ry: 11, wall: 28 });
          break;
        case 4:
          drawMesa(ctx, { ...base, cx: w * 0.5, groundY: g, rx: 50, ry: 11, wall: 26, strata: 4 });
          break;
        default: {
          const mesa = drawMesa(ctx, { ...base, cx: w * 0.5, groundY: g, rx: 36, ry: 11, wall: 36 });
          drawTower(ctx, { cx: mesa.topCx + 5, baseY: mesa.topCy + 4, w: 40, h: 48, flare: 1.25, rock: s.rock, ink: INK, rand, segs: 6, shadow: true, lean: 0.05, crown: 0.14 });
          break;
        }
      }
    },
  });
}

interface RockSpec {
  idSuffix: string;
  name: string;
  rock: string;
  order: number;
  tags: string[];
}

function boulder(s: RockSpec): SymbolDef {
  return defineSymbol({
    id: `rock.boulder${s.idSuffix}`,
    name: `${s.name} Boulder`,
    category: 'mountains',
    size: [48, 40],
    anchor: [0.5, 0.88],
    order: s.order,
    tags: ['rock', 'boulder', 'stone', 'single', ...s.tags],
    placement: 'land',
    variants: 6,
    draw({ ctx, w, h, rand, variant }) {
      const g = h * 0.88;
      const put = (x: number, rx: number, ry: number, extra: Partial<BoulderOptions> = {}): void =>
        drawBoulder(ctx, { cx: x, cy: g - ry * 0.72, rx, ry, rock: s.rock, ink: INK, rand, ...extra });
      switch (variant % 6) {
        case 0:
          put(w * 0.5, 17, 14);
          break;
        case 1:
          put(w * 0.5, 12, 19, { cracks: true });
          break;
        case 2:
          put(w * 0.5, 21, 10);
          break;
        case 3:
          put(w * 0.5, 17, 14, { cracks: true });
          break;
        case 4:
          put(w * 0.5, 16, 13, { moss: '#7c9a47' });
          tuft(ctx, w * 0.5 + 12, g + 1, 3.4, '#6f8a3e');
          tuft(ctx, w * 0.5 - 15, g, 3, '#6f8a3e');
          break;
        default:
          put(w * 0.4, 14, 12);
          put(w * 0.76, 8, 7);
          break;
      }
    },
  });
}

interface Spot {
  x: number;
  /** Ground line of the boulder. */
  g: number;
  rx: number;
  ry: number;
}

/** Listed in painter order (a boulder resting on another comes later). */
const BOULDERS_LAYOUTS: readonly (readonly Spot[])[] = [
  [{ x: 28, g: 36, rx: 15, ry: 13 }, { x: 55, g: 40, rx: 11.5, ry: 10 }, { x: 12, g: 43, rx: 7, ry: 6 }],
  [{ x: 22, g: 29, rx: 11, ry: 9 }, { x: 52, g: 28, rx: 9, ry: 8 }, { x: 36, g: 38, rx: 12, ry: 10.5 }, { x: 63, g: 42, rx: 7.5, ry: 6.5 }, { x: 10, g: 43, rx: 6, ry: 5 }],
  [{ x: 24, g: 41, rx: 14, ry: 11 }, { x: 50, g: 42, rx: 13, ry: 10.5 }, { x: 37, g: 33, rx: 11, ry: 9.5 }],
  [{ x: 34, g: 39, rx: 18, ry: 15 }, { x: 59, g: 43, rx: 6, ry: 5 }, { x: 62, g: 37, rx: 4.5, ry: 4 }, { x: 13, g: 44, rx: 5, ry: 4.5 }],
  [{ x: 66, g: 36, rx: 6, ry: 5.5 }, { x: 52, g: 38, rx: 8, ry: 7 }, { x: 34, g: 40, rx: 10.5, ry: 9 }, { x: 15, g: 42, rx: 13, ry: 11 }],
  [{ x: 20, g: 30, rx: 6, ry: 5.5 }, { x: 46, g: 28, rx: 5, ry: 4.5 }, { x: 62, g: 33, rx: 6.5, ry: 5.5 }, { x: 33, g: 36, rx: 7.5, ry: 6.5 }, { x: 12, g: 41, rx: 5, ry: 4.5 }, { x: 52, g: 42, rx: 8, ry: 7 }, { x: 66, g: 45, rx: 4.5, ry: 4 }],
];

function boulders(s: RockSpec): SymbolDef {
  return defineSymbol({
    id: `rock.boulders${s.idSuffix}`,
    name: `${s.name} Boulders`,
    category: 'mountains',
    size: [76, 48],
    anchor: [0.5, 0.9],
    order: s.order + 5,
    tags: ['rock', 'boulders', 'stones', 'rubble', 'cluster', ...s.tags],
    placement: 'land',
    variants: BOULDERS_LAYOUTS.length,
    draw({ ctx, rand, variant }) {
      for (const p of BOULDERS_LAYOUTS[variant % BOULDERS_LAYOUTS.length]!) {
        const k = rand.range(0.92, 1.08);
        drawBoulder(ctx, {
          cx: p.x + rand.range(-1, 1),
          cy: p.g - p.ry * k * 0.72,
          rx: p.rx * k,
          ry: p.ry * k,
          rock: s.rock,
          ink: INK,
          rand,
          simple: p.rx < 6,
          cracks: p.rx > 12 && rand.chance(0.5),
        });
      }
    },
  });
}

const MUSHROOM = [0.7, 0.62, 0.5, 0.4, 0.34, 0.32, 0.38, 0.8, 1, 0.92, 0.5];
const COLUMN = [0.9, 0.7, 0.62, 0.58, 0.64, 0.56, 0.5, 0.44, 0.4, 0.2];
const CAPPED = [0.82, 0.6, 0.5, 0.5, 0.54, 0.5, 0.52, 0.78, 0.8, 0.5];
const TALL = [0.8, 0.62, 0.54, 0.5, 0.46, 0.44, 0.42, 0.4, 0.34, 0.16];

function stack(s: RockSpec): SymbolDef {
  return defineSymbol({
    id: `rock.stack${s.idSuffix}`,
    name: `${s.name} Rock Stack`,
    category: 'mountains',
    size: [56, 76],
    anchor: [0.5, 0.92],
    order: s.order + 100,
    tags: ['rock', 'stack', 'hoodoo', 'pillar', 'balanced', 'cairn', ...s.tags],
    placement: 'land',
    variants: 6,
    draw({ ctx, w, h, rand, variant }) {
      const g = h * 0.92;
      const rock = s.rock;
      const pillar = (cx: number, width: number, height: number, profile: readonly number[], cap?: number, strata?: number): void =>
        drawHoodoo(ctx, { cx, baseY: g, w: width, h: height, rock, ink: INK, rand, profile, cap, strata });
      switch (variant % 6) {
        case 0:
          pillar(w * 0.5, 38, 62, MUSHROOM, 6, 8);
          break;
        case 1: {
          const put = (x: number, bottom: number, rx: number, ry: number): void =>
            drawBoulder(ctx, { cx: x, cy: bottom - ry * 0.72, rx, ry, rock, ink: INK, rand });
          put(w * 0.5, g, 18, 13);
          put(w * 0.5 + 2, g - 14, 13, 10.5);
          put(w * 0.5 - 1, g - 28, 9, 8);
          break;
        }
        case 2:
          drawCairn(ctx, { cx: w * 0.5, baseY: g, w: 38, rock, ink: INK, rand, rows: 4 });
          break;
        case 3:
          pillar(w * 0.68, 26, 50, TALL, undefined, 6);
          pillar(w * 0.34, 32, 64, CAPPED, 6, 8);
          break;
        case 4:
          pillar(w * 0.5, 34, 66, COLUMN, undefined, 8);
          break;
        default:
          pillar(w * 0.3, 24, 38, MUSHROOM, 6, 5);
          pillar(w * 0.64, 34, 62, TALL, undefined, 7);
          break;
      }
    },
  });
}

function arch(s: RockSpec): SymbolDef {
  return defineSymbol({
    id: `rock.arch${s.idSuffix}`,
    name: `${s.name} Rock Arch`,
    category: 'mountains',
    size: [96, 76],
    anchor: [0.5, 0.92],
    order: s.order + 200,
    tags: ['rock', 'arch', 'natural bridge', 'window', ...s.tags],
    placement: 'land',
    variants: 3,
    draw({ ctx, w, h, rand, variant }) {
      const shapes = [
        { w: 78, h: 56, open: 0.42 },
        { w: 60, h: 66, open: 0.34 },
        { w: 76, h: 48, open: 0.5 },
      ] as const;
      const a = shapes[variant % shapes.length]!;
      drawArch(ctx, { cx: w * 0.5, baseY: h * 0.92, w: a.w, h: a.h, open: a.open, rock: s.rock, ink: INK, rand });
    },
  });
}

const specs: CragSpec[] = [
  { idSuffix: 'gray', name: 'Gray Crag', rock: STONE.gray, order: 300, tags: ['gray', 'grey', 'stone'] },
  { idSuffix: 'brown', name: 'Brown Crag', rock: STONE.brown, order: 310, tags: ['brown'] },
  { idSuffix: 'red', name: 'Red Crag', rock: STONE.red, strata: 5, order: 320, tags: ['red', 'badlands', 'sandstone'] },
];

const plateaus: PlateauSpec[] = [
  { idSuffix: '', name: 'Brown', rock: STONE.brown, top: '#a5a063', tuft: '#7f8a3a', order: 330, tags: ['brown'] },
  { idSuffix: '.red', name: 'Red', rock: STONE.red, top: '#bf8d58', tuft: '#8f7a3a', order: 340, tags: ['red', 'sandstone', 'badlands'] },
  { idSuffix: '.gray', name: 'Gray', rock: STONE.gray, top: '#92a468', tuft: '#6f8a3e', order: 350, tags: ['gray', 'grey', 'stone'] },
];

const rockSets: RockSpec[] = [
  { idSuffix: '', name: 'Gray', rock: STONE.gray, order: 400, tags: ['gray', 'grey'] },
  { idSuffix: '.brown', name: 'Brown', rock: STONE.brown, order: 420, tags: ['brown'] },
  { idSuffix: '.red', name: 'Red', rock: STONE.red, order: 440, tags: ['red', 'sandstone'] },
];

export default [
  ...specs.map(single),
  ...specs.map(range),
  ...specs.map(spire),
  ...plateaus.map(plateau),
  ...rockSets.map(boulder),
  ...rockSets.slice(0, 2).map(boulders),
  ...rockSets.map(stack),
  ...[rockSets[0]!, rockSets[2]!].map(arch),
];
