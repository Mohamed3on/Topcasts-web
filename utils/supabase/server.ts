import { Database } from '@/app/api/types/supabase';
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export type SupabaseAdmin = typeof supabaseAdmin;
