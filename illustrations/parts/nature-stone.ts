import type { Ctx2D, Rng } from '../kit/types';
import { INK, drawTuft } from './nature-common';
import { drawTower, type RockTier, type TowerInfo } from './nature-rock';
import { sandRock } from './nature-sand';

/** Colours of one kind of sandstone. `bands` go from the bottom up. */
export interface Stone {
  bands: string[];
  top: string;
  skirt: string;
}

export const RED: Stone = { bands: ['#a8492a', '#c4623a', '#cf7a45', '#b4532f', '#c26a3f'], top: '#d9a072', skirt: '#b98a62' };
export const ORANGE: Stone = { bands: ['#c26d36', '#d98a44', '#e0a050', '#c97a3c', '#d68d46'], top: '#e6b476', skirt: '#c7955f' };
export const TAN: Stone = { bands: ['#b9945f', '#d2ae76', '#dcc08a', '#c4a06a', '#cfae78'], top: '#e6cf9c', skirt: '#cdb08a' };
export const PALE: Stone = { bands: ['#c9b393', '#e0cfae', '#ebddc0', '#d4c0a0', '#dccab0'], top: '#eee3cb', skirt: '#d5c3a5' };
export const UMBER: Stone = { bands: ['#6e4a35', '#86583d', '#98694a', '#7a4e38', '#8a5c40'], top: '#a9825e', skirt: '#8e6b4c' };

export function dryTuft(ctx: Ctx2D, rand: Rng, x: number, y: number, h: number): void {
  drawTuft(ctx, rand, { x, y, h, spread: h * 0.55, count: 5, dark: '#7a6a30', base: '#a8934a', light: '#cdb868', ink: INK, inkW: 0.7 });
}

/** Scrub and small rocks on the flat top of a formation. */
export function crown(ctx: Ctx2D, rand: Rng, t: TowerInfo, tufts: number, rocks: number): void {
  for (let i = 0; i < tufts; i++) dryTuft(ctx, rand, t.topX + rand.range(-0.6, 0.6) * t.topRx, t.topY + rand.range(-0.1, 0.55) * t.topRy, rand.range(5, 7));
  for (let i = 0; i < rocks; i++) sandRock(ctx, rand, t.topX + rand.range(-0.6, 0.6) * t.topRx, t.topY + rand.range(-0.2, 0.5) * t.topRy, rand.range(1.6, 2.6), '#b79a78');
}

/** Boulders and tufts fallen around the foot. */
export function scatter(ctx: Ctx2D, rand: Rng, cx: number, baseY: number, rx: number, ry: number, rocks: number, tufts: number, tone = '#b5a082'): void {
  for (let i = 0; i < rocks; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    sandRock(ctx, rand, cx + side * rx * rand.range(0.55, 1.12), baseY + ry * rand.range(0.25, 1.05), rand.range(1.8, 3.4), tone);
  }
  for (let i = 0; i < tufts; i++) {
    dryTuft(ctx, rand, cx + (i % 2 === 0 ? -1 : 1) * rx * rand.range(0.7, 1.15), baseY + ry * rand.range(0.5, 1), rand.range(4.5, 6.5));
  }
}

export interface TowerPlan {
  cx: number;
  baseY: number;
  rx: number;
  squash?: number;
  tiers: RockTier[];
  top: string;
  square?: number;
  wobble?: number;
  rough?: number;
  shadow?: number;
  inkW?: number;
  tufts?: number;
  rocks?: number;
}

/** Draws a planned tower and its scrub; returns where the top surface is. */
export function paintTower(ctx: Ctx2D, rand: Rng, p: TowerPlan): TowerInfo {
  const info = drawTower(ctx, {
    cx: p.cx,
    baseY: p.baseY,
    rx: p.rx,
    squash: p.squash,
    tiers: p.tiers,
    top: p.top,
    square: p.square,
    wobble: p.wobble,
    rough: p.rough,
    ink: INK,
    inkW: p.inkW,
    rand,
    shadow: p.shadow,
  });
  crown(ctx, rand, info, p.tufts ?? 0, p.rocks ?? 0);
  return info;
}

/** The sloping band of scree at the foot of a formation. */
export const skirt = (stone: Stone, h: number, r0: number, r1: number): RockTier => ({ h, r0, r1, color: stone.skirt, skirt: true, lines: 0 });
