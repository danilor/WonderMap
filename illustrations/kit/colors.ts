import type { ColorGrade } from './types';

export type RGB = [r: number, g: number, b: number];

const cache = new Map<string, RGB>();

/** Parse `#rgb`, `#rrggbb`, `rgb(r,g,b)` or `rgba(r,g,b,a)` (alpha ignored). */
export function parseColor(input: string): RGB {
  const hit = cache.get(input);
  if (hit) return [hit[0], hit[1], hit[2]];
  let out: RGB;
  const s = input.trim();
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      out = [parseInt(hex[0]! + hex[0]!, 16), parseInt(hex[1]! + hex[1]!, 16), parseInt(hex[2]! + hex[2]!, 16)];
    } else {
      out = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
    }
  } else {
    const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(s);
    out = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
  }
  cache.set(input, out);
  return [out[0], out[1], out[2]];
}

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
const hex2 = (v: number) => clamp255(v).toString(16).padStart(2, '0');

export function toHex([r, g, b]: RGB): string {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}

/** Linear mix of two colors, t = 0 → a, t = 1 → b. */
export function mix(a: string, b: string, t: number): string {
  const ca = parseColor(a);
  const cb = parseColor(b);
  return toHex([ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t]);
}

export const lighten = (c: string, amount: number) => mix(c, '#ffffff', amount);
export const darken = (c: string, amount: number) => mix(c, '#000000', amount);

/** `rgba()` string for a color with alpha. */
export function rgba(c: string, alpha: number): string {
  const [r, g, b] = parseColor(c);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

export function rgbToHsl([r, g, b]: RGB): [h: number, s: number, l: number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d > 1e-9) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  if (s <= 1e-9) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t0: number) => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

/** Relative HSL adjustment: hue shift in turns (0..1), saturation/lightness additive. */
export function adjust(c: string, { h = 0, s = 0, l = 0 }: { h?: number; s?: number; l?: number }): string {
  const [ch, cs, cl] = rgbToHsl(parseColor(c));
  const nh = (((ch + h) % 1) + 1) % 1;
  return toHex(hslToRgb(nh, Math.max(0, Math.min(1, cs + s)), Math.max(0, Math.min(1, cl + l))));
}

/** Build a color from HSL components (h in turns 0..1). */
export const hsl = (h: number, s: number, l: number) => toHex(hslToRgb(h, s, l));

/* ----------------------------- color grading (themes) ----------------------------- */

function gradeRgb(rgb: RGB, g: ColorGrade, tint: RGB | null): RGB {
  let [r, gg, b] = rgb;
  const brightness = g.brightness ?? 1;
  const contrast = g.contrast ?? 1;
  const saturation = g.saturation ?? 1;
  const sepia = g.sepia ?? 0;

  if (saturation !== 1) {
    const lum = 0.299 * r + 0.587 * gg + 0.114 * b;
    r = lum + (r - lum) * saturation;
    gg = lum + (gg - lum) * saturation;
    b = lum + (b - lum) * saturation;
  }
  if (sepia > 0) {
    const sr = 0.393 * r + 0.769 * gg + 0.189 * b;
    const sg = 0.349 * r + 0.686 * gg + 0.168 * b;
    const sb = 0.272 * r + 0.534 * gg + 0.131 * b;
    r += (sr - r) * sepia;
    gg += (sg - gg) * sepia;
    b += (sb - b) * sepia;
  }
  if (contrast !== 1) {
    r = (r - 128) * contrast + 128;
    gg = (gg - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;
  }
  if (brightness !== 1) {
    r *= brightness;
    gg *= brightness;
    b *= brightness;
  }
  if (tint) {
    const a = g.tintAmount ?? 0;
    // Multiply-style tint keeps shading while shifting the whole palette.
    r += (r * (tint[0] / 255) - r) * a;
    gg += (gg * (tint[1] / 255) - gg) * a;
    b += (b * (tint[2] / 255) - b) * a;
  }
  return [clamp255(r), clamp255(gg), clamp255(b)];
}

export function isIdentityGrade(g: ColorGrade | undefined): boolean {
  if (!g) return true;
  return (
    (g.saturation ?? 1) === 1 &&
    (g.brightness ?? 1) === 1 &&
    (g.contrast ?? 1) === 1 &&
    (g.sepia ?? 0) === 0 &&
    (g.tintAmount ?? 0) === 0
  );
}

/** Grade a single color string (used for palette colors that are not baked into pixels). */
export function gradeColor(c: string, g: ColorGrade | undefined): string {
  if (isIdentityGrade(g)) return c;
  const grade = g as ColorGrade;
  return toHex(gradeRgb(parseColor(c), grade, grade.tint ? parseColor(grade.tint) : null));
}

/** Grade raw RGBA pixels in place (alpha untouched). */
export function gradePixels(data: Uint8ClampedArray, g: ColorGrade | undefined): void {
  if (isIdentityGrade(g)) return;
  const grade = g as ColorGrade;
  const tint = grade.tint ? parseColor(grade.tint) : null;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const out = gradeRgb([data[i]!, data[i + 1]!, data[i + 2]!], grade, tint);
    data[i] = out[0];
    data[i + 1] = out[1];
    data[i + 2] = out[2];
  }
}
