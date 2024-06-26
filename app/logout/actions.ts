'use server';
import { createClient } from '@/utils/supabase/ssr';
import { revalidatePath } from 'next/cache';

export const logout = async () => {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error logging out:', error);
    return null;
  }
  revalidatePath('/', 'layout');
  return true;
};
