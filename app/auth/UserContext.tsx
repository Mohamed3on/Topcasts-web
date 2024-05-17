'use client';

import type { AuthUser as User } from '@supabase/supabase-js';

import { createContext, useContext } from 'react';

const UserContext = createContext<User | null>(null);

export const UserProvider = ({
  children,
  user,
}: {
  children: React.ReactNode;
  user: User | null;
}) => {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
};

export const useUser: () => User | null = () => useContext(UserContext);
