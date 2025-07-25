import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import type { DBUser } from "@/types/auth";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  dbUser: DBUser | null;
  rol: string | null;
  loading: boolean;
  signOut: () => void;
  signInWithGoogle: () => Promise<void>;
};

// ✅ solo UNA declaración del contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DBUser | null>(null);
  const [rol, setRol] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Obtener sesión y usuario
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user || null);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
    });

    getSession().finally(() => setLoading(false));

    return () => subscription.unsubscribe();
  }, []);

  // Obtener usuario desde la base de datos
  useEffect(() => {
    const fetchDbUser = async () => {
      if (!user) {
        setDbUser(null);
        setRol(null);
        return;
      }

      const { data, error } = await supabase
        .from("usuario")
        .select("*")
        .eq("auth_user_id", user.id)
        .single();

      if (error) {
        console.error("Error obteniendo usuario de DB:", error);
        setDbUser(null);
        setRol(null);
      } else {
        setDbUser(data);
        setRol(data.rol || null);
      }
    };

    fetchDbUser();
  }, [user]);

  // Cerrar sesión
  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setDbUser(null);
    setRol(null);
  };

  // Iniciar sesión con Google
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) console.error("Error al iniciar sesión con Google:", error);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        dbUser,
        rol,
        loading,
        signOut,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook para consumir el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un <AuthProvider>");
  }
  return context;
};