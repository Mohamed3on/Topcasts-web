import { createContext, useContext } from 'react';
import { type User } from '@supabase/supabase-js';
export interface AuthContextValue {
  user: User | null;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
});

export const useAuth = () => useContext(AuthContext);
