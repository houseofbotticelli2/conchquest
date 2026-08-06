import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getMe, logout, ApiError, type AdminMe } from './api';

type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'notAdmin'; email: string }
  | { status: 'ready'; me: AdminMe };

interface AuthContextValue {
  state: AuthState;
  // Re-checks the session against the API -- call after a successful login
  // (there's no client-side auth event to listen for anymore, the session
  // lives entirely in an httpOnly cookie this code can't read).
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const refresh = useCallback(async () => {
    try {
      const me = await getMe();
      setState({ status: 'ready', me });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        const email = (err.body as { email?: string } | undefined)?.email ?? '';
        setState({ status: 'notAdmin', email });
      } else {
        setState({ status: 'signedOut' });
      }
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await logout();
    setState({ status: 'signedOut' });
  }, []);

  return <AuthContext.Provider value={{ state, refresh, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
