import { getTheme, terrains } from '@wondermap/illustrations';
import type { ResolvedTerrain } from '@wondermap/illustrations';
import { PaletteTile } from '../../components/PaletteTile';
import { Segmented } from '../../components/Segmented';
import { Slider } from '../../components/Slider';
import { TerrainSwatch } from '../../components/TerrainSwatch';
import { floodTerrain } from '../../model/ops';
import type { BrushMode } from '../../model/terrainLayer';
import { useEditor } from '../../store/editorStore';

const GROUPS: ReadonlyArray<{ id: ResolvedTerrain['group']; title: string }> = [
  { id: 'land', title: 'Lands' },
  { id: 'dry', title: 'Dry lands' },
  { id: 'cold', title: 'Cold lands' },
  { id: 'wet', title: 'Wetlands' },
];

const MODES: ReadonlyArray<{ value: BrushMode; label: string; icon: string; title: string }> = [
  { value: 'paint', label: 'Paint', icon: 'brush-fill', title: 'Paint land with the selected terrain' },
  { value: 'recolor', label: 'Recolor', icon: 'palette', title: 'Change the terrain of existing land only; coasts stay as they are' },
  { value: 'erase', label: 'Sea', icon: 'water', title: 'Turn land back into open sea' },
];

/** Land and sea painting: brush mode, brush size, the terrain palette and whole-map fills. */
export function TerrainPanel() {
  const { id, mode, size } = useEditor((s) => s.options.terrain);
  const setOption = useEditor((s) => s.setOption);
  const theme = getTheme(useEditor((s) => s.doc.themeId));
  const selected = terrains.find((t) => t.id === id) ?? terrains[0];

  const pick = (terrainId: string) => setOption('terrain', { id: terrainId, mode: mode === 'erase' ? 'paint' : mode });

  const flood = (terrainId: string | null, onlyLand = false) => {
    const s = useEditor.getState();
    s.commit(floodTerrain(s.doc, terrainId, onlyLand));
  };

  return (
    <div className="panel-body split" data-testid="terrain-panel">
      <div className="panel-section">
        <Segmented label="Brush mode" value={mode} options={MODES} onChange={(m) => setOption('terrain', { mode: m })} />
      </div>
      <Slider label="Brush size" value={size} min={8} max={400} step={2} format={(v) => `${v} px`} onChange={(v) => setOption('terrain', { size: v })} />

      <div className="panel-scroll">
        {GROUPS.map((group) => {
          const items = terrains.filter((t) => t.group === group.id);
          if (!items.length) return null;
          return (
            <section key={group.id} className="panel-section">
              <h3 className="panel-title">{group.title}</h3>
              <div className="palette-grid">
                {items.map((t) => (
                  <PaletteTile key={t.id} name={t.name} title={t.blurb} active={mode !== 'erase' && t.id === id} testId={`terrain-${t.id}`} onClick={() => pick(t.id)}>
                    <TerrainSwatch def={t} theme={theme} width={76} height={68} />
                  </PaletteTile>
                ))}
              </div>
            </section>
          );
        })}

        {selected && (
          <section className="panel-section">
            <h3 className="panel-title">Whole map</h3>
            <div className="d-grid gap-2">
              <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => flood(selected.id)}>
                Cover everything with {selected.name}
              </button>
              <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => flood(selected.id, true)}>
                Recolor all land as {selected.name}
              </button>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => flood(null)}>
                Clear to open sea
              </button>
            </div>
            <div className="wm-hint">Every button can be undone.</div>
          </section>
        )}
      </div>
    </div>
  );
}
