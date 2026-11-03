import { useState } from 'react';
import { AddRoleAction } from '../../components/AddRoleAction';
import { EmptyState } from '../../components/ui';
import { buttonClasses } from '../../components/ui/buttonClasses';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_LABELS } from '../../lib/navItems';
import type { RoleName } from '../../types/api';
import { OwnerDashboard } from './OwnerDashboard';
import { TechnicianDashboard } from './TechnicianDashboard';

const VIEW_KEY = 'airtracer_dashboard_view';
const VIEWS: RoleName[] = ['OWNER', 'TECHNICIAN'];

// The last view is a per-device convenience: without storage it is Owner.
function readView(): RoleName {
  try {
    return localStorage.getItem(VIEW_KEY) === 'TECHNICIAN' ? 'TECHNICIAN' : 'OWNER';
  } catch {
    return 'OWNER';
  }
}

function saveView(view: RoleName) {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    // Not remembered; the switch still works for this visit.
  }
}

export function DashboardRouter() {
  const { hasRole } = useAuth();
  const [view, setView] = useState(readView);

  const isOwner = hasRole('OWNER');
  const isTechnician = hasRole('TECHNICIAN');

  if (isOwner && isTechnician) {
    const choose = (next: RoleName) => {
      setView(next);
      saveView(next);
    };

    return (
      <div className="space-y-6">
        <div
          role="group"
          aria-label="Dashboard view"
          className="inline-flex rounded-lg border border-primary-200 bg-white p-1"
        >
          {VIEWS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => choose(option)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
                view === option
                  ? 'bg-brand-secondary text-white'
                  : 'text-primary-600 hover:bg-primary-50'
              }`}
            >
              {ROLE_LABELS[option]}
            </button>
          ))}
        </div>
        {view === 'TECHNICIAN' ? <TechnicianDashboard /> : <OwnerDashboard />}
      </div>
    );
  }

  if (isOwner) return <OwnerDashboard />;
  if (isTechnician) return <TechnicianDashboard />;

  return (
    <EmptyState
      title="No role on this account"
      description="Add a role to start using AirTracer."
      action={<AddRoleAction className={buttonClasses()} />}
    />
  );
}
