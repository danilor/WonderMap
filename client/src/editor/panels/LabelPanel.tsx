import { fontCss, labelStyles } from '@wondermap/illustrations';
import type { ResolvedLabelStyle } from '@wondermap/illustrations';
import { Slider } from '../../components/Slider';
import { useEditor } from '../../store/editorStore';

const SAMPLES: Readonly<Record<string, string>> = {
  continent: 'Aldoria',
  region: 'The Ashen Marches',
  city: 'Silverhaven',
  town: 'Brindle Ford',
  village: 'Mossby',
  sea: 'Sea of Whispers',
  mountain: 'Dragonspine',
  wild: 'Hollow Wood',
  landmark: 'Old Watchtower',
  ancient: 'Elder Ruins',
  dungeon: 'The Sunken Crypt',
  title: 'Realm of Aldoria',
};

function sampleStyle(l: ResolvedLabelStyle) {
  return {
    font: fontCss(l.font, 19, l.weight, l.italic),
    letterSpacing: `${l.spacing}em`,
    textTransform: l.uppercase ? ('uppercase' as const) : ('none' as const),
  };
}

/** Names for places, each style shown in its own lettering. */
export function LabelPanel() {
  const { style, curve } = useEditor((s) => s.options.label);
  const setOption = useEditor((s) => s.setOption);

  return (
    <div className="panel-body" data-testid="label-panel">
      <section className="panel-section">
        <h3 className="panel-title">Lettering</h3>
        {labelStyles.map((l) => (
          <button key={l.id} type="button" className={`label-item${l.id === style ? ' active' : ''}`} aria-pressed={l.id === style} data-testid={`label-${l.id}`} onClick={() => setOption('label', { style: l.id })}>
            <span className="sample" style={sampleStyle(l)}>
              {SAMPLES[l.id] ?? l.name}
            </span>
            <span className="tag">{l.name}</span>
          </button>
        ))}
      </section>
      <Slider
        label="Curve"
        value={curve}
        min={-1}
        max={1}
        step={0.05}
        format={(v) => (Math.abs(v) < 0.03 ? 'Straight' : v > 0 ? `Arch ${Math.round(v * 100)}%` : `Dip ${Math.round(-v * 100)}%`)}
        hint="Bend the name along an arc, handy for seas, ranges and kingdoms."
        onChange={(v) => setOption('label', { curve: v })}
      />
    </div>
  );
}
