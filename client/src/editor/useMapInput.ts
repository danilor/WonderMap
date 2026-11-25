import { useEffect } from 'react';
import type { RefObject } from 'react';
import { clampCamera, clampZoom, screenToMap, zoomAt } from '../engine/camera';
import type { Camera } from '../engine/camera';
import { useEditor } from '../store/editorStore';
import type { ToolId } from '../store/editorStore';
import type { PointerInfo, Tool } from '../tools';
import { isKeyCaptured } from './keys';
import type { ViewState } from './viewState';

type Mode = 'none' | 'tool' | 'pan' | 'pinch';

/** Turns mouse, pen and touch input on the map into tool calls, panning and zooming. */
export function useMapInput(containerRef: RefObject<HTMLDivElement | null>, tools: Record<ToolId, Tool>, view: ViewState): void {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const pointers = new Map<number, { x: number; y: number }>();
    let mode: Mode = 'none';
    let activeTool: ToolId = 'select';
    let panFrom: { x: number; y: number; cam: Camera } | null = null;
    let pinchFrom: { dist: number; mid: { x: number; y: number }; cam: Camera } | null = null;
    let cursorFrame = 0;

    const store = () => useEditor.getState();

    const info = (e: MouseEvent): PointerInfo => {
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const { camera, viewport } = store();
      const [x, y] = screenToMap(camera, viewport.width, viewport.height, sx, sy);
      return { x, y, sx, sy, shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey, alt: e.altKey, px: 1 / camera.zoom };
    };

    const refreshCursor = () => {
      const s = store();
      el.style.cursor = view.panning ? 'grabbing' : view.spaceDown ? 'grab' : tools[s.tool].cursor();
    };

    const publishCursor = () => {
      if (cursorFrame) return;
      cursorFrame = requestAnimationFrame(() => {
        cursorFrame = 0;
        store().setCursor(view.hover);
      });
    };

    const moveCamera = (next: Camera) => {
      const { viewport, doc } = store();
      store().setCamera(clampCamera(next, viewport.width, viewport.height, doc.width, doc.height));
    };

    const pointerCenter = () => {
      const [a, b] = [...pointers.values()];
      const rect = el.getBoundingClientRect();
      return { dist: Math.hypot(a!.x - b!.x, a!.y - b!.y), mid: { x: (a!.x + b!.x) / 2 - rect.left, y: (a!.y + b!.y) / 2 - rect.top } };
    };

    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('[data-map-chrome]')) return;
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 2) {
        if (mode === 'tool') tools[activeTool].cancel?.();
        mode = 'pinch';
        pinchFrom = { ...pointerCenter(), cam: store().camera };
        return;
      }
      if (pointers.size > 2) return;

      const s = store();
      const wantsPan = e.button === 1 || e.button === 2 || (e.button === 0 && (view.spaceDown || s.tool === 'pan'));
      if (wantsPan) {
        e.preventDefault();
        mode = 'pan';
        view.panning = true;
        panFrom = { x: e.clientX, y: e.clientY, cam: s.camera };
        refreshCursor();
        return;
      }
      if (e.button !== 0) return;
      mode = 'tool';
      activeTool = s.tool;
      tools[activeTool].down?.(info(e));
      refreshCursor();
    };

    const onMove = (e: PointerEvent) => {
      const known = pointers.get(e.pointerId);
      if (known) {
        known.x = e.clientX;
        known.y = e.clientY;
      }
      const s = store();

      if (mode === 'pinch' && pinchFrom && pointers.size >= 2) {
        const now = pointerCenter();
        const { width, height } = s.viewport;
        const origin = screenToMap(pinchFrom.cam, width, height, pinchFrom.mid.x, pinchFrom.mid.y);
        const zoom = clampZoom(pinchFrom.cam.zoom * (now.dist / pinchFrom.dist));
        moveCamera({ zoom, x: origin[0] - (now.mid.x - width / 2) / zoom, y: origin[1] - (now.mid.y - height / 2) / zoom });
        return;
      }
      if (mode === 'pan' && panFrom) {
        moveCamera({ ...panFrom.cam, x: panFrom.cam.x - (e.clientX - panFrom.x) / panFrom.cam.zoom, y: panFrom.cam.y - (e.clientY - panFrom.y) / panFrom.cam.zoom });
        return;
      }

      const samples = mode === 'tool' && e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      const tool = tools[mode === 'tool' ? activeTool : s.tool];
      for (const sample of samples.length ? samples : [e]) tool.move?.(info(sample), mode === 'tool');
      const here = info(e);
      view.hover = [here.x, here.y];
      view.overlayDirty = true;
      publishCursor();
      refreshCursor();
    };

    const finish = (e: PointerEvent, cancelled: boolean) => {
      pointers.delete(e.pointerId);
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      if (mode === 'pinch') {
        if (pointers.size < 2) mode = 'none';
        pinchFrom = null;
        return;
      }
      if (mode === 'pan') view.panning = false;
      else if (mode === 'tool') {
        if (cancelled) tools[activeTool].cancel?.();
        else tools[activeTool].up?.(info(e));
      }
      mode = 'none';
      panFrom = null;
      refreshCursor();
    };

    const onUp = (e: PointerEvent) => finish(e, false);
    const onCancel = (e: PointerEvent) => finish(e, true);

    const onLeave = () => {
      if (mode !== 'none') return;
      view.hover = null;
      view.overlayDirty = true;
      store().setCursor(null);
    };

    const onDouble = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-map-chrome]')) return;
      const s = store();
      if (s.tool === 'select') tools.select.doubleClick?.(info(e));
    };

    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('[data-map-chrome]')) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const { camera, viewport } = store();
      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 33;
      else if (e.deltaMode === 2) delta *= 400;
      const factor = Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0016));
      store().setCamera(zoomAt(camera, viewport.width, viewport.height, e.clientX - rect.left, e.clientY - rect.top, factor));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isKeyCaptured(e.target)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!view.spaceDown) {
          view.spaceDown = true;
          refreshCursor();
        }
        return;
      }
      if (!e.defaultPrevented && tools[store().tool].key?.(e)) e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      view.spaceDown = false;
      refreshCursor();
    };

    const unsubscribe = useEditor.subscribe((s, prev) => {
      if (s.tool !== prev.tool) {
        if (mode === 'tool') tools[activeTool].cancel?.();
        mode = 'none';
        refreshCursor();
      }
    });

    const noMenu = (e: Event) => e.preventDefault();

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('dblclick', onDouble);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('contextmenu', noMenu);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    refreshCursor();

    return () => {
      if (cursorFrame) cancelAnimationFrame(cursorFrame);
      unsubscribe();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('dblclick', onDouble);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('contextmenu', noMenu);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [containerRef, tools, view]);
}
