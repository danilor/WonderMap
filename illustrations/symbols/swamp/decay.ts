import { defineSymbol } from '../../kit/define';
import { lighten } from '../../kit/colors';
import { ellipse, linearGradient, shape } from '../../kit/draw';
import { blob } from '../../kit/shapes';
import type { Ctx2D, Rng } from '../../kit/types';
import { drawBeastSkull, drawHumanSkull, drawLongBone, drawRibcage } from '../../parts/nature-bones';
import { INK, drawTuft } from '../../parts/nature-common';
import { drawVulture } from '../../parts/nature-scrub';
import { drawSnag, SNAG_BARK } from '../../parts/nature-snag';
import { drawPool, WATER } from '../../parts/nature-water';
import { MUSHROOM, drawLog, drawMushrooms, type MushroomPalette } from '../../parts/nature-woodland';

const GRASS = { dark: '#2f4426', base: '#547a3b', light: '#86a95a' };
const MOSS = '#7f9a55';

function tuft(ctx: Ctx2D, rand: Rng, x: number, y: number, h = 7): void {
  drawTuft(ctx, rand, { x, y, h, spread: h * 0.5, count: 5, ...GRASS, ink: INK, inkW: 0.7 });
}

/** Shallow murky water around the foot of something. */
function shallows(ctx: Ctx2D, rand: Rng, cx: number, cy: number, rx: number, ry = rx * 0.3): void {
  drawPool(ctx, rand, { cx, cy, rx, ry, pal: WATER.murk, lumpy: 0.5, ripples: 2, glints: 1 });
}

/** A mossy or muddy cushion of ground. */
function cushion(ctx: Ctx2D, rand: Rng, cx: number, cy: number, rx: number, ry: number, moss: boolean): void {
  const pts = blob(rand, cx, cy, rx, ry, { points: 14, jitter: 0.1 });
  const lit = moss ? '#8fae4c' : '#8a7650';
  const mid = moss ? '#5f8337' : '#66543a';
  const dark = moss ? '#38542a' : '#43362a';
  shape(ctx, pts, { fill: linearGradient(ctx, cx - rx, cy - ry, cx + rx * 0.6, cy + ry, [lit, mid, dark]), stroke: INK, width: 1.6, smooth: true });
  ellipse(ctx, cx - rx * 0.28, cy - ry * 0.34, rx * 0.42, ry * 0.2, { fill: lighten(lit, 0.2), alpha: 0.55, rotation: -0.15 });
}

/** A lump of moss growing over something pale. */
function mossLump(ctx: Ctx2D, rand: Rng, x: number, y: number, rx: number, ry: number): void {
  const pts = blob(rand, x, y, rx, ry, { points: 9, jitter: 0.16 });
  shape(ctx, pts, { fill: linearGradient(ctx, x - rx, y - ry, x + rx, y + ry, ['#9cbb55', '#6a8f3a', '#41602c']), stroke: INK, width: 1, smooth: true });
}

const deadTree = defineSymbol({
  id: 'swamp.dead-tree',
  name: 'Swamp snag',
  category: 'swamp',
  size: [56, 64],
  anchor: [0.5, 0.9],
  order: 50,
  tags: ['dead tree', 'snag', 'swamp', 'bog', 'moss', 'mossy', 'rotten', 'bare', 'creepy', 'haunted', 'crow', 'tree'],
  placement: 'land',
  variants: 6,
  draw({ ctx, rand, variant }) {
    switch (variant % 6) {
      case 0:
        shallows(ctx, rand, 28, 58, 22);
        drawSnag(ctx, { cx: 28, baseY: 57, h: 52, w: 9, bark: SNAG_BARK.swamp, rand, limbs: 3, sideLimbs: 1, lean: 0.04, roots: 3, moss: MOSS, shadow: false });
        tuft(ctx, rand, 6, 58);
        tuft(ctx, rand, 50, 59, 6);
        break;
      case 1:
        shallows(ctx, rand, 29, 58, 21);
        drawSnag(ctx, { cx: 29, baseY: 57, h: 46, w: 12, bark: SNAG_BARK.swamp, rand, limbs: 2, sideLimbs: 1, lean: -0.1, hollow: true, up: 0.22, trunkFrac: 0.5, spread: 0.8, moss: MOSS, shadow: false });
        break;
      case 2:
        drawSnag(ctx, { cx: 38, baseY: 57, h: 38, w: 6.5, bark: SNAG_BARK.swamp, rand, limbs: 2, sideLimbs: 0, lean: 0.1, moss: MOSS });
        drawSnag(ctx, { cx: 22, baseY: 58, h: 52, w: 8.5, bark: SNAG_BARK.swamp, rand, limbs: 3, lean: -0.06, moss: MOSS });
        tuft(ctx, rand, 47, 60, 6);
        tuft(ctx, rand, 8, 60, 6);
        break;
      case 3: {
        shallows(ctx, rand, 28, 58, 21);
        const tips = drawSnag(ctx, { cx: 28, baseY: 57, h: 52, w: 8, bark: SNAG_BARK.swamp, rand, limbs: 4, spread: 0.9, up: 0.3, moss: MOSS, shadow: false });
        const perch = [...tips].sort((a, b) => a[1] - b[1]).find((p) => p[0] > 14 && p[0] < 44) ?? tips[0]!;
        drawVulture(ctx, perch[0] + 1, perch[1] + 0.5, 0.8);
        break;
      }
      case 4:
        cushion(ctx, rand, 28, 58, 21, 5, true);
        drawSnag(ctx, { cx: 28, baseY: 57, h: 36, w: 13, bark: SNAG_BARK.swamp, rand, limbs: 1, sideLimbs: 0, stubs: 3, trunkFrac: 0.72, hollow: true, moss: MOSS, shadow: false });
        drawMushrooms(ctx, { cx: 40, baseY: 59, w: 15, h: 14, kind: 'pale', count: 3, rand, shadow: false });
        break;
      default:
        shallows(ctx, rand, 28, 58, 22);
        drawSnag(ctx, { cx: 28, baseY: 57, h: 54, w: 8, bark: SNAG_BARK.swamp, rand, limbs: 5, spread: 1.15, up: 0.1, lean: 0.05, roots: 3, moss: MOSS, shadow: false });
        break;
    }
  },
});

const log = defineSymbol({
  id: 'swamp.log',
  name: 'Rotting log',
  category: 'swamp',
  size: [66, 38],
  anchor: [0.5, 0.88],
  order: 60,
  tags: ['log', 'fallen', 'rotting', 'mossy', 'moss', 'swamp', 'bog', 'timber', 'tree', 'driftwood'],
  placement: 'land',
  rotatable: true,
  variants: 5,
  draw({ ctx, w, h, rand, variant }) {
    const base = {
      cx: w / 2,
      baseY: h * 0.88,
      w: w * 0.92,
      h: h * 0.52,
      bark: '#4f4a38',
      wood: '#b7a97c',
      rand,
      moss: true,
    };
    switch (variant % 5) {
      case 0:
        shallows(ctx, rand, 33, 31, 29, 6);
        drawLog(ctx, { ...base, shadow: false });
        break;
      case 1:
        drawLog(ctx, { ...base, w: w * 0.84, fungi: '#d8c58a', flip: true, tilt: 0.04 });
        tuft(ctx, rand, 6, 33, 6);
        tuft(ctx, rand, 60, 34, 6);
        break;
      case 2:
        shallows(ctx, rand, 33, 31, 29, 6);
        drawLog(ctx, { ...base, h: h * 0.46, stubs: 2, shadow: false, tilt: -0.04 });
        break;
      case 3:
        drawLog(ctx, { ...base, fungi: '#c9a0d8', tilt: 0.05 });
        tuft(ctx, rand, 59, 34, 6);
        break;
      default:
        shallows(ctx, rand, 33, 31, 29, 6);
        drawLog(ctx, { ...base, w: w * 0.8, h: h * 0.58, stubs: 1, flip: true, shadow: false });
        break;
    }
  },
});

const SICKLY: MushroomPalette = { cap: '#8fb24a', stem: '#e6e3b8', lip: '#d4dd8c', spot: '#f1f6c6' };
const MUSH: MushroomPalette[] = [SICKLY, MUSHROOM.glow, MUSHROOM.pale, MUSHROOM.purple, MUSHROOM.brown, SICKLY];
const MUSH_COUNT = [3, 4, 2, 3, 5, 1];

const mushrooms = defineSymbol({
  id: 'swamp.mushrooms',
  name: 'Swamp mushrooms',
  category: 'swamp',
  size: [42, 38],
  anchor: [0.5, 0.9],
  order: 70,
  tags: ['mushroom', 'mushrooms', 'fungus', 'toadstool', 'swamp', 'bog', 'poison', 'glow', 'toxic', 'moss'],
  placement: 'land',
  variants: 6,
  draw({ ctx, w, h, rand, variant }) {
    const i = variant % 6;
    cushion(ctx, rand, w / 2, h * 0.88, w * 0.42, h * 0.1, i % 2 === 0);
    drawMushrooms(ctx, {
      cx: w / 2,
      baseY: h * 0.88,
      w: MUSH_COUNT[i]! === 1 ? w * 0.7 : w * 0.92,
      h: h * 0.88,
      kind: 'pale',
      palette: MUSH[i]!,
      count: MUSH_COUNT[i]!,
      rand,
      shadow: false,
    });
    if (i === 3) tuft(ctx, rand, 5, 34, 6);
  },
});

const skull = defineSymbol({
  id: 'swamp.skull',
  name: 'Skull and bones',
  category: 'swamp',
  size: [58, 42],
  anchor: [0.5, 0.78],
  order: 80,
  tags: ['skull', 'bones', 'skeleton', 'ribs', 'death', 'danger', 'remains', 'swamp', 'bog', 'mud', 'moss'],
  placement: 'land',
  variants: 5,
  draw({ ctx, rand, variant }) {
    switch (variant % 5) {
      case 0:
        drawPool(ctx, rand, { cx: 29, cy: 32, rx: 25, ry: 8, pal: WATER.bog, lumpy: 0.6, ripples: 2, glints: 1 });
        drawHumanSkull(ctx, { cx: 28, cy: 21, s: 1.1, tilt: -0.1, crack: true });
        mossLump(ctx, rand, 22, 14, 4.5, 2.6);
        tuft(ctx, rand, 6, 33, 6);
        tuft(ctx, rand, 52, 33, 6);
        break;
      case 1:
        drawBeastSkull(ctx, { cx: 29, cy: 22, s: 0.92, horns: 'bull' });
        cushion(ctx, rand, 29, 36, 20, 4.5, false);
        mossLump(ctx, rand, 24, 14, 4, 2.4);
        tuft(ctx, rand, 51, 36, 6);
        break;
      case 2:
        drawRibcage(ctx, { x: 8, y: 33, len: 40, h: 20, ribs: 5, slope: 0.06, rand });
        cushion(ctx, rand, 29, 37, 25, 4.5, false);
        tuft(ctx, rand, 7, 36, 6);
        mossLump(ctx, rand, 26, 20, 3.6, 2.2);
        break;
      case 3:
        drawLongBone(ctx, 9, 16, 49, 34, 4.6);
        drawLongBone(ctx, 9, 34, 49, 16, 4.6);
        drawHumanSkull(ctx, { cx: 29, cy: 21, s: 1.15, tilt: 0.08 });
        mossLump(ctx, rand, 33, 14, 4, 2.4);
        tuft(ctx, rand, 51, 37, 6);
        break;
      default:
        cushion(ctx, rand, 28, 34, 22, 5, true);
        drawHumanSkull(ctx, { cx: 25, cy: 22, s: 1, tilt: 0.25, jaw: false });
        drawMushrooms(ctx, { cx: 42, baseY: 36, w: 16, h: 15, kind: 'pale', count: 3, rand, shadow: false });
        break;
    }
  },
});

export default [deadTree, log, mushrooms, skull];
