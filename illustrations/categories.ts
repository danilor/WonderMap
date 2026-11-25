import { defineCategory } from './kit/define';

/**
 * Library categories (tabs in the symbol panel). A symbol picks one with `category: '<id>'`.
 * Add a new entry here when you create a brand-new family of art (for example `dungeon`).
 */
export const categories = [
  defineCategory({ id: 'mountains', name: 'Mountains', icon: 'triangle-fill', order: 10, blurb: 'Peaks, ranges, hills and rocky crags' }),
  defineCategory({ id: 'forests', name: 'Forests & Trees', icon: 'tree-fill', order: 20, blurb: 'Single trees and dense woods' }),
  defineCategory({ id: 'vegetation', name: 'Vegetation', icon: 'flower2', order: 30, blurb: 'Bushes, grass, flowers, crops' }),
  defineCategory({ id: 'desert', name: 'Desert', icon: 'sun-fill', order: 40, blurb: 'Dunes, cacti, oases, dry bones' }),
  defineCategory({ id: 'volcanic', name: 'Volcanoes & Caverns', icon: 'fire', order: 50, blurb: 'Volcanoes, craters, cave mouths' }),
  defineCategory({ id: 'settlements', name: 'Settlements', icon: 'buildings-fill', order: 60, layer: 'landmark', blurb: 'Villages, towns, cities, castles, ports' }),
  defineCategory({ id: 'sea', name: 'Sea', icon: 'tsunami', order: 70, blurb: 'Ships, wrecks, islands, sea monsters' }),
  defineCategory({ id: 'ice', name: 'Ice & Snow', icon: 'snow2', order: 80, blurb: 'Glaciers, icebergs, snowy trees' }),
  defineCategory({ id: 'swamp', name: 'Swamp', icon: 'moisture', order: 90, blurb: 'Reeds, dead trees, bogs' }),
  defineCategory({ id: 'landmarks', name: 'Landmarks', icon: 'geo-alt-fill', order: 100, layer: 'landmark', blurb: 'Ruins, towers, temples, standing stones' }),
  defineCategory({ id: 'decor', name: 'Map Decor', icon: 'compass', order: 110, blurb: 'Compass roses, clouds, banners' }),
] as const;
