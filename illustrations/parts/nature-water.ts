import { lighten, rgba } from '../kit/colors';
import { clipped, dot, shape, softBlob } from '../kit/draw';
import { TAU } from '../kit/math';
import { blob } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';

export interface WaterPalette {
  /** Earth of the bank wall on the far side. */
  bank: string;
  /** Shallow water along the edge. */
  rim: string;
  mid: string;
  deep: string;
  glint: string;
  line: string;
}

export const WATER = {
  oasis: { bank: '#7a5a30', rim: '#a6ead8', mid: '#48b6c2', deep: '#2b82a0', glint: '#f4fffb', line: '#1f4a58' },
  murk: { bank: '#26301b', rim: '#7d9a5c', mid: '#41604a', deep: '#223b36', glint: '#c3dca0', line: '#141f17' },
  bog: { bank: '#2f2818', rim: '#6d6a3a', mid: '#464d2d', deep: '#2b3323', glint: '#b3c283', line: '#17180d' },
  dark: { bank: '#2a2a1c', rim: '#58795f', mid: '#2f4d4a', deep: '#1a302f', glint: '#a9d6c0', line: '#0f1a18' },
} satisfies Record<string, WaterPalette>;

export interface PoolOptions {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  pal: WaterPalette;
  /** How lumpy the shore is, 0..1. */
  lumpy?: number;
  ripples?: number;
  glints?: number;
  rotation?: number;
  /** Soft darker earth around the water. Default true. */
  bank?: boolean;
  inkW?: number;
}

const scaled = (pts: readonly Vec2[], cx: number, cy: number, k: number, dx = 0, dy = 0): Vec2[] => pts.map((p): Vec2 => [cx + (p[0] - cx) * k + dx, cy + (p[1] - cy) * k + dy]);

/** A four-point sparkle. */
export function sparkle(ctx: Ctx2D, x: number, y: number, r: number, color: string): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.16, y - r * 0.16, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.16, y + r * 0.16, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.16, y + r * 0.16, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.16, y - r * 0.16, x, y - r);
  ctx.fill();
  ctx.restore();
}

/** A pool of water seen from above: pale shallows, a dark middle, a shaded far bank and a few glints. Returns the shore polygon. */
export function drawPool(ctx: Ctx2D, rand: Rng, o: PoolOptions): Vec2[] {
  const { cx, cy, rx, ry, pal } = o;
  const lump = o.lumpy ?? 0.5;
  const inkW = o.inkW ?? 1.2;
  const pts = blob(rand, cx, cy, rx, ry, { points: 28, jitter: 0.03 + 0.05 * lump, lobes: 3, lobeAmp: 0.04 + 0.08 * lump, rotation: o.rotation ?? 0 });

  if (o.bank !== false) {
    softBlob(ctx, cx - rx * 0.02, cy + ry * 0.1, rx * 1.16, ry * 1.28, pal.bank, 0.42);
    shape(ctx, scaled(pts, cx, cy, 1.07, 0, ry * 0.12), { fill: rgba(pal.bank, 0.5), smooth: true });
  }
  shape(ctx, pts, { fill: pal.line, stroke: pal.line, width: inkW * 2, smooth: true, join: 'round' });
  shape(ctx, pts, { fill: pal.rim, smooth: true });

  // Depth: stacked layers drifting towards the shaded upper left.
  const layers: Array<[number, string, number]> = [[0.82, pal.mid, 0.42], [0.66, pal.mid, 0.5], [0.5, pal.deep, 0.5], [0.34, pal.deep, 0.55]];
  layers.forEach(([k, c, a], i) => {
    shape(ctx, scaled(pts, cx, cy, k, -rx * 0.05 * ((i + 1) / 4), -ry * 0.12 * ((i + 1) / 4)), { fill: rgba(c, a), smooth: true });
  });

  clipped(
    ctx,
    pts,
    () => {
      // The far bank shades the water along its upper left edge.
      for (const [dy, a] of [[0.22, 0.34], [0.12, 0.22]] as const) {
        ctx.beginPath();
        ctx.rect(cx - rx - 6, cy - ry - 6, 2 * rx + 12, 2 * ry + 12);
        scaled(pts, cx, cy, 1, rx * 0.05, ry * dy).forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
        ctx.closePath();
        ctx.fillStyle = rgba(pal.line, a);
        ctx.fill('evenodd');
      }
      // Light caught along the lower right shallows.
      const rimLight = pts.filter((p) => p[1] > cy + ry * 0.1 && p[0] > cx - rx * 0.4);
      if (rimLight.length > 3) shape(ctx, scaled(rimLight, cx, cy, 0.93), { stroke: rgba(pal.glint, 0.4), width: 1.1, closed: false, smooth: true });
    },
    true,
  );

  // Ripples and glints.
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < (o.ripples ?? 4); i++) {
    const x = cx + rand.range(-0.55, 0.55) * rx;
    const y = cy + rand.range(-0.4, 0.5) * ry;
    const len = rand.range(0.1, 0.22) * rx;
    ctx.strokeStyle = rgba(pal.glint, rand.range(0.35, 0.65));
    ctx.lineWidth = rand.range(0.7, 1);
    ctx.beginPath();
    ctx.ellipse(x, y, len, len * 0.3, 0, Math.PI * 0.08, Math.PI * 0.92);
    ctx.stroke();
  }
  ctx.restore();
  for (let i = 0; i < (o.glints ?? 3); i++) {
    const a = rand.range(0, TAU);
    const d = rand.range(0.2, 0.62);
    sparkle(ctx, cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d * 0.9 + ry * 0.05, rand.range(1.3, 2.4), rgba(pal.glint, 0.95));
  }
  return pts;
}

/** A floating lily pad with a notch; `bloom` adds a flower. */
export function lilyPad(ctx: Ctx2D, rand: Rng, x: number, y: number, r: number, color: string, ink: string, bloom?: string): void {
  const notch = rand.range(0, TAU);
  const pts: Vec2[] = [[x, y]];
  const gap = 0.24;
  for (let i = 0; i <= 18; i++) {
    const a = notch + gap + ((TAU - gap * 2) * i) / 18;
    const wob = 1 + 0.03 * Math.sin(a * 5);
    pts.push([x + Math.cos(a) * r * wob, y + Math.sin(a) * r * 0.58 * wob]);
  }
  softBlob(ctx, x + r * 0.12, y + r * 0.2, r * 1.05, r * 0.5, '#0f1a18', 0.3);
  shape(ctx, pts, { fill: color, stroke: ink, width: Math.max(0.8, r * 0.12), smooth: false, join: 'round' });
  shape(ctx, pts.map((p): Vec2 => [x + (p[0] - x) * 0.72 - r * 0.06, y + (p[1] - y) * 0.72 - r * 0.05]), { fill: rgba(lighten(color, 0.25), 0.55), smooth: false });
  for (let i = 0; i < 3; i++) {
    const a = notch + 0.9 + i * 1.7;
    shape(ctx, [[x, y], [x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.5]], { stroke: rgba(ink, 0.35), width: 0.6, closed: false });
  }
  if (bloom) {
    const bx = x + r * 0.15;
    const by = y - r * 0.15;
    for (let k = 0; k < 6; k++) {
      const a = (k * TAU) / 6 + 0.3;
      dot(ctx, bx + Math.cos(a) * r * 0.34, by + Math.sin(a) * r * 0.2, r * 0.26, ink);
    }
    for (let k = 0; k < 6; k++) {
      const a = (k * TAU) / 6 + 0.3;
      dot(ctx, bx + Math.cos(a) * r * 0.34, by + Math.sin(a) * r * 0.2, r * 0.2, k % 2 ? bloom : lighten(bloom, 0.2));
    }
    dot(ctx, bx, by, r * 0.16, '#f6d65a');
  }
}
