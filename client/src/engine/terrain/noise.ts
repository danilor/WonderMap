/**
 * Fast table-based value noise for the per-pixel terrain painter (the art kit has a nicer but slower one).
 * Output is in [0, 1]; the lattice wraps every 256 cells, which is invisible at the frequencies used.
 */

const SIZE = 256;
const MASK = SIZE - 1;
const table = new Float32Array(SIZE * SIZE);

(function fill() {
  let s = 0x2545f491;
  for (let i = 0; i < table.length; i++) {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    table[i] = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
})();

export function noise2(x: number, y: number): number {
  const fx = Math.floor(x);
  const fy = Math.floor(y);
  const tx = x - fx;
  const ty = y - fy;
  const ix = fx & MASK;
  const iy = fy & MASK;
  const ix1 = (ix + 1) & MASK;
  const iy1 = (iy + 1) & MASK;
  const a = table[iy * SIZE + ix]!;
  const b = table[iy * SIZE + ix1]!;
  const c = table[iy1 * SIZE + ix]!;
  const d = table[iy1 * SIZE + ix1]!;
  const u = tx * tx * (3 - 2 * tx);
  const v = ty * ty * (3 - 2 * ty);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Offsets that make the noise differ from map to map while staying deterministic for a seed. */
export function seedOffset(seed: number, salt: number): number {
  let h = Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h ^= h >>> 12;
  return ((h >>> 0) % 4096) + 0.37;
}
