import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, WEB_APP_URL } from '../lib/supabase';

interface AuthResult {
  error: string | null;
  needsEmailConfirmation?: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      async signUp(email, password, displayName) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        if (error) return { error: error.message };
        return { error: null, needsEmailConfirmation: !data.session };
      },
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
      async resetPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${WEB_APP_URL}/reset-password`,
        });
        return { error: error?.message ?? null };
      },
      // Re-authenticates with the current password first -- supabase-js's
      // updateUser() would happily change the password off the existing
      // session alone with no proof the caller actually knows the old one,
      // which is the standard "Change password" expectation (as opposed to
      // the email-based "Forgot password?" flow, which doesn't need this
      // since a fresh recovery link already proves inbox access instead).
      async changePassword(currentPassword, newPassword) {
        const email = session?.user.email;
        if (!email) return { error: 'You must be logged in to change your password.' };

        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
        if (signInError) return { error: 'Current password is incorrect.' };

        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        return { error: updateError?.message ?? null };
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
