import { useState, useRef, useEffect } from 'react';
import '../../styles/custom-select.css';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  triggerClassName?: string;
  wrapClassName?: string;
  disabled?: boolean;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  triggerClassName = '',
  wrapClassName = '',
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const currentLabel = options.find(o => o.value === value)?.label ?? value;

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={rootRef} className={`cs-root${wrapClassName ? ` ${wrapClassName}` : ''}`}>
      <button
        type="button"
        className={`cs-trigger${triggerClassName ? ` ${triggerClassName}` : ''}`}
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
      >
        <span className="cs-label">{currentLabel}</span>
        <span className="cs-arrow">▾</span>
      </button>
      {open && (
        <div className="cs-dropdown">
          {options.map(opt => (
            <div
              key={opt.value}
              className={`cs-option${opt.value === value ? ' cs-option--selected' : ''}`}
              onMouseDown={() => { onChange(opt.value); setOpen(false); }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
