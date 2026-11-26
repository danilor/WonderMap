import { brushById, pathStyleById, symbolById, terrainById } from '@wondermap/illustrations';
import type { ResolvedSymbol } from '@wondermap/illustrations';
import { combineSeed, createRng, lerp, resample } from '@wondermap/illustrations/kit';
import type { Vec2 } from '@wondermap/illustrations/kit';
import { createTerrainLayer, paintStroke, withTerrainId } from '../../model/terrainLayer';
import { CELL, DEFAULT_SETTINGS, SCHEMA_VERSION } from '../../model/types';
import type { MapDocument, MapLabel, MapPath, MapSettings, MapSymbol, Point, TerrainLayer } from '../../model/types';
import { distanceField } from './distanceField';
import { ellipse, meander, organicLoop } from './geometry';
import type { Polygon } from './geometry';
import { estimateLabel, labelStyleOrThrow } from './labelExtent';
import { PointHash, keepoutAt, makeKeepout } from './occupancy';
import type { Keepout } from './occupancy';
import { areaRegion, ridgeRegion } from './regions';
import type { Region } from './regions';
import { fillPolygon } from './terrainFill';

/**
 * Builds an example map from a short description: land, biomes, scatters of symbols, towns, names and roads.
 *
 * Everything is deterministic (seeded noise, no clock, no Math.random), so the same description always gives the same
 * file, and the committed `public/samples/*.wondermap.json` can be checked against what the code makes.
 */

/** Every map of the examples carries this date, so that a rebuild does not change the files. */
const FIXED_TIME = '2025-01-01T00:00:00.000Z';

/** Symbols are not scattered closer than this to the edge of the map: the frame covers it. */
const EDGE_MARGIN = 48;

/** A symbol of a scatter keeps clear of those of other scatters by this share of the spacing of each. */
const ROOM = 0.35;

/** A scatter patch thins out where it is shallow: the chance to keep a symbol is the region weight times this. */
const THINNING = 1.6;

/** The share of a symbol's drawing box that keeps other symbols out when it is a landmark. */
const BOX_SHARE = 0.8;

const HASH_CELL = 64;

export interface BuilderOptions {
  id: string;
  name: string;
  width: number;
  height: number;
  themeId: string;
  frameId: string;
  seed: number;
  /** Symbols and names are drawn this many times larger than in the catalog: a big canvas wants bigger art. */
  unit: number;
  settings?: Partial<MapSettings>;
}

export interface BuildResult {
  doc: MapDocument;
  /** Things that look like mistakes: a town in the sea, a ship on land, something off the map. */
  warnings: string[];
}

export interface ShapeOptions {
  /** Largest sideways push of the longest wobble of the outline, in px. Default 14. */
  amp?: number;
  /** Length of the longest wobble, in px. Default 120. */
  scale?: number;
  octaves?: number;
  /** How jagged: the share of the push left for each finer layer of wobble. Default 0.5. */
  gain?: number;
  seed?: number;
}

export interface ScatterSpec {
  /** Where to scatter: an outline (corners are fine) or a ready-made region such as a ridge. */
  area: Polygon | Region;
  /** A brush of the catalog: gives the symbols, how far apart they stand and how big they are. */
  brush?: string;
  /** Or name the symbols yourself. Takes the place of the brush's own. */
  items?: ReadonlyArray<{ asset: string; weight?: number }>;
  /** Overrides the spacing of the brush, in px at size 1. */
  spacing?: number;
  /** Overrides the scale range of the brush. */
  scale?: readonly [number, number];
  /** Makes the symbols stand further apart (above 1) or closer (below 1) without making them bigger. */
  gap?: number;
  /** Makes the symbols and their spacing bigger. */
  size?: number;
  jitter?: number;
  /** Share of the spots left empty. Default 0.1. */
  hole?: number;
  /** For an outline: how far noise may push its edge (px). Default 24. */
  warp?: number;
  /** For an outline: width of the fringe where the patch thins out. Default 0. */
  soft?: number;
  /** Makes the symbols in the middle of the patch bigger by up to this share. */
  peak?: number;
  /** On land (default) or in the sea. */
  where?: 'land' | 'sea';
  /** Keep at least this far (px) from the other medium: from the sea for land symbols, from land for sea symbols. */
  inset?: number;
  /** Keep at most this far from the other medium, to hug a coast. */
  reach?: number;
  /** Only on these terrains. */
  on?: readonly string[];
  /** Chance (0..1) that a symbol ignores the symbols of earlier scatters and may stand among them. Default 0. */
  mix?: number;
  /** How strictly the scatter keeps out of towns and names: the share of symbols dropped there is this times their own. Default 1. */
  respect?: number;
  /** Mirror symbols at random. Default: what the brush says. */
  flip?: boolean;
  /** Always this look of the symbol. Default: any. */
  variant?: number;
  /** Largest tilt in radians of symbols that may rotate (ships, serpents). Default 0.35. */
  tilt?: number;
}

export interface PlaceOptions {
  /** Multiplies the size on top of the map's unit. */
  size?: number;
  variant?: number;
  flip?: boolean;
  /** Radians. */
  rotation?: number;
  /** How much of its drawing box to keep clear of scattered symbols (0 = none). Default 1 for landmarks and settlements, else 0. */
  clear?: number;
}

export interface LabelOptions {
  style?: string;
  /** Font size in px; default is the style's size times the map's unit. */
  size?: number;
  /** Radians. */
  rotation?: number;
  curve?: number;
  spacing?: number;
  color?: string | null;
  /** Chance that a scattered symbol under the name is dropped, or false to let it be. Default depends on the style. */
  clear?: number | false;
}

export interface SiteOptions extends PlaceOptions {
  /** Style of the name; default depends on the kind of site. */
  style?: string;
  labelSize?: number;
  /** Where the name goes. Default below. */
  side?: 'below' | 'above' | 'left' | 'right';
  dx?: number;
  dy?: number;
  curve?: number;
  spacing?: number;
}

export interface PathOptions {
  /** How far a river or road may wander sideways from the line given, in px. Default 0 (the line is only smoothed). */
  wiggle?: number;
  /** Length of one wander, in px. Default 220. */
  bend?: number;
  /** Chance that a scattered symbol on the path is dropped. Default: rivers 0.95, roads 0.75, others 0. */
  clear?: number;
}

interface ScatterJob {
  spec: ScatterSpec;
  region: Region;
  items: Array<{ def: ResolvedSymbol; weight: number }>;
  spacing: number;
  scale: readonly [number, number];
  jitter: number;
  flip: boolean;
  seed: number;
}

/** Names of the kinds of things that get a name of the "city" style, the "town" style and so on. */
function siteStyle(asset: string): string {
  if (/^settlement\.(city|city\.large)$/.test(asset)) return 'city';
  if (/^settlement\.(town|walled-town|port|shipyard|fort)$|^castle\./.test(asset)) return 'town';
  if (/^settlement\.(village|hamlet|ruins)$/.test(asset)) return 'village';
  return 'landmark';
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const round3 = (v: number) => Math.round(v * 1000) / 1000;
const serial = (prefix: string, n: number, digits: number) => `${prefix}${String(n).padStart(digits, '0')}`;

export class MapBuilder {
  readonly opts: BuilderOptions;
  private layer: TerrainLayer;
  private readonly symbols: MapSymbol[] = [];
  private readonly paths: MapPath[] = [];
  private readonly labels: MapLabel[] = [];
  private readonly jobs: ScatterJob[] = [];
  private readonly keepouts: Keepout[] = [];
  private readonly points = new PointHash(HASH_CELL);
  private seaDistance: Float32Array = new Float32Array(0);
  private landDistance: Float32Array = new Float32Array(0);

  constructor(opts: BuilderOptions) {
    if (opts.width % CELL !== 0 || opts.height % CELL !== 0) throw new Error(`The size of a map must be a multiple of ${CELL}.`);
    this.opts = opts;
    this.layer = createTerrainLayer(opts.width, opts.height);
  }

  /* --------------------------------------------------------------------------------------- */
  /* Land and water                                                                           */
  /* --------------------------------------------------------------------------------------- */

  private seedOf(corners: Polygon, salt: string): number {
    const first = corners[0] ?? [0, 0];
    return combineSeed(this.opts.seed, salt, Math.round(first[0]), Math.round(first[1]), corners.length);
  }

  private valueOf(terrain: string): number {
    if (!terrainById.has(terrain)) throw new Error(`Unknown terrain "${terrain}"`);
    const { layer, value } = withTerrainId(this.layer, terrain);
    this.layer = layer;
    return value;
  }

  private shape(corners: Polygon, o: ShapeOptions, salt: string): Vec2[] {
    return organicLoop(corners, {
      amp: o.amp ?? 14,
      scale: o.scale ?? 120,
      octaves: o.octaves,
      gain: o.gain,
      seed: o.seed ?? this.seedOf(corners, salt),
    });
  }

  private fill(outline: Polygon, terrain: string | null, mode: 'paint' | 'recolor'): void {
    const value = terrain === null ? 0 : this.valueOf(terrain);
    const { data } = this.layer;
    fillPolygon(this.layer, outline, (i) => {
      if (mode === 'recolor' && data[i] === 0) return;
      data[i] = value;
    });
  }

  /** Raises land of one terrain inside the outline. The outline is smoothed and wobbled like a real coast; it comes back for reuse. */
  land(corners: Polygon, terrain: string, o: ShapeOptions = {}): Vec2[] {
    const outline = this.shape(corners, o, 'land');
    this.fill(outline, terrain, 'paint');
    return outline;
  }

  /** An island: a lumpy ellipse. */
  island(cx: number, cy: number, rx: number, ry: number, terrain: string, o: ShapeOptions & { rotation?: number; lumps?: number } = {}): Vec2[] {
    const rng = createRng(combineSeed(this.opts.seed, 'island', Math.round(cx), Math.round(cy)));
    const base = ellipse(cx, cy, rx, ry, o.rotation ?? 0, o.lumps ?? 9).map(([x, y]): Vec2 => {
      const k = 0.85 + rng.next() * 0.3;
      return [cx + (x - cx) * k, cy + (y - cy) * k];
    });
    const small = Math.min(rx, ry);
    return this.land(base, terrain, { amp: small * 0.1, scale: small * 0.9, ...o });
  }

  /** Changes the terrain of the land inside the outline; the sea stays sea. */
  paint(corners: Polygon, terrain: string, o: ShapeOptions = {}): Vec2[] {
    const outline = this.shape(corners, { amp: 12, scale: 110, ...o }, `paint-${terrain}`);
    this.fill(outline, terrain, 'recolor');
    return outline;
  }

  /** Cuts water out of the land: a lake, a bay, an inland sea. */
  lake(corners: Polygon, o: ShapeOptions = {}): Vec2[] {
    const outline = this.shape(corners, o, 'lake');
    this.fill(outline, null, 'paint');
    return outline;
  }

  /** Changes the terrain of the land along a line (a strip of desert along a river, snow along a ridge). */
  band(line: Polygon, radius: number, terrain: string, roughness = 0.6): void {
    const points: Point[] = line.map(([x, y]) => [x, y]);
    paintStroke(this.layer, { points, radius, value: this.valueOf(terrain), mode: 'recolor', roughness, seed: this.seedOf(line, `band-${terrain}`) });
  }

  private cellIndex(x: number, y: number): number {
    const { cell, cols, rows } = this.layer;
    const cx = Math.min(cols - 1, Math.max(0, Math.floor(x / cell)));
    const cy = Math.min(rows - 1, Math.max(0, Math.floor(y / cell)));
    return cy * cols + cx;
  }

  isLand(x: number, y: number): boolean {
    return this.layer.data[this.cellIndex(x, y)]! > 0;
  }

  /* --------------------------------------------------------------------------------------- */
  /* Things on the map                                                                        */
  /* --------------------------------------------------------------------------------------- */

  private symbolOrThrow(asset: string): ResolvedSymbol {
    const def = symbolById.get(asset);
    if (!def) throw new Error(`Unknown symbol "${asset}"`);
    return def;
  }

  private addSymbol(def: ResolvedSymbol, x: number, y: number, scale: number, variant: number, flip: boolean, rotation: number): MapSymbol {
    const symbol: MapSymbol = {
      id: serial('s', this.symbols.length + 1, 4),
      asset: def.id,
      x: round1(x),
      y: round1(y),
      scale: round3(scale),
      rotation: round3(rotation),
      flip,
      variant,
    };
    this.symbols.push(symbol);
    return symbol;
  }

  /** The box a symbol's drawing fills on the map. */
  private box(def: ResolvedSymbol, x: number, y: number, scale: number): { cx: number; cy: number; halfW: number; halfH: number } {
    const [w, h] = def.size;
    const [ax, ay] = def.anchor;
    return { cx: x + (0.5 - ax) * w * scale, cy: y + (0.5 - ay) * h * scale, halfW: (w * scale) / 2, halfH: (h * scale) / 2 };
  }

  /** Puts one symbol on the map. Landmarks and settlements push scattered symbols away from themselves. */
  place(asset: string, x: number, y: number, o: PlaceOptions = {}): MapSymbol {
    const def = this.symbolOrThrow(asset);
    const scale = (o.size ?? 1) * this.opts.unit;
    const variant = o.variant ?? combineSeed(this.opts.seed, asset, Math.round(x), Math.round(y)) % def.variants;
    const symbol = this.addSymbol(def, x, y, scale, variant, o.flip ?? false, o.rotation ?? 0);
    const clear = o.clear ?? (def.layer === 'landmark' ? 1 : 0);
    if (clear > 0) {
      const b = this.box(def, x, y, scale);
      this.keepouts.push(makeKeepout(b.cx, b.cy, b.halfW * BOX_SHARE * clear, b.halfH * BOX_SHARE * clear));
    }
    return symbol;
  }

  /** Writes a name on the map. */
  label(text: string, x: number, y: number, o: LabelOptions = {}): MapLabel {
    const styleId = o.style ?? 'region';
    const style = labelStyleOrThrow(styleId);
    const size = o.size ?? style.size * this.opts.unit;
    const label: MapLabel = {
      id: serial('l', this.labels.length + 1, 3),
      text,
      x: round1(x),
      y: round1(y),
      style: styleId,
      size: round1(size),
      rotation: round3(o.rotation ?? 0),
      curve: round3(o.curve ?? 0),
      spacing: round3(o.spacing ?? 0),
      color: o.color ?? null,
    };
    this.labels.push(label);
    if (o.clear !== false) {
      const wide = ['continent', 'region', 'sea', 'title'].includes(styleId);
      const extent = estimateLabel(text, style, size, o.spacing ?? 0);
      const halfW = extent.width / 2 + size * 0.25;
      const halfH = (extent.ascent + extent.descent) / 2 + size * 0.15;
      const rotation = o.rotation ?? 0;
      const centre = (extent.descent - extent.ascent) / 2;
      this.keepouts.push(
        makeKeepout(x - Math.sin(rotation) * centre, y + Math.cos(rotation) * centre, halfW, halfH, rotation, o.clear ?? (wide ? 0.9 : 1)),
      );
    }
    return label;
  }

  /** A town, castle or landmark together with its name. */
  site(asset: string, x: number, y: number, name: string | null, o: SiteOptions = {}): MapSymbol {
    const def = this.symbolOrThrow(asset);
    const symbol = this.place(asset, x, y, { clear: 1, ...o });
    if (name === null) return symbol;
    const style = labelStyleOrThrow(o.style ?? siteStyle(asset));
    const size = o.labelSize ?? style.size * this.opts.unit;
    const scale = symbol.scale;
    const [w, h] = def.size;
    const ay = def.anchor[1];
    const top = y - ay * h * scale;
    const bottom = y + (1 - ay) * h * scale;
    const extent = estimateLabel(name, style, size, o.spacing ?? 0);
    const side = o.side ?? 'below';
    let lx = x;
    let ly = bottom + size * 0.78;
    if (side === 'above') ly = top - size * 0.3;
    if (side === 'left' || side === 'right') {
      const sign = side === 'left' ? -1 : 1;
      lx = x + sign * ((w * scale) / 2 * 0.62 + extent.width / 2 + size * 0.3);
      ly = y - h * scale * 0.2 + size * 0.3;
    }
    this.label(name, lx + (o.dx ?? 0), ly + (o.dy ?? 0), { style: o.style ?? siteStyle(asset), size, curve: o.curve, spacing: o.spacing });
    return symbol;
  }

  /** A river, road or border. `control` are the points it passes; `width` is in px. Scattered symbols keep off rivers and roads. */
  path(style: string, control: Polygon, width: number, o: PathOptions = {}): MapPath {
    if (!pathStyleById.has(style)) throw new Error(`Unknown path style "${style}"`);
    const seed = this.seedOf(control, `path-${style}`);
    const line = meander(control, o.wiggle ?? 0, o.bend ?? 220, seed);
    const path: MapPath = {
      id: serial('p', this.paths.length + 1, 3),
      style,
      points: line.map(([x, y]): Point => [round1(x), round1(y)]),
      width,
    };
    this.paths.push(path);
    const chance = o.clear ?? (style === 'river' ? 0.95 : style === 'road' ? 0.75 : 0);
    if (chance > 0) {
      const spots = resample(line, 60);
      for (let i = 0; i + 1 < spots.length; i++) {
        const a = spots[i]!;
        const b = spots[i + 1]!;
        const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
        const reach = Math.hypot(b[0] - a[0], b[1] - a[1]) / 2 + 6;
        this.keepouts.push(makeKeepout((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, reach, Math.max(width, 16) * 0.9, angle, chance));
      }
    }
    return path;
  }

  /* --------------------------------------------------------------------------------------- */
  /* Scatters                                                                                 */
  /* --------------------------------------------------------------------------------------- */

  /** Fills a patch with symbols. The work is done at the end, when every town and name is known and can be kept clear. */
  scatter(spec: ScatterSpec): void {
    const brush = spec.brush ? brushById.get(spec.brush) : undefined;
    if (spec.brush && !brush) throw new Error(`Unknown brush "${spec.brush}"`);
    const raw = spec.items?.map((item) => ({ asset: item.asset, weight: item.weight ?? 1 })) ?? brush?.items.map((item) => ({ asset: item.symbol, weight: item.weight }));
    if (!raw?.length) throw new Error('A scatter needs a brush or items.');
    const seed = combineSeed(this.opts.seed, 'scatter', spec.brush ?? raw[0]!.asset, this.jobs.length);
    const region = Array.isArray(spec.area) ? areaRegion(spec.area as Polygon, { warp: spec.warp, soft: spec.soft, seed }) : (spec.area as Region);
    this.jobs.push({
      spec,
      region,
      items: raw.map((item) => ({ def: this.symbolOrThrow(item.asset), weight: item.weight })),
      spacing: spec.spacing ?? brush?.spacing ?? 60,
      scale: spec.scale ?? brush?.scale ?? [0.9, 1.1],
      jitter: spec.jitter ?? brush?.jitter ?? 0.45,
      flip: spec.flip ?? brush?.flip ?? true,
      seed,
    });
  }

  /** A strip along a line, to scatter a mountain range, a river valley or a road lined with trees. `bend` makes the line wander. */
  ridge(line: Polygon, width: number, bend = 0): Region {
    const seed = this.seedOf(line, 'ridge');
    return ridgeRegion(bend > 0 ? meander(line, bend, Math.max(120, width), seed) : line, width, { seed });
  }

  private runScatter(job: ScatterJob, owner: number): void {
    const { spec, region, items, scale, jitter, seed } = job;
    const size = (spec.size ?? 1) * this.opts.unit;
    const cell = Math.max(8, job.spacing * (spec.gap ?? 1) * size);
    const room = cell * ROOM;
    const inSea = spec.where === 'sea';
    const inset = spec.inset ?? 0;
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    const { width, height } = this.opts;
    const { data } = this.layer;
    const distance = inSea ? this.landDistance : this.seaDistance;

    for (let i = Math.floor(region.x0 / cell) - 1; i <= Math.ceil(region.x1 / cell) + 1; i++) {
      for (let j = Math.floor(region.y0 / cell) - 1; j <= Math.ceil(region.y1 / cell) + 1; j++) {
        const rng = createRng(combineSeed(seed, i, j));
        const x = (i + 0.5 + (rng.next() - 0.5) * 2 * jitter) * cell;
        const y = (j + 0.5 + (rng.next() - 0.5) * 2 * jitter) * cell;
        // Every roll is made before any test, so that a spot being rejected never changes what the others look like.
        const pick = rng.next();
        const sizeMix = rng.next();
        const flipRoll = rng.next();
        const variantRoll = rng.next();
        const keepRoll = rng.next();
        const holeRoll = rng.next();
        const mixRoll = rng.next();
        const respectRoll = rng.next();
        const tiltRoll = rng.next();
        if (x < EDGE_MARGIN || y < EDGE_MARGIN || x > width - EDGE_MARGIN || y > height - EDGE_MARGIN) continue;
        const weight = region.weight(x, y);
        if (weight <= 0 || keepRoll > weight * THINNING || holeRoll < (spec.hole ?? 0.1)) continue;

        const index = this.cellIndex(x, y);
        if ((data[index]! > 0) === inSea) continue;
        const away = distance[index]!;
        if (away < inset || (spec.reach !== undefined && away > spec.reach)) continue;
        if (spec.on && !spec.on.includes(this.layer.ids[data[index]! - 1] ?? '')) continue;

        const chance = keepoutAt(this.keepouts, x, y);
        if (chance > 0 && respectRoll < chance * (spec.respect ?? 1)) continue;
        if (mixRoll >= (spec.mix ?? 0) && this.points.collides(x, y, room, owner)) continue;

        let left = pick * total;
        let chosen = items[0]!;
        for (const item of items) {
          left -= item.weight;
          if (left <= 0) {
            chosen = item;
            break;
          }
        }
        const def = chosen.def;
        this.points.add(x, y, room, owner);
        this.addSymbol(
          def,
          x,
          y,
          lerp(scale[0], scale[1], sizeMix) * size * (1 + (spec.peak ?? 0) * weight),
          spec.variant ?? Math.min(def.variants - 1, Math.floor(variantRoll * def.variants)),
          job.flip && flipRoll > 0.5,
          def.rotatable ? (tiltRoll - 0.5) * 2 * (spec.tilt ?? 0.35) : 0,
        );
      }
    }
  }

  /* --------------------------------------------------------------------------------------- */
  /* Result                                                                                   */
  /* --------------------------------------------------------------------------------------- */

  private validate(): string[] {
    const warnings: string[] = [];
    const { width, height } = this.opts;
    const where = (x: number, y: number) => `(${Math.round(x)}, ${Math.round(y)})`;
    for (const s of this.symbols) {
      const def = symbolById.get(s.asset)!;
      if (s.x < 0 || s.y < 0 || s.x > width || s.y > height) warnings.push(`${s.asset} is off the map at ${where(s.x, s.y)}`);
      else if (def.placement === 'land' && !this.isLand(s.x, s.y)) warnings.push(`${s.asset} stands in the sea at ${where(s.x, s.y)}`);
      else if (def.placement === 'sea' && this.isLand(s.x, s.y)) warnings.push(`${s.asset} floats on land at ${where(s.x, s.y)}`);
    }
    for (const l of this.labels) {
      if (l.x < 0 || l.y < 0 || l.x > width || l.y > height) warnings.push(`The name "${l.text}" is off the map at ${where(l.x, l.y)}`);
    }
    return warnings;
  }

  build(): BuildResult {
    this.seaDistance = distanceField(this.layer, 'sea');
    this.landDistance = distanceField(this.layer, 'land');
    this.jobs.forEach((job, index) => this.runScatter(job, index + 1));
    const { id, name, width, height, themeId, frameId, seed, settings } = this.opts;
    const doc: MapDocument = {
      schema: SCHEMA_VERSION,
      id,
      name,
      kind: 'world',
      width,
      height,
      themeId,
      frameId,
      seed,
      settings: { ...DEFAULT_SETTINGS, ...settings },
      terrain: this.layer,
      paths: this.paths,
      symbols: this.symbols,
      labels: this.labels,
      createdAt: FIXED_TIME,
      updatedAt: FIXED_TIME,
    };
    return { doc, warnings: this.validate() };
  }
}
