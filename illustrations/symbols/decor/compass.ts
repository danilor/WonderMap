import { defineSymbol } from '../../kit/define';
import { drawRose } from '../../parts/sea-compass';
import type { RoseLook, RosePalette } from '../../parts/sea-compass';

const INK = '#2a2015';

const PARCHMENT: RosePalette = { ink: INK, paper: '#f1e3bd', band: '#e2cb93', light: '#f8edd0', dark: '#8c6638', north: '#b8332b' };
const SEAFARER: RosePalette = { ink: '#1f2a33', paper: '#e8efe9', band: '#bcd3d0', light: '#f4f8f2', dark: '#2f6c8a', north: '#c2402f' };
const GILDED: RosePalette = { ink: '#2a1c10', paper: '#efdca6', band: '#cfa94f', light: '#f6dd8e', dark: '#6b4719', north: '#9b2b2b' };
const IRON: RosePalette = { ink: '#1e1a17', paper: '#e6dccb', band: '#c9bba3', light: '#d9cdb6', dark: '#4a4039', north: '#a8302a' };

const ROSES: RoseLook[] = [
  { points: 16, palette: PARCHMENT, ring: 'full', letters: 'all', rhumbs: true },
  { points: 8, palette: SEAFARER, ring: 'full', letters: 'all', rhumbs: true },
  { points: 16, palette: GILDED, ring: 'full', letters: 'all' },
  { points: 16, palette: IRON, ring: 'none', letters: 'north', rhumbs: true },
];

const SIMPLE: RoseLook[] = [
  { points: 4, palette: PARCHMENT, ring: 'full', letters: 'north' },
  { points: 8, palette: SEAFARER, ring: 'full', letters: 'north' },
  { points: 4, palette: IRON, ring: 'none', letters: 'north' },
  { points: 8, palette: GILDED, ring: 'none', letters: 'north' },
];

const rose = defineSymbol({
  id: 'decor.compass.rose',
  name: 'Compass Rose',
  category: 'decor',
  size: [260, 260],
  anchor: [0.5, 0.5],
  layer: 'ground',
  placement: 'any',
  rotatable: true,
  variants: ROSES.length,
  tags: ['compass', 'rose', 'north', 'wind', 'direction', 'ornament'],
  order: 10,
  draw: ({ ctx, w, h, variant }) => drawRose(ctx, w, h, ROSES[variant % ROSES.length]!),
});

const simple = defineSymbol({
  id: 'decor.compass.simple',
  name: 'Simple Compass',
  category: 'decor',
  size: [120, 120],
  anchor: [0.5, 0.5],
  layer: 'ground',
  placement: 'any',
  rotatable: true,
  variants: SIMPLE.length,
  tags: ['compass', 'north', 'arrow', 'direction', 'ornament'],
  order: 11,
  draw: ({ ctx, w, h, variant }) => drawRose(ctx, w, h, SIMPLE[variant % SIMPLE.length]!),
});

export default [rose, simple];
