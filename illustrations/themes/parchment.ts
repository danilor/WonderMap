import { defineTheme } from '../kit/define';

/** Old-world sepia ink on aged paper with a blue-gray sea (like a hand-drawn atlas page). */
export default defineTheme({
  id: 'parchment',
  name: 'Parchment',
  blurb: 'Sepia ink on aged paper, blue-gray seas',
  swatch: ['#e3d3a6', '#7f9aa4'],
  sea: { deep: '#6c8995', mid: '#88a3ac', shallow: '#b7c9c6', ripple: '#eef1e4', mottle: 0.3 },
  coast: { ink: '#2b2015', inkWidth: 1.7, shadow: '#2f4650', innerShade: 0.16 },
  paper: { color: '#e9d9ab', strength: 0.55, vignette: 0.3 },
  grade: { saturation: 0.55, sepia: 0.55, contrast: 1.06, brightness: 1.03, tint: '#f2deac', tintAmount: 0.3 },
  label: { color: '#2a1c0e', halo: '#eddfb6' },
  frame: 'ornate',
  ink: '#2b2015',
});
