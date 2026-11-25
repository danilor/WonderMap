import { mix, rgba } from '../kit/colors';
import { clipped, dot, ellipse, linearGradient, radialGradient, shape, softBlob, stipple } from '../kit/draw';
import { blob, catmullRom, ellipsePoints, ribbon } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { drawBoulder, tuft } from './relief-common';

export interface SinterTones {
  lit: string;
  base: string;
  shade: string;
  /** Mineral staining around the vent. */
  stain: string;
}

export const SINTER = {
  cream: { lit: '#f5ecd2', base: '#d8c79d', shade: '#a99371', stain: '#d9a24a' },
  gray: { lit: '#e2ddd2', base: '#b5aea2', shade: '#847e7a', stain: '#9bb79a' },
  rust: { lit: '#ecd7b3', base: '#c99a6a', shade: '#8f6548', stain: '#d6683a' },
} as const satisfies Record<string, SinterTones>;

const WATER = { foam: '#ffffff', pale: '#d5f1f6', mid: '#8fd3e3', deep: '#4a9bbd', line: '#3a6c88' } as const;

/** Soft, wispy steam: a few translucent billows with faint edge strokes so they stay readable on light ground. */
export function drawSteam(ctx: Ctx2D, rand: Rng, x: number, y: number, rise: number, count: number, r: number): void {
  const ph = rand.range(0, 6);
  for (let i = 0; i < count; i++) {
    const t = (i + 0.4) / count;
    const px = x + Math.sin(t * 4.4 + ph) * r * 0.9 + rand.range(-0.15, 0.15) * r;
    const py = y - rise * t;
    const pr = r * (0.7 + t * 0.7) * rand.range(0.9, 1.1);
    const a = 0.92 - t * 0.38;
    ellipse(ctx, px + pr * 0.12, py + pr * 0.16, pr * 0.95, pr * 0.74, { fill: rgba('#8fa6b8', 0.38 * (1 - t * 0.5)) });
    ellipse(ctx, px, py, pr, pr * 0.82, { fill: radialGradient(ctx, px, py, pr * 1.05, pr * 1.05, [[0, rgba('#ffffff', a)], [0.62, rgba('#f1f7f9', a * 0.85)], [1, rgba('#d3e2ea', 0)]], px - pr * 0.3, py - pr * 0.3) });
    ctx.save();
    ctx.strokeStyle = rgba('#566f83', 0.72 * (1 - t * 0.45));
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const a0 = rand.range(0.15, 0.55) * Math.PI;
    ctx.ellipse(px, py, pr * 0.82, pr * 0.66, 0, a0, a0 + rand.range(0.9, 1.5));
    ctx.stroke();
    ctx.restore();
  }
}

/** A drop of water: bright core with a thin blue edge. */
function droplet(ctx: Ctx2D, x: number, y: number, r: number): void {
  dot(ctx, x, y, r + 0.6, rgba(WATER.line, 0.8));
  dot(ctx, x, y, r, WATER.foam);
}

export interface GeyserOptions {
  cx: number;
  baseY: number;
  /** Width of the sinter mound at its foot. */
  w: number;
  /** Height of the mound. */
  h: number;
  rand: Rng;
  ink: string;
  tones: SinterTones;
  /** Height of the main water column above the vent (0 = just bubbling). */
  jet: number;
  /** Extra side jets arcing out of the vent. */
  sprays?: number;
  /** Radius of the steam cloud on top of the column (0 = none). */
  steam?: number;
  /** Sideways lean of the column. */
  lean?: number;
}

/** A low mound of mineral deposits with a hot water column shooting out of its vent. Returns the vent position. */
export function drawGeyser(ctx: Ctx2D, o: GeyserOptions): Vec2 {
  const { rand, cx, baseY, w, h, tones, ink } = o;
  const R = w / 2;
  const rimR = R * 0.34;
  const rimRy = rimR * 0.42;
  const rimY = baseY - h;
  const lw = 1.2;
  const prof = (s: number): number => rimR + (R - rimR) * (1 - s) ** 1.5;
  const ph = [rand.range(0, 6), rand.range(0, 6)] as const;

  softBlob(ctx, cx + w * 0.06, baseY + R * 0.14, R * 1.08, R * 0.3, '#1d160c', 0.32);

  const left: Vec2[] = [];
  const right: Vec2[] = [];
  for (let i = 0; i <= 14; i++) {
    const s = i / 14;
    left.push([cx - prof(s) * (1 + Math.sin(s * 8 + ph[0]) * 0.04), baseY - h * s]);
    right.push([cx + prof(s) * (1 + Math.sin(s * 8 + ph[1]) * 0.04), baseY - h * s]);
  }
  const back: Vec2[] = [];
  for (let i = 1; i < 10; i++) {
    const a = Math.PI + (i / 10) * Math.PI;
    back.push([cx + Math.cos(a) * rimR, rimY + Math.sin(a) * rimRy]);
  }
  const foot: Vec2[] = [];
  for (let i = 1; i < 14; i++) {
    const a = (i / 14) * Math.PI;
    foot.push([cx + Math.cos(a) * R, baseY + Math.sin(a) * R * 0.2 * (1 + 0.12 * Math.sin(a * 4 + ph[0]))]);
  }
  const body: Vec2[] = [...left, ...back, ...right.slice().reverse(), ...foot];
  shape(ctx, body, { fill: linearGradient(ctx, cx - R * 0.8, 0, cx + R * 0.8, 0, [[0, tones.lit], [0.45, tones.base], [1, tones.shade]]), smooth: false });
  clipped(ctx, body, () => {
    // Terraces: shallow curved lips where the mineral water spilled and hardened.
    for (let k = 1; k <= 3; k++) {
      const s = k * 0.23 + rand.range(-0.03, 0.03);
      const r = prof(s);
      const y = baseY - h * s;
      const pts: Vec2[] = [];
      for (let i = 0; i <= 12; i++) {
        const a = (i / 12) * Math.PI;
        pts.push([cx + Math.cos(a) * r, y + Math.sin(a) * r * 0.2]);
      }
      shape(ctx, pts, { stroke: rgba(tones.shade, 0.55), width: 1, closed: false, smooth: true });
      shape(ctx, pts.map((p): Vec2 => [p[0] - 0.4, p[1] - 1.4]), { stroke: rgba(tones.lit, 0.75), width: 0.9, closed: false, smooth: true });
    }
    // Mineral staining runs down from the vent.
    for (let i = 0; i < 4; i++) {
      const u = rand.range(-0.5, 0.5);
      const s0 = rand.range(0.1, 0.4);
      const pts: Vec2[] = [];
      for (let k = 0; k <= 4; k++) {
        const t = k / 4;
        const s = 1 - (1 - s0) * t;
        pts.push([cx + u * prof(s) + Math.sin(t * 5 + i) * 1.4, baseY - h * s + prof(s) * 0.08]);
      }
      shape(ctx, ribbon(catmullRom(pts, 3), catmullRom(pts, 3).map((_, k, a) => 0.8 + 2.4 * (k / a.length))), { fill: rgba(tones.stain, 0.5), smooth: false });
    }
    stipple(ctx, rand, body, Math.round(w * 0.35), { color: tones.shade, radius: 0.7, alpha: 0.4 });
    shape(ctx, left.slice(2).map((p): Vec2 => [p[0] + 1.3, p[1] + 1]), { stroke: rgba('#ffffff', 0.55), width: 1, closed: false, smooth: true });
  });
  shape(ctx, [...left, ...back, ...right.slice().reverse()], { stroke: ink, width: lw * 1.2, closed: false, smooth: true });
  shape(ctx, foot, { stroke: rgba(ink, 0.4), width: lw * 0.7, closed: false, smooth: true });

  // Vent: a rim of hardened minerals around a pool of boiling water.
  const rim = ellipsePoints(cx, rimY, rimR, rimRy, 24);
  shape(ctx, rim, { fill: linearGradient(ctx, cx - rimR, rimY - rimRy, cx + rimR, rimY + rimRy, [tones.lit, tones.base, tones.shade]), stroke: ink, width: lw });
  const pool = ellipsePoints(cx, rimY + 0.4, rimR * 0.72, rimRy * 0.7, 20);
  shape(ctx, pool, { fill: linearGradient(ctx, cx - rimR * 0.7, rimY - rimRy * 0.7, cx + rimR * 0.5, rimY + rimRy * 0.7, [WATER.pale, WATER.mid, WATER.deep]), stroke: rgba(ink, 0.7), width: lw * 0.7 });
  ellipse(ctx, cx - rimR * 0.1, rimY + 0.2, rimR * 0.5, rimRy * 0.4, { fill: rgba('#ffffff', 0.7) });

  const vx = cx;
  const vy = rimY;
  const lean = o.lean ?? 0;
  if (o.steam && o.steam > 0) {
    // Billowing steam wraps the upper part of the column and hides its tip.
    drawSteam(ctx, rand, vx + lean * 0.8, vy - o.jet * 0.3, o.jet * 0.78 + o.steam * 1.1, 5, o.steam * 0.95);
  } else if (o.jet === 0) {
    drawSteam(ctx, rand, vx, vy - 2, 18, 3, 4.5);
  } else {
    drawSteam(ctx, rand, vx + lean, vy - o.jet * 0.5, 12 + o.jet * 0.5, 3, 4);
  }

  if (o.jet > 0) {
    // Main column: widest just above the vent, ragged and bright, with a darker side on the right.
    const col: Vec2[] = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      col.push([vx + lean * t * t + Math.sin(t * 7 + ph[0]) * 0.7, vy - o.jet * t]);
    }
    const line = catmullRom(col, 4);
    const widths = line.map((_, i) => {
      const t = i / (line.length - 1);
      return 5.4 * (1 - t * 0.55) * (1 + 0.15 * Math.sin(t * 20 + ph[1]));
    });
    shape(ctx, ribbon(line, widths.map((v) => v + 1.5)), { fill: rgba(WATER.line, 0.85), smooth: false });
    shape(ctx, ribbon(line, widths), { fill: linearGradient(ctx, vx - 3, 0, vx + 3, 0, [WATER.foam, WATER.pale, WATER.mid]), smooth: false });
    shape(ctx, ribbon(line.map((p): Vec2 => [p[0] - 0.8, p[1]]), widths.map((v) => v * 0.28)), { fill: rgba('#ffffff', 0.95), smooth: false });
    // Spray: thin tapered arcs fanning out and falling from the top of the column.
    const sprays = o.sprays ?? 2;
    const topX = vx + lean;
    const topY = vy - o.jet;
    for (let i = 0; i < sprays; i++) {
      const dir = sprays === 1 ? 0.4 : (i / (sprays - 1)) * 2 - 1;
      const reach = (7 + o.jet * 0.32) * rand.range(0.7, 1) * (0.55 + Math.abs(dir) * 0.5);
      const arc: Vec2[] = [];
      for (let k = 0; k <= 9; k++) {
        const t = k / 9;
        arc.push([topX + dir * reach * t, topY - o.jet * 0.1 * (1 - Math.abs(dir)) * Math.sin(t * Math.PI) + o.jet * 0.34 * t * t * (0.5 + Math.abs(dir))]);
      }
      const widths = arc.map((_, k) => 3 * (1 - (k / 9) ** 0.8) + 0.5);
      shape(ctx, ribbon(arc, widths.map((v) => v + 1.1)), { fill: rgba(WATER.line, 0.75), smooth: false });
      shape(ctx, ribbon(arc, widths), { fill: WATER.pale, smooth: false });
      const e = arc[arc.length - 1]!;
      dot(ctx, e[0] + dir * 1.2, e[1] + 1.4, 0.9, '#ffffff');
    }
    for (let i = 0; i < 4 + Math.round(o.jet / 10); i++) {
      const dx = rand.range(-1, 1) * (7 + o.jet * 0.25);
      droplet(ctx, topX + dx, topY + rand.range(-3, o.jet * 0.32) + Math.abs(dx) * 0.4, rand.range(0.55, 1));
    }
    // Splash ring at the foot of the column.
    ellipse(ctx, vx, vy + 0.6, rimR * 0.6, rimRy * 0.55, { stroke: rgba('#ffffff', 0.9), width: 1.2 });
    for (let i = 0; i < 4; i++) droplet(ctx, vx + rand.range(-1, 1) * rimR * 0.6, vy + rand.range(-0.5, 0.5), rand.range(0.6, 1));
  } else {
    for (let i = 0; i < 4; i++) {
      const a = rand.range(0, 6.28);
      ellipse(ctx, vx + Math.cos(a) * rimR * 0.35, vy + Math.sin(a) * rimRy * 0.3, 1.6, 1.1, { fill: '#ffffff', stroke: rgba(WATER.line, 0.8), width: 0.6 });
    }
  }
  return [vx, vy];
}

export interface SpringOptions {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rand: Rng;
  ink: string;
  /** Mineral crust around the pool. */
  crust: SinterTones;
  /** Concentric bands from the rim to the middle of the pool. */
  bands: readonly string[];
  /** Number of lobes in the pool outline (1 = round). */
  lobes?: number;
  /** Bubbling mud instead of clear water. */
  mud?: boolean;
  rocks?: number;
}

/** A steaming pool of coloured water inside a lumpy rim of mineral crust. */
export function drawHotSpring(ctx: Ctx2D, o: SpringOptions): void {
  const { rand, cx, cy, rx, ry, ink, crust } = o;
  softBlob(ctx, cx + rx * 0.08, cy + ry * 0.35, rx * 1.4, ry * 1.4, '#1d160c', 0.3);
  const outer = blob(rand, cx, cy, rx * 1.3, ry * 1.3, { points: 18, jitter: 0.07, lobes: o.lobes ?? 1, lobeAmp: (o.lobes ?? 1) > 1 ? 0.12 : 0.04 });
  shape(ctx, outer, { fill: linearGradient(ctx, cx - rx, cy - ry, cx + rx, cy + ry, [crust.lit, crust.base, crust.shade]), stroke: ink, width: 1.3 });
  stipple(ctx, rand, outer, Math.round(rx * 0.8), { color: crust.shade, radius: 0.7, alpha: 0.45 });

  const scale = (pts: readonly Vec2[], k: number, dy = 0): Vec2[] => pts.map((p): Vec2 => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k + dy]);
  const pool = scale(outer, 0.8, 0.5);
  shape(ctx, pool, { fill: rgba(crust.stain, 0.55), stroke: rgba(ink, 0.65), width: 1 });
  clipped(ctx, pool, () => {
    const n = o.bands.length;
    o.bands.forEach((c, i) => {
      const k = 1 - (i + 1) / (n + 0.4);
      shape(ctx, scale(outer, 0.8 * Math.max(0.12, k), 0.5 + i * 0.25), { fill: c, smooth: true });
    });
    if (o.mud) {
      for (let i = 0; i < 6; i++) {
        const a = rand.range(0, 6.28);
        const d = Math.sqrt(rand.next()) * 0.6;
        const r = rand.range(1.3, 2.6);
        ellipse(ctx, cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, r, r * 0.8, { fill: rgba(o.bands[0] ?? '#8b7b66', 0.9), stroke: rgba('#2a2015', 0.55), width: 0.7 });
        ellipse(ctx, cx + Math.cos(a) * rx * d - r * 0.3, cy + Math.sin(a) * ry * d - r * 0.3, r * 0.35, r * 0.25, { fill: rgba('#ffffff', 0.55) });
      }
    } else {
      ellipse(ctx, cx - rx * 0.3, cy - ry * 0.35, rx * 0.34, ry * 0.2, { fill: rgba('#ffffff', 0.5), rotation: -0.2 });
      for (let i = 0; i < 3; i++) {
        const x = cx + rand.range(-0.5, 0.4) * rx;
        const y = cy + rand.range(-0.2, 0.5) * ry;
        shape(ctx, [[x, y], [x + rand.range(3, 7), y + 0.2]], { stroke: rgba('#ffffff', 0.6), width: 0.9, closed: false });
      }
    }
  });
  shape(ctx, scale(pool, 1, 0).slice(), { stroke: rgba('#fff7dc', 0.55), width: 0.8 });

  const rocks = o.rocks ?? 5;
  const items: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < rocks; i++) {
    const a = rand.range(0.05, 1.95) * Math.PI;
    items.push({ x: cx + Math.cos(a) * rx * rand.range(1.2, 1.5), y: cy + Math.sin(a) * ry * rand.range(1.2, 1.55), r: rand.range(1.8, 3.6) });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) {
    drawBoulder(ctx, { cx: it.x, cy: it.y, rx: it.r, ry: it.r * 0.78, rock: mix(crust.base, '#8e9197', 0.35), ink, rand, shadow: false, simple: it.r < 2.4 });
  }
  for (let i = 0; i < 2; i++) tuft(ctx, cx + rand.range(-1.45, 1.45) * rx, cy + ry * rand.range(0.9, 1.5), 2.6, '#6b7f3c', 0.9);
  drawSteam(ctx, rand, cx + rx * 0.1, cy - ry * 0.2, ry * 2.6, 3, ry * 0.8);
}
