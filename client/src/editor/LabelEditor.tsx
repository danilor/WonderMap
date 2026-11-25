import { useEffect, useRef, useState } from 'react';
import { fontList, labelStyleById } from '@wondermap/illustrations';
import { mapToScreen } from '../engine/camera';
import { addLabel, removeItems, updateLabels } from '../model/ops';
import { useEditor } from '../store/editorStore';

/** The text box shown on the map while a label is typed or renamed. Enter keeps it, Escape throws it away. */
export function LabelEditor() {
  const edit = useEditor((s) => s.labelEdit);
  if (!edit) return null;
  return <LabelInput key={edit.id ?? `new-${edit.x}-${edit.y}`} />;
}

function LabelInput() {
  const edit = useEditor((s) => s.labelEdit)!;
  const camera = useEditor((s) => s.camera);
  const viewport = useEditor((s) => s.viewport);
  const [text, setText] = useState(edit.text);
  const ref = useRef<HTMLInputElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    // Focus once the press that opened the box is over: the browser moves focus to the canvas on mouse-down,
    // which would blur (and so close) the box straight away.
    const timer = window.setTimeout(() => {
      ref.current?.focus();
      ref.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const style = labelStyleById.get(edit.style);
  const [sx, sy] = mapToScreen(camera, viewport.width, viewport.height, edit.x, edit.y);
  const fontSize = Math.min(44, Math.max(15, (style?.size ?? 24) * camera.zoom));
  const family = fontList.find((f) => f.id === style?.font)?.family;
  const fontFamily = family ? `"${family}", Georgia, serif` : 'Georgia, serif';

  const close = (keep: boolean) => {
    if (finished.current) return;
    finished.current = true;
    const s = useEditor.getState();
    const value = text.trim();
    if (keep) {
      if (edit.id) {
        if (value) s.commit(updateLabels(s.doc, [edit.id], { text: value }));
        else s.commit(removeItems(s.doc, [edit.id]), []);
      } else if (value && style) {
        const { doc } = addLabel(s.doc, {
          text: value,
          x: edit.x,
          y: edit.y,
          style: edit.style,
          size: style.size,
          rotation: 0,
          curve: edit.curve,
          spacing: 0,
          color: null,
        });
        s.commit(doc);
      }
    }
    s.setLabelEdit(null);
  };

  return (
    <input
      ref={ref}
      data-map-chrome
      className="label-editor"
      style={{ left: sx, top: sy, fontSize, fontFamily, textTransform: style?.uppercase ? 'uppercase' : undefined }}
      value={text}
      placeholder="Name…"
      maxLength={120}
      spellCheck={false}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') close(true);
        else if (e.key === 'Escape') close(false);
      }}
      onBlur={() => close(true)}
    />
  );
}
