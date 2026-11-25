import { darken, lighten, rgba } from '../kit/colors';
import { clipped, linearGradient, shape, softBlob, taper } from '../kit/draw';
import { TAU, pointInPoly } from '../kit/math';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';
import { dryTuft, scatter, type Stone } from './nature-stone';

export interface ArchHole {
  cx: number;
  /** Half width. */
  hw: number;
  /** Height of the opening. */
  h: number;
  /** Shape of the top: 2 is an ellipse, below 2 is pointed, above 2 is boxy. */
  p?: number;
  /** Height of the sill above the ground. Without it the opening reaches the ground. */
  sill?: number;
}

export interface ArchOptions {
  cx: number;
  /** Ground line. */
  gy: number;
  /** Half width of the formation at its foot. */
  hw: number;
  h: number;
  p?: number;
  flare?: number;
  holes: ArchHole[];
  stone: Stone;
  /** Typical thickness of a rock layer (default 8). */
  band?: number;
  /** Depth of the top surface (default 7). */
  depth?: number;
  tufts?: number;
  ink: string;
  rand: Rng;
}

/** A dome from the left foot to the right foot. */
function dome(cx: number, gy: number, hw: number, h: number, p: number, n: number): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i <= n; i++) {
    const u = -1 + (2 * i) / n;
    const v = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), p)), 1 / p);
    out.push([cx + u * hw, gy - h * v]);
  }
  return out;
}

/** Draws a natural rock arch, seen from the front with its top surface tilted towards the viewer. */
export function drawArch(ctx: Ctx2D, o: ArchOptions): void {
  const { cx, gy, hw, h, rand, ink, stone } = o;
  const p = o.p ?? 2.3;
  const flare = o.flare ?? 5;
  const depth = o.depth ?? 7;
  const band = o.band ?? 8;
  const ph = [rand.range(0, TAU), rand.range(0, TAU), rand.range(0, TAU)] as const;

  // Outer contour with an organic, slightly lopsided outline and flared feet.
  const base = dome(cx, gy, hw, h, p, 56);
  const flareFrom = h * 0.28;
  const lean = rand.range(-0.1, 0.1);
  const contour: Vec2[] = base.map(([x, y], i): Vec2 => {
    const u = -1 + (2 * i) / 56;
    const nz = Math.sin(u * 5 + ph[0]) * 0.5 + Math.sin(u * 11 + ph[1]) * 0.3 + Math.sin(u * 19 + ph[2]) * 0.2;
    const low = Math.max(0, (y - (gy - flareFrom)) / flareFrom);
    const yy = gy - (gy - y) * (1 + lean * u);
    return [x + Math.sign(u) * flare * low * low + nz * 1.8 * Math.abs(u), yy + nz * 2.6 * (1 - Math.abs(u) * 0.7)];
  });
  const facade: Vec2[] = contour;
  const lift = contour.map((pt): Vec2 => [pt[0], pt[1] - depth]);
  const topStrip: Vec2[] = [...contour, ...lift.slice().reverse()];

  const holeArc = (hole: ArchHole): Vec2[] => {
    const hp = hole.p ?? 2.3;
    if (hole.sill === undefined) {
      const arc = dome(hole.cx, gy, hole.hw, hole.h, hp, 36);
      return arc.map(([x, y], i): Vec2 => [x + Math.sin(i * 0.9 + ph[1]) * 0.5, y + Math.sin(i * 1.3 + ph[2]) * 0.6]);
    }
    const out: Vec2[] = [];
    const cy = gy - hole.sill - hole.h / 2;
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const k = Math.pow(Math.pow(Math.abs(c), 2.4) + Math.pow(Math.abs(s), 2.4), -1 / 2.4);
      out.push([hole.cx + c * k * hole.hw, cy + s * k * (hole.h / 2) + Math.sin(i * 1.7 + ph[0]) * 0.4]);
    }
    return out;
  };
  const holeCut = (hole: ArchHole): Vec2[] => {
    const arc = holeArc(hole);
    return hole.sill === undefined ? [...arc, [hole.cx + hole.hw, gy + 6], [hole.cx - hole.hw, gy + 6]] : arc;
  };

  for (const poly of [topStrip, facade]) shape(ctx, poly, { fill: ink, stroke: ink, width: 2.8 });

  // Top surface.
  const topTop = Math.min(...lift.map((pt) => pt[1]));
  shape(ctx, topStrip, {
    fill: linearGradient(ctx, cx - hw, topTop, cx + hw * 0.6, topTop + depth + h * 0.3, [[0, lighten(stone.top, 0.2)], [0.55, stone.top], [1, darken(stone.top, 0.18)]]),
  });
  clipped(ctx, topStrip, () => {
    for (let i = 0; i < 14; i++) {
      const pt = contour[rand.int(4, contour.length - 5)]!;
      shape(ctx, [[pt[0], pt[1] - rand.range(1, depth - 1)], [pt[0] + rand.range(-3, 3), pt[1] - rand.range(1, depth)]], { stroke: rgba(darken(stone.top, 0.4), 0.25), width: 0.7, closed: false });
    }
  });

  // Strata.
  clipped(ctx, facade, () => {
    const left = cx - hw - 12;
    const right = cx + hw + 12;
    let y = gy + 4;
    let k = rand.int(0, stone.bands.length - 1);
    const top = topTop;
    const seams: { pts: Vec2[]; color: string }[] = [];
    while (y > top - 4) {
      const t = band * rand.range(0.7, 1.3);
      const color = stone.bands[k % stone.bands.length]!;
      k++;
      const wav = rand.range(0.8, 1.8);
      const wf = rand.range(0.05, 0.12);
      const wp = rand.range(0, TAU);
      const upper: Vec2[] = [];
      const lower: Vec2[] = [];
      for (let x = left; x <= right; x += 6) {
        upper.push([x, y - t + Math.sin(x * wf + wp) * wav]);
        lower.push([x, y + 3 + Math.sin(x * wf + wp + 1.7) * wav]);
      }
      shape(ctx, [...upper, ...lower.slice().reverse()], { fill: color });
      seams.push({ pts: lower, color });
      y -= t;
    }
    for (const sm of seams) shape(ctx, sm.pts, { stroke: rgba(darken(sm.color, 0.55), 0.3), width: 0.8, closed: false, smooth: true });

    // Light from the upper left, shade on the right and near the ground.
    ctx.fillStyle = linearGradient(ctx, cx - hw, 0, cx + hw, 0, [[0, 'rgba(255,238,200,0.3)'], [0.35, 'rgba(255,238,200,0.05)'], [0.7, 'rgba(40,15,5,0.14)'], [1, 'rgba(40,15,5,0.42)']]);
    ctx.fillRect(left, top - 4, right - left, gy - top + 12);
    ctx.fillStyle = linearGradient(ctx, 0, top, 0, gy + 4, [[0, 'rgba(255,238,200,0.16)'], [0.3, 'rgba(255,238,200,0)'], [0.75, 'rgba(40,15,5,0)'], [1, 'rgba(40,15,5,0.3)']]);
    ctx.fillRect(left, top - 4, right - left, gy - top + 12);

    // Erosion streaks running down the face.
    for (let i = 0, tries = 0; i < hw * 0.36 && tries < 300; tries++) {
      const x = cx + rand.range(-hw, hw);
      const y0 = rand.range(top, gy - 6);
      const len = rand.range(8, 24);
      if (!pointInPoly(x, y0, facade) || !pointInPoly(x, y0 + len, facade)) continue;
      i++;
      const pts: Vec2[] = [[x, y0], [x + rand.range(-0.8, 0.8), y0 + len / 2], [x + rand.range(-1, 1), y0 + len]];
      taper(ctx, pts, 0.3, rand.range(1.2, 2.2), 'rgba(50,20,8,0.3)');
      shape(ctx, pts.map((q): Vec2 => [q[0] - 1.4, q[1]]), { stroke: 'rgba(255,230,190,0.2)', width: 0.7, closed: false, smooth: true });
    }

    // Shaded reveal around every opening.
    for (const hole of o.holes) shape(ctx, holeArc(hole), { stroke: 'rgba(30,12,5,0.26)', width: 5, closed: hole.sill !== undefined, smooth: true });

    // Lit edge where the front face meets the top surface.
    shape(ctx, contour, {
      stroke: linearGradient(ctx, cx - hw, 0, cx + hw, 0, [[0, 'rgba(255,244,214,0.8)'], [0.5, 'rgba(255,244,214,0.35)'], [1, 'rgba(40,20,10,0.35)']]),
      width: 1.3,
      closed: false,
      smooth: true,
    });
  });

  // Openings: clear them and outline the edge.
  for (const hole of o.holes) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    shape(ctx, holeCut(hole), { fill: '#000', stroke: '#000', width: 1.2 });
    ctx.restore();
    shape(ctx, holeArc(hole), { stroke: ink, width: 2.4, closed: hole.sill !== undefined, smooth: true, join: 'round' });
  }

  // The shadow goes behind everything drawn so far, so that it also shows through the openings.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  softBlob(ctx, cx + hw * 0.2, gy + 3, hw + h * 0.1, 7, '#1d160c', 0.3);
  for (const hole of o.holes) if (hole.sill === undefined) softBlob(ctx, hole.cx + hole.hw * 0.25, gy - 1, hole.hw * 0.9, 4, '#1d160c', 0.28);
  ctx.restore();

  for (let i = 0; i < (o.tufts ?? 0); i++) {
    const pt = contour[rand.int(12, contour.length - 13)]!;
    dryTuft(ctx, rand, pt[0] + rand.range(-2, 2), pt[1] - rand.range(1.5, depth - 1), rand.range(5, 7));
  }
  scatter(ctx, rand, cx, gy, hw + flare * 0.6, 3, 4, 2);
}
