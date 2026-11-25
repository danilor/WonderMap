import { Slider } from '../../components/Slider';
import type { ToolOptions } from '../../store/editorStore';
import { useEditor } from '../../store/editorStore';

const KINDS: ReadonlyArray<{ key: 'symbols' | 'paths' | 'labels'; label: string }> = [
  { key: 'symbols', label: 'Stamps' },
  { key: 'paths', label: 'Paths' },
  { key: 'labels', label: 'Names' },
];

/** Rubs out stamps, paths and names under the brush. */
export function EraserPanel() {
  const options: ToolOptions['eraser'] = useEditor((s) => s.options.eraser);
  const setOption = useEditor((s) => s.setOption);

  return (
    <div className="panel-body" data-testid="eraser-panel">
      <Slider label="Eraser size" value={options.size} min={8} max={300} step={2} format={(v) => `${v} px`} onChange={(v) => setOption('eraser', { size: v })} />
      <section className="panel-section">
        <h3 className="panel-title">Erase these</h3>
        <div className="toggle-chips">
          {KINDS.map((k) => (
            <button key={k.key} type="button" className={`chip${options[k.key] ? ' active' : ''}`} aria-pressed={options[k.key]} onClick={() => setOption('eraser', { [k.key]: !options[k.key] })}>
              {k.label}
            </button>
          ))}
        </div>
        <div className="wm-hint mt-2">Land and sea are not erased here. Use the Sea mode of the Land tool for that.</div>
      </section>
    </div>
  );
}
