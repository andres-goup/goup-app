import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { DBUser } from "@/types/auth";

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  dbUser: DBUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);