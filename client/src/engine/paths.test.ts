import { describe, expect, it } from 'vitest';
import type { MapPath } from '../model/types';
import { distanceToPath, pathGeometry, pathWidths, simplifyStroke, smoothPoints, styleOf } from './paths';

const path = (points: [number, number][], style = 'road', width = 10, id = 'p'): MapPath => ({ id, style, points, width });

describe('smoothPoints', () => {
  it('returns a copy of fewer than three points', () => {
    const two: [number, number][] = [[0, 0], [10, 10]];
    const out = smoothPoints(two);
    expect(out).toEqual(two);
    expect(out[0]).not.toBe(two[0]);
    expect(smoothPoints([])).toEqual([]);
  });

  it('starts and ends on the control points and passes through every one of them', () => {
    const control: [number, number][] = [[0, 0], [100, 50], [200, 0], [300, 80]];
    const out = smoothPoints(control);
    expect(out[0]).toEqual([0, 0]);
    expect(out[out.length - 1]).toEqual([300, 80]);
    for (const c of control) {
      const nearest = Math.min(...out.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1])));
      expect(nearest).toBeLessThan(1e-6);
    }
  });

  it('is dense enough to look smooth: no gap is longer than a few pixels', () => {
    const out = smoothPoints([[0, 0], [300, 200], [600, 0]]);
    for (let i = 1; i < out.length; i++) expect(Math.hypot(out[i]![0] - out[i - 1]![0], out[i]![1] - out[i - 1]![1])).toBeLessThan(12);
    expect(out.length).toBeGreaterThan(60);
  });

  it('keeps straight lines straight', () => {
    for (const [x, y] of smoothPoints([[0, 0], [100, 100], [200, 200], [300, 300]])) expect(y).toBeCloseTo(x, 6);
  });
});

describe('pathWidths', () => {
  const line = smoothPoints([[0, 0], [100, 0], [200, 0]]);

  it('is constant when the style does not taper', () => {
    expect(new Set(pathWidths(line, 8, false))).toEqual(new Set([8]));
  });

  it('grows from a trickle to the full width for tapering styles', () => {
    const w = pathWidths(line, 20, true);
    expect(w[0]).toBeCloseTo(20 * 0.34, 9);
    expect(w[w.length - 1]).toBeCloseTo(20, 9);
    for (let i = 1; i < w.length; i++) expect(w[i]!).toBeGreaterThanOrEqual(w[i - 1]!);
  });

  it('copes with a degenerate path', () => {
    const w = pathWidths([[5, 5], [5, 5]], 10, true);
    expect(w.every(Number.isFinite)).toBe(true);
  });
});

describe('pathGeometry', () => {
  it('builds smoothed points, widths and padded bounds, and caches by path object', () => {
    const p = path([[100, 100], [200, 160], [300, 100]], 'river', 12);
    const g = pathGeometry(p);
    expect(g.points.length).toBeGreaterThan(3);
    expect(g.widths).toHaveLength(g.points.length);
    expect(g.bounds.x0).toBeLessThanOrEqual(100 - 12);
    expect(g.bounds.x1).toBeGreaterThanOrEqual(300 + 12);
    expect(g.bounds.y0).toBeLessThanOrEqual(100 - 12);
    expect(g.bounds.y1).toBeGreaterThanOrEqual(160 + 12);
    expect(pathGeometry(p)).toBe(g);
    expect(pathGeometry({ ...p })).not.toBe(g);
  });

  it('tapers rivers but not roads', () => {
    const points: [number, number][] = [[0, 0], [150, 40], [300, 0]];
    const river = pathGeometry(path(points, 'river', 20, 'a'));
    const road = pathGeometry(path(points, 'road', 20, 'b'));
    expect(river.widths[0]!).toBeLessThan(river.widths[river.widths.length - 1]!);
    expect(new Set(road.widths)).toEqual(new Set([20]));
  });

  it('falls back to a known style for an unknown style id', () => {
    expect(styleOf(path([[0, 0], [1, 1]], 'no-such-style')).id).toBeTruthy();
    expect(styleOf(path([[0, 0], [1, 1]], 'river')).id).toBe('river');
  });
});

describe('distanceToPath', () => {
  const straight = path([[0, 0], [100, 0], [200, 0]]);

  it('measures to the centre line', () => {
    expect(distanceToPath(straight, 50, 30)).toBeCloseTo(30, 6);
    expect(distanceToPath(straight, 100, 0)).toBeCloseTo(0, 6);
    expect(distanceToPath(straight, -40, 0)).toBeCloseTo(40, 6); // beyond the start: distance to the end point
    expect(distanceToPath(straight, 230, 40)).toBeCloseTo(50, 6);
  });

  it('is zero on a control point of a bent path', () => {
    const bent = path([[0, 0], [100, 80], [200, 0]]);
    expect(distanceToPath(bent, 100, 80)).toBeLessThan(1e-6);
  });
});

describe('simplifyStroke', () => {
  it('keeps short strokes as they are', () => {
    expect(simplifyStroke([], 5)).toEqual([]);
    expect(simplifyStroke([[1, 2]], 5)).toEqual([[1, 2]]);
    expect(simplifyStroke([[1, 2], [3, 4]], 5)).toEqual([[1, 2], [3, 4]]);
  });

  it('removes points that lie on a straight line, keeping both ends', () => {
    const line: [number, number][] = Array.from({ length: 50 }, (_, i) => [i * 4, i * 2]);
    expect(simplifyStroke(line, 0.5)).toEqual([[0, 0], [196, 98]]);
  });

  it('keeps the corners of a polyline', () => {
    const corner: [number, number][] = [];
    for (let i = 0; i <= 20; i++) corner.push([i * 5, 0]);
    for (let i = 1; i <= 20; i++) corner.push([100, i * 5]);
    expect(simplifyStroke(corner, 1)).toEqual([[0, 0], [100, 0], [100, 100]]);
  });

  it('keeps more points when the tolerance is smaller, and stays within the tolerance', () => {
    const wave: [number, number][] = Array.from({ length: 200 }, (_, i) => [i * 3, Math.sin(i / 12) * 40]);
    const loose = simplifyStroke(wave, 8);
    const tight = simplifyStroke(wave, 1);
    expect(tight.length).toBeGreaterThan(loose.length);
    expect(loose.length).toBeLessThan(wave.length / 3);
    // Every original point is close to the simplified line.
    for (const [x, y] of wave) {
      let best = Infinity;
      for (let i = 0; i + 1 < loose.length; i++) {
        const [ax, ay] = loose[i]!;
        const [bx, by] = loose[i + 1]!;
        const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
        best = Math.min(best, Math.hypot(x - (ax + (bx - ax) * t), y - (ay + (by - ay) * t)));
      }
      expect(best).toBeLessThanOrEqual(8 + 1e-9);
    }
  });

  it('handles a stroke that returns to its start', () => {
    const out = simplifyStroke([[0, 0], [50, 50], [100, 0], [50, -50], [0, 0]], 1);
    expect(out[0]).toEqual([0, 0]);
    expect(out[out.length - 1]).toEqual([0, 0]);
    expect(out.length).toBeGreaterThanOrEqual(4);
  });
});
