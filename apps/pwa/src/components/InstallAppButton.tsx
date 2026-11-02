import { useState } from 'react';
import { MdInstallDesktop } from 'react-icons/md';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useOutbox } from '../hooks/useOutbox';
import { promptInstall } from '../lib/pwa/install';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface InstallAppButtonProps {
  /** "header" for the desktop header, "menu" for the mobile menu, "nudge" for the dashboard card. */
  variant: 'header' | 'menu' | 'nudge';
}

/**
 * Opens the browser's install dialog where it exists (Chromium), or manual
 * steps on iOS and macOS Safari. Renders nothing elsewhere or once installed.
 */
export function InstallAppButton({ variant }: InstallAppButtonProps) {
  const state = useInstallPrompt();
  const [showSteps, setShowSteps] = useState(false);

  if (state === 'installed' || state === 'unsupported') {
    return null;
  }

  const handleClick = () => {
    if (state === 'promptable') {
      promptInstall().catch((error: unknown) => {
        console.warn('AirTracer: install prompt failed.', error);
      });
    } else {
      setShowSteps(true);
    }
  };

  const icon = <MdInstallDesktop aria-hidden="true" className="h-4 w-4" />;

  return (
    <>
      {variant === 'header' && (
        // Icon only until lg: the header is crowded at tablet widths.
        <Button
          variant="ghost"
          size="sm"
          icon={icon}
          onClick={handleClick}
          aria-label="Install app"
          title="Install app"
          className="whitespace-nowrap"
        >
          <span className="hidden lg:inline">Install app</span>
        </Button>
      )}
      {variant === 'menu' && (
        <button
          onClick={handleClick}
          className="flex w-full items-center gap-2 text-left px-4 py-2 text-base font-medium text-primary-500 hover:text-primary-800 hover:bg-primary-100"
        >
          {icon}
          Install app
        </button>
      )}
      {variant === 'nudge' && (
        <Button size="sm" icon={icon} onClick={handleClick}>
          Install
        </Button>
      )}

      {state !== 'promptable' && (
        <ConfirmDialog
          open={showSteps}
          title="Install AirTracer"
          confirmLabel="Got it"
          tone="primary"
          hideCancel
          onConfirm={() => setShowSteps(false)}
          onCancel={() => setShowSteps(false)}
        >
          {state === 'manual-ios' ? <IosSteps /> : <MacSafariSteps />}
        </ConfirmDialog>
      )}
    </>
  );
}

function IosSteps() {
  const { unsyncedCount } = useOutbox();

  return (
    <>
      <ol className="list-decimal pl-5 space-y-1">
        <li>Tap the Share button in the browser toolbar.</li>
        <li>Choose Add to Home Screen.</li>
        <li>Tap Add, then open AirTracer from your Home Screen.</li>
      </ol>
      <p>
        The installed app keeps its own data, separate from this browser. You
        will need to sign in again, and saved passports stay in this browser.
      </p>
      {unsyncedCount > 0 && (
        <Alert variant="warning">
          {unsyncedCount} service record{unsyncedCount === 1 ? ' is' : 's are'}{' '}
          saved in this browser but not synced yet. Sync{' '}
          {unsyncedCount === 1 ? 'it' : 'them'} before switching to the
          installed app.
        </Alert>
      )}
    </>
  );
}

function MacSafariSteps() {
  return (
    <ol className="list-decimal pl-5 space-y-1">
      <li>In the menu bar, choose File, then Add to Dock.</li>
      <li>Click Add, then open AirTracer from the Dock.</li>
    </ol>
  );
}
