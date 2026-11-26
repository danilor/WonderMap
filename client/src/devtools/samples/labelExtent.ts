import { labelStyleById } from '@wondermap/illustrations';
import type { ResolvedLabelStyle } from '@wondermap/illustrations';

/**
 * How wide a label will be, without a canvas to measure it with. Good enough to keep trees and mountains out from under a name.
 * The real measuring (with the real fonts) happens in the browser, see `preview.ts`.
 */

/** Average width of a letter in em: capitals of an engraved font are wide, lowercase italics narrow. */
const CAPITAL_EM = 0.78;
const ITALIC_EM = 0.46;
const LOWER_EM = 0.52;

/** Space above the baseline and below it, in em (the same numbers the engine uses for its label box). */
const ASCENT_EM = 0.82;
const DESCENT_EM = 0.28;

export interface LabelExtent {
  width: number;
  ascent: number;
  descent: number;
}

export function estimateLabel(text: string, style: ResolvedLabelStyle, size: number, extraSpacing = 0): LabelExtent {
  const letters = Array.from(text).length;
  const advance = style.uppercase ? CAPITAL_EM : style.italic ? ITALIC_EM : LOWER_EM;
  const width = letters * advance * size + Math.max(0, letters - 1) * (style.spacing + extraSpacing) * size;
  return { width, ascent: size * ASCENT_EM, descent: size * DESCENT_EM };
}

export function labelStyleOrThrow(id: string): ResolvedLabelStyle {
  const style = labelStyleById.get(id);
  if (!style) throw new Error(`Unknown label style "${id}"`);
  return style;
}
