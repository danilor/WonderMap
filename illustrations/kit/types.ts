/**
 * Core types shared by every illustration.
 *
 * COORDINATE SYSTEM: a symbol is drawn in its own "design box" `[0, w] x [0, h]` (y grows downward).
 * `size` is the box in map pixels at scale 1. The engine rasterizes it at the resolution it needs,
 * so always draw in design units and never assume a pixel density.
 *
 * LIGHT: comes from the TOP-LEFT. Lit faces face left/up, shaded faces face right/down.
 */

export type Vec2 = readonly [x: number, y: number];

/** Canvas context every illustration draws with. */
export type Ctx2D = CanvasRenderingContext2D;

/** Small seeded random generator. Use it for ALL randomness inside art code (never Math.random). */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** Integer in [min, max] (inclusive). */
  int(min: number, max: number): number;
  /** True with probability p. */
  chance(p: number): boolean;
  /** Random element. */
  pick<T>(items: readonly T[]): T;
  /** -1 or 1. */
  sign(): 1 | -1;
  /** Approximately normal distributed number (mean 0, sd ~0.5). */
  gauss(): number;
  /** Independent child generator derived from this one's seed (stable for the same salt). */
  fork(salt: number | string): Rng;
  /** The seed this generator was created with. */
  readonly seed: number;
}

export interface DrawContext {
  ctx: Ctx2D;
  /** Design box width / height (the same numbers as `SymbolDef.size`). */
  w: number;
  h: number;
  /** Seeded generator: identical for the same (symbol id, variant). */
  rand: Rng;
  /** Variant index in `[0, variants)`. */
  variant: number;
  seed: number;
}

/**
 * Drawing order bucket: ground decals first, then upright objects (y-sorted), then landmarks such as settlements
 * (y-sorted, always above plain objects so a forest can not hide a town) and finally things in the air.
 */
export type SymbolLayer = 'ground' | 'object' | 'landmark' | 'air';

export interface SymbolDef {
  /** Stable unique id, e.g. `mountain.brown`. Saved in map files: NEVER rename a published id. */
  id: string;
  name: string;
  /** Id of a category declared in `categories.ts`. */
  category: string;
  /** Design box in map pixels at scale 1 (include room for outlines and shadows). */
  size: readonly [number, number];
  /** Normalized ground-contact point inside the box. Default `[0.5, 0.92]`. Used for placement + depth sorting. */
  anchor?: readonly [number, number];
  /** Number of distinct looks (seeds). Default 6. More variants = more memory. */
  variants?: number;
  layer?: SymbolLayer;
  /** Sort position in the library (lower first, default 100). */
  order?: number;
  /** Extra search keywords. */
  tags?: readonly string[];
  /** Hint for the UI/tools: where this normally goes. */
  placement?: 'land' | 'sea' | 'any';
  /** Allow free rotation in the inspector (ships, serpents, …). Default false. */
  rotatable?: boolean;
  /** Paint the art. Keep it inside `[0,w] x [0,h]`; only a small margin (see `overdraw` in `kit/bounds.ts`) is tolerated. */
  draw(d: DrawContext): void;
}

export interface CategoryDef {
  id: string;
  name: string;
  /** Bootstrap-icons class name without the `bi-` prefix. */
  icon: string;
  order: number;
  blurb?: string;
  /** Layer used by the symbols of this category that do not name one. Default `'object'`. */
  layer?: SymbolLayer;
}

/** Context passed to a terrain texture painter: draw ONE seamless tile covering `[0,size]^2`. */
export interface TextureContext {
  ctx: Ctx2D;
  size: number;
  rand: Rng;
  seed: number;
  colors: TerrainColors;
}

export interface TerrainColors {
  base: string;
  light: string;
  dark: string;
}

export interface TerrainDef {
  /** Stable unique id, saved in map files (e.g. `grass`). Never rename a published id. */
  id: string;
  name: string;
  /** Color shown in the UI and on the minimap. */
  swatch: string;
  /** Sort position in the palette (lower first). */
  order: number;
  colors: TerrainColors;
  /** Tile edge in map px. Default 256. */
  tileSize?: number;
  /** Paint a seamless tile. The context is already scaled so you draw in `[0,size]^2`; use `kit/texture.ts` helpers so edges wrap around. */
  texture(t: TextureContext): void;
  /** Short description for the palette tooltip. */
  blurb?: string;
  /** Rough family of the terrain. Decides the default for `beach`. */
  group?: 'land' | 'cold' | 'dry' | 'wet';
  /** Gets a sandy beach rim where it meets the sea (when the map has beaches on). Default: groups `land` and `dry`. */
  beach?: boolean;
}

export interface ColorGrade {
  saturation?: number;
  brightness?: number;
  contrast?: number;
  /** 0..1 amount of sepia toning. */
  sepia?: number;
  /** Tint color blended over the result. */
  tint?: string;
  tintAmount?: number;
}

export interface MapTheme {
  id: string;
  name: string;
  blurb: string;
  /** [land, sea] swatch colors for the UI preview. */
  swatch: readonly [string, string];
  sea: {
    deep: string;
    mid: string;
    shallow: string;
    /** Ripple line color (drawn with alpha around the coast). */
    ripple: string;
    /** 0..1 strength of large-scale mottling on the water. */
    mottle: number;
  };
  coast: {
    ink: string;
    /** Outline width in map px. */
    inkWidth: number;
    /** Shadow color cast on the water by the land. */
    shadow: string;
    /** 0..1 darkening of land near the coast. */
    innerShade: number;
  };
  paper: {
    color: string;
    /** 0..1 strength of the paper texture multiplied over the whole map. */
    strength: number;
    /** 0..1 edge darkening. */
    vignette: number;
  };
  /** Applied to terrain textures and to every symbol sprite. */
  grade: ColorGrade;
  label: { color: string; halo: string };
  /** Default frame id for new maps. */
  frame: string;
  /** Generic ink color for lines (rivers outline, roads…). */
  ink: string;
}

/** A path style (river / road / trail / border). */
export interface PathStyleDef {
  id: string;
  name: string;
  icon: string;
  /** Default and allowed width (map px). */
  width: number;
  minWidth: number;
  maxWidth: number;
  /** Width grows from source to mouth (rivers). */
  taper?: boolean;
  order?: number;
  blurb?: string;
  /**
   * Draw the already-smoothed polyline. `widths[i]` is the half-resolved width at `points[i]`.
   * The context is in map space (1 unit = 1 map px, times the render scale already applied).
   */
  draw(p: PathDrawContext): void;
}

export interface PathDrawContext {
  ctx: Ctx2D;
  points: readonly Vec2[];
  widths: readonly number[];
  theme: MapTheme;
  rand: Rng;
  /** Render scale (map px → bitmap px). Use it to keep hairlines visible when zoomed out. */
  scale: number;
}

export interface BrushItem {
  /** Symbol id. */
  symbol: string;
  weight: number;
}

/** A scatter preset: dragging paints many symbols at once. */
export interface BrushDef {
  id: string;
  name: string;
  category: string;
  items: readonly BrushItem[];
  /** Average spacing between symbols in map px at scale 1. */
  spacing: number;
  /** Random scale range around 1. */
  scale: readonly [number, number];
  /** Random positional jitter as a fraction of spacing. */
  jitter?: number;
  /** Mirror randomly. Default true. */
  flip?: boolean;
  order?: number;
  blurb?: string;
}

export interface LabelStyleDef {
  id: string;
  name: string;
  /** Font id from `fonts/index.ts`. */
  font: string;
  /** Font size in map px. */
  size: number;
  weight?: number;
  italic?: boolean;
  /** Letter spacing in em. */
  spacing: number;
  uppercase?: boolean;
  /** `null` = use the theme label color. */
  color: string | null;
  /** `null` = use the theme halo color. */
  halo: string | null;
  haloWidth: number;
  order?: number;
}

export interface FrameDef {
  id: string;
  name: string;
  /** Pixels reserved on each side (the frame is drawn inside the map bounds). */
  inset: number;
  draw(d: { ctx: Ctx2D; width: number; height: number; theme: MapTheme; rand: Rng }): void;
}

export interface FontDef {
  id: string;
  name: string;
  /** CSS family name as registered by the @fontsource import. */
  family: string;
  weights: readonly number[];
  styles: readonly ('normal' | 'italic')[];
}
