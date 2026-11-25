import type { ToolId } from '../store/editorStore';

export interface ToolInfo {
  id: ToolId;
  /** Full name for tooltips and panel headers. */
  name: string;
  /** One short word under the rail icon. */
  label: string;
  /** Bootstrap Icons name without the `bi-` prefix. */
  icon: string;
  /** Single-letter keyboard shortcut. */
  key: string;
  /** One sentence for the tool panel. */
  blurb: string;
  /** One line for the status bar. */
  hint: string;
}

/** Rail order. The first two tools move around the map, the rest add to it. */
export const TOOL_LIST: readonly ToolInfo[] = [
  {
    id: 'select',
    name: 'Select & move',
    label: 'Select',
    icon: 'cursor-fill',
    key: 'V',
    blurb: 'Pick things you have placed, then move, resize, rotate, copy or delete them.',
    hint: 'Click or drag a box to select · Shift adds · drag to move · Alt+drag copies · Del removes',
  },
  {
    id: 'pan',
    name: 'Pan',
    label: 'Pan',
    icon: 'hand-index-thumb',
    key: 'H',
    blurb: 'Drag the map around. With any other tool, hold Space or use the right mouse button.',
    hint: 'Drag to move around · scroll to zoom',
  },
  {
    id: 'terrain',
    name: 'Land & sea',
    label: 'Land',
    icon: 'brush-fill',
    key: 'B',
    blurb: 'Paint land, deserts, ice and swamps onto the sea. Coasts, beaches and shallows follow your brush.',
    hint: 'Drag to paint · [ and ] change the brush size',
  },
  {
    id: 'symbol',
    name: 'Stamps & scatter brushes',
    label: 'Stamp',
    icon: 'tree-fill',
    key: 'S',
    blurb: 'Place mountains, trees, towns, castles and sea creatures, or spray a whole forest with one stroke.',
    hint: 'Click to place · drag to scatter with a brush · [ and ] resize',
  },
  {
    id: 'path',
    name: 'Rivers, roads & borders',
    label: 'Paths',
    icon: 'bezier2',
    key: 'P',
    blurb: 'Draw a line freehand. It is smoothed when you let go, and you can fine-tune it with the select tool.',
    hint: 'Drag to draw · [ and ] change the width',
  },
  {
    id: 'label',
    name: 'Names & labels',
    label: 'Text',
    icon: 'fonts',
    key: 'T',
    blurb: 'Write the names of kingdoms, cities, seas and mountains right on the map, straight or curved.',
    hint: 'Click where the name goes · Enter to place it · Esc to cancel',
  },
  {
    id: 'eraser',
    name: 'Eraser',
    label: 'Erase',
    icon: 'eraser-fill',
    key: 'E',
    blurb: 'Rub out stamps, paths and labels. To remove land, use the Sea mode of the land tool.',
    hint: 'Drag over things to remove them · [ and ] change the size',
  },
];

export const toolInfo = (id: ToolId): ToolInfo => TOOL_LIST.find((t) => t.id === id) ?? TOOL_LIST[0]!;
