import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import { showsWholeMap } from '../../engine/camera';
import { NO_EXPANSION, expandDocument, validateExpansion } from '../../model/document';
import type { Expansion } from '../../model/document';
import { CELL } from '../../model/types';
import { useEditor } from '../../store/editorStore';
import type { Side } from '../EdgeChips';

interface DialogProps {
  show: boolean;
  /** The edge whose "+" button opened the dialog; it starts with some extra canvas. */
  side: Side | null;
  onHide(): void;
}

const SIDE_LABEL: Record<Side, string> = { top: 'Top', right: 'Right', bottom: 'Bottom', left: 'Left' };
const START_AMOUNT = 400;
const snap = (v: number) => Math.round(v / CELL) * CELL;

export function ExpandDialog({ show, side, onHide }: DialogProps) {
  return (
    <Modal show={show} onHide={onHide} centered data-testid="expand-dialog">
      <ExpandForm side={side ?? 'right'} onHide={onHide} />
    </Modal>
  );
}

function ExpandForm({ side, onHide }: { side: Side; onHide(): void }) {
  const doc = useEditor((s) => s.doc);
  const [d, setD] = useState<Expansion>({ ...NO_EXPANSION, [side]: START_AMOUNT });

  const error = validateExpansion(doc, d);
  const unchanged = d.left + d.top + d.right + d.bottom <= 0;
  const added = { left: snap(d.left), top: snap(d.top), right: snap(d.right), bottom: snap(d.bottom) };
  const width = doc.width + added.left + added.right;
  const height = doc.height + added.top + added.bottom;

  function apply() {
    const s = useEditor.getState();
    const wholeMap = showsWholeMap(s.camera, s.viewport.width, s.viewport.height, s.doc.width, s.doc.height);
    s.commit(expandDocument(s.doc, d));
    if (wholeMap) {
      // The user was looking at the whole map, so show the bigger one the same way.
      s.fit();
    } else {
      // The map grows around the old one, so move the camera along to keep the same spot in the middle.
      s.setCamera({ ...s.camera, x: s.camera.x + added.left, y: s.camera.y + added.top });
    }
    onHide();
  }

  const set = (key: Side, v: number) => setD((cur) => ({ ...cur, [key]: v }));
  const grow = (fx: number, fy: number) =>
    setD({
      left: Math.round((doc.width * fx) / 2 / 100) * 100,
      right: Math.round((doc.width * fx) / 2 / 100) * 100,
      top: Math.round((doc.height * fy) / 2 / 100) * 100,
      bottom: Math.round((doc.height * fy) / 2 / 100) * 100,
    });

  // The little picture: the old map (green) inside the enlarged canvas (striped).
  const k = Math.min(250 / width, 128 / height);
  const pct = (v: number, total: number) => `${(v / total) * 100}%`;

  return (
    <>
      <Modal.Header closeButton>
        <Modal.Title>Add canvas</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="small text-secondary">
          Make the map bigger on any side. Everything you painted stays where it is and the new area starts as open sea.
        </p>

        <div className="expand-grid">
          <SideInput side="top" value={d.top} onChange={(v) => set('top', v)} />
          <SideInput side="left" value={d.left} onChange={(v) => set('left', v)} />
          <div className="expand-preview">
            <div className="expand-frame" style={{ width: width * k, height: height * k }}>
              <div className="added" style={{ inset: 0 }} />
              <div
                className="current"
                style={{
                  left: pct(added.left, width),
                  top: pct(added.top, height),
                  width: pct(doc.width, width),
                  height: pct(doc.height, height),
                }}
              />
            </div>
          </div>
          <SideInput side="right" value={d.right} onChange={(v) => set('right', v)} />
          <SideInput side="bottom" value={d.bottom} onChange={(v) => set('bottom', v)} />
        </div>

        <div className="toggle-chips mt-3">
          <button type="button" className="chip" onClick={() => setD({ left: 400, top: 400, right: 400, bottom: 400 })}>
            + 400 on every side
          </button>
          <button type="button" className="chip" onClick={() => grow(0.5, 0)}>
            50% wider
          </button>
          <button type="button" className="chip" onClick={() => grow(0, 0.5)}>
            50% taller
          </button>
          <button type="button" className="chip" onClick={() => setD(NO_EXPANSION)}>
            Reset
          </button>
        </div>

        <div className="mt-3 small" data-testid="expand-size">
          <span className="text-secondary">New size: </span>
          <strong>
            {width} × {height} px
          </strong>
          <span className="text-secondary"> (now {doc.width} × {doc.height})</span>
        </div>
        {error && (
          <div className="text-danger small mt-1" role="alert">
            {error}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className="btn btn-outline-light" onClick={onHide}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" disabled={unchanged || error !== null} onClick={apply} data-testid="expand-apply">
          <i className="bi bi-plus-lg me-2" />
          Add canvas
        </button>
      </Modal.Footer>
    </>
  );
}

function SideInput({ side, value, onChange }: { side: Side; value: number; onChange(v: number): void }) {
  return (
    <label className={`expand-side side-${side}`}>
      <span className="wm-field-label">{SIDE_LABEL[side]}</span>
      <input
        type="number"
        className="form-control form-control-sm"
        min={0}
        step={100}
        value={value}
        data-testid={`expand-${side}`}
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
      />
    </label>
  );
}
