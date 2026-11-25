import { useEditor } from '../store/editorStore';
import type { Tool } from './types';

/** A click opens the text box (rendered by the map view) where the new label is typed. */
export function createLabelTool(): Tool {
  return {
    cursor: () => 'text',
    down(p) {
      const s = useEditor.getState();
      s.select([]);
      s.setLabelEdit({ x: p.x, y: p.y, text: '', style: s.options.label.style, curve: s.options.label.curve });
    },
  };
}
