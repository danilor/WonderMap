import { mix, rgba } from '../kit/colors';
import { linearGradient, shades } from '../kit/draw';
import type { Vec2 } from '../kit/types';
import { drawFlag } from './building';
import { drawPrism, drawRoof } from './settle-castle';
import type { RoofSpec } from './settle-castle';
import { INK, WOOD, inFace, shadowOf } from './settle-geom';
import type { Stage } from './settle-geom';

/**
 * Timber buildings for the dimetric grid: palisade forts, wooden towers, sheds, huts, warehouses.
 * Everything is registered in the stage's scene like the stone pieces of `settle-castle`.
 */

export interface TimberOpts {
  u: number;
  v: number;
  a: number;
  b: number;
  h: number;
  /** Wall colour (planks by default, plaster when `frame` is set). */
  wood?: string;
  roof?: RoofSpec;
  /** Door on the lit (`u`) or shaded (`v`) face. `at` is the position along the face, 0..1. */
  door?: { face: 'u' | 'v'; w?: number; h?: number; at?: number };
  /** Small windows per face. */
  windows?: number;
  glow?: string;
  planks?: 'vertical' | 'horizontal';
  /** Dark timber frame over plaster walls. */
  frame?: string;
  bias?: number;
  noShadow?: boolean;
  flag?: string;
}

export function addTimberBox(stage: Stage, o: TimberOpts): void {
  const { ctx, iso, scene } = stage;
  const { u, v, a, b, h } = o;
  const wood = o.wood ?? WOOD.base;
  const poly: Vec2[] = [[u, v], [u + a, v], [u + a, v + b], [u, v + b]];
  const roofH = o.roof ? o.roof.h : 0;
  if (!o.noShadow) scene.shadow(shadowOf(poly.map((g): Vec2 => iso(g[0], g[1])), h + roofH * 0.6, 0.5));
  scene.add(u + v + (a + b) / 2 + (o.bias ?? 0), () => {
    const tones = shades(wood);
    const res = drawPrism(ctx, iso, { poly, h, stone: wood, tones, top: o.roof ? false : mix(tones.highlight, tones.light, 0.5) });
    for (const f of res.faces) {
      const onV = Math.abs(f.a[1] - f.b[1]) < 1e-6;
      inFace(ctx, f.frame, () => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, f.len, h);
        ctx.clip();
        if (o.frame) {
          const beam = o.frame;
          ctx.strokeStyle = beam;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          const cols = Math.max(1, Math.round(f.len / 7));
          for (let c = 0; c <= cols; c++) {
            ctx.moveTo((f.len * c) / cols, 0);
            ctx.lineTo((f.len * c) / cols, h);
          }
          ctx.moveTo(0, h * 0.5);
          ctx.lineTo(f.len, h * 0.5);
          ctx.moveTo(0, h - 0.5);
          ctx.lineTo(f.len, h - 0.5);
          for (let c = 0; c < cols; c++) {
            ctx.moveTo((f.len * c) / cols, 0);
            ctx.lineTo((f.len * (c + 1)) / cols, h * 0.5);
          }
          ctx.stroke();
        } else if ((o.planks ?? 'vertical') === 'vertical') {
          ctx.lineWidth = 0.6;
          for (let x = 1.6; x < f.len; x += 2.6) {
            ctx.strokeStyle = rgba(tones.deep, 0.5);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
            ctx.strokeStyle = rgba(tones.highlight, 0.16);
            ctx.beginPath();
            ctx.moveTo(x + 0.8, 0);
            ctx.lineTo(x + 0.8, h);
            ctx.stroke();
          }
        } else {
          ctx.lineWidth = 0.6;
          ctx.strokeStyle = rgba(tones.deep, 0.5);
          ctx.beginPath();
          for (let z = 2.4; z < h; z += 2.8) {
            ctx.moveTo(0, z);
            ctx.lineTo(f.len, z);
          }
          ctx.stroke();
        }
        ctx.fillStyle = linearGradient(ctx, 0, 0, 0, Math.max(2, h * 0.5), [rgba('#1d160c', 0.3), rgba('#1d160c', 0)]);
        ctx.fillRect(0, 0, f.len, Math.max(2, h * 0.5));
        ctx.restore();
        const hasDoor = !!o.door && ((o.door.face === 'v' && onV) || (o.door.face === 'u' && !onV));
        if (hasDoor) {
          const dw = o.door!.w ?? 4.6;
          const dh = Math.min(o.door!.h ?? 7.4, h - 1);
          const dx = f.len * (o.door!.at ?? 0.5);
          ctx.fillStyle = tones.deep;
          ctx.strokeStyle = INK;
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.rect(dx - dw / 2, 0, dw, dh);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = rgba(tones.highlight, 0.28);
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(dx, 0.4);
          ctx.lineTo(dx, dh - 0.4);
          ctx.stroke();
        }
        const nWin = o.windows ?? 0;
        for (let k = 0; k < nWin; k++) {
          const wx = (f.len * (k + 0.5)) / nWin;
          if (hasDoor && Math.abs(wx - f.len * (o.door!.at ?? 0.5)) < (o.door!.w ?? 4.6) * 0.9 + 1.8 && h < 16) continue;
          const wz = Math.min(h - 3.8, Math.max(h * 0.52, 4.4));
          if (wz < 2) continue;
          ctx.fillStyle = o.glow ?? '#2b2118';
          ctx.strokeStyle = INK;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.rect(wx - 1.3, wz, 2.6, 3);
          ctx.fill();
          ctx.stroke();
        }
      });
    }
    if (o.roof) drawRoof(ctx, iso, o, o.roof, tones);
    if (o.flag) {
      const [fx, fy] = iso(u + a / 2, v + b / 2, h + roofH);
      drawFlag(ctx, fx, fy, 10, o.flag, INK, 1);
    }
  });
}
