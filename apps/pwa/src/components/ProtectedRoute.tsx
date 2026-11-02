import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { ReturnState } from '../lib/navigation';
import { canAccess, HOME_PATH } from '../lib/routeAccess';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, user, endReason, endedUserId } = useAuth();
  const location = useLocation();

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
    // After a deliberate logout the next sign-in starts at home, so the page
    // is not saved; it may belong to a different account.
    if (endReason === 'logout') {
      return <Navigate to="/login" replace />;
    }
    // The login page sends the user back here after signing in. A page saved
    // when a session expired is only reopened for that same account.
    const state: ReturnState =
      endReason === 'expired' && endedUserId
        ? { from: location, userId: endedUserId }
        : { from: location };
    return <Navigate to="/login" replace state={state} />;
  }

  if (!canAccess(location.pathname, user?.roles ?? [])) {
    return <Navigate to={HOME_PATH} replace />;
  }

  return <Outlet />;
}
