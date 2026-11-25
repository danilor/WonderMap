interface Option<T extends string> {
  value: T;
  label: string;
  icon?: string;
  title?: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  options: readonly Option<T>[];
  onChange(value: T): void;
  label?: string;
}

/** A row of mutually exclusive buttons. */
export function Segmented<T extends string>({ value, options, onChange, label }: SegmentedProps<T>) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className={o.value === value ? 'active' : ''} title={o.title} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.icon && <i className={`bi bi-${o.icon}`} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}
