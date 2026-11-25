import { defineSymbol } from '../../kit/define';
import type { Ctx2D, Rng } from '../../kit/types';
import { CLOTH, WOOD } from '../../parts/ship-parts';
import type { FishingLook, GalleyLook, LongshipLook, RowboatLook } from '../../parts/ship-oared';
import { drawFishingBoat, drawGalley, drawLongship, drawRowboat } from '../../parts/ship-oared';
import type { CaravelLook, CogLook, GreatShipLook } from '../../parts/ship-types';
import { drawCaravel, drawCog, drawGreatShip, makePen, skullMark } from '../../parts/ship-types';

const TAGS = ['ship', 'boat', 'sail', 'sailing', 'vessel'];
const GOLD = '#d6a944';

const COGS: CogLook[] = [
  { hull: WOOD.oak, cloth: CLOTH.cream, stripes: { a: CLOTH.red, b: CLOTH.cream, count: 6 }, flag: CLOTH.red, flagStripe: CLOTH.cream, sailor: true },
  { hull: WOOD.pine, band: WOOD.navy, cloth: CLOTH.white, cross: CLOTH.blue, flag: CLOTH.blue, mast: 1.08, castle: 12 },
  { hull: WOOD.red, band: '#e7d2a1', cloth: CLOTH.yellow, cross: CLOTH.red, flag: CLOTH.red, len: 1.06, sternH: 19, castle: 13, merlons: 5, sailor: true },
  { hull: WOOD.dark, cloth: CLOTH.white, stripes: { a: CLOTH.blue, b: CLOTH.white, count: 5 }, flag: CLOTH.blue, flagStripe: CLOTH.white },
  { hull: WOOD.oak, band: '#4c7a50', cloth: CLOTH.sand, flag: CLOTH.green, len: 0.92, sternH: 15, castle: 9, merlons: 3, mast: 0.94 },
  { hull: WOOD.teal, band: '#e9d9a8', cloth: CLOTH.cream, cross: CLOTH.red, flag: CLOTH.red, len: 1.08, mast: 1.12, sternH: 18, castle: 12, sailor: true },
];

const cog = defineSymbol({
  id: 'ship.cog',
  name: 'Cog',
  category: 'sea',
  size: [112, 98],
  anchor: [0.5, 0.86],
  order: 10,
  tags: [...TAGS, 'cog', 'merchant', 'trader', 'medieval', 'hanse'],
  placement: 'sea',
  rotatable: true,
  layer: 'object',
  variants: COGS.length,
  draw({ ctx, w, h, rand, variant }) {
    ctx.translate(w / 2, h * 0.86);
    drawCog(makePen(ctx, rand), COGS[variant % COGS.length]!);
  },
});

const GALLEONS: GreatShipLook[] = [
  { hull: WOOD.oak, band: '#d6a944', trim: '#d6a944', cloth: CLOTH.cream, masts: 3, castle: 'tall', ports: 6, flag: CLOTH.red, flagStripe: CLOTH.cream },
  { hull: WOOD.red, band: '#e9d9a8', trim: '#e0b650', cloth: CLOTH.white, stripes: { a: CLOTH.red, b: CLOTH.white, count: 4 }, masts: 3, castle: 'tall', ports: 6, flag: CLOTH.red, flagStripe: CLOTH.yellow },
  { hull: WOOD.navy, band: '#d6a944', trim: '#d6a944', cloth: CLOTH.cream, masts: 3, castle: 'tall', ports: 6, flag: CLOTH.blue, flagStripe: CLOTH.white, len: 0.96 },
  { hull: WOOD.dark, band: '#cda054', trim: '#cda054', cloth: CLOTH.sand, masts: 2, castle: 'tall', ports: 5, flag: CLOTH.green, len: 0.9 },
  { hull: WOOD.teal, band: '#e6d49b', trim: '#e6d49b', cloth: CLOTH.white, masts: 3, castle: 'tall', ports: 6, flag: CLOTH.yellow, flagStripe: CLOTH.red, lateenMizzen: false },
];

const galleon = defineSymbol({
  id: 'ship.galleon',
  name: 'Galleon',
  category: 'sea',
  size: [140, 132],
  anchor: [0.5, 0.85],
  order: 12,
  tags: [...TAGS, 'galleon', 'warship', 'man-of-war', 'spanish', 'tall ship'],
  placement: 'sea',
  rotatable: true,
  layer: 'object',
  variants: GALLEONS.length,
  draw({ ctx, w, h, rand, variant }) {
    ctx.translate(w / 2, h * 0.85);
    drawGreatShip(makePen(ctx, rand), GALLEONS[variant % GALLEONS.length]!);
  },
});

const PIRATES: GreatShipLook[] = [
  { hull: WOOD.black, band: '#8a2f2a', trim: '#8a2f2a', cloth: CLOTH.black, tatter: 0.7, mark: skullMark, masts: 3, castle: 'low', ports: 6, flag: '#1d1b22', skullFlag: true },
  { hull: '#4a3326', band: '#a8362f', trim: '#a8362f', cloth: '#5b2a2c', tatter: 0.9, mark: skullMark, masts: 3, castle: 'low', ports: 6, flag: '#7d2a2a', skullFlag: true, lateenMizzen: false },
  { hull: '#2f3b3d', band: '#8fb0a8', trim: '#8fb0a8', cloth: '#454a57', tatter: 0.6, mark: skullMark, masts: 2, castle: 'low', ports: 5, flag: '#1d1b22', skullFlag: true, len: 0.92 },
  { hull: WOOD.black, band: '#c4932f', trim: '#c4932f', cloth: '#2a2a33', tatter: 1, mark: skullMark, masts: 3, castle: 'tall', ports: 6, flag: '#1d1b22', skullFlag: true },
];

const pirate = defineSymbol({
  id: 'ship.pirate',
  name: 'Pirate Ship',
  category: 'sea',
  size: [140, 132],
  anchor: [0.5, 0.85],
  order: 16,
  tags: [...TAGS, 'pirate', 'skull', 'black sails', 'jolly roger', 'raider', 'corsair'],
  placement: 'sea',
  rotatable: true,
  layer: 'object',
  variants: PIRATES.length,
  draw({ ctx, w, h, rand, variant }) {
    ctx.translate(w / 2, h * 0.85);
    drawGreatShip(makePen(ctx, rand), PIRATES[variant % PIRATES.length]!);
  },
});

/* ---------------------------------------------------------------- caravel */

const CARAVELS: CaravelLook[] = [
  { hull: WOOD.oak, cloth: CLOTH.cream, cross: CLOTH.red, flag: CLOTH.red, flagStripe: CLOTH.cream, rig: 'latina' },
  { hull: WOOD.dark, band: '#a8362f', cloth: CLOTH.white, cross: CLOTH.red, flag: CLOTH.red, flagStripe: CLOTH.white, rig: 'redonda' },
  { hull: WOOD.red, band: '#e7d2a1', cloth: CLOTH.sand, flag: CLOTH.yellow, rig: 'latina', len: 1.04 },
  { hull: WOOD.teal, band: '#e9d9a8', cloth: CLOTH.cream, stripes: { a: CLOTH.blue, b: CLOTH.cream, count: 5 }, flag: CLOTH.blue, flagStripe: CLOTH.white, rig: 'redonda', len: 0.96 },
  { hull: WOOD.navy, band: GOLD, cloth: CLOTH.white, stripes: { a: CLOTH.blue, b: CLOTH.white, count: 4 }, flag: CLOTH.blue, flagStripe: CLOTH.white, rig: 'latina' },
];

const caravel = defineSymbol({
  id: 'ship.caravel',
  name: 'Caravel',
  category: 'sea',
  size: [112, 104],
  anchor: [0.5, 0.865],
  order: 14,
  tags: [...TAGS, 'caravel', 'explorer', 'lateen', 'discovery'],
  placement: 'sea',
  rotatable: true,
  layer: 'object',
  variants: CARAVELS.length,
  draw({ ctx, w, h, rand, variant }) {
    ctx.translate(w / 2, h * 0.865);
    drawCaravel(makePen(ctx, rand), CARAVELS[variant % CARAVELS.length]!);
  },
});

/* ---------------------------------------------------------------- longship */

const LONGSHIPS: LongshipLook[] = [
  { hull: WOOD.oak, strake: '#b4452f', cloth: CLOTH.cream, stripes: { a: CLOTH.red, b: CLOTH.cream, count: 7 }, head: 'dragon', shields: [CLOTH.red, CLOTH.yellow], accent: '#c9a23a' },
  { hull: WOOD.pine, strake: '#4a5d7a', cloth: CLOTH.cream, stripes: { a: CLOTH.blue, b: CLOTH.cream, count: 5 }, head: 'curl', shields: [CLOTH.blue, '#efe4c4'], accent: CLOTH.blue },
  { hull: WOOD.dark, strake: '#e5d3a4', cloth: CLOTH.red, stripes: { a: '#efe4c4', b: CLOTH.red, count: 9 }, head: 'dragon', shields: ['#2c2a2e', CLOTH.red], accent: '#c9a23a' },
  { hull: WOOD.oak, strake: '#5d7b74', cloth: CLOTH.cream, head: 'dragon', shields: [CLOTH.green, '#efe4c4'], accent: '#c9a23a', sail: false },
  { hull: WOOD.red, strake: '#d9c58f', cloth: '#d8c9a2', stripes: { a: '#3b3a43', b: '#d8c9a2', count: 3 }, head: 'curl', shields: [CLOTH.yellow, '#2c2a2e'], accent: CLOTH.yellow, len: 0.94 },
];

const longship = defineSymbol({
  id: 'ship.longship',
  name: 'Longship',
  category: 'sea',
  size: [150, 92],
  anchor: [0.5, 0.78],
  order: 18,
  tags: [...TAGS, 'longship', 'viking', 'drakkar', 'norse', 'dragon', 'shields'],
  placement: 'sea',
  rotatable: true,
  layer: 'object',
  variants: LONGSHIPS.length,
  draw({ ctx, w, h, rand, variant }) {
    ctx.translate(w / 2, h * 0.78);
    drawLongship(makePen(ctx, rand), LONGSHIPS[variant % LONGSHIPS.length]!);
  },
});

/* ---------------------------------------------------------------- galley */

const GALLEYS: GalleyLook[] = [
  { hull: WOOD.red, strake: GOLD, cloth: CLOTH.cream, awning: CLOTH.red, awning2: '#efe4c4', flag: CLOTH.red },
  { hull: WOOD.navy, strake: GOLD, cloth: CLOTH.white, stripes: { a: CLOTH.blue, b: CLOTH.white, count: 5 }, awning: CLOTH.blue, awning2: '#efe4c4', flag: CLOTH.blue },
  { hull: WOOD.teal, strake: '#e6d49b', cloth: CLOTH.cream, awning: CLOTH.yellow, awning2: CLOTH.red, flag: CLOTH.yellow, sail: false },
  { hull: WOOD.oak, strake: '#4c7a50', cloth: CLOTH.sand, awning: CLOTH.green, awning2: '#efe4c4', flag: CLOTH.green, oars: 8 },
];

const galley = defineSymbol({
  id: 'ship.galley',
  name: 'Galley',
  category: 'sea',
  size: [150, 88],
  anchor: [0.5, 0.86],
  order: 20,
  tags: [...TAGS, 'galley', 'oars', 'rowing', 'trireme', 'warship', 'ancient'],
  placement: 'sea',
  rotatable: true,
  layer: 'object',
  variants: GALLEYS.length,
  draw({ ctx, w, h, rand, variant }) {
    ctx.translate(w / 2, h * 0.86);
    drawGalley(makePen(ctx, rand), GALLEYS[variant % GALLEYS.length]!);
  },
});

/* ---------------------------------------------------------------- small boats */

const FISHERS: FishingLook[] = [
  { hull: WOOD.red, band: '#e9d9a8', cloth: CLOTH.cream, patch: CLOTH.rust, rig: 'lateen', cargo: 'net', hat: '#d9b86a' },
  { hull: WOOD.navy, band: '#e9d9a8', cloth: CLOTH.white, patch: CLOTH.blue, rig: 'lateen', cargo: 'barrels', hat: CLOTH.red, flag: CLOTH.red },
  { hull: WOOD.pine, band: CLOTH.blue, cloth: CLOTH.yellow, patch: CLOTH.rust, rig: 'sprit', cargo: 'crates', hat: CLOTH.blue, flag: CLOTH.blue },
  { hull: WOOD.teal, band: '#e6d49b', cloth: CLOTH.cream, rig: 'oars', cargo: 'net', hat: '#d9b86a' },
  { hull: WOOD.oak, band: '#4c7a50', cloth: CLOTH.sand, patch: CLOTH.green, rig: 'lateen', cargo: 'none', hat: CLOTH.green, flag: CLOTH.green },
];

const fishing = defineSymbol({
  id: 'boat.fishing',
  name: 'Fishing Boat',
  category: 'sea',
  size: [78, 68],
  anchor: [0.5, 0.82],
  order: 30,
  tags: [...TAGS, 'fishing', 'fisherman', 'net', 'small boat'],
  placement: 'sea',
  rotatable: true,
  layer: 'object',
  variants: FISHERS.length,
  draw({ ctx, w, h, rand, variant }) {
    ctx.translate(w / 2 + 1, h * 0.82);
    drawFishingBoat(makePen(ctx, rand), FISHERS[variant % FISHERS.length]!);
  },
});

const ROWBOATS: RowboatLook[] = [
  { hull: WOOD.oak, inside: '#a77d4f', cargo: 'none' },
  { hull: WOOD.pine, inside: '#b88a58', band: CLOTH.blue, cargo: 'barrel', sailor: CLOTH.blue },
  { hull: WOOD.dark, inside: '#7b5638', band: GOLD, cargo: 'lantern', sailor: CLOTH.red },
  { hull: WOOD.teal, inside: '#a77d4f', cargo: 'net', sailor: null },
];

const rowboat = defineSymbol({
  id: 'boat.rowboat',
  name: 'Rowboat',
  category: 'sea',
  size: [56, 38],
  anchor: [0.5, 0.78],
  order: 32,
  tags: [...TAGS, 'rowboat', 'dinghy', 'oars', 'small boat', 'lifeboat'],
  placement: 'sea',
  rotatable: true,
  layer: 'object',
  variants: ROWBOATS.length,
  draw({ ctx, w, h, rand, variant }) {
    ctx.translate(w / 2 + 1, h * 0.78);
    drawRowboat(makePen(ctx, rand), ROWBOATS[variant % ROWBOATS.length]!);
  },
});

/* ---------------------------------------------------------------- fleet */

type Draw = (ctx: Ctx2D, rand: Rng, scale: number) => void;

const inCog = (i: number): Draw => (ctx, rand, s) => drawCog(makePen(ctx, rand, s), COGS[i]!);
const inCaravel = (i: number): Draw => (ctx, rand, s) => drawCaravel(makePen(ctx, rand, s), CARAVELS[i]!);
const inGalleon = (i: number): Draw => (ctx, rand, s) => drawGreatShip(makePen(ctx, rand, s), GALLEONS[i]!);
const inLongship = (i: number): Draw => (ctx, rand, s) => drawLongship(makePen(ctx, rand, s), LONGSHIPS[i]!);
const inGalley = (i: number): Draw => (ctx, rand, s) => drawGalley(makePen(ctx, rand, s), GALLEYS[i]!);
const inFisher = (i: number): Draw => (ctx, rand, s) => drawFishingBoat(makePen(ctx, rand, s), FISHERS[i]!);

interface Placed {
  draw: Draw;
  x: number;
  y: number;
  scale: number;
}

const FLEETS: Placed[][] = [
  // Merchant convoy
  [
    { draw: inCaravel(0), x: 112, y: 74, scale: 0.6 },
    { draw: inCog(1), x: 58, y: 96, scale: 0.62 },
    { draw: inCog(3), x: 160, y: 104, scale: 0.54 },
  ],
  // Raiding party
  [
    { draw: inLongship(0), x: 110, y: 72, scale: 0.58 },
    { draw: inLongship(2), x: 58, y: 96, scale: 0.58 },
    { draw: inLongship(1), x: 158, y: 104, scale: 0.5 },
  ],
  // War fleet
  [
    { draw: inGalleon(2), x: 108, y: 80, scale: 0.5 },
    { draw: inGalleon(1), x: 56, y: 102, scale: 0.46 },
    { draw: inCaravel(1), x: 160, y: 104, scale: 0.5 },
  ],
  // Fishing fleet
  [
    { draw: inFisher(1), x: 118, y: 70, scale: 0.78 },
    { draw: inFisher(0), x: 60, y: 92, scale: 0.84 },
    { draw: inFisher(4), x: 158, y: 106, scale: 0.7 },
  ],
  // Galley squadron
  [
    { draw: inGalley(0), x: 116, y: 72, scale: 0.52 },
    { draw: inGalley(1), x: 60, y: 96, scale: 0.5 },
    { draw: inGalley(3), x: 162, y: 104, scale: 0.46 },
  ],
];

const fleet = defineSymbol({
  id: 'boat.fleet',
  name: 'Fleet',
  category: 'sea',
  size: [210, 124],
  anchor: [0.5, 0.82],
  order: 34,
  tags: [...TAGS, 'fleet', 'convoy', 'armada', 'squadron', 'group'],
  placement: 'sea',
  rotatable: true,
  layer: 'object',
  variants: FLEETS.length,
  draw({ ctx, rand, variant }) {
    const ships = FLEETS[variant % FLEETS.length]!;
    // Back to front so nearer ships overlap the ones behind them.
    for (const s of [...ships].sort((a, b) => a.y - b.y)) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale(s.scale, s.scale);
      s.draw(ctx, rand, s.scale);
      ctx.restore();
    }
  },
});

export default [cog, galleon, caravel, pirate, longship, galley, fishing, rowboat, fleet];
