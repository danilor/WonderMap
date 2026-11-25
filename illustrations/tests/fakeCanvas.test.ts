import { beforeAll, describe, expect, it } from 'vitest';
import { createCanvas } from '../kit';
import { installFakeCanvas, runOnFakeCanvas } from './fakeCanvas';

/** The smoke tests are only as good as the fake canvas behind them, so the fake is tested too. */

beforeAll(installFakeCanvas);

describe('fake canvas', () => {
  it('throws on what a browser rejects', () => {
    expect(() => runOnFakeCanvas(10, 10, (ctx) => ctx.arc(1, 1, -1, 0, 6))).toThrow(/negative radius/);
    expect(() => runOnFakeCanvas(10, 10, (ctx) => ctx.ellipse(1, 1, 4, -2, 0, 0, 6))).toThrow(/negative radius/);
    expect(() => runOnFakeCanvas(10, 10, (ctx) => ctx.createRadialGradient(0, 0, 1, 0, 0, -5))).toThrow(/negative radius/);
    expect(() => runOnFakeCanvas(10, 10, (ctx) => ctx.createLinearGradient(0, 0, Number.NaN, 1))).toThrow(TypeError);
    expect(() => runOnFakeCanvas(10, 10, (ctx) => ctx.createLinearGradient(0, 0, 1, 1).addColorStop(1.5, 'red'))).toThrow(RangeError);
    expect(() => runOnFakeCanvas(10, 10, (ctx) => ctx.getImageData(0, 0, 0, 4))).toThrow(RangeError);
    expect(() => runOnFakeCanvas(10, 10, (ctx) => ctx.drawImage(createCanvas(10, 10), 0, 0))).not.toThrow();
  });

  it('reports what a browser silently ignores', () => {
    const probe = runOnFakeCanvas(10, 10, (ctx) => {
      ctx.moveTo(Number.NaN, 1);
      ctx.lineWidth = Number.POSITIVE_INFINITY;
      ctx.fillStyle = 'rgba(NaN, 0, 0, 1)';
      ctx.setLineDash([2, Number.NaN]);
    });
    expect(probe.problems).toHaveLength(4);
  });

  it('counts paints and gives the same hash for the same drawing', () => {
    const draw = (radius: number) =>
      runOnFakeCanvas(10, 10, (ctx) => {
        ctx.beginPath();
        ctx.arc(5, 5, radius, 0, Math.PI * 2);
        ctx.fill();
      });
    expect(draw(3).paints).toBe(1);
    expect(draw(3).hash).toBe(draw(3).hash);
    expect(draw(3).hash).not.toBe(draw(4).hash);
    expect(runOnFakeCanvas(10, 10, () => {}).paints).toBe(0);
  });

  it('supports Path2D, text measuring and offscreen canvases', () => {
    const probe = runOnFakeCanvas(10, 10, (ctx) => {
      const path = new Path2D();
      path.arc(1, 1, 2, 0, 6);
      ctx.fill(path);
      expect(ctx.measureText('abc').width).toBeGreaterThan(0);
      expect(ctx.getTransform().a).toBe(1);
      const layer = createCanvas(4, 4);
      layer.getContext('2d')!.fillRect(0, 0, 4, 4);
      ctx.drawImage(layer, 0, 0);
    });
    expect(probe.paints).toBeGreaterThanOrEqual(3);
  });
});
