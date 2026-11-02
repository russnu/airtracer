import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Back navigation that stays inside the app. React Router gives the first
 * history entry the key "default", so a page opened from a QR scan, a deep
 * link or a cold start has no in-app page behind it; going back then means
 * the fallback route instead of leaving AirTracer. With no fallback,
 * `canGoBack` is false and callers hide their Back control.
 */
export function useGoBack(fallback: string | null) {
  const location = useLocation();
  const navigate = useNavigate();
  const hasHistory = location.key !== 'default';

  const goBack = useCallback(() => {
    if (hasHistory) {
      navigate(-1);
    } else if (fallback) {
      navigate(fallback, { replace: true });
    }
  }, [fallback, hasHistory, navigate]);

  return { canGoBack: hasHistory || fallback !== null, goBack };
}
