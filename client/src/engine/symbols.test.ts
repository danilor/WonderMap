import { overdraw } from '@wondermap/illustrations/kit';
import { symbols } from '@wondermap/illustrations';
import type { ResolvedSymbol } from '@wondermap/illustrations';
import { describe, expect, it } from 'vitest';
import type { MapSymbol } from '../model/types';
import { intersects, orderSymbols, symbolBounds, symbolPaintBounds } from './symbols';

const placed = (id: string, asset: string, x: number, y: number, over: Partial<MapSymbol> = {}): MapSymbol => ({
  id,
  asset,
  x,
  y,
  scale: 1,
  rotation: 0,
  flip: false,
  variant: 0,
  ...over,
});

const firstOn = (layer: ResolvedSymbol['layer']) => symbols.find((s) => s.layer === layer)!;
/** A made-up definition keeps the geometry tests independent of the art. */
const box = (size: [number, number], anchor: [number, number]): ResolvedSymbol => ({ ...symbols[0]!, size, anchor });
const ids = (list: MapSymbol[]) => list.map((s) => s.id);

describe('orderSymbols', () => {
  const ground = firstOn('ground');
  const object = firstOn('object');
  const landmark = firstOn('landmark');
  const air = firstOn('air');

  it('sorts symbols into their drawing layers', () => {
    const order = orderSymbols([placed('a', air.id, 0, 0), placed('b', ground.id, 0, 0), placed('c', landmark.id, 0, 0), placed('d', object.id, 0, 0)]);
    expect(ids(order.ground)).toEqual(['b']);
    expect(ids(order.objects)).toEqual(['d']);
    expect(ids(order.landmarks)).toEqual(['c']);
    expect(ids(order.air)).toEqual(['a']);
  });

  it('draws objects back to front and keeps the creation order at equal depth', () => {
    const list = [placed('a', object.id, 0, 300), placed('b', object.id, 0, 100), placed('c', object.id, 0, 100), placed('d', object.id, 0, 200)];
    expect(ids(orderSymbols(list).objects)).toEqual(['b', 'c', 'd', 'a']);
    expect(ids(list)).toEqual(['a', 'b', 'c', 'd']); // the input is left alone
  });

  it('keeps landmarks in a layer of their own, sorted the same way', () => {
    const list = [placed('far', landmark.id, 0, 900), placed('tree', object.id, 0, 950), placed('near', landmark.id, 0, 100)];
    const order = orderSymbols(list);
    expect(ids(order.landmarks)).toEqual(['near', 'far']);
    expect(ids(order.objects)).toEqual(['tree']);
  });

  it('skips symbols whose art no longer exists', () => {
    const order = orderSymbols([placed('x', 'gone.forever', 0, 0), placed('y', object.id, 0, 0)]);
    expect(ids(order.objects)).toEqual(['y']);
    expect([order.ground, order.landmarks, order.air].every((l) => l.length === 0)).toBe(true);
  });

  it('is cached per array, so an edited document gets a fresh order', () => {
    const list = [placed('a', object.id, 0, 0)];
    const order = orderSymbols(list);
    expect(orderSymbols(list)).toBe(order);
    expect(orderSymbols([...list])).not.toBe(order);
  });
});

describe('symbolBounds', () => {
  it('scales the design box around the anchor', () => {
    const def = box([100, 60], [0.5, 1]);
    expect(symbolBounds(placed('s', 'x', 500, 400, { scale: 2 }), def)).toEqual({ x0: 400, y0: 280, x1: 600, y1: 400 });
  });

  it('mirrors the box around the anchor when flipped', () => {
    const def = box([100, 60], [0.25, 1]);
    expect(symbolBounds(placed('s', 'x', 500, 400), def)).toEqual({ x0: 475, y0: 340, x1: 575, y1: 400 });
    expect(symbolBounds(placed('s', 'x', 500, 400, { flip: true }), def)).toEqual({ x0: 425, y0: 340, x1: 525, y1: 400 });
  });

  it('turns the box when rotated', () => {
    const def = box([100, 60], [0.5, 0.5]);
    const b = symbolBounds(placed('s', 'x', 500, 400, { rotation: Math.PI / 2 }), def);
    expect(b.x0).toBeCloseTo(470, 6);
    expect(b.x1).toBeCloseTo(530, 6);
    expect(b.y0).toBeCloseTo(350, 6);
    expect(b.y1).toBeCloseTo(450, 6);
  });

  it('always contains the anchor point, whatever the rotation and flip', () => {
    const def = box([120, 80], [0.3, 0.9]);
    for (const rotation of [0, 0.4, 1.7, -2.2, Math.PI]) {
      for (const flip of [false, true]) {
        const b = symbolBounds(placed('s', 'x', 500, 400, { rotation, flip, scale: 1.3 }), def);
        expect(b.x0).toBeLessThanOrEqual(500);
        expect(b.x1).toBeGreaterThanOrEqual(500);
        expect(b.y0).toBeLessThanOrEqual(400);
        expect(b.y1).toBeGreaterThanOrEqual(400);
      }
    }
  });
});

describe('symbolPaintBounds', () => {
  it('adds the sprite margin, scaled with the symbol', () => {
    const def = box([100, 60], [0.5, 1]);
    const s = placed('s', 'x', 500, 400, { scale: 2 });
    const tight = symbolBounds(s, def);
    const pad = overdraw(def.size) * 2;
    expect(symbolPaintBounds(s, def)).toEqual({ x0: tight.x0 - pad, y0: tight.y0 - pad, x1: tight.x1 + pad, y1: tight.y1 + pad });
  });

  it('adds more margin when rotated, because the margin turns with the box', () => {
    const def = box([100, 60], [0.5, 0.5]);
    const flat = placed('s', 'x', 0, 0);
    const turned = placed('s', 'x', 0, 0, { rotation: 0.01 });
    const gap = (s: MapSymbol) => symbolBounds(s, def).x0 - symbolPaintBounds(s, def).x0;
    expect(gap(turned)).toBeCloseTo(gap(flat) * 1.5, 6);
  });
});

describe('intersects', () => {
  const a = { x0: 0, y0: 0, x1: 10, y1: 10 };
  it('is true for overlapping and touching rectangles', () => {
    expect(intersects(a, { x0: 5, y0: 5, x1: 15, y1: 15 })).toBe(true);
    expect(intersects(a, { x0: 10, y0: 10, x1: 20, y1: 20 })).toBe(true);
    expect(intersects(a, { x0: 2, y0: 2, x1: 3, y1: 3 })).toBe(true);
  });
  it('is false for separate rectangles', () => {
    expect(intersects(a, { x0: 10.1, y0: 0, x1: 20, y1: 10 })).toBe(false);
    expect(intersects(a, { x0: 0, y0: -20, x1: 10, y1: -0.1 })).toBe(false);
  });
});
