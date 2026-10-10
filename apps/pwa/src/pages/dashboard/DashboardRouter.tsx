import { useAuth } from '../../contexts/AuthContext';
import { OwnerDashboard } from './OwnerDashboard';
import { TechnicianDashboard } from './TechnicianDashboard';

export function DashboardRouter() {
  const { hasRole } = useAuth();
  if (hasRole('OWNER')) return <OwnerDashboard />;
  if (hasRole('TECHNICIAN')) return <TechnicianDashboard />;
  return <OwnerDashboard />; // fallback
}
