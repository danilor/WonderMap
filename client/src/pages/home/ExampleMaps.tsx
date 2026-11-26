import { exampleMaps } from './examples';
import type { ExampleMap } from './examples';

interface ExampleMapsProps {
  /** Slug of the example being opened, or null. Only one can be opened at a time. */
  opening: string | null;
  onOpen(example: ExampleMap): void;
}

/** The example maps of the title screen. Opening one makes a copy in the library, so the original stays as it is. */
export function ExampleMaps({ opening, onOpen }: ExampleMapsProps) {
  return (
    <section className="examples" aria-labelledby="examples-heading" data-testid="examples">
      <h2 className="home-heading" id="examples-heading">
        Example maps
      </h2>
      <p className="home-lede">
        Open one to get a copy of your own to look around in, paint over or take apart. The three story worlds are simplified fan tributes, not
        official maps.
      </p>
      <div className="map-grid">
        {exampleMaps.map((example) => (
          <button
            key={example.slug}
            type="button"
            className="map-card example-card"
            onClick={() => onOpen(example)}
            disabled={opening !== null}
            data-testid={`open-example-${example.slug}`}
          >
            <span className="map-card-thumb">
              <img src={`${import.meta.env.BASE_URL}samples/${example.slug}.jpg`} alt="" loading="lazy" />
            </span>
            <span className="map-card-body">
              <span className="map-card-name">
                {example.name}
                {opening === example.slug && <span className="spinner-border spinner-border-sm ms-2" role="status" aria-label="Opening" />}
              </span>
              <span className="map-card-meta">{example.blurb}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
