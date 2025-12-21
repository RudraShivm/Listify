import { createClient } from '@supabase/supabase-js';

// Environment variables for Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Validates that Supabase is properly configured.
 * Requires both strings to be present and the URL to look like a URL.
 */
export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http')
);

/**
 * The Supabase client instance.
 * Exported as null if not configured to prevent immediate "supabaseUrl is required" crash.
 */
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null as any;
