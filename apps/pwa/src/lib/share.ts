/**
 * Clipboard and native-share helpers for passport links. Both browser APIs
 * need a secure context (HTTPS or localhost) and must be called from a user
 * action, so callers run them directly in click handlers.
 */

type ClipboardLike = Pick<Clipboard, 'writeText'>;
type ShareNavigator = Pick<Navigator, 'share'> & Partial<Pick<Navigator, 'canShare'>>;

/** Copies text to the clipboard. Resolves false when the browser refuses. */
export async function copyText(
  text: string,
  clipboard: ClipboardLike | undefined = globalThis.navigator?.clipboard,
): Promise<boolean> {
  if (!clipboard) {
    return false;
  }
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    // Insecure context, missing permission, or no user activation. The
    // caller shows the link for manual copying instead.
    return false;
  }
}

/** Whether the native share sheet is available for a link. */
export function canShareLink(
  url: string,
  nav: Partial<ShareNavigator> | undefined = globalThis.navigator,
): boolean {
  if (typeof nav?.share !== 'function') {
    return false;
  }
  return typeof nav.canShare === 'function' ? nav.canShare({ url }) : true;
}

export type ShareResult = 'shared' | 'cancelled' | 'failed';

/** Opens the native share sheet. Closing the sheet is not an error. */
export async function shareLink(
  data: { url: string; title: string },
  nav: Partial<ShareNavigator> | undefined = globalThis.navigator,
): Promise<ShareResult> {
  if (typeof nav?.share !== 'function') {
    return 'failed';
  }
  try {
    await nav.share(data);
    return 'shared';
  } catch (error) {
    return error instanceof Error && error.name === 'AbortError'
      ? 'cancelled'
      : 'failed';
  }
}
