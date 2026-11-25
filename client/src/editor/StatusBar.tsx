import { terrainById } from '@wondermap/illustrations';
import { terrainAt } from '../model/terrainLayer';
import { useEditor } from '../store/editorStore';
import { toolInfo } from './toolInfo';

/** Bottom strip: what the tool does, where the pointer is and how big the map is. */
export function StatusBar() {
  const tool = useEditor((s) => s.tool);
  const cursor = useEditor((s) => s.cursor);
  const width = useEditor((s) => s.doc.width);
  const height = useEditor((s) => s.doc.height);
  const zoom = useEditor((s) => s.camera.zoom);
  const things = useEditor((s) => s.doc.symbols.length + s.doc.labels.length + s.doc.paths.length);
  const underId = useEditor((s) => (s.cursor ? terrainAt(s.doc.terrain, s.cursor[0], s.cursor[1]) : undefined));

  const inside = cursor && cursor[0] >= 0 && cursor[1] >= 0 && cursor[0] < width && cursor[1] < height;
  const ground = !cursor ? '' : !inside ? 'Outside the map' : underId ? (terrainById.get(underId)?.name ?? underId) : 'Open sea';

  return (
    <footer className="statusbar" data-testid="statusbar">
      <span className="grow">{toolInfo(tool).hint}</span>
      <span style={{ minWidth: 110 }}>{ground}</span>
      <span style={{ minWidth: 92 }} title="Pointer position in map pixels">
        {cursor ? `${Math.round(cursor[0])}, ${Math.round(cursor[1])}` : '—'}
      </span>
      <span>
        {width} × {height} px
      </span>
      <span>{things} things</span>
      <span>{Math.round(zoom * 100)}%</span>
    </footer>
  );
}
