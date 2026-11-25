import { useEditor } from '../../store/editorStore';
import type { ToolId } from '../../store/editorStore';
import { toolInfo } from '../toolInfo';
import { EraserPanel } from './EraserPanel';
import { LabelPanel } from './LabelPanel';
import { PathPanel } from './PathPanel';
import { SymbolPanel } from './SymbolPanel';
import { PanPanel, SelectPanel } from './TipPanels';
import { TerrainPanel } from './TerrainPanel';

function PanelBody({ tool }: { tool: ToolId }) {
  switch (tool) {
    case 'terrain':
      return <TerrainPanel />;
    case 'symbol':
      return <SymbolPanel />;
    case 'path':
      return <PathPanel />;
    case 'label':
      return <LabelPanel />;
    case 'eraser':
      return <EraserPanel />;
    case 'pan':
      return <PanPanel />;
    case 'select':
      return <SelectPanel />;
  }
}

/** The left-hand panel: shows the options of whichever tool is active. */
export function ToolPanel() {
  const tool = useEditor((s) => s.tool);
  const info = toolInfo(tool);
  return (
    <aside className="side-panel" data-testid="tool-panel" aria-label={`${info.name} options`}>
      <header className="panel-head">
        <h2>{info.name}</h2>
        <p>{info.blurb}</p>
      </header>
      <PanelBody tool={tool} />
    </aside>
  );
}
