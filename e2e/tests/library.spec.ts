import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '../support/fixtures';
import type { StoredMap } from '../support/library';

const sampleFile = (slug: string) => fileURLToPath(new URL(`../../client/public/samples/${slug}.wondermap.json`, import.meta.url));
const SAMPLE_FILE = sampleFile('aldoria');
const unique = (label: string) => `E2E ${label} ${Date.now().toString(36)}`;

/** The example maps written as code; the cards on the title screen are named after the slug. */
const GENERATED_EXAMPLES = [
  { slug: 'avatar', name: 'The Four Nations' },
  { slug: 'westeros', name: 'Westeros & Essos' },
  { slug: 'middle-earth', name: 'Middle-earth' },
] as const;

test('creates a world, finds it in the library and deletes it', async ({ page, editor, library }) => {
  const name = unique('Library');
  const id = await editor.createWorld({ name, preset: 'square', theme: 'parchment' });

  const stored = await library.saved(id);
  expect(stored).toMatchObject({ name, width: 2800, height: 2800, themeId: 'parchment' });

  await editor.leave();
  const card = page.getByTestId(`map-${id}`);
  await expect(card).toContainText(name);

  await card.getByTestId('delete-map').click();
  await page.getByTestId('confirm-yes').click();
  await expect(card).toHaveCount(0);
  expect(await library.exists(id)).toBe(false);
});

test('opens the sample world as a copy you can edit', async ({ page, editor, library }) => {
  await page.goto('/#/');
  await page.getByTestId('open-sample').click();
  const id = await editor.untilOpen();

  await expect(page.getByTestId('map-name')).toHaveValue('Aldoria');
  expect(await editor.things()).toBeGreaterThan(400);
  expect((await library.saved(id)).symbols.length).toBeGreaterThan(300);
});

test('shows every example map on the title screen with its picture', async ({ page }) => {
  await page.goto('/#/');
  for (const { slug, name } of [{ slug: 'aldoria', name: 'Aldoria' }, ...GENERATED_EXAMPLES]) {
    const card = page.getByTestId(`open-example-${slug}`);
    await card.scrollIntoViewIfNeeded();
    await expect(card).toContainText(name);
    const picture = card.locator('img');
    await expect
      .poll(() => picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { message: `the picture of ${name} should load` })
      .toBe(true);
  }
});

for (const { slug, name } of GENERATED_EXAMPLES) {
  test(`opens the example map ${name} as a copy you can edit`, async ({ page, editor, library }) => {
    const source = JSON.parse(readFileSync(sampleFile(slug), 'utf8')) as StoredMap;
    await page.goto('/#/');
    await page.getByTestId(`open-example-${slug}`).click();
    const id = await editor.untilOpen();

    // A copy: it has an id of its own, so opening an example again never overwrites an earlier copy.
    expect(id).not.toBe(source.id);
    await expect(page.getByTestId('map-name')).toHaveValue(name);
    expect(await editor.things()).toBe(source.symbols.length + source.labels.length + source.paths.length);
    expect(await editor.size()).toEqual({ width: source.width, height: source.height });
    const stored = await library.saved(id);
    expect(stored).toMatchObject({ name, themeId: source.themeId });
    expect(stored.symbols).toHaveLength(source.symbols.length);
  });
}

test('imports a project file as a new map', async ({ page, editor, library }) => {
  await page.goto('/#/');
  await page.getByTestId('import-input').setInputFiles(SAMPLE_FILE);
  const id = await editor.untilOpen();

  expect(await editor.things()).toBeGreaterThan(400);
  const stored = await library.saved(id);
  expect(stored.id).toBe(id);
  expect(stored.name).toBe('Aldoria');
});

test('tells you when the server cannot be reached', async ({ page, errors }) => {
  errors.allow(/ERR_FAILED|Failed to load resource/);
  await page.route('**/api/**', (route) => route.abort());
  await page.goto('/#/');
  await expect(page.getByTestId('offline')).toBeVisible();
});
