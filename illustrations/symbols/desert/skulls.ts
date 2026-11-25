import { defineSymbol } from '../../kit/define';
import { softBlob } from '../../kit/draw';
import { drawBeastSkull, drawDragonSkull, drawHumanSkull, drawLongBone, drawRibcage } from '../../parts/nature-bones';
import { drift } from '../../parts/nature-pyramid';
import { sandRock } from '../../parts/nature-sand';
import { dryTuft } from '../../parts/nature-stone';

const skull = defineSymbol({
  id: 'desert.skull',
  name: 'Skull and bones',
  category: 'desert',
  size: [60, 42],
  anchor: [0.5, 0.74],
  order: 160,
  tags: ['skull', 'bones', 'skeleton', 'horns', 'ribs', 'death', 'danger', 'remains', 'desert', 'bleached'],
  placement: 'land',
  variants: 6,
  draw({ ctx, rand, variant }) {
    softBlob(ctx, 30, 30, 27, 8, '#9c7e4e', 0.22);
    switch (variant % 6) {
      case 0:
        dryTuft(ctx, rand, 52, 37, 7);
        drawBeastSkull(ctx, { cx: 30, cy: 21, s: 0.9, horns: 'long' });
        sandRock(ctx, rand, 9, 38, 2.6);
        break;
      case 1:
        dryTuft(ctx, rand, 8, 38, 6);
        drawBeastSkull(ctx, { cx: 30, cy: 21, s: 0.95, horns: 'ram' });
        sandRock(ctx, rand, 51, 37, 2.4);
        break;
      case 2:
        drawLongBone(ctx, 9, 15, 51, 36, 5);
        drawLongBone(ctx, 9, 36, 51, 15, 5);
        drawHumanSkull(ctx, { cx: 30, cy: 20, s: 1.2, tilt: -0.06, crack: true });
        break;
      case 3:
        drawRibcage(ctx, { x: 7, y: 34, len: 40, h: 20, ribs: 5, slope: 0.06, rand });
        drift(ctx, rand, 28, 38, 27, 7, 0.45);
        sandRock(ctx, rand, 53, 36, 2.4);
        dryTuft(ctx, rand, 8, 40, 6);
        break;
      case 4:
        drawLongBone(ctx, 24, 35, 54, 25, 4.4);
        drawLongBone(ctx, 6, 27, 22, 35, 3.8);
        drawHumanSkull(ctx, { cx: 25, cy: 17, s: 0.95, tilt: 0.28, jaw: false });
        sandRock(ctx, rand, 52, 37, 2.2);
        dryTuft(ctx, rand, 9, 21, 6);
        break;
      default:
        drawDragonSkull(ctx, { x: 2, y: 7, s: 0.9 });
        sandRock(ctx, rand, 6, 39, 2.4);
        break;
    }
  },
});

export default skull;
