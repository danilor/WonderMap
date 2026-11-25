import { frameById, labelStyleById, pathStyleById, symbolById, terrainById, themeById } from '@wondermap/illustrations';
import { describe, expect, it } from 'vitest';
import sampleJson from '../../public/samples/aldoria.wondermap.json?raw';
import { documentFromJson, documentToJson } from './document';

const doc = documentFromJson(sampleJson);

describe('the shipped sample world', () => {
  it('opens as a valid document', () => {
    expect(doc.name).toBe('Aldoria');
    expect(doc.width).toBeGreaterThanOrEqual(2000);
    expect(doc.height).toBeGreaterThanOrEqual(1500);
    expect(themeById.has(doc.themeId)).toBe(true);
    expect(frameById.has(doc.frameId)).toBe(true);
  });

  it('is a rich showcase', () => {
    expect(doc.symbols.length).toBeGreaterThan(200);
    expect(doc.paths.length).toBeGreaterThan(3);
    expect(doc.labels.length).toBeGreaterThan(10);
    const landCells = doc.terrain.data.reduce((n, v) => n + (v > 0 ? 1 : 0), 0);
    const landShare = landCells / doc.terrain.data.length;
    expect(landShare).toBeGreaterThan(0.15);
    expect(landShare).toBeLessThan(0.85);
    expect(new Set(doc.symbols.map((s) => s.asset)).size).toBeGreaterThan(30);
  });

  it('only uses art that exists in the catalog', () => {
    const unknown = (ids: Iterable<string>, known: ReadonlyMap<string, unknown>) => [...new Set(ids)].filter((id) => !known.has(id));
    expect(unknown(doc.symbols.map((s) => s.asset), symbolById)).toEqual([]);
    expect(unknown(doc.paths.map((p) => p.style), pathStyleById)).toEqual([]);
    expect(unknown(doc.labels.map((l) => l.style), labelStyleById)).toEqual([]);
    expect(unknown(doc.terrain.ids, terrainById)).toEqual([]);
  });

  it('keeps every symbol and label on the map and uses valid variants', () => {
    for (const s of doc.symbols) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(doc.width);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(doc.height);
      expect(s.variant).toBeLessThan(symbolById.get(s.asset)!.variants);
    }
    for (const l of doc.labels) {
      expect(l.x).toBeGreaterThanOrEqual(0);
      expect(l.x).toBeLessThanOrEqual(doc.width);
      expect(l.y).toBeGreaterThanOrEqual(0);
      expect(l.y).toBeLessThanOrEqual(doc.height);
      expect(l.text.trim()).not.toBe('');
    }
  });

  it('gives every item its own id', () => {
    const ids = [...doc.symbols, ...doc.paths, ...doc.labels].map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('survives a save and reload unchanged', () => {
    const again = documentFromJson(documentToJson(doc));
    expect(again.symbols).toEqual(doc.symbols);
    expect(again.paths).toEqual(doc.paths);
    expect(again.labels).toEqual(doc.labels);
    expect(again.terrain.ids).toEqual(doc.terrain.ids);
    expect(again.terrain.data).toEqual(doc.terrain.data);
  });
});
