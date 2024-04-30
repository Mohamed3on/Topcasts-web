'use client';
import { User } from '@/app/supabase';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

export const useUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    fetchUser();
  }, [supabase.auth]);

  return user;
};
