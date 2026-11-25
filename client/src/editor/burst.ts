import { useEditor } from '../store/editorStore';
import type { MapDocument } from '../model/types';

/**
 * Groups rapid edits (dragging a slider, typing a number) into a single undo step.
 * The first call of a burst starts a store gesture; the gesture ends after a short quiet period, or as soon as the user
 * touches anything else.
 */

const QUIET_MS = 450;
let timer = 0;
let open = false;

export function flushBurst(): void {
  window.clearTimeout(timer);
  if (!open) return;
  open = false;
  useEditor.getState().end();
}

/** Applies `change` to the current document as part of the running burst. */
export function burstEdit(change: (doc: MapDocument) => MapDocument): void {
  const s = useEditor.getState();
  if (!open) {
    s.begin();
    open = true;
  }
  s.update(change(s.doc));
  window.clearTimeout(timer);
  timer = window.setTimeout(flushBurst, QUIET_MS);
}

// A click anywhere ends the running burst first, so it can never overlap with a tool gesture.
if (typeof window !== 'undefined') window.addEventListener('pointerdown', flushBurst, true);
