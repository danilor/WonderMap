/**
 * Canvas creation seam. In the browser this uses `document.createElement('canvas')`.
 * Tests (Node, no DOM) can swap the factory with `setCanvasFactory`.
 */

export type CanvasFactory = (width: number, height: number) => HTMLCanvasElement;

let factory: CanvasFactory = (width, height) => {
  if (typeof document === 'undefined') {
    throw new Error('No DOM available: call setCanvasFactory() to provide a canvas implementation.');
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
};

export function setCanvasFactory(next: CanvasFactory): void {
  factory = next;
}

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  return factory(width, height);
}

/** Get a 2D context or throw (canvas creation can fail when memory is exhausted). */
export function context2d(canvas: HTMLCanvasElement, readback = false): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', readback ? { willReadFrequently: true } : undefined);
  if (!ctx) throw new Error('Could not create a 2D canvas context (out of memory?)');
  return ctx;
}
