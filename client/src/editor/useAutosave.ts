import { useEffect, useRef, useState } from 'react';
import { saveMap } from '../api/maps';
import { renderThumbnail } from '../engine/exportMap';
import type { MapDocument } from '../model/types';
import { isDirty, useEditor } from '../store/editorStore';

export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error';

/** Quiet time after the last edit before the map is sent to the server. */
const DEBOUNCE_MS = 1200;
/** A long burst of edits is saved at least this often. */
const MAX_WAIT_MS = 8000;
const RETRY_MS = 5000;
/** The library picture is re-rendered at most this often while you keep working. */
const THUMBNAIL_EVERY_MS = 45_000;

export interface Autosave {
  status: SaveStatus;
  /** Why the last save failed. */
  error: string | null;
  /** Saves now; with `thumbnail` the library picture is refreshed too. Resolves when everything is on the server. */
  flush(thumbnail?: boolean): Promise<void>;
}

/**
 * Keeps the server copy of the open map up to date.
 * Edits are batched; a failed save is retried until it works, and the map stays safe in memory meanwhile.
 */
export function useAutosave(): Autosave {
  const [state, setState] = useState<{ status: SaveStatus; error: string | null }>({ status: 'saved', error: null });
  const flushRef = useRef<Autosave['flush']>(() => Promise.resolve());

  useEffect(() => {
    const docId = useEditor.getState().doc.id;
    let timer = 0;
    let retryTimer = 0;
    let dirtySince = 0;
    let running: Promise<void> | null = null;
    let failed = false;
    let wantThumbnail = false;
    let lastThumbnailAt = 0;
    let thumbnailRev = useEditor.getState().docRev;

    const show = (status: SaveStatus, error: string | null = null) =>
      setState((prev) => (prev.status === status && prev.error === error ? prev : { status, error }));

    async function run(): Promise<void> {
      window.clearTimeout(timer);
      window.clearTimeout(retryTimer);
      dirtySince = 0;
      try {
        for (;;) {
          const s = useEditor.getState();
          if (s.doc.id !== docId) return;
          const { doc, docRev: rev } = s;
          const unsaved = rev !== s.savedRev;
          const thumbnailDue = rev !== thumbnailRev && (wantThumbnail || (unsaved && Date.now() - lastThumbnailAt > THUMBNAIL_EVERY_MS));
          if (!unsaved && !thumbnailDue) break;

          show('saving');
          let thumbnail: string | undefined;
          if (thumbnailDue) {
            try {
              thumbnail = await renderThumbnail(doc);
            } catch {
              // No picture this time; the library keeps the old one.
            }
            lastThumbnailAt = Date.now();
            thumbnailRev = rev;
            wantThumbnail = false;
          }
          await saveMap(doc, thumbnail);
          const now = useEditor.getState();
          if (now.doc.id === docId) now.markSaved(rev);
        }
        failed = false;
        show('saved');
      } catch (e) {
        failed = true;
        show('error', e instanceof Error ? e.message : 'The map could not be saved.');
        retryTimer = window.setTimeout(() => void flush(), RETRY_MS);
      }
    }

    function flush(thumbnail = false): Promise<void> {
      if (thumbnail) wantThumbnail = true;
      running ??= run().finally(() => {
        running = null;
      });
      return running;
    }
    flushRef.current = flush;

    const unsubscribe = useEditor.subscribe((s, prev) => {
      if (s.docRev === prev.docRev || s.doc.id !== docId) return;
      if (!running && !failed) show('dirty');
      const now = Date.now();
      if (!dirtySince) dirtySince = now;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void flush(), Math.max(0, Math.min(DEBOUNCE_MS, dirtySince + MAX_WAIT_MS - now)));
    });

    const onHidden = () => {
      if (document.visibilityState === 'hidden' && isDirty(useEditor.getState())) void flush();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty(useEditor.getState())) return;
      e.preventDefault();
      e.returnValue = '';
    };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.clearTimeout(timer);
      window.clearTimeout(retryTimer);
      // Leaving the page by any other way than the library link: send what is left, nobody waits for it.
      const s = useEditor.getState();
      if (s.doc.id === docId && (s.docRev !== s.savedRev || s.docRev !== thumbnailRev)) void saveOnLeave(s.doc, s.docRev !== thumbnailRev);
    };
  }, []);

  return { status: state.status, error: state.error, flush: (thumbnail) => flushRef.current(thumbnail) };
}

async function saveOnLeave(doc: MapDocument, withThumbnail: boolean): Promise<void> {
  try {
    const thumbnail = withThumbnail ? await renderThumbnail(doc).catch(() => undefined) : undefined;
    await saveMap(doc, thumbnail);
  } catch {
    // Nothing more can be done once the editor is gone.
  }
}
