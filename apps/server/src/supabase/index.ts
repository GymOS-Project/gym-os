import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseServiceKey);

let cachedClient: SupabaseClient | null = null;

function createSupabaseServerClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase URL or Service Role Key is not set in the environment variables.");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function getSupabaseClient() {
  if (cachedClient) return cachedClient;
  cachedClient = createSupabaseServerClient();
  return cachedClient;
}

export const supabase: SupabaseClient = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getSupabaseClient();
      const value = (client as any)[prop as any];
      if (typeof value === "function") return value.bind(client);
      return value;
    },
  }
) as unknown as SupabaseClient;

export function createSupabaseAuthClient() {
  return getSupabaseClient();
}
