import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { LoginPayload, RegisterPayload, UserResponse } from '../types/api';
import {
  authApi,
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from '../lib/api-client';

interface AuthState {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (data: LoginPayload) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = getStoredToken();
    return {
      user: null,
      isLoading: !!token,
      isAuthenticated: false,
    };
  });

  // Check for existing token on mount
  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

    authApi
      .me()
      .then((user) => {
        setState({ user, isLoading: false, isAuthenticated: true });
      })
      .catch(() => {
        clearStoredToken();
        setState({ user: null, isLoading: false, isAuthenticated: false });
      });
  }, []);

  const login = useCallback(async (data: LoginPayload) => {
    const response = await authApi.login(data);
    setStoredToken(response.accessToken);
    setState({
      user: response.user,
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  const register = useCallback(async (data: RegisterPayload) => {
    const response = await authApi.register(data);
    setStoredToken(response.accessToken);
    setState({
      user: response.user,
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

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
      hasRole,
    }),
    [state, login, register, logout, hasRole],
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
