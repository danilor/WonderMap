import { getTheme } from '@wondermap/illustrations';
import type { MapDocument } from '../model/types';
import { viewRect } from './camera';
import type { Camera } from './camera';
import { drawFinish, drawObjects } from './scene';
import { TerrainRenderer } from './terrain/TerrainRenderer';

/** The size of the on-screen canvas in CSS px and its device pixel ratio. */
export interface Viewport {
  width: number;
  height: number;
  dpr: number;
}

export const WORKSPACE_COLOR = '#262b33';

/**
 * Draws the live editor view of a map: workspace, drop shadow, terrain, objects, labels and frame.
 * It owns the terrain chunk cache; everything else is drawn directly every frame.
 */
export class MapRenderer {
  readonly terrain = new TerrainRenderer();

  /** Number of terrain pictures that changed, used to know when a redraw is needed. */
  get revision(): number {
    return this.terrain.revision;
  }

  /** Draws one frame. Returns how many terrain chunks are still waiting to be painted. */
  draw(ctx: CanvasRenderingContext2D, doc: MapDocument, cam: Camera, vp: Viewport): number {
    const theme = getTheme(doc.themeId);
    const { width, height, dpr } = vp;
    const pixelScale = cam.zoom * dpr;
    const view = viewRect(cam, width, height);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = WORKSPACE_COLOR;
    ctx.fillRect(0, 0, width * dpr, height * dpr);
    ctx.setTransform(pixelScale, 0, 0, pixelScale, (width / 2 - cam.x * cam.zoom) * dpr, (height / 2 - cam.y * cam.zoom) * dpr);

    const mapInside = view.x0 >= 0 && view.y0 >= 0 && view.x1 <= doc.width && view.y1 <= doc.height;
    if (!mapInside) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 26 * dpr;
      ctx.shadowOffsetY = 6 * dpr;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, doc.width, doc.height);
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, doc.width, doc.height);
    ctx.clip();
    ctx.fillStyle = theme.sea.mid;
    ctx.fillRect(0, 0, doc.width, doc.height);

    this.terrain.sync({ layer: doc.terrain, settings: doc.settings, theme, seed: doc.seed });
    const pending = this.terrain.draw(ctx, view, pixelScale);
    const scene = { view, pixelScale, grid: doc.settings.grid };
    drawObjects(ctx, doc, theme, scene);
    drawFinish(ctx, doc, theme, scene);
    ctx.restore();
    return pending;
  }

  /** Paints waiting terrain chunks for up to `budgetMs`; `true` means more work remains. */
  pump(budgetMs: number): boolean {
    return this.terrain.pump(budgetMs);
  }

  dispose(): void {
    this.terrain.dispose();
  }
}
