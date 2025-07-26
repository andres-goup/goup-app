// src/components/UserEvents.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";

type Evento = {
  id_evento: string;
  nombre: string;
  tipo: string;
  fecha: string;                // ISO o date string
  flyer?: string | null;
  horaInicio?: string | null;
  horaCierre?: string | null;
  desc?: string | null;
  generos: string[] | string | null; // <-- admite array o string (legado)
};

// Convierte lo que venga a string[]
const normalizeGeneros = (g: Evento["generos"]): string[] => {
  if (Array.isArray(g)) return g;

  if (typeof g === "string") {
    // 1) Si viene separado por coma/; / |, lo partimos
    const bySeparators = g.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
    if (bySeparators.length > 1) return bySeparators;

    // 2) Si viene junto (ej: "poptechnosalsa"), lo dejamos como un solo tag.
    //    (Opcional: podrías intentar heurísticas por mayúsculas, pero es frágil)
    return g.trim() ? [g.trim()] : [];
  }

  return [];
};

export default function UserEvents() {
  const { user } = useAuth();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEventos = async () => {
      if (!user) return;

      // 1) id_usuario desde auth_user_id
      const { data: usuarioData, error: userError } = await supabase
        .from("usuario")
        .select("id_usuario")
        .eq("auth_user_id", user.id)
        .single();

      if (userError || !usuarioData) {
        console.error("Error obteniendo usuario:", userError);
        setLoading(false);
        return;
      }

      const { id_usuario } = usuarioData;

      // 2) Traer eventos del usuario
      const { data: eventosData, error: eventosError } = await supabase
        .from("evento")
        .select("id_evento, nombre, fecha, tipo, flyer, desc, horaInicio, horaCierre, generos")
        .eq("id_usuario", id_usuario)
        .order("fecha", { ascending: false });

      if (eventosError) {
        console.error("Error obteniendo eventos:", eventosError);
        setLoading(false);
        return;
      }

      setEventos((eventosData as Evento[]) || []);
      setLoading(false);
    };

    fetchEventos();
  }, [user]);

  if (loading) {
    return <p className="text-white">Cargando eventos...</p>;
  }

  if (eventos.length === 0) {
    return <p className="text-white/80">No tienes eventos registrados.</p>;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {eventos.map((evento) => {
          const generosList = normalizeGeneros(evento.generos);

          return (
            <div
              key={evento.id_evento}
              className="bg-neutral-900 rounded-lg overflow-hidden border border-white/10 shadow-md"
            >
              {evento.flyer ? (
                <img
                  src={evento.flyer}
                  alt={evento.nombre}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-white/10 flex items-center justify-center text-white/40 text-sm">
                  Sin imagen
                </div>
              )}

              <div className="p-4 text-white space-y-2">
                <h3 className="text-xl font-semibold">{evento.nombre}</h3>

                <p className="text-sm text-white/70">
                  <span className="font-medium">Tipo:</span> {evento.tipo}
                </p>

                <p className="text-sm text-white/70">
                  <span className="font-medium">Fecha:</span> {evento.fecha}
                </p>

                {evento.horaInicio && (
                  <p className="text-sm text-white/70">
                    <span className="font-medium">Inicio:</span> {evento.horaInicio}
                  </p>
                )}

                {evento.horaCierre && (
                  <p className="text-sm text-white/70">
                    <span className="font-medium">Término:</span> {evento.horaCierre}
                  </p>
                )}

                {evento.desc && (
                  <p className="text-sm text-white/70 mt-2">{evento.desc}</p>
                )}

                {generosList.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {generosList.map((g) => (
                      <span
                        key={g}
                        className="text-xs px-2 py-1 rounded bg-[#8e2afc]/20 text-[#cbb3ff] border border-[#8e2afc]/30"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}