import { mapToScreen, viewRect } from '../engine/camera';
import { useEditor } from '../store/editorStore';

export type Side = 'top' | 'right' | 'bottom' | 'left';

const GAP = 24;
const MARGIN = 20;

const LABELS: Record<Side, string> = {
  top: 'Add canvas above',
  right: 'Add canvas to the right',
  bottom: 'Add canvas below',
  left: 'Add canvas to the left',
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const midOverlap = (a0: number, a1: number, b0: number, b1: number) => {
  const lo = Math.max(a0, b0);
  const hi = Math.min(a1, b1);
  return lo <= hi ? (lo + hi) / 2 : clamp((a0 + a1) / 2, b0, b1);
};

/** The round "+" buttons next to each edge of the map that open the Add Canvas dialog. */
export function EdgeChips({ onExpand }: { onExpand(side: Side): void }) {
  const camera = useEditor((s) => s.camera);
  const viewport = useEditor((s) => s.viewport);
  const mapWidth = useEditor((s) => s.doc.width);
  const mapHeight = useEditor((s) => s.doc.height);

  const { width: vw, height: vh } = viewport;
  const view = viewRect(camera, vw, vh);
  const midX = midOverlap(view.x0, view.x1, 0, mapWidth);
  const midY = midOverlap(view.y0, view.y1, 0, mapHeight);

  const chips: Array<{ side: Side; x: number; y: number }> = [];
  const [, topY] = mapToScreen(camera, vw, vh, 0, 0);
  const [leftX] = mapToScreen(camera, vw, vh, 0, 0);
  const [, bottomY] = mapToScreen(camera, vw, vh, 0, mapHeight);
  const [rightX] = mapToScreen(camera, vw, vh, mapWidth, 0);
  const [centerX] = mapToScreen(camera, vw, vh, midX, 0);
  const [, centerY] = mapToScreen(camera, vw, vh, 0, midY);

  const edgeShown = (v: number, size: number) => v > -MARGIN && v < size + MARGIN;
  if (edgeShown(topY, vh)) chips.push({ side: 'top', x: centerX, y: topY - GAP });
  if (edgeShown(bottomY, vh)) chips.push({ side: 'bottom', x: centerX, y: bottomY + GAP });
  if (edgeShown(leftX, vw)) chips.push({ side: 'left', x: leftX - GAP, y: centerY });
  if (edgeShown(rightX, vw)) chips.push({ side: 'right', x: rightX + GAP, y: centerY });

  return (
    <>
      {chips.map((chip) => (
        <button
          key={chip.side}
          type="button"
          data-map-chrome
          data-side={chip.side}
          className="edge-chip"
          title={LABELS[chip.side]}
          aria-label={LABELS[chip.side]}
          style={{ left: clamp(chip.x, MARGIN, vw - MARGIN), top: clamp(chip.y, MARGIN, vh - MARGIN) }}
          onClick={() => onExpand(chip.side)}
        >
          <i className="bi bi-plus-lg" />
        </button>
      ))}
    </>
  );
}
