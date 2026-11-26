import { ensureFonts, getTheme, labelStyleById, symbolById } from '@wondermap/illustrations';
import { renderMapToCanvas } from '../../engine/exportMap';
import { labelBounds } from '../../engine/labels';
import { documentFromJson } from '../../model/document';
import type { MapDocument } from '../../model/types';
import { estimateLabel } from './labelExtent';

/** Browser-only helpers of the sample tool (tools/samples.mjs): pictures of a map and a check that its names do not collide. */

export interface PreviewOptions {
  /** Bitmap pixels per map pixel (a multiple of 0.5). */
  scale: number;
  /** Only this part of the map: x, y, width, height in map px. */
  crop?: readonly [number, number, number, number];
  /** Shrinks the picture to this width if it is wider. */
  maxWidth?: number;
  format?: 'png' | 'jpeg';
  quality?: number;
}

/** Draws a map with the engine of the editor and returns the picture as base64. */
export async function renderPreview(json: string, o: PreviewOptions): Promise<string> {
  const doc = documentFromJson(json);
  const full = await renderMapToCanvas(doc, { scale: o.scale });
  let canvas = full;
  if (o.crop) {
    const [x, y, w, h] = o.crop.map((v) => Math.round(v * o.scale)) as [number, number, number, number];
    canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.min(w, full.width - x));
    canvas.height = Math.max(1, Math.min(h, full.height - y));
    canvas.getContext('2d')!.drawImage(full, x, y, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  }
  if (o.maxWidth && canvas.width > o.maxWidth) {
    const small = document.createElement('canvas');
    small.width = o.maxWidth;
    small.height = Math.max(1, Math.round((canvas.height * o.maxWidth) / canvas.width));
    const ctx = small.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, small.width, small.height);
    canvas = small;
  }
  const mime = o.format === 'jpeg' ? 'image/jpeg' : 'image/png';
  return canvas.toDataURL(mime, o.quality ?? 0.85).split(',')[1]!;
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const area = (b: Box) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
const common = (a: Box, b: Box): number =>
  area({ x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) });

function symbolBox(doc: MapDocument, index: number, share: number): Box | null {
  const s = doc.symbols[index]!;
  const def = symbolById.get(s.asset);
  if (!def) return null;
  const [w, h] = def.size;
  const [ax, ay] = def.anchor;
  const halfW = (w * s.scale * share) / 2;
  const halfH = (h * s.scale * share) / 2;
  const cx = s.x + (0.5 - ax) * w * s.scale;
  const cy = s.y + (0.5 - ay) * h * s.scale;
  return { x0: cx - halfW, y0: cy - halfH, x1: cx + halfW, y1: cy + halfH };
}

export interface NameFit {
  text: string;
  style: string;
  size: number;
  measured: number;
  estimated: number;
}

export interface MapReport {
  symbols: number;
  assets: number;
  labels: number;
  paths: number;
  land: number;
  /** Names that run into each other, into a town or castle, or off the map. */
  problems: string[];
  /** How wide each name really is next to what the generator expects (see labelExtent.ts). */
  fits: NameFit[];
}

/** Counts what is on a map and lists the names that collide with each other or with a town. */
export async function inspectMap(json: string): Promise<MapReport> {
  const doc = documentFromJson(json);
  await ensureFonts();
  const theme = getTheme(doc.themeId);
  const bounds = doc.labels.map((label) => labelBounds(label, theme));
  const problems: string[] = [];
  const at = (b: Box) => `(${Math.round((b.x0 + b.x1) / 2)}, ${Math.round((b.y0 + b.y1) / 2)})`;

  doc.labels.forEach((label, i) => {
    const b = bounds[i]!;
    if (b.x0 < 0 || b.y0 < 0 || b.x1 > doc.width || b.y1 > doc.height) problems.push(`"${label.text}" reaches off the map ${at(b)}`);
    for (let j = i + 1; j < doc.labels.length; j++) {
      const other = bounds[j]!;
      if (common(b, other) > 0) problems.push(`"${label.text}" and "${doc.labels[j]!.text}" overlap ${at(b)}`);
    }
    doc.symbols.forEach((s, k) => {
      const def = symbolById.get(s.asset);
      if (!def || def.layer !== 'landmark') return;
      const box = symbolBox(doc, k, 0.7);
      if (box && common(b, box) > area(b) * 0.08) problems.push(`"${label.text}" covers ${s.asset} ${at(box)}`);
    });
  });

  let land = 0;
  for (const v of doc.terrain.data) if (v > 0) land++;
  const fits = doc.labels.map((label, i): NameFit => {
    const b = bounds[i]!;
    const style = labelStyleById.get(label.style);
    return {
      text: label.text,
      style: label.style,
      size: label.size,
      measured: Math.round(b.x1 - b.x0),
      estimated: style ? Math.round(estimateLabel(label.text, style, label.size, label.spacing).width) : 0,
    };
  });
  return {
    symbols: doc.symbols.length,
    assets: new Set(doc.symbols.map((s) => s.asset)).size,
    labels: doc.labels.length,
    paths: doc.paths.length,
    land: land / doc.terrain.data.length,
    problems,
    fits,
  };
}
