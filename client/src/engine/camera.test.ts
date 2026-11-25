import { describe, expect, it } from 'vitest';
import { clampCamera, clampZoom, fitCamera, MAX_ZOOM, MIN_ZOOM, mapToScreen, screenToMap, showsWholeMap, viewRect, zoomAt } from './camera';
import type { Camera } from './camera';

const VW = 1200;
const VH = 800;

describe('coordinates', () => {
  const cam: Camera = { x: 1500, y: 900, zoom: 0.5 };

  it('shows the camera position in the middle of the viewport', () => {
    expect(screenToMap(cam, VW, VH, VW / 2, VH / 2)).toEqual([1500, 900]);
    expect(mapToScreen(cam, VW, VH, 1500, 900)).toEqual([VW / 2, VH / 2]);
  });

  it('converts between screen and map positions both ways', () => {
    const [mx, my] = screenToMap(cam, VW, VH, 123, 456);
    const [sx, sy] = mapToScreen(cam, VW, VH, mx, my);
    expect(sx).toBeCloseTo(123, 9);
    expect(sy).toBeCloseTo(456, 9);
  });

  it('scales by the zoom', () => {
    expect(screenToMap({ x: 0, y: 0, zoom: 2 }, VW, VH, VW / 2 + 100, VH / 2)).toEqual([50, 0]);
  });

  it('knows the visible part of the map', () => {
    expect(viewRect({ x: 1000, y: 500, zoom: 2 }, VW, VH)).toEqual({ x0: 700, y0: 300, x1: 1300, y1: 700 });
  });
});

describe('zoom', () => {
  it('clamps to the allowed range', () => {
    expect(clampZoom(0)).toBe(MIN_ZOOM);
    expect(clampZoom(99)).toBe(MAX_ZOOM);
    expect(clampZoom(1.5)).toBe(1.5);
  });

  it('keeps the point under the cursor fixed', () => {
    const cam: Camera = { x: 1000, y: 700, zoom: 0.5 };
    for (const factor of [2, 0.5, 1.37, 0.1]) {
      const before = screenToMap(cam, VW, VH, 300, 200);
      const out = zoomAt(cam, VW, VH, 300, 200, factor);
      const after = screenToMap(out, VW, VH, 300, 200);
      expect(after[0]).toBeCloseTo(before[0], 6);
      expect(after[1]).toBeCloseTo(before[1], 6);
    }
  });

  it('stops at the limits and returns the same camera when nothing changes', () => {
    const closest: Camera = { x: 10, y: 10, zoom: MAX_ZOOM };
    expect(zoomAt(closest, VW, VH, 100, 100, 3)).toBe(closest);
    expect(zoomAt({ x: 0, y: 0, zoom: 4 }, VW, VH, VW / 2, VH / 2, 100).zoom).toBe(MAX_ZOOM);
    expect(zoomAt({ x: 0, y: 0, zoom: 1 }, VW, VH, VW / 2, VH / 2, 0.0001).zoom).toBe(MIN_ZOOM);
  });
});

describe('fitCamera', () => {
  it('centres the map and shows all of it', () => {
    const cam = fitCamera(VW, VH, 3200, 2000);
    expect([cam.x, cam.y]).toEqual([1600, 1000]);
    expect(showsWholeMap(cam, VW, VH, 3200, 2000)).toBe(true);
    // The limiting side keeps the requested padding.
    expect(cam.zoom).toBeCloseTo(Math.min((VW - 112) / 3200, (VH - 112) / 2000), 9);
  });

  it('zooms in more for a bigger viewport or a smaller map', () => {
    expect(fitCamera(2400, 1600, 3200, 2000).zoom).toBeGreaterThan(fitCamera(VW, VH, 3200, 2000).zoom);
    expect(fitCamera(VW, VH, 800, 600).zoom).toBeGreaterThan(fitCamera(VW, VH, 3200, 2000).zoom);
  });

  it('never zooms out beyond the minimum, nor in beyond the maximum', () => {
    expect(fitCamera(VW, VH, 1e6, 1e6).zoom).toBe(MIN_ZOOM);
    expect(fitCamera(VW, VH, 10, 10).zoom).toBe(MAX_ZOOM);
    expect(fitCamera(20, 20, 800, 600).zoom).toBe(MIN_ZOOM);
  });
});

describe('showsWholeMap', () => {
  it('is false once the map is bigger than the view', () => {
    expect(showsWholeMap({ x: 1600, y: 1000, zoom: 1 }, VW, VH, 3200, 2000)).toBe(false);
    expect(showsWholeMap({ x: 1600, y: 1000, zoom: 0.3 }, VW, VH, 3200, 2000)).toBe(true);
    expect(showsWholeMap({ x: 3000, y: 1000, zoom: 0.3 }, VW, VH, 3200, 2000)).toBe(false);
  });
});

describe('clampCamera', () => {
  it('leaves a sensible camera alone', () => {
    const cam: Camera = { x: 1600, y: 1000, zoom: 0.5 };
    expect(clampCamera(cam, VW, VH, 3200, 2000)).toBe(cam);
  });

  it('keeps a part of the map on screen however far you pan', () => {
    const far = clampCamera({ x: 1e6, y: 1e6, zoom: 1 }, 1000, 800, 2000, 1500);
    expect(far).toEqual({ x: 2200, y: 1660, zoom: 1 }); // 30 % of the viewport stays over the map
    const away = clampCamera({ x: -1e6, y: -1e6, zoom: 1 }, 1000, 800, 2000, 1500);
    expect(away).toEqual({ x: -200, y: -160, zoom: 1 });
    const v = viewRect(far, 1000, 800);
    expect(v.x0).toBeLessThan(2000);
    expect(v.y0).toBeLessThan(1500);
  });

  it('never lets a small map leave the viewport entirely', () => {
    const out = clampCamera({ x: 1e5, y: 0, zoom: 1 }, 1000, 800, 400, 400);
    expect(viewRect(out, 1000, 800).x0).toBeLessThan(400);
  });
});
