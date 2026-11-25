import { vi } from 'vitest';

/**
 * Stands in for the browser's `document` in Node tests. The engine only needs it for a canvas that can measure text,
 * so every character is made `0.5 × font size` wide: labels then scale with their size just like real text.
 * Pair with `vi.unstubAllGlobals()` in `afterAll`.
 */
export function stubTextMeasuring(): void {
  const ctx = {
    font: '',
    letterSpacing: '0px',
    measureText(text: string) {
      const size = Number(/(\d+(?:\.\d+)?)px/.exec(ctx.font)?.[1] ?? 16);
      return { width: Array.from(text).length * size * 0.5 };
    },
  };
  vi.stubGlobal('document', { createElement: () => ({ width: 1, height: 1, getContext: () => ctx }) });
}
