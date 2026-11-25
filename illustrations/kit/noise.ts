/**
 * Cheap deterministic value noise. All functions return values in [0, 1].
 * Used for wobbly coastlines, terrain textures and hand-drawn jitter.
 */

function lattice(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** Smooth 2D value noise. */
export function valueNoise(x: number, y: number, seed = 0): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const a = lattice(ix, iy, seed);
  const b = lattice(ix + 1, iy, seed);
  const c = lattice(ix, iy + 1, seed);
  const d = lattice(ix + 1, iy + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Fractal (multi-octave) noise. */
export function fbm(x: number, y: number, seed = 0, octaves = 4, gain = 0.5, lacunarity = 2): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x * freq, y * freq, seed + o * 101) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

/** Value noise that tiles seamlessly with the given integer period (in lattice cells). */
export function tileNoise(x: number, y: number, period: number, seed = 0): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const wrap = (v: number) => ((v % period) + period) % period;
  const x0 = wrap(ix);
  const x1 = wrap(ix + 1);
  const y0 = wrap(iy);
  const y1 = wrap(iy + 1);
  const a = lattice(x0, y0, seed);
  const b = lattice(x1, y0, seed);
  const c = lattice(x0, y1, seed);
  const d = lattice(x1, y1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Seamless fractal noise: `cells` is the base number of lattice cells across the tile. */
export function tileFbm(u: number, v: number, cells: number, seed = 0, octaves = 4, gain = 0.5): number {
  let amp = 1;
  let sum = 0;
  let norm = 0;
  let c = cells;
  for (let o = 0; o < octaves; o++) {
    sum += tileNoise(u * c, v * c, c, seed + o * 101) * amp;
    norm += amp;
    amp *= gain;
    c *= 2;
  }
  return sum / norm;
}
