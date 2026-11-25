/**
 * Margin (design units) the rasterizer keeps around a symbol's design box `[0,w] x [0,h]`.
 *
 * Strokes, soft shadows and rough edges that spill a little outside the box are still painted instead of being cut
 * flat. Art should still aim to stay inside the box (bounds, selection and the stamp footprint are the box); anything
 * that goes beyond even this margin is reported by `npm run check:art`.
 */
export function overdraw(size: readonly [number, number]): number {
  return Math.ceil(Math.max(6, Math.max(size[0], size[1]) * 0.08));
}
