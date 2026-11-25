import { parseColor } from '@wondermap/illustrations/kit';
import type { MapTheme } from '@wondermap/illustrations';
import { CELL } from '../../model/types';
import type { MapSettings } from '../../model/types';
import type { TerrainFields } from './fields';
import { noise2, seedOffset } from './noise';
import type { TileData } from './tiles';

/**
 * The per-pixel terrain painter. For a square chunk of the map it turns the blurred terrain fields into pixels:
 * sea (depth gradient, ripples, shadow), land (terrain textures, beaches, inner shading) and the ink coast line.
 *
 * Work is split in bands of rows (`paintRows`) so the editor can time-slice it and stay responsive.
 */

type RGB = readonly [number, number, number];

/** Edge of a chunk in map pixels. */
export const CHUNK = 256;
/** How far (in cells) the land shadow is shifted towards the bottom-right. */
const SHADOW_SHIFT = 1;
/** Lower bound of the field gradient (value units per map px), keeps the distance estimate finite. */
const GRADIENT_FLOOR = 2.5;

export interface ChunkTerrain {
  /** Blurred indicator of this terrain, 0..255. */
  weights: Uint8Array;
  tile: TileData;
  /** Gets a sandy rim at the coast. */
  beach: boolean;
}

/** Theme + settings resolved into plain numbers for the hot loop. */
export interface PaintStyle {
  deep: RGB;
  mid: RGB;
  shallow: RGB;
  ripple: RGB;
  shadow: RGB;
  ink: RGB;
  mottle: number;
  inkWidth: number;
  innerShade: number;
  /** Coast displacement amplitude in map px. */
  jitter: number;
  beaches: boolean;
  shallows: boolean;
  /** Per-map noise offsets. */
  off: readonly number[];
}

export function makePaintStyle(theme: MapTheme, settings: MapSettings, seed: number): PaintStyle {
  const off: number[] = [];
  for (let i = 0; i < 16; i++) off.push(seedOffset(seed, i + 1));
  return {
    deep: parseColor(theme.sea.deep),
    mid: parseColor(theme.sea.mid),
    shallow: parseColor(theme.sea.shallow),
    ripple: parseColor(theme.sea.ripple),
    shadow: parseColor(theme.coast.shadow),
    ink: parseColor(theme.coast.ink),
    mottle: theme.sea.mottle,
    inkWidth: theme.coast.inkWidth,
    innerShade: theme.coast.innerShade,
    jitter: 1.2 + settings.roughness * 7.5,
    beaches: settings.beaches,
    shallows: settings.shallows,
    off,
  };
}

export interface PaintJob {
  /** Chunk origin in map px. */
  x0: number;
  y0: number;
  /** Bitmap pixels per map pixel. */
  scale: number;
  /** Bitmap edge length. */
  n: number;
  img: ImageData;
  /** Next row to paint. */
  row: number;
  terrains: ChunkTerrain[];
  sand: TileData | null;
  colI0: Int32Array;
  colI1: Int32Array;
  colS0: Int32Array;
  colS1: Int32Array;
  colF: Float32Array;
  rowI0: Int32Array;
  rowI1: Int32Array;
  rowS0: Int32Array;
  rowS1: Int32Array;
  rowF: Float32Array;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (t: number) => {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
};

const imagePool = new Map<number, ImageData>();

function takeImage(n: number): ImageData {
  const hit = imagePool.get(n);
  if (hit) {
    imagePool.delete(n);
    return hit;
  }
  return new ImageData(n, n);
}

export function releaseImage(img: ImageData): void {
  imagePool.set(img.width, img);
}

function axisTables(origin: number, n: number, scale: number, limit: number) {
  const i0 = new Int32Array(n);
  const i1 = new Int32Array(n);
  const s0 = new Int32Array(n);
  const s1 = new Int32Array(n);
  const f = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const pos = (origin + (k + 0.5) / scale) / CELL - 0.5;
    const fl = Math.floor(pos);
    f[k] = pos - fl;
    i0[k] = clamp(fl, 0, limit - 1);
    i1[k] = clamp(fl + 1, 0, limit - 1);
    s0[k] = clamp(fl - SHADOW_SHIFT, 0, limit - 1);
    s1[k] = clamp(fl + 1 - SHADOW_SHIFT, 0, limit - 1);
  }
  return { i0, i1, s0, s1, f };
}

export function createJob(fields: TerrainFields, terrains: ChunkTerrain[], sand: TileData | null, cx: number, cy: number, scale: number): PaintJob {
  const n = Math.round(CHUNK * scale);
  const x0 = cx * CHUNK;
  const y0 = cy * CHUNK;
  const cols = axisTables(x0, n, scale, fields.cols);
  const rows = axisTables(y0, n, scale, fields.rows);
  return {
    x0,
    y0,
    scale,
    n,
    img: takeImage(n),
    row: 0,
    terrains,
    sand,
    colI0: cols.i0,
    colI1: cols.i1,
    colS0: cols.s0,
    colS1: cols.s1,
    colF: cols.f,
    rowI0: rows.i0,
    rowI1: rows.i1,
    rowS0: rows.s0,
    rowS1: rows.s1,
    rowF: rows.f,
  };
}

const px = new Float32Array(3);

/** Nearest or bilinear sample of a wrapping tile at map position (mx, my) into `px`. */
function fetchTile(tile: TileData, mx: number, my: number, bilinear: boolean): void {
  const { data, width: tw, height: th, res } = tile;
  if (!bilinear) {
    const u = Math.floor(mx * res) % tw;
    const v = Math.floor(my * res) % th;
    const o = (v * tw + u) << 2;
    px[0] = data[o]!;
    px[1] = data[o + 1]!;
    px[2] = data[o + 2]!;
    return;
  }
  const fu = mx * res - 0.5;
  const fv = my * res - 0.5;
  const u0 = Math.floor(fu);
  const v0 = Math.floor(fv);
  const tu = fu - u0;
  const tv = fv - v0;
  const ua = ((u0 % tw) + tw) % tw;
  const ub = (ua + 1) % tw;
  const va = ((v0 % th) + th) % th;
  const vb = (va + 1) % th;
  const o00 = (va * tw + ua) << 2;
  const o10 = (va * tw + ub) << 2;
  const o01 = (vb * tw + ua) << 2;
  const o11 = (vb * tw + ub) << 2;
  for (let c = 0; c < 3; c++) {
    const top = data[o00 + c]! + (data[o10 + c]! - data[o00 + c]!) * tu;
    const bot = data[o01 + c]! + (data[o11 + c]! - data[o01 + c]!) * tu;
    px[c] = top + (bot - top) * tv;
  }
}

/** Ripple lines: where the offshore field crosses these levels (0..255), width in map px, strength. */
const RIPPLES = [
  { level: 104, width: 0.8, alpha: 0.62 },
  { level: 68, width: 0.7, alpha: 0.44 },
  { level: 34, width: 0.6, alpha: 0.3 },
] as const;

/**
 * Paints up to `maxRows` more rows of the chunk. Returns `true` when the chunk is complete.
 * Uses the fields as they are right now: restart the job if the terrain changed meanwhile.
 */
export function paintRows(job: PaintJob, fields: TerrainFields, st: PaintStyle, maxRows: number): boolean {
  const { n, scale, x0, y0, terrains, sand } = job;
  const out = job.img.data;
  const cols = fields.cols;
  const coast = fields.coast;
  const mid = fields.mid;
  const big = fields.big;
  const { colI0, colI1, colS0, colS1, colF, rowI0, rowI1, rowS0, rowS1, rowF } = job;
  const K = terrains.length;
  const invS = 1 / scale;
  const inkW = Math.max(st.inkWidth, invS);
  const foamW = Math.max(3, 2 * invS);
  const off = st.off;
  const [deepR, deepG, deepB] = st.deep;
  const [midR, midG, midB] = st.mid;
  const [shaR, shaG, shaB] = st.shallow;
  const [ripR, ripG, ripB] = st.ripple;
  const [shdR, shdG, shdB] = st.shadow;
  const [inkR, inkG, inkB] = st.ink;
  const jitter = st.jitter;
  const mottle = st.mottle;
  const innerShade = st.innerShade;
  const beaches = st.beaches && sand !== null;
  const shallows = st.shallows;
  const bilinearTiles = terrains.some((t) => scale > t.tile.res * 1.01) || (sand !== null && scale > sand.res * 1.01);
  const cellInv = 1 / CELL;

  const rowEnd = Math.min(n, job.row + maxRows);
  for (let j = job.row; j < rowEnd; j++) {
    const my = y0 + (j + 0.5) * invS;
    const r0 = rowI0[j]! * cols;
    const r1 = rowI1[j]! * cols;
    const q0 = rowS0[j]! * cols;
    const q1 = rowS1[j]! * cols;
    const fy = rowF[j]!;
    const fy1 = 1 - fy;
    let o = j * n * 4;

    for (let i = 0; i < n; i++, o += 4) {
      const mx = x0 + (i + 0.5) * invS;
      const i0 = colI0[i]!;
      const i1 = colI1[i]!;
      const fx = colF[i]!;
      const fx1 = 1 - fx;

      // ---- coast: signed distance in map px (positive on land) ----
      const ca = coast[r0 + i0]!;
      const cb = coast[r0 + i1]!;
      const cc = coast[r1 + i0]!;
      const cd = coast[r1 + i1]!;
      let dist: number;
      let landA: number;
      if ((ca | cb | cc | cd) === 0) {
        dist = -1000;
        landA = 0;
      } else if ((ca & cb & cc & cd) === 255) {
        dist = 1000;
        landA = 1;
      } else {
        const top = ca * fx1 + cb * fx;
        const bot = cc * fx1 + cd * fx;
        const gx = ((cb - ca) * fy1 + (cd - cc) * fy) * cellInv;
        const gy = (bot - top) * cellInv;
        let g = Math.sqrt(gx * gx + gy * gy);
        if (g < GRADIENT_FLOOR) g = GRADIENT_FLOOR;
        const nz = noise2(mx * 0.0385 + off[0]!, my * 0.0385 + off[1]!) * 0.72 + noise2(mx * 0.085 + off[2]!, my * 0.085 + off[3]!) * 0.28;
        dist = (top + (bot - top) * fy - 127.5) / g + (nz - 0.5) * 2 * jitter;
        landA = clamp01(dist * scale + 0.5);
      }

      let r = 0;
      let g = 0;
      let b = 0;

      // ---- sea ----
      if (landA < 1) {
        const mot = (noise2(mx * 0.0111 + off[4]!, my * 0.0111 + off[5]!) * 0.6 + noise2(mx * 0.034 + off[6]!, my * 0.034 + off[7]!) * 0.4 - 0.5) * mottle;
        const lum = 1 + mot * 0.5;
        const ba = big[r0 + i0]!;
        const bb = big[r0 + i1]!;
        const bc = big[r1 + i0]!;
        const bd = big[r1 + i1]!;
        const ma = mid[q0 + colS0[i]!]!;
        const mb = mid[q0 + colS1[i]!]!;
        const mc = mid[q1 + colS0[i]!]!;
        const md = mid[q1 + colS1[i]!]!;
        if ((ba | bb | bc | bd | ma | mb | mc | md) === 0) {
          r = deepR * lum;
          g = deepG * lum;
          b = deepB * lum;
        } else {
          const btop = ba * fx1 + bb * fx;
          const bbot = bc * fx1 + bd * fx;
          const bv = btop + (bbot - btop) * fy;
          let sr: number;
          let sg: number;
          let sb: number;
          if (shallows) {
            const u = bv * (1 / 127.5);
            const t1 = smooth(u * 2);
            const t2 = smooth((u - 0.3) / 0.55);
            sr = (deepR + (midR - deepR) * t1) * (1 - t2) + shaR * t2;
            sg = (deepG + (midG - deepG) * t1) * (1 - t2) + shaG * t2;
            sb = (deepB + (midB - deepB) * t1) * (1 - t2) + shaB * t2;
          } else {
            sr = deepR + (midR - deepR) * 0.45;
            sg = deepG + (midG - deepG) * 0.45;
            sb = deepB + (midB - deepB) * 0.45;
          }
          sr *= lum;
          sg *= lum;
          sb *= lum;

          // Drop shadow cast by the land (light from the top-left).
          const mtop = ma * fx1 + mb * fx;
          const mbot = mc * fx1 + md * fx;
          const sh = smooth(((mtop + (mbot - mtop) * fy) * (1 / 255) - 0.06) / 0.54) * 0.58;
          sr += (shdR - sr) * sh;
          sg += (shdG - sg) * sh;
          sb += (shdB - sb) * sh;

          if (shallows) {
            // Pale foam hugging the coast.
            if (dist > -foamW) {
              const fa = 0.4 * (1 - smooth(-dist / foamW));
              sr += (ripR - sr) * fa;
              sg += (ripG - sg) * fa;
              sb += (ripB - sb) * fa;
            }
            // Ripple lines following the coast at fixed offshore levels.
            if (bv > 20 && bv < 118) {
              const gbx = ((bb - ba) * fy1 + (bd - bc) * fy) * cellInv;
              const gby = (bbot - btop) * cellInv;
              let gb = Math.sqrt(gbx * gbx + gby * gby);
              if (gb < 0.6) gb = 0.6;
              for (let k = 0; k < RIPPLES.length; k++) {
                const rp = RIPPLES[k]!;
                const d = Math.abs(bv - rp.level) / gb;
                const half = Math.max(rp.width, 0.55 * invS);
                if (d < half + invS) {
                  let a = clamp01((half - d) * scale + 0.5);
                  a *= smooth((noise2(mx * 0.09 + off[8]! + k * 17.3, my * 0.09 + off[9]!) - 0.32) / 0.3) * rp.alpha;
                  sr += (ripR - sr) * a;
                  sg += (ripG - sg) * a;
                  sb += (ripB - sb) * a;
                }
              }
            }
          }
          r = sr;
          g = sg;
          b = sb;
        }
      }

      // ---- land ----
      if (landA > 0) {
        // Terrain colour (several terrains blend with a wobbly edge).
        let lr = 0;
        let lg = 0;
        let lb = 0;
        let beachShare = 1;
        if (K === 1) {
          const t = terrains[0]!;
          fetchTile(t.tile, mx, my, bilinearTiles);
          lr = px[0]!;
          lg = px[1]!;
          lb = px[2]!;
          beachShare = t.beach ? 1 : 0;
        } else {
          const wob = (noise2(mx * 0.075 + off[10]!, my * 0.075 + off[11]!) - 0.5) * 0.5;
          let cum = 0;
          let started = false;
          let beachW = 0;
          for (let k = 0; k < K; k++) {
            const t = terrains[k]!;
            const wk = t.weights;
            const wa = wk[r0 + i0]!;
            const wb = wk[r0 + i1]!;
            const wc = wk[r1 + i0]!;
            const wd = wk[r1 + i1]!;
            if ((wa | wb | wc | wd) === 0) continue;
            const w = ((wa * fx1 + wb * fx) * fy1 + (wc * fx1 + wd * fx) * fy) * (1 / 255);
            if (w < 0.004) continue;
            cum += w;
            if (t.beach) beachW += w;
            const share = w / cum;
            fetchTile(t.tile, mx, my, bilinearTiles);
            if (!started) {
              lr = px[0]!;
              lg = px[1]!;
              lb = px[2]!;
              started = true;
            } else {
              const a = smooth((share + wob - 0.2) / 0.6);
              lr += (px[0]! - lr) * a;
              lg += (px[1]! - lg) * a;
              lb += (px[2]! - lb) * a;
            }
          }
          if (!started) {
            fetchTile(terrains[0]!.tile, mx, my, bilinearTiles);
            lr = px[0]!;
            lg = px[1]!;
            lb = px[2]!;
          }
          beachShare = cum > 0 ? beachW / cum : 0;
        }

        // Large soft patches hide the repetition of the tiles.
        const patch = noise2(mx * 0.0068 + off[12]!, my * 0.0068 + off[13]!) * 0.65 + noise2(mx * 0.021 + off[14]!, my * 0.021 + off[15]!) * 0.35;
        const pl = 1 + (patch - 0.5) * 0.2;
        lr *= pl;
        lg *= pl;
        lb *= pl;

        // Distance-to-coast helper from the mid field: 0 at the coast, 1 deep inland.
        let mi = 1;
        {
          const ma = mid[r0 + i0]!;
          const mb = mid[r0 + i1]!;
          const mc = mid[r1 + i0]!;
          const md = mid[r1 + i1]!;
          if ((ma & mb & mc & md) !== 255) {
            mi = (((ma * fx1 + mb * fx) * fy1 + (mc * fx1 + md * fx) * fy) - 127.5) * (1 / 127.5);
          }
        }

        let beachA = 0;
        if (beaches && mi < 0.95 && beachShare > 0) {
          const bn = noise2(mx * 0.085 + off[3]!, my * 0.085 + off[2]!);
          const edge = 0.74 + (bn - 0.5) * 0.3;
          beachA = smooth((edge - mi) / 0.22) * beachShare;
          if (beachA > 0.002) {
            fetchTile(sand!, mx, my, bilinearTiles);
            const wet = 1 - 0.1 * (1 - smooth(mi / 0.25));
            lr += (px[0]! * wet - lr) * beachA;
            lg += (px[1]! * wet - lg) * beachA;
            lb += (px[2]! * wet - lb) * beachA;
          }
        }

        if (mi < 0.9) {
          const shade = 1 - innerShade * (1 - smooth(mi / 0.85)) * (1 - 0.6 * beachA);
          lr *= shade;
          lg *= shade;
          lb *= shade;
        }

        // Ink line along the coast.
        if (dist < inkW + invS) {
          const inside = clamp01((dist - inkW) * scale + 0.5);
          const ink = (1 - inside) * 0.9;
          lr += (inkR - lr) * ink;
          lg += (inkG - lg) * ink;
          lb += (inkB - lb) * ink;
        }

        if (landA >= 1) {
          r = lr;
          g = lg;
          b = lb;
        } else {
          r += (lr - r) * landA;
          g += (lg - g) * landA;
          b += (lb - b) * landA;
        }
      }

      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
      out[o + 3] = 255;
    }
  }
  job.row = rowEnd;
  return rowEnd >= n;
}
