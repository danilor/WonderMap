import { getTheme, labelStyleById, labelStyles } from '@wondermap/illustrations';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { MapLabel } from '../model/types';
import { stubTextMeasuring } from '../testing/fakeDom';
import { labelBounds, labelContains, labelGeometry, styleOfLabel } from './labels';

beforeAll(stubTextMeasuring);
afterAll(() => vi.unstubAllGlobals());

const theme = getTheme('wonder');
const label = (over: Partial<MapLabel> = {}): MapLabel => ({
  id: 'l',
  text: 'Aldoria',
  x: 400,
  y: 300,
  style: 'region',
  size: 40,
  rotation: 0,
  curve: 0,
  spacing: 0,
  color: null,
  ...over,
});

describe('styleOfLabel', () => {
  it('uses the style of the label, or the first style when it is unknown', () => {
    expect(styleOfLabel(label({ style: 'city' })).id).toBe('city');
    expect(styleOfLabel(label({ style: 'no-such-style' }))).toBe(labelStyles[0]);
  });
});

describe('labelGeometry (straight text)', () => {
  const style = labelStyleById.get('region')!;

  it('lays the letters out in a centred line', () => {
    const g = labelGeometry(label(), theme);
    const spacing = style.spacing * 40;
    const advance = 20; // the stub measures half the font size per letter
    expect(g.curved).toBe(false);
    expect(g.glyphs).toHaveLength(7);
    expect(g.width).toBeCloseTo(7 * advance + 6 * spacing, 6);
    expect(g.glyphs[0]!.x).toBeCloseTo(-g.glyphs[6]!.x, 6);
    expect(g.glyphs[0]!.x).toBeCloseTo(-g.width / 2 + advance / 2, 6);
    expect(g.glyphs.every((glyph) => glyph.y === 0 && glyph.angle === 0)).toBe(true);
    expect(g.glyphs.map((glyph) => glyph.ch).join('')).toBe(style.uppercase ? 'ALDORIA' : 'Aldoria');
  });

  it('scales with the font size and the extra letter spacing', () => {
    const small = labelGeometry(label({ size: 32 }), theme);
    const big = labelGeometry(label({ size: 64 }), theme);
    expect(big.width).toBeCloseTo(small.width * 2, 6);
    const loose = labelGeometry(label({ spacing: 0.5 }), theme);
    expect(loose.width - labelGeometry(label(), theme).width).toBeCloseTo(0.5 * 40 * 6, 6);
  });

  it('never goes below the minimum size', () => {
    expect(labelGeometry(label({ size: 1 }), theme).size).toBe(4);
  });

  it('follows the style for upper-casing, and the label for colour', () => {
    const upper = labelStyles.find((s) => s.uppercase)!;
    const lower = labelStyles.find((s) => !s.uppercase)!;
    expect(labelGeometry(label({ style: upper.id, text: 'Mixed Case' }), theme).text).toBe('MIXED CASE');
    expect(labelGeometry(label({ style: lower.id, text: 'Mixed Case' }), theme).text).toBe('Mixed Case');
    expect(labelGeometry(label({ color: '#123456' }), theme).color).toBe('#123456');
    expect(labelGeometry(label(), theme).color).toBe(style.color ?? theme.label.color);
  });

  it('handles empty text', () => {
    const g = labelGeometry(label({ text: '' }), theme);
    expect(g.glyphs).toEqual([]);
    expect(g.box.x1).toBeGreaterThan(g.box.x0);
  });

  it('has a box that covers the whole text and its halo', () => {
    const g = labelGeometry(label(), theme);
    expect(g.box.x0).toBeLessThan(-g.width / 2);
    expect(g.box.x1).toBeGreaterThan(g.width / 2);
    expect(g.box.y0).toBeLessThan(-40 * 0.8);
    expect(g.box.y1).toBeGreaterThan(40 * 0.25);
  });
});

describe('labelGeometry (curved text)', () => {
  it('bends the letters along an arc: ends lower than the middle for a positive curve', () => {
    const g = labelGeometry(label({ curve: 1 }), theme);
    const first = g.glyphs[0]!;
    const middle = g.glyphs[3]!;
    const last = g.glyphs[6]!;
    expect(g.curved).toBe(true);
    expect(middle.x).toBeCloseTo(0, 6);
    expect(middle.y).toBeCloseTo(0, 6);
    expect(middle.angle).toBeCloseTo(0, 6);
    expect(first.y).toBeGreaterThan(0);
    expect(last.y).toBeCloseTo(first.y, 6);
    expect(last.angle).toBeGreaterThan(1.0);
    expect(last.angle).toBeLessThan(1.2 + 1e-9); // curve = 1 bends the text by 2.4 rad in total
    expect(first.angle).toBeCloseTo(-last.angle, 6);
  });

  it('bends the other way for a negative curve and less for a gentle one', () => {
    const up = labelGeometry(label({ curve: -1 }), theme);
    const gentle = labelGeometry(label({ curve: 0.3 }), theme);
    const full = labelGeometry(label({ curve: 1 }), theme);
    expect(up.glyphs[0]!.y).toBeLessThan(0);
    expect(up.glyphs[6]!.angle).toBeLessThan(0);
    expect(gentle.glyphs[0]!.y).toBeLessThan(full.glyphs[0]!.y);
    expect(gentle.glyphs[0]!.y).toBeGreaterThan(0);
  });

  it('keeps tiny curves and single letters straight', () => {
    expect(labelGeometry(label({ curve: 0.005 }), theme).curved).toBe(false);
    expect(labelGeometry(label({ curve: 1, text: 'X' }), theme).curved).toBe(false);
  });

  it('has a box that contains every letter', () => {
    const g = labelGeometry(label({ curve: 1 }), theme);
    for (const glyph of g.glyphs) {
      expect(glyph.x).toBeGreaterThan(g.box.x0);
      expect(glyph.x).toBeLessThan(g.box.x1);
      expect(glyph.y).toBeGreaterThan(g.box.y0);
      expect(glyph.y).toBeLessThan(g.box.y1);
    }
  });
});

describe('labelGeometry cache', () => {
  it('measures once per label object and again for an edited copy or another theme', () => {
    const l = label();
    const g = labelGeometry(l, theme);
    expect(labelGeometry(l, theme)).toBe(g);
    expect(labelGeometry({ ...l, text: 'Other' }, theme)).not.toBe(g);
    expect(labelGeometry(l, getTheme('parchment'))).not.toBe(g);
  });
});

describe('labelBounds and labelContains', () => {
  it('puts the box around the anchor', () => {
    const l = label();
    const { box } = labelGeometry(l, theme);
    expect(labelBounds(l, theme)).toEqual({ x0: 400 + box.x0, y0: 300 + box.y0, x1: 400 + box.x1, y1: 300 + box.y1 });
  });

  it('turns the box with the label', () => {
    const l = label({ rotation: Math.PI / 2 });
    const { box } = labelGeometry(l, theme);
    const b = labelBounds(l, theme);
    expect(b.x1 - b.x0).toBeCloseTo(box.y1 - box.y0, 6);
    expect(b.y1 - b.y0).toBeCloseTo(box.x1 - box.x0, 6);
  });

  it('hits the text but not the empty map around it, and `slop` makes it easier', () => {
    const l = label();
    const { width } = labelGeometry(l, theme);
    expect(labelContains(l, theme, 400, 300)).toBe(true);
    expect(labelContains(l, theme, 400 + width / 2 - 2, 295)).toBe(true);
    expect(labelContains(l, theme, 400 + width / 2 + 30, 300)).toBe(false);
    expect(labelContains(l, theme, 400 + width / 2 + 30, 300, 40)).toBe(true);
    expect(labelContains(l, theme, 400, 100)).toBe(false);
  });

  it('hits along the rotated axis of a rotated label', () => {
    const l = label({ rotation: Math.PI / 2 });
    const { width } = labelGeometry(l, theme);
    expect(labelContains(l, theme, 400, 300 + width / 2 - 5)).toBe(true);
    expect(labelContains(l, theme, 400 + width / 2 - 5, 300)).toBe(false);
  });
});
