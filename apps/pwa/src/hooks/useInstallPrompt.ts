import { useSyncExternalStore } from 'react';
import { getInstallState, subscribeInstall } from '../lib/pwa/install';
import type { InstallState } from '../lib/pwa/install';

/** How this browser can install AirTracer, kept current as events arrive. */
export function useInstallPrompt(): InstallState {
  return useSyncExternalStore(
    subscribeInstall,
    getInstallState,
    () => 'unsupported',
  );
}
