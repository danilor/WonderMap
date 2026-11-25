import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import type { Library } from './library';

export type ToolName = 'select' | 'pan' | 'terrain' | 'symbol' | 'path' | 'label' | 'eraser';

/** A spot on the map view as fractions (0..1) of its width and height. The map is centred, so the middle part is always map. */
export type Spot = readonly [fx: number, fy: number];

export interface NewWorld {
  name: string;
  preset?: 'region' | 'world' | 'continent' | 'square';
  theme?: 'wonder' | 'parchment';
}

/** A zig-zag stroke that covers a rectangle of the view (a wide brush leaves no gaps between the rows). */
export function zigzag([x0, x1]: readonly [number, number], [y0, y1]: readonly [number, number], rows: number): Spot[] {
  const stroke: Spot[] = [];
  for (let i = 0; i < rows; i++) {
    const y = rows === 1 ? y0 : y0 + ((y1 - y0) * i) / (rows - 1);
    const [from, to] = i % 2 === 0 ? [x0, x1] : [x1, x0];
    stroke.push([from, y], [to, y]);
  }
  return stroke;
}

/** Drives the editor the way a person does: pick a tool and an item, then click or drag on the map. */
export class Editor {
  readonly page: Page;
  private readonly library: Library;

  constructor(page: Page, library: Library) {
    this.page = page;
    this.library = library;
  }

  get saveState(): Locator {
    return this.page.getByTestId('save-state');
  }

  get statusBar(): Locator {
    return this.page.getByTestId('statusbar');
  }

  /** Creates a world through the "New world" dialog and returns its id once the editor shows it. */
  async createWorld({ name, preset, theme }: NewWorld): Promise<string> {
    const { page } = this;
    await page.goto('/#/');
    await page.getByTestId('new-world').click();
    await page.getByTestId('new-name').fill(name);
    if (preset) await page.getByTestId(`preset-${preset}`).click();
    if (theme) await page.getByTestId(`new-theme-${theme}`).click();
    await page.getByTestId('new-create').click();
    return this.untilOpen();
  }

  /** Waits until the editor shows a map and returns its id. The map is deleted when the test ends. */
  async untilOpen(): Promise<string> {
    await this.page.waitForURL(/#\/editor\//);
    await expect(this.page.getByTestId('map-canvas')).toBeVisible();
    await expect(this.statusBar).toContainText('px');
    const id = this.page.url().split('/editor/')[1]!.split(/[/?#]/)[0]!;
    return this.library.track(id);
  }

  /** The number in "N things" of the status bar. */
  async things(): Promise<number> {
    return Number(/(\d+)\s+things/.exec(await this.statusBar.innerText())?.[1] ?? Number.NaN);
  }

  /** The map size in "W × H px" of the status bar. */
  async size(): Promise<{ width: number; height: number }> {
    const match = /(\d+)\s×\s(\d+)\spx/.exec(await this.statusBar.innerText());
    return { width: Number(match?.[1] ?? Number.NaN), height: Number(match?.[2] ?? Number.NaN) };
  }

  async tool(name: ToolName): Promise<void> {
    const button = this.page.getByTestId(`tool-${name}`);
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }

  async click([fx, fy]: Spot): Promise<void> {
    const [x, y] = await this.pixel(fx, fy);
    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.up();
  }

  async drag(stroke: readonly Spot[], steps = 6): Promise<void> {
    const { mouse } = this.page;
    const [first, ...rest] = stroke;
    if (!first) return;
    const [x0, y0] = await this.pixel(...first);
    await mouse.move(x0, y0);
    await mouse.down();
    for (const spot of rest) {
      const [x, y] = await this.pixel(...spot);
      await mouse.move(x, y, { steps });
    }
    await mouse.up();
  }

  async paintTerrain(terrain: string, stroke: readonly Spot[]): Promise<void> {
    await this.tool('terrain');
    await this.page.getByTestId(`terrain-${terrain}`).click();
    await this.drag(stroke);
  }

  /** Puts one symbol on the map. */
  async stamp(category: string, symbol: string, at: Spot): Promise<void> {
    await this.tool('symbol');
    await this.page.getByTestId(`category-${category}`).click();
    await this.page.getByTestId(`symbol-${symbol}`).click();
    await this.click(at);
  }

  /** Sprinkles many symbols along a stroke with a scatter brush (a forest, a mountain range…). */
  async scatter(category: string, brush: string, stroke: readonly Spot[]): Promise<void> {
    await this.tool('symbol');
    await this.page.getByTestId(`category-${category}`).click();
    await this.page.getByTestId(`brush-${brush}`).click();
    await this.drag(stroke, 10);
  }

  async draw(pathStyle: string, stroke: readonly Spot[]): Promise<void> {
    await this.tool('path');
    await this.page.getByTestId(`path-${pathStyle}`).click();
    await this.drag(stroke, 8);
  }

  async label(style: string, text: string, at: Spot): Promise<void> {
    await this.tool('label');
    await this.page.getByTestId(`label-${style}`).click();
    await this.click(at);
    const input = this.page.locator('input.label-editor');
    await expect(input).toBeFocused();
    await input.fill(text);
    await input.press('Enter');
    await expect(input).toBeHidden();
  }

  /** Opens an entry of the "More" menu. */
  async more(item: string | RegExp): Promise<void> {
    await this.page.getByTestId('open-more').click();
    await this.page.locator('.dropdown-menu').getByText(item).click();
  }

  /** Goes back to the library of maps. */
  async leave(): Promise<void> {
    await this.page.getByTestId('open-more').click();
    await this.page.getByTestId('back-to-library').click();
    await expect(this.page.getByTestId('map-grid')).toBeVisible();
  }

  /** Waits until the editor reports that everything is on the server. */
  async untilSaved(): Promise<void> {
    await expect(this.saveState).toHaveAttribute('data-status', 'saved', { timeout: 20_000 });
  }

  private async pixel(fx: number, fy: number): Promise<[number, number]> {
    const box = await this.page.getByTestId('map-view').boundingBox();
    if (!box) throw new Error('The map view is not visible');
    return [box.x + box.width * fx, box.y + box.height * fy];
  }
}
