import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import type { DBUser } from "@/types/auth";
import { AuthContext } from "./AuthContext";

type Props = { children: ReactNode };

export default function AuthProvider({ children }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDBUser] = useState<DBUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, _session) => {
      setSession(_session);
      setUser(_session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setDBUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("ensure_usuario", {
        p_auth_user_id: user.id,
        p_email: user.email,
        p_nombre: user.user_metadata?.full_name ?? null,
      });
      if (error) console.error(error);
      if (!cancelled) setDBUser((data as DBUser) ?? null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setDBUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, user, dbUser, loading, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
