// src/components/UserEvents.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";

type Evento = {
  id_evento: string;
  id_usuario?: string;
  nombre: string;
  tipo: string;
  fecha: string; // 'YYYY-MM-DD' (asumido)
  horaInicio?: string | null; // 'HH:mm' (asumido)
  horaCierre?: string | null;
  flyer?: string | null;
  imgSec?: string | null;
  desc?: string | null;
  generos: string[] | string | null; // puede venir como array o string
};

const normalizeGeneros = (g: Evento["generos"]): string[] => {
  if (Array.isArray(g)) return g;
  if (typeof g === "string") {
    const bySep = g.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
    if (bySep.length > 1) return bySep;
    return g.trim() ? [g.trim()] : [];
  }
  return [];
};

// Combina fecha + horaInicio para comparar
function getStartDate(e: Evento): Date {
  const d = e.fecha ?? "";
  const t = e.horaInicio ?? "00:00";
  // Si fecha ya es ISO con tiempo, intenta desambiguar
  if (d.includes("T")) return new Date(d);
  return new Date(`${d}T${t}`);
}

export default function UserEvents() {
  const { user } = useAuth();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    const fetchEventos = async () => {
      if (!user) return;

      // 1) id_usuario
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

      // 2) eventos del usuario
      const { data: eventosData, error: eventosError } = await supabase
        .from("evento")
        .select("id_evento, id_usuario, nombre, fecha, tipo, flyer, imgSec, desc, horaInicio, horaCierre, generos")
        .eq("id_usuario", id_usuario);

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

  const now = new Date();

  const { upcoming, past } = useMemo(() => {
    const upcoming: Evento[] = [];
    const past: Evento[] = [];
    for (const e of eventos) {
      const start = getStartDate(e);
      if (isNaN(start.getTime())) {
        // Si por alguna razón no se puede parsear, mándalo a "past" para no bloquear
        past.push(e);
      } else {
        if (start > now) upcoming.push(e);
        else past.push(e);
      }
    }
    // Ordenes amistosas
    upcoming.sort((a, b) => +getStartDate(a) - +getStartDate(b)); // más próximos primero
    past.sort((a, b) => +getStartDate(b) - +getStartDate(a)); // últimos realizados primero
    return { upcoming, past };
  }, [eventos]);

  const list = tab === "upcoming" ? upcoming : past;

  if (loading) return <p className="text-white">Cargando eventos...</p>;
  if (eventos.length === 0)
    return <p className="text-white/80">No tienes eventos registrados.</p>;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-lg border border-white/10 w-fit">
        <button
          onClick={() => setTab("upcoming")}
          className={`px-4 py-2 rounded-md text-sm transition ${
            tab === "upcoming"
              ? "bg-[#8e2afc] text-white"
              : "text-white/80 hover:text-white"
          }`}
        >
          Próximos ({upcoming.length})
        </button>
        <button
          onClick={() => setTab("past")}
          className={`px-4 py-2 rounded-md text-sm transition ${
            tab === "past"
              ? "bg-[#8e2afc] text-white"
              : "text-white/80 hover:text-white"
          }`}
        >
          Realizados ({past.length})
        </button>
      </div>

      {/* Nota de sección */}
      <p className="text-white/70 mb-4">
        {tab === "upcoming"
          ? "Eventos posteriores a la fecha/hora actual."
          : "Eventos que ya se realizaron."}
      </p>

      {/* Grid de cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((evento) => {
          const generosList = normalizeGeneros(evento.generos);
          const start = getStartDate(evento);
          const fechaLegible = isNaN(start.getTime())
            ? evento.fecha
            : start.toLocaleString(); // fecha + hora amigable

          return (
            <div
              key={evento.id_evento}
              className="bg-neutral-900 rounded-lg overflow-hidden border border-white/10 shadow-md hover:shadow-[#8e2afc]/20 transition"
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
                <h3 className="text-lg font-semibold">{evento.nombre}</h3>
                <p className="text-sm text-white/70">
                  <span className="font-medium">Tipo:</span> {evento.tipo}
                </p>
                <p className="text-sm text-white/70">
                  <span className="font-medium">Fecha:</span> {fechaLegible}
                </p>

                {evento.desc && (
                  <p className="text-sm text-white/70 mt-1 line-clamp-2">{evento.desc}</p>
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

                <div className="pt-3">
                  <Link
                    to={`/mis-eventos/${evento.id_evento}`}
                    className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-[#8e2afc] hover:bg-[#7b1fe0] text-sm"
                  >
                    Ir a mi evento
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mensajes vacíos por sección */}
      {list.length === 0 && (
        <div className="text-white/70 mt-6">
          {tab === "upcoming"
            ? "No tienes eventos próximos."
            : "No tienes eventos realizados."}
        </div>
      )}
    </div>
  );
}