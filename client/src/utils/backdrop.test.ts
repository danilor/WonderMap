import { symbols, terrainById } from '@wondermap/illustrations';
import { describe, expect, it } from 'vitest';
import { backdropFor } from './backdrop';

describe('backdropFor', () => {
  it('puts things of the sea on water and desert things on sand', () => {
    expect(backdropFor({ category: 'forests', placement: 'sea' })).toBe('sea');
    expect(backdropFor({ category: 'sea', placement: 'any' })).toBe('sea');
    expect(backdropFor({ category: 'desert', placement: 'land' })).toBe('sand');
    expect(backdropFor({ category: 'ice', placement: 'land' })).toBe('snow');
    expect(backdropFor({ category: 'swamp', placement: 'land' })).toBe('swamp');
    expect(backdropFor({ category: 'volcanic', placement: 'land' })).toBe('stone');
    expect(backdropFor({ category: 'decor', placement: 'any' })).toBe('paper');
    expect(backdropFor({ category: 'mountains', placement: 'land' })).toBe('grass');
  });

  it('only ever names a ground that can be drawn', () => {
    for (const def of symbols) {
      const kind = backdropFor(def);
      expect(kind === 'sea' || kind === 'paper' || terrainById.has(kind), `${def.id} -> ${kind}`).toBe(true);
    }
  });
});
