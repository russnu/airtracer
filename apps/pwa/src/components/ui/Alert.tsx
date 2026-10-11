import type { ReactNode } from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
  onDismiss?: () => void;
}

const variantClasses: Record<AlertVariant, string> = {
  info: 'bg-accent-50 text-accent-700 border-accent-200',
  success: 'bg-success-50 text-success-700 border-success-200',
  warning: 'bg-warning-50 text-warning-600 border-warning-200',
  error: 'bg-error-50 text-error-700 border-error-200',
};

export function Alert({ variant = 'info', title, children, className = '', onDismiss }: AlertProps) {
  return (
    <div
      className={`rounded-lg border p-4 ${variantClasses[variant]} ${className}`}
      role="alert"
    >
      <div className="flex justify-between">
        <div>
          {title && <p className="font-medium mb-1">{title}</p>}
          <div className="text-sm">{children}</div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 ml-4 opacity-70 hover:opacity-100"
            aria-label="Dismiss"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
