import { defineSymbol } from '../../kit/define';
import { softBlob } from '../../kit/draw';
import { CLOTH, RUGS, drawCampfire, drawConeTent, drawCrate, drawGableTent, drawJar, drawRug, drawSack } from '../../parts/nature-camp';

const camp = defineSymbol({
  id: 'desert.camp',
  name: 'Nomad camp',
  category: 'desert',
  size: [120, 88],
  anchor: [0.5, 0.86],
  order: 150,
  tags: ['camp', 'tent', 'tents', 'nomad', 'bedouin', 'caravan', 'campfire', 'settlement', 'desert'],
  placement: 'land',
  variants: 6,
  draw({ ctx, rand, variant }) {
    // trampled sand under the whole camp
    softBlob(ctx, 60, 72, 56, 15, '#9c7e4e', 0.3);
    softBlob(ctx, 60, 74, 38, 9, '#8a6c42', 0.2);
    switch (variant % 6) {
      case 0:
        drawConeTent(ctx, { cx: 38, baseY: 56, rx: 22, h: 40, cloth: CLOTH.red, rand, door: 0.2 });
        drawConeTent(ctx, { cx: 88, baseY: 52, rx: 15, h: 29, cloth: CLOTH.indigo, rand, door: -0.3 });
        drawCampfire(ctx, rand, 62, 72);
        drawSack(ctx, 22, 76, 9);
        drawJar(ctx, 96, 76, 10, '#c98a52');
        break;
      case 1:
        drawGableTent(ctx, { fx: 30, fy: 62, a: 34, b: 22, h: 22, cloth: CLOTH.goat, rand, stripes: 4 });
        drawGableTent(ctx, { fx: 86, fy: 66, a: 26, b: 18, h: 18, cloth: CLOTH.ochre, rand, pegs: 4 });
        drawCampfire(ctx, rand, 58, 78);
        drawCrate(ctx, 100, 82, 8);
        drawJar(ctx, 18, 80, 10, '#b97a4a');
        break;
      case 2:
        drawConeTent(ctx, { cx: 60, baseY: 60, rx: 26, h: 38, cloth: CLOTH.white, rand, panels: 8, flag: '#bd4f38' });
        drawConeTent(ctx, { cx: 22, baseY: 70, rx: 12, h: 21, cloth: CLOTH.green, rand, panels: 6, door: 0.5 });
        drawConeTent(ctx, { cx: 98, baseY: 68, rx: 12, h: 21, cloth: CLOTH.ochre, rand, panels: 6, door: -0.5 });
        drawCampfire(ctx, rand, 60, 81);
        break;
      case 3:
        drawGableTent(ctx, { fx: 40, fy: 66, a: 30, b: 20, h: 20, cloth: CLOTH.indigo, rand });
        drawRug(ctx, 66, 84, 16, 10, RUGS.red);
        drawCampfire(ctx, rand, 94, 72);
        drawJar(ctx, 20, 78, 11, '#c98a52');
        drawSack(ctx, 34, 82, 9);
        break;
      case 4:
        drawConeTent(ctx, { cx: 60, baseY: 44, rx: 15, h: 30, cloth: CLOTH.green, rand, panels: 6 });
        drawConeTent(ctx, { cx: 26, baseY: 62, rx: 15, h: 27, cloth: CLOTH.red, rand, panels: 6, door: 0.5 });
        drawConeTent(ctx, { cx: 94, baseY: 62, rx: 15, h: 27, cloth: CLOTH.ochre, rand, panels: 6, door: -0.5 });
        drawCampfire(ctx, rand, 60, 74);
        drawJar(ctx, 44, 82, 9, '#b97a4a');
        drawSack(ctx, 78, 82, 8);
        break;
      default:
        drawConeTent(ctx, { cx: 30, baseY: 52, rx: 17, h: 33, cloth: CLOTH.indigo, rand, door: 0.3 });
        drawGableTent(ctx, { fx: 76, fy: 58, a: 30, b: 20, h: 20, cloth: CLOTH.red, rand });
        drawRug(ctx, 22, 84, 16, 10, RUGS.blue);
        drawRug(ctx, 58, 86, 14, 9, RUGS.green);
        drawJar(ctx, 30, 74, 10, '#c98a52');
        drawCrate(ctx, 96, 82, 8);
        drawJar(ctx, 66, 80, 9, '#b97a4a');
        break;
    }
  },
});

export default camp;
