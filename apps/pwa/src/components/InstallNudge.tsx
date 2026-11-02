import { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { dismissNudge, isNudgeDismissed } from '../lib/pwa/install';
import { InstallAppButton } from './InstallAppButton';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

/** A one-time dashboard card suggesting the install; "Not now" snoozes it. */
export function InstallNudge() {
  const state = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => isNudgeDismissed());

  if (dismissed || state === 'installed' || state === 'unsupported') {
    return null;
  }

  return (
    <Card padding="sm">
      <h2 className="text-base font-semibold text-brand-tertiary">
        Install AirTracer on this device
      </h2>
      <p className="mt-1 text-sm text-primary-500">
        Open it from your home screen like an app. Installed apps are less
        likely to have records saved on this device cleared by the browser.
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            dismissNudge();
            setDismissed(true);
          }}
        >
          Not now
        </Button>
        <InstallAppButton variant="nudge" />
      </div>
    </Card>
  );
}
