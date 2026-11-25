import { Fragment } from 'react';
import { useEditor } from '../store/editorStore';
import { TOOL_LIST } from './toolInfo';

/** The column of big tool buttons on the far left. */
export function ToolRail() {
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);

  return (
    <nav className="tool-rail" aria-label="Tools" data-testid="tool-rail">
      {TOOL_LIST.map((t, i) => (
        <Fragment key={t.id}>
          {i === 2 && <div className="rail-sep" role="separator" />}
          <button type="button" className={`tool-btn${t.id === tool ? ' active' : ''}`} title={`${t.name} (${t.key})`} aria-pressed={t.id === tool} data-testid={`tool-${t.id}`} onClick={() => setTool(t.id)}>
            <i className={`bi bi-${t.icon}`} />
            <span>{t.label}</span>
            <kbd>{t.key}</kbd>
          </button>
        </Fragment>
      ))}
    </nav>
  );
}
