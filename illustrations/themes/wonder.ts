import { defineTheme } from '../kit/define';

/** Rich, saturated colors with teal seas: the Wonderdraft / Inkarnate look. */
export default defineTheme({
  id: 'wonder',
  name: 'Wonder',
  blurb: 'Rich colors, teal seas and soft ripples',
  swatch: ['#7aa447', '#3f8aa8'],
  sea: { deep: '#2c6a8c', mid: '#4a96b4', shallow: '#93d6d8', ripple: '#e3f6f2', mottle: 0.35 },
  coast: { ink: '#3a2a17', inkWidth: 1.5, shadow: '#0e3046', innerShade: 0.22 },
  paper: { color: '#efe2c0', strength: 0.1, vignette: 0.12 },
  grade: { saturation: 1.04, contrast: 1.02 },
  label: { color: '#2a1c0e', halo: '#f4e9cc' },
  frame: 'simple',
  ink: '#3a2a17',
});
