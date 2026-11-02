import { beforeEach, describe, expect, it, vi } from 'vitest';

const CHROME_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const MAC_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const FIREFOX_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0';
const IPHONE_INSTAGRAM = `${IPHONE_SAFARI} Instagram 350.0.0`;

const DAY_MS = 24 * 60 * 60 * 1000;

class FakeMediaQueryList extends EventTarget {
  matches: boolean;
  constructor(matches: boolean) {
    super();
    this.matches = matches;
  }
}

class FakeInstallPromptEvent extends Event {
  prompt = vi.fn(() => Promise.resolve());
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  constructor(outcome: 'accepted' | 'dismissed') {
    super('beforeinstallprompt', { cancelable: true });
    this.userChoice = Promise.resolve({ outcome });
  }
}

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

interface Environment {
  userAgent?: string;
  maxTouchPoints?: number;
  standalone?: boolean;
  displayModeStandalone?: boolean;
}

let fakeWindow: EventTarget & { matchMedia: () => FakeMediaQueryList };
let displayMode: FakeMediaQueryList;

/** Stubs the browser globals, then loads a fresh copy of the module. */
async function loadInstall({
  userAgent = CHROME_DESKTOP,
  maxTouchPoints = 0,
  standalone,
  displayModeStandalone = false,
}: Environment = {}) {
  displayMode = new FakeMediaQueryList(displayModeStandalone);
  fakeWindow = Object.assign(new EventTarget(), { matchMedia: () => displayMode });
  vi.stubGlobal('window', fakeWindow);
  vi.stubGlobal('navigator', { userAgent, maxTouchPoints, standalone });

  vi.resetModules();
  const install = await import('./install');
  install.initInstallPrompt();
  return install;
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
});

describe('getInstallState', () => {
  it('is unsupported in Chromium until the browser offers the install', async () => {
    const install = await loadInstall();
    expect(install.getInstallState()).toBe('unsupported');
  });

  it('keeps the install event and suppresses the browser prompt', async () => {
    const install = await loadInstall();
    const onChange = vi.fn();
    install.subscribeInstall(onChange);

    const event = new FakeInstallPromptEvent('accepted');
    fakeWindow.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(install.getInstallState()).toBe('promptable');
    expect(onChange).toHaveBeenCalled();
  });

  it('is installed after appinstalled', async () => {
    const install = await loadInstall();
    fakeWindow.dispatchEvent(new FakeInstallPromptEvent('accepted'));
    fakeWindow.dispatchEvent(new Event('appinstalled'));
    expect(install.getInstallState()).toBe('installed');
  });

  it('is installed when running standalone', async () => {
    const install = await loadInstall({ displayModeStandalone: true });
    expect(install.getInstallState()).toBe('installed');
  });

  it('follows display-mode changes', async () => {
    const install = await loadInstall();
    const onChange = vi.fn();
    install.subscribeInstall(onChange);

    displayMode.matches = true;
    displayMode.dispatchEvent(new Event('change'));

    expect(onChange).toHaveBeenCalled();
    expect(install.getInstallState()).toBe('installed');
  });

  it('is installed when launched from the iOS Home Screen', async () => {
    const install = await loadInstall({ userAgent: IPHONE_SAFARI, standalone: true });
    expect(install.getInstallState()).toBe('installed');
  });

  it.each([
    ['iPhone Safari', { userAgent: IPHONE_SAFARI }, 'manual-ios'],
    ['iPadOS reporting a Mac', { userAgent: MAC_SAFARI, maxTouchPoints: 5 }, 'manual-ios'],
    ['macOS Safari', { userAgent: MAC_SAFARI }, 'manual-safari-mac'],
    ['macOS Chrome', { userAgent: MAC_CHROME }, 'unsupported'],
    ['Firefox', { userAgent: FIREFOX_DESKTOP }, 'unsupported'],
    ['an in-app browser', { userAgent: IPHONE_INSTAGRAM }, 'unsupported'],
  ] as const)('maps %s to %s', async (_name, environment, expected) => {
    const install = await loadInstall(environment);
    expect(install.getInstallState()).toBe(expected);
  });
});

describe('promptInstall', () => {
  it('prompts once and then drops the event', async () => {
    const install = await loadInstall();
    const event = new FakeInstallPromptEvent('accepted');
    fakeWindow.dispatchEvent(event);

    await expect(install.promptInstall()).resolves.toBe('accepted');
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(install.getInstallState()).toBe('unsupported');
    await expect(install.promptInstall()).resolves.toBe('unavailable');
    expect(install.isNudgeDismissed()).toBe(false);
  });

  it('snoozes the nudge when the user dismisses the browser dialog', async () => {
    const install = await loadInstall();
    fakeWindow.dispatchEvent(new FakeInstallPromptEvent('dismissed'));

    await expect(install.promptInstall()).resolves.toBe('dismissed');
    expect(install.isNudgeDismissed()).toBe(true);
  });
});

describe('install nudge', () => {
  it('stays dismissed for 30 days', async () => {
    const install = await loadInstall();
    const now = Date.UTC(2026, 10, 2);

    expect(install.isNudgeDismissed(now)).toBe(false);
    install.dismissNudge(now);
    expect(install.isNudgeDismissed(now + 29 * DAY_MS)).toBe(true);
    expect(install.isNudgeDismissed(now + 30 * DAY_MS)).toBe(false);
  });

  it('shows the nudge when storage is blocked', async () => {
    const install = await loadInstall();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });

    expect(() => install.dismissNudge()).not.toThrow();
    expect(install.isNudgeDismissed()).toBe(false);
  });
});
