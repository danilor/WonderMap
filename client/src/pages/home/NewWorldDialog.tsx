import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import { DEFAULT_THEME_ID, themes } from '@wondermap/illustrations';
import { saveMap } from '../../api/maps';
import { createDocument } from '../../model/document';
import { LIMITS, MAP_PRESETS } from '../../model/types';
import { navigate } from '../../utils/router';

const CUSTOM = 'custom';

function sizeError(width: number, height: number): string | null {
  if (width < LIMITS.minSize || height < LIMITS.minSize) return `Each side needs at least ${LIMITS.minSize} px.`;
  if (width > LIMITS.maxSize || height > LIMITS.maxSize) return `Each side can be at most ${LIMITS.maxSize} px.`;
  if (width * height > LIMITS.maxArea) return `That is too big (${Math.round((width * height) / 1e6)} megapixels, the limit is ${LIMITS.maxArea / 1e6}).`;
  return null;
}

export function NewWorldDialog({ show, onHide }: { show: boolean; onHide(): void }) {
  return (
    <Modal show={show} onHide={onHide} centered data-testid="new-world-dialog">
      <NewWorldForm onHide={onHide} />
    </Modal>
  );
}

function NewWorldForm({ onHide }: { onHide(): void }) {
  const [name, setName] = useState('');
  const [preset, setPreset] = useState<string>(MAP_PRESETS[1]?.id ?? CUSTOM);
  const [custom, setCustom] = useState({ width: 3000, height: 2000 });
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = MAP_PRESETS.find((p) => p.id === preset);
  const width = chosen?.width ?? custom.width;
  const height = chosen?.height ?? custom.height;
  const invalid = sizeError(width, height);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const doc = createDocument({ name, width, height, themeId });
      await saveMap(doc);
      navigate(`/editor/${doc.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The world could not be created.');
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!invalid && !busy) void create();
      }}
    >
      <Modal.Header closeButton>
        <Modal.Title>New world</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="wm-field">
          <label htmlFor="new-name" className="wm-field-label">
            Name
          </label>
          <input
            id="new-name"
            type="text"
            className="form-control"
            placeholder="Untitled World"
            maxLength={80}
            autoFocus
            value={name}
            data-testid="new-name"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="wm-field">
          <div className="wm-field-label mb-1">Canvas size</div>
          <div className="scale-grid">
            {MAP_PRESETS.map((p) => (
              <button key={p.id} type="button" className={`scale-option${preset === p.id ? ' active' : ''}`} data-testid={`preset-${p.id}`} onClick={() => setPreset(p.id)}>
                {p.name.split(' (')[0]}
                <small>
                  {p.width} × {p.height}
                </small>
              </button>
            ))}
            <button type="button" className={`scale-option${preset === CUSTOM ? ' active' : ''}`} data-testid="preset-custom" onClick={() => setPreset(CUSTOM)}>
              Custom
              <small>your size</small>
            </button>
          </div>
          {preset === CUSTOM && (
            <div className="row g-2 mt-1">
              <div className="col">
                <input
                  type="number"
                  className="form-control form-control-sm"
                  aria-label="Width in pixels"
                  min={LIMITS.minSize}
                  max={LIMITS.maxSize}
                  step={100}
                  value={custom.width}
                  data-testid="custom-width"
                  onChange={(e) => setCustom((c) => ({ ...c, width: Math.round(Number(e.target.value) || 0) }))}
                />
              </div>
              <div className="col-auto align-self-center text-secondary">×</div>
              <div className="col">
                <input
                  type="number"
                  className="form-control form-control-sm"
                  aria-label="Height in pixels"
                  min={LIMITS.minSize}
                  max={LIMITS.maxSize}
                  step={100}
                  value={custom.height}
                  data-testid="custom-height"
                  onChange={(e) => setCustom((c) => ({ ...c, height: Math.round(Number(e.target.value) || 0) }))}
                />
              </div>
            </div>
          )}
          <div className="wm-hint">You can always add more canvas later, on any side.</div>
          {invalid && (
            <div className="text-danger small mt-1" role="alert">
              {invalid}
            </div>
          )}
        </div>

        <div className="wm-field mb-0">
          <div className="wm-field-label mb-1">Map style</div>
          <div className="d-grid gap-2">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`theme-card${t.id === themeId ? ' active' : ''}`}
                data-testid={`new-theme-${t.id}`}
                onClick={() => setThemeId(t.id)}
              >
                <span className="swatch" style={{ background: `linear-gradient(135deg, ${t.swatch[0]} 50%, ${t.swatch[1]} 50%)` }} />
                <span>
                  <strong className="d-block">{t.name}</strong>
                  <small className="text-secondary">{t.blurb}</small>
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="alert alert-danger mt-3 mb-0" role="alert">
            {error}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className="btn btn-outline-light" onClick={onHide}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy || invalid !== null} data-testid="new-create">
          <i className="bi bi-stars me-2" />
          {busy ? 'Creating…' : 'Create world'}
        </button>
      </Modal.Footer>
    </form>
  );
}
