import { useEffect, useRef, useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import ProgressBar from 'react-bootstrap/ProgressBar';
import { Segmented } from '../../components/Segmented';
import { FORMAT_INFO, exportFileName, exportMapBlob, exportSize, maxExportScale } from '../../engine/exportMap';
import type { ExportFormat } from '../../engine/exportMap';
import { useEditor } from '../../store/editorStore';
import { downloadBlob } from '../../utils/files';

const SCALES = [0.5, 1, 2, 3, 4] as const;

const FORMATS = (Object.keys(FORMAT_INFO) as ExportFormat[]).map((f) => ({ value: f, label: f === 'jpeg' ? 'JPEG' : f.toUpperCase() }));

interface DialogProps {
  show: boolean;
  onHide(): void;
}

export function ExportDialog({ show, onHide }: DialogProps) {
  return (
    <Modal show={show} onHide={onHide} centered data-testid="export-dialog">
      <ExportForm onHide={onHide} />
    </Modal>
  );
}

function ExportForm({ onHide }: { onHide(): void }) {
  const doc = useEditor((s) => s.doc);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [scale, setScale] = useState(1);
  const [grid, setGrid] = useState(doc.settings.grid);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  // Closing the dialog while the picture is still being drawn cancels the export.
  useEffect(() => () => abort.current?.abort(), []);

  const limit = maxExportScale(doc);
  const busy = progress !== null;

  async function run() {
    const controller = new AbortController();
    abort.current = controller;
    setError(null);
    setProgress(0);
    try {
      const current = useEditor.getState().doc;
      const blob = await exportMapBlob(current, format, { scale, grid, signal: controller.signal, onProgress: setProgress });
      if (controller.signal.aborted) return;
      downloadBlob(blob, exportFileName(current, format));
      onHide();
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'The export failed.');
      setProgress(null);
    }
  }

  return (
    <>
      <Modal.Header closeButton>
        <Modal.Title>Export image</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="wm-field">
          <div className="wm-field-label mb-1">Format</div>
          <Segmented value={format} options={FORMATS} onChange={(f) => setFormat(f)} label="Image format" />
          <div className="wm-hint">{FORMAT_INFO[format].label}</div>
        </div>

        <div className="wm-field">
          <div className="wm-field-label mb-1">Size</div>
          <div className="scale-grid">
            {SCALES.map((s) => {
              const size = exportSize(doc, s);
              return (
                <button
                  key={s}
                  type="button"
                  className={`scale-option${s === scale ? ' active' : ''}`}
                  disabled={s > limit || busy}
                  data-testid={`export-scale-${s}`}
                  onClick={() => setScale(s)}
                >
                  ×{s}
                  <small>
                    {size.width} × {size.height}
                  </small>
                </button>
              );
            })}
          </div>
          <div className="wm-hint">Larger sizes are sharper but take longer and need more memory.</div>
        </div>

        <div className="form-check">
          <input id="export-grid" type="checkbox" className="form-check-input" checked={grid} disabled={busy} onChange={(e) => setGrid(e.target.checked)} />
          <label htmlFor="export-grid" className="form-check-label">
            Include the grid
          </label>
        </div>

        {busy && <ProgressBar className="mt-3" now={Math.round(progress * 100)} label={`${Math.round(progress * 100)}%`} animated />}
        {error && (
          <div className="alert alert-danger mt-3 mb-0" role="alert">
            {error}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className="btn btn-outline-light" onClick={onHide}>
          {busy ? 'Cancel' : 'Close'}
        </button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={run} data-testid="export-run">
          <i className="bi bi-download me-2" />
          {busy ? 'Drawing…' : 'Export'}
        </button>
      </Modal.Footer>
    </>
  );
}
