import Modal from 'react-bootstrap/Modal';
import { frames, themes } from '@wondermap/illustrations';
import { Slider } from '../../components/Slider';
import { setLook, updateSettings } from '../../model/ops';
import type { MapSettings } from '../../model/types';
import { useEditor } from '../../store/editorStore';
import { burstEdit, flushBurst } from '../burst';

interface DialogProps {
  show: boolean;
  onHide(): void;
}

/** Look and coastline options of the map. Every change applies at once, so the map behind the dialog shows the result. */
export function SettingsDialog({ show, onHide }: DialogProps) {
  return (
    <Modal
      show={show}
      onHide={() => {
        flushBurst();
        onHide();
      }}
      centered
      scrollable
      backdropClassName="backdrop-soft"
      data-testid="settings-dialog"
    >
      <SettingsForm onHide={onHide} />
    </Modal>
  );
}

function SettingsForm({ onHide }: { onHide(): void }) {
  const doc = useEditor((s) => s.doc);
  const commit = useEditor((s) => s.commit);
  const { settings } = doc;

  const toggle = (key: 'beaches' | 'shallows' | 'grid') => {
    flushBurst();
    commit(updateSettings(doc, { [key]: !settings[key] }));
  };
  const slide = (patch: Partial<MapSettings>) => burstEdit((d) => updateSettings(d, patch));

  return (
    <>
      <Modal.Header closeButton>
        <Modal.Title>Map settings</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="panel-title">Style</div>
        <div className="d-grid gap-2 mb-3">
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`theme-card${t.id === doc.themeId ? ' active' : ''}`}
              data-testid={`theme-${t.id}`}
              onClick={() => {
                flushBurst();
                commit(setLook(doc, { themeId: t.id, frameId: t.frame }));
              }}
            >
              <span className="swatch" style={{ background: `linear-gradient(135deg, ${t.swatch[0]} 50%, ${t.swatch[1]} 50%)` }} />
              <span>
                <strong className="d-block">{t.name}</strong>
                <small className="text-secondary">{t.blurb}</small>
              </span>
            </button>
          ))}
        </div>

        <div className="wm-field">
          <label htmlFor="settings-frame" className="wm-field-label">
            Border
          </label>
          <select
            id="settings-frame"
            className="form-select form-select-sm"
            value={doc.frameId}
            onChange={(e) => {
              flushBurst();
              commit(setLook(doc, { frameId: e.target.value }));
            }}
          >
            {frames.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="panel-title mt-4">Coastline</div>
        <div className="toggle-chips mb-3">
          <button type="button" className={`chip${settings.beaches ? ' active' : ''}`} onClick={() => toggle('beaches')} data-testid="setting-beaches">
            <i className="bi bi-sun" /> Beaches
          </button>
          <button type="button" className={`chip${settings.shallows ? ' active' : ''}`} onClick={() => toggle('shallows')} data-testid="setting-shallows">
            <i className="bi bi-water" /> Shallow water
          </button>
        </div>
        <Slider
          label="Coast roughness"
          value={settings.roughness}
          min={0}
          max={1}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          hint="How ragged the shorelines are."
          onChange={(roughness) => slide({ roughness })}
        />

        <div className="panel-title mt-4">Grid</div>
        <div className="toggle-chips mb-3">
          <button type="button" className={`chip${settings.grid ? ' active' : ''}`} onClick={() => toggle('grid')} data-testid="setting-grid">
            <i className="bi bi-grid-3x3" /> Show grid
          </button>
        </div>
        <Slider
          label="Grid size"
          value={settings.gridSize}
          min={20}
          max={500}
          step={10}
          format={(v) => `${v} px`}
          disabled={!settings.grid}
          onChange={(gridSize) => slide({ gridSize })}
        />
      </Modal.Body>
      <Modal.Footer>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            flushBurst();
            onHide();
          }}
        >
          Done
        </button>
      </Modal.Footer>
    </>
  );
}
