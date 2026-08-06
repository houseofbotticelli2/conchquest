import { createClient } from '@supabase/supabase-js';

// Public-facing project URL and anon key -- same values used by the mobile
// app (mobile/src/lib/supabase.ts) and admin console, safe to embed
// client-side. detectSessionInUrl (default true) is what lets this page
// automatically pick up the recovery token from the URL Supabase's reset
// email links to.
const SUPABASE_URL = 'https://qjaafozocrvrmcjqkihz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_anx_MkqKqM0drTW1K_iKzA_gz-nOhq7';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
