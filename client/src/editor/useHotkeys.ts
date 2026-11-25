import { useEffect, useRef } from 'react';
import { pathStyleById } from '@wondermap/illustrations';
import { useEditor } from '../store/editorStore';
import { flushBurst } from './burst';
import { isKeyCaptured } from './keys';
import { TOOL_LIST } from './toolInfo';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** `[` and `]`: make the active tool's brush smaller or bigger. */
function resizeBrush(direction: 1 | -1): void {
  const s = useEditor.getState();
  const o = s.options;
  const f = direction > 0 ? 1.15 : 1 / 1.15;
  switch (s.tool) {
    case 'terrain':
      s.setOption('terrain', { size: clamp(Math.round(o.terrain.size * f), 8, 400) });
      break;
    case 'eraser':
      s.setOption('eraser', { size: clamp(Math.round(o.eraser.size * f), 8, 300) });
      break;
    case 'symbol':
      if (o.symbol.brush) s.setOption('symbol', { radius: clamp(Math.round(o.symbol.radius * f), 20, 400) });
      else s.setOption('symbol', { scale: clamp(Math.round(o.symbol.scale * f * 20) / 20, 0.25, 3) });
      break;
    case 'path': {
      const current = o.path.width || pathStyleById.get(o.path.style)?.width || 4;
      s.setOption('path', { width: clamp(Math.round(current + direction), 1, 60) });
      break;
    }
    default:
  }
}

/** Keyboard shortcuts that work anywhere in the editor. The tools handle their own keys (see `useMapInput`). */
export function useHotkeys(onSave: () => void): void {
  const save = useRef(onSave);
  useEffect(() => {
    save.current = onSave;
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isKeyCaptured(e.target)) return;
      const s = useEditor.getState();
      const key = e.key.toLowerCase();

      if (e.ctrlKey || e.metaKey) {
        if (key === 'z') {
          flushBurst();
          if (e.shiftKey) s.redo();
          else s.undo();
        } else if (key === 'y') {
          flushBurst();
          s.redo();
        } else if (key === 's') {
          save.current();
        } else {
          return;
        }
        e.preventDefault();
        return;
      }
      if (e.altKey) return;

      const tool = TOOL_LIST.find((t) => t.key.toLowerCase() === key);
      if (tool) {
        s.setTool(tool.id);
      } else if (key === '[' || key === ']') {
        resizeBrush(key === ']' ? 1 : -1);
      } else if (key === 'f' || key === 'home') {
        s.fit();
      } else if (key === '+' || key === '=') {
        s.zoomBy(1.25);
      } else if (key === '-' || key === '_') {
        s.zoomBy(0.8);
      } else {
        return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
