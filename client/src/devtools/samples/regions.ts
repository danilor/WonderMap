import { bounds, pointInPoly, valueNoise } from '@wondermap/illustrations/kit';
import { distanceToOutline, distanceToPolyline } from './geometry';
import type { Polygon } from './geometry';

/** A patch of the map that a scatter fills with symbols. */
export interface Region {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  /** 0 outside the patch, growing towards 1 where it is deepest. */
  weight(x: number, y: number): number;
}

export interface AreaOptions {
  /** Pushes the edge about with noise by up to this many px, so the patch is not a plain polygon. Default 24. */
  warp?: number;
  /** Width of the fringe where the patch thins out towards its edge. Default 0: a crisp edge. */
  soft?: number;
  seed?: number;
}

/** Length of one wave of the edge noise. */
const WARP_SCALE = 70;

/** A closed outline filled with symbols. */
export function areaRegion(polygon: Polygon, o: AreaOptions = {}): Region {
  const warp = o.warp ?? 24;
  const soft = o.soft ?? 0;
  const seed = o.seed ?? 0;
  const b = bounds(polygon);
  return {
    x0: b.minX - warp,
    y0: b.minY - warp,
    x1: b.maxX + warp,
    y1: b.maxY + warp,
    weight(x, y) {
      const qx = warp ? x + (valueNoise(x / WARP_SCALE, y / WARP_SCALE, seed) - 0.5) * 2 * warp : x;
      const qy = warp ? y + (valueNoise(x / WARP_SCALE + 31.7, y / WARP_SCALE + 17.3, seed + 7) - 0.5) * 2 * warp : y;
      if (!pointInPoly(qx, qy, polygon)) return 0;
      return soft > 0 ? Math.min(1, distanceToOutline(qx, qy, polygon) / soft) : 1;
    },
  };
}

/** The strip around a line, thickest in its middle: a mountain range, a river valley, a road lined with trees. */
export function ridgeRegion(line: Polygon, width: number, o: { seed?: number } = {}): Region {
  const seed = o.seed ?? 0;
  const b = bounds(line);
  const reach = width * 0.7;
  return {
    x0: b.minX - reach,
    y0: b.minY - reach,
    x1: b.maxX + reach,
    y1: b.maxY + reach,
    weight(x, y) {
      const half = (width / 2) * (0.75 + 0.5 * valueNoise(x / 110, y / 110, seed));
      const d = distanceToPolyline(x, y, line);
      if (d >= half) return 0;
      const t = d / half;
      return 1 - t * t;
    },
  };
}
