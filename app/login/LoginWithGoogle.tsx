'use client';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';

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
    <Button onClick={signIn} className='text-center active:bg-primary/80'>
      Sign in with Google
    </Button>
  );
};
