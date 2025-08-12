// src/hooks/useHasClub.ts
import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { db as firebaseDb } from "@/lib/firebase";

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

    const checkClub = async () => {
      if (!user) {
        setState({ loading: false, hasClub: false, clubId: null });
        return;
      }

      setState((s) => ({ ...s, loading: true }));

      try {
        // Buscamos en la colección "club" documentos cuyo id_usuario === user.uid
        const q = query(
          collection(firebaseDb, "club"),
          where("uid_usersWeb", "==",user.uid)
        );
        const snap = await getDocs(q);

        if (cancelled) return;

        if (!snap.empty) {
          // Tomamos el primer club encontrado
          const doc = snap.docs[0];
          setState({
            loading: false,
            hasClub: true,
            clubId: doc.id,
          });
        } else {
          setState({
            loading: false,
            hasClub: false,
            clubId: null,
          });
        }
      } catch (err) {
        console.error("Error comprobando club:", err);
        if (!cancelled) {
          setState({ loading: false, hasClub: false, clubId: null });
        }
      }
    };

    checkClub();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return state;
}