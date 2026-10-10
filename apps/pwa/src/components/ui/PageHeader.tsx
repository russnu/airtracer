import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  backTo?: string;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary-900">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-primary-500">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
