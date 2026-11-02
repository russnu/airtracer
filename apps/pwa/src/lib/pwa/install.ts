// Install-prompt state for the "Install app" button.
//
// Chromium browsers fire `beforeinstallprompt` when the app can be installed;
// the event is kept so a user click can show the browser's install dialog.
// Safari and Firefox never fire it, so iOS and macOS Safari get manual steps
// and everything else shows nothing.

/** Not in the TypeScript DOM library; Chromium only. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Navigator {
    /** iOS Safari: true when running from the Home Screen. */
    readonly standalone?: boolean;
  }
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export type InstallState =
  | 'installed'
  | 'promptable'
  | 'manual-ios'
  | 'manual-safari-mac'
  | 'unsupported';

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

const NUDGE_DISMISSED_KEY = 'airtracer_install_nudge_dismissed_at';
const NUDGE_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

const changes = new EventTarget();
let initialized = false;
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installedThisSession = false;
let standaloneQuery: MediaQueryList | null = null;

function notifyChange(): void {
  changes.dispatchEvent(new Event('change'));
}

/**
 * Starts listening for install events. Call once before React renders:
 * `beforeinstallprompt` can fire before any component mounts.
 */
export function initInstallPrompt(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    // Suppress the browser's own mini-infobar; the app shows its own button.
    event.preventDefault();
    deferredPrompt = event;
    notifyChange();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installedThisSession = true;
    notifyChange();
  });

  standaloneQuery = window.matchMedia('(display-mode: standalone)');
  standaloneQuery.addEventListener('change', notifyChange);
}

export function subscribeInstall(onChange: () => void): () => void {
  changes.addEventListener('change', onChange);
  return () => changes.removeEventListener('change', onChange);
}

function isIos(userAgent: string): boolean {
  // iPadOS reports a Mac user agent; touch support tells them apart.
  return (
    /iPhone|iPad|iPod/.test(userAgent) ||
    (/Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1)
  );
}

function isInAppBrowser(userAgent: string): boolean {
  return /FBAN|FBAV|Instagram|Line\//.test(userAgent);
}

function isMacSafari(userAgent: string): boolean {
  return (
    /Macintosh/.test(userAgent) &&
    /Safari\//.test(userAgent) &&
    !/Chrome|Chromium|CriOS|Edg|Firefox|FxiOS|OPR/.test(userAgent)
  );
}

export function getInstallState(): InstallState {
  if (installedThisSession || standaloneQuery?.matches || navigator.standalone) {
    return 'installed';
  }
  if (deferredPrompt) {
    return 'promptable';
  }

  const userAgent = navigator.userAgent;
  if (isInAppBrowser(userAgent)) {
    return 'unsupported';
  }
  if (isIos(userAgent)) {
    return 'manual-ios';
  }
  if (isMacSafari(userAgent)) {
    return 'manual-safari-mac';
  }
  return 'unsupported';
}

/**
 * Shows the browser's install dialog. A kept event can be prompted only once,
 * so it is dropped whatever the user chooses.
 */
export async function promptInstall(): Promise<InstallOutcome> {
  const event = deferredPrompt;
  if (!event) return 'unavailable';
  deferredPrompt = null;

  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === 'dismissed') {
      dismissNudge();
    }
    return outcome;
  } finally {
    notifyChange();
  }
}

// ----- Install nudge -----

/** True while the dashboard nudge is snoozed after the user declined it. */
export function isNudgeDismissed(now = Date.now()): boolean {
  try {
    const dismissedAt = Number(localStorage.getItem(NUDGE_DISMISSED_KEY));
    return dismissedAt > 0 && now - dismissedAt < NUDGE_SNOOZE_MS;
  } catch (error) {
    console.warn('AirTracer: could not read the install nudge state.', error);
    return false;
  }
}

export function dismissNudge(now = Date.now()): void {
  try {
    localStorage.setItem(NUDGE_DISMISSED_KEY, String(now));
  } catch (error) {
    console.warn('AirTracer: could not save the install nudge state.', error);
  }
}
