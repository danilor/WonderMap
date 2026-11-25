import type { BrushDef, CategoryDef, FontDef, FrameDef, LabelStyleDef, MapTheme, PathStyleDef, SymbolDef, TerrainDef } from './types';

/**
 * Identity helpers: they exist so editors infer and check the shape of each definition,
 * and so every art file reads the same way. `catalog.ts` discovers and validates the results.
 */
export const defineSymbol = (def: SymbolDef): SymbolDef => def;
export const defineTerrain = (def: TerrainDef): TerrainDef => def;
export const defineTheme = (def: MapTheme): MapTheme => def;
export const definePathStyle = (def: PathStyleDef): PathStyleDef => def;
export const defineBrush = (def: BrushDef): BrushDef => def;
export const defineLabelStyle = (def: LabelStyleDef): LabelStyleDef => def;
export const defineFrame = (def: FrameDef): FrameDef => def;
export const defineFont = (def: FontDef): FontDef => def;
export const defineCategory = (def: CategoryDef): CategoryDef => def;
