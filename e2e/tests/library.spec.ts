import { fileURLToPath } from 'node:url';
import { expect, test } from '../support/fixtures';

const SAMPLE_FILE = fileURLToPath(new URL('../../client/public/samples/aldoria.wondermap.json', import.meta.url));
const unique = (label: string) => `E2E ${label} ${Date.now().toString(36)}`;

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
