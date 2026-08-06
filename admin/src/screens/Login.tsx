import React, { useState } from 'react';
import { login } from '../lib/api';
import { useAuth } from '../lib/AuthProvider';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    }
    setSubmitting(false);
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Conchquest Admin</h1>
        <div className="desc">Sign in with your Conchquest account. Admin access is granted separately -- signing in doesn't guarantee entry.</div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="form-input"
              style={{ fontFamily: 'inherit' }}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="form-input"
              style={{ fontFamily: 'inherit' }}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="modal-error">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
