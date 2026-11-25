import { getTheme, symbols } from '@wondermap/illustrations';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createDocument } from '../model/document';
import { addLabel, addPath, addSymbols } from '../model/ops';
import type { MapDocument } from '../model/types';
import { labelBounds } from '../engine/labels';
import { stubTextMeasuring } from '../testing/fakeDom';
import { frameOf, hitHandle, HANDLE_RADIUS, nearestOnPolyline, normalizeAngle, ROTATE_OFFSET, snapAngle } from './selectionGeometry';
import type { SelectionFrame } from './selectionGeometry';

beforeAll(stubTextMeasuring);
afterAll(() => vi.unstubAllGlobals());

const rotatable = symbols.find((s) => s.rotatable)!;
const fixed = symbols.find((s) => !s.rotatable)!;

function world(): MapDocument {
  let doc = createDocument({ id: 'sel', width: 2000, height: 1500, seed: 1 });
  doc = addSymbols(doc, [
    { id: 'ship', asset: rotatable.id, x: 500, y: 500, scale: 1, rotation: 0, flip: false, variant: 0 },
    { id: 'tree', asset: fixed.id, x: 900, y: 500, scale: 1, rotation: 0, flip: false, variant: 0 },
    { id: 'lost', asset: 'gone.forever', x: 100, y: 100, scale: 1, rotation: 0, flip: false, variant: 0 },
  ]);
  doc = addLabel(doc, { id: 'name', text: 'Aldoria', x: 1200, y: 300, style: 'region', size: 40, rotation: 0, curve: 0, spacing: 0, color: null }).doc;
  doc = addPath(doc, { id: 'road', style: 'road', points: [[100, 900], [400, 950], [700, 900]], width: 10 }).doc;
  return doc;
}

describe('frameOf', () => {
  const doc = world();

  it('gives a symbol a scale handle in its corner, and a rotate handle only when it can turn', () => {
    const ship = frameOf(doc, { kind: 'symbol', id: 'ship' }, 2)!;
    expect(ship.pivot).toEqual([500, 500]);
    expect(ship.scaleHandle).toEqual([ship.bounds.x1, ship.bounds.y1]);
    expect(ship.rotateHandle).toEqual([(ship.bounds.x0 + ship.bounds.x1) / 2, ship.bounds.y0 - ROTATE_OFFSET * 2]);
    expect(ship.nodes).toBeNull();
    const tree = frameOf(doc, { kind: 'symbol', id: 'tree' }, 2)!;
    expect(tree.rotateHandle).toBeNull();
    expect(tree.scaleHandle).not.toBeNull();
  });

  it('keeps the rotate handle the same number of screen pixels above the box at every zoom', () => {
    const near = frameOf(doc, { kind: 'symbol', id: 'ship' }, 1)!;
    const far = frameOf(doc, { kind: 'symbol', id: 'ship' }, 4)!;
    expect(near.bounds.y0 - near.rotateHandle![1]).toBeCloseTo(ROTATE_OFFSET, 6);
    expect(far.bounds.y0 - far.rotateHandle![1]).toBeCloseTo(ROTATE_OFFSET * 4, 6);
  });

  it('gives a label both handles, around its measured box', () => {
    const f = frameOf(doc, { kind: 'label', id: 'name' }, 1)!;
    expect(f.bounds).toEqual(labelBounds(doc.labels[0]!, getTheme(doc.themeId)));
    expect(f.pivot).toEqual([1200, 300]);
    expect(f.scaleHandle).not.toBeNull();
    expect(f.rotateHandle).not.toBeNull();
  });

  it('gives a path its control points to drag and no scale or rotate handle', () => {
    const f = frameOf(doc, { kind: 'path', id: 'road' }, 1)!;
    expect(f.nodes).toEqual([[100, 900], [400, 950], [700, 900]]);
    expect(f.scaleHandle).toBeNull();
    expect(f.rotateHandle).toBeNull();
    expect(f.pivot).toEqual([100, 900]);
  });

  it('is null for anything that is gone or whose art is missing', () => {
    expect(frameOf(doc, { kind: 'symbol', id: 'nope' }, 1)).toBeNull();
    expect(frameOf(doc, { kind: 'symbol', id: 'lost' }, 1)).toBeNull();
    expect(frameOf(doc, { kind: 'label', id: 'nope' }, 1)).toBeNull();
    expect(frameOf(doc, { kind: 'path', id: 'nope' }, 1)).toBeNull();
  });
});

describe('hitHandle', () => {
  const frame: SelectionFrame = {
    ref: { kind: 'path', id: 'p' },
    bounds: { x0: 0, y0: 0, x1: 200, y1: 100 },
    pivot: [0, 0],
    scaleHandle: [200, 100],
    rotateHandle: [100, -26],
    nodes: [[0, 0], [100, 50], [105, 50]],
  };

  it('finds the handle under the pointer', () => {
    expect(hitHandle(frame, 100, -26, 1)).toEqual({ kind: 'rotate' });
    expect(hitHandle(frame, 204, 96, 1)).toEqual({ kind: 'scale' });
    expect(hitHandle(frame, 3, -2, 1)).toEqual({ kind: 'node', index: 0 });
    expect(hitHandle(frame, 50, 20, 1)).toBeNull();
  });

  it('picks the nearest control point when several are in reach', () => {
    expect(hitHandle(frame, 103, 50, 1)).toEqual({ kind: 'node', index: 2 });
    expect(hitHandle(frame, 101, 50, 1)).toEqual({ kind: 'node', index: 1 });
  });

  it('grabs a handle within HANDLE_RADIUS screen pixels, whatever the zoom', () => {
    expect(hitHandle(frame, 100 + HANDLE_RADIUS - 1, -26, 1)).toEqual({ kind: 'rotate' });
    expect(hitHandle(frame, 100 + HANDLE_RADIUS + 1, -26, 1)).toBeNull();
    expect(hitHandle(frame, 100 + HANDLE_RADIUS + 1, -26, 2)).toEqual({ kind: 'rotate' }); // 1 screen px = 2 map px
  });

  it('prefers rotate over scale over nodes when handles overlap', () => {
    const stacked: SelectionFrame = { ...frame, rotateHandle: [10, 10], scaleHandle: [10, 10], nodes: [[10, 10]] };
    expect(hitHandle(stacked, 10, 10, 1)).toEqual({ kind: 'rotate' });
    expect(hitHandle({ ...stacked, rotateHandle: null }, 10, 10, 1)).toEqual({ kind: 'scale' });
    expect(hitHandle({ ...stacked, rotateHandle: null, scaleHandle: null }, 10, 10, 1)).toEqual({ kind: 'node', index: 0 });
  });

  it('copes with frames that have no handles at all', () => {
    expect(hitHandle({ ...frame, rotateHandle: null, scaleHandle: null, nodes: null }, 0, 0, 1)).toBeNull();
  });
});

describe('nearestOnPolyline', () => {
  const line: [number, number][] = [[0, 0], [100, 0], [100, 100]];

  it('returns the closest point, its segment and the distance', () => {
    const a = nearestOnPolyline(line, 40, 10)!;
    expect(a.index).toBe(0);
    expect(a.point).toEqual([40, 0]);
    expect(a.distance).toBeCloseTo(10, 9);
    const b = nearestOnPolyline(line, 110, 60)!;
    expect(b.index).toBe(1);
    expect(b.point).toEqual([100, 60]);
    expect(b.distance).toBeCloseTo(10, 9);
  });

  it('stops at the ends of the line', () => {
    const before = nearestOnPolyline(line, -30, 0)!;
    expect(before.point).toEqual([0, 0]);
    expect(before.distance).toBeCloseTo(30, 9);
    expect(nearestOnPolyline(line, 100, 160)!.point).toEqual([100, 100]);
  });

  it('needs at least one segment', () => {
    expect(nearestOnPolyline([], 0, 0)).toBeNull();
    expect(nearestOnPolyline([[5, 5]], 0, 0)).toBeNull();
    expect(nearestOnPolyline([[5, 5], [5, 5]], 8, 9)!.distance).toBeCloseTo(5, 9);
  });
});

describe('angles', () => {
  it('snaps to 15° steps, or to a step of your choice', () => {
    expect(snapAngle(0.1)).toBe(0);
    expect(snapAngle(0.2)).toBeCloseTo(Math.PI / 12, 9);
    expect(snapAngle(-0.2)).toBeCloseTo(-Math.PI / 12, 9);
    expect(snapAngle(1.5, Math.PI / 2)).toBeCloseTo(Math.PI / 2, 9);
  });

  it('wraps into -π..π', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(Math.PI * 2)).toBeCloseTo(0, 9);
    expect(normalizeAngle(7)).toBeCloseTo(7 - Math.PI * 2, 9);
    expect(normalizeAngle(-7)).toBeCloseTo(-7 + Math.PI * 2, 9);
    expect(Math.abs(normalizeAngle(Math.PI * 5))).toBeCloseTo(Math.PI, 9);
    expect(normalizeAngle(1)).toBe(1);
  });
});
