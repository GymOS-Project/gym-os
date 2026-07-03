import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  admins: {
    id: string;
    user_id: string;
    gym_name: string;
    owner_name: string;
    phone: string | null;
    address: string | null;
    logo_url: string | null;
    created_at: string;
    updated_at: string;
  };
};
