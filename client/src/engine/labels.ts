import { fontCss, labelStyleById, labelStyles } from '@wondermap/illustrations';
import type { MapTheme, ResolvedLabelStyle } from '@wondermap/illustrations';
import type { MapLabel, Rect } from '../model/types';

/**
 * Map labels: straight or bent along a circular arc, with a soft halo so they stay readable on any terrain.
 * Layouts are measured once per label object (documents are immutable, so an edit makes a new object).
 */

/** The text bends by up to this many radians over its full length at `curve = ±1`. */
const MAX_BEND = 2.4;

interface Glyph {
  ch: string;
  /** Centre of the glyph relative to the label anchor, before rotation. */
  x: number;
  y: number;
  /** Rotation along the arc. */
  angle: number;
}

export interface LabelGeometry {
  key: string;
  text: string;
  font: string;
  size: number;
  spacingPx: number;
  width: number;
  color: string;
  halo: string;
  haloWidth: number;
  glyphs: Glyph[];
  curved: boolean;
  /** Local (unrotated) bounds relative to the anchor. */
  box: Rect;
}

let measureCtx: CanvasRenderingContext2D | null = null;
let fontsEpoch = 0;
const cache = new WeakMap<MapLabel, LabelGeometry>();
const fontListeners = new Set<() => void>();

if (typeof document !== 'undefined' && document.fonts) {
  document.fonts.addEventListener('loadingdone', () => {
    fontsEpoch++;
    fontListeners.forEach((fn) => fn());
  });
}

/** Called when web fonts finish loading, so labels measured with a fallback font can be redrawn. */
export function onFontsLoaded(fn: () => void): () => void {
  fontListeners.add(fn);
  return () => fontListeners.delete(fn);
}

function measurer(): CanvasRenderingContext2D {
  if (!measureCtx) {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    measureCtx = c.getContext('2d')!;
  }
  return measureCtx;
}

export function styleOfLabel(label: MapLabel): ResolvedLabelStyle {
  return labelStyleById.get(label.style) ?? labelStyles[0]!;
}

export function labelGeometry(label: MapLabel, theme: MapTheme): LabelGeometry {
  const key = `${theme.id}|${fontsEpoch}`;
  const hit = cache.get(label);
  if (hit && hit.key === key) return hit;

  const style = styleOfLabel(label);
  const text = style.uppercase ? label.text.toUpperCase() : label.text;
  const size = Math.max(4, label.size);
  const font = fontCss(style.font, size, style.weight, style.italic);
  const spacingPx = (style.spacing + label.spacing) * size;
  const ctx = measurer();
  ctx.font = font;
  ctx.letterSpacing = '0px';

  const chars = Array.from(text);
  const advances: number[] = [];
  let prefix = '';
  let prev = 0;
  for (const ch of chars) {
    prefix += ch;
    const w = ctx.measureText(prefix).width;
    advances.push(w - prev);
    prev = w;
  }
  const width = prev + Math.max(0, chars.length - 1) * spacingPx;

  const glyphs: Glyph[] = [];
  const curved = Math.abs(label.curve) > 0.01 && chars.length > 1;
  const radius = curved ? width / (Math.abs(label.curve) * MAX_BEND) : Infinity;
  let cursor = -width / 2;
  for (let i = 0; i < chars.length; i++) {
    const w = advances[i]!;
    const centre = cursor + w / 2;
    cursor += w + spacingPx;
    if (!curved) {
      glyphs.push({ ch: chars[i]!, x: centre, y: 0, angle: 0 });
      continue;
    }
    const phi = centre / radius;
    const dir = label.curve > 0 ? 1 : -1;
    glyphs.push({ ch: chars[i]!, x: radius * Math.sin(phi), y: dir * radius * (1 - Math.cos(phi)), angle: dir * phi });
  }

  const halo = style.halo ?? theme.label.halo;
  const haloWidth = style.haloWidth * (size / style.size);
  const pad = haloWidth / 2 + 2;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const reachUp = size * 0.82;
  const reachDown = size * 0.28;
  for (const g of glyphs) {
    const half = (advances[0] ?? size) / 2;
    const r = Math.max(half, size * 0.4);
    x0 = Math.min(x0, g.x - r);
    x1 = Math.max(x1, g.x + r);
    y0 = Math.min(y0, g.y - Math.max(reachUp, r));
    y1 = Math.max(y1, g.y + reachDown + r * 0.4);
  }
  if (!glyphs.length) {
    x0 = y0 = -4;
    x1 = y1 = 4;
  }
  if (!curved && glyphs.length) {
    x0 = -width / 2;
    x1 = width / 2;
    y0 = -reachUp;
    y1 = reachDown;
  }

  const geometry: LabelGeometry = {
    key,
    text,
    font,
    size,
    spacingPx,
    width,
    color: label.color ?? style.color ?? theme.label.color,
    halo,
    haloWidth,
    glyphs,
    curved,
    box: { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad },
  };
  cache.set(label, geometry);
  return geometry;
}

/** Axis-aligned bounds of the rotated label in map space. */
export function labelBounds(label: MapLabel, theme: MapTheme): Rect {
  const { box } = labelGeometry(label, theme);
  const cos = Math.cos(label.rotation);
  const sin = Math.sin(label.rotation);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [cx, cy] of [
    [box.x0, box.y0],
    [box.x1, box.y0],
    [box.x1, box.y1],
    [box.x0, box.y1],
  ] as const) {
    const x = label.x + cx * cos - cy * sin;
    const y = label.y + cx * sin + cy * cos;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}

export function labelContains(label: MapLabel, theme: MapTheme, x: number, y: number, slop = 0): boolean {
  const { box } = labelGeometry(label, theme);
  const cos = Math.cos(-label.rotation);
  const sin = Math.sin(-label.rotation);
  const dx = x - label.x;
  const dy = y - label.y;
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  return lx >= box.x0 - slop && lx <= box.x1 + slop && ly >= box.y0 - slop && ly <= box.y1 + slop;
}

const supportsSpacing = typeof CanvasRenderingContext2D !== 'undefined' && 'letterSpacing' in CanvasRenderingContext2D.prototype;

export function drawLabel(ctx: CanvasRenderingContext2D, label: MapLabel, theme: MapTheme): void {
  const g = labelGeometry(label, theme);
  if (!g.glyphs.length) return;
  ctx.save();
  ctx.translate(label.x, label.y);
  if (label.rotation) ctx.rotate(label.rotation);
  ctx.font = g.font;
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  const whole = !g.curved && (g.spacingPx === 0 || supportsSpacing);
  if (whole) {
    if (supportsSpacing) ctx.letterSpacing = `${g.spacingPx}px`;
    ctx.textAlign = 'left';
    const x = -g.width / 2;
    if (g.haloWidth > 0) {
      ctx.strokeStyle = g.halo;
      ctx.lineWidth = g.haloWidth;
      ctx.strokeText(g.text, x, 0);
    }
    ctx.fillStyle = g.color;
    ctx.fillText(g.text, x, 0);
  } else {
    ctx.textAlign = 'center';
    for (const pass of [0, 1]) {
      if (pass === 0 && g.haloWidth <= 0) continue;
      if (pass === 0) {
        ctx.strokeStyle = g.halo;
        ctx.lineWidth = g.haloWidth;
      } else {
        ctx.fillStyle = g.color;
      }
      for (const glyph of g.glyphs) {
        if (glyph.ch === ' ') continue;
        ctx.save();
        ctx.translate(glyph.x, glyph.y);
        if (glyph.angle) ctx.rotate(glyph.angle);
        if (pass === 0) ctx.strokeText(glyph.ch, 0, 0);
        else ctx.fillText(glyph.ch, 0, 0);
        ctx.restore();
      }
    }
  }
  ctx.restore();
}
