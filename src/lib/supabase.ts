import { createClient } from '@supabase/supabase-js';

// Fallback chain: Check Vite env first, then check global process/window env if Cloudflare injects it there
const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : '') || 
  'https://rfygfubelasitcuoshrk.supabase.co'; // Hardcode your URL directly as a safe safety net!

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : '');

if (!supabaseAnonKey) {
  console.error("CRITICAL: Supabase Anon Key is missing from the environment configuration!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey || '');
