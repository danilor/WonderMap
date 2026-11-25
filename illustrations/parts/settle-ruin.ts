import { mix, rgba } from '../kit/colors';
import { ellipse, linearGradient, shades, softBlob, tracePoly } from '../kit/draw';
import { TAU } from '../kit/math';
import type { Vec2 } from '../kit/types';
import { INK, K, boxFootprint, ellipseFootprint, inFace, leftFace, masonry, mottle, shadowOf, smoke } from './settle-geom';
import type { Stage } from './settle-geom';

/**
 * Ruin dressing: extruded wall slabs (gables, arches), column stumps, timber frames, fallen beams, gravestones,
 * smoke and embers. Positions are grid coordinates `(u, v)`.
 */

export interface SlabHole {
  pts: readonly Vec2[];
  /** Dark fill for windows; leave empty for openings you can see through. */
  fill?: string;
}

export interface SlabOpts {
  /** Plane of the lit front face. */
  u: number;
  /** Near end of the slab (the slab runs towards +v, i.e. to the upper left). */
  v: number;
  /** Thickness towards +u. */
  t: number;
  /** Outline as (distance along +v, height) pairs. */
  outline: readonly Vec2[];
  holes?: readonly SlabHole[];
  stone: string;
  moss?: boolean;
}

/** A thin wall of arbitrary profile: front face with masonry, visible top and end strips, optional openings. */
export function addSlab(st: Stage, o: SlabOpts): void {
  const { ctx, iso, scene, rand } = st;
  const sh = shades(o.stone);
  const P = (p: Vec2): Vec2 => iso(o.u, o.v + p[0], p[1]);
  const e: Vec2 = [K * o.t, -0.5 * o.t];
  const front = o.outline.map(P);
  const holes = (o.holes ?? []).map((h) => ({ pts: h.pts.map(P), fill: h.fill }));
  let w = 0;
  let hh = 0;
  for (const [s, z] of o.outline) {
    w = Math.max(w, s);
    hh = Math.max(hh, z);
  }
  const seed = rand.fork(rand.int(0, 1e9));
  scene.shadow(shadowOf(boxFootprint(iso, o.u, o.v, o.t, w), hh * 0.7, 0.5));
  scene.add(o.u + o.v + w / 2 + o.t, () => {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 0.9;
    ctx.strokeStyle = INK;
    const extrude = (ring: readonly Vec2[], tone: (a: Vec2, b: Vec2) => string): void => {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i]!;
        const b = ring[(i + 1) % ring.length]!;
        ctx.beginPath();
        tracePoly(ctx, [a, b, [b[0] + e[0], b[1] + e[1]], [a[0] + e[0], a[1] + e[1]]], true);
        ctx.fillStyle = tone(a, b);
        ctx.fill();
        ctx.stroke();
      }
    };
    extrude(front, (a, b) => (Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]) * 0.9 ? sh.highlight : sh.shade));
    for (const h of holes) extrude(h.pts, () => sh.deep);
    const xs = front.map((p) => p[0]);
    const ys = front.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const path = new Path2D();
    const addRing = (ring: readonly Vec2[]): void => {
      ring.forEach((p, i) => (i ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1])));
      path.closePath();
    };
    addRing(front);
    for (const h of holes) addRing(h.pts);
    ctx.fillStyle = linearGradient(ctx, x0, y0, x1, y1, [[0, sh.light], [0.55, sh.base], [1, mix(sh.base, sh.shade, 0.6)]]);
    ctx.fill(path, 'evenodd');
    ctx.save();
    ctx.clip(path, 'evenodd');
    inFace(ctx, leftFace(iso, o.u, o.v, w), () => {
      masonry(ctx, w, hh + 2, sh.deep, seed, { row: 4.2, block: 6 });
      mottle(ctx, w, hh, sh, seed, Math.max(2, Math.round((w * hh) / 90)));
    });
    ctx.fillStyle = linearGradient(ctx, 0, y0, 0, y1, [[0, rgba('#1d160c', 0)], [0.6, rgba('#1d160c', 0)], [1, rgba('#1d160c', 0.28)]]);
    ctx.fillRect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2);
    if (o.moss) {
      ctx.fillStyle = rgba('#5d7a3a', 0.5);
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.ellipse(seed.range(x0, x1), y1 - seed.range(0, 6), seed.range(2, 4.5), seed.range(1.2, 2.4), 0, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.stroke(path);
    for (const h of holes) {
      if (!h.fill) continue;
      ctx.beginPath();
      tracePoly(ctx, h.pts, true);
      ctx.fillStyle = rgba(h.fill, 0.62);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  });
}

/** A lancet or round-headed opening for `addSlab`: centre `c`, half width `hw`, vertical wall up to `zs`, apex at `za`. */
export function archHole(c: number, hw: number, z0: number, zs: number, za: number, pointed = true): Vec2[] {
  const pts: Vec2[] = [[c + hw, z0], [c + hw, zs]];
  const n = 9;
  for (let k = 1; k < n; k++) {
    const t = k / n;
    const z = pointed ? zs + (za - zs) * Math.pow(t, 0.55) : zs + (za - zs) * Math.sin((t * Math.PI) / 2);
    pts.push([c + hw * (1 - t), z]);
  }
  pts.push([c, za]);
  for (let k = n - 1; k >= 1; k--) {
    const t = k / n;
    const z = pointed ? zs + (za - zs) * Math.pow(t, 0.55) : zs + (za - zs) * Math.sin((t * Math.PI) / 2);
    pts.push([c - hw * (1 - t), z]);
  }
  pts.push([c - hw, zs], [c - hw, z0]);
  return pts;
}

export interface GableOpts {
  u: number;
  v: number;
  /** Width along +v. */
  w: number;
  /** Eaves height and extra height of the gable peak. */
  h: number;
  peak: number;
  t?: number;
  stone: string;
  moss?: boolean;
  /** Jaggedness of the broken edges, 0..1. */
  broken?: number;
  window?: boolean;
  /** An opening at the foot (door). */
  door?: boolean;
}

/** The surviving end wall of a church or hall: stepped gable with a tall window and a doorway. */
export function addGable(st: Stage, o: GableOpts): void {
  const { rand } = st;
  const br = o.broken ?? 0.35;
  const jag = (z: number): number => z - rand.range(0, br * 7);
  const mid = o.w / 2;
  const outline: Vec2[] = [[0, 0], [o.w, 0], [o.w, jag(o.h)]];
  for (const f of [0.75, 0.5, 0.25]) outline.push([o.w * f + rand.range(-1, 1), jag(o.h + o.peak * (1 - Math.abs(f * 2 - 1)))]);
  outline.push([0, jag(o.h * 0.85)]);
  const holes: SlabHole[] = [];
  if (o.window !== false) holes.push({ pts: archHole(mid, Math.min(4.6, o.w * 0.14), o.h * 0.38, o.h * 0.68, o.h * 0.68 + Math.min(8, o.w * 0.26)), fill: '#2b2118' });
  if (o.door) holes.push({ pts: archHole(mid, Math.min(3.6, o.w * 0.11), 0, Math.min(8, o.h * 0.25), Math.min(8, o.h * 0.25) + 3, false), fill: '#1f1710' });
  addSlab(st, { u: o.u, v: o.v, t: o.t ?? 3.4, outline, holes, stone: o.stone, moss: o.moss });
}

export interface ArchwayOpts {
  u: number;
  v: number;
  /** Clear opening width and overall height. */
  w: number;
  h: number;
  pier?: number;
  t?: number;
  stone: string;
  moss?: boolean;
  /** Breaks off one shoulder of the arch. */
  broken?: boolean;
}

/** A free-standing arch: two piers carrying a round or pointed head. */
export function addArchway(st: Stage, o: ArchwayOpts): void {
  const { rand } = st;
  const p = o.pier ?? 3.4;
  const W = o.w + p * 2;
  const outline: Vec2[] = [[0, 0], [W, 0], [W, o.h * 0.78]];
  const n = 7;
  const spring = o.h * 0.78;
  const rise = o.h * 0.22;
  for (let k = 1; k < n; k++) {
    const t = k / n;
    const broken = o.broken && t > 0.5 && t < 0.9;
    outline.push([W - (W / 2) * t, spring + (broken ? rise * 0.25 * Math.sin(t * 3) : rise * Math.sin((t * Math.PI) / 2))]);
  }
  outline.push([W / 2, o.broken ? spring + rise * 0.5 : o.h]);
  for (let k = n - 1; k >= 1; k--) {
    const t = k / n;
    outline.push([(W / 2) * t, spring + rise * Math.sin((t * Math.PI) / 2)]);
  }
  outline.push([0, spring - rand.range(0, 2)]);
  const zs = o.h * 0.52;
  const hole = archHole(W / 2, o.w / 2, 0, zs, o.h - p * 0.9, false);
  addSlab(st, { u: o.u, v: o.v, t: o.t ?? 3.4, outline, holes: [{ pts: hole }], stone: o.stone, moss: o.moss });
}

export interface ColumnOpts {
  h: number;
  r?: number;
  stone?: string;
  /** 0 = intact with a capital; otherwise a jagged break. */
  broken?: number;
  /** Ancient pale marble versus plain grey stone: only changes the default colour. */
  base?: boolean;
}

/** A round column with plinth and (when intact) capital; a broken one ends in a jagged stump. */
export function addColumn(st: Stage, u: number, v: number, o: ColumnOpts): void {
  const { ctx, iso, scene, rand } = st;
  const r = o.r ?? 2.6;
  const tones = shades(o.stone ?? '#d9d0bd');
  const [x, y] = iso(u, v);
  const seed = rand.fork(rand.int(0, 1e9));
  const br = o.broken ?? 0;
  const plinth = 2.2;
  scene.shadow(shadowOf(ellipseFootprint(x, y, r * 1.25, r * 0.62, 8), o.h * (br ? 0.9 : 1) * 0.9, 0.55));
  scene.add(u + v, () => {
    ctx.save();
    ctx.lineJoin = 'round';
    // Plinth.
    const pw = r * 1.55;
    ctx.beginPath();
    ctx.ellipse(x, y, pw, pw * 0.48, 0, 0, TAU);
    ctx.fillStyle = linearGradient(ctx, x - pw, 0, x + pw, 0, [tones.light, tones.base, tones.shade]);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(x - pw, y - plinth, pw * 2, plinth);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - pw, y - plinth);
    ctx.lineTo(x - pw, y);
    ctx.ellipse(x, y, pw, pw * 0.48, 0, Math.PI, 0, true);
    ctx.lineTo(x + pw, y - plinth);
    ctx.ellipse(x, y - plinth, pw, pw * 0.48, 0, 0, Math.PI, false);
    ctx.closePath();
    ctx.fillStyle = linearGradient(ctx, x - pw, 0, x + pw, 0, [tones.light, tones.base, tones.shade]);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, y - plinth, pw, pw * 0.48, 0, 0, TAU);
    ctx.fillStyle = tones.highlight;
    ctx.fill();
    ctx.stroke();
    // Shaft.
    const top = o.h - (br ? seed.range(0, 0.5) * o.h * br * 0.6 : 0);
    const yb = y - plinth;
    const shaft = new Path2D();
    const jag: Vec2[] = [];
    if (br) {
      const n = 5;
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        jag.push([x + r - 2 * r * k, yb - top + seed.range(-1, 1) * (1.2 + br * 4)]);
      }
    } else {
      jag.push([x + r, yb - top], [x - r, yb - top]);
    }
    shaft.moveTo(x - r, yb);
    shaft.lineTo(jag[jag.length - 1]![0], jag[jag.length - 1]![1]);
    for (let i = jag.length - 2; i >= 0; i--) shaft.lineTo(jag[i]![0], jag[i]![1]);
    shaft.lineTo(x + r, yb);
    shaft.ellipse(x, yb, r, r * 0.46, 0, 0, Math.PI, false);
    shaft.closePath();
    ctx.fillStyle = linearGradient(ctx, x - r, 0, x + r, 0, [[0, tones.highlight], [0.3, tones.light], [0.7, tones.base], [1, tones.shade]]);
    ctx.fill(shaft);
    ctx.save();
    ctx.clip(shaft);
    ctx.strokeStyle = rgba(tones.deep, 0.35);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (const f of [-0.4, 0.15, 0.62]) {
      ctx.moveTo(x + r * f, yb - top);
      ctx.lineTo(x + r * f, yb + 1);
    }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.stroke(shaft);
    if (br) {
      ctx.beginPath();
      tracePoly(ctx, jag, false);
      ctx.lineTo(x - r, yb - top + 1.6);
      ctx.lineTo(x + r, yb - top + 1.6);
      ctx.closePath();
      ctx.fillStyle = tones.highlight;
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
    } else {
      // Capital: a flared block and an abacus.
      const cy = yb - top;
      ctx.beginPath();
      tracePoly(ctx, [[x - r * 1.05, cy], [x - r * 1.5, cy - 1.8], [x + r * 1.5, cy - 1.8], [x + r * 1.05, cy]], true);
      ctx.fillStyle = tones.base;
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, cy - 2.5, r * 1.75, r * 0.82, 0, 0, TAU);
      ctx.fillStyle = tones.highlight;
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(x - r * 1.75, cy - 3.3, r * 3.5, 1.9);
      ctx.fillStyle = linearGradient(ctx, x - r * 1.75, 0, x + r * 1.75, 0, [tones.light, tones.base, tones.shade]);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, cy - 3.4, r * 1.75, r * 0.82, 0, 0, TAU);
      ctx.fillStyle = tones.highlight;
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  });
}

/** A column drum or whole column lying on the ground along a grid direction. */
export function addFallenColumn(st: Stage, u: number, v: number, len: number, along: 'u' | 'v', r = 2.4, stone = '#d9d0bd'): void {
  const { ctx, iso, scene } = st;
  const tones = shades(stone);
  const p = iso(u, v);
  const q = along === 'u' ? iso(u + len, v) : iso(u, v + len);
  scene.shadow(shadowOf([p, q, [q[0], q[1] + r * 0.5], [p[0], p[1] + r * 0.5]], r * 1.4, 0.5));
  scene.add(u + v + len / 2, () => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = r * 2 + 1.7;
    ctx.beginPath();
    ctx.moveTo(p[0], p[1] - r);
    ctx.lineTo(q[0], q[1] - r);
    ctx.stroke();
    ctx.lineCap = 'butt';
    for (const [c, off, wd] of [[tones.shade, 0.35, r * 2], [tones.base, -0.05, r * 1.5], [tones.light, -0.45, r * 0.9], [tones.highlight, -0.62, r * 0.38]] as const) {
      ctx.strokeStyle = c;
      ctx.lineWidth = wd;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1] - r + off * r);
      ctx.lineTo(q[0], q[1] - r + off * r);
      ctx.stroke();
    }
    ellipse(ctx, q[0], q[1] - r, r * 0.55, r * 1.0, { fill: tones.light, stroke: INK, width: 0.8, rotation: 0.35 });
    ctx.restore();
  });
}

export interface TrussOpts {
  u: number;
  v: number;
  a: number;
  b: number;
  h: number;
  rise: number;
  wood?: string;
  /** Fraction of the rafters that have burned away. */
  burnt?: number;
}

/** The bare timber frame of a house that lost its walls and roof: gable frames joined by a ridge beam. */
export function addTruss(st: Stage, o: TrussOpts): void {
  const { ctx, iso, scene, rand } = st;
  const wood = o.wood ?? '#4a3a2b';
  const burnt = o.burnt ?? 0;
  const segs: [Vec2, Vec2][] = [];
  const seg = (p: [number, number, number], q: [number, number, number]): void => {
    segs.push([iso(p[0], p[1], p[2]), iso(q[0], q[1], q[2])]);
  };
  const vm = o.v + o.b / 2;
  const frames = o.a > 16 ? [o.u, o.u + o.a / 2, o.u + o.a] : [o.u, o.u + o.a];
  for (const uu of frames) {
    seg([uu, o.v, 0], [uu, o.v, o.h]);
    seg([uu, o.v + o.b, 0], [uu, o.v + o.b, o.h * rand.range(0.7, 1)]);
    seg([uu, o.v, o.h], [uu, o.v + o.b, o.h]);
    if (!rand.chance(burnt * 0.5)) seg([uu, o.v, o.h], [uu, vm, o.h + o.rise]);
    if (!rand.chance(burnt * 0.6)) seg([uu, o.v + o.b, o.h], [uu, vm, o.h + o.rise]);
    seg([uu, vm, o.h], [uu, vm, o.h + o.rise]);
    seg([uu, o.v + o.b * 0.25, o.h * 0.5], [uu, o.v + o.b * 0.75, o.h]);
  }
  seg([o.u, vm, o.h + o.rise], [o.u + o.a, vm, o.h + o.rise]);
  seg([o.u, o.v, o.h], [o.u + o.a, o.v, o.h]);
  seg([o.u, o.v + o.b, o.h], [o.u + o.a, o.v + o.b, o.h]);
  scene.shadow(shadowOf(boxFootprint(iso, o.u, o.v, o.a, o.b), o.h * 0.5, 0.4));
  scene.add(o.u + o.v + (o.a + o.b) / 2, () => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [c, w] of [[INK, 2.7], [wood, 1.35], [mix(wood, '#ffffff', 0.18), 0.5]] as const) {
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      ctx.beginPath();
      for (const [p, q] of segs) {
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(q[0], q[1]);
      }
      ctx.stroke();
    }
    ctx.restore();
  });
}

/** Fallen beams and planks scattered over the ground. */
export function addBeams(st: Stage, u: number, v: number, n: number, spread: number, color = '#4a3a2b'): void {
  const { ctx, iso, scene, rand } = st;
  for (let i = 0; i < n; i++) {
    const uu = u + rand.range(-spread, spread);
    const vv = v + rand.range(-spread, spread);
    const [x, y] = iso(uu, vv);
    const ang = rand.range(-0.7, 0.7);
    const len = rand.range(3, 6.5);
    const dx = Math.cos(ang) * len;
    const dy = Math.sin(ang) * len * 0.5;
    scene.add(uu + vv, () => {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - dx, y - dy);
      ctx.lineTo(x + dx, y + dy);
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.restore();
    });
  }
}

/** A single glowing ember cluster on scorched ground. */
export function addEmbers(st: Stage, u: number, v: number, n: number, spread: number): void {
  const { ctx, iso, scene, rand } = st;
  for (let i = 0; i < n; i++) {
    const uu = u + rand.range(-spread, spread);
    const vv = v + rand.range(-spread, spread);
    const [x, y] = iso(uu, vv);
    const s = rand.range(0.7, 1.4);
    scene.add(uu + vv, () => {
      softBlob(ctx, x, y, s * 2.6, s * 1.6, '#ff9a3c', 0.35);
      ctx.fillStyle = '#ffc860';
      ctx.fillRect(x - s * 0.5, y - s * 0.4, s, s * 0.8);
    });
  }
}

/** A column of smoke painted over everything else; `dark` is the black smoke of a burning building. */
export function addSmoke(st: Stage, u: number, v: number, z: number, puffs = 5, size = 3.4, dark = false): void {
  const { ctx, iso, scene, rand } = st;
  const [x, y] = iso(u, v, z);
  const seed = rand.fork(rand.int(0, 1e9));
  scene.add(-1e6 + u + v, () => {
    if (!dark) {
      smoke(ctx, x, y, puffs, size, seed);
      return;
    }
    for (let i = 0; i < puffs; i++) {
      const t = i / Math.max(1, puffs - 1);
      const r = size * (0.5 + 0.9 * t);
      softBlob(ctx, x + t * size * 1.8 + seed.range(-0.6, 0.6), y - t * size * 2.5, r, r * 0.9, mix('#3b3530', '#8d8780', t * 0.75), 0.78 - 0.36 * t);
    }
  });
}

/** A soft scorched or stained ground decal, centred on a grid point (radii in sprite pixels). */
export function addScorch(st: Stage, u: number, v: number, rx: number, ry: number, color = '#2f2820', alpha = 0.5): void {
  const { ctx, iso, scene, rand } = st;
  const [x, y] = iso(u, v);
  const seed = rand.fork(rand.int(0, 1e9));
  scene.add(1e6 + 0.5, () => {
    softBlob(ctx, x, y, rx, ry, color, alpha);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + seed.range(-0.3, 0.3);
      softBlob(ctx, x + Math.cos(a) * rx * 0.55, y + Math.sin(a) * ry * 0.55, rx * seed.range(0.35, 0.55), ry * seed.range(0.35, 0.55), color, alpha * 0.8);
    }
  });
}

export interface GraveOpts {
  kind?: 'slab' | 'cross' | 'round' | 'obelisk' | 'celtic';
  h?: number;
  stone?: string;
  lean?: number;
}

/** A small headstone with a turf mound in front of it. */
export function addGravestone(st: Stage, u: number, v: number, o: GraveOpts = {}): void {
  const { ctx, iso, scene } = st;
  const [x, y] = iso(u, v);
  const h = o.h ?? 5;
  const tones = shades(o.stone ?? '#bdb6a6');
  const kind = o.kind ?? 'slab';
  const lean = o.lean ?? 0;
  scene.add(u + v, () => {
    ctx.save();
    softBlob(ctx, x + h * 0.25, y + 0.3, h * 0.75, h * 0.22, '#1d160c', 0.3);
    ctx.fillStyle = rgba('#7a6a48', 0.85);
    ctx.beginPath();
    ctx.ellipse(x - 0.3, y + 1.4, h * 0.5, h * 0.17, 0, 0, TAU);
    ctx.fill();
    ctx.translate(x, y);
    ctx.rotate(lean);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.8;
    const fill = (x0: number, y0: number, x1: number, y1: number): void => {
      ctx.fillStyle = linearGradient(ctx, x0, y0, x1, y1, [tones.highlight, tones.base, tones.shade]);
    };
    if (kind === 'cross' || kind === 'celtic') {
      const w = h * 0.3;
      const arm = h * 0.62;
      const ay = -h * 0.66;
      ctx.beginPath();
      tracePoly(ctx, [[-w / 2, 0], [-w / 2, ay + w], [-arm / 2, ay + w], [-arm / 2, ay], [-w / 2, ay], [-w / 2, -h], [w / 2, -h], [w / 2, ay], [arm / 2, ay], [arm / 2, ay + w], [w / 2, ay + w], [w / 2, 0]], true);
      fill(-arm / 2, -h, arm / 2, 0);
      ctx.fill();
      ctx.stroke();
      if (kind === 'celtic') {
        ctx.beginPath();
        ctx.arc(0, ay + w / 2, arm * 0.5, 0, TAU);
        ctx.strokeStyle = tones.base;
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }
    } else if (kind === 'obelisk') {
      const w = h * 0.34;
      ctx.beginPath();
      tracePoly(ctx, [[-w, 0], [-w * 0.65, -h * 0.82], [0, -h], [w * 0.65, -h * 0.82], [w, 0]], true);
      fill(-w, -h, w, 0);
      ctx.fill();
      ctx.stroke();
    } else {
      const w = kind === 'round' ? h * 0.62 : h * 0.72;
      ctx.beginPath();
      if (kind === 'round') {
        ctx.moveTo(-w / 2, 0);
        ctx.lineTo(-w / 2, -h * 0.55);
        ctx.arc(0, -h * 0.55, w / 2, Math.PI, 0, false);
        ctx.lineTo(w / 2, 0);
      } else {
        tracePoly(ctx, [[-w / 2, 0], [-w / 2, -h * 0.82], [-w * 0.3, -h], [w * 0.3, -h], [w / 2, -h * 0.82], [w / 2, 0]], true);
      }
      ctx.closePath();
      fill(-w / 2, -h, w / 2, 0);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = rgba(tones.deep, 0.55);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-w * 0.2, -h * 0.5);
      ctx.lineTo(w * 0.2, -h * 0.5);
      ctx.moveTo(0, -h * 0.64);
      ctx.lineTo(0, -h * 0.34);
      ctx.stroke();
    }
    ctx.restore();
  });
}
