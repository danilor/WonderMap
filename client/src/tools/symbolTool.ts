import { brushById, getTheme, symbolById } from '@wondermap/illustrations';
import type { ResolvedBrush, ResolvedSymbol } from '@wondermap/illustrations';
import { drawSymbol } from '../engine/sprites/spriteCache';
import { makeId } from '../model/document';
import { addSymbols, updateSymbols } from '../model/ops';
import { terrainAt } from '../model/terrainLayer';
import type { Point } from '../model/types';
import { useEditor } from '../store/editorStore';
import { invalidateOverlay } from './overlayBus';
import { brushCircle } from './overlayDraw';
import { ScatterSession } from './scatter';
import type { Tool } from './types';

interface Roll {
  variant: number;
  scaleMul: number;
  flip: boolean;
}

function roll(def: ResolvedSymbol, o: { randomVariant: boolean; randomScale: boolean; randomFlip: boolean }): Roll {
  return {
    variant: o.randomVariant ? Math.floor(Math.random() * def.variants) : 0,
    scaleMul: o.randomScale ? 0.88 + Math.random() * 0.28 : 1,
    flip: o.randomFlip && Math.random() < 0.5,
  };
}

/** Stamps single symbols (drag to fine-tune the position before letting go) or sprays a scatter brush. */
export function createSymbolTool(): Tool {
  let hover: Point | null = null;
  let next: Roll & { forId: string } = { variant: 0, scaleMul: 1, flip: false, forId: '' };
  let placedId: string | null = null;
  let session: ScatterSession | null = null;
  let last: Point | null = null;

  const currentBrush = (): ResolvedBrush | undefined => {
    const id = useEditor.getState().options.symbol.brush;
    return id ? brushById.get(id) : undefined;
  };

  const currentDef = (): ResolvedSymbol | undefined => symbolById.get(useEditor.getState().options.symbol.id);

  const ensureRoll = (def: ResolvedSymbol) => {
    if (next.forId !== def.id) next = { ...roll(def, useEditor.getState().options.symbol), forId: def.id };
  };

  const spray = (x: number, y: number) => {
    if (!session) return;
    const s = useEditor.getState();
    const fresh = session.fill(x, y, s.options.symbol.radius);
    if (fresh.length) s.update(addSymbols(s.doc, fresh));
  };

  const sweep = (from: Point, to: Point) => {
    const radius = useEditor.getState().options.symbol.radius;
    const dist = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const steps = Math.max(1, Math.ceil(dist / Math.max(6, radius * 0.4)));
    for (let i = 1; i <= steps; i++) spray(from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps);
  };

  const abort = () => {
    if (placedId || session) useEditor.getState().end(false);
    placedId = null;
    session = null;
    last = null;
  };

  return {
    cursor: () => (currentBrush() ? 'none' : 'crosshair'),

    down(p) {
      const s = useEditor.getState();
      const { doc } = s;
      if (p.x < 0 || p.y < 0 || p.x > doc.width || p.y > doc.height) return;
      const brush = currentBrush();
      if (brush) {
        s.begin();
        session = new ScatterSession(
          {
            brush,
            scale: s.options.symbol.scale,
            randomScale: s.options.symbol.randomScale,
            randomFlip: s.options.symbol.randomFlip,
            randomVariant: s.options.symbol.randomVariant,
            width: doc.width,
            height: doc.height,
            landAt: (x, y) => terrainAt(useEditor.getState().doc.terrain, x, y) !== null,
          },
          doc.symbols,
        );
        last = [p.x, p.y];
        spray(p.x, p.y);
        return;
      }
      const def = currentDef();
      if (!def) return;
      ensureRoll(def);
      s.begin();
      placedId = makeId();
      s.update(
        addSymbols(doc, [
          {
            id: placedId,
            asset: def.id,
            x: p.x,
            y: p.y,
            scale: s.options.symbol.scale * next.scaleMul,
            rotation: 0,
            flip: next.flip,
            variant: next.variant,
          },
        ]),
      );
    },

    move(p, pressed) {
      hover = [p.x, p.y];
      if (pressed && session && last) {
        const to: Point = [p.x, p.y];
        sweep(last, to);
        last = to;
      } else if (pressed && placedId) {
        const s = useEditor.getState();
        s.update(updateSymbols(s.doc, [placedId], { x: p.x, y: p.y }));
      }
      invalidateOverlay();
    },

    up() {
      const stamped = placedId !== null;
      if (placedId || session) useEditor.getState().end(true);
      placedId = null;
      session = null;
      last = null;
      if (stamped) next.forId = '';
      invalidateOverlay();
    },

    cancel: abort,

    overlay(ctx, o) {
      const at = hover ?? o.hover;
      if (!at) return;
      const { symbol } = useEditor.getState().options;
      if (currentBrush()) {
        brushCircle(ctx, at[0], at[1], symbol.radius, o.zoom);
        return;
      }
      const def = currentDef();
      if (!def || placedId) return;
      ensureRoll(def);
      ctx.save();
      ctx.globalAlpha = 0.65;
      drawSymbol(
        ctx,
        def,
        getTheme(o.doc.themeId),
        { x: at[0], y: at[1], scale: symbol.scale * next.scaleMul, rotation: 0, flip: next.flip, variant: next.variant },
        o.zoom * o.dpr,
      );
      ctx.restore();
    },
  };
}
