import { defineSymbol } from '../../kit/define';
import type { Ctx2D, Rng } from '../../kit/types';
import { INK } from '../../parts/relief-common';
import { SMOKE, drawPlume, type CloudTones } from '../../parts/relief-fire';
import { VOLCANO_ROCK, drawVolcano, type CraterKind, type RockTones, type VolcanoStream } from '../../parts/relief-volcano';
import { FOLIAGE, drawPine, drawRoundTree } from '../../parts/tree';

interface ConeSpec {
  w: number;
  h: number;
  rim: number;
  open?: number;
  curve: number;
  curveL?: number;
  curveR?: number;
  lean?: number;
  horn?: number;
  rimTilt?: number;
  rock: RockTones;
  crater: CraterKind;
  green?: number;
  snow?: number;
  glow?: number;
  streams?: VolcanoStream[];
  /** Trees standing at the foot of the cone. */
  trees?: { kind: 'round' | 'pine'; n: number };
  /** Thin smoke leaving the crater. */
  wisp?: { tones: CloudTones; drift: number };
  /** A smaller cone peeking out behind the main one. */
  twin?: { dx: number; dy: number; w: number; h: number; rim: number };
}

function footTrees(ctx: Ctx2D, rand: Rng, cx: number, baseY: number, footR: number, kind: 'round' | 'pine', n: number, snowy: boolean): void {
  const items: { x: number; y: number; s: number }[] = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const a = Math.PI * (side < 0 ? rand.range(0.62, 0.92) : rand.range(0.08, 0.38));
    items.push({ x: cx + Math.cos(a) * footR * rand.range(0.88, 1.06), y: baseY + Math.sin(a) * footR * 0.2 * rand.range(0.9, 1.3) + 2, s: rand.range(10, 14) });
  }
  items.sort((a, b) => a.y - b.y);
  for (const t of items) {
    if (kind === 'pine') drawPine(ctx, { cx: t.x, baseY: t.y, w: t.s * 0.8, h: t.s * 1.4, leaf: FOLIAGE.dark, ink: INK, rand, tiers: 3, snow: snowy });
    else drawRoundTree(ctx, { cx: t.x, baseY: t.y, w: t.s, h: t.s * 1.1, leaf: rand.chance(0.5) ? FOLIAGE.green : FOLIAGE.olive, ink: INK, rand, lobes: 3 });
  }
}

function drawCone(ctx: Ctx2D, rand: Rng, s: ConeSpec, w: number, h: number, pad: number): void {
  const cx = w / 2;
  const baseY = h - pad;
  if (s.twin) {
    drawVolcano(ctx, { cx: cx + s.twin.dx, baseY: baseY + s.twin.dy, w: s.twin.w, h: s.twin.h, rand, ink: INK, rock: s.rock, crater: s.crater, rim: s.twin.rim, curve: s.curve, rubble: 3, glow: s.glow });
  }
  const g = drawVolcano(ctx, {
    cx, baseY, w: s.w, h: s.h, rand, ink: INK, rock: s.rock, crater: s.crater, rim: s.rim, open: s.open, curve: s.curve, curveL: s.curveL, curveR: s.curveR,
    lean: s.lean, horn: s.horn, rimTilt: s.rimTilt, green: s.green, snow: s.snow, glow: s.glow, streams: s.streams,
  });
  if (s.trees) footTrees(ctx, rand, cx, baseY, s.w / 2, s.trees.kind, s.trees.n, (s.snow ?? 0) > 0);
  if (s.wisp) {
    const r1 = 6.5;
    const startY = g.vent[1] - g.rimRy * 0.55;
    const rise = Math.min(22, startY - r1 * 1.25 - 2);
    drawPlume(ctx, rand, { x: g.vent[0], y: startY, rise, drift: s.wisp.drift, r0: 3.2, r1, puffs: 4, tones: s.wisp.tones, lw: 0.9 });
  }
}

const DORMANT: ConeSpec[] = [
  { w: 106, h: 54, rim: 0.2, open: 0.74, curve: 1.6, rock: VOLCANO_ROCK.umber, crater: 'dark', green: 0.28 },
  { w: 116, h: 50, rim: 0.24, open: 0.8, curve: 1.5, rock: VOLCANO_ROCK.gray, crater: 'water', green: 0.42, trees: { kind: 'round', n: 3 } },
  { w: 100, h: 58, rim: 0.18, curve: 1.75, horn: 4, lean: -2, rock: VOLCANO_ROCK.tan, crater: 'dark', green: 0.45, trees: { kind: 'round', n: 4 } },
  { w: 122, h: 44, rim: 0.28, open: 0.8, curve: 1.4, rimTilt: 0.44, rock: VOLCANO_ROCK.basalt, crater: 'water', green: 0.35 },
  { w: 96, h: 62, rim: 0.17, curve: 1.8, curveL: 2, curveR: 1.4, lean: 3, rock: VOLCANO_ROCK.red, crater: 'dark', green: 0.3 },
  { w: 112, h: 52, rim: 0.22, open: 0.8, curve: 1.55, horn: -4, rock: VOLCANO_ROCK.umber, crater: 'water', green: 0.5, trees: { kind: 'round', n: 3 } },
];

const SNOWY: ConeSpec[] = [
  { w: 106, h: 60, rim: 0.19, curve: 1.65, rock: VOLCANO_ROCK.gray, crater: 'snow', snow: 0.5 },
  { w: 114, h: 54, rim: 0.22, curve: 1.55, rock: VOLCANO_ROCK.basalt, crater: 'dark', snow: 0.42, trees: { kind: 'pine', n: 4 } },
  { w: 98, h: 64, rim: 0.16, curve: 1.8, horn: 4, rock: VOLCANO_ROCK.umber, crater: 'snow', snow: 0.58 },
  { w: 122, h: 48, rim: 0.3, open: 0.8, curve: 1.4, rimTilt: 0.44, rock: VOLCANO_ROCK.gray, crater: 'water', snow: 0.36, trees: { kind: 'pine', n: 3 } },
  { w: 102, h: 62, rim: 0.2, curve: 1.7, lean: -3, rock: VOLCANO_ROCK.basalt, crater: 'lava', snow: 0.4, glow: 0.3, wisp: { tones: SMOKE.gray, drift: 9 }, streams: [{ u: 0.2, reach: 0.4, width: 3.4 }] },
];

const ASH: ConeSpec[] = [
  { w: 94, h: 46, rim: 0.18, open: 0.78, curve: 1.3, rock: VOLCANO_ROCK.ash, crater: 'dark', wisp: { tones: SMOKE.ash, drift: 8 } },
  { w: 100, h: 42, rim: 0.28, open: 0.8, curve: 1.2, rock: VOLCANO_ROCK.ash, crater: 'lava', glow: 0.28, wisp: { tones: SMOKE.dark, drift: -8 } },
  { w: 86, h: 54, rim: 0.15, curve: 1.4, horn: 3, rock: VOLCANO_ROCK.ash, crater: 'dark' },
  { w: 90, h: 46, rim: 0.2, curve: 1.3, lean: 3, rock: VOLCANO_ROCK.ash, crater: 'dark', twin: { dx: -29, dy: -6, w: 52, h: 28, rim: 0.22 }, wisp: { tones: SMOKE.ash, drift: 6 } },
  { w: 110, h: 38, rim: 0.34, open: 0.82, curve: 1.15, rimTilt: 0.44, rock: VOLCANO_ROCK.ash, crater: 'dark' },
];

const CALDERA: ConeSpec[] = [
  { w: 128, h: 22, rim: 0.58, open: 0.86, curve: 1.0, rimTilt: 0.5, rock: VOLCANO_ROCK.umber, crater: 'lava', glow: 0.3 },
  { w: 128, h: 22, rim: 0.58, open: 0.86, curve: 1.0, rimTilt: 0.5, rock: VOLCANO_ROCK.gray, crater: 'water', green: 0.3 },
  { w: 124, h: 24, rim: 0.56, open: 0.86, curve: 1.05, rimTilt: 0.5, lean: 2, horn: 3, rock: VOLCANO_ROCK.tan, crater: 'acid' },
  { w: 130, h: 20, rim: 0.6, open: 0.88, curve: 0.95, rimTilt: 0.5, rock: VOLCANO_ROCK.basalt, crater: 'dark' },
  { w: 126, h: 24, rim: 0.56, open: 0.86, curve: 1.05, rimTilt: 0.5, rock: VOLCANO_ROCK.gray, crater: 'snow', snow: 0.3 },
  { w: 122, h: 26, rim: 0.54, open: 0.84, curve: 1.1, rimTilt: 0.5, horn: -4, rock: VOLCANO_ROCK.red, crater: 'water', green: 0.5, trees: { kind: 'round', n: 3 } },
];

const make = (id: string, name: string, specs: ConeSpec[], size: [number, number], pad: number, order: number, tags: string[]): ReturnType<typeof defineSymbol> =>
  defineSymbol({
    id,
    name,
    category: 'volcanic',
    size,
    anchor: [0.5, (size[1] - pad) / size[1]],
    order,
    tags,
    placement: 'land',
    variants: specs.length,
    draw({ ctx, rand, variant, w, h }) {
      drawCone(ctx, rand, specs[variant % specs.length]!, w, h, pad);
    },
  });

export default [
  make('volcano.dormant', 'Dormant Volcano', DORMANT, [128, 104], 20, 520, ['volcano', 'dormant', 'extinct', 'mountain', 'crater']),
  make('volcano.snowy', 'Snow-capped Volcano', SNOWY, [128, 108], 20, 530, ['volcano', 'snow', 'ice', 'mountain', 'crater']),
  make('volcano.ash', 'Ash Cone', ASH, [120, 100], 18, 540, ['volcano', 'ash', 'cinder', 'black', 'cone', 'smoke']),
  make('volcano.crater', 'Caldera', CALDERA, [136, 88], 18, 550, ['volcano', 'caldera', 'crater', 'lake', 'lava']),
];
