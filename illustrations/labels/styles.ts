import { defineLabelStyle } from '../kit/define';

/**
 * Label presets shown in the Labels tool. `size` is in map pixels; `spacing` in em.
 * `color: null` / `halo: null` follow the active theme.
 */
export default [
  defineLabelStyle({ id: 'continent', name: 'Continent', font: 'cinzel', size: 78, weight: 400, spacing: 0.5, uppercase: true, color: null, halo: null, haloWidth: 8, order: 10 }),
  defineLabelStyle({ id: 'region', name: 'Region / Kingdom', font: 'cinzel', size: 42, weight: 700, spacing: 0.3, uppercase: true, color: null, halo: null, haloWidth: 6, order: 20 }),
  defineLabelStyle({ id: 'city', name: 'City', font: 'fell', size: 30, weight: 400, spacing: 0.05, color: null, halo: null, haloWidth: 5, order: 30 }),
  defineLabelStyle({ id: 'town', name: 'Town', font: 'fell', size: 22, weight: 400, spacing: 0.03, color: null, halo: null, haloWidth: 4, order: 40 }),
  defineLabelStyle({ id: 'village', name: 'Village', font: 'fell', size: 17, weight: 400, italic: true, spacing: 0.02, color: null, halo: null, haloWidth: 3.5, order: 50 }),
  defineLabelStyle({ id: 'sea', name: 'Sea / Ocean', font: 'fell', size: 46, weight: 400, italic: true, spacing: 0.28, color: '#1f4a63', halo: '#cfe9ee', haloWidth: 5, order: 60 }),
  defineLabelStyle({ id: 'mountain', name: 'Mountains', font: 'almendra', size: 28, weight: 700, italic: true, spacing: 0.12, color: '#4a3320', halo: null, haloWidth: 5, order: 70 }),
  defineLabelStyle({ id: 'wild', name: 'Forest / Swamp', font: 'almendra', size: 28, weight: 400, italic: true, spacing: 0.14, color: '#27401a', halo: null, haloWidth: 5, order: 80 }),
  defineLabelStyle({ id: 'landmark', name: 'Landmark', font: 'medieval', size: 22, weight: 400, spacing: 0.04, color: null, halo: null, haloWidth: 4, order: 90 }),
  defineLabelStyle({ id: 'ancient', name: 'Ancient / Runic', font: 'uncial', size: 32, weight: 400, spacing: 0.12, color: '#5a2a1a', halo: null, haloWidth: 5, order: 100 }),
  defineLabelStyle({ id: 'dungeon', name: 'Dungeon / Dark', font: 'metamorphous', size: 26, weight: 400, spacing: 0.1, color: '#3a1a1a', halo: null, haloWidth: 4.5, order: 110 }),
  defineLabelStyle({ id: 'title', name: 'Map Title', font: 'pirata', size: 104, weight: 400, spacing: 0.06, color: null, halo: null, haloWidth: 9, order: 120 }),
];
