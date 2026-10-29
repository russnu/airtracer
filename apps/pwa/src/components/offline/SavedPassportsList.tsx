import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import {
  listSavedPassports,
  refreshSavedPassports,
} from '../../lib/offline/passports';
import type { SavedPassport } from '../../lib/offline/passports';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

function assetLabel(saved: SavedPassport): string {
  return `${saved.asset.brand} ${saved.asset.model}`.trim();
}

/** Passports this user saved on this device for offline viewing. */
export function SavedPassportsList() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [removed, setRemoved] = useState<SavedPassport[]>([]);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const { data: saved = [], error } = useQuery({
    queryKey: ['saved-passports', userId],
    queryFn: () => listSavedPassports(userId!),
    enabled: !!userId,
    networkMode: 'always',
  });

  const refresh = async () => {
    if (!userId) return;
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const result = await refreshSavedPassports(userId);
      if (result.removed.length > 0) {
        setRemoved((current) => [...current, ...result.removed]);
      }
      if (result.failed > 0) {
        setRefreshError(
          `${result.failed} saved passport${result.failed === 1 ? '' : 's'} could not be updated. The existing copies were kept.`,
        );
      }
    } catch (err) {
      console.warn('AirTracer: refreshing saved passports failed.', err);
      setRefreshError('Saved passports could not be updated.');
    } finally {
      setIsRefreshing(false);
      queryClient.invalidateQueries({ queryKey: ['saved-passports'] });
      queryClient.invalidateQueries({ queryKey: ['passport'] });
    }
  };

  // Refresh when the dashboard opens online, and whenever the connection
  // returns while it is open.
  useEffect(() => {
    if (!userId || !isOnline) return;
    let cancelled = false;
    refreshSavedPassports(userId)
      .then((result) => {
        if (cancelled) return;
        if (result.removed.length > 0) {
          setRemoved((current) => [...current, ...result.removed]);
        }
        queryClient.invalidateQueries({ queryKey: ['saved-passports'] });
      })
      .catch((err) => {
        console.warn('AirTracer: refreshing saved passports failed.', err);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, isOnline, queryClient]);

  if (!userId) {
    return null;
  }

  return (
    <section aria-labelledby="saved-passports-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2
          id="saved-passports-heading"
          className="text-lg font-semibold text-slate-900"
        >
          Saved for offline
        </h2>
        {saved.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            isLoading={isRefreshing}
            disabled={!isOnline}
          >
            Refresh
          </Button>
        )}
      </div>

      {removed.length > 0 && (
        <Alert variant="warning" onDismiss={() => setRemoved([])}>
          Removed because the QR code is no longer active:{' '}
          {removed.map(assetLabel).join(', ')}.
        </Alert>
      )}
      {refreshError && (
        <Alert variant="warning" onDismiss={() => setRefreshError(null)}>
          {refreshError}
        </Alert>
      )}
      {error && (
        <Alert variant="error">
          Offline storage is unavailable in this browser, so passports cannot be
          saved on this device.
        </Alert>
      )}

      {!error && saved.length === 0 ? (
        <Card padding="sm" className="text-sm text-slate-500">
          No passports saved yet. Open a passport and choose “Save for offline”.
        </Card>
      ) : (
        <ul className="space-y-2">
          {saved.map((item) => (
            <li key={item.assetId}>
              <Link
                to={`/qr/${item.token}`}
                className="block rounded-xl border border-primary-200 bg-white p-4 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              >
                <p className="font-medium text-slate-900">{assetLabel(item)}</p>
                {item.asset.location && (
                  <p className="text-sm text-slate-500">{item.asset.location}</p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  Last updated {new Date(item.refreshedAt).toLocaleString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
