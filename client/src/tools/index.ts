import type { ToolId } from '../store/editorStore';
import { createEraserTool } from './eraserTool';
import { createLabelTool } from './labelTool';
import { createPathTool } from './pathTool';
import { createSelectTool } from './selectTool';
import { createSymbolTool } from './symbolTool';
import { createTerrainTool } from './terrainTool';
import type { Tool } from './types';

/**
 * One instance of every tool (tools keep their gesture state in a closure).
 * Panning is handled by the map view itself, so the pan tool only supplies the cursor.
 */
export function createTools(): Record<ToolId, Tool> {
  return {
    select: createSelectTool(),
    pan: { cursor: () => 'grab' },
    terrain: createTerrainTool(),
    symbol: createSymbolTool(),
    path: createPathTool(),
    label: createLabelTool(),
    eraser: createEraserTool(),
  };
}

export type { Tool, PointerInfo, OverlayInfo } from './types';
