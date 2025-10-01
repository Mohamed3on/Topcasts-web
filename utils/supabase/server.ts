import { Database } from '@/app/api/types/supabase';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'placeholder-key';

console.log('[Supabase Init] URL:', supabaseUrl.substring(0, 30) + '...');
console.log('[Supabase Init] Key exists:', !!process.env.SUPABASE_SERVICE_KEY);
console.log('[Supabase Init] Using placeholder?', supabaseUrl.includes('placeholder'));

export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export type SupabaseAdmin = typeof supabaseAdmin;
