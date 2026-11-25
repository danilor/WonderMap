import type { ReactNode } from 'react';
import { LazyMount } from './LazyMount';

interface Props {
  name: string;
  title?: string;
  active: boolean;
  onClick(): void;
  /** Small tag in the corner of the thumbnail, e.g. "Brush". */
  badge?: string;
  testId?: string;
  /** The thumbnail art. It is only mounted once the tile scrolls into view. */
  children: ReactNode;
}

/** One button of a palette: a lazily drawn thumbnail above a name. */
export function PaletteTile({ name, title, active, onClick, badge, testId, children }: Props) {
  return (
    <button type="button" className={`palette-item${active ? ' active' : ''}`} title={title || name} aria-pressed={active} data-testid={testId} onClick={onClick}>
      <span className="thumb">
        <LazyMount className="lazy-fill">{children}</LazyMount>
        {badge && <span className="badge-brush">{badge}</span>}
      </span>
      <span className="name">{name}</span>
    </button>
  );
}
