import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  RoleName,
  UserResponse,
} from '../types/api';
import {
  ApiClientError,
  authApi,
  clearStoredToken,
  getStoredToken,
  isNetworkError,
  isStoredTokenChange,
  setStoredToken,
} from '../lib/api-client';
import { HOME_PATH } from '../lib/routeAccess';
import { isTokenExpired, readTokenClaims } from '../lib/offline/jwt';
import { clearSession, readSession, writeSession } from '../lib/offline/session';
import {
  removeSavedPassportsForUser,
  removeSavedPassportsNotOwnedBy,
} from '../lib/offline/passports';
import { useQueryClient } from '@tanstack/react-query';

interface AuthState {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Signed in from the cached profile because the API could not be reached. */
  isOfflineSession: boolean;
  /**
   * Why the last session ended: `logout` when the user signed out, `expired`
   * when the token was rejected or ran out. Null if there was no session.
   */
  endReason: SessionEndReason | null;
  /** The account whose session ended, so only it returns to its last page. */
  endedUserId: string | null;
}

type SessionEndReason = 'logout' | 'expired';

interface AuthContextValue extends AuthState {
  login: (data: LoginPayload) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  /** Ends the session after the API rejected the token (HTTP 401). */
  handleUnauthorized: () => Promise<void>;
  /** Adds a role to the signed-in account. Online only. */
  addRole: (role: RoleName) => Promise<void>;
  hasRole: (role: RoleName) => boolean;
}

function signedOut(
  endReason: SessionEndReason | null = null,
  endedUserId: string | null = null,
): AuthState {
  return {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    isOfflineSession: false,
    endReason,
    endedUserId,
  };
}

function signedIn(user: UserResponse, isOfflineSession = false): AuthState {
  return {
    user,
    isLoading: false,
    isAuthenticated: true,
    isOfflineSession,
    endReason: null,
    endedUserId: null,
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);

// The session snapshot only enables offline rendering, so failing to read or
// write it must not block signing in or out.
async function saveSnapshot(user: UserResponse): Promise<void> {
  try {
    await writeSession(user);
  } catch (error) {
    console.warn('AirTracer: could not cache the session for offline use.', error);
  }
}

async function loadSnapshot() {
  try {
    return await readSession();
  } catch (error) {
    console.warn('AirTracer: could not read the cached session.', error);
    return null;
  }
}

async function removeSnapshot(): Promise<void> {
  try {
    await clearSession();
  } catch (error) {
    console.warn('AirTracer: could not clear the cached session.', error);
  }
}

/** On sign-in, removes passports another account saved on this device. */
async function keepOnlyPassportsOf(userId: string): Promise<void> {
  try {
    await removeSavedPassportsNotOwnedBy(userId);
  } catch (error) {
    console.warn('AirTracer: could not clear saved passports from other accounts.', error);
  }
}

async function removePassportsOf(userId: string): Promise<void> {
  try {
    await removeSavedPassportsForUser(userId);
  } catch (error) {
    console.warn('AirTracer: could not clear saved passports.', error);
  }
}

/**
 * Restores the session for a stored token. Only an explicit 401 (or an
 * expired token) ends the session; if the API is unreachable, the cached
 * profile for the same user is used instead.
 */
async function restoreSession(token: string): Promise<AuthState> {
  const claims = readTokenClaims(token);

  if (claims && isTokenExpired(claims)) {
    clearStoredToken();
    await removeSnapshot();
    return signedOut('expired', claims.sub);
  }

  try {
    const user = await authApi.me();
    await saveSnapshot(user);
    return signedIn(user);
  } catch (error) {
    if (error instanceof ApiClientError && error.statusCode === 401) {
      clearStoredToken();
      await removeSnapshot();
      return signedOut('expired', claims?.sub ?? null);
    }

    // Offline, unreachable, or a server error: fall back to the cached profile
    // if it belongs to the same account as the token. The token is kept either
    // way so a temporary outage does not sign the user out.
    if (!isNetworkError(error)) {
      console.warn('AirTracer: session check failed; using cached session.', error);
    }
    const snapshot = await loadSnapshot();
    if (snapshot && claims && snapshot.userId === claims.sub) {
      return signedIn(snapshot.user, true);
    }
    return signedOut();
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Read once: restoring an expired token removes it from storage straight
  // away, so a second run of the effect below (React StrictMode) must still
  // see it, or the app would stay loading.
  const [initialToken] = useState(getStoredToken);
  const [state, setState] = useState<AuthState>(() => ({
    ...signedOut(),
    isLoading: !!initialToken,
  }));

  // Check for existing token on mount
  useEffect(() => {
    if (!initialToken) return;

    let cancelled = false;
    restoreSession(initialToken).then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [initialToken]);

  // Confirm an offline session with the API once the connection returns.
  useEffect(() => {
    if (!state.isOfflineSession) return;

    let cancelled = false;
    const revalidate = () => {
      const token = getStoredToken();
      if (!token) return;
      restoreSession(token).then((next) => {
        if (!cancelled) setState(next);
      });
    };

    window.addEventListener('online', revalidate);
    return () => {
      cancelled = true;
      window.removeEventListener('online', revalidate);
    };
  }, [state.isOfflineSession]);

  const queryClient = useQueryClient();
  const userId = state.user?.id ?? null;

  // Another tab signed out or signed in. Signing out here too keeps this tab
  // from showing the old account; a different account reloads the app so no
  // page, form, or cached data from the previous account survives.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!isStoredTokenChange(event)) return;

      const token = getStoredToken();
      if (!token) {
        if (userId) {
          queryClient.clear();
          setState(signedOut('logout', userId));
        }
        return;
      }
      if (readTokenClaims(token)?.sub !== userId) {
        window.location.replace(HOME_PATH);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [userId, queryClient]);

  const startSession = useCallback(
    async (response: AuthResponse) => {
      setStoredToken(response.accessToken);
      await saveSnapshot(response.user);
      await keepOnlyPassportsOf(response.user.id);
      // Drop any server data cached for a previous account.
      queryClient.clear();
      setState(signedIn(response.user));
    },
    [queryClient],
  );

  const login = useCallback(
    async (data: LoginPayload) => {
      await startSession(await authApi.login(data));
    },
    [startSession],
  );

  const register = useCallback(
    async (data: RegisterPayload) => {
      await startSession(await authApi.register(data));
    },
    [startSession],
  );

  const logout = useCallback(async () => {
    clearStoredToken();
    await removeSnapshot();
    if (userId) {
      await removePassportsOf(userId);
    }
    queryClient.clear();
    setState(signedOut('logout', userId));
  }, [userId, queryClient]);

  // The token is no longer valid. Saved passports and unsynced records are
  // kept: they are removed or resumed when the next account signs in.
  const handleUnauthorized = useCallback(async () => {
    clearStoredToken();
    await removeSnapshot();
    queryClient.clear();
    setState(signedOut('expired', userId));
  }, [userId, queryClient]);

  // The token is unchanged: the API reads roles from the database on every
  // request, so only the profile and its offline snapshot need updating.
  const addRole = useCallback(async (role: RoleName) => {
    const user = await authApi.addRole(role);
    await saveSnapshot(user);
    setState(signedIn(user));
  }, []);

  const hasRole = useCallback(
    (role: RoleName) => {
      return state.user?.roles.includes(role) ?? false;
    },
    [state.user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      register,
      logout,
      handleUnauthorized,
      addRole,
      hasRole,
    }),
    [state, login, register, logout, handleUnauthorized, addRole, hasRole],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
