import { brushes, symbols } from '@wondermap/illustrations';
import type { ResolvedBrush } from '@wondermap/illustrations';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NewSymbol } from '../model/ops';
import type { MapSymbol } from '../model/types';
import { ScatterSession } from './scatter';
import type { ScatterSettings } from './scatter';

afterEach(() => vi.restoreAllMocks());

const land = symbols.find((s) => s.placement === 'land' && s.variants > 1 && !s.rotatable)!;
const sea = symbols.find((s) => s.placement === 'sea')!;
const anywhere = symbols.find((s) => s.placement === 'any')!;
const turning = symbols.find((s) => s.rotatable)!;

const brushOf = (symbolIds: string[], over: Partial<ResolvedBrush> = {}): ResolvedBrush => ({
  id: 'test.brush',
  name: 'Test',
  category: land.category,
  items: symbolIds.map((symbol) => ({ symbol, weight: 1 })),
  spacing: 40,
  scale: [0.8, 1.2],
  jitter: 0.4,
  flip: true,
  order: 1,
  blurb: '',
  ...over,
});

const settingsOf = (over: Partial<ScatterSettings> = {}): ScatterSettings => ({
  brush: brushOf([land.id]),
  scale: 1,
  randomScale: true,
  randomFlip: true,
  randomVariant: true,
  width: 2000,
  height: 1500,
  landAt: () => true,
  ...over,
});

const session = (over: Partial<ScatterSettings> = {}, existing: MapSymbol[] = []) => new ScatterSession(settingsOf(over), existing);
const placed = (asset: string, x: number, y: number): MapSymbol => ({ id: `${asset}@${x},${y}`, asset, x, y, scale: 1, rotation: 0, flip: false, variant: 0 });

describe('ScatterSession.fill', () => {
  it('fills the brush disc at about one symbol per lattice cell', () => {
    const out = session().fill(1000, 750, 300);
    const cells = (Math.PI * 300 * 300) / (40 * 40); // ≈ 177
    expect(out.length).toBeGreaterThan(cells * 0.45);
    expect(out.length).toBeLessThanOrEqual(cells * 1.1);
    for (const s of out) {
      expect(Math.hypot(s.x - 1000, s.y - 750)).toBeLessThanOrEqual(300);
      expect(s.asset).toBe(land.id);
    }
  });

  it('adds nothing when you sweep the same spot again', () => {
    const s = session();
    expect(s.fill(1000, 750, 200).length).toBeGreaterThan(0);
    expect(s.fill(1000, 750, 200)).toEqual([]);
    expect(s.fill(1010, 760, 150)).toEqual([]);
  });

  it('only adds symbols for the part of the disc that is new', () => {
    const s = session();
    s.fill(800, 750, 200);
    const more = s.fill(1000, 750, 200);
    expect(more.length).toBeGreaterThan(0);
    for (const m of more) expect(Math.hypot(m.x - 800, m.y - 750)).toBeGreaterThan(200);
  });

  it('gives the same result however the disc is swept', () => {
    // A fixed seed and no jitter make every lattice cell deterministic and free of crowding.
    vi.spyOn(Math, 'random').mockReturnValue(0.37);
    const key = (s: NewSymbol) => `${s.asset}@${s.x.toFixed(2)},${s.y.toFixed(2)}`;
    const brush = brushOf([land.id], { jitter: 0 });
    const whole = session({ brush }).fill(1000, 750, 300).map(key).sort();
    expect(whole.length).toBeGreaterThan(100);

    const parts = session({ brush });
    const small = [0, 1, 2, 3, 4].flatMap((i) => parts.fill(850 + i * 75, 750, 100));
    const swept = [...small, ...parts.fill(1000, 750, 300)].map(key).sort();
    expect(small.length).toBeGreaterThan(0);
    expect(swept).toEqual(whole);
  });

  it('never packs symbols of the same kind tighter than 0.45 × spacing', () => {
    const out = session().fill(1000, 750, 400);
    expect(out.length).toBeGreaterThan(100);
    // Candidates come from distinct lattice cells; crowding is checked against everything already placed.
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        expect(Math.hypot(out[i]!.x - out[j]!.x, out[i]!.y - out[j]!.y)).toBeGreaterThanOrEqual(40 * 0.45);
      }
    }
  });

  it('leaves room around symbols of its own kind that are already on the map', () => {
    const existing: MapSymbol[] = [];
    for (let x = 800; x <= 1200; x += 20) for (let y = 550; y <= 950; y += 20) existing.push(placed(land.id, x, y));
    expect(session({}, existing).fill(1000, 750, 150)).toEqual([]);
  });

  it('does not mind symbols of other kinds', () => {
    const existing: MapSymbol[] = [];
    for (let x = 800; x <= 1200; x += 20) for (let y = 550; y <= 950; y += 20) existing.push(placed(anywhere.id, x, y));
    expect(session({}, existing).fill(1000, 750, 150).length).toBeGreaterThan(20);
  });

  it('stays on the map', () => {
    for (const [cx, cy] of [[10, 10], [1990, 1490], [0, 1500], [2000, 0]] as const) {
      for (const s of session().fill(cx, cy, 250)) {
        expect(s.x).toBeGreaterThanOrEqual(0);
        expect(s.x).toBeLessThanOrEqual(2000);
        expect(s.y).toBeGreaterThanOrEqual(0);
        expect(s.y).toBeLessThanOrEqual(1500);
      }
    }
  });
});

describe('placement hints', () => {
  const half = (x: number) => x < 1000; // land on the left half of the map, sea on the right

  it('keeps land symbols on land and sea symbols on the sea', () => {
    const onLand = session({ brush: brushOf([land.id]), landAt: half }).fill(1000, 750, 400);
    expect(onLand.length).toBeGreaterThan(30);
    expect(onLand.every((s) => half(s.x))).toBe(true);
    const onSea = session({ brush: brushOf([sea.id]), landAt: half }).fill(1000, 750, 400);
    expect(onSea.length).toBeGreaterThan(30);
    expect(onSea.every((s) => !half(s.x))).toBe(true);
  });

  it('lets "any" symbols go everywhere', () => {
    const out = session({ brush: brushOf([anywhere.id]), landAt: half }).fill(1000, 750, 400);
    expect(out.some((s) => half(s.x))).toBe(true);
    expect(out.some((s) => !half(s.x))).toBe(true);
  });
});

describe('look of the symbols', () => {
  it('scales within the brush range times the user scale', () => {
    const normal = session({ scale: 1 }).fill(1000, 750, 400);
    expect(normal.every((s) => s.scale >= 0.8 && s.scale <= 1.2)).toBe(true);
    expect(new Set(normal.map((s) => s.scale.toFixed(3))).size).toBeGreaterThan(10);
    const big = session({ scale: 2.5 }).fill(1000, 750, 500);
    expect(big.every((s) => s.scale >= 0.8 * 2.5 - 1e-9 && s.scale <= 1.2 * 2.5 + 1e-9)).toBe(true);
  });

  it('stretches the spacing with the user scale', () => {
    const small = session({ scale: 1 }).fill(1000, 750, 300).length;
    const big = session({ scale: 2 }).fill(1000, 750, 300).length;
    expect(big).toBeLessThan(small * 0.45);
  });

  it('uses the middle of the range when random scale is off', () => {
    const out = session({ randomScale: false }).fill(1000, 750, 300);
    expect(out.length).toBeGreaterThan(30);
    expect(out.every((s) => Math.abs(s.scale - 1.0) < 1e-9)).toBe(true);
  });

  it('flips at random, unless told not to', () => {
    const mixed = session().fill(1000, 750, 400);
    expect(mixed.some((s) => s.flip)).toBe(true);
    expect(mixed.some((s) => !s.flip)).toBe(true);
    expect(session({ randomFlip: false }).fill(1000, 750, 400).every((s) => !s.flip)).toBe(true);
    expect(session({ brush: brushOf([land.id], { flip: false }) }).fill(1000, 750, 400).every((s) => !s.flip)).toBe(true);
  });

  it('picks a random variant, or always the first', () => {
    const mixed = session().fill(1000, 750, 400);
    expect(new Set(mixed.map((s) => s.variant)).size).toBeGreaterThan(1);
    expect(mixed.every((s) => s.variant >= 0 && s.variant < land.variants)).toBe(true);
    expect(session({ randomVariant: false }).fill(1000, 750, 400).every((s) => s.variant === 0)).toBe(true);
  });

  it('only tilts symbols that may rotate', () => {
    const tilted = session({ brush: brushOf([turning.id]), landAt: () => turning.placement === 'land' }).fill(1000, 750, 400);
    expect(tilted.length).toBeGreaterThan(20);
    expect(tilted.some((s) => s.rotation !== 0)).toBe(true);
    expect(tilted.every((s) => Math.abs(s.rotation) <= 0.35)).toBe(true);
    expect(session().fill(1000, 750, 400).every((s) => s.rotation === 0)).toBe(true);
  });
});

describe('brush items', () => {
  it('mixes the items of a brush by weight', () => {
    const other = symbols.find((s) => s.id !== land.id && s.placement !== 'sea')!;
    const brush = brushOf([land.id, other.id]);
    brush.items = [{ symbol: land.id, weight: 9 }, { symbol: other.id, weight: 1 }];
    const out = session({ brush, landAt: () => other.placement !== 'sea' }).fill(1000, 750, 600);
    const share = out.filter((s) => s.asset === land.id).length / out.length;
    expect(out.length).toBeGreaterThan(150);
    expect(share).toBeGreaterThan(0.75);
    expect(share).toBeLessThan(0.97);
  });

  it('ignores unknown symbols and items without weight', () => {
    const brush = brushOf([]);
    brush.items = [{ symbol: 'gone.forever', weight: 5 }, { symbol: anywhere.id, weight: 0 }, { symbol: land.id, weight: 1 }];
    const out = session({ brush }).fill(1000, 750, 400);
    expect(out.length).toBeGreaterThan(30);
    expect(out.every((s) => s.asset === land.id)).toBe(true);
  });

  it('paints nothing for a brush without usable items', () => {
    const brush = brushOf([]);
    brush.items = [{ symbol: 'gone.forever', weight: 1 }];
    expect(session({ brush }).fill(1000, 750, 400)).toEqual([]);
  });
});

describe('the shipped brushes', () => {
  it.each(brushes.map((b) => [b.id, b] as const))('%s paints its own symbols', (_id, brush) => {
    const ids = new Set(brush.items.map((i) => i.symbol));
    const results = [true, false].flatMap((isLand) =>
      new ScatterSession(settingsOf({ brush, landAt: () => isLand, width: 4000, height: 4000 }), []).fill(2000, 2000, 1400),
    );
    expect(results.length).toBeGreaterThan(0);
    for (const s of results) {
      expect(ids.has(s.asset)).toBe(true);
      expect(s.scale).toBeGreaterThanOrEqual(brush.scale[0] - 1e-9);
      expect(s.scale).toBeLessThanOrEqual(brush.scale[1] + 1e-9);
    }
  });
});
