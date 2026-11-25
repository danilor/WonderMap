import { useMemo, useState } from 'react';
import { brushById, brushes, brushesInCategory, categories, categoryById, getTheme, symbolById, symbols, symbolsInCategory } from '@wondermap/illustrations';
import { BrushPreview } from '../../components/BrushPreview';
import { PaletteTile } from '../../components/PaletteTile';
import { Slider } from '../../components/Slider';
import { SymbolThumb } from '../../components/SymbolThumb';
import type { ToolOptions } from '../../store/editorStore';
import { useEditor } from '../../store/editorStore';

const RESULT_CAP = 60;

type Randomness = Pick<ToolOptions['symbol'], 'randomScale' | 'randomFlip' | 'randomVariant'>;

const RANDOM_CHIPS: ReadonlyArray<{ key: keyof Randomness; label: string; title: string }> = [
  { key: 'randomScale', label: 'Random size', title: 'Every stamp gets a slightly different size' },
  { key: 'randomFlip', label: 'Random flip', title: 'Mirror stamps at random' },
  { key: 'randomVariant', label: 'Random look', title: 'Pick a different variation of the art each time' },
];

/** The stamp library: category tabs, search, single symbols and scatter brushes, plus how they are placed. */
export function SymbolPanel() {
  const options = useEditor((s) => s.options.symbol);
  const setOption = useEditor((s) => s.setOption);
  const theme = getTheme(useEditor((s) => s.doc.themeId));
  const [category, setCategory] = useState(() => symbolById.get(options.id)?.category ?? categories[0]?.id ?? '');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const shown = useMemo(() => {
    if (q) {
      const words = q.split(/\s+/);
      const hit = (text: string) => words.every((w) => text.includes(w));
      const catName = (id: string) => categoryById.get(id)?.name ?? '';
      const foundBrushes = brushes.filter((b) => hit(`${b.name} ${b.id} ${catName(b.category)}`.toLowerCase()));
      const foundSymbols = symbols.filter((s) => hit(`${s.name} ${s.id} ${s.tags.join(' ')} ${catName(s.category)}`.toLowerCase()));
      return { brushes: foundBrushes.slice(0, RESULT_CAP), symbols: foundSymbols.slice(0, RESULT_CAP), total: foundBrushes.length + foundSymbols.length };
    }
    const inBrushes = brushesInCategory(category);
    const inSymbols = symbolsInCategory(category);
    return { brushes: inBrushes, symbols: inSymbols, total: inBrushes.length + inSymbols.length };
  }, [q, category]);

  const brush = options.brush ? brushById.get(options.brush) : undefined;
  const def = symbolById.get(options.id);
  const activeCategory = categoryById.get(category);

  return (
    <div className="panel-body split" data-testid="symbol-panel">
      <div className="selected-card" data-testid="symbol-selected">
        <div className="thumb">
          {brush ? <BrushPreview brush={brush} theme={theme} width={64} height={64} /> : def ? <SymbolThumb def={def} theme={theme} width={64} height={64} /> : null}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="name">{brush ? brush.name : (def?.name ?? 'Nothing selected')}</div>
          <div className="sub">{brush ? 'Scatter brush: drag to paint many' : `${categoryById.get(def?.category ?? '')?.name ?? ''}: click to place`}</div>
        </div>
      </div>

      <Slider label="Size" value={options.scale} min={0.25} max={3} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setOption('symbol', { scale: v })} />
      {brush && <Slider label="Brush radius" value={options.radius} min={20} max={400} step={5} format={(v) => `${v} px`} onChange={(v) => setOption('symbol', { radius: v })} />}

      <div className="toggle-chips mb-2">
        {RANDOM_CHIPS.map((chip) => (
          <button key={chip.key} type="button" className={`chip${options[chip.key] ? ' active' : ''}`} title={chip.title} aria-pressed={options[chip.key]} onClick={() => setOption('symbol', { [chip.key]: !options[chip.key] })}>
            {chip.label}
          </button>
        ))}
      </div>

      <input
        type="search"
        className="form-control form-control-sm mb-2"
        placeholder="Search all stamps…"
        aria-label="Search stamps"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="category-tabs" role="tablist" aria-label="Categories">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={!q && c.id === category}
            className={`category-tab${!q && c.id === category ? ' active' : ''}`}
            title={c.name}
            aria-label={c.name}
            data-testid={`category-${c.id}`}
            onClick={() => {
              setCategory(c.id);
              setQuery('');
            }}
          >
            <i className={`bi bi-${c.icon}`} />
          </button>
        ))}
      </div>

      <div className="panel-scroll">
        <h3 className="panel-title">{q ? `Results for “${query.trim()}”` : (activeCategory?.name ?? 'Stamps')}</h3>
        {!q && activeCategory?.blurb && <div className="wm-hint mb-2">{activeCategory.blurb}</div>}
        {shown.total === 0 ? (
          <div className="empty-note">{q ? 'Nothing matches that search.' : 'There is no art in this category yet.'}</div>
        ) : (
          <div className="palette-grid">
            {shown.brushes.map((b) => (
              <PaletteTile key={b.id} name={b.name} title={b.blurb || b.name} badge="Brush" active={options.brush === b.id} testId={`brush-${b.id}`} onClick={() => setOption('symbol', { brush: b.id })}>
                <BrushPreview brush={b} theme={theme} width={76} height={68} />
              </PaletteTile>
            ))}
            {shown.symbols.map((s) => (
              <PaletteTile key={s.id} name={s.name} active={options.brush === null && options.id === s.id} testId={`symbol-${s.id}`} onClick={() => setOption('symbol', { id: s.id, brush: null })}>
                <SymbolThumb def={s} theme={theme} width={76} height={68} />
              </PaletteTile>
            ))}
          </div>
        )}
        {q && shown.total > RESULT_CAP * 2 && <div className="wm-hint mt-2">Showing the first {RESULT_CAP} of each kind. Narrow the search to see more.</div>}
      </div>
    </div>
  );
}
