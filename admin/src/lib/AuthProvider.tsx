import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { getMe, ApiError, type AdminMe } from './api';

type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'checkingAdmin' }
  | { status: 'notAdmin'; email: string }
  | { status: 'ready'; me: AdminMe };

interface AuthContextValue {
  state: AuthState;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const checkAdmin = useCallback(async (session: Session) => {
    setState({ status: 'checkingAdmin' });
    try {
      const me = await getMe();
      setState({ status: 'ready', me });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setState({ status: 'notAdmin', email: session.user.email ?? '' });
      } else {
        // Treat any other failure (network, 401 from an expired token, etc.)
        // as signed out -- Supabase's own onAuthStateChange will fire again
        // once a valid session exists.
        setState({ status: 'signedOut' });
      }
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) checkAdmin(session);
      else setState({ status: 'signedOut' });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) checkAdmin(session);
      else setState({ status: 'signedOut' });
    });

    return () => subscription.unsubscribe();
  }, [checkAdmin]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ status: 'signedOut' });
  }, []);

  return <AuthContext.Provider value={{ state, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
