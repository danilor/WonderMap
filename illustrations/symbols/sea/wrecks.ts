import { defineSymbol } from '../../kit/define';
import { CLOTH, WOOD } from '../../parts/ship-parts';
import { makePen } from '../../parts/ship-types';
import type { ShipWreckLook } from '../../parts/ship-wrecks';
import { drawShipWreck } from '../../parts/ship-wrecks';
import type { BeachedLook, GraveyardLayout } from '../../parts/ship-wrecks-shore';
import { drawBeached, drawGraveyard } from '../../parts/ship-wrecks-shore';
import type { MastWreckLook, SmallWreckLook } from '../../parts/ship-wrecks-small';
import { drawMastWreck, drawSmallWreck } from '../../parts/ship-wrecks-small';

const TAGS = ['wreck', 'shipwreck', 'sunken', 'ruin', 'ship'];
const GOLD = '#d6a944';

const SHIP_WRECKS: ShipWreckLook[] = [
  { pose: 'listing', hull: WOOD.oak, trim: GOLD, cloth: CLOTH.cream },
  { pose: 'split', hull: WOOD.red, trim: '#e0b650', cloth: CLOTH.white },
  { pose: 'bow', hull: WOOD.navy, trim: GOLD, cloth: CLOTH.cream },
  { pose: 'burned', hull: WOOD.black, trim: '#8a2f2a', cloth: CLOTH.black },
  { pose: 'capsized', hull: WOOD.dark, trim: '#cda054', cloth: CLOTH.sand },
];

const wreckShip = defineSymbol({
  id: 'wreck.ship',
  name: 'Shipwreck',
  category: 'sea',
  size: [150, 112],
  anchor: [0.5, 0.75],
  order: 50,
  tags: [...TAGS, 'broken', 'galleon', 'derelict', 'ribs', 'hull'],
  placement: 'sea',
  rotatable: true,
  layer: 'object',
  variants: SHIP_WRECKS.length,
  draw({ ctx, w, h, rand, variant }) {
    ctx.translate(w / 2, h * 0.75);
    drawShipWreck(makePen(ctx, rand), SHIP_WRECKS[variant % SHIP_WRECKS.length]!);
  },
});

const SMALL_WRECKS: SmallWreckLook[] = [
  { pose: 'cog', hull: WOOD.oak, trim: '#c9a05a', cloth: CLOTH.cream },
  { pose: 'fishing', hull: WOOD.teal, trim: '#e0d3a8', cloth: CLOTH.sand },
  { pose: 'longship', hull: WOOD.pale, trim: '#9a4034', cloth: CLOTH.cream },
  { pose: 'rowboat', hull: WOOD.red, trim: '#e0d3a8', cloth: CLOTH.white },
];

const wreckShipSmall = defineSymbol({
  id: 'wreck.ship.small',
  name: 'Small Wreck',
  category: 'sea',
  size: [112, 84],
  anchor: [0.5, 0.74],
  order: 51,
  tags: [...TAGS, 'boat', 'cog', 'longship', 'rowboat', 'fishing', 'small'],
  placement: 'sea',
  rotatable: true,
  layer: 'object',
  variants: SMALL_WRECKS.length,
  draw({ ctx, w, h, rand, variant }) {
    ctx.translate(w / 2, h * 0.74);
    drawSmallWreck(makePen(ctx, rand), SMALL_WRECKS[variant % SMALL_WRECKS.length]!);
  },
});

const MAST_WRECKS: MastWreckLook[] = [
  { pose: 'single', wood: WOOD.dark, cloth: CLOTH.cream, flag: CLOTH.red },
  { pose: 'twin', wood: WOOD.oak, cloth: CLOTH.sand, flag: CLOTH.blue },
  { pose: 'nest', wood: WOOD.dark, cloth: CLOTH.white, flag: CLOTH.red },
  { pose: 'yard', wood: WOOD.oak, cloth: CLOTH.cream, flag: CLOTH.yellow },
];

const wreckMast = defineSymbol({
  id: 'wreck.mast',
  name: 'Broken Mast',
  category: 'sea',
  size: [64, 96],
  anchor: [0.5, 0.8],
  order: 52,
  tags: [...TAGS, 'mast', 'spar', 'flotsam', 'sail'],
  placement: 'sea',
  rotatable: false,
  layer: 'object',
  variants: MAST_WRECKS.length,
  draw({ ctx, w, h, rand, variant }) {
    ctx.translate(w / 2, h * 0.8);
    drawMastWreck(makePen(ctx, rand), MAST_WRECKS[variant % MAST_WRECKS.length]!);
  },
});

const BEACHED_WRECKS: BeachedLook[] = [
  { pose: 'ribs', hull: WOOD.oak, trim: GOLD, cloth: CLOTH.cream, sand: '#e2c88c' },
  { pose: 'skeleton', hull: WOOD.pale, trim: '#d9cdb4', cloth: CLOTH.sand, sand: '#ead29a' },
  { pose: 'tilted', hull: WOOD.red, trim: '#e0b650', cloth: CLOTH.white, sand: '#d9bd82' },
  { pose: 'buried', hull: WOOD.oak, trim: '#9a4034', cloth: CLOTH.cream, sand: '#e6cf98' },
];

const wreckBeached = defineSymbol({
  id: 'wreck.beached',
  name: 'Beached Wreck',
  category: 'sea',
  size: [150, 100],
  anchor: [0.5, 0.8],
  order: 53,
  tags: [...TAGS, 'beach', 'shore', 'aground', 'coast', 'skeleton', 'ribs'],
  placement: 'land',
  rotatable: false,
  layer: 'object',
  variants: BEACHED_WRECKS.length,
  draw({ ctx, w, h, rand, variant }) {
    ctx.translate(w / 2, h * 0.8);
    drawBeached(makePen(ctx, rand), BEACHED_WRECKS[variant % BEACHED_WRECKS.length]!);
  },
});

const GRAVEYARD_LAYOUTS: GraveyardLayout[] = ['hulks', 'reef', 'fleet', 'broken'];

const wreckGraveyard = defineSymbol({
  id: 'wreck.graveyard',
  name: 'Ship Graveyard',
  category: 'sea',
  size: [260, 170],
  anchor: [0.5, 0.74],
  order: 54,
  tags: [...TAGS, 'graveyard', 'shipyard', 'cemetery', 'fleet', 'shoal', 'hulks', 'cluster', 'wrecked'],
  placement: 'sea',
  rotatable: false,
  layer: 'object',
  variants: GRAVEYARD_LAYOUTS.length,
  draw({ ctx, w, h, rand, variant }) {
    ctx.translate(w / 2, h * 0.74);
    drawGraveyard(makePen(ctx, rand), GRAVEYARD_LAYOUTS[variant % GRAVEYARD_LAYOUTS.length]!);
  },
});

export default [wreckShip, wreckShipSmall, wreckMast, wreckBeached, wreckGraveyard];
