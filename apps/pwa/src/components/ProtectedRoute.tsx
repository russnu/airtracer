import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  requiredRole?: string;
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasRole } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-accent-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-primary-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
