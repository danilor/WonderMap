import { defineSymbol } from '../../kit/define';
import type { Ctx2D, Rng, SymbolDef } from '../../kit/types';
import { INK, STONE, drawBoulder } from '../../parts/relief-common';
import { HILL, drawBush, drawHill, type HillPalette } from '../../parts/relief-hill';
import { drawTower } from '../../parts/relief-tower';
import { FOLIAGE, drawPine, drawRoundTree } from '../../parts/tree';

type DecoKind = 'tree' | 'bush' | 'rock' | 'crag';

interface Deco {
  kind: DecoKind;
  /** Position along the mound width (0..1). */
  t: number;
  /** Depth below the contour as a fraction of the mound height. */
  d: number;
  /** Size in design units. */
  s: number;
}

interface Mound {
  /** Center and width as fractions of the box width, height as a fraction of the box height. */
  x: number;
  w: number;
  h: number;
  /** Ground offset as a fraction of the box height (positive = nearer the viewer). */
  dy?: number;
  apex?: number;
  curve?: number;
  rocks?: number;
  deco?: readonly Deco[];
}

interface HillKind {
  idSuffix: string;
  name: string;
  palette: HillPalette;
  leaf: string;
  snow?: number;
  conifer?: boolean;
  rocky?: boolean;
  tags: string[];
  order: number;
}

const tree = (t: number, d: number, s: number): Deco => ({ kind: 'tree', t, d, s });
const bush = (t: number, d: number, s: number): Deco => ({ kind: 'bush', t, d, s });
const rock = (t: number, d: number, s: number): Deco => ({ kind: 'rock', t, d, s });
const crag = (t: number, d: number, s: number): Deco => ({ kind: 'crag', t, d, s });

/** Warm gray that sits well on the taupe rocky-hill palette. */
const OUTCROP = '#8f8a86';

const SMALL: readonly (readonly Mound[])[] = [
  // Wide dome.
  [{ x: 0.5, w: 0.96, h: 0.58 }],
  // Summit leaning left.
  [{ x: 0.5, w: 0.92, h: 0.62, apex: 0.4, curve: 0.78 }],
  // Twin humps.
  [
    { x: 0.66, w: 0.64, h: 0.6 },
    { x: 0.32, w: 0.6, h: 0.44, dy: 0.04, apex: 0.56 },
  ],
  // Round knoll.
  [{ x: 0.5, w: 0.76, h: 0.66, curve: 0.64 }],
  // Low and wide with shrubs.
  [{ x: 0.5, w: 0.98, h: 0.46, apex: 0.46, deco: [bush(0.26, 0.34, 12), bush(0.66, 0.4, 10)] }],
  // Lone tree on the summit.
  [{ x: 0.5, w: 0.9, h: 0.48, deco: [tree(0.5, 0.05, 15)] }],
];

const BIG: readonly (readonly Mound[])[] = [
  // Broad hill with a small wood.
  [{ x: 0.5, w: 0.96, h: 0.6, rocks: 2, deco: [tree(0.28, 0.24, 17), tree(0.37, 0.34, 15), tree(0.72, 0.3, 16), tree(0.64, 0.4, 13)] }],
  // Double summit.
  [
    { x: 0.7, w: 0.62, h: 0.66, apex: 0.45 },
    { x: 0.3, w: 0.6, h: 0.54, apex: 0.55, dy: 0.03, rocks: 2, deco: [bush(0.3, 0.3, 11)] },
  ],
  // Ridge of three.
  [
    { x: 0.8, w: 0.44, h: 0.48, dy: -0.02 },
    { x: 0.2, w: 0.44, h: 0.5, dy: -0.02 },
    { x: 0.5, w: 0.62, h: 0.7, dy: 0.02, deco: [tree(0.62, 0.3, 14)] },
  ],
  // Steep hill with shrubs.
  [{ x: 0.5, w: 0.8, h: 0.7, apex: 0.44, curve: 0.8, rocks: 2, deco: [bush(0.3, 0.3, 12), bush(0.7, 0.4, 13), tree(0.55, 0.3, 14)] }],
  // Hill with a lower shoulder in front.
  [
    { x: 0.62, w: 0.78, h: 0.7, apex: 0.55, deco: [tree(0.6, 0.12, 15)] },
    { x: 0.26, w: 0.5, h: 0.42, dy: 0.04, deco: [tree(0.4, 0.3, 14), bush(0.7, 0.4, 10)] },
  ],
];

const ROCKY_SMALL: readonly (readonly Mound[])[] = [
  // Rocky crown.
  [{ x: 0.5, w: 0.9, h: 0.34, deco: [crag(0.5, 0.2, 30)] }],
  // Cliff on the right shoulder.
  [{ x: 0.5, w: 0.88, h: 0.42, apex: 0.4, rocks: 2, deco: [crag(0.66, 0.3, 28), rock(0.3, 0.35, 8)] }],
  // Two outcrops.
  [{ x: 0.5, w: 0.94, h: 0.4, deco: [crag(0.3, 0.28, 22), crag(0.68, 0.2, 26)] }],
  // Boulder field.
  [{ x: 0.5, w: 0.92, h: 0.4, rocks: 7, deco: [rock(0.34, 0.3, 11), rock(0.62, 0.38, 13), rock(0.78, 0.26, 8)] }],
  // Scree knoll.
  [{ x: 0.5, w: 0.74, h: 0.5, curve: 0.7, deco: [crag(0.42, 0.22, 26), rock(0.7, 0.4, 9)] }],
];

const ROCKY_BIG: readonly (readonly Mound[])[] = [
  [{ x: 0.5, w: 0.96, h: 0.36, deco: [crag(0.5, 0.2, 48), rock(0.24, 0.4, 12), rock(0.8, 0.36, 10)] }],
  [
    { x: 0.68, w: 0.64, h: 0.46, apex: 0.45, deco: [crag(0.56, 0.2, 40)] },
    { x: 0.3, w: 0.6, h: 0.34, dy: 0.04, rocks: 3, deco: [rock(0.4, 0.32, 10), rock(0.66, 0.42, 8)] },
  ],
  [
    { x: 0.78, w: 0.44, h: 0.3, dy: -0.02 },
    { x: 0.5, w: 0.7, h: 0.5, dy: 0.02, deco: [crag(0.36, 0.2, 40), crag(0.7, 0.34, 28)] },
  ],
  [{ x: 0.5, w: 0.9, h: 0.36, rocks: 8, deco: [rock(0.3, 0.3, 14), rock(0.58, 0.4, 16), rock(0.8, 0.3, 10), crag(0.46, 0.14, 30)] }],
];

const CLUSTER: readonly (readonly Mound[])[] = [
  [
    { x: 0.5, w: 0.54, h: 0.62, dy: -0.06 },
    { x: 0.26, w: 0.5, h: 0.44, dy: 0.03, apex: 0.56 },
    { x: 0.76, w: 0.42, h: 0.34, dy: 0.06, apex: 0.44, deco: [tree(0.5, 0.2, 12)] },
  ],
  [
    { x: 0.28, w: 0.44, h: 0.5, dy: -0.08 },
    { x: 0.72, w: 0.46, h: 0.54, dy: -0.07, apex: 0.4 },
    { x: 0.5, w: 0.58, h: 0.58, dy: 0.04, deco: [tree(0.62, 0.3, 13), bush(0.3, 0.4, 10)] },
    { x: 0.88, w: 0.3, h: 0.28, dy: 0.08 },
  ],
  [
    { x: 0.5, w: 0.46, h: 0.64, dy: -0.05, curve: 0.9 },
    { x: 0.2, w: 0.4, h: 0.4, dy: -0.03 },
    { x: 0.8, w: 0.4, h: 0.44, dy: -0.02 },
    { x: 0.34, w: 0.4, h: 0.32, dy: 0.07 },
    { x: 0.68, w: 0.38, h: 0.3, dy: 0.08 },
  ],
  [
    { x: 0.76, w: 0.44, h: 0.54, dy: -0.06 },
    { x: 0.5, w: 0.46, h: 0.44, dy: 0, deco: [tree(0.3, 0.3, 12)] },
    { x: 0.24, w: 0.44, h: 0.34, dy: 0.06 },
  ],
  [
    { x: 0.34, w: 0.6, h: 0.6, dy: -0.02, apex: 0.55 },
    { x: 0.78, w: 0.42, h: 0.4, dy: -0.04 },
    { x: 0.62, w: 0.34, h: 0.28, dy: 0.07, deco: [bush(0.5, 0.3, 9)] },
    { x: 0.14, w: 0.3, h: 0.26, dy: 0.08 },
  ],
];

const RANGE: readonly (readonly Mound[])[] = [
  [
    { x: 0.12, w: 0.32, h: 0.3, dy: -0.06 },
    { x: 0.32, w: 0.34, h: 0.38, dy: -0.07 },
    { x: 0.54, w: 0.34, h: 0.46, dy: -0.08 },
    { x: 0.76, w: 0.34, h: 0.38, dy: -0.07 },
    { x: 0.92, w: 0.3, h: 0.3, dy: -0.06 },
    { x: 0.22, w: 0.36, h: 0.3, dy: 0.06 },
    { x: 0.46, w: 0.38, h: 0.38, dy: 0.07 },
    { x: 0.72, w: 0.36, h: 0.3, dy: 0.07 },
  ],
  [
    { x: 0.1, w: 0.3, h: 0.32, dy: -0.03 },
    { x: 0.26, w: 0.3, h: 0.44, dy: 0.02, apex: 0.45 },
    { x: 0.43, w: 0.3, h: 0.38, dy: -0.03 },
    { x: 0.6, w: 0.32, h: 0.52, dy: 0.02, apex: 0.55 },
    { x: 0.77, w: 0.3, h: 0.42, dy: -0.03 },
    { x: 0.92, w: 0.28, h: 0.3, dy: 0.02 },
  ],
  [
    { x: 0.86, w: 0.34, h: 0.46, dy: -0.07 },
    { x: 0.66, w: 0.36, h: 0.42, dy: -0.04 },
    { x: 0.46, w: 0.36, h: 0.38, dy: -0.01 },
    { x: 0.26, w: 0.36, h: 0.32, dy: 0.02 },
    { x: 0.1, w: 0.3, h: 0.26, dy: 0.05 },
    { x: 0.56, w: 0.32, h: 0.24, dy: 0.08 },
  ],
  [
    { x: 0.18, w: 0.38, h: 0.38, dy: -0.06, apex: 0.45 },
    { x: 0.5, w: 0.44, h: 0.46, dy: -0.07 },
    { x: 0.82, w: 0.38, h: 0.36, dy: -0.06, apex: 0.55 },
    { x: 0.32, w: 0.34, h: 0.26, dy: 0.06 },
    { x: 0.66, w: 0.36, h: 0.3, dy: 0.06 },
  ],
];

interface Box {
  w: number;
  h: number;
  /** Ground line of an undisplaced mound as a fraction of the box height. */
  base: number;
}

function drawRubble(ctx: Ctx2D, rand: Rng, x: number, y: number, span: number, rock: string): void {
  const n = Math.round(4 + span / 7);
  const spots: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = (i + rand.range(0.1, 0.9)) / n;
    const mid = Math.sin(Math.PI * t) ** 0.5;
    spots.push([x + (t - 0.5) * span, y + rand.range(-1.5, 2) + mid * 1.4, span * rand.range(0.05, 0.085) * (0.55 + 0.65 * mid)]);
  }
  spots.sort((a, b) => a[1] - b[1]);
  for (const [bx, by, r] of spots) drawBoulder(ctx, { cx: bx, cy: by, rx: r, ry: r * 0.78, rock, ink: INK, rand, shadow: false, simple: true });
}

function drawDeco(ctx: Ctx2D, rand: Rng, kind: HillKind, d: Deco, x: number, y: number): void {
  switch (d.kind) {
    case 'tree':
      if (kind.conifer) drawPine(ctx, { cx: x, baseY: y, w: d.s * 0.85, h: d.s * 1.6, leaf: kind.leaf, ink: INK, rand, snow: true });
      else drawRoundTree(ctx, { cx: x, baseY: y, w: d.s, h: d.s * 1.25, leaf: kind.leaf, ink: INK, rand });
      break;
    case 'bush':
      drawBush(ctx, rand, x, y, d.s / 2, kind.conifer ? FOLIAGE.frost : kind.leaf, INK);
      break;
    case 'rock':
      drawBoulder(ctx, { cx: x, cy: y - d.s * 0.3, rx: d.s / 2, ry: d.s * 0.4, rock: kind.rocky ? OUTCROP : STONE.gray, ink: INK, rand, snow: !!kind.snow });
      break;
    case 'crag': {
      const rock = kind.rocky ? OUTCROP : STONE.brown;
      drawTower(ctx, { cx: x, baseY: y, w: d.s, h: Math.min(d.s * 1.1, y - 2), lean: rand.range(-0.1, 0.1), rock, ink: INK, rand, flare: 1.1, segs: 6, crown: 0.14, shadow: false });
      drawRubble(ctx, rand, x, y + 1, d.s * 1.1, rock);
      break;
    }
  }
}

function drawMounds(ctx: Ctx2D, rand: Rng, kind: HillKind, mounds: readonly Mound[], box: Box): void {
  for (const m of mounds) {
    const hillH = box.h * m.h;
    const g = drawHill(ctx, {
      cx: box.w * m.x,
      baseY: box.h * (box.base + (m.dy ?? 0)),
      w: box.w * m.w,
      h: hillH,
      palette: kind.palette,
      ink: INK,
      rand,
      apex: m.apex,
      curve: m.curve,
      snow: kind.snow,
      rocks: m.rocks,
    });
    for (const d of m.deco ?? []) {
      const x = g.left + g.w * d.t;
      drawDeco(ctx, rand, kind, d, x, g.topAt(x) + d.d * hillH);
    }
  }
}

type Family = 'single' | 'big' | 'cluster' | 'range';

const FAMILY: Record<Family, { size: [number, number]; rockySize?: [number, number]; base: number; mounds: readonly (readonly Mound[])[]; label: string; prefix: string; suffix: string; order: number; tags: string[] }> = {
  single: { size: [90, 60], rockySize: [96, 78], base: 0.78, mounds: SMALL, label: 'Hill', prefix: 'hill.', suffix: '', order: 0, tags: ['hill', 'hills', 'mound', 'knoll'] },
  big: { size: [128, 88], rockySize: [136, 108], base: 0.8, mounds: BIG, label: 'Big Hill', prefix: 'hill.', suffix: '.big', order: 5, tags: ['hill', 'hills', 'big', 'large'] },
  cluster: { size: [168, 100], base: 0.8, mounds: CLUSTER, label: 'Hills', prefix: 'hill.cluster.', suffix: '', order: 40, tags: ['hill', 'hills', 'cluster', 'group', 'highlands'] },
  range: { size: [232, 100], base: 0.8, mounds: RANGE, label: 'Hill Range', prefix: 'hill.range.', suffix: '', order: 60, tags: ['hill', 'hills', 'range', 'chain', 'ridge'] },
};

function hills(kind: HillKind, family: Family): SymbolDef {
  const f = FAMILY[family];
  const rockyKind = kind.rocky === true;
  const size = (rockyKind && f.rockySize) || f.size;
  const mounds = rockyKind && family === 'single' ? ROCKY_SMALL : rockyKind && family === 'big' ? ROCKY_BIG : f.mounds;
  const box: Box = { w: size[0], h: size[1], base: f.base };
  return defineSymbol({
    id: `${f.prefix}${kind.idSuffix}${f.suffix}`,
    name: family === 'single' || family === 'big' ? `${kind.name}${family === 'big' ? ' (Large)' : ''}` : `${kind.name} ${family === 'cluster' ? 'Cluster' : 'Range'}`,
    category: 'mountains',
    size,
    anchor: [0.5, family === 'single' ? 0.86 : 0.88],
    order: kind.order + f.order,
    tags: [...f.tags, ...kind.tags],
    placement: 'land',
    variants: mounds.length,
    draw({ ctx, rand, variant }) {
      drawMounds(ctx, rand, kind, mounds[variant % mounds.length]!, box);
    },
  });
}

const kinds: HillKind[] = [
  { idSuffix: 'green', name: 'Green Hill', palette: HILL.green, leaf: FOLIAGE.green, tags: ['green', 'grass', 'meadow'], order: 200 },
  { idSuffix: 'brown', name: 'Brown Hill', palette: HILL.brown, leaf: FOLIAGE.olive, tags: ['brown', 'earth', 'barren', 'heath'], order: 210 },
  { idSuffix: 'dry', name: 'Dry Hill', palette: HILL.dry, leaf: FOLIAGE.yellow, tags: ['dry', 'yellow', 'savanna', 'steppe', 'dunes'], order: 220 },
  { idSuffix: 'snowy', name: 'Snowy Hill', palette: HILL.tundra, leaf: FOLIAGE.frost, snow: 0.36, conifer: true, tags: ['snow', 'snowy', 'winter', 'tundra', 'frozen'], order: 230 },
  { idSuffix: 'rocky', name: 'Rocky Hill', palette: HILL.rocky, leaf: FOLIAGE.olive, rocky: true, tags: ['rock', 'rocky', 'stone', 'crag', 'barren'], order: 240 },
];

const FAMILIES: Family[] = ['single', 'big', 'cluster', 'range'];

export default kinds.flatMap((k) => FAMILIES.filter((f) => !(k.rocky && (f === 'cluster' || f === 'range'))).map((f) => hills(k, f)));
