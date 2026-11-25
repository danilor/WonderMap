import { mix, rgba } from '../kit/colors';
import { clipped, ellipse, linearGradient, shape, softBlob, stipple } from '../kit/draw';
import { catmullRom, ellipsePoints, ribbon } from '../kit/shapes';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { drawBoulder } from './relief-common';
import { LAVA, drawGlow, drawLavaRiver } from './relief-fire';
import { brushLine } from './relief-hill';

export interface RockTones {
  lit: string;
  base: string;
  shade: string;
  deep: string;
  /** Light stripe along the crests of the ridges. */
  ridge: string;
}

export const VOLCANO_ROCK = {
  basalt: { lit: '#9a8478', base: '#6e5b57', shade: '#4a3d41', deep: '#2f272d', ridge: '#b9a393' },
  umber: { lit: '#b39274', base: '#85664f', shade: '#5d4638', deep: '#3a2b26', ridge: '#d1b394' },
  red: { lit: '#c4806a', base: '#9a5645', shade: '#6e3a35', deep: '#44262a', ridge: '#e0a38a' },
  gray: { lit: '#a7a6a9', base: '#7d7b82', shade: '#57555e', deep: '#38363f', ridge: '#c9c8cb' },
  ash: { lit: '#706d79', base: '#4d4b58', shade: '#343240', deep: '#211f2a', ridge: '#938fa0' },
  tan: { lit: '#c9ae82', base: '#a1855f', shade: '#76604a', deep: '#4f3f35', ridge: '#e2cca1' },
} as const satisfies Record<string, RockTones>;

export const GRASS = { lit: '#a6c46a', base: '#7fa24f', deep: '#4f7438', tuft: '#46702f' } as const;

export type CraterKind = 'lava' | 'dark' | 'water' | 'acid' | 'snow';

export interface VolcanoStream {
  /** Sideways position on the front of the cone: -1 = left silhouette, 1 = right silhouette. */
  u: number;
  /** How far the stream runs down the flank (1 = to the foot). */
  reach: number;
  /** Width at the tongue. */
  width: number;
}

export interface VolcanoOptions {
  cx: number;
  /** Ground line at the left and right feet. */
  baseY: number;
  /** Width of the cone at its foot. */
  w: number;
  /** Height of the crater rim above `baseY`. */
  h: number;
  rand: Rng;
  ink: string;
  rock: RockTones;
  crater: CraterKind;
  /** Rim radius as a fraction of the foot radius. Default 0.28. */
  rim?: number;
  /** Opening radius as a fraction of the rim radius. Default 0.74. */
  open?: number;
  /** Flank concavity (1 = straight cone, 2 = trumpet). Default 1.8. */
  curve?: number;
  curveL?: number;
  curveR?: number;
  /** Shifts the crater to the right (px). */
  lean?: number;
  /** Raises the back rim on one side (px; negative = left, positive = right). */
  horn?: number;
  /** Vertical squash of the foot ellipse. Default 0.2. */
  tilt?: number;
  /** Vertical squash of the crater ellipse. Default 0.4. */
  rimTilt?: number;
  streams?: readonly VolcanoStream[];
  /** Radial ridges. Default scales with the width. */
  gullies?: number;
  /** Snow cover on top, as a fraction of the height. */
  snow?: number;
  /** Grass at the foot, as a fraction of the height. */
  green?: number;
  /** Boulders lying around the foot. Default 6. */
  rubble?: number;
  /** Orange light on the crater lip (0-1). Default 0.35 for lava craters. */
  glow?: number;
  /** Darker scorched ground around the foot. */
  scorch?: number;
}

export interface VolcanoGeometry {
  /** Where smoke leaves the crater. */
  vent: Vec2;
  rimRx: number;
  rimRy: number;
  /** Highest point of the silhouette. */
  top: number;
  /** A point on the cone: u = -1..1 around the front, s = 0 (foot) .. 1 (rim). */
  at: (u: number, s: number) => Vec2;
}

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

/** Fills an ellipse with a radial gradient squashed to its aspect ratio (hot centre, cool edge). */
export function ovalGradient(ctx: Ctx2D, cx: number, cy: number, rx: number, ry: number, stops: readonly (readonly [number, string])[], fx = 0, fy = 0): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(fx * rx, fy * rx, 0, 0, 0, rx);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

interface FloorSpec {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

/** The bottom of a crater or caldera: glowing lava, still water, acid, bare earth or snow. */
function paintFloor(ctx: Ctx2D, rand: Rng, kind: CraterKind, f: FloorSpec, rock: RockTones, ink: string, lw: number): void {
  if (kind === 'lava') {
    ovalGradient(ctx, f.x, f.y, f.rx * 1.08, f.ry * 1.08, [[0, LAVA.deep], [1, LAVA.crust]]);
    ovalGradient(ctx, f.x, f.y, f.rx, f.ry, [[0, LAVA.core], [0.3, LAVA.hot], [0.62, LAVA.mid], [1, LAVA.red]], -0.12, -0.1);
    const plates = Math.max(3, Math.round(f.rx / 4));
    for (let i = 0; i < plates; i++) {
      const a = rand.range(0, Math.PI * 2);
      const d = Math.sqrt(rand.next()) * 0.8;
      const r = rand.range(0.1, 0.2) * f.rx;
      ellipse(ctx, f.x + Math.cos(a) * f.rx * d, f.y + Math.sin(a) * f.ry * d, r * 1.4, r * 0.7, { fill: rgba(LAVA.crust, 0.78), rotation: rand.range(-0.5, 0.5) });
    }
    ellipse(ctx, f.x, f.y, f.rx, f.ry, { stroke: rgba(LAVA.crust, 0.8), width: Math.max(0.8, lw * 0.8) });
    return;
  }
  if (kind === 'water' || kind === 'acid') {
    const water = kind === 'water';
    const shore = water ? '#e9f5ef' : '#f4f1bd';
    ellipse(ctx, f.x, f.y, f.rx * 1.06, f.ry * 1.08, { fill: rgba(mix(rock.lit, '#ffffff', 0.35), 0.9) });
    ovalGradient(ctx, f.x, f.y, f.rx, f.ry, water ? [[0, '#9fe6e2'], [0.55, '#4fb4c6'], [1, '#2b7d9d']] : [[0, '#ecf590'], [0.5, '#b5d04a'], [1, '#7a9a32']], -0.2, -0.2);
    ellipse(ctx, f.x, f.y, f.rx, f.ry, { stroke: rgba(shore, 0.8), width: Math.max(0.8, lw * 0.7) });
    for (let i = 0; i < 3; i++) {
      const y = f.y + f.ry * rand.range(-0.4, 0.5);
      const x = f.x + f.rx * rand.range(-0.5, 0.35);
      shape(ctx, [[x, y], [x + f.rx * rand.range(0.2, 0.4), y + 0.2]], { stroke: 'rgba(255,255,255,0.65)', width: 0.9, closed: false });
    }
    return;
  }
  if (kind === 'snow') {
    ovalGradient(ctx, f.x, f.y, f.rx, f.ry, [[0, '#ffffff'], [0.7, '#e6eefa'], [1, '#b7c8e2']], -0.2, -0.2);
    return;
  }
  ovalGradient(ctx, f.x, f.y, f.rx, f.ry, [[0, mix(rock.deep, rock.shade, 0.5)], [1, rock.deep]]);
  for (let i = 0; i < 3; i++) {
    const r = rand.range(0.1, 0.18) * f.rx;
    ellipse(ctx, f.x + rand.range(-0.6, 0.6) * f.rx, f.y + rand.range(-0.4, 0.4) * f.ry, r * 1.3, r * 0.8, { fill: rgba(rock.base, 0.7), stroke: rgba(ink, 0.5), width: 0.6 });
  }
  ellipse(ctx, f.x, f.y, f.rx, f.ry, { stroke: rgba(ink, 0.55), width: 0.9 });
}

/** A concave cone with a crater, radial gullies and (optionally) lava streams, snow or a grassy skirt. */
export function drawVolcano(ctx: Ctx2D, o: VolcanoOptions): VolcanoGeometry {
  const { rand, cx, baseY, w, h, rock, ink } = o;
  const footR = w / 2;
  const rimR = footR * (o.rim ?? 0.28);
  const curveL = o.curveL ?? o.curve ?? 1.8;
  const curveR = o.curveR ?? o.curve ?? 1.8;
  const tilt = o.tilt ?? 0.2;
  const rimTilt = o.rimTilt ?? 0.4;
  const lean = o.lean ?? 0;
  const rimY = baseY - h;
  const rimRy = rimR * rimTilt;
  const rimCx = cx + lean;
  const lw = clamp(w * 0.016, 1.1, 2);
  const m = 24;
  const ph = [0, 1, 2, 3, 4, 5].map(() => rand.range(0, 6.3));
  // One flank gets a shoulder: a bulge where an old lava lobe settled.
  const shoulderSide = rand.sign();
  const shoulderAt = rand.range(0.25, 0.65);
  const horn = o.horn ?? 0;

  const radius = (s: number, u: number): number => {
    const k = (clamp(u, -1, 1) + 1) / 2;
    const rl = rimR + (footR - rimR) * (1 - s) ** curveL;
    const rr = rimR + (footR - rimR) * (1 - s) ** curveR;
    return rl + (rr - rl) * k;
  };
  const at = (u: number, s: number): Vec2 => {
    const r = radius(s, u);
    const t = tilt + (rimTilt - tilt) * s * s;
    return [cx + lean * s + u * r, baseY - h * s + r * t * Math.sqrt(Math.max(0, 1 - u * u))];
  };
  const edge = (side: -1 | 1, s: number): Vec2 => {
    const k = side < 0 ? 0 : 2;
    let n = Math.sin(s * 9 + ph[k]!) * 0.04 + Math.sin(s * 21 + ph[k + 1]!) * 0.022;
    if (side === shoulderSide) n += 0.055 * Math.exp(-(((s - shoulderAt) / 0.11) ** 2));
    n *= Math.sin(Math.PI * s) ** 0.5;
    return [cx + lean * s + side * radius(s, side) * (1 + n), baseY - h * s];
  };
  // A point on the (slightly irregular) crater rim at angle `a`; `k` scales it towards the centre.
  const rimAt = (a: number, k: number, dy = 0): Vec2 => {
    const back = Math.max(0, -Math.sin(a));
    const n = 1 + 0.08 * (Math.sin(a * 3 + ph[2]!) * 0.6 + Math.sin(a * 5 + ph[3]!) * 0.4) + 0.06 * back * Math.sin(a * 9 + ph[4]!);
    const hornA = horn < 0 ? 1.22 * Math.PI : 1.78 * Math.PI;
    const up = -Math.abs(horn) * Math.exp(-(((a - hornA) / 0.4) ** 2)) * back * k;
    return [rimCx + Math.cos(a) * rimR * k * (1 + 0.04 * Math.sin(a) * Math.sin(a * 4 + ph[0]!)), rimY + dy + Math.sin(a) * rimRy * k * n + up];
  };

  const leftEdge: Vec2[] = [];
  const rightEdge: Vec2[] = [];
  for (let i = 0; i <= m; i++) {
    leftEdge.push(edge(-1, i / m));
    rightEdge.push(edge(1, i / m));
  }
  const backArc: Vec2[] = [];
  for (let i = 1; i < 14; i++) backArc.push(rimAt(Math.PI + (i / 14) * Math.PI, 1));
  const footArc: Vec2[] = [];
  for (let i = 1; i < 18; i++) {
    const a = (i / 18) * Math.PI;
    const k = 1 + 0.1 * Math.sin(a * 5 + ph[1]!) * Math.sin(a * 2 + ph[3]!);
    footArc.push([cx + Math.cos(a) * footR, baseY + Math.sin(a) * footR * tilt * k]);
  }
  const body: Vec2[] = [...leftEdge, ...backArc, ...rightEdge.slice().reverse(), ...footArc];
  const top = rimY - rimRy - Math.abs(horn);
  const bottom = baseY + footR * tilt;

  softBlob(ctx, cx + w * 0.07, baseY + footR * tilt * 0.8, footR * 1.06, footR * tilt * 1.5 + 2, '#1d160c', 0.36);
  if (o.scorch) softBlob(ctx, cx, baseY + footR * tilt * 0.5, footR * 1.2, footR * tilt * 2.1, rock.deep, o.scorch);
  // Ash and cinders thrown out around the foot.
  stipple(ctx, rand, ellipsePoints(cx, baseY + footR * tilt * 0.45, footR * 1.1, footR * tilt * 1.35, 20), Math.round(w * 0.5), { color: rock.deep, radius: 0.75, alpha: 0.4 });

  shape(ctx, body, { fill: linearGradient(ctx, cx - footR * 0.62, 0, cx + footR * 0.72, 0, [[0, rock.lit], [0.36, rock.base], [0.76, rock.shade], [1, rock.deep]]), smooth: false });

  clipped(ctx, body, () => {
    // Foot darkening and a lighter, sun-struck crown.
    shape(ctx, body, { fill: linearGradient(ctx, 0, top, 0, bottom, [[0, rgba(rock.ridge, 0.28)], [0.28, rgba(rock.ridge, 0)], [0.66, rgba(rock.deep, 0)], [1, rgba(rock.deep, 0.42)]]), smooth: false });

    // Terminator: a soft shaded band down the right flank.
    const band: Vec2[] = [];
    for (let i = 0; i <= m; i++) {
      const s = 1 - i / m;
      band.push(at(0.18 + 0.2 * (1 - s), s));
    }
    shape(ctx, [...band, ...rightEdge.slice().reverse().map((p): Vec2 => [p[0] + 3, p[1]])], {
      fill: linearGradient(ctx, cx + footR * 0.2, 0, cx + footR * 0.85, 0, [rgba(rock.deep, 0), rgba(rock.deep, 0.5)]),
      smooth: false,
    });

    // Radial gullies: narrow near the crater, wider toward the foot, with a lit crest on their left.
    const count = o.gullies ?? Math.round(w / 8);
    for (let i = 0; i < count; i++) {
      const u0 = -0.92 + (1.84 * (i + rand.range(0.15, 0.85))) / count;
      const s1 = rand.range(0.84, 0.98);
      const s0 = rand.range(0.0, 0.22);
      const sway = rand.range(-0.07, 0.07);
      const pts: Vec2[] = [];
      const n = 6;
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        pts.push(at(clamp(u0 * (1 + 0.05 * t) + sway * Math.sin(t * Math.PI * 1.5), -0.97, 0.97), s1 + (s0 - s1) * t));
      }
      const line = catmullRom(pts, 4);
      const k0 = rand.range(0.85, 1.4);
      const widths = line.map((_, k) => (0.5 + 2.3 * (k / (line.length - 1)) ** 1.15) * k0);
      shape(ctx, ribbon(line, widths), { fill: rgba(rock.deep, u0 > 0.3 ? 0.62 : 0.5), smooth: false });
      if (u0 < 0.55) {
        const crest = catmullRom(pts.slice(0, 5).map((p, k): Vec2 => [p[0] - 1.7 - (1 - k / n) * 0.5, p[1]]), 4);
        shape(ctx, crest, { stroke: rgba(rock.ridge, u0 < 0 ? 0.62 : 0.4), width: 0.9, closed: false });
      }
    }
    // Short strata strokes that wrap around the cone.
    const strata = Math.round(w / 4);
    for (let i = 0; i < strata; i++) {
      const s = rand.range(0.08, 0.93);
      const u0 = rand.range(-0.9, 0.75);
      const du = rand.range(0.1, 0.24);
      const lit = u0 < 0.15;
      shape(ctx, [at(u0, s), at(u0 + du * 0.5, s - 0.012), at(u0 + du, s)], { stroke: rgba(lit ? rock.ridge : rock.deep, lit ? 0.42 : 0.4), width: 0.8, closed: false, smooth: true });
    }
    stipple(ctx, rand, body, Math.round(w * 0.7), { color: rock.deep, radius: 0.7, alpha: 0.38 });

    if (o.green && o.green > 0) {
      const ph2 = rand.range(0, 6);
      // Forested lower slopes: a ragged upper edge with bushy bumps along it.
      const sG = (u: number): number => o.green! * (0.62 + 0.38 * Math.abs(Math.sin(u * 4.6 + ph2)) ** 0.7 + 0.13 * Math.sin(u * 19 + ph2 * 2.1));
      const upper: Vec2[] = [];
      const bumps = 56;
      for (let i = 0; i <= bumps; i++) {
        const u = -1 + (2 * i) / bumps;
        upper.push(at(u, sG(u)));
      }
      const iL = Math.ceil(sG(-1) * m);
      const iR = Math.ceil(sG(1) * m);
      const patch: Vec2[] = [...upper, ...rightEdge.slice(0, iR).reverse(), ...footArc, ...leftEdge.slice(0, iL)];
      const gTop = baseY - h * o.green * 1.1;
      shape(ctx, patch, { fill: linearGradient(ctx, 0, gTop, 0, bottom, [rgba(GRASS.base, 0), rgba(GRASS.base, 0.8), rgba(GRASS.deep, 0.92)]), smooth: false });
      for (let i = 1; i < bumps; i += 2) {
        const p = upper[i]!;
        const r = rand.range(1.6, 2.8);
        ellipse(ctx, p[0], p[1] + r * 0.3, r * 1.2, r, { fill: rgba(GRASS.tuft, 0.8) });
        ellipse(ctx, p[0] - r * 0.2, p[1] - r * 0.1, r * 1.05, r * 0.85, { fill: i % 4 === 1 ? GRASS.lit : GRASS.base });
      }
      stipple(ctx, rand, patch, Math.round(w * 0.35), { color: GRASS.tuft, radius: 0.8, alpha: 0.55 });
    }

    if (o.snow && o.snow > 0) {
      const ph2 = rand.range(0, 6);
      const sE = (u: number): number => 1 - o.snow! * (0.62 + 0.46 * Math.abs(Math.sin(u * 5 + ph2)) ** 0.55) * (1 - 0.22 * Math.abs(u));
      const lower: Vec2[] = [];
      for (let i = 0; i <= 40; i++) {
        const u = -1 + (2 * i) / 40;
        lower.push(at(u, sE(u)));
      }
      const iL = Math.ceil(sE(-1) * m);
      const iR = Math.ceil(sE(1) * m);
      const cap: Vec2[] = [...lower, ...rightEdge.slice(iR), ...backArc.slice().reverse(), ...leftEdge.slice(iL).reverse()];
      shape(ctx, cap, { fill: linearGradient(ctx, cx - footR * 0.5, top, cx + footR * 0.6, top + h * 0.4, ['#ffffff', '#eef4fc', '#b6c8e3']), smooth: false });
      shape(ctx, lower, { stroke: rgba('#4a5c80', 0.55), width: 0.9, closed: false, smooth: true });
    }

    // The sun catches the upper-left silhouette.
    shape(ctx, leftEdge.slice(3).map((p): Vec2 => [p[0] + lw * 1.1, p[1] + lw * 0.9]), { stroke: rgba(rock.ridge, 0.55), width: lw * 0.9, closed: false, smooth: true });
  });

  // Fallen rock around the foot.
  const rubble: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < (o.rubble ?? 6); i++) {
    const a = rand.range(0.04, 0.96) * Math.PI;
    rubble.push({ x: cx + Math.cos(a) * footR * rand.range(0.92, 1.04), y: baseY + Math.sin(a) * footR * tilt * rand.range(0.7, 1.05), r: rand.range(1.8, 3.6) * clamp(w / 100, 0.8, 1.3) });
  }
  rubble.sort((a, b) => a.y - b.y);
  for (const b of rubble) drawBoulder(ctx, { cx: b.x, cy: b.y - b.r * 0.4, rx: b.r, ry: b.r * 0.8, rock: rock.base, ink, rand, shadow: false, simple: b.r < 2.4 });
  shape(ctx, footArc, { stroke: rgba(ink, 0.38), width: lw * 0.7, closed: false, smooth: true });

  // Crater.
  const lava = o.crater === 'lava';
  const openRx = rimR * (o.open ?? 0.74);
  const openRy = rimRy * (o.open ?? 0.74) * 0.96;
  const rimPoly: Vec2[] = [];
  const opening: Vec2[] = [];
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2;
    rimPoly.push(rimAt(a, 1));
    opening.push(rimAt(a, o.open ?? 0.74, rimRy * 0.04));
  }
  const glow = o.glow ?? (lava ? 0.38 : 0);
  if (glow > 0) drawGlow(ctx, rimCx, rimY - rimRy * 0.2, rimR * 1.9, rimRy * 3 + 4, glow);

  shape(ctx, rimPoly, {
    fill: linearGradient(ctx, rimCx - rimR, rimY - rimRy, rimCx + rimR, rimY + rimRy, [o.snow ? '#ffffff' : rock.ridge, o.snow ? '#e9f0fa' : rock.lit, o.snow ? '#b6c8e3' : rock.base, rock.shade]),
    stroke: ink,
    width: lw * 0.9,
  });
  shape(ctx, opening, { fill: rock.deep, stroke: rgba(ink, 0.95), width: lw * 0.8 });
  clipped(ctx, opening, () => {
    const wallTop = rimY - rimRy;
    shape(ctx, ellipsePoints(rimCx, rimY, openRx + 2, openRy + 2, 24), {
      fill: linearGradient(ctx, rimCx - openRx, wallTop, rimCx + openRx, rimY + openRy, [[0, rock.shade], [0.5, rock.deep], [1, lava ? '#6b2217' : mix(rock.deep, rock.shade, 0.4)]]),
    });
    // The back wall catches a little light on its right side.
    ellipse(ctx, rimCx + openRx * 0.45, rimY - openRy * 0.3, openRx * 0.4, openRy * 0.45, { fill: rgba(rock.lit, o.snow ? 0.55 : 0.3) });
    paintFloor(ctx, rand, o.crater, { x: rimCx + openRx * 0.02, y: rimY + openRy * 0.5, rx: openRx * 0.86, ry: openRy * 0.78 }, rock, ink, lw);
  });
  shape(ctx, opening.filter((_, i) => i >= 2 && i <= 20), { stroke: rgba(lava ? LAVA.hot : rock.ridge, lava ? 0.55 : 0.3), width: lw * 0.7, closed: false, smooth: true });

  // Broken chunks of rim around the back and sides.
  const chunks = Math.round(rimR / 3.2);
  for (let i = 0; i < chunks; i++) {
    const p = rimAt(Math.PI * rand.range(0.98, 2.02), rand.range(0.92, 1));
    const r = rand.range(1.4, 2.5);
    drawBoulder(ctx, { cx: p[0], cy: p[1], rx: r, ry: r * 0.8, rock: rock.lit, ink, rand, shadow: false, simple: true });
  }

  // Lava streams pour over the lip and run down the flank.
  for (const st of o.streams ?? []) {
    const reach = clamp(st.reach, 0.1, 1);
    const steps = 7;
    const sway = rand.range(0.07, 0.15) * rand.sign();
    const pts: Vec2[] = [[rimCx + st.u * openRx * 0.5, rimY + openRy * 0.38]];
    const widths: number[] = [1.6];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = clamp(st.u * (1 + 0.2 * t) + sway * Math.sin(t * 5.2 + st.u * 3) * Math.min(1, t * 3), -0.94, 0.94);
      pts.push(at(u, 0.995 - t * reach * 0.97));
      widths.push(2 + (st.width - 2) * t ** 0.7 * (1 + 0.25 * Math.sin(t * 9 + st.u * 7)));
    }
    drawLavaRiver(ctx, rand, pts, widths, { capStart: false });
  }

  // Outline: left flank, back rim, right flank.
  brushLine(ctx, leftEdge, ink, lw * 1.3, 0.45);
  brushLine(ctx, [leftEdge[m]!, ...backArc, rightEdge[m]!], ink, lw * 1.3, 0.85);
  brushLine(ctx, rightEdge.slice().reverse(), ink, lw * 1.3, 0.45);

  return { vent: [rimCx, rimY - rimRy * 0.2], rimRx: rimR, rimRy, top, at };
}
