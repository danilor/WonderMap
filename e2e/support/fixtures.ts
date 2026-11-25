import { expect, test as base } from '@playwright/test';
import { Editor } from './editor';
import { Library } from './library';

/** Browser errors fail a test unless the test says it expects them. */
export interface ErrorWatch {
  allow(pattern: RegExp): void;
}

export const test = base.extend<{ library: Library; editor: Editor; errors: ErrorWatch }>({
  errors: [
    async ({ page }, provide) => {
      const seen: string[] = [];
      const allowed: RegExp[] = [];
      page.on('pageerror', (error) => seen.push(`pageerror: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() === 'error') seen.push(`console.error: ${message.text()}`);
      });
      await provide({ allow: (pattern) => void allowed.push(pattern) });
      expect(
        seen.filter((line) => !allowed.some((pattern) => pattern.test(line))),
        'the browser console should stay free of errors',
      ).toEqual([]);
    },
    { auto: true },
  ],

  library: async ({ request }, provide) => {
    const library = new Library(request);
    await provide(library);
    await library.cleanup();
  },

  editor: async ({ page, library }, provide) => {
    const editor = new Editor(page, library);
    await provide(editor);
    // Nothing may be left unsaved: a late autosave would bring a deleted map back.
    if ((await editor.saveState.count()) > 0) await editor.untilSaved();
  },
});

export { expect };
