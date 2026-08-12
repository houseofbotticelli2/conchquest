import React, { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

type Stage =
  | { name: 'checkingLink' }
  | { name: 'request'; notice?: string }
  | { name: 'sent'; email: string }
  | { name: 'new' }
  | { name: 'submittingNew' }
  | { name: 'done' };

const MIN_PASSWORD_LENGTH = 8;

function passwordStrength(value: string): number {
  let score = 0;
  if (value.length >= 8) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/[^a-zA-Z0-9]/.test(value)) score++;
  return score;
}

const STRENGTH_COLORS = ['#E8E6E0', '#D85A30', '#E8A93A', '#1D9E75'];

// Supabase's recovery email links here with the session tokens in the URL
// hash (or, for a link that's already expired/consumed, an #error=...
// fragment instead) -- supabase-js's detectSessionInUrl (on by default)
// parses that on load and fires PASSWORD_RECOVERY once the recovery
// session is actually established, which is what this waits for rather
// than assuming the link was valid just because the page loaded.
export function ResetPasswordForm() {
  const [stage, setStage] = useState<Stage>({ name: 'checkingLink' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const urlError = hashParams.get('error_description');
    if (urlError) {
      setStage({ name: 'request', notice: decodeURIComponent(urlError.replace(/\+/g, ' ')) });
      return;
    }
    if (!window.location.hash) {
      setStage({ name: 'request' });
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryEmail(session?.user.email ?? null);
        setStage({ name: 'new' });
      }
    });

    // Covers the case where the PASSWORD_RECOVERY event already fired
    // before this listener was attached (a real race on fast page loads).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setRecoveryEmail(session.user.email ?? null);
        setStage((s) => (s.name === 'checkingLink' ? { name: 'new' } : s));
      }
    });

    const timeout = setTimeout(() => {
      setStage((s) =>
        s.name === 'checkingLink'
          ? { name: 'request', notice: 'That link is invalid or has expired. Request a new one below.' }
          : s
      );
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleRequestSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    try {
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (requestError) {
        setError(requestError.message);
        return;
      }
      setStage({ name: 'sent', email });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  async function handleResend() {
    if (stage.name !== 'sent' || resendCooldown) return;
    setResendCooldown(true);
    try {
      await supabase.auth.resetPasswordForEmail(stage.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      // Best-effort resend -- the "sent" screen's copy already covers the
      // case where nothing arrives, so a thrown error here isn't worth
      // surfacing as its own message.
    }
    setTimeout(() => setResendCooldown(false), 2000);
  }

  async function handleNewPasswordSubmit(e: FormEvent<HTMLFormElement>) {
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

    setStage({ name: 'submittingNew' });
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        setStage({ name: 'new' });
        return;
      }
      setStage({ name: 'done' });
    } catch (err) {
      // A thrown (not just resolved-with-error) exception here would
      // otherwise leave the button stuck on "Updating..." forever with no
      // visible feedback at all -- surface it and let the user retry.
      setError(err instanceof Error ? err.message : 'Something went wrong updating your password. Please try again.');
      setStage({ name: 'new' });
    }
  }

  if (stage.name === 'checkingLink') {
    return (
      <div className="card">
        <p className="sub">Checking your reset link...</p>
      </div>
    );
  }

  if (stage.name === 'request') {
    return (
      <div className="card">
        <div className="card-icon">🔑</div>
        <h1>Reset your password</h1>
        <p className="sub">Enter the email on your account and we'll send a link to set a new password.</p>
        {stage.notice && <p className="notice">{stage.notice}</p>}
        <form onSubmit={handleRequestSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <p className="notice">{error}</p>}
          <button className="btn" type="submit">
            Send reset link
          </button>
        </form>
      </div>
    );
  }

  if (stage.name === 'sent') {
    return (
      <div className="card">
        <div className="success-check">✓</div>
        <h1>Check your email</h1>
        <p className="sub">
          If an account exists for <strong>{stage.email}</strong>, a password reset link is on its way. It expires
          in 60 minutes.
        </p>
        <button className="btn-secondary" type="button" onClick={handleResend} disabled={resendCooldown}>
          {resendCooldown ? 'Link resent' : 'Resend link'}
        </button>
      </div>
    );
  }

  if (stage.name === 'done') {
    return (
      <div className="card">
        <div className="success-check">✓</div>
        <h1>Password updated</h1>
        <p className="sub">Your password has been changed. Head back to the Conchquest app and log in with your new password.</p>
      </div>
    );
  }

  const strength = passwordStrength(password);

  return (
    <div className="card">
      <div className="card-icon">🔑</div>
      <h1>Set a new password</h1>
      <p className="sub">
        Choose a new password{recoveryEmail ? (
          <>
            {' '}
            for <strong>{recoveryEmail}</strong>
          </>
        ) : null}
        .
      </p>
      <form onSubmit={handleNewPasswordSubmit}>
        <div className="field">
          <label htmlFor="password">New password</label>
          <input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="strength" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} style={{ background: i < strength ? STRENGTH_COLORS[Math.min(strength - 1, 3)] : '#E8E6E0' }} />
            ))}
          </div>
          <div className="hint">Use 8+ characters with a mix of letters and numbers.</div>
        </div>
        <div className="field">
          <label htmlFor="confirm">Confirm new password</label>
          <input
            id="confirm"
            type="password"
            placeholder="Re-enter your password"
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="notice">{error}</p>}
        <button className="btn" type="submit" disabled={stage.name === 'submittingNew'}>
          {stage.name === 'submittingNew' ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
