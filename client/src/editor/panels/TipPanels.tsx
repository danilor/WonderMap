import type { ReactNode } from 'react';

type Tip = readonly [keys: string, text: ReactNode];

function Tips({ title, tips }: { title: string; tips: readonly Tip[] }) {
  return (
    <section className="panel-section">
      <h3 className="panel-title">{title}</h3>
      <ul className="tip-list">
        {tips.map(([keys, text]) => (
          <li key={keys}>
            <kbd>{keys}</kbd>
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const SELECT_TIPS: readonly Tip[] = [
  ['Click', 'Select a stamp, name or path.'],
  ['Shift + click', 'Add to or remove from the selection.'],
  ['Drag', 'Move the selection, or draw a box around several things.'],
  ['Alt + drag', 'Move a copy and leave the original.'],
  ['Double-click', 'Rename a name, or add or remove a point on a path.'],
  ['Arrows', 'Nudge by one pixel. Hold Shift for ten.'],
  ['Ctrl + D', 'Duplicate. Ctrl + A selects everything.'],
  ['PgUp / PgDn', 'Bring to front or send to back.'],
  ['Delete', 'Remove the selection.'],
];

const NAVIGATION_TIPS: readonly Tip[] = [
  ['Wheel', 'Zoom in and out at the pointer.'],
  ['Space + drag', 'Pan with any tool. Right or middle mouse works too.'],
  ['F', 'Fit the whole map in the window.'],
  ['+ / −', 'Zoom in and out.'],
];

export function SelectPanel() {
  return (
    <div className="panel-body" data-testid="select-panel">
      <Tips title="Working with things" tips={SELECT_TIPS} />
      <Tips title="Moving around" tips={NAVIGATION_TIPS} />
    </div>
  );
}

export function PanPanel() {
  return (
    <div className="panel-body" data-testid="pan-panel">
      <Tips title="Moving around" tips={NAVIGATION_TIPS} />
    </div>
  );
}
