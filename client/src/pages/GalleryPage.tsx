import { useEffect, useMemo, useRef } from 'react';
import { categories, frames, getFrame, getTheme, labelStyles, symbols, terrains, themes } from '@wondermap/illustrations';
import type { MapTheme } from '@wondermap/illustrations';
import { createRng } from '@wondermap/illustrations/kit';
import { SymbolPreview } from '../components/SymbolPreview';
import { getTerrainTile } from '../engine/terrain/tiles';
import { BACKDROPS, drawBackdrop, type Backdrop } from '../utils/backdrop';
import { setParams, type Route } from '../utils/router';
import { fontCss } from '@wondermap/illustrations';

/**
 * Art gallery (`#/gallery`): every generated illustration on one page, for art authors.
 * Query: tab=symbols|terrain|frames|labels, category, q, theme, zoom, bg, debug=1, variants=N
 */
export function GalleryPage({ route }: { route: Route }) {
  const tab = route.params.get('tab') ?? 'symbols';
  const theme = getTheme(route.params.get('theme') ?? undefined);
  const zoom = Number(route.params.get('zoom') ?? 2) || 2;
  const backdrop = (route.params.get('bg') ?? 'grass') as Backdrop;
  const category = route.params.get('category') ?? 'all';
  const query = (route.params.get('q') ?? '').trim().toLowerCase();
  const debug = route.params.get('debug') === '1';
  const variantCount = Number(route.params.get('variants') ?? 6) || 6;

  const set = (patch: Record<string, string | null>) => setParams(route, patch);

  const visible = useMemo(
    () =>
      symbols.filter(
        (s) =>
          (category === 'all' || s.category === category) &&
          (!query || s.id.toLowerCase().includes(query) || s.name.toLowerCase().includes(query) || s.tags.some((t) => t.toLowerCase().includes(query))),
      ),
    [category, query],
  );

  return (
    <div className="d-flex flex-column h-100">
      <header className="border-bottom px-3 py-2 d-flex flex-wrap align-items-center gap-2" style={{ background: 'var(--wm-bg-2)' }}>
        <a href="#/" className="text-decoration-none">
          <span className="wm-display fs-5" style={{ color: 'var(--wm-gold)' }}>
            WonderMap
          </span>
        </a>
        <span className="text-secondary small">Art gallery</span>
        <ul className="nav nav-pills ms-3">
          {(['symbols', 'terrain', 'frames', 'labels'] as const).map((t) => (
            <li className="nav-item" key={t}>
              <button className={`nav-link py-1 ${tab === t ? 'active' : ''}`} onClick={() => set({ tab: t })}>
                {t[0]!.toUpperCase() + t.slice(1)}
              </button>
            </li>
          ))}
        </ul>
        <div className="ms-auto d-flex flex-wrap gap-2 align-items-center">
          <select className="form-select form-select-sm w-auto" value={theme.id} onChange={(e) => set({ theme: e.target.value })} aria-label="Theme">
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                Theme: {t.name}
              </option>
            ))}
          </select>
          <select className="form-select form-select-sm w-auto" value={String(zoom)} onChange={(e) => set({ zoom: e.target.value })} aria-label="Zoom">
            {[1, 1.5, 2, 3, 4].map((z) => (
              <option key={z} value={z}>
                Zoom {z}x
              </option>
            ))}
          </select>
          <select className="form-select form-select-sm w-auto" value={backdrop} onChange={(e) => set({ bg: e.target.value })} aria-label="Background">
            {BACKDROPS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
          <div className="form-check form-switch mb-0">
            <input className="form-check-input" type="checkbox" id="dbg" checked={debug} onChange={(e) => set({ debug: e.target.checked ? '1' : null })} />
            <label className="form-check-label small" htmlFor="dbg">
              Boxes
            </label>
          </div>
        </div>
      </header>

      <main className="flex-grow-1 wm-scroll p-3" data-ready={tab}>
        {tab === 'symbols' && (
          <>
            <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
              <button className={`btn btn-sm ${category === 'all' ? 'btn-primary' : 'btn-outline-light'}`} onClick={() => set({ category: null })}>
                All ({symbols.length})
              </button>
              {categories.map((c) => (
                <button key={c.id} className={`btn btn-sm ${category === c.id ? 'btn-primary' : 'btn-outline-light'}`} onClick={() => set({ category: c.id })}>
                  <i className={`bi bi-${c.icon} me-1`} />
                  {c.name} ({symbols.filter((s) => s.category === c.id).length})
                </button>
              ))}
              <input className="form-control form-control-sm w-auto ms-auto" placeholder="Search…" value={route.params.get('q') ?? ''} onChange={(e) => set({ q: e.target.value })} />
            </div>
            {visible.length === 0 && <p className="text-secondary">No symbols match.</p>}
            <div className="d-flex flex-column gap-3">
              {visible.map((def) => (
                <section key={def.id} className="border rounded p-2" style={{ background: 'var(--wm-panel)' }} data-symbol={def.id}>
                  <div className="d-flex align-items-baseline gap-2 mb-2">
                    <strong>{def.name}</strong>
                    <code className="small text-secondary">{def.id}</code>
                    <span className="small text-secondary ms-auto">
                      {def.size[0]}×{def.size[1]} · {def.variants} variants · {def.layer}
                    </span>
                  </div>
                  <div className="d-flex flex-wrap gap-2 align-items-end">
                    {Array.from({ length: Math.min(def.variants, variantCount) }, (_, v) => (
                      <SymbolPreview key={v} def={def} theme={theme} variant={v} zoom={zoom} backdrop={backdrop} debug={debug} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}

        {tab === 'terrain' && <TerrainTab theme={theme} zoom={zoom} />}
        {tab === 'frames' && <FramesTab />}
        {tab === 'labels' && <LabelsTab theme={theme} />}
      </main>
    </div>
  );
}

function TerrainTab({ theme, zoom }: { theme: MapTheme; zoom: number }) {
  return (
    <div className="d-flex flex-wrap gap-3">
      {terrains.map((t) => (
        <figure key={t.id} className="m-0" data-terrain={t.id}>
          <TileCanvas terrainId={t.id} theme={theme} zoom={zoom} />
          <figcaption className="small mt-1">
            <strong>{t.name}</strong> <code className="text-secondary">{t.id}</code>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function TileCanvas({ terrainId, theme, zoom }: { terrainId: string; theme: MapTheme; zoom: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const def = terrains.find((t) => t.id === terrainId);
    if (!canvas || !def) return;
    const dpr = window.devicePixelRatio || 1;
    const size = 260;
    canvas.width = Math.ceil(size * dpr);
    canvas.height = Math.ceil(size * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Show the seamless tile repeated so seams are easy to spot.
    getTerrainTile(def, theme, 2);
    drawBackdrop(ctx, terrainId as Backdrop, theme, canvas.width, canvas.height, dpr * Math.max(0.5, zoom / 2));
  }, [terrainId, theme, zoom]);
  return <canvas ref={ref} style={{ width: 260, height: 260, display: 'block', border: '1px solid var(--wm-border)' }} />;
}

function FramesTab() {
  return (
    <div className="d-flex flex-wrap gap-4">
      {themes.map((theme) =>
        frames.map((frame) => (
          <figure key={`${theme.id}-${frame.id}`} className="m-0">
            <FrameCanvas themeId={theme.id} frameId={frame.id} />
            <figcaption className="small mt-1">
              {theme.name} · {frame.name}
            </figcaption>
          </figure>
        )),
      )}
    </div>
  );
}

function FrameCanvas({ themeId, frameId }: { themeId: string; frameId: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const theme = getTheme(themeId);
    const frame = getFrame(frameId);
    const w = 480;
    const h = 300;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = theme.sea.mid;
    ctx.fillRect(0, 0, w, h);
    frame.draw({ ctx, width: w, height: h, theme, rand: createRng(7) });
  }, [themeId, frameId]);
  return <canvas ref={ref} style={{ width: 480, height: 300, display: 'block', border: '1px solid var(--wm-border)' }} />;
}

function LabelsTab({ theme }: { theme: MapTheme }) {
  return (
    <div className="d-flex flex-column gap-2" style={{ background: theme.paper.color, color: theme.label.color, padding: 24, borderRadius: 6 }}>
      {labelStyles.map((s) => (
        <div key={s.id} className="d-flex align-items-baseline gap-3">
          <code style={{ width: 110, color: '#555' }}>{s.id}</code>
          <span
            style={{
              font: fontCss(s.font, Math.min(s.size, 64), s.weight, s.italic),
              letterSpacing: `${s.spacing}em`,
              textTransform: s.uppercase ? 'uppercase' : 'none',
              color: s.color ?? theme.label.color,
            }}
          >
            {s.name}
          </span>
        </div>
      ))}
    </div>
  );
}
