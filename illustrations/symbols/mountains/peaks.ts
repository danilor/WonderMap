import { defineSymbol } from '../../kit/define';
import { drawPeak, ROCK } from '../../parts/peak';
import type { SymbolDef } from '../../kit/types';

const INK = '#2e2216';

interface PeakSpec {
  id: string;
  name: string;
  rock: string;
  snow?: number;
  gloom?: number;
  rugged?: number;
  order: number;
  tags: string[];
}

/** A single peak that fills most of the box; variants change height, lean, gullies and snow line. */
function single(s: PeakSpec): SymbolDef {
  return defineSymbol({
    id: s.id,
    name: s.name,
    category: 'mountains',
    size: [112, 104],
    anchor: [0.5, 0.9],
    order: s.order,
    tags: ['mountain', 'peak', ...s.tags],
    placement: 'land',
    draw({ ctx, w, h, rand }) {
      drawPeak(ctx, {
        cx: w / 2,
        baseY: h * 0.88,
        w: w * rand.range(0.74, 0.9),
        h: h * rand.range(0.68, 0.84),
        rock: s.rock,
        snow: s.snow ? s.snow * rand.range(0.85, 1.15) : 0,
        gloom: s.gloom,
        rugged: s.rugged,
        lean: rand.range(-0.1, 0.1),
        ink: INK,
        gullies: 3,
        rand,
      });
    },
  });
}

/** Three overlapping peaks drawn back to front. */
function range(s: PeakSpec): SymbolDef {
  return defineSymbol({
    id: s.id,
    name: s.name,
    category: 'mountains',
    size: [200, 128],
    anchor: [0.5, 0.9],
    order: s.order,
    tags: ['mountain', 'range', 'chain', ...s.tags],
    placement: 'land',
    draw({ ctx, w, h, rand }) {
      const baseY = h * 0.88;
      const peaks = [
        { x: 0.5, w: 0.52, h: 0.86, y: 0, snow: 1 },
        { x: 0.26 + rand.range(-0.03, 0.03), w: 0.42, h: 0.6, y: 0.07, snow: 0.8 },
        { x: 0.76 + rand.range(-0.03, 0.03), w: 0.42, h: 0.64, y: 0.07, snow: 0.8 },
        { x: 0.5 + rand.range(-0.08, 0.08), w: 0.46, h: 0.5, y: 0.12, snow: 0.6 },
      ];
      peaks.forEach((p, i) => {
        drawPeak(ctx, {
          cx: w * p.x,
          baseY: baseY + h * p.y * 0.5,
          w: w * p.w * rand.range(0.92, 1.06),
          h: h * p.h * rand.range(0.92, 1.06),
          rock: s.rock,
          snow: s.snow ? s.snow * p.snow : 0,
          gloom: s.gloom,
          rugged: s.rugged,
          lean: rand.range(-0.12, 0.12),
          ink: INK,
          gullies: 3,
          shadow: i < 3,
          rand,
        });
      });
    },
  });
}

const specs: PeakSpec[] = [
  { id: 'mountain.brown', name: 'Brown Mountain', rock: ROCK.brown, order: 10, tags: ['brown', 'rock'] },
  { id: 'mountain.snowy', name: 'Snow-capped Mountain', rock: ROCK.brown, snow: 0.36, order: 20, tags: ['snow', 'snowy', 'alpine'] },
  { id: 'mountain.gray', name: 'Gray Mountain', rock: ROCK.gray, order: 30, tags: ['gray', 'grey', 'stone'] },
  { id: 'mountain.gray.snowy', name: 'Gray Snow Peak', rock: ROCK.gray, snow: 0.38, order: 40, tags: ['snow', 'gray', 'alpine'] },
  { id: 'mountain.black', name: 'Dark Mountain', rock: ROCK.black, gloom: 0.15, rugged: 1.5, order: 50, tags: ['black', 'dark', 'evil', 'storm'] },
  { id: 'mountain.red', name: 'Red Mountain', rock: ROCK.red, order: 60, tags: ['red', 'badlands'] },
  { id: 'mountain.green', name: 'Mossy Mountain', rock: ROCK.green, order: 70, tags: ['green', 'moss', 'grass'] },
];

const ranges: PeakSpec[] = [
  { id: 'range.brown', name: 'Brown Range', rock: ROCK.brown, order: 110, tags: ['brown'] },
  { id: 'range.snowy', name: 'Snow-capped Range', rock: ROCK.brown, snow: 0.34, order: 120, tags: ['snow'] },
  { id: 'range.gray', name: 'Gray Range', rock: ROCK.gray, order: 130, tags: ['gray'] },
  { id: 'range.black', name: 'Dark Range', rock: ROCK.black, gloom: 0.15, rugged: 1.5, order: 140, tags: ['black', 'dark'] },
];

export default [...specs.map(single), ...ranges.map(range)];
