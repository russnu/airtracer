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
  UserResponse,
} from '../types/api';
import {
  ApiClientError,
  authApi,
  clearStoredToken,
  getStoredToken,
  isNetworkError,
  setStoredToken,
} from '../lib/api-client';
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
}

interface AuthContextValue extends AuthState {
  login: (data: LoginPayload) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  /** Ends the session after the API rejected the token (HTTP 401). */
  handleUnauthorized: () => Promise<void>;
  hasRole: (role: string) => boolean;
}

const SIGNED_OUT: AuthState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  isOfflineSession: false,
};

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
    return SIGNED_OUT;
  }

  try {
    const user = await authApi.me();
    await saveSnapshot(user);
    return { user, isLoading: false, isAuthenticated: true, isOfflineSession: false };
  } catch (error) {
    if (error instanceof ApiClientError && error.statusCode === 401) {
      clearStoredToken();
      await removeSnapshot();
      return SIGNED_OUT;
    }

    // Offline, unreachable, or a server error: fall back to the cached profile
    // if it belongs to the same account as the token. The token is kept either
    // way so a temporary outage does not sign the user out.
    if (!isNetworkError(error)) {
      console.warn('AirTracer: session check failed; using cached session.', error);
    }
    const snapshot = await loadSnapshot();
    if (snapshot && claims && snapshot.userId === claims.sub) {
      return {
        user: snapshot.user,
        isLoading: false,
        isAuthenticated: true,
        isOfflineSession: true,
      };
    }
    return SIGNED_OUT;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => ({
    ...SIGNED_OUT,
    isLoading: !!getStoredToken(),
  }));

  // Check for existing token on mount
  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

    let cancelled = false;
    restoreSession(token).then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const startSession = useCallback(
    async (response: AuthResponse) => {
      setStoredToken(response.accessToken);
      await saveSnapshot(response.user);
      await keepOnlyPassportsOf(response.user.id);
      // Drop any server data cached for a previous account.
      queryClient.clear();
      setState({
        user: response.user,
        isLoading: false,
        isAuthenticated: true,
        isOfflineSession: false,
      });
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
    const userId = state.user?.id;
    clearStoredToken();
    await removeSnapshot();
    if (userId) {
      await removePassportsOf(userId);
    }
    queryClient.clear();
    setState(SIGNED_OUT);
  }, [state.user, queryClient]);

  // The token is no longer valid. Saved passports and unsynced records are
  // kept: they are removed or resumed when the next account signs in.
  const handleUnauthorized = useCallback(async () => {
    clearStoredToken();
    await removeSnapshot();
    queryClient.clear();
    setState(SIGNED_OUT);
  }, [queryClient]);

  const hasRole = useCallback(
    (role: string) => {
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
      hasRole,
    }),
    [state, login, register, logout, handleUnauthorized, hasRole],
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
