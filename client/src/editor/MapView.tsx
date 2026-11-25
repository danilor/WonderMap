import { useCallback, useRef, useState } from 'react';
import { useEditor } from '../store/editorStore';
import { createTools } from '../tools';
import { EdgeChips } from './EdgeChips';
import type { Side } from './EdgeChips';
import { LabelEditor } from './LabelEditor';
import { createViewState } from './viewState';
import { useMapInput } from './useMapInput';
import { useRenderLoop } from './useRenderLoop';

/** The canvas area of the editor: the map, the tool overlay, the "+" edge buttons and the label text box. */
export function MapView({ onExpand }: { onExpand(side: Side): void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [tools] = useState(createTools);
  const [view] = useState(createViewState);
  const fitOnFirstMeasure = useCallback(() => useEditor.getState().fit(), []);

  useRenderLoop(containerRef, mapRef, overlayRef, tools, view, fitOnFirstMeasure);
  useMapInput(containerRef, tools, view);

  return (
    <div ref={containerRef} className="map-view" data-testid="map-view">
      <canvas ref={mapRef} className="map-canvas" data-testid="map-canvas" />
      <canvas ref={overlayRef} className="map-overlay" />
      <EdgeChips onExpand={onExpand} />
      <LabelEditor />
    </div>
  );
}
