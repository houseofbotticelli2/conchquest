import React, { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

type Status =
  | { step: 'checkingLink' }
  | { step: 'invalidLink'; message: string }
  | { step: 'ready' }
  | { step: 'submitting' }
  | { step: 'done' };

const MIN_PASSWORD_LENGTH = 8;

// Supabase's recovery email links to this page with the session tokens in
// the URL hash (or, for a link that's already expired/consumed, an
// #error=... fragment instead) -- supabase-js's detectSessionInUrl (on by
// default) parses that on load and fires PASSWORD_RECOVERY once the
// recovery session is actually established, which is what this waits for
// rather than assuming the link was valid just because the page loaded.
export function ResetPasswordForm() {
  const [status, setStatus] = useState<Status>({ step: 'checkingLink' });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const urlError = hashParams.get('error_description');
    if (urlError) {
      setStatus({ step: 'invalidLink', message: decodeURIComponent(urlError.replace(/\+/g, ' ')) });
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStatus({ step: 'ready' });
    });

    // Covers the case where the PASSWORD_RECOVERY event already fired
    // before this listener was attached (a real race on fast page loads).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStatus((s) => (s.step === 'checkingLink' ? { step: 'ready' } : s));
    });

    const timeout = setTimeout(() => {
      setStatus((s) =>
        s.step === 'checkingLink'
          ? { step: 'invalidLink', message: 'This link is invalid or has expired. Request a new one and try again.' }
          : s
      );
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setStatus({ step: 'submitting' });
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setStatus({ step: 'ready' });
      return;
    }
    setStatus({ step: 'done' });
  }

  if (status.step === 'checkingLink') {
    return <p>Checking your reset link...</p>;
  }

  if (status.step === 'invalidLink') {
    return (
      <div>
        <p>{status.message}</p>
        <p>
          Request a new reset link from the Conchquest app's sign-in screen, then open the email on the device you'd like to
          finish this on.
        </p>
      </div>
    );
  }

  if (status.step === 'done') {
    return <p>Your password has been updated. You can now sign in with your new password in the Conchquest app.</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="password">New password</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="confirmPassword">Confirm password</label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" disabled={status.step === 'submitting'}>
        {status.step === 'submitting' ? 'Updating...' : 'Set new password'}
      </button>
    </form>
  );
}
