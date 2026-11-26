import type { TerrainLayer } from '../../model/types';

/** Cost of a step along the grid and of a diagonal step: the classic 3-4 chamfer approximation of straight-line distance. */
const AXIS = 3;
const DIAGONAL = 4;

/**
 * Distance in map px from every cell to the nearest cell of the wanted kind (0 on those cells).
 * `'sea'` measures how far inland a cell is; `'land'` how far out at sea.
 */
export function distanceField(layer: TerrainLayer, target: 'land' | 'sea'): Float32Array {
  const { cols, rows, data, cell } = layer;
  const far = 1 << 28;
  const d = new Int32Array(cols * rows);
  for (let i = 0; i < d.length; i++) d[i] = (data[i]! > 0) === (target === 'land') ? 0 : far;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      let best = d[i]!;
      if (x > 0) best = Math.min(best, d[i - 1]! + AXIS);
      if (y > 0) {
        best = Math.min(best, d[i - cols]! + AXIS);
        if (x > 0) best = Math.min(best, d[i - cols - 1]! + DIAGONAL);
        if (x < cols - 1) best = Math.min(best, d[i - cols + 1]! + DIAGONAL);
      }
      d[i] = best;
    }
  }
  for (let y = rows - 1; y >= 0; y--) {
    for (let x = cols - 1; x >= 0; x--) {
      const i = y * cols + x;
      let best = d[i]!;
      if (x < cols - 1) best = Math.min(best, d[i + 1]! + AXIS);
      if (y < rows - 1) {
        best = Math.min(best, d[i + cols]! + AXIS);
        if (x < cols - 1) best = Math.min(best, d[i + cols + 1]! + DIAGONAL);
        if (x > 0) best = Math.min(best, d[i + cols - 1]! + DIAGONAL);
      }
      d[i] = best;
    }
  }

  const out = new Float32Array(d.length);
  for (let i = 0; i < d.length; i++) out[i] = d[i]! >= far ? Infinity : (d[i]! / AXIS) * cell;
  return out;
}
