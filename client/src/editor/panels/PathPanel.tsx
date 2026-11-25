import { getTheme, pathStyleById, pathStyles } from '@wondermap/illustrations';
import { PathPreview } from '../../components/PathPreview';
import { Slider } from '../../components/Slider';
import { useEditor } from '../../store/editorStore';

/** Rivers, roads, trails, sea routes and borders. */
export function PathPanel() {
  const { style, width } = useEditor((s) => s.options.path);
  const setOption = useEditor((s) => s.setOption);
  const theme = getTheme(useEditor((s) => s.doc.themeId));
  const def = pathStyleById.get(style) ?? pathStyles[0];

  return (
    <div className="panel-body" data-testid="path-panel">
      <section className="panel-section">
        <h3 className="panel-title">Style</h3>
        {pathStyles.map((p) => (
          <button key={p.id} type="button" className={`path-item${p.id === style ? ' active' : ''}`} aria-pressed={p.id === style} data-testid={`path-${p.id}`} onClick={() => setOption('path', { style: p.id, width: 0 })}>
            <PathPreview style={p} theme={theme} />
            <span>
              <span className="title d-block">{p.name}</span>
              <span className="blurb d-block">{p.blurb}</span>
            </span>
          </button>
        ))}
      </section>
      {def && (
        <Slider
          label="Width"
          value={width || def.width}
          min={def.minWidth}
          max={def.maxWidth}
          step={1}
          format={(v) => `${v} px`}
          hint="Drag on the map to draw. Select a line later to reshape or restyle it."
          onChange={(v) => setOption('path', { width: v === def.width ? 0 : v })}
        />
      )}
    </div>
  );
}
