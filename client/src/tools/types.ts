import type { MapTheme } from '@wondermap/illustrations';
import type { MapDocument, Point } from '../model/types';

/** What the map view tells a tool about a pointer event. Coordinates are in map px unless noted. */
export interface PointerInfo {
  x: number;
  y: number;
  /** Position inside the canvas in CSS px. */
  sx: number;
  sy: number;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  /** Map px per CSS px at the current zoom (1 / zoom). */
  px: number;
}

export interface OverlayInfo {
  doc: MapDocument;
  theme: MapTheme;
  zoom: number;
  dpr: number;
  /** Last pointer position over the map, or `null` when it is outside. */
  hover: Point | null;
}

/**
 * A tool turns pointer input into document edits through the editor store.
 * Tools are plain objects that keep their gesture state in a closure; see `tools/index.ts`.
 */
export interface Tool {
  /** CSS cursor while the tool is active. */
  cursor(): string;
  down?(p: PointerInfo): void;
  move?(p: PointerInfo, pressed: boolean): void;
  up?(p: PointerInfo): void;
  doubleClick?(p: PointerInfo): void;
  /** Return `true` when the key was used. */
  key?(e: KeyboardEvent): boolean;
  /** The gesture was interrupted (Escape, tool switch, lost pointer). */
  cancel?(): void;
  /** Draws hover cursors and gesture previews. `ctx` is in map space. */
  overlay?(ctx: CanvasRenderingContext2D, o: OverlayInfo): void;
}
