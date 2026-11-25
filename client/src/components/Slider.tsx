import { useId } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange(value: number): void;
  /** How the current value is shown next to the label. */
  format?(value: number): string;
  hint?: string;
  disabled?: boolean;
}

/** A labelled range input in the app's style. */
export function Slider({ label, value, min, max, step = 1, onChange, format, hint, disabled }: SliderProps) {
  const id = useId();
  return (
    <div className="wm-field">
      <div className="d-flex justify-content-between align-items-baseline">
        <label htmlFor={id} className="wm-field-label">
          {label}
        </label>
        <span className="wm-field-value">{format ? format(value) : value}</span>
      </div>
      <input
        id={id}
        type="range"
        className="form-range wm-range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <div className="wm-hint">{hint}</div>}
    </div>
  );
}
