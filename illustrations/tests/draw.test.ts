import { beforeAll, describe, expect, it } from 'vitest';
import { frames, pathStyles, symbols, terrains, themes } from '../catalog';
import { combineSeed, createRng } from '../kit';
import type { Vec2 } from '../kit';
import { installFakeCanvas, runOnFakeCanvas } from './fakeCanvas';
import type { Probe } from './fakeCanvas';

/**
 * Smoke tests: every piece of art is drawn on a fake canvas (see `fakeCanvas.ts`), the way the editor draws it.
 * They run without a browser, so a broken painter is caught by `npm test`. They do NOT judge how the art looks:
 * use the gallery (`#/gallery`) and `npm run check:art` for that.
 */

beforeAll(installFakeCanvas);

/** Asserts that a drawing painted something and did not feed the canvas rubbish. */
function expectSound(label: string, probe: Probe): void {
  expect(probe.problems, `${label}: NaN / Infinity / broken colors`).toEqual([]);
  expect(probe.paints, `${label} painted nothing`).toBeGreaterThan(0);
}

describe('symbols', () => {
  it('draw every variant without errors and deterministically', () => {
    for (const def of symbols) {
      const [w, h] = def.size;
      for (let variant = 0; variant < def.variants; variant++) {
        const seed = combineSeed(def.id, variant);
        const label = `${def.id} variant ${variant}`;
        const draw = () => runOnFakeCanvas(w, h, (ctx) => def.draw({ ctx, w, h, rand: createRng(seed), variant, seed }));
        const first = draw();
        expectSound(label, first);
        expect(draw().hash, `${label} draws differently on a second run (Math.random / Date.now in the art?)`).toBe(first.hash);
      }
    }
  });

  it('look different from variant to variant (the variants are real)', () => {
    const rich = symbols.filter((s) => s.variants > 1);
    expect(rich.length).toBeGreaterThan(0);
    let identical = 0;
    for (const def of rich) {
      const [w, h] = def.size;
      const hashes = new Set<number>();
      for (let variant = 0; variant < def.variants; variant++) {
        const seed = combineSeed(def.id, variant);
        hashes.add(runOnFakeCanvas(w, h, (ctx) => def.draw({ ctx, w, h, rand: createRng(seed), variant, seed })).hash);
      }
      if (hashes.size === 1) identical++;
    }
    // A handful of tiny or perfectly symmetric symbols may legitimately repeat themselves.
    expect(identical).toBeLessThanOrEqual(Math.ceil(rich.length * 0.05));
  });
});

describe('terrain textures', () => {
  it('paint a tile for every terrain', () => {
    for (const def of terrains) {
      const seed = combineSeed('terrain', def.id);
      const probe = runOnFakeCanvas(def.tileSize, def.tileSize, (ctx) => def.texture({ ctx, size: def.tileSize, rand: createRng(seed), seed, colors: def.colors }));
      expectSound(`terrain ${def.id}`, probe);
    }
  });
});

describe('path styles', () => {
  const line: Vec2[] = Array.from({ length: 40 }, (_, i) => [20 + i * 10, 80 + Math.sin(i / 4) * 30]);

  it('draw a river, road, trail… for every theme', () => {
    for (const theme of themes) {
      for (const style of pathStyles) {
        const widths = line.map((_, i) => (style.taper ? style.width * (0.4 + i / line.length) : style.width));
        const probe = runOnFakeCanvas(500, 200, (ctx) => style.draw({ ctx, points: line, widths, theme, rand: createRng(combineSeed('path', style.id)), scale: 1 }));
        expectSound(`${style.id} on ${theme.id}`, probe);
      }
    }
  });
});

describe('frames', () => {
  it('draw for every theme (the "none" frame may draw nothing)', () => {
    for (const theme of themes) {
      for (const frame of frames) {
        const probe = runOnFakeCanvas(800, 600, (ctx) => frame.draw({ ctx, width: 800, height: 600, theme, rand: createRng(combineSeed('frame', 7)) }));
        expect(probe.problems, `${frame.id} on ${theme.id}`).toEqual([]);
        if (frame.inset > 0) expect(probe.paints, `${frame.id} painted nothing`).toBeGreaterThan(0);
      }
    }
  });
});
