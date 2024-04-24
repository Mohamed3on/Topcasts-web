'use server';
import { createClient } from '@/utils/supabase/server';

export const logout = async () => {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error logging out:', error);
    return null;
  }
  return true;
};
