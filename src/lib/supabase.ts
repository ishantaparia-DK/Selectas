import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Set these in .env (see .env.example). The anon key is designed to be public: what each
// signed-in user can read or change is decided by row level security in the database.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isConfigured = /^https:\/\/.+/.test(url) && anonKey.length > 20;

export const supabase = createClient(url || 'https://not-configured.invalid', anonKey || 'not-configured', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
