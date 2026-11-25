import {
  DEFAULT_THEME_ID,
  brushById,
  brushesInCategory,
  ensureFonts,
  fontCss,
  fontList,
  frameById,
  getTheme,
  labelStyleById,
  pathStyleById,
  symbolById,
  symbolsInCategory,
  terrainById,
  themeById,
} from '@wondermap/illustrations';
import type { FontDef, MapTheme, ResolvedBrush, ResolvedLabelStyle, ResolvedPathStyle, ResolvedSymbol, ResolvedTerrain } from '@wondermap/illustrations';
import { renderMapToCanvas } from '../engine/exportMap';
import { labelGeometry } from '../engine/labels';
import { drawPaper } from '../engine/paper';
import { drawSymbol } from '../engine/sprites/spriteCache';
import { CHUNK } from '../engine/terrain/chunkPainter';
import { createDocument, documentFromJson, snapSize } from '../model/document';
import { addLabel, addPath, addSymbols } from '../model/ops';
import { createTerrainLayer, fillTerrain, paintStroke, terrainAt, withTerrainId } from '../model/terrainLayer';
import type { MapDocument, MapLabel, Point } from '../model/types';
import { ScatterSession } from '../tools/scatter';
import { backdropFor, drawBackdrop } from '../utils/backdrop';
import type { Backdrop } from '../utils/backdrop';
import { DISPLAY_WIDTH, IMAGE, PIXEL_RATIO, assetFile } from './assetCatalog';
import type { AssetEntry } from './assetCatalog';

/**
 * Draws the pictures of ASSETS.md. Browser only: it renders with the same engine as the editor and the image export,
 * so what the catalog shows is what a map gets. `tools/assets.mjs` calls `renderAsset` for every entry of `listAssets()`.
 *
 * Everything is deterministic (fixed seeds, fixed ids), so drawing an unchanged asset yields the same picture again.
 */

export interface RenderedAsset {
  /** Where the picture belongs, relative to the repository root. */
  file: string;
  base64: string;
  width: number;
  height: number;
}

export async function renderAsset(entry: AssetEntry): Promise<RenderedAsset> {
  await ensureFonts();
  const canvas = await draw(entry);
  const url = canvas.toDataURL(IMAGE.mime, IMAGE.quality);
  const out = { file: assetFile(entry), base64: url.slice(url.indexOf(',') + 1), width: canvas.width, height: canvas.height };
  canvas.width = canvas.height = 0;
  return out;
}

function draw(entry: AssetEntry): Promise<HTMLCanvasElement> | HTMLCanvasElement {
  switch (entry.kind) {
    case 'terrain':
      return drawTerrain(need(terrainById, entry.id));
    case 'symbol':
      return drawSymbolCard(need(symbolById, entry.id));
    case 'brush':
      return drawBrush(need(brushById, entry.id));
    case 'path':
      return drawPathStyle(need(pathStyleById, entry.id));
    case 'label':
      return drawLabelStyle(need(labelStyleById, entry.id));
    case 'font':
      return drawFont(need(new Map(fontList.map((f) => [f.id, f])), entry.id));
    case 'theme':
      return drawTheme(need(themeById, entry.id));
    case 'frame':
      return drawFrame(need(frameById, entry.id).id, need(themeById, entry.themeId ?? DEFAULT_THEME_ID));
  }
}

function need<T>(map: ReadonlyMap<string, T>, id: string): T {
  const found = map.get(id);
  if (!found) throw new Error(`Unknown asset "${id}"`);
  return found;
}

/* ------------------------------------------------------------------------------------------- */
/* Sample maps                                                                                  */
/* ------------------------------------------------------------------------------------------- */

/** Seed of every sample map, so the coastlines of two terrains can be compared side by side. */
const SEED = 1234;
/** The small map most pictures are cut from (3:2) and the scale that turns it into a picture of the usual width. */
const MAP_W = 360;
const MAP_H = 240;
const SCALE = (DISPLAY_WIDTH.terrain * PIXEL_RATIO) / MAP_W;
/** Wider views of the sample map for big symbols (see `render` for why the scales that come out must stay round). */
const ZOOMS = [1, 1.5, 2, 3];

/**
 * Renders a sample map with the export engine. The terrain is painted in chunks of 256 map px that are placed at rounded
 * positions, so a scale that does not turn a chunk into a whole number of bitmap px leaves a hairline between two chunks
 * (the editor only exports at 0.5, 1, 2, 3 and 4). Refusing such a scale here keeps a change of a size from slipping through.
 */
function render(doc: MapDocument, scale: number): Promise<HTMLCanvasElement> {
  if (!Number.isInteger(CHUNK * scale)) throw new Error(`Render scale ${scale} cuts terrain chunks into fractions of a pixel`);
  return renderMapToCanvas(doc, { scale });
}

/** An empty (all sea) map of any size, even below the editor's minimum. */
function emptyMap(width: number, height: number, themeId = DEFAULT_THEME_ID, frameId = 'none'): MapDocument {
  const doc = createDocument({ seed: SEED, themeId, frameId, name: 'Sample' });
  const [w, h] = [snapSize(width), snapSize(height)];
  return { ...doc, width: w, height: h, terrain: createTerrainLayer(w, h) };
}

/** Paints land with one stroke of the terrain brush. */
function paintLand(doc: MapDocument, terrainId: string, points: readonly Point[], radius: number, roughness = 0.65): MapDocument {
  const { layer, value } = withTerrainId(doc.terrain, terrainId);
  paintStroke(layer, { points, radius, value, mode: 'paint', roughness, seed: doc.seed });
  return { ...doc, terrain: layer };
}

function floodLand(doc: MapDocument, terrainId: string): MapDocument {
  const { layer, value } = withTerrainId(doc.terrain, terrainId);
  fillTerrain(layer, value);
  return { ...doc, terrain: layer };
}

type Disc = readonly [x: number, y: number, radius: number];

/** Scatters a brush over discs, like dragging it across the map. */
function scatter(doc: MapDocument, brush: ResolvedBrush, discs: readonly Disc[]): MapDocument {
  const session = new ScatterSession(
    {
      brush,
      scale: 1,
      randomScale: true,
      randomFlip: true,
      randomVariant: true,
      width: doc.width,
      height: doc.height,
      landAt: (x, y) => terrainAt(doc.terrain, x, y) !== null,
      seed: SEED,
    },
    doc.symbols,
  );
  return addSymbols(
    doc,
    discs.flatMap(([x, y, r]) => session.fill(x, y, r)),
  );
}

/** The terrain that looks like the ground a symbol is shown on (`paper` and `sea` have none of their own). */
function groundTerrain(kind: Backdrop): string {
  return terrainById.has(kind) ? kind : 'grass';
}

/** Shrinks a picture to `width` bitmap pixels (high quality), freeing the original. */
function shrink(source: HTMLCanvasElement, width: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.round((source.height * width) / source.width);
  const ctx = context(canvas);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.width = source.height = 0;
  return canvas;
}

/* ------------------------------------------------------------------------------------------- */
/* Terrains                                                                                     */
/* ------------------------------------------------------------------------------------------- */

const ISLAND: readonly Point[] = [
  [96, 152],
  [150, 100],
  [206, 134],
  [264, 104],
];

/** A small island of the terrain, so the picture also shows its coast: shoreline, beach and shallow water. */
function drawTerrain(def: ResolvedTerrain): Promise<HTMLCanvasElement> {
  return render(paintLand(emptyMap(MAP_W, MAP_H), def.id, ISLAND, 52), SCALE);
}

/* ------------------------------------------------------------------------------------------- */
/* Symbols                                                                                      */
/* ------------------------------------------------------------------------------------------- */

const CARD = DISPLAY_WIDTH.symbol;
const CARD_PADDING = 10;
/** Small symbols are enlarged this much at most, so a flower does not turn into a blur. */
const CARD_MAX_ZOOM = 2;

/** The symbol on the ground the palette shows it on, shrunk to fit like the palette thumbnails. */
function drawSymbolCard(def: ResolvedSymbol): HTMLCanvasElement {
  const theme = getTheme(DEFAULT_THEME_ID);
  const canvas = createCanvas(CARD, CARD);
  const ctx = context(canvas);
  drawBackdrop(ctx, backdropFor(def), theme, canvas.width, canvas.height, PIXEL_RATIO * 0.5);
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO);
  const [w, h] = def.size;
  const room = CARD - CARD_PADDING * 2;
  const fit = Math.min(CARD_MAX_ZOOM, room / w, room / h);
  drawSymbol(
    ctx,
    def,
    theme,
    { x: CARD / 2 + (def.anchor[0] - 0.5) * w * fit, y: CARD / 2 + (def.anchor[1] - 0.5) * h * fit, scale: fit, rotation: 0, flip: false, variant: 0 },
    PIXEL_RATIO,
  );
  return canvas;
}

/* ------------------------------------------------------------------------------------------- */
/* Brushes                                                                                      */
/* ------------------------------------------------------------------------------------------- */

/** Roughly how many brush cells (spacing) the view should be wide, so a patch of big symbols still reads as a patch. */
const BRUSH_CELLS_ACROSS = 7;

/** A patch of ground (or open sea, for the brushes of the sea) painted with the brush from side to side. */
function drawBrush(brush: ResolvedBrush): Promise<HTMLCanvasElement> {
  const heaviest = [...brush.items].sort((a, b) => b.weight - a.weight)[0];
  const lead = heaviest ? symbolById.get(heaviest.symbol) : undefined;
  const ground = lead ? backdropFor(lead) : 'grass';
  const wanted = (brush.spacing * brush.scale[1] * BRUSH_CELLS_ACROSS) / MAP_W;
  const zoom = ZOOMS.find((z) => z >= wanted) ?? ZOOMS[ZOOMS.length - 1]!;
  const [w, h] = [MAP_W * zoom, MAP_H * zoom];

  let doc = emptyMap(w, h);
  if (ground !== 'sea') {
    doc = paintLand(
      doc,
      groundTerrain(ground),
      [
        [w * 0.3, h * 0.5],
        [w * 0.7, h * 0.5],
      ],
      h * 0.4,
    );
  }
  const radius = h * 0.42;
  doc = scatter(doc, brush, [
    [w * 0.3, h * 0.5, radius],
    [w * 0.5, h * 0.5, radius],
    [w * 0.7, h * 0.5, radius],
  ]);
  return render(doc, SCALE / zoom);
}

/* ------------------------------------------------------------------------------------------- */
/* Paths                                                                                        */
/* ------------------------------------------------------------------------------------------- */

const LAND_PATH: readonly Point[] = [
  [24, 214],
  [62, 150],
  [108, 166],
  [96, 100],
  [52, 62],
  [84, 18],
];
const SEA_PATH: readonly Point[] = [
  [252, 28],
  [304, 78],
  [262, 130],
  [322, 172],
  [282, 216],
];

/** One stroke over land and one over the sea: the same style has to read on both. */
function drawPathStyle(style: ResolvedPathStyle): Promise<HTMLCanvasElement> {
  let doc = paintLand(
    emptyMap(MAP_W, MAP_H),
    'grass',
    [
      [-90, MAP_H / 2],
      [70, MAP_H / 2],
    ],
    150,
    0.4,
  );
  doc = addPath(doc, { id: 'sample-land', style: style.id, points: LAND_PATH.map((p): Point => [...p]), width: style.width }).doc;
  doc = addPath(doc, { id: 'sample-sea', style: style.id, points: SEA_PATH.map((p): Point => [...p]), width: style.width }).doc;
  return render(doc, SCALE);
}

/* ------------------------------------------------------------------------------------------- */
/* Labels and fonts                                                                             */
/* ------------------------------------------------------------------------------------------- */

interface LabelSample {
  text: string;
  /** Written on the water instead of the land. */
  sea?: boolean;
}

/** Names that suit each style. Styles added later fall back to their own name. */
const LABEL_SAMPLES: Readonly<Record<string, LabelSample>> = {
  continent: { text: 'Valdoria' },
  region: { text: 'Kingdom of Eldmark' },
  city: { text: 'Silverhold' },
  town: { text: 'Brookford' },
  village: { text: 'Little Marsh' },
  sea: { text: 'Sea of Whispers', sea: true },
  mountain: { text: 'Ironspire Mountains' },
  wild: { text: 'Whisperwood' },
  landmark: { text: 'Old Watchtower' },
  ancient: { text: 'Tomb of Kings' },
  dungeon: { text: 'The Hollow Deep' },
  title: { text: 'The Lost Realm' },
};

const LABEL_W = DISPLAY_WIDTH.label;
const LABEL_H = LABEL_W / 3;
const LABEL_MARGIN = 20;
/** Labels are shown at their real size when they fit, and at most a little larger. */
const LABEL_MAX_ZOOM = 1.25;
/**
 * The zoom is a multiple of this, which keeps `256 × scale` a whole number: the terrain is painted in chunks of 256 map px,
 * and a chunk that is not a whole number of bitmap px leaves a hairline where two chunks meet.
 */
const LABEL_ZOOM_STEP = 1 / 64;

/** The style's sample name, centred on land or sea. Every picture has the same shape; names too big for it shrink to fit. */
function drawLabelStyle(style: ResolvedLabelStyle): Promise<HTMLCanvasElement> {
  const sample = LABEL_SAMPLES[style.id] ?? { text: style.name };
  const theme = getTheme(DEFAULT_THEME_ID);
  const label: MapLabel = { id: 'sample', text: sample.text, x: 0, y: 0, style: style.id, size: style.size, rotation: 0, curve: 0, spacing: 0, color: null };
  const { box } = labelGeometry(label, theme);
  const fit = Math.min(LABEL_MAX_ZOOM, LABEL_W / (box.x1 - box.x0 + LABEL_MARGIN * 2), LABEL_H / (box.y1 - box.y0 + LABEL_MARGIN * 2));
  const zoom = Math.max(LABEL_ZOOM_STEP, Math.floor(fit / LABEL_ZOOM_STEP) * LABEL_ZOOM_STEP);
  const [w, h] = [snapSize(Math.ceil(LABEL_W / zoom)), snapSize(Math.ceil(LABEL_H / zoom))];

  let doc = emptyMap(w, h);
  if (!sample.sea) doc = floodLand(doc, 'grass');
  doc = addLabel(doc, { ...label, x: w / 2 - (box.x0 + box.x1) / 2, y: h / 2 - (box.y0 + box.y1) / 2 }).doc;
  return render(doc, zoom * PIXEL_RATIO);
}

const FONT_SAMPLE = 'Aldoria & Silverhold';
const FONT_SPECIMEN = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789 .,;:!?&'];
const FONT_PADDING = 14;
const FONT_FACE_LINE = 46;
const FONT_SPECIMEN_LINE = 28;

/** The font on map paper: the sample name in every weight and style it offers, then its letters and figures. */
function drawFont(font: FontDef): HTMLCanvasElement {
  const theme = getTheme(DEFAULT_THEME_ID);
  const width = DISPLAY_WIDTH.font;
  const faces = font.styles.flatMap((style) => font.weights.map((weight) => ({ italic: style === 'italic', weight })));
  const height = FONT_PADDING * 2 + faces.length * FONT_FACE_LINE + 8 + FONT_SPECIMEN.length * FONT_SPECIMEN_LINE;
  const canvas = createCanvas(width, height);
  const ctx = context(canvas);
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO);
  ctx.fillStyle = theme.paper.color;
  ctx.fillRect(0, 0, width, height);
  drawPaper(ctx, theme, width, height);
  ctx.fillStyle = theme.label.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const room = width - FONT_PADDING * 2;
  const line = (text: string, face: { italic: boolean; weight: number }, size: number, baseline: number) => {
    let fitted = size;
    ctx.font = fontCss(font.id, fitted, face.weight, face.italic);
    while (ctx.measureText(text).width > room && fitted > 8) {
      fitted -= 1;
      ctx.font = fontCss(font.id, fitted, face.weight, face.italic);
    }
    ctx.fillText(text, width / 2, baseline);
  };
  faces.forEach((face, i) => line(FONT_SAMPLE, face, 28, FONT_PADDING + i * FONT_FACE_LINE + FONT_FACE_LINE * 0.66));
  const regular = faces[0] ?? { italic: false, weight: 400 };
  const top = FONT_PADDING + faces.length * FONT_FACE_LINE + 8;
  FONT_SPECIMEN.forEach((text, i) => line(text, regular, 19, top + i * FONT_SPECIMEN_LINE + FONT_SPECIMEN_LINE * 0.7));
  return canvas;
}

/* ------------------------------------------------------------------------------------------- */
/* Themes and frames                                                                            */
/* ------------------------------------------------------------------------------------------- */

let sampleWorld: Promise<MapDocument> | null = null;

/** The sample world that ships with the app (`public/samples`), the showcase for every theme. */
function loadSampleWorld(): Promise<MapDocument> {
  sampleWorld ??= fetch('/samples/aldoria.wondermap.json').then(async (response) => {
    if (!response.ok) throw new Error(`The sample world could not be loaded (HTTP ${response.status})`);
    return documentFromJson(await response.text());
  });
  return sampleWorld;
}

/** The whole sample world in the theme and its own frame. Rendered at half size, then shrunk, so symbols stay crisp. */
async function drawTheme(theme: MapTheme): Promise<HTMLCanvasElement> {
  const world = await loadSampleWorld();
  const full = await render({ ...world, themeId: theme.id, frameId: theme.frame }, 0.5);
  return shrink(full, DISPLAY_WIDTH.theme * PIXEL_RATIO);
}

const FRAME_W = 480;
const FRAME_H = 320;

/** Where the three peaks of the frame scene stand: x, y and size. */
const PEAK_SPOTS: readonly (readonly [x: number, y: number, scale: number])[] = [
  [330, 150, 0.9],
  [380, 168, 0.75],
  [352, 186, 0.7],
];

/** A small coastal scene with the frame around it. Pieces whose art is missing are skipped. */
function drawFrame(frameId: string, theme: MapTheme): Promise<HTMLCanvasElement> {
  let doc = emptyMap(FRAME_W, FRAME_H, theme.id, frameId);
  doc = paintLand(
    doc,
    'grass',
    [
      [120, 190],
      [200, 160],
      [290, 195],
      [365, 165],
    ],
    70,
  );
  const woods = brushesInCategory('forests')[0];
  if (woods) doc = scatter(doc, woods, [[150, 205, 38]]);
  doc = addSymbols(
    doc,
    symbolsInCategory('mountains')
      .slice(0, PEAK_SPOTS.length)
      .map((peak, i) => ({ asset: peak.id, x: PEAK_SPOTS[i]![0], y: PEAK_SPOTS[i]![1], scale: PEAK_SPOTS[i]![2], rotation: 0, flip: i % 2 === 1, variant: i })),
  );
  const town = symbolById.get('settlement.town') ?? symbolsInCategory('settlements')[0];
  if (town) doc = addSymbols(doc, [{ asset: town.id, x: 245, y: 205, scale: 0.8, rotation: 0, flip: false, variant: 0 }]);
  const title: MapLabel = { id: 'sample', text: 'Aldoria', x: FRAME_W / 2, y: 84, style: 'region', size: 30, rotation: 0, curve: 0, spacing: 0, color: null };
  doc = addLabel(doc, title).doc;
  return render(doc, (DISPLAY_WIDTH.frame * PIXEL_RATIO) / FRAME_W);
}

/* ------------------------------------------------------------------------------------------- */
/* Canvas helpers                                                                               */
/* ------------------------------------------------------------------------------------------- */

/** A canvas of `width × height` CSS px that holds `PIXEL_RATIO` bitmap pixels for each. */
function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * PIXEL_RATIO);
  canvas.height = Math.round(height * PIXEL_RATIO);
  return canvas;
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('The browser could not create a canvas');
  return ctx;
}
