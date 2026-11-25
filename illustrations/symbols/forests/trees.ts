import { defineSymbol } from '../../kit/define';
import type { SymbolDef } from '../../kit/types';
import { BARK, FOLIAGE, drawDeadTree, drawPalm, drawPine, drawRoundTree } from '../../parts/tree';

const INK = '#2a2415';

interface TreeSpec {
  id: string;
  name: string;
  order: number;
  tags: string[];
  size?: readonly [number, number];
  /** Draws one tree standing at `(cx, baseY)` with the given width and height. */
  paint: (d: Parameters<SymbolDef['draw']>[0], cx: number, baseY: number, w: number, h: number) => void;
}

const SINGLE: readonly [number, number] = [56, 64];
const GROVE: readonly [number, number] = [132, 96];

function single(s: TreeSpec): SymbolDef {
  return defineSymbol({
    id: s.id,
    name: s.name,
    category: 'forests',
    size: s.size ?? SINGLE,
    anchor: [0.5, 0.94],
    order: s.order,
    tags: ['tree', ...s.tags],
    placement: 'land',
    variants: 8,
    draw(d) {
      const w = (s.size ?? SINGLE)[0] * d.rand.range(0.8, 0.94);
      const h = (s.size ?? SINGLE)[1] * d.rand.range(0.82, 0.92);
      s.paint(d, d.w / 2, d.h * 0.94, w, h);
    },
  });
}

/** A clump of trees drawn back to front so near trees overlap far ones. */
function grove(s: TreeSpec, count = 6): SymbolDef {
  return defineSymbol({
    id: s.id.replace(/^tree\./, 'grove.'),
    name: `${s.name} Grove`,
    category: 'forests',
    size: GROVE,
    anchor: [0.5, 0.94],
    order: s.order + 100,
    tags: ['grove', 'forest', 'woods', ...s.tags],
    placement: 'land',
    variants: 6,
    draw(d) {
      const { rand } = d;
      const spots: { x: number; y: number }[] = [];
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + rand.range(-0.4, 0.4);
        const r = i === 0 ? 0 : rand.range(0.45, 0.85);
        spots.push({ x: d.w / 2 + Math.cos(a) * r * d.w * 0.34, y: d.h * 0.7 + Math.sin(a) * r * d.h * 0.2 });
      }
      spots.sort((a, b) => a.y - b.y);
      for (const p of spots) {
        const k = 0.72 + (p.y / d.h - 0.5) * 0.4 + rand.range(-0.06, 0.06);
        s.paint(d, p.x, p.y + d.h * 0.12, 54 * k, 62 * k);
      }
    },
  });
}

const oak: TreeSpec = {
  id: 'tree.oak',
  name: 'Oak',
  order: 10,
  tags: ['oak', 'green', 'deciduous'],
  paint: (d, cx, baseY, w, h) => drawRoundTree(d.ctx, { cx, baseY, w, h, leaf: FOLIAGE.green, ink: INK, rand: d.rand.fork(Math.round(cx * 7 + baseY)) }),
};

const darkOak: TreeSpec = {
  id: 'tree.oak.dark',
  name: 'Dark Oak',
  order: 20,
  tags: ['dark', 'olive'],
  paint: (d, cx, baseY, w, h) => drawRoundTree(d.ctx, { cx, baseY, w, h, leaf: FOLIAGE.olive, ink: INK, rand: d.rand.fork(Math.round(cx * 7 + baseY)) }),
};

const autumn: TreeSpec = {
  id: 'tree.autumn',
  name: 'Autumn Tree',
  order: 30,
  tags: ['autumn', 'fall', 'orange'],
  paint: (d, cx, baseY, w, h) => drawRoundTree(d.ctx, { cx, baseY, w, h, leaf: FOLIAGE.autumn, ink: INK, rand: d.rand.fork(Math.round(cx * 7 + baseY)) }),
};

const blossom: TreeSpec = {
  id: 'tree.blossom',
  name: 'Blossom Tree',
  order: 40,
  tags: ['blossom', 'cherry', 'pink', 'spring'],
  paint: (d, cx, baseY, w, h) => drawRoundTree(d.ctx, { cx, baseY, w, h, leaf: FOLIAGE.blossom, ink: INK, rand: d.rand.fork(Math.round(cx * 7 + baseY)), trunk: BARK.dark }),
};

const pine: TreeSpec = {
  id: 'tree.pine',
  name: 'Pine',
  order: 50,
  tags: ['pine', 'conifer', 'fir', 'spruce'],
  size: [48, 68],
  paint: (d, cx, baseY, w, h) => drawPine(d.ctx, { cx, baseY, w: w * 0.9, h: h * 1.08, leaf: FOLIAGE.dark, ink: INK, rand: d.rand.fork(Math.round(cx * 7 + baseY)) }),
};

const frostPine: TreeSpec = {
  id: 'tree.pine.snowy',
  name: 'Snowy Pine',
  order: 60,
  tags: ['pine', 'snow', 'winter', 'conifer'],
  size: [48, 68],
  paint: (d, cx, baseY, w, h) =>
    drawPine(d.ctx, { cx, baseY, w: w * 0.9, h: h * 1.08, leaf: FOLIAGE.frost, ink: INK, snow: true, rand: d.rand.fork(Math.round(cx * 7 + baseY)) }),
};

const palm: TreeSpec = {
  id: 'tree.palm',
  name: 'Palm',
  order: 70,
  tags: ['palm', 'tropical', 'beach', 'jungle'],
  size: [64, 68],
  paint: (d, cx, baseY, w, h) => drawPalm(d.ctx, { cx, baseY, w: w * 0.9, h, leaf: FOLIAGE.jungle, ink: INK, trunk: '#a8844f', rand: d.rand.fork(Math.round(cx * 7 + baseY)) }),
};

const dead: TreeSpec = {
  id: 'tree.dead',
  name: 'Dead Tree',
  order: 80,
  tags: ['dead', 'bare', 'dry', 'haunted'],
  size: [56, 64],
  paint: (d, cx, baseY, w, h) => drawDeadTree(d.ctx, { cx, baseY, w, h, leaf: '#000', ink: INK, trunk: BARK.gray, rand: d.rand.fork(Math.round(cx * 7 + baseY)) }),
};

export default [
  single(oak),
  single(darkOak),
  single(autumn),
  single(blossom),
  single(pine),
  single(frostPine),
  single(palm),
  single(dead),
  grove(oak),
  grove(darkOak),
  grove(autumn),
  grove(pine, 7),
  grove(frostPine, 7),
];
