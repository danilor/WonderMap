import type { Point } from '../model/types';

/**
 * Small mutable state shared by the parts of the map view (rendering, input, overlays).
 * It lives outside React on purpose: it changes on every pointer move and must not re-render components.
 */
export interface ViewState {
  /** Pointer position over the map in map px, or `null` when the pointer is outside. */
  hover: Point | null;
  /** The map picture needs repainting. */
  dirty: boolean;
  /** The tool overlay needs repainting. */
  overlayDirty: boolean;
  spaceDown: boolean;
  panning: boolean;
}

export function createViewState(): ViewState {
  return { hover: null, dirty: true, overlayDirty: true, spaceDown: false, panning: false };
}
