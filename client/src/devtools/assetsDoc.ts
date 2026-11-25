import {
  DEFAULT_THEME_ID,
  brushesInCategory,
  categories,
  fontList,
  frames,
  labelStyles,
  pathStyles,
  symbolById,
  symbolsInCategory,
  terrains,
} from '@wondermap/illustrations';
import type { FontDef, ResolvedBrush, ResolvedLabelStyle, ResolvedPathStyle, ResolvedSymbol, ResolvedTerrain } from '@wondermap/illustrations';
import { DISPLAY_WIDTH, assetFile, orderedThemes } from './assetCatalog';
import type { AssetEntry } from './assetCatalog';

/**
 * Writes ASSETS.md: pure text, built from the illustrations catalog, so it needs no browser and a unit test can compare
 * the committed file with it. The pictures it points to are drawn by `assetImages.ts` (`npm run assets`).
 */

/** How the file tells its readers (and the tests) which version of the art its pictures show. */
export const ART_HASH_PATTERN = /<!-- art-hash: ([0-9a-f]{64}) -->/;

const SYMBOL_COLUMNS = 5;
const WIDE_COLUMNS = 3;
const THEME_COLUMNS = 2;
const BRUSH_NAMES_SHOWN = 4;

/** GitHub's rule for the anchor of a heading (without its numbering of duplicates). */
export function headingSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s/g, '-');
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const px = (n: number) => `${Math.round(n)} px`;

interface Card {
  entry: AssetEntry;
  name: string;
  id: string;
  /** Lines under the id, already HTML-safe. */
  details?: string[];
}

function cardCell(card: Card, widthPercent: number): string {
  const width = DISPLAY_WIDTH[card.entry.kind];
  const lines = [
    `<img src="${assetFile(card.entry)}" width="${width}" alt="${escapeHtml(card.name)}">`,
    `<b>${escapeHtml(card.name)}</b>`,
    `<sub><code>${escapeHtml(card.id)}</code></sub>`,
    ...(card.details ?? []).map((line) => `<sub>${line}</sub>`),
  ];
  return `<td align="center" valign="top" width="${widthPercent}%">${lines.join('<br>')}</td>`;
}

/** HTML table with `columns` pictures per row, all columns equally wide. Blank lines would end the table in Markdown, so there are none. */
function grid(cards: readonly Card[], columns: number): string {
  const widthPercent = Math.floor(100 / columns);
  const rows: string[] = [];
  for (let i = 0; i < cards.length; i += columns) {
    rows.push(`<tr>\n${cards.slice(i, i + columns).map((card) => cardCell(card, widthPercent)).join('\n')}\n</tr>`);
  }
  return `<table>\n${rows.join('\n')}\n</table>`;
}

/* ------------------------------------------------------------------------------------------- */
/* Captions                                                                                     */
/* ------------------------------------------------------------------------------------------- */

const terrainCard = (t: ResolvedTerrain): Card => ({
  entry: { kind: 'terrain', id: t.id },
  name: t.name,
  id: t.id,
  details: t.blurb ? [escapeHtml(t.blurb)] : [],
});

const symbolCard = (s: ResolvedSymbol): Card => ({
  entry: { kind: 'symbol', id: s.id },
  name: s.name,
  id: s.id,
  details: [`${s.size[0]} × ${s.size[1]} px · ${plural(s.variants, 'variant')}`],
});

function brushCard(b: ResolvedBrush): Card {
  const names = [...b.items]
    .sort((x, y) => y.weight - x.weight)
    .map((item) => symbolById.get(item.symbol)?.name ?? item.symbol);
  const shown = names.slice(0, BRUSH_NAMES_SHOWN).join(', ');
  const more = names.length > BRUSH_NAMES_SHOWN ? ` +${names.length - BRUSH_NAMES_SHOWN} more` : '';
  return {
    entry: { kind: 'brush', id: b.id },
    name: b.name,
    id: b.id,
    details: [`Paints ${escapeHtml(shown)}${more}`, `spacing ${px(b.spacing)} · size ×${b.scale[0]}–${b.scale[1]}`],
  };
}

const pathCard = (p: ResolvedPathStyle): Card => ({
  entry: { kind: 'path', id: p.id },
  name: p.name,
  id: p.id,
  details: [
    `width ${px(p.width)} (${p.minWidth}–${p.maxWidth})${p.taper ? ' · widens downstream' : ''}`,
    ...(p.blurb ? [escapeHtml(p.blurb)] : []),
  ],
});

function labelCard(l: ResolvedLabelStyle): Card {
  const font = fontList.find((f) => f.id === l.font);
  const traits = [l.weight >= 600 ? 'bold' : '', l.italic ? 'italic' : '', l.uppercase ? 'capitals' : ''].filter(Boolean);
  return {
    entry: { kind: 'label', id: l.id },
    name: l.name,
    id: l.id,
    details: [`${escapeHtml(font?.name ?? l.font)} · ${px(l.size)}${traits.length ? ` · ${traits.join(' · ')}` : ''}`],
  };
}

const fontCard = (f: FontDef): Card => ({
  entry: { kind: 'font', id: f.id },
  name: f.name,
  id: f.id,
  details: [`weights ${f.weights.join(', ')} · ${f.styles.join(' and ')}`],
});

/* ------------------------------------------------------------------------------------------- */
/* The document                                                                                 */
/* ------------------------------------------------------------------------------------------- */

/** Markdown (LF newlines, one trailing newline) of the whole catalog. `artHash` is the fingerprint of the art the pictures show. */
export function buildAssetsDoc(artHash: string): string {
  const headings: { level: 2 | 3; text: string; note?: string }[] = [];
  const heading = (level: 2 | 3, text: string, note?: string) => {
    headings.push({ level, text, note });
    return `${'#'.repeat(level)} ${text}`;
  };

  const symbolCount = categories.reduce((sum, c) => sum + symbolsInCategory(c.id).length, 0);
  const groups = categories.filter((c) => symbolsInCategory(c.id).length > 0);

  const terrainSection = [
    heading(2, 'Terrains', plural(terrains.length, 'terrain')),
    'The ground you paint with the **Terrain** tool. Each sample is a small island of the terrain in the sea, so you also see how it meets the water: the coastline, the sandy beach (on the terrains that have one) and the shallows. Drawn with the default theme.',
    grid(terrains.map(terrainCard), WIDE_COLUMNS),
  ];

  const symbolSection = [
    heading(2, 'Symbols and brushes', `${plural(symbolCount, 'symbol')} in ${plural(groups.length, 'category', 'categories')}, ${plural(
      groups.reduce((sum, c) => sum + brushesInCategory(c.id).length, 0),
      'brush',
      'brushes',
    )}`),
    'A **symbol** is one stamp you place with a click; a **brush** scatters a whole patch of them while you drag. Symbols are shown on the ground the palette shows them on (sea creatures on water, cacti on sand…). Every symbol has several variants and the picture shows the first one: the in-app **Art gallery** (`#/gallery`) shows them all.',
    ...groups.flatMap((category) => {
      const list = symbolsInCategory(category.id);
      const brushList = brushesInCategory(category.id);
      return [
        heading(3, category.name, `${plural(list.length, 'symbol')}${brushList.length ? `, ${plural(brushList.length, 'brush', 'brushes')}` : ''}`),
        ...(category.blurb ? [escapeHtml(category.blurb)] : []),
        ...(brushList.length
          ? [`**Brushes** (${brushList.length}): a patch painted with the brush, like dragging it over the map.`, grid(brushList.map(brushCard), WIDE_COLUMNS)]
          : []),
        `**Symbols** (${list.length})`,
        grid(list.map(symbolCard), SYMBOL_COLUMNS),
      ];
    }),
  ];

  const pathSection = [
    heading(2, 'Paths', plural(pathStyles.length, 'path style')),
    'Rivers, roads and other lines you draw with the **Path** tool. Each sample has one stroke over land and one over the sea, at the width the tool starts with.',
    grid(pathStyles.map(pathCard), WIDE_COLUMNS),
  ];

  const labelSection = [
    heading(2, 'Labels', plural(labelStyles.length, 'label style')),
    'The styles of the **Label** tool. Each sample is a typical name for it (a city, a sea, a dungeon…) on the map, with its halo, at its real size unless the name is too big for the picture.',
    grid(labelStyles.map(labelCard), WIDE_COLUMNS),
  ];

  const fontSection = [
    heading(2, 'Fonts', plural(fontList.length, 'font')),
    'The typefaces behind the label styles, with every weight and style the app loads, then the letters and figures. They are bundled with the app (no internet needed).',
    grid(fontList.map(fontCard), WIDE_COLUMNS),
  ];

  const themeSection = [
    heading(2, 'Themes', plural(orderedThemes.length, 'theme')),
    'A theme is the whole look of a map: the sea, the coast, the paper and the colour grade of every texture and symbol. Both pictures show the same sample world, *Aldoria* (`client/public/samples`), with the frame the theme suggests.',
    grid(
      orderedThemes.map(
        (theme): Card => ({
          entry: { kind: 'theme', id: theme.id },
          name: theme.id === DEFAULT_THEME_ID ? `${theme.name} (default)` : theme.name,
          id: theme.id,
          details: [escapeHtml(theme.blurb)],
        }),
      ),
      THEME_COLUMNS,
    ),
  ];

  const frameRows = frames.map((frame) => {
    const cells = orderedThemes.map((theme) => {
      const entry: AssetEntry = { kind: 'frame', id: frame.id, themeId: theme.id };
      return `<td align="center"><img src="${assetFile(entry)}" width="${DISPLAY_WIDTH.frame}" alt="${escapeHtml(`${frame.name} frame, ${theme.name} theme`)}"></td>`;
    });
    return `<tr>\n<th>${escapeHtml(frame.name)}<br><sub><code>${escapeHtml(frame.id)}</code></sub></th>\n${cells.join('\n')}\n</tr>`;
  });
  const frameSection = [
    heading(2, 'Frames', plural(frames.length, 'frame')),
    'The border drawn around the map, in each theme. Frames are a fixed size, so the pictures show a small map: on a large map they look correspondingly smaller.',
    `<table>\n<tr>\n<th></th>\n${orderedThemes.map((t) => `<th>${escapeHtml(t.name)}</th>`).join('\n')}\n</tr>\n${frameRows.join('\n')}\n</table>`,
  ];

  const methodSection = [
    heading(2, 'How this file is made'),
    [
      'Nothing here is drawn by hand. `npm run assets` starts the app in a headless browser, draws every entry of the illustrations catalog with the same engine that paints the editor and exports maps, and writes the pictures to `docs/assets/` together with this file. Everything is seeded, so an unchanged asset gives the same picture again.',
      '',
      '- **Adding or changing art:** edit `illustrations/`, run `npm run assets`, and commit `ASSETS.md` and `docs/assets/` with the change. The guide for new art is [illustrations/README.md](illustrations/README.md).',
      '- **Staying current:** this file records a fingerprint of the art and of the code that draws it. A unit test (`client/src/devtools/assetsDoc.test.ts`) fails when the file, its pictures or that fingerprint no longer match, so a change that forgets to regenerate is caught by `npm test`.',
      '- **Just a few:** `npm run assets -- --only symbol,brush` or `npm run assets -- --filter mountain` redraw part of the catalog (a full run also removes pictures of assets that no longer exist).',
      '- **Where the code lives:** `client/src/devtools/` (what to draw, how to draw it and how to write this file) and `tools/assets.mjs` (the runner). See [TECH.md](TECH.md).',
    ].join('\n'),
  ];

  const body = [terrainSection, symbolSection, pathSection, labelSection, fontSection, themeSection, frameSection, methodSection].flat();

  const taken = new Map<string, number>();
  const contents = headings.map((h) => {
    const base = headingSlug(h.text);
    const seen = taken.get(base) ?? 0;
    taken.set(base, seen + 1);
    return `${h.level === 2 ? '' : '  '}- [${h.text}](#${seen ? `${base}-${seen}` : base})${h.note ? ` – ${h.note}` : ''}`;
  });

  return (
    [
      '<!-- Generated by `npm run assets` from the illustrations catalog. Do not edit it by hand. -->',
      `<!-- art-hash: ${artHash} -->`,
      '# WonderMap asset catalog',
      'A picture of every illustration that ships with WonderMap: the terrains you paint with, the symbols you place, the scatter brushes, paths, label styles, fonts, themes and frames. None of it is a hand-made image: **the art is generated by code** (see [illustrations/README.md](illustrations/README.md)), and the pictures below are drawn by the app’s own engine, the one behind the editor and the image export.',
      '> **This file is kept up to date automatically.** After adding or changing art, run `npm run assets` and commit `ASSETS.md` together with `docs/assets/`; `npm test` fails until you do.',
      '## Contents',
      contents.join('\n'),
      ...body,
    ].join('\n\n') + '\n'
  );
}
