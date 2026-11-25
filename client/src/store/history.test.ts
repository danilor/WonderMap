import { describe, expect, it } from 'vitest';
import { createDocument } from '../model/document';
import { LIMITS } from '../model/types';
import type { MapDocument } from '../model/types';
import { recordChange, redoStep, terrainBytes, trimHistory, undoStep } from './history';
import type { HistoryState } from './history';

/** 400 × 400 px map: its terrain grid is 100 × 100 = 10 000 bytes. */
const base = createDocument({ id: 'h', width: 400, height: 400 });
const GRID = 10_000;

/** A snapshot named `name`; `ownGrid` gives it a terrain array of its own instead of sharing the base one. */
const snap = (name: string, ownGrid = false): MapDocument => ({
  ...base,
  name,
  terrain: ownGrid ? { ...base.terrain, data: new Uint8Array(base.terrain.data) } : base.terrain,
});
const names = (list: MapDocument[]) => list.map((d) => d.name);

describe('terrainBytes', () => {
  it('counts every distinct terrain array once', () => {
    expect(terrainBytes([])).toBe(0);
    expect(terrainBytes([snap('a'), snap('b')])).toBe(GRID);
    expect(terrainBytes([snap('a', true), snap('b', true), snap('c')])).toBe(3 * GRID);
  });
});

describe('trimHistory', () => {
  const six = Array.from({ length: 6 }, (_, i) => snap(`v${i}`, true));
  const current = six[5]!;
  const history: HistoryState = { past: six.slice(0, 5), future: [] };

  it('returns the same object when the history already fits', () => {
    expect(trimHistory(history, current, 100, 1e9)).toBe(history);
  });

  it('drops the oldest steps beyond the depth', () => {
    expect(names(trimHistory(history, current, 3, 1e9).past)).toEqual(['v2', 'v3', 'v4']);
  });

  it('drops the oldest steps until the terrain memory fits', () => {
    // 5 past + current = 60 000 bytes; 35 000 only leaves room for 3 grids.
    expect(names(trimHistory(history, current, 100, 35_000).past)).toEqual(['v3', 'v4']);
  });

  it('always keeps one step so the last change can be undone', () => {
    expect(names(trimHistory(history, current, 100, 1).past)).toEqual(['v4']);
  });

  it('counts the redo steps too and leaves them alone', () => {
    const withFuture: HistoryState = { past: six.slice(0, 3), future: six.slice(3, 5) };
    const out = trimHistory(withFuture, current, 100, 35_000);
    expect(names(out.past)).toEqual(['v2']);
    expect(out.future).toBe(withFuture.future);
  });

  it('is free for snapshots that share one terrain array', () => {
    const shared = Array.from({ length: 50 }, (_, i) => snap(`s${i}`));
    const h: HistoryState = { past: shared.slice(0, 49), future: [] };
    expect(trimHistory(h, shared[49]!, 100, GRID)).toBe(h);
  });
});

describe('recordChange', () => {
  it('pushes the previous state and forgets the redo steps', () => {
    const [a, b, c] = [snap('a'), snap('b'), snap('c')];
    const out = recordChange({ past: [], future: [b] }, a, c);
    expect(out.past).toEqual([a]);
    expect(out.future).toEqual([]);
  });

  it('keeps at most LIMITS.historyDepth steps, newest last', () => {
    let h: HistoryState = { past: [], future: [] };
    let now = snap('n0');
    for (let i = 1; i <= LIMITS.historyDepth + 50; i++) {
      const next = snap(`n${i}`);
      h = recordChange(h, now, next);
      now = next;
    }
    expect(h.past).toHaveLength(LIMITS.historyDepth);
    expect(h.past[0]!.name).toBe('n50');
    expect(h.past[h.past.length - 1]!.name).toBe(`n${LIMITS.historyDepth + 49}`);
  });
});

describe('undo and redo', () => {
  it('have nothing to do on an empty history', () => {
    const empty: HistoryState = { past: [], future: [] };
    expect(undoStep(empty, snap('a'))).toBeNull();
    expect(redoStep(empty, snap('a'))).toBeNull();
  });

  it('walk back and forth through the changes', () => {
    const [a, b, c, d] = [snap('a'), snap('b'), snap('c'), snap('d')];
    let h: HistoryState = { past: [], future: [] };
    h = recordChange(h, a, b);
    h = recordChange(h, b, c);
    h = recordChange(h, c, d);

    let doc = d;
    const seen = [doc.name];
    for (let i = 0; i < 3; i++) {
      const step = undoStep(h, doc)!;
      h = step.history;
      doc = step.doc;
      seen.push(doc.name);
    }
    expect(seen).toEqual(['d', 'c', 'b', 'a']);
    expect(undoStep(h, doc)).toBeNull();
    expect(h.future).toHaveLength(3);

    for (let i = 0; i < 3; i++) {
      const step = redoStep(h, doc)!;
      h = step.history;
      doc = step.doc;
      seen.push(doc.name);
    }
    expect(seen.slice(4)).toEqual(['b', 'c', 'd']);
    expect(redoStep(h, doc)).toBeNull();
    expect(h.past).toHaveLength(3);
  });

  it('a new change after an undo discards the redo steps', () => {
    const [a, b, c] = [snap('a'), snap('b'), snap('c')];
    const undone = undoStep(recordChange({ past: [], future: [] }, a, b), b)!;
    expect(undone.history.future).toEqual([b]);
    const next = recordChange(undone.history, undone.doc, c);
    expect(next.future).toEqual([]);
    expect(next.past).toEqual([a]);
  });
});
