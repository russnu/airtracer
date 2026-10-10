import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, id, className = '', ...props }, ref) {
    const textareaId = id ?? label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1">
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-primary-700"
        >
          {label}
          {props.required && <span className="text-error-500 ml-0.5">*</span>}
        </label>
        <textarea
          ref={ref}
          id={textareaId}
          className={`block w-full rounded-lg border px-3 py-2 text-sm text-primary-900 placeholder:text-primary-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors resize-y min-h-[80px] ${
            error
              ? 'border-error-500 focus:ring-error-500 focus:border-error-500'
              : 'border-primary-300 hover:border-primary-400'
          } ${className}`}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        {error && (
          <p className="text-sm text-error-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
