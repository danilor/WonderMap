/** Tools and panels ask the map view to repaint its overlay (cursor, previews, selection boxes). */

const listeners = new Set<() => void>();

export function invalidateOverlay(): void {
  listeners.forEach((fn) => fn());
}

export function onOverlayInvalidated(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
