// src/hooks/useHasClub.ts
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";

type State = { loading: boolean; hasClub: boolean; clubId: string | null };

export function useHasClub(): State {
  const { user } = useAuth();
  const [state, setState] = useState<State>({
    loading: !!user,
    hasClub: false,
    clubId: null,
  });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user) {
        setState({ loading: false, hasClub: false, clubId: null });
        return;
      }

      // 1) obtener id_usuario desde auth_user_id
      const { data: usuario } = await supabase
        .from("usuario")
        .select("id_usuario")
        .eq("auth_user_id", user.id)
        .single();

      if (!usuario) {
        if (!cancelled) setState({ loading: false, hasClub: false, clubId: null });
        return;
      }

      // 2) saber si tiene club
      const { data: club } = await supabase
        .from("club")
        .select("id_club, id_usuario")
        .eq("id_usuario", usuario.id_usuario)
        .maybeSingle();

      if (cancelled) return;

      if (club) {
        const id = (club as any).id_club ?? (club as any).id ?? null;
        setState({ loading: false, hasClub: true, clubId: id });
      } else {
        setState({ loading: false, hasClub: false, clubId: null });
      }
    };

    run();
    return () => { cancelled = true; };
  }, [user]);

  return state;
}