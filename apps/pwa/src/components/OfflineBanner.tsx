import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      className="bg-warning-50 border-b border-warning-100 text-warning-600 text-sm px-4 py-2 text-center"
    >
      You're offline. Saved passports and new service records still work; other
      pages need a connection.
    </div>
  );
}
