import { useRef, useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import { documentToJson } from '../model/document';
import { renameDocument } from '../model/ops';
import { canRedo, canUndo, useEditor } from '../store/editorStore';
import { downloadText, projectFileName } from '../utils/files';
import { flushBurst } from './burst';
import type { Autosave, SaveStatus } from './useAutosave';

interface TopBarProps {
  autosave: Autosave;
  onExport(): void;
  onExpand(): void;
  onSettings(): void;
  /** Saves, then goes back to the library. */
  onLeave(): void;
}

const SAVE_TEXT: Record<SaveStatus, { icon: string; text: string }> = {
  saved: { icon: 'cloud-check', text: 'Saved' },
  saving: { icon: 'cloud-arrow-up', text: 'Saving…' },
  dirty: { icon: 'cloud-arrow-up', text: 'Unsaved changes' },
  error: { icon: 'cloud-slash', text: 'Not saved' },
};

export function TopBar({ autosave, onExport, onExpand, onSettings, onLeave }: TopBarProps) {
  const doc = useEditor((s) => s.doc);
  const undoable = useEditor(canUndo);
  const redoable = useEditor(canRedo);
  const zoom = useEditor((s) => s.camera.zoom);
  // What is being typed in the name box. It is null while the box simply shows the map's own name.
  const [draft, setDraft] = useState<string | null>(null);
  const cancelRename = useRef(false);
  const name = draft ?? doc.name;

  const history = (action: 'undo' | 'redo') => {
    flushBurst();
    useEditor.getState()[action]();
  };
  const finishRename = () => {
    const s = useEditor.getState();
    if (draft !== null && !cancelRename.current) s.commit(renameDocument(s.doc, draft));
    cancelRename.current = false;
    setDraft(null);
  };
  const save = SAVE_TEXT[autosave.status];

  return (
    <header className="topbar" data-testid="topbar">
      <a
        className="brand"
        href="#/"
        title="Back to your maps"
        onClick={(e) => {
          e.preventDefault();
          onLeave();
        }}
      >
        <i className="bi bi-compass me-2" />
        WonderMap
      </a>
      <span className="top-sep" />
      <input
        className="map-name"
        type="text"
        value={name}
        maxLength={80}
        aria-label="Map name"
        data-testid="map-name"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={finishRename}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          else if (e.key === 'Escape') {
            cancelRename.current = true;
            e.currentTarget.blur();
          }
        }}
      />
      <span className="top-sep" />
      <div className="top-group">
        <button type="button" className="icon-btn" title="Undo (Ctrl+Z)" disabled={!undoable} onClick={() => history('undo')} data-testid="undo">
          <i className="bi bi-arrow-counterclockwise" />
        </button>
        <button type="button" className="icon-btn" title="Redo (Ctrl+Y)" disabled={!redoable} onClick={() => history('redo')} data-testid="redo">
          <i className="bi bi-arrow-clockwise" />
        </button>
      </div>
      <span className="top-sep" />
      <div className="top-group">
        <button type="button" className="icon-btn" title="Zoom out (-)" onClick={() => useEditor.getState().zoomBy(0.8)} data-testid="zoom-out">
          <i className="bi bi-zoom-out" />
        </button>
        <button
          type="button"
          className="zoom-readout"
          title="Reset to 100%"
          data-testid="zoom-readout"
          onClick={() => {
            const s = useEditor.getState();
            s.setCamera({ ...s.camera, zoom: 1 });
          }}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" className="icon-btn" title="Zoom in (+)" onClick={() => useEditor.getState().zoomBy(1.25)} data-testid="zoom-in">
          <i className="bi bi-zoom-in" />
        </button>
        <button type="button" className="icon-btn" title="Show the whole map (F)" onClick={() => useEditor.getState().fit()} data-testid="zoom-fit">
          <i className="bi bi-fullscreen" />
        </button>
      </div>

      <div className="flex-grow-1" />

      <span className={`save-state is-${autosave.status}`} title={autosave.error ?? undefined} data-testid="save-state" data-status={autosave.status}>
        <i className={`bi bi-${save.icon}`} />
        {save.text}
      </span>
      <span className="top-sep" />
      <button type="button" className="icon-btn" title="Add canvas around the map" onClick={onExpand} data-testid="open-expand">
        <i className="bi bi-aspect-ratio" />
        <span>Add canvas</span>
      </button>
      <button type="button" className="icon-btn" title="Map style and options" onClick={onSettings} data-testid="open-settings">
        <i className="bi bi-sliders" />
        <span>Style</span>
      </button>
      <button type="button" className="btn btn-primary btn-sm ms-1" title="Save the map as a picture" onClick={onExport} data-testid="open-export">
        <i className="bi bi-download me-2" />
        Export
      </button>
      <Dropdown align="end">
        <Dropdown.Toggle as="button" bsPrefix="icon-btn" title="More" aria-label="More" data-testid="open-more">
          <i className="bi bi-three-dots" />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item onClick={() => downloadText(documentToJson(useEditor.getState().doc), projectFileName(doc.name))}>
            <i className="bi bi-file-earmark-arrow-down me-2" />
            Download project file
          </Dropdown.Item>
          <Dropdown.Item onClick={() => void autosave.flush(true)}>
            <i className="bi bi-floppy me-2" />
            Save now
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item onClick={onLeave} data-testid="back-to-library">
            <i className="bi bi-folder2-open me-2" />
            Back to my maps
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </header>
  );
}
