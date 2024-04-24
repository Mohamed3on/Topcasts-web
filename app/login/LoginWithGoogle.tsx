'use client';
import { createClient } from '@/utils/supabase/client';
import React from 'react';

export const LoginWithGoogle = () => {
  const signIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  };
  return (
    <button
      onClick={signIn}
      className='w-full text-white bg-gray-600 hover:bg-gray-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-gray-600 dark:hover:bg-gray-700 dark:focus:ring-primary-800'
    >
      Sign in with Google
    </button>
  );
};
