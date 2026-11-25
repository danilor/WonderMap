import { mix, rgba } from '../kit/colors';
import { ellipse, shades, shape } from '../kit/draw';
import { TAU } from '../kit/math';
import type { Vec2 } from '../kit/types';
import { drawPrism } from './settle-castle';
import { INK, boxFootprint, ellipseFootprint, shadowOf } from './settle-geom';
import type { Stage } from './settle-geom';
import { SEA } from './settle-harbor';

/** Shore and yard props: palms, drying racks, log and plank piles, scaffolding, slipways and stilt houses. */

export interface PalmOpts {
  h?: number;
  /** Horizontal drift of the crown in pixels. */
  lean?: number;
  leaf?: string;
}

export function addPalm(st: Stage, u: number, v: number, o: PalmOpts = {}): void {
  const { ctx, iso, scene, rand } = st;
  const h = o.h ?? 22;
  const seed = rand.fork(rand.int(0, 1e9));
  const lean = o.lean ?? seed.range(-5, 5);
  const leaf = o.leaf ?? '#5f9a3d';
  const [x, y] = iso(u, v);
  const top: Vec2 = [x + lean, y - h];
  const fronds = Array.from({ length: 8 }, (_, k) => {
    const a = (k / 8) * TAU + seed.range(-0.25, 0.25);
    const len = seed.range(9.5, 13);
    const tip: Vec2 = [top[0] + Math.cos(a) * len, top[1] + Math.sin(a) * len * 0.42 + len * 0.3];
    const ctl: Vec2 = [top[0] + Math.cos(a) * len * 0.55, top[1] + Math.sin(a) * len * 0.25 - len * 0.34];
    return { a, tip, ctl, len };
  }).sort((p, q) => p.tip[1] - q.tip[1]);
  scene.shadow(ellipseFootprint(x + 3, y + 0.8, 6.5, 2.4));
  scene.add(u + v, () => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const bend = (w: number): void => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + lean * 0.1 - 1.8, y - h * 0.55, top[0], top[1]);
      ctx.lineWidth = w;
      ctx.stroke();
    };
    ctx.strokeStyle = INK;
    bend(4);
    ctx.strokeStyle = '#a07c4e';
    bend(2.6);
    ctx.strokeStyle = rgba('#e0c28c', 0.7);
    ctx.setLineDash([0.8, 2.2]);
    bend(1.2);
    ctx.setLineDash([]);
    const body = (f: (typeof fronds)[number], inset: number): Vec2[] => {
      const dx = f.tip[0] - top[0];
      const dy = f.tip[1] - top[1];
      const L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L;
      const ny = dx / L;
      const w = 2.5 * inset;
      return [top, [f.ctl[0] + nx * w, f.ctl[1] + ny * w], f.tip, [f.ctl[0] - nx * w, f.ctl[1] - ny * w]];
    };
    for (const f of fronds) {
      const sunny = f.a > Math.PI * 0.5 && f.a < Math.PI * 1.5;
      const pts = body(f, 1);
      ctx.beginPath();
      ctx.moveTo(pts[0]![0], pts[0]![1]);
      ctx.quadraticCurveTo(pts[1]![0], pts[1]![1], pts[2]![0], pts[2]![1]);
      ctx.quadraticCurveTo(pts[3]![0], pts[3]![1], pts[0]![0], pts[0]![1]);
      ctx.fillStyle = sunny ? mix(leaf, '#d7e88a', 0.35) : mix(leaf, '#1d3a1e', 0.18);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.strokeStyle = rgba('#1d3a1e', 0.55);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(top[0], top[1]);
      ctx.quadraticCurveTo(f.ctl[0], f.ctl[1], f.tip[0], f.tip[1]);
      ctx.stroke();
    }
    for (const [dx, dy] of [[-1.4, 1.4], [1.2, 1.8], [0, 2.6]] as const) ellipse(ctx, top[0] + dx, top[1] + dy, 1.2, 1.2, { fill: '#6b4a2b', stroke: INK, width: 0.6 });
    ctx.restore();
  });
}

export interface RackOpts {
  u: number;
  v: number;
  len: number;
  dir?: 'u' | 'v';
  h?: number;
  hang?: 'fish' | 'net' | 'hides';
  wood?: string;
}

/** A drying rack: A-frames carrying a ridge pole with fish, a net or hides hanging from it. */
export function addRack(st: Stage, o: RackOpts): void {
  const { ctx, iso, scene, rand } = st;
  const dir = o.dir ?? 'u';
  const h = o.h ?? 7;
  const wood = o.wood ?? '#8a6a45';
  const seed = rand.fork(rand.int(0, 1e9));
  const P = (s: number, off: number, z: number): Vec2 => (dir === 'u' ? iso(o.u + s, o.v + off, z) : iso(o.u + off, o.v + s, z));
  const stations = Math.max(2, Math.round(o.len / 7) + 1);
  const fish = Array.from({ length: Math.round(o.len * 0.9) }, () => ({ s: seed.range(0.6, o.len - 0.6), drop: seed.range(2.6, 4.4), col: seed.pick(['#cfd6cc', '#e0b86a', '#b9c4c4', '#d8a35a']) }));
  scene.add((dir === 'u' ? o.u + o.len / 2 + o.v : o.u + o.v + o.len / 2) + 0.2, () => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const stroke = (pts: readonly Vec2[], w: number, col: string): void => {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
    };
    const legs: Vec2[][] = [];
    for (let k = 0; k < stations; k++) {
      const s = (k / (stations - 1)) * o.len;
      for (const side of [-1, 1]) legs.push([P(s, side * 1.8, 0), P(s, 0, h)]);
    }
    for (const leg of legs.filter((_, i) => i % 2 === 1)) {
      stroke(leg, 2.2, INK);
      stroke(leg, 1.1, wood);
    }
    // Hanging goods in front of the far legs.
    const a = P(0, 0, h);
    const b = P(o.len, 0, h);
    if (o.hang === 'net') {
      const pts = [a, b, [b[0], b[1] + h * 0.8], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + h * 0.95], [a[0], a[1] + h * 0.8]] as Vec2[];
      shape(ctx, pts, { fill: rgba('#8c9a7a', 0.45), stroke: rgba(INK, 0.8), width: 0.8, closed: true, smooth: false });
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0]![0], pts[0]![1]);
      pts.forEach((p) => ctx.lineTo(p[0], p[1]));
      ctx.clip();
      ctx.strokeStyle = rgba(INK, 0.5);
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let t = 0; t < L; t += 1.7) {
        const x = a[0] + ((b[0] - a[0]) * t) / L;
        const y = a[1] + ((b[1] - a[1]) * t) / L;
        ctx.moveTo(x, y);
        ctx.lineTo(x + 3, y + h);
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3, y + h);
      }
      ctx.stroke();
      ctx.restore();
    } else if (o.hang === 'hides') {
      for (let k = 0; k < Math.max(2, Math.round(o.len / 3.4)); k++) {
        const p = P(1.4 + k * 3.4, 0, h);
        shape(ctx, [[p[0] - 1.6, p[1] + 0.4], [p[0] + 1.6, p[1] + 0.4], [p[0] + 2.2, p[1] + 5.6], [p[0], p[1] + 6.4], [p[0] - 2.2, p[1] + 5.4]], { fill: seed.pick(['#b58f66', '#a07c5a', '#c9a77c']), stroke: INK, width: 0.7, closed: true });
      }
    } else {
      for (const f of fish) {
        const p = P(f.s, 0, h);
        stroke([[p[0], p[1]], [p[0], p[1] + 1.2]], 0.6, INK);
        ellipse(ctx, p[0], p[1] + 1.2 + f.drop * 0.5, 0.95, f.drop * 0.5, { fill: f.col, stroke: INK, width: 0.45 });
      }
    }
    stroke([a, b], 2.4, INK);
    stroke([a, b], 1.2, mix(wood, '#d9b886', 0.35));
    for (const leg of legs.filter((_, i) => i % 2 === 0)) {
      stroke(leg, 2.2, INK);
      stroke(leg, 1.1, wood);
    }
    ctx.restore();
  });
}

export interface LogPileOpts {
  u: number;
  v: number;
  len?: number;
  dir?: 'u' | 'v';
  layers?: number;
  r?: number;
  bark?: string;
}

/** Logs piled in a pyramid; the nearest end shows the rings. */
export function addLogPile(st: Stage, o: LogPileOpts): void {
  const { ctx, iso, scene } = st;
  const dir = o.dir ?? 'u';
  const len = o.len ?? 9;
  const r = o.r ?? 1.5;
  const layers = o.layers ?? 3;
  const bark = o.bark ?? '#7c5a3c';
  const P = (s: number, off: number, z: number): Vec2 => (dir === 'u' ? iso(o.u + s, o.v + off, z) : iso(o.u + off, o.v + s, z));
  const width = layers * 2 * r;
  scene.shadow(shadowOf(dir === 'u' ? boxFootprint(iso, o.u, o.v - width / 2, len, width) : boxFootprint(iso, o.u - width / 2, o.v, width, len), layers * r * 1.6, 0.5));
  scene.add((dir === 'u' ? o.u + len / 2 + o.v : o.u + o.v + len / 2) + 0.1, () => {
    ctx.save();
    ctx.lineCap = 'round';
    for (let l = 0; l < layers; l++) {
      const n = layers - l;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 2 * r * 0.98;
        const z = r + l * r * 1.72;
        const a = P(0, off, z);
        const b = P(len - (i % 2) * 0.8, off, z);
        ctx.strokeStyle = INK;
        ctx.lineWidth = r * 2 + 1;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
        ctx.strokeStyle = (i + l) % 2 ? bark : mix(bark, '#a98a5e', 0.4);
        ctx.lineWidth = r * 2;
        ctx.stroke();
        ellipse(ctx, a[0], a[1], r * 0.82, r * 0.98, { fill: '#e0c28c', stroke: INK, width: 0.6 });
        ellipse(ctx, a[0], a[1], r * 0.4, r * 0.5, { stroke: rgba('#8a6a45', 0.9), width: 0.4 });
      }
    }
    ctx.restore();
  });
}

/** A neat stack of boards. */
export function addPlankStack(st: Stage, u: number, v: number, a = 9, b = 3.6, h = 3.2, color = '#d6b983'): void {
  const { ctx, iso, scene, rand } = st;
  const seed = rand.fork(rand.int(0, 1e9));
  scene.shadow(shadowOf(boxFootprint(iso, u, v, a, b), h, 0.5));
  scene.add(u + v + (a + b) / 2, () => {
    drawPrism(ctx, iso, { poly: [[u, v], [u + a, v], [u + a, v + b], [u, v + b]], h, stone: color, tones: shades(color), rand: seed, row: 1.1, block: 90, top: mix(color, '#fff7e0', 0.25), lineWidth: 0.8 });
    ctx.save();
    ctx.strokeStyle = rgba(INK, 0.4);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let k = 1.2; k < b; k += 1.2) {
      const p = iso(u, v + k, h);
      const q = iso(u + a, v + k, h);
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
    }
    ctx.stroke();
    ctx.restore();
  });
}

export interface ScaffoldOpts {
  u: number;
  v: number;
  a: number;
  b: number;
  h: number;
  levels?: number;
  wood?: string;
}

/** Timber scaffolding around a footprint, painted in two halves so that the object inside is sandwiched between them. */
export function addScaffold(st: Stage, o: ScaffoldOpts): void {
  const { ctx, iso, scene } = st;
  const wood = o.wood ?? '#a57f52';
  const levels = o.levels ?? 3;
  const { u, v, a, b, h } = o;
  const ground = (pu: number, pv: number, z: number): Vec2 => iso(pu, pv, z);
  const line = (pts: readonly Vec2[], w: number): void => {
    ctx.strokeStyle = INK;
    ctx.lineWidth = w + 1.2;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    ctx.strokeStyle = wood;
    ctx.lineWidth = w;
    ctx.stroke();
  };
  const run = (p: Vec2, q: Vec2, w: number): void => {
    for (let k = 1; k <= levels; k++) {
      const z = (h * k) / levels;
      line([ground(p[0], p[1], z), ground(q[0], q[1], z)], w);
    }
  };
  const post = (pu: number, pv: number, w: number): void => line([ground(pu, pv, -0.5), ground(pu, pv, h + 2)], w);
  const nU = Math.max(2, Math.round(a / 9));
  const nV = Math.max(2, Math.round(b / 9));
  scene.add(u + a + v + b + 0.5, () => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i <= nU; i++) post(u + (a * i) / nU, v + b, 1.3);
    for (let i = 0; i < nV; i++) post(u + a, v + (b * i) / nV, 1.3);
    run([u, v + b], [u + a, v + b], 1.1);
    run([u + a, v], [u + a, v + b], 1.1);
    for (let i = 0; i < nU; i++) line([ground(u + (a * i) / nU, v + b, 0), ground(u + (a * (i + 1)) / nU, v + b, h * 0.66)], 0.9);
    ctx.restore();
  });
  scene.add(u + v - 1, () => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i <= nV; i++) post(u, v + (b * i) / nV, 1.4);
    for (let i = 1; i <= nU; i++) post(u + (a * i) / nU, v, 1.4);
    run([u, v], [u + a, v], 1.2);
    run([u, v], [u, v + b], 1.2);
    for (let i = 0; i < nV; i++) line([ground(u, v + (b * i) / nV, 0), ground(u, v + (b * (i + 1)) / nV, h * 0.66)], 0.9);
    // Plank walkway on the top level of the near side.
    const z = h;
    const w = 2.4;
    for (const quad of [
      [[u, v], [u + a, v], [u + a, v - w], [u, v - w]],
      [[u, v], [u, v + b], [u - w, v + b], [u - w, v]],
    ] as const) {
      ctx.beginPath();
      quad.forEach((p, i) => {
        const q = ground(p[0], p[1], z);
        if (i) ctx.lineTo(q[0], q[1]);
        else ctx.moveTo(q[0], q[1]);
      });
      ctx.closePath();
      ctx.fillStyle = mix(wood, '#e7cf9b', 0.35);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    ctx.restore();
  });
}

export interface SlipwayOpts {
  u: number;
  /** Top of the ramp on land. */
  v0: number;
  /** Bottom of the ramp, under water (negative v). */
  v1: number;
  w: number;
  wood?: string;
}

/** A launching ramp of sleepers and rails running into the water. */
export function addSlipway(st: Stage, o: SlipwayOpts): void {
  const { ctx, iso, scene } = st;
  const wood = o.wood ?? '#8f7a5a';
  const { u, w } = o;
  const draw = (va: number, vb: number, under: boolean): void => {
    const quad = [iso(u, va), iso(u + w, va), iso(u + w, vb), iso(u, vb)];
    ctx.save();
    ctx.beginPath();
    quad.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.fillStyle = mix(wood, '#2a2015', 0.25);
    ctx.fill();
    ctx.clip();
    ctx.lineCap = 'butt';
    for (let s = va; s > vb; s -= 2) {
      const p = iso(u, s);
      const q = iso(u + w, s);
      ctx.strokeStyle = mix(wood, '#d9b886', 0.35);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
      ctx.stroke();
      ctx.strokeStyle = rgba(INK, 0.55);
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1] + 0.9);
      ctx.lineTo(q[0], q[1] + 0.9);
      ctx.stroke();
    }
    for (const ru of [u + w * 0.22, u + w * 0.78]) {
      const p = iso(ru, va);
      const q = iso(ru, vb);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
      ctx.stroke();
      ctx.strokeStyle = '#c9a06a';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (under) {
      ctx.fillStyle = rgba(SEA.mid, 0.5);
      ctx.fillRect(Math.min(...quad.map((p) => p[0])), Math.min(...quad.map((p) => p[1])), 80, 80);
    }
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    quad.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.strokeStyle = rgba(INK, under ? 0.4 : 0.9);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  };
  scene.add(1e6 + 0.35, () => draw(o.v0, 0, false));
  scene.add(1e6 + 0.34, () => {
    draw(0, o.v1, true);
    const a = iso(o.u - 0.5, o.v1 - 0.3);
    const b = iso(o.u + w + 0.5, o.v1 - 0.3);
    ctx.save();
    ctx.strokeStyle = rgba(SEA.foam, 0.8);
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.restore();
  });
}

export interface StiltOpts {
  u: number;
  v: number;
  a: number;
  b: number;
  /** Height of the platform. */
  h: number;
  wood?: string;
  /** Pile base: 'water' draws foam rings at the feet. */
  base?: 'land' | 'water';
}

/** Piles and a plank floor for a hut standing on stilts. Build the hut itself on `raised(st, h)`. */
export function addStilts(st: Stage, o: StiltOpts): void {
  const { ctx, iso, scene } = st;
  const wood = o.wood ?? '#7a5a3a';
  const tones = shades(wood);
  const { u, v, a, b, h } = o;
  const posts: [number, number][] = [[u + 0.8, v + 0.8], [u + a - 0.8, v + 0.8], [u + 0.8, v + b - 0.8], [u + a - 0.8, v + b - 0.8], [u + a / 2, v + 0.8], [u + 0.8, v + b / 2]];
  scene.add(u + v + (a + b) / 2 + 0.3, () => {
    ctx.save();
    ctx.lineCap = 'round';
    for (const [pu, pv] of posts) {
      const p = iso(pu, pv, -1);
      const q = iso(pu, pv, h);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
      ctx.stroke();
      ctx.strokeStyle = tones.base;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      if (o.base === 'water') {
        ctx.strokeStyle = rgba(SEA.foam, 0.85);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(p[0], p[1] + 0.3, 2.2, 0.9, 0, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.restore();
  });
  scene.add(u + v + (a + b) / 2 + 0.2, () => {
    drawPrism(ctx, iso, { poly: [[u - 0.6, v - 0.6], [u + a + 0.6, v - 0.6], [u + a + 0.6, v + b + 0.6], [u - 0.6, v + b + 0.6]], z0: h - 1.2, h: 1.2, stone: wood, tones, top: tones.light, lineWidth: 0.8 });
  });
}
