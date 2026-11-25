import { categories as categoryList } from './categories';
import { fonts } from './fonts';
import type { BrushDef, CategoryDef, FontDef, FrameDef, LabelStyleDef, MapTheme, PathStyleDef, SymbolDef, TerrainDef } from './kit/types';

/**
 * The catalog discovers every art file automatically (Vite `import.meta.glob`).
 * Drop a new `.ts` file in the right folder with a default export and it shows up in the app: no registration needed.
 *
 *   symbols/<category>/*.ts   default export: SymbolDef | SymbolDef[]
 *   terrain/*.ts              default export: TerrainDef
 *   brushes/*.ts              default export: BrushDef | BrushDef[]
 *   paths/*.ts                default export: PathStyleDef
 *   labels/*.ts               default export: LabelStyleDef[]
 *   themes/*.ts               default export: MapTheme
 *   frames/*.ts               default export: FrameDef
 */

type Exports<T> = T | readonly T[] | undefined;

function collect<T extends { id: string }>(modules: Record<string, Exports<T>>, kind: string): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const path of Object.keys(modules).sort()) {
    const exported = modules[path];
    if (exported === undefined) continue; // helper file without a default export
    const defs = (Array.isArray(exported) ? exported : [exported]) as T[];
    for (const def of defs) {
      if (seen.has(def.id)) throw new Error(`Duplicate ${kind} id "${def.id}" (found again in ${path})`);
      seen.add(def.id);
      out.push(def);
    }
  }
  return out;
}

const symbolModules = import.meta.glob<Exports<SymbolDef>>(['./symbols/**/*.ts', '!./**/*.test.ts'], { eager: true, import: 'default' });
const terrainModules = import.meta.glob<Exports<TerrainDef>>(['./terrain/*.ts', '!./**/*.test.ts'], { eager: true, import: 'default' });
const brushModules = import.meta.glob<Exports<BrushDef>>(['./brushes/*.ts', '!./**/*.test.ts'], { eager: true, import: 'default' });
const pathModules = import.meta.glob<Exports<PathStyleDef>>(['./paths/*.ts', '!./**/*.test.ts'], { eager: true, import: 'default' });
const labelModules = import.meta.glob<Exports<LabelStyleDef>>(['./labels/*.ts', '!./**/*.test.ts'], { eager: true, import: 'default' });
const themeModules = import.meta.glob<Exports<MapTheme>>(['./themes/*.ts', '!./**/*.test.ts'], { eager: true, import: 'default' });
const frameModules = import.meta.glob<Exports<FrameDef>>(['./frames/*.ts', '!./**/*.test.ts'], { eager: true, import: 'default' });

/* ------------------------------------------------------------------------------------ */
/* Resolved definitions (all optional fields filled in)                                 */
/* ------------------------------------------------------------------------------------ */

export type ResolvedSymbol = Required<SymbolDef>;
export type ResolvedTerrain = Required<TerrainDef>;
export type ResolvedBrush = Required<BrushDef>;
export type ResolvedPathStyle = Required<PathStyleDef>;
export type ResolvedLabelStyle = Required<LabelStyleDef>;

export const categories: readonly CategoryDef[] = [...categoryList].sort((a, b) => a.order - b.order);
export const categoryById: ReadonlyMap<string, CategoryDef> = new Map(categories.map((c) => [c.id, c]));

export const symbols: readonly ResolvedSymbol[] = collect<SymbolDef>(symbolModules, 'symbol')
  .map<ResolvedSymbol>((s) => {
    const category = categoryById.get(s.category);
    if (!category) throw new Error(`Symbol "${s.id}" uses unknown category "${s.category}" (declare it in categories.ts)`);
    if (!(s.size[0] > 0 && s.size[1] > 0)) throw new Error(`Symbol "${s.id}" needs a positive size`);
    return {
      ...s,
      anchor: s.anchor ?? [0.5, 0.92],
      variants: Math.max(1, Math.floor(s.variants ?? 6)),
      layer: s.layer ?? category.layer ?? 'object',
      order: s.order ?? 100,
      tags: s.tags ?? [],
      placement: s.placement ?? 'any',
      rotatable: s.rotatable ?? false,
    };
  })
  .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
export const symbolById: ReadonlyMap<string, ResolvedSymbol> = new Map(symbols.map((s) => [s.id, s]));

export const terrains: readonly ResolvedTerrain[] = collect<TerrainDef>(terrainModules, 'terrain')
  .map<ResolvedTerrain>((t) => {
    const group = t.group ?? 'land';
    return { ...t, tileSize: t.tileSize ?? 256, blurb: t.blurb ?? '', group, beach: t.beach ?? (group === 'land' || group === 'dry') };
  })
  .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
// A map stores one byte per terrain cell: 0 is the sea and 1..250 index the map's own list of terrain ids.
if (terrains.length > 250) throw new Error('At most 250 terrains are supported');
export const terrainById: ReadonlyMap<string, ResolvedTerrain> = new Map(terrains.map((t) => [t.id, t]));

export const themes: readonly MapTheme[] = collect<MapTheme>(themeModules, 'theme');
export const themeById: ReadonlyMap<string, MapTheme> = new Map(themes.map((t) => [t.id, t]));

export const frames: readonly FrameDef[] = collect<FrameDef>(frameModules, 'frame');
export const frameById: ReadonlyMap<string, FrameDef> = new Map(frames.map((f) => [f.id, f]));

export const pathStyles: readonly ResolvedPathStyle[] = collect<PathStyleDef>(pathModules, 'path style')
  .map<ResolvedPathStyle>((p) => ({ ...p, taper: p.taper ?? false, order: p.order ?? 100, blurb: p.blurb ?? '' }))
  .sort((a, b) => a.order - b.order);
export const pathStyleById: ReadonlyMap<string, ResolvedPathStyle> = new Map(pathStyles.map((p) => [p.id, p]));

export const labelStyles: readonly ResolvedLabelStyle[] = collect<LabelStyleDef>(labelModules, 'label style')
  .map<ResolvedLabelStyle>((l) => ({ ...l, weight: l.weight ?? 400, italic: l.italic ?? false, uppercase: l.uppercase ?? false, order: l.order ?? 100 }))
  .sort((a, b) => a.order - b.order);
export const labelStyleById: ReadonlyMap<string, ResolvedLabelStyle> = new Map(labelStyles.map((l) => [l.id, l]));

export const brushes: readonly ResolvedBrush[] = collect<BrushDef>(brushModules, 'brush')
  .map<ResolvedBrush>((b) => ({ ...b, jitter: b.jitter ?? 0.45, flip: b.flip ?? true, order: b.order ?? 100, blurb: b.blurb ?? '' }))
  .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
export const brushById: ReadonlyMap<string, ResolvedBrush> = new Map(brushes.map((b) => [b.id, b]));

export { fonts };
export const fontList: readonly FontDef[] = fonts;

/* ------------------------------------------------------------------------------------ */
/* Cross-reference validation (fails fast while developing art)                          */
/* ------------------------------------------------------------------------------------ */

for (const b of brushes) {
  if (!categoryById.has(b.category)) throw new Error(`Brush "${b.id}" uses unknown category "${b.category}"`);
  for (const item of b.items) {
    if (!symbolById.has(item.symbol)) throw new Error(`Brush "${b.id}" references unknown symbol "${item.symbol}"`);
  }
}
for (const t of themes) {
  if (!frameById.has(t.frame)) throw new Error(`Theme "${t.id}" references unknown frame "${t.frame}"`);
}

/* ------------------------------------------------------------------------------------ */
/* Lookups                                                                              */
/* ------------------------------------------------------------------------------------ */

export const DEFAULT_THEME_ID = 'wonder';

export function getTheme(id: string | undefined): MapTheme {
  return (id ? themeById.get(id) : undefined) ?? themeById.get(DEFAULT_THEME_ID) ?? themes[0]!;
}

export function getFrame(id: string | undefined): FrameDef {
  return (id ? frameById.get(id) : undefined) ?? frameById.get('none') ?? frames[0]!;
}

export function symbolsInCategory(categoryId: string): ResolvedSymbol[] {
  return symbols.filter((s) => s.category === categoryId);
}

export function brushesInCategory(categoryId: string): ResolvedBrush[] {
  return brushes.filter((b) => b.category === categoryId);
}
