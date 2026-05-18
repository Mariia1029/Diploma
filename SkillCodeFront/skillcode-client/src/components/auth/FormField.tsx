import { useState } from 'react';

interface FormFieldProps {
  label: string;
  type?: 'text' | 'email' | 'password';
  placeholder?: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
}

export default function FormField({
  label,
  type = 'text',
  placeholder,
  hint,
  error,
  value,
  onChange,
}: FormFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="field">
      <label>{label}</label>
      <div className={type === 'password' ? 'password-wrapper' : undefined}>
        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={error ? { borderColor: 'var(--red)' } : undefined}
        />
        {type === 'password' && (
          <button
            type="button"
            className="eye-btn"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? 'Сховати пароль' : 'Показати пароль'}
          >
            {showPassword ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
      {error && <div className="field-hint" style={{ color: 'var(--red)' }}>{error}</div>}
      {!error && hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}
