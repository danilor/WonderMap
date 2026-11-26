import type { Vec2 } from '@wondermap/illustrations/kit';
import type { TerrainLayer } from '../../model/types';

/** Calls `visit` with the grid index of every terrain cell whose centre is inside the polygon (even-odd rule). */
export function fillPolygon(layer: TerrainLayer, polygon: readonly Vec2[], visit: (index: number) => void): void {
  const { cell, cols, rows } = layer;
  const n = polygon.length;
  if (n < 3) return;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of polygon) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const firstRow = Math.max(0, Math.floor(minY / cell));
  const lastRow = Math.min(rows - 1, Math.ceil(maxY / cell));
  const crossings: number[] = [];
  for (let row = firstRow; row <= lastRow; row++) {
    const y = (row + 0.5) * cell;
    crossings.length = 0;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const [xi, yi] = polygon[i]!;
      const [xj, yj] = polygon[j]!;
      if (yi > y !== yj > y) crossings.push(xi + ((y - yi) * (xj - xi)) / (yj - yi));
    }
    crossings.sort((a, b) => a - b);
    for (let k = 0; k + 1 < crossings.length; k += 2) {
      const from = Math.max(0, Math.ceil(crossings[k]! / cell - 0.5));
      const to = Math.min(cols - 1, Math.ceil(crossings[k + 1]! / cell - 0.5) - 1);
      for (let col = from; col <= to; col++) visit(row * cols + col);
    }
  }
}
