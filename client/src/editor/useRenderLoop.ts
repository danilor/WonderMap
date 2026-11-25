import { useEffect } from 'react';
import type { RefObject } from 'react';
import { getTheme } from '@wondermap/illustrations';
import { onFontsLoaded } from '../engine/labels';
import { MapRenderer } from '../engine/MapRenderer';
import { useEditor } from '../store/editorStore';
import type { ToolId } from '../store/editorStore';
import { onOverlayInvalidated } from '../tools/overlayBus';
import type { Tool } from '../tools';
import type { ViewState } from './viewState';

/** Milliseconds per frame spent painting terrain chunks that are not ready yet. */
const PUMP_BUDGET_MS = 9;

/**
 * Owns the two canvases of the map view: the map itself and the tool overlay on top of it.
 * Frames are only painted when something changed (document, camera, size, terrain pictures, overlay state).
 */
export function useRenderLoop(
  containerRef: RefObject<HTMLDivElement | null>,
  mapRef: RefObject<HTMLCanvasElement | null>,
  overlayRef: RefObject<HTMLCanvasElement | null>,
  tools: Record<ToolId, Tool>,
  view: ViewState,
  onReady: () => void,
): void {
  useEffect(() => {
    const container = containerRef.current;
    const mapCanvas = mapRef.current;
    const overlayCanvas = overlayRef.current;
    if (!container || !mapCanvas || !overlayCanvas) return;
    const mapCtx = mapCanvas.getContext('2d', { alpha: false })!;
    const overlayCtx = overlayCanvas.getContext('2d')!;
    const renderer = new MapRenderer();

    let dpr = window.devicePixelRatio || 1;
    let width = 0;
    let height = 0;
    let raf = 0;
    let terrainRevision = -1;
    let waiting = false;
    let announced = false;

    const resize = (w: number, h: number) => {
      dpr = window.devicePixelRatio || 1;
      width = Math.max(1, Math.floor(w));
      height = Math.max(1, Math.floor(h));
      for (const canvas of [mapCanvas, overlayCanvas]) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
      useEditor.getState().setViewport(width, height);
      view.dirty = true;
      view.overlayDirty = true;
      if (!announced) {
        announced = true;
        onReady();
      }
    };

    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box && box.width > 0 && box.height > 0) resize(box.width, box.height);
    });
    observer.observe(container);

    const unsubscribeStore = useEditor.subscribe((s, prev) => {
      if (s.doc !== prev.doc || s.docRev !== prev.docRev || s.camera !== prev.camera) view.dirty = true;
      view.overlayDirty = true;
    });
    const unsubscribeOverlay = onOverlayInvalidated(() => {
      view.overlayDirty = true;
    });
    const unsubscribeFonts = onFontsLoaded(() => {
      view.dirty = true;
    });

    const paintOverlay = () => {
      const s = useEditor.getState();
      const { camera, doc } = s;
      overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      const scale = camera.zoom * dpr;
      overlayCtx.setTransform(scale, 0, 0, scale, (width / 2 - camera.x * camera.zoom) * dpr, (height / 2 - camera.y * camera.zoom) * dpr);
      tools[s.tool].overlay?.(overlayCtx, { doc, theme: getTheme(doc.themeId), zoom: camera.zoom, dpr, hover: view.hover });
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (width === 0) return;
      if ((window.devicePixelRatio || 1) !== dpr) {
        resize(container.clientWidth, container.clientHeight);
      }
      const s = useEditor.getState();
      if (view.dirty || waiting || renderer.revision !== terrainRevision) {
        view.dirty = false;
        const pending = renderer.draw(mapCtx, s.doc, s.camera, { width, height, dpr });
        terrainRevision = renderer.revision;
        const more = renderer.pump(PUMP_BUDGET_MS);
        waiting = pending > 0 || more;
        view.overlayDirty = true;
      }
      if (view.overlayDirty) {
        view.overlayDirty = false;
        paintOverlay();
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      unsubscribeStore();
      unsubscribeOverlay();
      unsubscribeFonts();
      renderer.dispose();
    };
  }, [containerRef, mapRef, overlayRef, tools, view, onReady]);
}
