import { chromium } from 'playwright-core';

/** Starts a headless browser: the system's Edge or Chrome when there is one, else Playwright's own Chromium. */
export async function launchBrowser() {
  for (const channel of ['msedge', 'chrome', undefined]) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch {
      /* try the next one */
    }
  }
  throw new Error('No browser available. Install Edge/Chrome or run: npx playwright install chromium');
}
