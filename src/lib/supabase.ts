import { createClient } from "@supabase/supabase-js";
// (Opcional) si tipaste tu DB:
// import type { Database } from "@/types/supabase"; 

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anon) {
  // para detectar fácilmente si no se cargaron las envs
  // eslint-disable-next-line no-console
  console.error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient/*<Database>*/(url, anon, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
  },
});