import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

function normalizeSupabaseUrl(value?: string) {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withScheme);
    return parsed.origin;
  } catch {
    return null;
  }
}

const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseServiceKey);

let cachedClient: SupabaseClient | null = null;

function createSupabaseServerClient() {
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is missing or invalid.");
  }

  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing.");
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
  return createSupabaseServerClient();
}
