import { defineSymbol } from '../../kit/define';
import type { Ctx2D, Rng } from '../../kit/types';
import { INK } from '../../parts/relief-common';
import { SMOKE, drawFountain, drawPlume, drawSparks } from '../../parts/relief-fire';
import { VOLCANO_ROCK, drawVolcano, type RockTones, type VolcanoStream } from '../../parts/relief-volcano';

interface ConeSpec {
  w: number;
  h: number;
  rim: number;
  curve: number;
  curveL?: number;
  curveR?: number;
  lean?: number;
  horn?: number;
  streams: VolcanoStream[];
  rock: RockTones;
  /** Smoke: total rise and sideways drift. */
  rise: number;
  drift: number;
}

const ACTIVE: ConeSpec[] = [
  { w: 116, h: 50, rim: 0.36, curve: 1.7, streams: [{ u: -0.3, reach: 0.85, width: 5 }, { u: 0.45, reach: 0.6, width: 4 }], rock: VOLCANO_ROCK.basalt, rise: 30, drift: 14 },
  { w: 96, h: 62, rim: 0.3, curve: 1.95, lean: -2, horn: 4, streams: [{ u: 0.05, reach: 1, width: 5.2 }], rock: VOLCANO_ROCK.umber, rise: 24, drift: -12 },
  { w: 130, h: 42, rim: 0.34, curve: 1.4, lean: 3, streams: [{ u: -0.5, reach: 0.9, width: 4.6 }, { u: 0.05, reach: 0.7, width: 4 }, { u: 0.55, reach: 1, width: 4.8 }], rock: VOLCANO_ROCK.red, rise: 34, drift: 18 },
  { w: 110, h: 56, rim: 0.32, curve: 1.8, curveL: 2.2, curveR: 1.35, lean: 5, horn: -3, streams: [{ u: 0.3, reach: 0.95, width: 4.8 }, { u: -0.35, reach: 0.5, width: 3.6 }], rock: VOLCANO_ROCK.gray, rise: 28, drift: 10 },
];

const ERUPTING: ConeSpec[] = [
  { w: 112, h: 50, rim: 0.36, curve: 1.6, streams: [{ u: -0.4, reach: 0.9, width: 5.4 }, { u: 0.1, reach: 0.65, width: 4.4 }, { u: 0.55, reach: 1, width: 5.2 }], rock: VOLCANO_ROCK.basalt, rise: 56, drift: 16 },
  { w: 100, h: 58, rim: 0.32, curve: 1.9, lean: -2, horn: 5, streams: [{ u: 0.3, reach: 1, width: 5.6 }, { u: -0.35, reach: 0.7, width: 4.2 }], rock: VOLCANO_ROCK.umber, rise: 52, drift: -18 },
  { w: 124, h: 44, rim: 0.4, curve: 1.45, lean: 3, streams: [{ u: -0.55, reach: 0.8, width: 4.6 }, { u: -0.05, reach: 1, width: 5.4 }, { u: 0.5, reach: 0.75, width: 4.6 }], rock: VOLCANO_ROCK.red, rise: 58, drift: 4 },
  { w: 106, h: 54, rim: 0.34, curve: 1.8, curveL: 2.2, curveR: 1.4, lean: 4, horn: -4, streams: [{ u: 0.35, reach: 0.95, width: 5.2 }, { u: -0.3, reach: 0.55, width: 3.8 }], rock: VOLCANO_ROCK.gray, rise: 54, drift: 12 },
];

function active(ctx: Ctx2D, rand: Rng, s: ConeSpec, w: number, h: number): void {
  const g = drawVolcano(ctx, { cx: w / 2, baseY: h - 16, w: s.w, h: s.h, rand, ink: INK, rock: s.rock, crater: 'lava', rim: s.rim, curve: s.curve, curveL: s.curveL, curveR: s.curveR, lean: s.lean, horn: s.horn, streams: s.streams, scorch: 0.2 });
  drawPlume(ctx, rand, { x: g.vent[0], y: g.vent[1] - g.rimRy * 0.55, rise: s.rise, drift: s.drift, r0: 5.5, r1: 11, puffs: 6, tones: SMOKE.gray, lw: 1 });
  drawSparks(ctx, rand, g.vent[0], g.vent[1], 6, 9, 4);
}

function erupting(ctx: Ctx2D, rand: Rng, s: ConeSpec, w: number, h: number): void {
  const g = drawVolcano(ctx, { cx: w / 2, baseY: h - 16, w: s.w, h: s.h, rand, ink: INK, rock: s.rock, crater: 'lava', rim: s.rim, open: 0.8, curve: s.curve, curveL: s.curveL, curveR: s.curveR, lean: s.lean, horn: s.horn, streams: s.streams, glow: 0.62, scorch: 0.28 });
  const [vx, vy] = g.vent;
  drawPlume(ctx, rand, { x: vx, y: vy - g.rimRy * 0.3, rise: s.rise, drift: s.drift, r0: 8, r1: 17, puffs: 7, tones: SMOKE.dark, lw: 1.2, underglow: 0.7 });
  drawFountain(ctx, rand, vx, vy + g.rimRy * 0.4, 22, 13, 5);
  drawSparks(ctx, rand, vx, vy - 4, 20, 34, 9);
}

export default [
  defineSymbol({
    id: 'volcano.active',
    name: 'Active Volcano',
    category: 'volcanic',
    size: [140, 120],
    anchor: [0.5, 0.87],
    order: 500,
    tags: ['volcano', 'lava', 'mountain', 'smoke', 'fire', 'erupt'],
    placement: 'land',
    variants: ACTIVE.length,
    draw({ ctx, rand, variant, w, h }) {
      active(ctx, rand, ACTIVE[variant % ACTIVE.length]!, w, h);
    },
  }),
  defineSymbol({
    id: 'volcano.erupting',
    name: 'Erupting Volcano',
    category: 'volcanic',
    size: [160, 150],
    anchor: [0.5, 0.89],
    order: 510,
    tags: ['volcano', 'lava', 'ash', 'eruption', 'explosion', 'fire', 'smoke'],
    placement: 'land',
    variants: ERUPTING.length,
    draw({ ctx, rand, variant, w, h }) {
      erupting(ctx, rand, ERUPTING[variant % ERUPTING.length]!, w, h);
    },
  }),
];
