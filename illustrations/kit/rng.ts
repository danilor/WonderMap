import type { Rng } from './types';

/** FNV-1a string hash → unsigned 32-bit int. */
export function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Combine several numbers/strings into one 32-bit seed. */
export function combineSeed(...parts: Array<number | string>): number {
  let h = 0x9e3779b9;
  for (const part of parts) {
    const v = typeof part === 'string' ? hashString(part) : part | 0;
    h = Math.imul(h ^ v, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

/** mulberry32-based deterministic generator. */
export function createRng(seedInput: number | string): Rng {
  const seed = (typeof seedInput === 'string' ? hashString(seedInput) : seedInput) >>> 0;
  let a = seed;

  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng: Rng = {
    seed,
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)] as never,
    sign: () => (next() < 0.5 ? -1 : 1),
    gauss: () => (next() + next() + next() + next() - 2) / 2,
    fork: (salt) => createRng(combineSeed(seed, salt)),
  };
  return rng;
}
