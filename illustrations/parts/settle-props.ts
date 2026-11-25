import { mix, rgba } from '../kit/colors';
import { ellipse, linearGradient, shades, shape, softBlob, tracePoly } from '../kit/draw';
import { TAU } from '../kit/math';
import type { Vec2 } from '../kit/types';
import { drawFlag } from './building';
import { drawPrism } from './settle-castle';
import { INK, WOOD, bush, ellipseFootprint, inFace, rocks, shadowOf, tuft } from './settle-geom';
import type { Stage } from './settle-geom';
import { BARK, FOLIAGE, drawDeadTree, drawPine, drawRoundTree } from './tree';

/**
 * Small scene-aware props (vegetation, crates, wells, stalls, palisades ...). Positions are grid coordinates `(u, v)`
 * and every prop registers itself with the stage's scene so it sorts correctly against buildings.
 */

export function addBush(st: Stage, u: number, v: number, r = 4, color: string = FOLIAGE.olive): void {
  const [x, y] = st.iso(u, v);
  st.scene.add(u + v, () => bush(st.ctx, x, y, r, color, INK, st.rand));
}

export interface TreeSpec {
  kind?: 'round' | 'pine' | 'dead';
  w?: number;
  h?: number;
  leaf?: string;
  snow?: boolean;
}

export function addTree(st: Stage, u: number, v: number, o: TreeSpec = {}): void {
  const [x, y] = st.iso(u, v);
  const { ctx, rand } = st;
  const kind = o.kind ?? 'round';
  const w = o.w ?? 16;
  const h = o.h ?? 21;
  st.scene.add(u + v, () => {
    if (kind === 'pine') drawPine(ctx, { cx: x, baseY: y, w, h, leaf: o.leaf ?? FOLIAGE.dark, ink: INK, rand, snow: o.snow });
    else if (kind === 'dead') drawDeadTree(ctx, { cx: x, baseY: y, w, h, leaf: o.leaf ?? FOLIAGE.dark, ink: INK, rand });
    else drawRoundTree(ctx, { cx: x, baseY: y, w, h, leaf: o.leaf ?? FOLIAGE.green, ink: INK, rand });
  });
}

export function addRocks(st: Stage, u: number, v: number, n = 3, spread = 5, color = '#8d887d'): void {
  const [x, y] = st.iso(u, v);
  st.scene.add(u + v, () => rocks(st.ctx, x, y, n, spread, color, INK, st.rand));
}

export function addTufts(st: Stage, u: number, v: number, n = 3, spread = 6, color = '#7da043', size = 4): void {
  for (let i = 0; i < n; i++) {
    const uu = u + st.rand.range(-spread, spread);
    const vv = v + st.rand.range(-spread, spread);
    const [x, y] = st.iso(uu, vv);
    const s = size * st.rand.range(0.75, 1.2);
    st.scene.add(uu + vv, () => tuft(st.ctx, x, y, s, color, st.rand));
  }
}

/** A wooden crate; `z0` lets it sit on top of another one. */
export function addCrate(st: Stage, u: number, v: number, a = 3.4, b = 3, h = 3, color: string = WOOD.light, z0 = 0): void {
  const { ctx, iso, scene } = st;
  scene.add(u + v + (a + b) / 2, () => {
    const poly: Vec2[] = [[u, v], [u + a, v], [u + a, v + b], [u, v + b]];
    const res = drawPrism(ctx, iso, { poly, z0, h, stone: color, lineWidth: 0.8 });
    for (const f of res.faces) {
      inFace(ctx, f.frame, () => {
        ctx.strokeStyle = rgba('#3b2a1c', 0.5);
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(0.4, 0.4);
        ctx.lineTo(f.len - 0.4, h - 0.4);
        ctx.moveTo(0.4, h - 0.4);
        ctx.lineTo(f.len - 0.4, 0.4);
        ctx.stroke();
      });
    }
  });
}

export function addBarrel(st: Stage, u: number, v: number, r = 1.9, h = 3.8, color: string = WOOD.base): void {
  const { ctx, iso, scene } = st;
  const [x, y] = iso(u, v);
  scene.add(u + v, () => {
    const t = shades(color);
    const ry = r * 0.38;
    softBlob(ctx, x + r * 0.5, y + 0.4, r * 1.5, ry * 1.1, '#1d160c', 0.28);
    const body = new Path2D();
    body.moveTo(x - r, y - h);
    body.lineTo(x + r, y - h);
    body.quadraticCurveTo(x + r * 1.4, y - h / 2, x + r, y);
    body.ellipse(x, y, r, ry, 0, 0, Math.PI, false);
    body.quadraticCurveTo(x - r * 1.4, y - h / 2, x - r, y - h);
    body.closePath();
    ctx.fillStyle = linearGradient(ctx, x - r, 0, x + r, 0, [[0, t.light], [0.45, t.base], [1, t.deep]]);
    ctx.fill(body);
    ctx.save();
    ctx.clip(body);
    ctx.strokeStyle = rgba('#2b2118', 0.7);
    ctx.lineWidth = 0.8;
    for (const k of [0.28, 0.72]) {
      ctx.beginPath();
      ctx.ellipse(x, y - h * k, r * 1.3, ry, 0, 0, Math.PI, false);
      ctx.stroke();
    }
    ctx.restore();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = INK;
    ctx.stroke(body);
    ellipse(ctx, x, y - h, r, ry, { fill: t.highlight, stroke: INK, width: 0.8 });
  });
}

export function addWell(st: Stage, u: number, v: number, stone = '#b4aea0'): void {
  const { ctx, iso, scene } = st;
  const [x, y] = iso(u, v);
  scene.add(u + v, () => {
    const r = 3.6;
    const ry = r * 0.42;
    const hh = 3.4;
    const t = shades(stone);
    softBlob(ctx, x + 2, y + 0.5, r * 1.5, ry * 1.3, '#1d160c', 0.3);
    const body = new Path2D();
    body.moveTo(x - r, y - hh);
    body.lineTo(x + r, y - hh);
    body.lineTo(x + r, y);
    body.ellipse(x, y, r, ry, 0, 0, Math.PI, false);
    body.closePath();
    ctx.fillStyle = linearGradient(ctx, x - r, 0, x + r, 0, [[0, t.highlight], [0.4, t.light], [1, t.shade]]);
    ctx.fill(body);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.9;
    ctx.stroke(body);
    ellipse(ctx, x, y - hh, r, ry, { fill: t.highlight, stroke: INK, width: 0.9 });
    ellipse(ctx, x, y - hh, r * 0.72, ry * 0.7, { fill: '#27414f' });
    ellipse(ctx, x - r * 0.2, y - hh - 0.2, r * 0.3, ry * 0.25, { fill: rgba('#9cd0dc', 0.55) });
    for (const sx of [-1, 1]) shape(ctx, [[x + sx * r * 0.88, y - hh], [x + sx * r * 0.88, y - hh - 7.5]], { stroke: INK, width: 1.6, closed: false });
    for (const sx of [-1, 1]) shape(ctx, [[x + sx * r * 0.88, y - hh], [x + sx * r * 0.88, y - hh - 7.5]], { stroke: WOOD.base, width: 0.9, closed: false });
    shape(ctx, [[x - r * 1.35, y - hh - 6.4], [x, y - hh - 11.2], [x + r * 1.35, y - hh - 6.4]], { fill: '#b2503a', stroke: INK, width: 0.9 });
    shape(ctx, [[x, y - hh - 11.2], [x + r * 1.35, y - hh - 6.4], [x, y - hh - 5.8]], { fill: '#8a3a2b', stroke: INK, width: 0.7 });
  });
}

/** A market stall with a striped awning. */
export function addStall(st: Stage, u: number, v: number, color = '#b2503a', goods = '#d9a441'): void {
  const { ctx, iso, scene, rand } = st;
  scene.add(u + v + 3, () => {
    const a = 6;
    const b = 4;
    const poly: Vec2[] = [[u, v], [u + a, v], [u + a, v + b], [u, v + b]];
    const base = iso(u, v);
    softBlob(ctx, base[0] + 5, base[1] - 2, 9, 3, '#1d160c', 0.28);
    drawPrism(ctx, iso, { poly, h: 2.6, stone: WOOD.base, lineWidth: 0.8, top: WOOD.light });
    for (let i = 0; i < 4; i++) {
      const [gx, gy] = iso(u + 1 + i * 1.3, v + 1 + rand.range(0, 1.6), 2.6);
      ellipse(ctx, gx, gy, 1.3, 0.9, { fill: i % 2 ? goods : mix(goods, '#c0392b', 0.6), stroke: rgba(INK, 0.7), width: 0.5 });
    }
    const posts: Vec2[] = [[u + 0.3, v + 0.3], [u + a - 0.3, v + 0.3], [u + a - 0.3, v + b - 0.3], [u + 0.3, v + b - 0.3]];
    const pt = (p: Vec2, z: number) => iso(p[0], p[1], z);
    for (const p of posts) shape(ctx, [pt(p, 0), pt(p, 8)], { stroke: INK, width: 1.4, closed: false });
    // Awning slopes from the back (high) to the front (low).
    const hi = 9.4;
    const lo = 6.6;
    const stripes = 4;
    for (let i = 0; i < stripes; i++) {
      const u0 = u - 0.4 + ((a + 0.8) * i) / stripes;
      const u1 = u - 0.4 + ((a + 0.8) * (i + 1)) / stripes;
      shape(ctx, [iso(u0, v - 0.8, lo), iso(u1, v - 0.8, lo), iso(u1, v + b + 0.4, hi), iso(u0, v + b + 0.4, hi)], {
        fill: i % 2 ? '#efe6d2' : color,
        stroke: rgba(INK, 0.85),
        width: 0.7,
      });
    }
  });
}

export function addBanner(st: Stage, u: number, v: number, h = 14, color = '#c0392b', z = 0): void {
  const [x, y] = st.iso(u, v, z);
  st.scene.add(u + v, () => drawFlag(st.ctx, x, y, h, color, INK, 1));
}

export interface PalisadeOpts {
  h?: number;
  color?: string;
  /** Gap for a gate, as distance range along the line. */
  gap?: [number, number];
}

/** A row of pointed logs along the line `p`-`q`. */
export function addPalisade(st: Stage, p: Vec2, q: Vec2, o: PalisadeOpts = {}): void {
  const { ctx, iso, scene, rand } = st;
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
  const step = 2.1;
  const n = Math.max(1, Math.round(L / step));
  const col = o.color ?? '#a07c4e';
  for (let i = 0; i <= n; i++) {
    const s = (i / n) * L;
    if (o.gap && s > o.gap[0] && s < o.gap[1]) continue;
    const uu = p[0] + ((q[0] - p[0]) * i) / n;
    const vv = p[1] + ((q[1] - p[1]) * i) / n;
    const h = (o.h ?? 13) * rand.range(0.9, 1.1);
    const tone = shades(mix(col, '#5a4126', rand.range(0, 0.35)));
    const [x, y] = iso(uu, vv);
    scene.add(uu + vv, () => {
      const w = 1.25;
      const log = new Path2D();
      log.moveTo(x - w, y);
      log.lineTo(x - w, y - h + 2.2);
      log.lineTo(x, y - h);
      log.lineTo(x + w, y - h + 2.2);
      log.lineTo(x + w, y);
      log.ellipse(x, y, w, w * 0.4, 0, 0, Math.PI, false);
      log.closePath();
      ctx.fillStyle = linearGradient(ctx, x - w, 0, x + w, 0, [[0, tone.highlight], [0.5, tone.base], [1, tone.deep]]);
      ctx.fill(log);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.8;
      ctx.lineJoin = 'round';
      ctx.stroke(log);
    });
  }
}

/** A short run of wooden fence. */
export function addFence(st: Stage, p: Vec2, q: Vec2, h = 3.6, color = '#9a6f45'): void {
  const { ctx, iso, scene } = st;
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
  const n = Math.max(1, Math.round(L / 3.4));
  const at = (i: number): Vec2 => [p[0] + ((q[0] - p[0]) * i) / n, p[1] + ((q[1] - p[1]) * i) / n];
  scene.add(Math.min(p[0] + p[1], q[0] + q[1]) + L * 0.25, () => {
    const a = iso(p[0], p[1]);
    const b = iso(q[0], q[1]);
    for (const k of [0.45, 0.85]) {
      shape(ctx, [[a[0], a[1] - h * k], [b[0], b[1] - h * k]], { stroke: INK, width: 1.7, closed: false });
      shape(ctx, [[a[0], a[1] - h * k], [b[0], b[1] - h * k]], { stroke: color, width: 0.9, closed: false });
    }
    for (let i = 0; i <= n; i++) {
      const g = at(i);
      const [x, y] = iso(g[0], g[1]);
      shape(ctx, [[x, y], [x, y - h - 0.6]], { stroke: INK, width: 1.9, closed: false });
      shape(ctx, [[x, y], [x, y - h - 0.6]], { stroke: mix(color, '#3b2a1c', 0.25), width: 1, closed: false });
    }
  });
}

/** Stacked firewood or hay: a round bale. */
export function addHaystack(st: Stage, u: number, v: number, r = 3.6): void {
  const { ctx, iso, scene } = st;
  const [x, y] = iso(u, v);
  scene.add(u + v, () => {
    const t = shades('#d2b25a');
    softBlob(ctx, x + r * 0.6, y + 0.5, r * 1.5, r * 0.5, '#1d160c', 0.28);
    const body = new Path2D();
    body.moveTo(x - r, y);
    body.bezierCurveTo(x - r * 1.05, y - r * 1.4, x - r * 0.3, y - r * 1.9, x, y - r * 1.9);
    body.bezierCurveTo(x + r * 0.3, y - r * 1.9, x + r * 1.05, y - r * 1.4, x + r, y);
    body.ellipse(x, y, r, r * 0.38, 0, 0, Math.PI, false);
    body.closePath();
    ctx.fillStyle = linearGradient(ctx, x - r, 0, x + r, 0, [[0, t.highlight], [0.45, t.light], [1, t.shade]]);
    ctx.fill(body);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.9;
    ctx.stroke(body);
    ctx.strokeStyle = rgba(t.deep, 0.6);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = -0.5 + i * 0.5;
      ctx.moveTo(x + a * r * 1.1, y - r * 0.2);
      ctx.lineTo(x + a * r * 0.7, y - r * 1.5);
    }
    ctx.stroke();
  });
}

/** Soft dirt patch decal under a prop cluster. */
export function addDirt(st: Stage, u: number, v: number, a: number, b: number, color = '#a8926b', alpha = 0.55): void {
  const { ctx, iso, scene, rand } = st;
  const pts: Vec2[] = [];
  const steps = 12;
  for (let i = 0; i < steps; i++) {
    const th = (i / steps) * TAU;
    pts.push(iso(u + Math.cos(th) * a * rand.range(0.82, 1.12), v + Math.sin(th) * b * rand.range(0.82, 1.12)));
  }
  scene.add(1e6 + 1, () => {
    ctx.save();
    shape(ctx, pts, { fill: rgba(color, alpha), smooth: true });
    ctx.restore();
  });
}

/** A footpath ribbon between grid points; drawn under everything. */
export function addPath(st: Stage, pts: readonly Vec2[], width = 3, color = '#b99f72', alpha = 0.75): void {
  const { ctx, iso, scene } = st;
  const sp = pts.map((g): Vec2 => iso(g[0], g[1]));
  scene.add(1e6 + 2, () => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [w, c, a] of [[width * 1.22, mix(color, '#2a2015', 0.4), alpha * 0.55], [width, color, alpha]] as const) {
      ctx.strokeStyle = rgba(c, a);
      ctx.lineWidth = w;
      ctx.beginPath();
      tracePoly(ctx, sp, false);
      ctx.stroke();
    }
    ctx.restore();
  });
}

/** A grassy mound with a flat top (motte, burial hill). Objects on top use a stage raised by `h`. */
export function addMound(st: Stage, u: number, v: number, r0: number, r1: number, h: number, color = '#7f9a4c'): void {
  const { ctx, iso, scene, rand } = st;
  const [cx, cy] = iso(u, v);
  const rx0 = r0 * 1.22;
  const ry0 = r0 * 0.5;
  const rx1 = r1 * 1.22;
  const ry1 = r1 * 0.5;
  const tones = shades(color);
  const earth = shades(mix(color, '#7a5a35', 0.55));
  const seed = rand.fork(rand.int(0, 1e9));
  scene.shadow(shadowOf(ellipseFootprint(cx, cy, rx0, ry0, 14), h * 0.8, 0.5));
  // Sorted behind everything that stands on the plateau.
  scene.add(u + v + r1 * 1.42 + 0.3, () => {
    const body = new Path2D();
    body.moveTo(cx - rx0, cy);
    body.bezierCurveTo(cx - rx0 * 0.98, cy - h * 0.55, cx - rx1 * 1.08, cy - h * 0.8, cx - rx1, cy - h);
    body.ellipse(cx, cy - h, rx1, ry1, 0, Math.PI, 0, false);
    body.bezierCurveTo(cx + rx1 * 1.08, cy - h * 0.8, cx + rx0 * 0.98, cy - h * 0.55, cx + rx0, cy);
    body.ellipse(cx, cy, rx0, ry0, 0, 0, Math.PI, false);
    body.closePath();
    ctx.save();
    ctx.fillStyle = linearGradient(ctx, cx - rx0, 0, cx + rx0, 0, [[0, tones.light], [0.35, tones.base], [0.75, tones.shade], [1, tones.deep]]);
    ctx.fill(body);
    ctx.clip(body);
    // Bare earth near the foot and a few strata of turf.
    ctx.fillStyle = linearGradient(ctx, 0, cy - h * 0.45, 0, cy + ry0, [rgba(earth.base, 0), rgba(earth.shade, 0.55)]);
    ctx.fillRect(cx - rx0, cy - h * 0.45, rx0 * 2, h * 0.45 + ry0 + 1);
    ctx.strokeStyle = rgba(tones.deep, 0.4);
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 4; i++) {
      const yy = cy - h * (0.2 + 0.2 * i);
      ctx.beginPath();
      ctx.ellipse(cx, yy, lerpN(rx0, rx1, 0.2 + 0.2 * i), lerpN(ry0, ry1, 0.2 + 0.2 * i), 0, 0.15 * Math.PI, 0.85 * Math.PI, false);
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.lineJoin = 'round';
    ctx.stroke(body);
    ctx.restore();
    // Flat top.
    ctx.beginPath();
    ctx.ellipse(cx, cy - h, rx1, ry1, 0, 0, TAU);
    ctx.fillStyle = linearGradient(ctx, cx - rx1, 0, cx + rx1, 0, [tones.highlight, tones.light, tones.base]);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const a = seed.range(0, TAU);
      tuft(ctx, cx + Math.cos(a) * rx0 * 0.85, cy + Math.sin(a) * ry0 * 0.9 + 1, 3, color, seed);
    }
  });
}

function lerpN(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Fallen blocks scattered around a point. */
export function addRubble(st: Stage, u: number, v: number, n: number, spread: number, stone: string): void {
  const { ctx, iso, scene, rand } = st;
  for (let i = 0; i < n; i++) {
    const pu = u + rand.range(-spread, spread);
    const pv = v + rand.range(-spread, spread);
    const a = rand.range(1.6, 3.8);
    const b = rand.range(1.4, 3.2);
    const hh = rand.range(1.2, 3);
    const j = () => rand.range(-0.45, 0.45);
    const poly: Vec2[] = [[pu + j(), pv + j()], [pu + a + j(), pv + j()], [pu + a + j(), pv + b + j()], [pu + j(), pv + b + j()]];
    const tone = mix(stone, rand.chance(0.5) ? '#ffffff' : '#000000', rand.range(0, 0.16));
    scene.shadow(shadowOf(poly.map((g): Vec2 => iso(g[0], g[1])), hh, 0.6));
    scene.add(pu + pv + (a + b) / 2, () => {
      drawPrism(ctx, iso, { poly, h: hh, stone: tone, lineWidth: 0.8 });
    });
  }
}

export { BARK, FOLIAGE };
