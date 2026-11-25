import { darken, lighten, rgba } from '../kit/colors';
import { clipped, linearGradient, shape, softBlob, taper } from '../kit/draw';
import { TAU, lerp, pointInPoly } from '../kit/math';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';

/** One band of a rock tower. The footprint scale goes from `r0` at the foot to `r1` at the top of the band. */
export interface RockTier {
  h: number;
  r0: number;
  r1: number;
  color: string;
  /** Thin strata lines inside the band. */
  lines?: number;
  /** Density of the vertical erosion flutes (default 0.7). */
  grooves?: number;
  /** A sloping, smooth band of scree: runnels and loose stones instead of flutes. */
  skirt?: boolean;
}

export interface TowerOptions {
  cx: number;
  /** Ground contact: the centre of the footprint. */
  baseY: number;
  /** Half width of the footprint at scale 1. */
  rx: number;
  /** Depth of the footprint relative to its width (default 0.3). */
  squash?: number;
  tiers: readonly RockTier[];
  /** Colour of the top surface. */
  top: string;
  /** 2 = elliptical footprint, higher = rounder rectangle. */
  square?: number;
  /** Irregularity of the footprint (default 0.05). */
  wobble?: number;
  /** How much the cliff edges bulge in and out with height (default 1). */
  rough?: number;
  ink: string;
  inkW?: number;
  rand: Rng;
  /** Length of the shadow cast towards the lower right. */
  shadow?: number;
}

export interface TowerInfo {
  /** Centre and radii of the top surface. */
  topX: number;
  topY: number;
  topRx: number;
  topRy: number;
  height: number;
}

type Footprint = (a: number) => number;

function footprint(rand: Rng, square: number, wobble: number): Footprint {
  const p0 = rand.range(0, TAU);
  const p1 = rand.range(0, TAU);
  const p2 = rand.range(0, TAU);
  return (a) => {
    const c = Math.abs(Math.cos(a));
    const s = Math.abs(Math.sin(a));
    const sq = Math.pow(Math.pow(c, square) + Math.pow(s, square), -1 / square);
    return sq * (1 + wobble * (0.5 * Math.sin(a * 2 + p0) + 0.3 * Math.sin(a * 3 + p1) + 0.2 * Math.sin(a * 5 + p2)));
  };
}

interface Seg {
  t: RockTier;
  z0: number;
  z1: number;
  foot: Vec2[];
  head: Vec2[];
  wall: Vec2[];
  top: Vec2[];
}

/**
 * A banded rock tower seen from above at an angle: mesas, buttes and hoodoos.
 * Bands share one footprint so the walls line up; when a band is wider than the one below it makes an overhang.
 */
export function drawTower(ctx: Ctx2D, o: TowerOptions): TowerInfo {
  const { cx, baseY, rx, rand } = o;
  const ry = rx * (o.squash ?? 0.3);
  const inkW = o.inkW ?? 1.4;
  const fp = footprint(rand, o.square ?? 2, o.wobble ?? 0.05);
  const rough = o.rough ?? 1;
  const bp1 = rand.range(0, TAU);
  const bp2 = rand.range(0, TAU);
  const bf1 = rand.range(0.24, 0.34);
  const bf2 = rand.range(0.6, 0.85);
  const bump = (zz: number): number => 1 + rough * (0.04 * Math.sin(zz * bf1 + bp1) + 0.02 * Math.sin(zz * bf2 + bp2));

  const at = (k: number, zz: number, a: number): Vec2 => {
    const r = fp(a) * k * bump(zz);
    return [cx + Math.cos(a) * r * rx, baseY - zz + Math.sin(a) * r * ry];
  };
  const ring = (k: number, zz: number, a0: number, a1: number, n: number): Vec2[] => {
    const out: Vec2[] = [];
    for (let i = 0; i <= n; i++) out.push(at(k, zz, a0 + ((a1 - a0) * i) / n));
    return out;
  };

  let z = 0;
  const segs: Seg[] = o.tiers.map((t): Seg => {
    const z0 = z;
    z += t.h;
    const z1 = z;
    const foot = ring(t.r0, z0, 0, Math.PI, 28);
    const head = ring(t.r1, z1, 0, Math.PI, 28);
    const steps = Math.max(2, Math.round(t.h / 3));
    const left: Vec2[] = [];
    const right: Vec2[] = [];
    for (let i = 1; i < steps; i++) {
      const u = i / steps;
      left.push(at(lerp(t.r0, t.r1, u), lerp(z0, z1, u), Math.PI));
      right.push(at(lerp(t.r0, t.r1, u), lerp(z0, z1, u), 0));
    }
    return { t, z0, z1, foot, head, wall: [...foot, ...left, ...head.slice().reverse(), ...right.reverse()], top: ring(t.r1, z1, 0, TAU, 48) };
  });
  const total = z;

  const sh = o.shadow ?? total * 0.4;
  softBlob(ctx, cx + sh * 0.55 + rx * 0.1, baseY + ry * 0.35, rx * 1.15 + sh * 0.6, ry * 1.5 + sh * 0.1, '#1d160c', 0.3);

  // Outline first, so that the colours below can cover the seams between bands.
  for (const s of segs) {
    shape(ctx, s.wall, { fill: o.ink, stroke: o.ink, width: inkW * 2 });
    shape(ctx, s.top, { fill: o.ink, stroke: o.ink, width: inkW * 2 });
  }

  // Flutes share their angles so that they continue from band to band.
  const angles: number[] = [];
  for (let i = 0, n = Math.round(rx * 0.5); i < n; i++) angles.push(rand.range(0.07, 0.93) * Math.PI);

  segs.forEach((s, idx) => {
    const t = s.t;
    const prev = segs[idx - 1];
    const next = segs[idx + 1];
    const seamBelow = !!prev && Math.abs(t.r0 - prev.t.r1) < 0.04;
    const seamAbove = !!next && Math.abs(next.t.r0 - t.r1) < 0.04;
    const overhung = !!next && next.t.r0 > t.r1 + 0.04;
    const last = idx === segs.length - 1;
    const dark = darken(t.color, 0.5);
    const wide = Math.max(t.r0, t.r1) * rx * 1.14;

    shape(ctx, s.wall, {
      fill: linearGradient(ctx, cx - wide, 0, cx + wide, 0, [
        [0, lighten(t.color, 0.3)],
        [0.22, lighten(t.color, 0.12)],
        [0.5, t.color],
        [0.8, darken(t.color, 0.2)],
        [1, darken(t.color, 0.38)],
      ]),
    });

    const yTop = baseY - s.z1 - ry * 1.05;
    const yBot = baseY - s.z0 + ry * 1.05;
    const along = (u: number, a: number): Vec2 => at(lerp(t.r0, t.r1, u), lerp(s.z0, s.z1, u), a);
    clipped(ctx, s.wall, () => {
      ctx.fillStyle = linearGradient(
        ctx,
        0,
        yTop,
        0,
        yBot,
        overhung
          ? [[0, 'rgba(25,10,4,0.5)'], [0.4, 'rgba(25,10,4,0)'], [0.7, 'rgba(50,25,10,0)'], [1, 'rgba(50,25,10,0.3)']]
          : [[0, 'rgba(255,238,200,0.16)'], [0.3, 'rgba(255,238,200,0)'], [0.65, 'rgba(50,25,10,0)'], [1, 'rgba(50,25,10,0.28)']],
      );
      ctx.fillRect(cx - wide, yTop, wide * 2, yBot - yTop);

      const n = t.lines ?? 1;
      for (let j = 0; j < n; j++) {
        const u = (j + 0.5 + rand.range(-0.25, 0.25)) / n;
        const arc = ring(lerp(t.r0, t.r1, u), lerp(s.z0, s.z1, u), rand.range(0, 0.5), Math.PI - rand.range(0, 0.5), 14);
        shape(ctx, arc, { stroke: rgba(dark, 0.32), width: 0.8, closed: false, smooth: true });
        shape(ctx, arc.map((p): Vec2 => [p[0], p[1] + 1]), { stroke: rgba(lighten(t.color, 0.35), 0.22), width: 0.7, closed: false, smooth: true });
      }

      if (t.skirt) {
        // Scree runnels fanning out from the cliff foot, and a few loose stones.
        for (let j = 0, m = Math.round(rx * 0.16); j < m; j++) {
          const a = rand.range(0.1, 0.9) * Math.PI;
          const pts = [along(1, a), along(0, a + rand.range(-0.06, 0.06))];
          taper(ctx, pts, 0.3, rand.range(2.4, 4), rgba(dark, 0.2));
          taper(ctx, pts.map((p): Vec2 => [p[0] - 1.4, p[1]]), 0.2, 1.5, rgba(lighten(t.color, 0.4), 0.28));
        }
        for (let j = 0, tries = 0; j < rx * 0.3 && tries < 200; tries++) {
          const x = cx + rand.range(-wide, wide);
          const y = rand.range(yTop, yBot);
          if (!pointInPoly(x, y, s.wall)) continue;
          j++;
          const dx = (x < cx ? -1 : 1) * rand.range(0.8, 2);
          shape(ctx, [[x, y], [x + dx, y + rand.range(1.5, 3)]], { stroke: rgba(dark, 0.4), width: 0.8, closed: false });
        }
      } else {
        for (const a of angles) {
          if (!rand.chance((t.grooves ?? 0.7) * 0.75)) continue;
          const u0 = rand.range(0, 0.2);
          const u1 = rand.range(0.7, 1);
          const bend = rand.range(-0.8, 0.8);
          const m = along(1 - (u0 + u1) / 2, a);
          const pts: Vec2[] = [along(1 - u0, a), [m[0] + bend, m[1]], along(1 - u1, a)];
          taper(ctx, pts, 0.4, rand.range(1.2, 2.2), rgba(dark, 0.42));
          shape(ctx, pts.map((p): Vec2 => [p[0] - 1.3, p[1]]), { stroke: rgba(lighten(t.color, 0.4), 0.26), width: 0.7, closed: false, smooth: true });
        }
      }
    });

    // Where the band stands on the one below, or on the ground.
    if (seamBelow) shape(ctx, s.foot, { stroke: rgba(dark, 0.3), width: 0.9, closed: false, smooth: true });
    else shape(ctx, s.foot, { stroke: 'rgba(30,12,5,0.32)', width: 1.4, closed: false, smooth: true });

    if (seamAbove) return;
    const topCol = last ? o.top : lighten(t.color, 0.25);
    const tcy = baseY - s.z1;
    const tr = rx * t.r1;
    const tv = ry * t.r1;
    shape(ctx, s.top, {
      fill: linearGradient(ctx, cx - tr, tcy - tv, cx + tr * 0.8, tcy + tv, [[0, lighten(topCol, 0.18)], [0.5, topCol], [1, darken(topCol, 0.2)]]),
    });
    clipped(ctx, s.top, () => {
      for (let j = 0; j < 3; j++) softBlob(ctx, cx + rand.range(-0.6, 0.6) * tr, tcy + rand.range(-0.4, 0.4) * tv, rand.range(0.2, 0.4) * tr, rand.range(0.2, 0.4) * tv, j % 2 ? '#fff0cc' : '#5a3a20', 0.12);
      for (let j = 0; j < 2; j++) {
        let px = cx + rand.range(-0.55, 0.55) * tr;
        let py = tcy + rand.range(-0.4, 0.4) * tv;
        const crack: Vec2[] = [[px, py]];
        for (let q = 0; q < 3; q++) {
          px += rand.range(-0.2, 0.2) * tr;
          py += rand.range(-0.2, 0.25) * tv;
          crack.push([px, py]);
        }
        shape(ctx, crack, { stroke: rgba(darken(topCol, 0.5), 0.4), width: 0.7, closed: false });
      }
    });
    // Lip of the top edge: bright where it faces the light, dark on the far side.
    shape(ctx, s.head, {
      stroke: linearGradient(ctx, cx - tr, 0, cx + tr, 0, [[0, 'rgba(255,244,214,0.75)'], [0.45, 'rgba(255,244,214,0.3)'], [0.6, 'rgba(40,20,10,0.18)'], [1, 'rgba(40,20,10,0.42)']]),
      width: 1.1,
      closed: false,
      smooth: true,
    });
  });

  const top = segs[segs.length - 1]!;
  return { topX: cx, topY: baseY - total, topRx: rx * top.t.r1, topRy: ry * top.t.r1, height: total };
}

/** Builds stacked bands from colours and heights. `r` lists the footprint scale at each band boundary. */
export function stackTiers(colors: readonly string[], heights: readonly number[], r: readonly number[], extra: Partial<RockTier> = {}): RockTier[] {
  return heights.map((h, i): RockTier => ({ h, r0: r[i]!, r1: r[i + 1]!, color: colors[i % colors.length]!, ...extra }));
}
