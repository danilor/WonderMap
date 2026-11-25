import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME_ID,
  brushById,
  brushes,
  categories,
  categoryById,
  frameById,
  frames,
  getFrame,
  getTheme,
  labelStyles,
  pathStyles,
  symbolById,
  symbols,
  terrains,
  themes,
} from '../catalog';
import { overdraw } from '../kit';
import { fontById } from '../fonts';

/** The catalog validates itself while it loads (duplicate ids, unknown categories, dangling brush items). These tests guard the rest. */

const ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const COLOR = /^(#[0-9a-f]{3,8}|rgba?\(.+\)|hsla?\(.+\))$/i;

describe('catalog size', () => {
  it('finds all the art (a broken glob would silently load nothing)', () => {
    expect(symbols.length).toBeGreaterThanOrEqual(150);
    expect(brushes.length).toBeGreaterThanOrEqual(40);
    expect(terrains.length).toBeGreaterThanOrEqual(10);
    expect(themes.length).toBeGreaterThanOrEqual(2);
    expect(frames.length).toBeGreaterThanOrEqual(2);
    expect(pathStyles.length).toBeGreaterThanOrEqual(4);
    expect(labelStyles.length).toBeGreaterThanOrEqual(8);
  });
});

describe('symbols', () => {
  it('have stable, well-formed ids', () => {
    for (const s of symbols) expect(s.id, s.id).toMatch(ID);
    expect(new Set(symbols.map((s) => s.id)).size).toBe(symbols.length);
  });

  it('declare a sane design box, anchor and variant count', () => {
    for (const s of symbols) {
      const [w, h] = s.size;
      expect(w > 0 && h > 0, `${s.id} size`).toBe(true);
      expect(Math.max(w, h), `${s.id} is huge`).toBeLessThanOrEqual(600);
      expect(s.anchor[0] >= 0 && s.anchor[0] <= 1 && s.anchor[1] >= 0 && s.anchor[1] <= 1, `${s.id} anchor`).toBe(true);
      expect(Number.isInteger(s.variants) && s.variants >= 1 && s.variants <= 12, `${s.id} variants`).toBe(true);
      expect(s.name.trim(), `${s.id} name`).not.toBe('');
      expect(['ground', 'object', 'landmark', 'air']).toContain(s.layer);
      expect(['land', 'sea', 'any']).toContain(s.placement);
    }
  });

  it('belong to a declared category', () => {
    for (const s of symbols) expect(categoryById.has(s.category), `${s.id} → ${s.category}`).toBe(true);
    for (const c of categories) expect(symbols.some((s) => s.category === c.id), `empty category ${c.id}`).toBe(true);
  });

  it('are found by id', () => {
    for (const s of symbols) expect(symbolById.get(s.id)).toBe(s);
  });

  it('draw settlements and landmarks above plain objects, so a forest can not hide a town', () => {
    for (const s of symbols.filter((item) => item.category === 'settlements')) expect(s.layer, s.id).toBe('landmark');
    expect(symbolById.get('decor.compass.rose')?.layer).toBe('ground');
    expect(symbolById.get('decor.cloud')?.layer).toBe('air');
  });
});

describe('categories', () => {
  it('have unique ids and a distinct sort order', () => {
    expect(new Set(categories.map((c) => c.id)).size).toBe(categories.length);
    expect(new Set(categories.map((c) => c.order)).size).toBe(categories.length);
    for (const c of categories) expect(c.icon, c.id).not.toBe('');
  });
});

describe('brushes', () => {
  it('only use symbols that exist, with usable numbers', () => {
    for (const b of brushes) {
      expect(b.id, b.id).toMatch(ID);
      expect(categoryById.has(b.category), `${b.id} category`).toBe(true);
      expect(b.items.length, `${b.id} items`).toBeGreaterThan(0);
      for (const item of b.items) {
        expect(symbolById.has(item.symbol), `${b.id} → ${item.symbol}`).toBe(true);
        expect(item.weight, `${b.id} weight`).toBeGreaterThan(0);
      }
      expect(b.spacing, `${b.id} spacing`).toBeGreaterThan(0);
      expect(b.scale[0] > 0 && b.scale[0] <= b.scale[1], `${b.id} scale range`).toBe(true);
      expect(b.jitter >= 0 && b.jitter <= 1, `${b.id} jitter`).toBe(true);
    }
    expect(new Set(brushes.map((b) => b.id)).size).toBe(brushes.length);
    for (const b of brushes) expect(brushById.get(b.id)).toBe(b);
  });
});

describe('terrains', () => {
  it('have unique ids, colors and a texture painter', () => {
    expect(new Set(terrains.map((t) => t.id)).size).toBe(terrains.length);
    for (const t of terrains) {
      expect(t.id).toMatch(ID);
      expect(t.swatch, `${t.id} swatch`).toMatch(COLOR);
      for (const key of ['base', 'light', 'dark'] as const) expect(t.colors[key], `${t.id}.${key}`).toMatch(COLOR);
      expect(t.tileSize, `${t.id} tile`).toBeGreaterThanOrEqual(64);
      expect(typeof t.texture).toBe('function');
    }
  });

  it('include the colors named in the brief', () => {
    for (const id of ['grass', 'earth', 'clay', 'stone', 'sand', 'desert', 'swamp', 'snow', 'ice']) {
      expect(terrains.some((t) => t.id === id), id).toBe(true);
    }
  });
});

describe('themes, frames, fonts', () => {
  it('reference frames and fonts that exist', () => {
    expect(getTheme(undefined).id).toBe(DEFAULT_THEME_ID);
    expect(getTheme('no-such-theme').id).toBe(DEFAULT_THEME_ID);
    for (const t of themes) {
      expect(frameById.has(t.frame), `${t.id} frame`).toBe(true);
      expect(t.swatch).toHaveLength(2);
    }
    expect(getFrame('no-such-frame')).toBe(frameById.get('none'));
    for (const l of labelStyles) expect(fontById.has(l.font), `${l.id} font`).toBe(true);
  });
});

describe('path styles', () => {
  it('declare a consistent width range', () => {
    expect(new Set(pathStyles.map((p) => p.id)).size).toBe(pathStyles.length);
    for (const p of pathStyles) {
      expect(p.minWidth > 0 && p.minWidth <= p.width && p.width <= p.maxWidth, p.id).toBe(true);
    }
  });
});

describe('overdraw', () => {
  it('keeps at least 6 units and grows with the larger side of the box', () => {
    expect(overdraw([20, 20])).toBe(6);
    expect(overdraw([100, 50])).toBe(8);
    expect(overdraw([50, 100])).toBe(8);
    expect(overdraw([300, 200])).toBe(24);
    expect(overdraw([101, 10])).toBe(9);
  });
});
