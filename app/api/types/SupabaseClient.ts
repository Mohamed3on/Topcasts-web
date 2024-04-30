import { Database } from '@/app/api/types/supabase';
import { createServerClient } from '@supabase/ssr';

export type SupabaseClient = ReturnType<typeof createServerClient<Database>>;
