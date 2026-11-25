import type { MapSummary } from '../../api/maps';

interface MapCardProps {
  map: MapSummary;
  onDownload(): void;
  onDelete(): void;
}

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

/** One saved map in the library: click the picture or the name to open it. */
export function MapCard({ map, onDownload, onDelete }: MapCardProps) {
  const href = `#/editor/${encodeURIComponent(map.id)}`;
  return (
    <article className="map-card" data-testid={`map-${map.id}`}>
      <a className="map-card-thumb" href={href} aria-label={`Open ${map.name}`}>
        {map.thumbnail ? <img src={map.thumbnail} alt="" /> : <i className="bi bi-map" />}
      </a>
      <div className="map-card-body">
        <a className="map-card-name" href={href} title={map.name}>
          {map.name}
        </a>
        <div className="map-card-meta">
          {map.width} × {map.height} px · {formatDate(map.updatedAt)}
        </div>
      </div>
      <div className="map-card-actions">
        <a className="icon-btn" href={href} title="Open">
          <i className="bi bi-pencil" />
        </a>
        <button type="button" className="icon-btn" title="Download project file" onClick={onDownload}>
          <i className="bi bi-file-earmark-arrow-down" />
        </button>
        <button type="button" className="icon-btn danger" title="Delete" onClick={onDelete} data-testid="delete-map">
          <i className="bi bi-trash3" />
        </button>
      </div>
    </article>
  );
}
