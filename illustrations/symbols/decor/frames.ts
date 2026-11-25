import { defineSymbol } from '../../kit/define';
import { drawBanner, drawCartouche, drawScaleBar } from '../../parts/sea-frames';
import type { CartoucheKind, ScaleKind } from '../../parts/sea-frames';

const BANNERS = ['#b8332f', '#2f5f9f', '#3f7d4a', '#cfa23c'];

/** A ribbon banner to put a title on. */
const banner = defineSymbol({
  id: 'decor.banner',
  name: 'Ribbon Banner',
  category: 'decor',
  size: [240, 84],
  anchor: [0.5, 0.5],
  layer: 'ground',
  placement: 'any',
  rotatable: true,
  variants: BANNERS.length,
  tags: ['banner', 'ribbon', 'title', 'label', 'scroll', 'decor', 'frame'],
  order: 30,
  draw: ({ ctx, variant }) => drawBanner(ctx, BANNERS[variant % BANNERS.length]!),
});

const CARTOUCHES: CartoucheKind[] = ['scroll', 'plaque', 'oval'];

/** An empty ornate plate or scroll for a map title. */
const cartouche = defineSymbol({
  id: 'decor.cartouche',
  name: 'Title Cartouche',
  category: 'decor',
  size: [280, 120],
  anchor: [0.5, 0.5],
  layer: 'ground',
  placement: 'any',
  rotatable: true,
  variants: CARTOUCHES.length,
  tags: ['cartouche', 'title', 'plaque', 'scroll', 'frame', 'label', 'parchment', 'decor'],
  order: 31,
  draw: ({ ctx, rand, variant }) => drawCartouche(ctx, rand, CARTOUCHES[variant % CARTOUCHES.length]!),
});

const SCALES: ScaleKind[] = ['checker', 'double', 'arrow'];

/** A scale bar ornament (no figures; label it yourself). */
const scaleBar = defineSymbol({
  id: 'decor.scale-bar',
  name: 'Scale Bar',
  category: 'decor',
  size: [220, 36],
  anchor: [0.5, 0.5],
  layer: 'ground',
  placement: 'any',
  rotatable: true,
  variants: SCALES.length,
  tags: ['scale', 'bar', 'distance', 'ruler', 'legend', 'decor'],
  order: 32,
  draw: ({ ctx, variant }) => drawScaleBar(ctx, SCALES[variant % SCALES.length]!),
});

export default [banner, cartouche, scaleBar];
