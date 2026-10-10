import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ label, options, error, placeholder, id, className = '', ...props }, ref) {
    const selectId = id ?? label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1">
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-primary-700"
        >
          {label}
          {props.required && <span className="text-error-500 ml-0.5">*</span>}
        </label>
        <select
          ref={ref}
          id={selectId}
          className={`block w-full rounded-lg border px-3 py-2 text-sm text-primary-900 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors ${
            error
              ? 'border-error-500 focus:ring-error-500 focus:border-error-500'
              : 'border-primary-300 hover:border-primary-400'
          } ${className}`}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-sm text-error-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
