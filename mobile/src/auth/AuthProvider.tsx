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
  // True once a recovery-link deep link has set a recovery session --
  // RootNavigator uses this to show the Reset Password screen instead of
  // the normal logged-in app, even though `session` is now non-null.
  isPasswordRecovery: boolean;
  beginPasswordRecovery: (accessToken: string, refreshToken: string) => Promise<AuthResult>;
  completePasswordRecovery: (newPassword: string) => Promise<AuthResult>;
  // Signs out of the recovery session and clears isPasswordRecovery --
  // used both for an explicit "Cancel" and as the "Continue" action after
  // a successful update (there's no meaningful difference between the two:
  // either way, recovery mode ends and the user lands back at login).
  exitPasswordRecovery: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

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
      isPasswordRecovery,
      // Called by the deep-link handler once it's parsed a recovery link's
      // tokens -- this necessarily makes `session` non-null (there's no
      // separate "recovery-only" session type in Supabase), which is why
      // isPasswordRecovery exists as its own flag: RootNavigator checks it
      // to show the Reset Password screen instead of jumping straight into
      // the logged-in app the instant this resolves.
      async beginPasswordRecovery(accessToken, refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) return { error: error.message };
        setIsPasswordRecovery(true);
        return { error: null };
      },
      async completePasswordRecovery(newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        return { error: error?.message ?? null };
      },
      // Deliberately signs out rather than leaving the recovery session as
      // the active one -- mirrors web's messaging ("head back to the app
      // and log in with your new password") and avoids treating a
      // short-lived recovery token as an ordinary logged-in session.
      async exitPasswordRecovery() {
        await supabase.auth.signOut();
        setIsPasswordRecovery(false);
      },
    }),
    [session, loading, isPasswordRecovery]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
