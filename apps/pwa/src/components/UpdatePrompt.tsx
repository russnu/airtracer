import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './ui/Button';

/**
 * Registers the service worker and asks before activating an update, so a
 * reload never discards a form the user is filling in.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('AirTracer SW registration failed:', error);
    },
  });

  if (!needRefresh) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 rounded-lg border border-primary-200 bg-white p-4 shadow-lg"
    >
      <p className="text-sm text-primary-700">
        A new version of AirTracer is available. Save any open work, then reload.
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setNeedRefresh(false)}>
          Later
        </Button>
        <Button size="sm" onClick={() => updateServiceWorker(true)}>
          Reload
        </Button>
      </div>
    </div>
  );
}
