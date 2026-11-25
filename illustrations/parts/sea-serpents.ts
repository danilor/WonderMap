import { rgba } from '../kit/colors';
import { ellipse, linearGradient, shades, taper } from '../kit/draw';
import { dist, lerp, smoothstep } from '../kit/math';
import { catmullRom, cumulativeLength } from '../kit/shapes';
import type { Vec2 } from '../kit/types';
import { dorsalSpikes, paintBody, paintCoiled, serpentHead, surfaceFoam, thorn } from './sea-creature';
import type { HeadOpts, Skin } from './sea-creature';
import { FOAM, droplets, foamBlob, ripple, waterShadow } from './sea-fx';
import type { Pen } from './ship-parts';

/** Sea serpents: humps rising out of the water, a swan neck and a head. Looks are written head-left; `facing: 1` mirrors them. */

export interface Hump {
  x0: number;
  x1: number;
  /** Height of the arch above the water. */
  h: number;
  /** Moves the peak toward the tail (positive) or the head. */
  skew?: number;
  /** Body width where the hump enters and leaves the water. */
  w: [number, number];
}

export interface SerpentLook {
  skin: Skin;
  /** -1: the head is on the left, 1: on the right. */
  facing: -1 | 1;
  /** The back of the skull and the head options. */
  head: HeadOpts & { at: Vec2 };
  /** Neck control points from the head down into the water. */
  neck: Vec2[];
  neckW: [number, number];
  humps: Hump[];
  /** Tail control points from the water to the tip. */
  tail: Vec2[];
  tailW: number;
  /** Size of the dorsal spikes relative to the body width; 0 for none. */
  spikes: number;
  /** Samples between spikes (default 5) and how far their tips sweep back (default 0.5). */
  spikeEvery?: number;
  spikeSweep?: number;
  /** A fan of fins at the tip of the tail, in the skin's fin colour. */
  tailFin?: boolean;
}

/** A fan of flame-shaped fins at the tip of a tail that points along `ang`. */
function tailFan(pen: Pen, p: Vec2, ang: number, skin: Skin): void {
  const { ctx, ink, u } = pen;
  const T = shades(skin.fin);
  const fan: ReadonlyArray<readonly [number, number]> = [[-0.9, 13], [0.85, 12], [-0.45, 18], [0.42, 17], [0, 23]];
  for (const [da, len] of fan) {
    const a = ang + da;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const tip: Vec2 = [p[0] + c * len, p[1] + s * len];
    thorn(ctx, [p[0] - s * 2.6, p[1] + c * 2.6], [p[0] + s * 2.6, p[1] - c * 2.6], tip, da * 0.3, linearGradient(ctx, p[0], p[1], tip[0], tip[1], [T.shade, skin.fin, T.highlight]), ink, 1.05 * u);
  }
}

/** Control points of an arch that leaves the water at `x0` and dives back at `x1`: steep legs and a round back. */
export function archPoints(x0: number, x1: number, h: number, wl: number, skew = 0): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const s = Math.pow(Math.sin(Math.PI * t), 0.72);
    pts.push([lerp(x0, x1, t + skew * Math.sin(Math.PI * t)), wl - 0.5 - (h - 0.5) * s]);
  }
  return pts;
}

export function drawSerpent(pen: Pen, w: number, h: number, look: SerpentLook): void {
  const { ctx } = pen;
  const { skin } = look;
  const wl = Math.round(h * 0.8);
  const f = look.facing;
  const belly: 1 | -1 = f === -1 ? 1 : -1;
  const M = (p: Vec2): Vec2 => (f === 1 ? [w - p[0], p[1]] : p);

  interface Piece {
    spine: Vec2[];
    widths: number[];
  }
  const sampled = (ctrl: readonly Vec2[]): Vec2[] => {
    let len = 0;
    for (let i = 1; i < ctrl.length; i++) len += dist(ctrl[i - 1]!, ctrl[i]!);
    return catmullRom(ctrl, Math.max(4, Math.ceil(len / (ctrl.length - 1) / 1.8)));
  };
  const make = (ctrl: Vec2[], w0: number, w1: number, bulge = 0.1, pow = 1): Piece => {
    const spine = sampled(ctrl.map(M));
    const n = spine.length;
    return { spine, widths: spine.map((_, i) => lerp(w0, w1, Math.pow(i / (n - 1), pow)) * (1 + bulge * Math.sin((Math.PI * i) / (n - 1)))) };
  };
  const paint = (p: Piece): void => {
    const n = p.spine.length;
    if (look.spikes > 0) dorsalSpikes(pen, p.spine, p.widths, skin, { belly, every: look.spikeEvery ?? 5, sweep: look.spikeSweep ?? 0.5, size: (i) => (i < 4 || i > n - 5 ? 0 : look.spikes * p.widths[i]! * 0.95) });
    paintBody(pen, p.spine, p.widths, skin, { belly });
    for (const end of [0, n - 1]) {
      const q = p.spine[end]!;
      if (q[1] > wl - 1) surfaceFoam(pen, q[0], wl + 1, p.widths[end]! * 0.5 + 2);
    }
  };

  const humps = look.humps.map((hp) => make(archPoints(hp.x0, hp.x1, hp.h, wl, hp.skew), hp.w[0], hp.w[1], 0.12));
  const tail = make(look.tail, look.tailW, 1.2, 0.04, 0.85);
  const neck = make(look.neck, look.neckW[0], look.neckW[1], 0.04);

  // The body under the surface, linking the pieces that show.
  const links: Piece[] = [neck, ...humps, tail];
  for (let i = 0; i + 1 < links.length; i++) {
    const a = links[i]!;
    const b = links[i + 1]!;
    const pa = a.spine[a.spine.length - 1]!;
    const pb = b.spine[0]!;
    const wa = a.widths[a.widths.length - 1]!;
    const wb = b.widths[0]!;
    const from: Vec2 = f === -1 ? pa : pb;
    const to: Vec2 = f === -1 ? pb : pa;
    taper(ctx, catmullRom([[from[0], wl + 2], [(from[0] + to[0]) / 2, wl + 8], [to[0], wl + 2]], 6), (f === -1 ? wa : wb) * 0.9, (f === -1 ? wb : wa) * 0.9, rgba('#0b3a4a', 0.28));
  }

  // Far to near: tail, humps from the tail end, neck, head.
  paint(tail);
  if (look.tailFin) {
    const a = tail.spine[tail.spine.length - 2]!;
    const b = tail.spine[tail.spine.length - 1]!;
    tailFan(pen, b, Math.atan2(b[1] - a[1], b[0] - a[0]), skin);
  }
  for (let i = humps.length - 1; i >= 0; i--) paint(humps[i]!);
  paint(neck);
  const [hx, hy] = M(look.head.at);
  serpentHead(pen, hx, hy, f, skin, look.head);
}

export interface CoilLook {
  skin: Skin;
  /** -1: the head is on the left, 1: on the right. */
  facing: -1 | 1;
  /** Axis of the coil, and its radius at the top and at the water. */
  cx: number;
  radius: [number, number];
  /** Height gained per turn, and the number of turns. */
  pitch: number;
  turns: number;
  /** Squash of the circles as seen from above (default 0.5). */
  flat?: number;
  /** Where the body starts on the circle, in radians: 0 is the right side. */
  phase?: number;
  /** The back of the skull and the head options. */
  head: HeadOpts & { at: Vec2 };
  /** The neck: handle leaving the skull, length of the handle entering the coil, and its draw depth. */
  neck: { out: Vec2; into: number; depth?: number };
  /** Body width at a fraction of its length. */
  widths: ReadonlyArray<readonly [number, number]>;
  spikes: number;
}

/** A serpent coiled into a tower: a helix that sinks into the sea, with a neck and a head on top. */
export function drawCoiled(pen: Pen, w: number, h: number, look: CoilLook): void {
  const { ctx } = pen;
  const { skin } = look;
  const wl = Math.round(h * 0.82);
  const f = look.facing;
  const M = (p: Vec2): Vec2 => (f === 1 ? [w - p[0], p[1]] : p);
  const flat = look.flat ?? 0.5;
  const phase = look.phase ?? 0;
  const [rTop, rBot] = look.radius;
  const total = Math.PI * 2 * look.turns;
  const zTop = look.pitch * look.turns;
  const helix = (u: number): Vec2 => {
    const r = lerp(rTop, rBot, u / total);
    return [look.cx + r * Math.cos(u + phase), wl - zTop + (look.pitch * u) / (Math.PI * 2) + r * flat * Math.sin(u + phase)];
  };

  // Head to tail: a bezier neck that lands on the top of the helix with the same tangent, then the helix.
  const e = helix(0);
  const e2 = helix(0.05);
  const tl = dist(e, e2);
  const c0: Vec2 = [look.head.at[0] + 1, look.head.at[1] + 2];
  const c1: Vec2 = [c0[0] + look.neck.out[0], c0[1] + look.neck.out[1]];
  const c2: Vec2 = [e[0] - ((e2[0] - e[0]) / tl) * look.neck.into, e[1] - ((e2[1] - e[1]) / tl) * look.neck.into];
  const bez = (t: number, k: 0 | 1): number => {
    const s = 1 - t;
    return s * s * s * c0[k] + 3 * s * s * t * c1[k] + 3 * s * t * t * c2[k] + t * t * t * e[k];
  };
  const spine: Vec2[] = [];
  const depth: number[] = [];
  const push = (p: Vec2, d: number): void => {
    const q = M(p);
    const prev = spine[spine.length - 1];
    if (prev && dist(prev, q) < 1.8) return;
    spine.push(q);
    depth.push(d);
  };
  for (let i = 0; i < 60; i++) push([bez(i / 60, 0), bez(i / 60, 1)], look.neck.depth ?? 0.3);
  const neckEnd = spine.length;
  const steps = Math.ceil(total / 0.03);
  for (let k = 0; k <= steps; k++) {
    const u = (total * k) / steps;
    push(helix(u), Math.sin(u + phase));
  }
  const n = spine.length;
  const acc = cumulativeLength(spine);
  const widthAt = (p: number): number => {
    const st = look.widths;
    for (let k = 1; k < st.length; k++) {
      const [p0, w0] = st[k - 1]!;
      const [p1, w1] = st[k]!;
      if (p <= p1) return lerp(w0, w1, smoothstep(p0, p1, p));
    }
    return st[st.length - 1]![1];
  };
  const widths = spine.map((_, i) => widthAt(acc[i]! / acc[n - 1]!));
  // The belly stays down: on the near arcs it is on the far side of the spine's normal, on the far arcs on the near side.
  const mirror: 1 | -1 = f === -1 ? 1 : -1;
  const bellyAt = (i: number): 1 | -1 => (((i < neckEnd || depth[i]! <= 0 ? 1 : -1) * mirror) as 1 | -1);

  // The sea around the foot of the coil; the rings stay inside the design box.
  const wx = M([look.cx, 0])[0];
  const rx = Math.min(rBot + 12, (w / 2 - 3) / 1.42);
  waterShadow(ctx, wx, wl + 2, rBot + 14, (rBot + 10) * flat, 0.28);
  ellipse(ctx, wx, wl + 2, rBot, rBot * flat, { stroke: rgba(FOAM, 0.24), width: Math.max(...widths) * 0.7 });
  ripple(ctx, wx, wl + 2, rx, rx * flat, { alpha: 0.38, rings: 2 });

  paintCoiled(pen, spine, widths, skin, (i) => depth[i]!, {
    fade: true,
    chunk: 6,
    bellyAt,
    under: (a, b) => {
      if (look.spikes <= 0) return;
      dorsalSpikes(pen, spine, widths, skin, { belly: bellyAt((a + b) >> 1), from: a, to: Math.min(b, a + 5), every: 5, sweep: 0.5, size: (i) => (i < 4 || i > n - 5 ? 0 : look.spikes * widths[i]! * 0.95) });
    },
    over: (_a, b) => {
      if (b !== n - 1) return;
      const q = spine[n - 1]!;
      ripple(ctx, q[0], q[1] + 1, 11, 4.4, { alpha: 0.45, rings: 1, width: 0.9 });
      foamBlob(ctx, pen.rand, q[0], q[1] + 0.5, 7, 3.6, { alpha: 0.88 });
      droplets(ctx, pen.rand, q[0], q[1] - 1, 3, 6, 0.8);
    },
  });
  const [hx, hy] = M(look.head.at);
  serpentHead(pen, hx, hy, f, skin, look.head);
}
