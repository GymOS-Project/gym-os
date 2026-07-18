import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase URL or Service Role Key is not set in the environment variables.');
}

const resolvedSupabaseUrl = supabaseUrl;
const resolvedSupabaseServiceKey = supabaseServiceKey;

function createSupabaseServerClient() {
  return createClient(resolvedSupabaseUrl, resolvedSupabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = createSupabaseServerClient();

export function createSupabaseAuthClient() {
  return createSupabaseServerClient();
}
