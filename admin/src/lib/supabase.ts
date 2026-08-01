import { createClient } from '@supabase/supabase-js';

// Public-facing project URL and anon key -- same values used by the mobile
// app (mobile/src/lib/supabase.ts), safe to embed client-side.
const SUPABASE_URL = 'https://qjaafozocrvrmcjqkihz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_anx_MkqKqM0drTW1K_iKzA_gz-nOhq7';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
