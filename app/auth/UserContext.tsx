'use client';

import { createContext, useContext } from 'react';

export type User = {
  avatar_url: string | null;
  email: string;
  id: string;
  name: string | null;
  updated_at: string | null;
  username: string;
  website: string | null;
};
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
