// Supabase's recovery link (opened via Universal Links once #94 lands)
// carries the session as a URL fragment, e.g.
// https://www.conchquest.app/reset-password#access_token=...&refresh_token=...&type=recovery
// -- the same format web/'s ResetPasswordForm parses via window.location.hash.
// Mobile has no window.location, so this parses the raw URL string instead.
export interface ParsedAuthDeepLink {
  type: string;
  accessToken: string;
  refreshToken: string;
}

export function parseAuthDeepLink(url: string): ParsedAuthDeepLink | null {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return null;

  const params = new URLSearchParams(url.slice(hashIndex + 1));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const type = params.get('type');
  if (!accessToken || !refreshToken || !type) return null;

  return { type, accessToken, refreshToken };
}
