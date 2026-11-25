import { readFileSync } from 'node:fs';
import { expect, test } from '../support/fixtures';
import { zigzag } from '../support/editor';
import { pngSize } from '../support/png';

const unique = (label: string) => `E2E ${label} ${Date.now().toString(36)}`;
const island = zigzag([0.36, 0.64], [0.4, 0.6], 6);

test('paints a world, saves it by itself and finds it again after a reload', async ({ page, editor, library }) => {
  const name = unique('Journey');
  const id = await editor.createWorld({ name, preset: 'region' });
  expect(await editor.things()).toBe(0);

  await editor.paintTerrain('grass', island);
  await editor.paintTerrain('stone', zigzag([0.54, 0.6], [0.44, 0.52], 3));
  await editor.scatter('forests', 'forest.oak', zigzag([0.38, 0.5], [0.52, 0.58], 2));
  await editor.stamp('settlements', 'settlement.town', [0.44, 0.46]);
  await editor.stamp('settlements', 'castle.keep', [0.56, 0.5]);
  await editor.label('town', 'Oakvale', [0.44, 0.42]);
  await editor.draw('river', [[0.52, 0.36], [0.5, 0.48], [0.53, 0.62]]);

  const map = await library.saved(id, (m) => m.labels.length === 1 && m.paths.length === 1 && m.symbols.some((s) => s.asset === 'castle.keep'));
  expect(map.name).toBe(name);
  expect(map.terrain.ids).toEqual(expect.arrayContaining(['grass', 'stone']));
  expect(map.symbols.filter((s) => s.asset === 'settlement.town')).toHaveLength(1);
  expect(map.symbols.filter((s) => s.asset === 'castle.keep')).toHaveLength(1);
  expect(map.symbols.length).toBeGreaterThan(10);
  expect(map.labels).toMatchObject([{ text: 'Oakvale', style: 'town' }]);
  expect(map.paths).toMatchObject([{ style: 'river' }]);
  expect(map.paths[0]!.points.length).toBeGreaterThan(2);

  const things = map.symbols.length + map.labels.length + map.paths.length;
  expect(await editor.things()).toBe(things);
  await editor.untilSaved();

  await page.reload();
  await editor.untilOpen();
  await expect(page.getByTestId('map-name')).toHaveValue(name);
  expect(await editor.things()).toBe(things);
});

test('undo and redo walk back and forth through the edits', async ({ page, editor }) => {
  await editor.createWorld({ name: unique('Undo') });
  await editor.stamp('settlements', 'settlement.town', [0.45, 0.5]);
  await editor.stamp('settlements', 'castle.keep', [0.55, 0.5]);
  await expect.poll(() => editor.things()).toBe(2);

  await page.keyboard.press('Control+z');
  await expect.poll(() => editor.things()).toBe(1);
  await page.keyboard.press('Control+z');
  await expect.poll(() => editor.things()).toBe(0);
  await expect(page.getByTestId('undo')).toBeDisabled();

  await page.keyboard.press('Control+y');
  await page.keyboard.press('Control+y');
  await expect.poll(() => editor.things()).toBe(2);
  await expect(page.getByTestId('redo')).toBeDisabled();
});

test('selects things with a box and deletes them', async ({ page, editor }) => {
  await editor.createWorld({ name: unique('Select') });
  await editor.stamp('settlements', 'castle.keep', [0.5, 0.5]);
  await editor.label('town', 'Rookhold', [0.5, 0.42]);
  await expect.poll(() => editor.things()).toBe(2);

  await editor.tool('select');
  await editor.drag([[0.32, 0.3], [0.68, 0.7]]);
  await expect(page.getByTestId('inspector')).toBeVisible();
  await page.keyboard.press('Delete');
  await expect.poll(() => editor.things()).toBe(0);

  await page.keyboard.press('Control+z');
  await expect.poll(() => editor.things()).toBe(2);
});

test('every tool can be picked with its hotkey', async ({ page, editor }) => {
  await editor.createWorld({ name: unique('Keys') });
  const hotkeys = [['b', 'terrain'], ['s', 'symbol'], ['p', 'path'], ['t', 'label'], ['e', 'eraser'], ['v', 'select'], ['h', 'pan']] as const;
  for (const [key, tool] of hotkeys) {
    await page.keyboard.press(key);
    await expect(page.getByTestId(`tool-${tool}`)).toHaveAttribute('aria-pressed', 'true');
  }
});

test('the zoom buttons zoom in and show the whole map again', async ({ page, editor }) => {
  await editor.createWorld({ name: unique('Zoom') });
  const readout = page.getByTestId('zoom-readout');
  await page.getByTestId('zoom-fit').click();
  const whole = await readout.innerText();

  await page.getByTestId('zoom-in').click();
  await page.getByTestId('zoom-in').click();
  await expect(readout).not.toHaveText(whole);

  await page.getByTestId('zoom-fit').click();
  await expect(readout).toHaveText(whole);
});

test('adds canvas around the map, and undo takes it away again', async ({ page, editor, library }) => {
  const id = await editor.createWorld({ name: unique('Expand'), preset: 'region' });
  expect(await editor.size()).toEqual({ width: 2400, height: 1600 });

  await page.getByTestId('open-expand').click();
  await page.getByTestId('expand-top').fill('300');
  await page.getByTestId('expand-right').fill('200');
  await page.getByTestId('expand-apply').click();
  await expect.poll(() => editor.size()).toEqual({ width: 2600, height: 1900 });

  const map = await library.saved(id, (m) => m.height === 1900);
  expect(map.width).toBe(2600);

  await page.keyboard.press('Control+z');
  await expect.poll(() => editor.size()).toEqual({ width: 2400, height: 1600 });
});

test('renames the map and switches its style', async ({ page, editor, library }) => {
  const id = await editor.createWorld({ name: unique('Style') });
  const renamed = unique('Renamed');
  await page.getByTestId('map-name').fill(renamed);
  await page.getByTestId('map-name').press('Enter');

  await page.getByTestId('open-settings').click();
  await page.getByTestId('theme-parchment').click();
  await page.keyboard.press('Escape');

  const map = await library.saved(id, (m) => m.name === renamed && m.themeId === 'parchment');
  expect(map.themeId).toBe('parchment');
});

test('cancels a rename with Escape and brings the old name back with undo', async ({ page, editor }) => {
  const original = unique('Names');
  await editor.createWorld({ name: original });
  const nameBox = page.getByTestId('map-name');

  await nameBox.fill('Never kept');
  await nameBox.press('Escape');
  await expect(nameBox).toHaveValue(original);
  await expect(page.getByTestId('undo')).toBeDisabled();

  await nameBox.fill('Kept for a moment');
  await nameBox.press('Enter');
  await expect(nameBox).toHaveValue('Kept for a moment');

  await page.keyboard.press('Control+z');
  await expect(nameBox).toHaveValue(original);
});

test('exports the whole map as a PNG picture', async ({ page, editor }) => {
  await editor.createWorld({ name: unique('Export'), preset: 'region' });
  await editor.paintTerrain('grass', island);

  await page.getByTestId('open-export').click();
  await page.getByTestId('export-scale-0.5').click();
  const download = page.waitForEvent('download');
  await page.getByTestId('export-run').click();
  const file = await download;

  expect(file.suggestedFilename()).toMatch(/\.png$/);
  expect(pngSize(readFileSync(await file.path()))).toEqual({ width: 1200, height: 800 });
});

test('downloads the project file with everything in it', async ({ page, editor }) => {
  const name = unique('Project');
  await editor.createWorld({ name });
  await editor.stamp('settlements', 'castle.keep', [0.5, 0.5]);
  await editor.label('region', 'The Reach', [0.5, 0.4]);

  const download = page.waitForEvent('download');
  await editor.more('Download project file');
  const file = await download;

  expect(file.suggestedFilename()).toMatch(/\.wondermap\.json$/);
  const project = JSON.parse(readFileSync(await file.path(), 'utf8')) as { name: string; kind: string; symbols: unknown[]; labels: unknown[] };
  expect(project).toMatchObject({ name, kind: 'world' });
  expect(project.symbols).toHaveLength(1);
  expect(project.labels).toHaveLength(1);
});

test('keeps your work when the server cannot be reached and saves it once it is back', async ({ page, editor, library, errors }) => {
  errors.allow(/ERR_FAILED|Failed to load resource/);
  const id = await editor.createWorld({ name: unique('Offline') });
  await editor.untilSaved();

  await page.route('**/api/**', (route) => route.abort());
  await editor.stamp('settlements', 'settlement.town', [0.5, 0.5]);
  await expect(editor.saveState).toHaveAttribute('data-status', 'error', { timeout: 15_000 });
  await expect(page.getByTestId('save-error')).toBeVisible();
  expect(await editor.things()).toBe(1);

  await page.unroute('**/api/**');
  await editor.untilSaved();
  await library.saved(id, (m) => m.symbols.length === 1);
});
