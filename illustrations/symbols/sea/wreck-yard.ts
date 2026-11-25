import { defineSymbol } from '../../kit/define';
import { WOOD } from '../../parts/ship-parts';
import { makePen } from '../../parts/ship-types';
import type { YardLook } from '../../parts/ship-wrecks-yard';
import { drawShipyard } from '../../parts/ship-wrecks-yard';

const YARDS: YardLook[] = [
  { stage: 'half', ground: '#c7a96f', timber: WOOD.pale, fallen: 0.25 },
  { stage: 'ribs', ground: '#b9a06c', timber: WOOD.oak, fallen: 0.55 },
  { stage: 'burnt', ground: '#8f7c58', timber: WOOD.dark, fallen: 0.85 },
  { stage: 'overgrown', ground: '#a3a66a', timber: WOOD.pale, fallen: 0.7 },
];

/** An abandoned shipyard: a half-built hull on its slipway, a collapsing scaffold and a broken crane. */
export default defineSymbol({
  id: 'wreck.shipyard',
  name: 'Wrecked Shipyard',
  category: 'sea',
  size: [232, 150],
  anchor: [0.5, 0.78],
  order: 55,
  tags: ['wreck', 'shipyard', 'ruin', 'ruined', 'slipway', 'dockyard', 'shipbuilding', 'harbour', 'abandoned', 'scaffold', 'crane', 'derelict', 'burnt'],
  placement: 'land',
  layer: 'object',
  variants: YARDS.length,
  draw({ ctx, w, h, rand, variant }) {
    ctx.translate(w / 2, h * 0.78);
    drawShipyard(makePen(ctx, rand), YARDS[variant % YARDS.length]!);
  },
});
