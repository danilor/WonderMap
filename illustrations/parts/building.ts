import { mix, rgba } from '../kit/colors';
import { ellipse, linearGradient, shades, shape, softBlob } from '../kit/draw';
import type { Ctx2D, Rng, Vec2 } from '../kit/types';

/** Building palettes shared by settlement symbols. */
export const WALL = { plaster: '#e4d3ae', stone: '#b8b3a6', timber: '#c9a67a', white: '#efe6d2', dark: '#8d8374' } as const;
export const ROOF = { red: '#b2503a', brown: '#7c5a3c', slate: '#5f6b7a', thatch: '#b99a55', teal: '#4f8a85', blue: '#4d6fa0' } as const;

// Dimetric ("isometric-ish") axes: EX runs to the right/back, EY to the left/back.
const EX: Vec2 = [0.866, -0.5];
const EY: Vec2 = [-0.866, -0.5];

const add = (p: Vec2, v: Vec2, k = 1): Vec2 => [p[0] + v[0] * k, p[1] + v[1] * k];
const up = (p: Vec2, h: number): Vec2 => [p[0], p[1] - h];
const mid = (a: Vec2, b: Vec2): Vec2 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

export interface HouseOptions {
  /** Front (nearest) bottom corner, i.e. where the house touches the ground. */
  x: number;
  y: number;
  /** Lengths along the right and the left wall, in px. */
  a: number;
  b: number;
  wallH: number;
  roofH: number;
  wall: string;
  roof: string;
  ink: string;
  rand: Rng;
  chimney?: boolean;
  /** Pyramid roof (small huts, watch posts) instead of a gable. */
  hip?: boolean;
  /** Gable ridge axis: 'x' (default) runs along the right wall, 'y' along the left wall (the gable end then faces the right). */
  ridge?: 'x' | 'y';
  shadow?: boolean;
}

/** Horizontal/vertical extent of a house on the screen, handy for packing several houses into one symbol. */
export function houseExtent(o: Pick<HouseOptions, 'x' | 'y' | 'a' | 'b' | 'wallH' | 'roofH'>): { minX: number; maxX: number; minY: number; maxY: number } {
  const R = add([o.x, o.y], EX, o.a);
  const L = add([o.x, o.y], EY, o.b);
  const B = add(R, EY, o.b);
  return { minX: L[0], maxX: R[0], minY: B[1] - o.wallH - o.roofH, maxY: o.y };
}

/** A small medieval house in 3/4 view: lit left wall, shaded right wall, tiled roof. */
export function drawHouse(ctx: Ctx2D, o: HouseOptions): void {
  const { ink, rand } = o;
  const F: Vec2 = [o.x, o.y];
  const R = add(F, EX, o.a);
  const L = add(F, EY, o.b);
  const B = add(R, EY, o.b);
  const Ft = up(F, o.wallH);
  const Rt = up(R, o.wallH);
  const Lt = up(L, o.wallH);
  const wall = shades(o.wall);
  const roof = shades(o.roof);

  if (o.shadow !== false) {
    softBlob(ctx, F[0] + o.a * 0.35, F[1] - 2, (o.a + o.b) * 0.55, (o.a + o.b) * 0.16, '#1d160c', 0.34);
  }

  // The ridge of a gable roof normally runs parallel to the right wall, over the middle of the two end walls;
  // with `ridge: 'y'` it runs parallel to the left wall instead.
  const alongY = o.ridge === 'y';
  const roofTop = o.wallH + o.roofH;
  const ridge: [Vec2, Vec2] | null = o.hip
    ? null
    : alongY
      ? [up(mid(F, R), roofTop), up(mid(L, B), roofTop)]
      : [up(mid(F, L), roofTop), up(mid(R, B), roofTop)];
  const apex = up(mid(F, B), roofTop);
  const eaveEnd = alongY ? Lt : Rt;

  const leftWall: Vec2[] = ridge && !alongY ? [F, L, Lt, ridge[0], Ft] : [F, L, Lt, Ft];
  const rightWall: Vec2[] = ridge && alongY ? [F, R, Rt, ridge[0], Ft] : [F, R, Rt, Ft];
  shape(ctx, leftWall, { fill: linearGradient(ctx, L[0], 0, F[0], 0, [wall.light, wall.base]), stroke: ink, width: 1 });
  shape(ctx, rightWall, { fill: linearGradient(ctx, F[0], 0, R[0], 0, [wall.shade, wall.deep]), stroke: ink, width: 1 });

  if (ridge) {
    const [S, E] = ridge;
    shape(ctx, [Ft, eaveEnd, E, S], { fill: alongY ? roof.light : roof.base, stroke: ink, width: 1 });
    // Shingle courses run parallel to the ridge.
    for (let i = 1; i < 4; i++) {
      const t = i / 4;
      const p0: Vec2 = [Ft[0] + (S[0] - Ft[0]) * t, Ft[1] + (S[1] - Ft[1]) * t];
      const p1: Vec2 = [eaveEnd[0] + (E[0] - eaveEnd[0]) * t, eaveEnd[1] + (E[1] - eaveEnd[1]) * t];
      shape(ctx, [p0, p1], { stroke: rgba(roof.deep, 0.5), width: 0.7, closed: false });
    }
    shape(ctx, [S, E], { stroke: rgba(roof.highlight, 0.7), width: 1.1, closed: false });
  } else {
    shape(ctx, [Lt, Ft, apex], { fill: roof.light, stroke: ink, width: 1 });
    shape(ctx, [Ft, Rt, apex], { fill: roof.shade, stroke: ink, width: 1 });
  }

  // Door on the shaded wall, window on the lit one.
  const dBase = add(F, EX, o.a * rand.range(0.3, 0.55));
  const dw = Math.min(o.a * 0.2, 5);
  const dh = Math.min(o.wallH * 0.62, 9);
  shape(ctx, [dBase, add(dBase, EX, dw), up(add(dBase, EX, dw), dh), up(dBase, dh)], { fill: '#3b2a1c', stroke: rgba(ink, 0.8), width: 0.6 });
  const wBase = up(add(F, EY, o.b * 0.5), o.wallH * 0.45);
  const ww = Math.min(o.b * 0.18, 4);
  shape(ctx, [wBase, add(wBase, EY, ww), up(add(wBase, EY, ww), 4), up(wBase, 4)], { fill: '#f1d58c', stroke: rgba(ink, 0.8), width: 0.6 });

  if (o.chimney && ridge) {
    const base = mid(mid(Ft, eaveEnd), mid(ridge[0], ridge[1]));
    const cs = Math.max(2, o.a * 0.07);
    const c0 = add(base, EX, -cs * 0.5);
    const c1 = add(c0, EX, cs);
    const c2 = add(c1, EY, cs);
    const c3 = add(c0, EY, cs);
    const top = (p: Vec2): Vec2 => up(p, o.roofH * 0.7);
    shape(ctx, [c0, c1, top(c1), top(c0)], { fill: wall.deep, stroke: ink, width: 0.6 });
    shape(ctx, [c1, c2, top(c2), top(c1)], { fill: wall.shade, stroke: ink, width: 0.6 });
    shape(ctx, [top(c0), top(c1), top(c2), top(c3)], { fill: '#2b2118', stroke: ink, width: 0.6 });
  }
}

export interface BlockOptions {
  /** Front (nearest) bottom corner. */
  x: number;
  y: number;
  /** Lengths along the right and the left wall, in px. */
  a: number;
  b: number;
  h: number;
  stone: string;
  ink: string;
  /** Add merlons along the front edges of the roof. Default true. */
  crenels?: boolean;
  shadow?: boolean;
}

/** A stone block with a flat top: curtain walls, keeps, gatehouses. */
export function drawBlock(ctx: Ctx2D, o: BlockOptions): void {
  const F: Vec2 = [o.x, o.y];
  const R = add(F, EX, o.a);
  const L = add(F, EY, o.b);
  const B = add(R, EY, o.b);
  const Ft = up(F, o.h);
  const Rt = up(R, o.h);
  const Lt = up(L, o.h);
  const Bt = up(B, o.h);
  const stone = shades(o.stone);
  const { ink } = o;

  if (o.shadow !== false) softBlob(ctx, F[0] + o.a * 0.4, F[1] - 1, (o.a + o.b) * 0.5, (o.a + o.b) * 0.14, '#1d160c', 0.34);

  shape(ctx, [F, L, Lt, Ft], { fill: linearGradient(ctx, L[0], 0, F[0], 0, [stone.light, stone.base]), stroke: ink, width: 1 });
  shape(ctx, [F, R, Rt, Ft], { fill: linearGradient(ctx, F[0], 0, R[0], 0, [stone.shade, stone.deep]), stroke: ink, width: 1 });
  shape(ctx, [Ft, Rt, Bt, Lt], { fill: stone.highlight, stroke: ink, width: 1 });

  // Stone courses.
  for (let y = 4; y < o.h - 1; y += 4.5) {
    shape(ctx, [up(F, y), up(L, y)], { stroke: rgba(stone.deep, 0.25), width: 0.6, closed: false });
    shape(ctx, [up(F, y), up(R, y)], { stroke: rgba(stone.deep, 0.3), width: 0.6, closed: false });
  }

  if (o.crenels !== false) {
    const merlon = 2.6;
    const gap = 2.4;
    const tall = 3;
    for (let t = 0; t + merlon <= o.a; t += merlon + gap) {
      const p = add(Ft, EX, t);
      const q = add(p, EX, merlon);
      shape(ctx, [p, q, up(q, tall), up(p, tall)], { fill: stone.shade, stroke: ink, width: 0.6 });
    }
    for (let t = 0; t + merlon <= o.b; t += merlon + gap) {
      const p = add(Ft, EY, t);
      const q = add(p, EY, merlon);
      shape(ctx, [p, q, up(q, tall), up(p, tall)], { fill: stone.light, stroke: ink, width: 0.6 });
    }
  }
}

export interface TowerOptions {
  cx: number;
  /** Ground contact. */
  baseY: number;
  r: number;
  h: number;
  stone: string;
  /** Roof color, or `null` for a crenellated flat top. */
  roof: string | null;
  roofH?: number;
  ink: string;
  shadow?: boolean;
}

/** A round tower with either a cone roof or battlements. */
export function drawTower(ctx: Ctx2D, o: TowerOptions): void {
  const stone = shades(o.stone);
  const { cx, baseY, r, h } = o;
  const topY = baseY - h;
  if (o.shadow !== false) softBlob(ctx, cx + r * 0.5, baseY, r * 1.6, r * 0.5, '#1d160c', 0.34);

  // The body is a rectangle with an elliptical base so it sits on the ground like a cylinder.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - r, topY);
  ctx.lineTo(cx + r, topY);
  ctx.lineTo(cx + r, baseY);
  ctx.ellipse(cx, baseY, r, r * 0.35, 0, 0, Math.PI, false);
  ctx.closePath();
  ctx.fillStyle = linearGradient(ctx, cx - r, 0, cx + r, 0, [[0, stone.highlight], [0.35, stone.light], [0.75, stone.shade], [1, stone.deep]]);
  ctx.fill();
  ctx.strokeStyle = o.ink;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.restore();

  for (let y = topY + 4; y < baseY - 2; y += 4.5) {
    shape(ctx, [[cx - r + 0.5, y], [cx + r - 0.5, y]], { stroke: rgba(stone.deep, 0.28), width: 0.6, closed: false });
  }
  const slitY = topY + h * 0.35;
  shape(ctx, [[cx - 0.7, slitY], [cx + 0.7, slitY], [cx + 0.7, slitY + 4], [cx - 0.7, slitY + 4]], { fill: '#2b2118' });

  if (o.roof) {
    const roof = shades(o.roof);
    const apex: Vec2 = [cx, topY - (o.roofH ?? r * 1.7)];
    const eave = r * 1.18;
    shape(ctx, [[cx - eave, topY + 1], apex, [cx, topY + 2.5]], { fill: roof.light, stroke: o.ink, width: 1 });
    shape(ctx, [[cx, topY + 2.5], apex, [cx + eave, topY + 1]], { fill: roof.deep, stroke: o.ink, width: 1 });
  } else {
    ellipse(ctx, cx, topY, r * 1.08, r * 0.38, { fill: mix(o.stone, '#000000', 0.15), stroke: o.ink, width: 1 });
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (i / (n - 1));
      const mx = cx - Math.cos(a) * r * 0.95;
      const my = topY + Math.sin(a) * r * 0.34;
      shape(ctx, [[mx - 1.6, my - 3], [mx + 1.6, my - 3], [mx + 1.6, my + 1], [mx - 1.6, my + 1]], { fill: i < n / 2 ? stone.light : stone.shade, stroke: o.ink, width: 0.7 });
    }
  }
}

/** A pole with a swallow-tailed pennant. */
export function drawFlag(ctx: Ctx2D, x: number, y: number, height: number, color: string, ink: string, direction: 1 | -1 = 1): void {
  shape(ctx, [[x, y], [x, y - height]], { stroke: ink, width: 1, closed: false });
  const s = height * 0.42;
  shape(
    ctx,
    [
      [x, y - height],
      [x + direction * s, y - height + s * 0.18],
      [x + direction * s * 0.72, y - height + s * 0.42],
      [x + direction * s, y - height + s * 0.66],
      [x, y - height + s * 0.5],
    ],
    { fill: color, stroke: ink, width: 0.7 },
  );
}
