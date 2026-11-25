import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteMap, listMaps, loadMap, saveMap } from '../api/maps';
import type { MapSummary } from '../api/maps';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { renderThumbnail } from '../engine/exportMap';
import { documentFromJson, documentToJson, makeId } from '../model/document';
import { downloadText, projectFileName } from '../utils/files';
import { navigate } from '../utils/router';
import { MapCard } from './home/MapCard';
import { NewWorldDialog } from './home/NewWorldDialog';

const message = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

/** `#/`: the library of saved maps. */
export function HomePage() {
  const [maps, setMaps] = useState<MapSummary[] | null>(null);
  const [offline, setOffline] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [doomed, setDoomed] = useState<MapSummary | null>(null);
  const [confirming, setConfirming] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const showMaps = useCallback((list: MapSummary[]) => {
    setMaps([...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    setOffline(null);
  }, []);
  const showFailure = useCallback((e: unknown) => {
    setOffline(message(e, 'The maps could not be loaded.'));
    setMaps((prev) => prev ?? []);
  }, []);
  const refresh = useCallback(() => listMaps().then(showMaps, showFailure), [showMaps, showFailure]);

  useEffect(() => {
    let alive = true;
    listMaps().then(
      (list) => alive && showMaps(list),
      (e: unknown) => alive && showFailure(e),
    );
    return () => {
      alive = false;
    };
  }, [showMaps, showFailure]);

  async function importText(text: string, label: string) {
    setNotice(null);
    try {
      // A copy gets its own id, so importing never overwrites a map that already exists.
      const doc = { ...documentFromJson(text), id: makeId() };
      const thumbnail = await renderThumbnail(doc).catch(() => undefined);
      await saveMap(doc, thumbnail);
      navigate(`/editor/${doc.id}`);
    } catch (e) {
      setNotice(`${label} could not be imported: ${message(e, 'unknown error')}`);
    }
  }

  async function openSample() {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}samples/aldoria.wondermap.json`);
      if (!res.ok) throw new Error(`The server answered ${res.status}.`);
      await importText(await res.text(), 'The sample world');
    } catch (e) {
      setNotice(`The sample world could not be loaded: ${message(e, 'unknown error')}`);
    }
  }

  async function download(map: MapSummary) {
    setNotice(null);
    try {
      const doc = await loadMap(map.id);
      downloadText(documentToJson(doc), projectFileName(doc.name));
    } catch (e) {
      setNotice(message(e, 'The project file could not be downloaded.'));
    }
  }

  async function remove(map: MapSummary) {
    setConfirming(false);
    try {
      await deleteMap(map.id);
    } catch (e) {
      setNotice(message(e, 'The map could not be deleted.'));
    }
    await refresh();
  }

  return (
    <div className="home" data-testid="home">
      <header className="home-hero">
        <div className="home-hero-inner">
          <h1 className="home-title">
            <i className="bi bi-compass me-3" />
            WonderMap
          </h1>
          <p className="home-tagline">Paint the lands, seas and cities of your fantasy world, then export it as a picture for your table.</p>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setCreating(true)} data-testid="new-world">
              <i className="bi bi-plus-lg me-2" />
              New world
            </button>
            <button type="button" className="btn btn-outline-light btn-lg" onClick={() => fileInput.current?.click()} data-testid="import-project">
              <i className="bi bi-upload me-2" />
              Open a project file
            </button>
            <button type="button" className="btn btn-outline-light btn-lg" onClick={() => void openSample()} data-testid="open-sample">
              <i className="bi bi-stars me-2" />
              Sample world
            </button>
            <a className="btn btn-outline-light btn-lg" href="#/gallery">
              <i className="bi bi-images me-2" />
              Art gallery
            </a>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            data-testid="import-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void file.text().then((text) => importText(text, `"${file.name}"`), () => setNotice(`"${file.name}" could not be read.`));
            }}
          />
        </div>
      </header>

      <main className="home-main">
        {offline && (
          <div className="alert alert-warning d-flex align-items-center gap-3" role="alert" data-testid="offline">
            <i className="bi bi-wifi-off fs-4" />
            <span className="flex-grow-1">{offline}</span>
            <button type="button" className="btn btn-sm btn-outline-light" onClick={() => void refresh()}>
              Try again
            </button>
          </div>
        )}
        {notice && (
          <div className="alert alert-danger d-flex align-items-center gap-3" role="alert">
            <span className="flex-grow-1">{notice}</span>
            <button type="button" className="btn-close" aria-label="Dismiss" onClick={() => setNotice(null)} />
          </div>
        )}

        <h2 className="home-heading">Your maps</h2>
        {maps === null ? (
          <div className="text-center py-5">
            <div className="spinner-border text-warning" role="status" />
          </div>
        ) : (
          <>
            <div className="map-grid" data-testid="map-grid">
              <button type="button" className="map-card new-card" onClick={() => setCreating(true)}>
                <i className="bi bi-plus-circle" />
                <span>New world</span>
              </button>
              {maps.map((m) => (
                <MapCard
                  key={m.id}
                  map={m}
                  onDownload={() => void download(m)}
                  onDelete={() => {
                    setDoomed(m);
                    setConfirming(true);
                  }}
                />
              ))}
            </div>
            {maps.length === 0 && !offline && <p className="empty-note">Nothing here yet. Create your first world and start painting, or open the sample world to look around.</p>}
          </>
        )}
      </main>

      <NewWorldDialog show={creating} onHide={() => setCreating(false)} />
      <ConfirmDialog
        show={confirming}
        title="Delete this map?"
        confirmLabel="Delete"
        danger
        onConfirm={() => doomed && void remove(doomed)}
        onCancel={() => setConfirming(false)}
      >
        <strong>{doomed?.name}</strong> will be removed for good. Download its project file first if you may want it back.
      </ConfirmDialog>
    </div>
  );
}
