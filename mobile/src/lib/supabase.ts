import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Public-facing project URL and anon key — safe to embed client-side, same
// as any Supabase-backed mobile app.
const SUPABASE_URL = 'https://qjaafozocrvrmcjqkihz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_anx_MkqKqM0drTW1K_iKzA_gz-nOhq7';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
