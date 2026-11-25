import { useMemo, useState } from 'react';
import { fontList, getTheme, labelStyleById, labelStyles, pathStyleById, pathStyles, symbolById } from '@wondermap/illustrations';
import { Slider } from '../../components/Slider';
import { duplicateItems, refsOf, removeItems, reorderItems, updateLabels, updatePaths, updateSymbols } from '../../model/ops';
import type { MapLabel, MapPath, MapSymbol } from '../../model/types';
import { useEditor } from '../../store/editorStore';
import { burstEdit, flushBurst } from '../burst';

const DEG = 180 / Math.PI;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Floating card with the properties of whatever is selected. Only shown while something is selected. */
export function Inspector() {
  const selection = useEditor((s) => s.selection);
  const tool = useEditor((s) => s.tool);
  const doc = useEditor((s) => s.doc);

  const picked = useMemo(() => {
    const ids = new Set(selection.map((r) => r.id));
    return {
      ids: [...ids],
      symbols: doc.symbols.filter((s) => ids.has(s.id)),
      labels: doc.labels.filter((l) => ids.has(l.id)),
      paths: doc.paths.filter((p) => ids.has(p.id)),
    };
  }, [selection, doc.symbols, doc.labels, doc.paths]);

  if (tool !== 'select' || selection.length === 0 || picked.ids.length === 0) return null;
  const { ids, symbols, labels, paths } = picked;
  const total = symbols.length + labels.length + paths.length;

  const title =
    total > 1
      ? `${total} items selected`
      : symbols[0]
        ? (symbolById.get(symbols[0].asset)?.name ?? 'Symbol')
        : labels[0]
          ? 'Label'
          : `${pathStyleById.get(paths[0]!.style)?.name ?? 'Path'}`;

  const duplicate = () => {
    flushBurst();
    const s = useEditor.getState();
    const result = duplicateItems(s.doc, ids);
    if (result.ids.length) s.commit(result.doc, refsOf(result.doc, result.ids));
  };
  const reorder = (where: 'front' | 'back') => {
    flushBurst();
    const s = useEditor.getState();
    s.commit(reorderItems(s.doc, ids, where));
  };
  const remove = () => {
    flushBurst();
    const s = useEditor.getState();
    s.commit(removeItems(s.doc, ids), []);
  };

  return (
    <aside className="inspector" data-map-chrome data-testid="inspector" aria-label="Selection properties">
      <div className="inspector-head">
        <i className="bi bi-sliders" />
        <h3>{title}</h3>
        <button type="button" className="icon-btn" title="Deselect (Esc)" aria-label="Deselect" onClick={() => useEditor.getState().select([])}>
          <i className="bi bi-x-lg" />
        </button>
      </div>
      <div className="inspector-body">
        {symbols.length > 0 && <SymbolFields symbols={symbols} />}
        {labels.length > 0 && <LabelFields labels={labels} />}
        {paths.length > 0 && <PathFields paths={paths} />}
      </div>
      <div className="inspector-actions">
        <button type="button" className="btn btn-sm btn-outline-light" onClick={duplicate} title="Duplicate (Ctrl+D)">
          <i className="bi bi-copy me-1" />
          Duplicate
        </button>
        <button type="button" className="btn btn-sm btn-outline-light" onClick={() => reorder('front')} title="Bring to front (Page Up)" aria-label="Bring to front">
          <i className="bi bi-arrow-bar-up" />
        </button>
        <button type="button" className="btn btn-sm btn-outline-light" onClick={() => reorder('back')} title="Send to back (Page Down)" aria-label="Send to back">
          <i className="bi bi-arrow-bar-down" />
        </button>
        <button type="button" className="btn btn-sm btn-outline-danger ms-auto" onClick={remove} title="Delete (Del)">
          <i className="bi bi-trash3 me-1" />
          Delete
        </button>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------------------------------- */

function SymbolFields({ symbols }: { symbols: MapSymbol[] }) {
  const first = symbols[0]!;
  const single = symbols.length === 1;
  const ids = symbols.map((s) => s.id);
  const defs = symbols.map((s) => symbolById.get(s.asset));
  const rotatable = defs.every((d) => d?.rotatable);
  const variants = single ? (defs[0]?.variants ?? 1) : 1;
  const edit = (patch: Partial<MapSymbol> | ((s: MapSymbol) => Partial<MapSymbol>)) => burstEdit((doc) => updateSymbols(doc, ids, patch));

  return (
    <>
      {single ? (
        <Slider label="Size" value={Number(first.scale.toFixed(2))} min={0.1} max={5} step={0.05} format={(v) => `× ${v.toFixed(2)}`} onChange={(v) => edit({ scale: v })} />
      ) : (
        <div className="wm-field">
          <div className="wm-field-label mb-1">Size</div>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-sm btn-outline-light flex-fill" onClick={() => edit((s) => ({ scale: clamp(s.scale * 0.9, 0.1, 12) }))}>
              <i className="bi bi-dash-lg me-1" />
              Smaller
            </button>
            <button type="button" className="btn btn-sm btn-outline-light flex-fill" onClick={() => edit((s) => ({ scale: clamp(s.scale * 1.1, 0.1, 12) }))}>
              <i className="bi bi-plus-lg me-1" />
              Larger
            </button>
          </div>
        </div>
      )}
      {rotatable && (
        <Slider
          label="Rotation"
          value={Math.round(first.rotation * DEG)}
          min={-180}
          max={180}
          step={1}
          format={(v) => `${v}°`}
          onChange={(v) => edit({ rotation: v / DEG })}
        />
      )}
      <div className="d-flex gap-2 mb-2">
        <button type="button" className="btn btn-sm btn-outline-light flex-fill" onClick={() => edit((s) => ({ flip: !s.flip }))} title="Mirror left to right">
          <i className="bi bi-symmetry-horizontal me-1" />
          Flip
        </button>
        {single && variants > 1 ? (
          <div className="btn-group flex-fill" role="group" aria-label="Variant">
            <button type="button" className="btn btn-sm btn-outline-light" aria-label="Previous look" onClick={() => edit({ variant: (first.variant + variants - 1) % variants })}>
              <i className="bi bi-chevron-left" />
            </button>
            <span className="btn btn-sm btn-outline-light disabled" style={{ opacity: 1 }}>
              Look {(first.variant % variants) + 1}/{variants}
            </span>
            <button type="button" className="btn btn-sm btn-outline-light" aria-label="Next look" onClick={() => edit({ variant: (first.variant + 1) % variants })}>
              <i className="bi bi-chevron-right" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-sm btn-outline-light flex-fill"
            onClick={() => edit((s) => ({ variant: Math.floor(Math.random() * (symbolById.get(s.asset)?.variants ?? 1)) }))}
            title="Give each item a random look"
          >
            <i className="bi bi-shuffle me-1" />
            Shuffle
          </button>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------------------------------- */

function LabelFields({ labels }: { labels: MapLabel[] }) {
  const first = labels[0]!;
  const single = labels.length === 1;
  const ids = labels.map((l) => l.id);
  const theme = getTheme(useEditor((s) => s.doc.themeId));
  const [draft, setDraft] = useState<string | null>(null);
  const edit = (patch: Partial<MapLabel> | ((l: MapLabel) => Partial<MapLabel>)) => burstEdit((doc) => updateLabels(doc, ids, patch));
  const style = labelStyleById.get(first.style);
  const autoColor = style?.color ?? theme.label.color;
  const fontName = fontList.find((f) => f.id === style?.font)?.name;

  return (
    <>
      {single && (
        <div className="wm-field">
          <label className="wm-field-label" htmlFor="inspector-text">
            Text
          </label>
          <input
            id="inspector-text"
            type="text"
            className="form-control form-control-sm"
            value={draft ?? first.text}
            maxLength={120}
            onChange={(e) => {
              setDraft(e.target.value);
              if (e.target.value.trim()) edit({ text: e.target.value });
            }}
            onBlur={() => setDraft(null)}
          />
        </div>
      )}
      <div className="wm-field">
        <label className="wm-field-label" htmlFor="inspector-label-style">
          Style{fontName ? ` · ${fontName}` : ''}
        </label>
        <select
          id="inspector-label-style"
          className="form-select form-select-sm"
          value={first.style}
          onChange={(e) => {
            const next = labelStyleById.get(e.target.value);
            if (next) edit({ style: next.id, size: next.size });
          }}
        >
          {labelStyles.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <Slider label="Text size" value={Math.round(first.size)} min={6} max={300} step={1} format={(v) => `${v} px`} onChange={(v) => edit({ size: v })} />
      <Slider label="Curve" value={Number(first.curve.toFixed(2))} min={-1} max={1} step={0.05} format={(v) => (v === 0 ? 'straight' : v.toFixed(2))} onChange={(v) => edit({ curve: v })} />
      <Slider label="Rotation" value={Math.round(first.rotation * DEG)} min={-180} max={180} step={1} format={(v) => `${v}°`} onChange={(v) => edit({ rotation: v / DEG })} />
      <Slider label="Letter spacing" value={Number(first.spacing.toFixed(2))} min={-0.1} max={1} step={0.01} format={(v) => v.toFixed(2)} onChange={(v) => edit({ spacing: v })} />
      <div className="wm-field d-flex align-items-center gap-2">
        <label className="wm-field-label" htmlFor="inspector-label-color">
          Color
        </label>
        <input id="inspector-label-color" type="color" className="form-control form-control-color form-control-sm" value={first.color ?? autoColor} onChange={(e) => edit({ color: e.target.value })} />
        <button type="button" className="btn btn-sm btn-outline-light" disabled={first.color === null} onClick={() => edit({ color: null })}>
          Auto
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------------------------------- */

function PathFields({ paths }: { paths: MapPath[] }) {
  const first = paths[0]!;
  const ids = paths.map((p) => p.id);
  const style = pathStyleById.get(first.style);
  const edit = (patch: Partial<MapPath>) => burstEdit((doc) => updatePaths(doc, ids, patch));

  return (
    <>
      <div className="wm-field">
        <label className="wm-field-label" htmlFor="inspector-path-style">
          Kind
        </label>
        <select
          id="inspector-path-style"
          className="form-select form-select-sm"
          value={first.style}
          onChange={(e) => {
            const next = pathStyleById.get(e.target.value);
            if (next) edit({ style: next.id, width: clamp(first.width, next.minWidth, next.maxWidth) });
          }}
        >
          {pathStyles.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <Slider
        label="Width"
        value={Math.round(first.width * 10) / 10}
        min={style?.minWidth ?? 1}
        max={style?.maxWidth ?? 40}
        step={0.5}
        format={(v) => `${v} px`}
        onChange={(v) => edit({ width: v })}
      />
      <div className="wm-hint">Double-click the line to add a point, double-click a point to remove it.</div>
    </>
  );
}
