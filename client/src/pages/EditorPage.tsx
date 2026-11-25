import { useEffect, useState } from 'react';
import { ensureFonts } from '@wondermap/illustrations';
import { loadMap } from '../api/maps';
import { flushBurst } from '../editor/burst';
import { ExpandDialog } from '../editor/dialogs/ExpandDialog';
import { ExportDialog } from '../editor/dialogs/ExportDialog';
import { SettingsDialog } from '../editor/dialogs/SettingsDialog';
import type { Side } from '../editor/EdgeChips';
import { MapView } from '../editor/MapView';
import { Inspector } from '../editor/panels/Inspector';
import { ToolPanel } from '../editor/panels/ToolPanel';
import { StatusBar } from '../editor/StatusBar';
import { ToolRail } from '../editor/ToolRail';
import { TopBar } from '../editor/TopBar';
import { useAutosave } from '../editor/useAutosave';
import { useHotkeys } from '../editor/useHotkeys';
import { documentToJson } from '../model/document';
import { isDirty, useEditor } from '../store/editorStore';
import { downloadText, projectFileName } from '../utils/files';
import { navigate } from '../utils/router';

type Phase = { kind: 'loading' } | { kind: 'ready' } | { kind: 'error'; message: string };
type DialogId = 'export' | 'expand' | 'settings';

/** `#/editor/:id`: loads one map from the server and shows the painting studio. */
export function EditorPage({ id }: { id: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadMap(id), ensureFonts()])
      .then(([doc]) => {
        if (cancelled) return;
        useEditor.getState().open(doc);
        setPhase({ kind: 'ready' });
      })
      .catch((e: unknown) => {
        if (!cancelled) setPhase({ kind: 'error', message: e instanceof Error ? e.message : 'The map could not be opened.' });
      });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  if (phase.kind === 'ready') return <Studio />;
  return (
    <div className="editor" data-testid="editor-loading">
      <div className="map-loading">
        {phase.kind === 'loading' ? (
          <>
            <div className="spinner-border text-warning" role="status" />
            <div>Unrolling the map…</div>
          </>
        ) : (
          <>
            <i className="bi bi-exclamation-triangle fs-1" />
            <div role="alert" className="text-center px-3">
              {phase.message}
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setPhase({ kind: 'loading' });
                  setAttempt((n) => n + 1);
                }}
              >
                Try again
              </button>
              <a className="btn btn-outline-light" href="#/">
                My maps
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Studio() {
  const name = useEditor((s) => s.doc.name);
  const autosave = useAutosave();
  const [dialog, setDialog] = useState<DialogId | null>(null);
  const [side, setSide] = useState<Side | null>(null);

  useHotkeys(() => void autosave.flush());
  useEffect(() => {
    document.title = `${name} · WonderMap`;
    return () => {
      document.title = 'WonderMap';
    };
  }, [name]);

  async function leave() {
    flushBurst();
    await autosave.flush(true);
    if (isDirty(useEditor.getState()) && !window.confirm('The latest changes could not be saved to the server. Leave anyway?')) return;
    navigate('/');
  }

  const close = () => setDialog(null);
  const openExpand = (from: Side | null) => {
    setSide(from);
    setDialog('expand');
  };

  return (
    <div className="editor" data-testid="editor">
      <TopBar autosave={autosave} onExport={() => setDialog('export')} onExpand={() => openExpand(null)} onSettings={() => setDialog('settings')} onLeave={() => void leave()} />
      <div className="editor-body">
        <ToolRail />
        <ToolPanel />
        <div className="stage">
          <MapView onExpand={openExpand} />
          <Inspector />
          {autosave.status === 'error' && (
            <div className="map-banner" role="alert" data-testid="save-error">
              <i className="bi bi-exclamation-triangle" />
              <span>{autosave.error} Your work stays in this tab and saving is retried automatically.</span>
              <button type="button" className="btn btn-sm btn-outline-light" onClick={() => void autosave.flush()}>
                Retry
              </button>
              <button type="button" className="btn btn-sm btn-outline-light" onClick={() => downloadText(documentToJson(useEditor.getState().doc), projectFileName(name))}>
                Download copy
              </button>
            </div>
          )}
        </div>
      </div>
      <StatusBar />
      <ExportDialog show={dialog === 'export'} onHide={close} />
      <ExpandDialog show={dialog === 'expand'} side={side} onHide={close} />
      <SettingsDialog show={dialog === 'settings'} onHide={close} />
    </div>
  );
}
