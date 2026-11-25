import { mix, rgba } from '../kit/colors';
import { dot, ellipse, radialGradient, shape, softBlob } from '../kit/draw';
import { catmullRom, ribbon } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';

export const LAVA = {
  core: '#ffe27a',
  hot: '#ffab2b',
  mid: '#ff701b',
  red: '#d6361a',
  deep: '#8f2411',
  crust: '#2f1511',
  glow: '#ff8a2a',
} as const;

const along = (arr: readonly number[], t: number): number => {
  if (arr.length === 1) return arr[0]!;
  const f = Math.min(arr.length - 1.0001, Math.max(0, t * (arr.length - 1)));
  const i = Math.floor(f);
  return arr[i]! + (arr[i + 1]! - arr[i]!) * (f - i);
};

export interface LavaRiverOptions {
  /** Orange halo that bleeds onto the surroundings. Default true. */
  glow?: boolean;
  /** 0 = freshly molten, 1 = mostly cooled and dark. */
  cool?: number;
  /** Round the first / last end of the stream. Default true for both. */
  capStart?: boolean;
  capEnd?: boolean;
}

/** A river of lava along `path`: dark crust rim, red body, orange middle and a hot yellow core. `widths` are interpolated along the path. */
export function drawLavaRiver(ctx: Ctx2D, rand: Rng, path: readonly Vec2[], widths: readonly number[], o: LavaRiverOptions = {}): void {
  const line = catmullRom(path, 6);
  const m = line.length;
  if (m < 2) return;
  const base = line.map((_, i) => along(widths, i / (m - 1)));
  const wobble = (phase: number, amp: number): number[] => base.map((_, i) => 1 + amp * Math.sin(i * 0.8 + phase) * Math.sin(i * 0.31 + phase * 1.7) + amp * 0.5 * Math.sin(i * 1.9 + phase * 2.3));
  const w1 = wobble(rand.range(0, 6), 0.2);
  const w2 = wobble(rand.range(0, 6), 0.34);
  const w3 = wobble(rand.range(0, 6), 0.55);
  const cool = o.cool ?? 0;
  const dir = (i: number): Vec2 => {
    const a = line[Math.max(0, i - 1)]!;
    const b = line[Math.min(m - 1, i + 1)]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  };
  // The hotter inner bands wander inside the outer ones so the stream does not read as a tube.
  const wander = (amp: number): Vec2[] => {
    const ph = rand.range(0, 6);
    return line.map((p, i): Vec2 => {
      const d = dir(i);
      const off = amp * base[i]! * Math.sin(i * 0.23 + ph);
      return [p[0] - d[1] * off, p[1] + d[0] * off];
    });
  };

  const layer = (k: number, fill: string, jit: readonly number[], center: readonly Vec2[] = line): void => {
    shape(ctx, ribbon(center, base.map((w, i) => Math.max(0.5, w * k * jit[i]!))), { fill, smooth: false });
  };
  const caps = (k: number, fill: string): void => {
    if (o.capStart !== false) ellipse(ctx, line[0]![0], line[0]![1], (base[0]! * k) / 2, (base[0]! * k) / 2.1, { fill });
    if (o.capEnd !== false) ellipse(ctx, line[m - 1]![0], line[m - 1]![1], (base[m - 1]! * k) / 2, (base[m - 1]! * k) / 2.1, { fill });
  };

  if (o.glow !== false) {
    layer(3.2, rgba(LAVA.glow, 0.1), w1);
    layer(2.2, rgba(LAVA.glow, 0.14), w1);
  }
  layer(1.26, LAVA.crust, w1);
  caps(1.26, LAVA.crust);
  layer(1, cool > 0.5 ? LAVA.deep : LAVA.red, w1);
  caps(1, cool > 0.5 ? LAVA.deep : LAVA.red);
  layer(0.72, cool > 0.5 ? LAVA.red : LAVA.mid, w2, wander(0.06));
  if (cool < 0.8) {
    layer(0.42, LAVA.hot, w2, wander(0.1));
    layer(0.17, LAVA.core, w3, wander(0.14));
  }

  // Dark crust plates drifting along the edges.
  for (let i = 4; i < m - 3; i += rand.int(5, 9)) {
    const p = line[i]!;
    const d = dir(i);
    const off = rand.range(-0.3, 0.3) * base[i]!;
    const r = base[i]! * rand.range(0.1, 0.16);
    ellipse(ctx, p[0] - d[1] * off, p[1] + d[0] * off, r * 2, r * 0.8, { fill: rgba(LAVA.crust, 0.72), rotation: Math.atan2(d[1], d[0]) + rand.range(-0.3, 0.3) });
  }
}

export interface CloudTones {
  lit: string;
  base: string;
  shade: string;
  line: string;
}

export const SMOKE = {
  gray: { lit: '#e9e3e1', base: '#b9b0b0', shade: '#827a84', line: '#3a3236' },
  dark: { lit: '#958c94', base: '#655d67', shade: '#3f3a45', line: '#1f1a21' },
  ash: { lit: '#aca4a8', base: '#7b7378', shade: '#4d474f', line: '#27222a' },
  steam: { lit: '#ffffff', base: '#eaf1f4', shade: '#bccad4', line: '#5e6e7c' },
} as const satisfies Record<string, CloudTones>;

export interface Puff {
  x: number;
  y: number;
  r: number;
}

/** Overlapping puffs with one merged ink outline, soft light from the upper left and swirl marks on the lower right. `glow(p)` blends a puff towards lava orange (underlit smoke). */
export function drawCloud(ctx: Ctx2D, rand: Rng, puffs: readonly Puff[], tones: CloudTones, lw = 1.1, glow?: (p: Puff) => number): void {
  for (const p of puffs) ellipse(ctx, p.x, p.y, p.r + lw, p.r * 0.94 + lw, { fill: tones.line });
  for (const p of puffs) {
    const g = glow ? glow(p) : 0;
    const tint = (c: string): string => (g > 0.02 ? mix(c, LAVA.glow, g) : c);
    ellipse(ctx, p.x, p.y, p.r, p.r * 0.94, {
      fill: radialGradient(ctx, p.x, p.y, p.r * 1.15, p.r * 1.15, [[0, tint(tones.lit)], [0.5, tint(tones.base)], [1, tint(tones.shade)]], p.x - p.r * 0.38, p.y - p.r * 0.42),
    });
  }
  ctx.save();
  ctx.strokeStyle = rgba(tones.line, 0.4);
  ctx.lineWidth = Math.max(0.6, lw * 0.6);
  ctx.lineCap = 'round';
  for (const p of puffs) {
    const a0 = rand.range(0.1, 0.5) * Math.PI;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 0.72, a0, a0 + rand.range(0.7, 1.2));
    ctx.stroke();
  }
  ctx.restore();
}

export interface PlumeOptions {
  x: number;
  y: number;
  /** Total rise of the column (to the centre of the top puff). */
  rise: number;
  /** Sideways drift at the top (positive = to the right). */
  drift: number;
  /** Puff radius at the vent and at the top. */
  r0: number;
  r1: number;
  puffs: number;
  tones: CloudTones;
  lw?: number;
  /** How strongly lava light tints the lower part of the smoke (0-1). */
  underglow?: number;
}

/** A billowing column that widens as it rises and ends in a rounded crown. Returns the puffs so callers can add glow or sparks. */
export function drawPlume(ctx: Ctx2D, rand: Rng, o: PlumeOptions): Puff[] {
  const puffs: Puff[] = [];
  const phase = rand.range(0, 6);
  let crown: Puff = { x: o.x, y: o.y, r: o.r0 };
  for (let i = 0; i < o.puffs; i++) {
    const t = i / Math.max(1, o.puffs - 1);
    const r = o.r0 + (o.r1 - o.r0) * t ** 0.85;
    const curl = Math.sin(t * 4.2 + phase) * o.r0 * 0.7 * (1 - t * 0.4);
    const p: Puff = {
      x: o.x + o.drift * t ** 1.5 + curl + rand.range(-0.2, 0.2) * r,
      y: o.y - o.rise * t ** 0.92 + rand.range(-0.1, 0.1) * r,
      r: r * rand.range(0.88, 1.1),
    };
    puffs.push(p);
    crown = p;
    // Side lobes on the larger puffs give the column its cauliflower edge.
    if (t > 0.25) {
      puffs.push({ x: p.x - r * rand.range(0.55, 0.8), y: p.y + r * rand.range(0.1, 0.3), r: r * rand.range(0.5, 0.7) });
      puffs.push({ x: p.x + r * rand.range(0.55, 0.8), y: p.y + r * rand.range(0.05, 0.3), r: r * rand.range(0.5, 0.7) });
    }
  }
  for (let k = 0; k < 3; k++) {
    const a = -Math.PI / 2 + (k - 1) * 0.95;
    puffs.push({ x: crown.x + Math.cos(a) * crown.r * 0.72, y: crown.y + Math.sin(a) * crown.r * 0.5, r: crown.r * rand.range(0.5, 0.64) });
  }
  // Newest (lowest) puffs sit in front of the older ones above them.
  const ordered = puffs.slice().sort((a, b) => a.y - b.y);
  const under = o.underglow ?? 0;
  const lowest = o.y;
  const span = Math.max(1, o.rise);
  drawCloud(ctx, rand, ordered, o.tones, o.lw ?? 1.1, under > 0 ? (p) => under * Math.max(0, 1 - (lowest - p.y) / (span * 0.75)) ** 1.5 : undefined);
  return puffs;
}

/** Hot glowing sparks with short trails. */
export function drawSparks(ctx: Ctx2D, rand: Rng, x: number, y: number, spreadX: number, spreadY: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const px = x + rand.range(-1, 1) * spreadX;
    const py = y - rand.next() ** 0.8 * spreadY;
    const len = rand.range(1.5, 4.5);
    const ang = rand.range(-0.5, 0.5) - Math.PI / 2;
    const tx = px - Math.cos(ang) * len;
    const ty = py - Math.sin(ang) * len;
    shape(ctx, [[tx, ty], [px, py]], { stroke: rgba(LAVA.hot, 0.65), width: 0.9, closed: false });
    const r = rand.range(0.7, 1.5);
    dot(ctx, px, py, r * 2.2, rgba(LAVA.glow, 0.28));
    dot(ctx, px, py, r, rand.chance(0.5) ? LAVA.core : LAVA.hot);
  }
}

/** Jets of molten rock thrown up from a vent: arched streaks that end in glowing bombs. */
export function drawFountain(ctx: Ctx2D, rand: Rng, x: number, y: number, height: number, spread: number, jets: number): void {
  const arcs: { pts: Vec2[]; k: number }[] = [];
  for (let i = 0; i < jets; i++) {
    const k = jets === 1 ? 0 : (i / (jets - 1)) * 2 - 1;
    const hh = height * rand.range(0.7, 1) * (1 - Math.abs(k) * 0.4);
    const dx = k * spread + rand.range(-0.2, 0.2) * spread;
    const lean = rand.range(-0.15, 0.15) * spread;
    const pts: Vec2[] = [];
    for (let j = 0; j <= 9; j++) {
      const t = j / 9;
      pts.push([x + dx * t + lean * Math.sin(t * Math.PI), y - hh * 4 * t * (1 - t)]);
    }
    arcs.push({ pts, k });
  }
  for (const a of arcs) shape(ctx, a.pts, { stroke: rgba(LAVA.glow, 0.28), width: 4.4, closed: false, cap: 'round' });
  for (const a of arcs) shape(ctx, a.pts, { stroke: LAVA.mid, width: 2.3, closed: false, cap: 'round' });
  for (const a of arcs) shape(ctx, a.pts, { stroke: LAVA.core, width: 0.9, closed: false, cap: 'round' });
  for (const a of arcs) {
    const n = rand.int(2, 3);
    for (let i = 0; i < n; i++) {
      const p = a.pts[rand.int(3, a.pts.length - 2)]!;
      const r = rand.range(1, 1.9);
      dot(ctx, p[0], p[1], r * 2.2, rgba(LAVA.glow, 0.3));
      dot(ctx, p[0], p[1], r, rand.chance(0.5) ? LAVA.core : LAVA.hot);
    }
  }
}

/** Warm light bleeding out of a vent. */
export function drawGlow(ctx: Ctx2D, x: number, y: number, rx: number, ry: number, alpha = 0.5): void {
  softBlob(ctx, x, y, rx, ry, LAVA.glow, alpha);
  softBlob(ctx, x, y, rx * 0.55, ry * 0.55, LAVA.core, alpha * 0.6);
}
