import { Router, Response, CookieOptions } from 'express';
import { env, isHttpsDeployment } from '../config/env';

export const adminSessionRouter = Router();

const ACCESS_COOKIE = 'sb_access_token';
const REFRESH_COOKIE = 'sb_refresh_token';
// Supabase doesn't expose a fixed refresh-token lifetime in the grant
// response -- 30 days is just a reasonable "stay signed in" window for an
// internal admin tool, not something Supabase itself guarantees.
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

interface SupabaseTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  error?: string;
  error_description?: string;
  msg?: string;
}

// SameSite=None is required once the admin console and this API are on
// different origins (any real deployment) -- browsers refuse to send a
// SameSite=Lax/Strict cookie cross-site even with credentials:'include'.
// None requires Secure, which in turn requires HTTPS -- true for any Railway
// deployment (even ones not named "production"), but plain local http dev
// needs Lax (and no Secure) or the cookie is dropped entirely.
function cookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isHttpsDeployment,
    sameSite: isHttpsDeployment ? 'none' : 'lax',
    maxAge: maxAgeMs,
    path: '/',
  };
}

function setSessionCookies(res: Response, tokens: SupabaseTokenResponse): void {
  res.cookie(ACCESS_COOKIE, tokens.access_token, cookieOptions(tokens.expires_in * 1000));
  res.cookie(REFRESH_COOKIE, tokens.refresh_token, cookieOptions(REFRESH_COOKIE_MAX_AGE_MS));
}

async function callSupabaseGrant(grantType: 'password' | 'refresh_token', body: Record<string, string>): Promise<SupabaseTokenResponse> {
  const response = await fetch(`${env.supabaseUrl}/auth/v1/token?grant_type=${grantType}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.supabaseAnonKey,
    },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as SupabaseTokenResponse;
  if (!response.ok) {
    throw new Error(data.error_description ?? data.msg ?? 'Supabase authentication failed');
  }
  return data;
}

// Exchanges email/password for a Supabase session server-side, then hands
// the browser only an httpOnly cookie -- the admin console's JS never sees
// the raw access/refresh tokens (unlike the previous client-side
// supabase.auth.signInWithPassword flow).
adminSessionRouter.post('/login', async (req, res) => {
  const { email, password } = (req.body ?? {}) as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  try {
    const tokens = await callSupabaseGrant('password', { email, password });
    setSessionCookies(res, tokens);
    res.json({ ok: true });
  } catch (err) {
    res.status(401).json({ error: err instanceof Error ? err.message : 'Invalid email or password' });
  }
});

// Called by the admin console when a request 401s -- reads the refresh
// cookie (not visible to JS either) and mints a fresh access token without
// asking the user to log in again.
adminSessionRouter.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (!refreshToken) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }

  try {
    const tokens = await callSupabaseGrant('refresh_token', { refresh_token: refreshToken });
    setSessionCookies(res, tokens);
    res.json({ ok: true });
  } catch (err) {
    res.clearCookie(ACCESS_COOKIE, cookieOptions(0));
    res.clearCookie(REFRESH_COOKIE, cookieOptions(0));
    res.status(401).json({ error: err instanceof Error ? err.message : 'Session expired' });
  }
});

adminSessionRouter.post('/logout', async (req, res) => {
  const accessToken = req.cookies?.[ACCESS_COOKIE];
  if (accessToken) {
    // Best-effort -- revokes the refresh token on Supabase's side so it
    // can't be replayed later. Cookies get cleared regardless of whether
    // this call succeeds.
    try {
      await fetch(`${env.supabaseUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: env.supabaseAnonKey, Authorization: `Bearer ${accessToken}` },
      });
    } catch {
      // Ignore -- the cookie clear below is what actually matters locally.
    }
  }

  res.clearCookie(ACCESS_COOKIE, cookieOptions(0));
  res.clearCookie(REFRESH_COOKIE, cookieOptions(0));
  res.json({ ok: true });
});
