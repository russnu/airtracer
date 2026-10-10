import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, hint, id, className = '', ...props }, ref) {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-primary-700"
        >
          {label}
          {props.required && <span className="text-error-500 ml-0.5">*</span>}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`block w-full rounded-lg border px-3 py-2 text-sm text-primary-900 placeholder:text-primary-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors ${
            error
              ? 'border-error-500 focus:ring-error-500 focus:border-error-500'
              : 'border-primary-300 hover:border-primary-400'
          } ${className}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-error-600" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-sm text-primary-500">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
