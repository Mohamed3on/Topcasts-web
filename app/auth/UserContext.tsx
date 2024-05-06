'use client';

import { User } from '@/app/supabase';
import { supabase } from '@/utils/supabase/client';
import { createContext, useContext, useEffect, useState } from 'react';

const UserContext = createContext<User | null>(null);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (!error) {
        setUser(user);
      }
    };
    fetchUser();
  }, []);

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
