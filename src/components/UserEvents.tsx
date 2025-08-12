// src/components/UserEvents.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  DocumentData,
  Query,
} from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { db as firebaseDb } from "@/lib/firebase";

type Evento = {
  id_evento: string;
  uid_usersWeb: string;
  nombre: string;
  tipo: string;
  fecha: string; // 'YYYY-MM-DD'
  horaInicio?: string | null;
  horaCierre?: string | null;
  flyer?: string | null;
  imgSec?: string | null;
  desc?: string | null;
  generos: string[] | string | null;
};

const normalizeGeneros = (g: Evento["generos"]): string[] => {
  if (Array.isArray(g)) return g;
  if (typeof g === "string") {
    const bySep = g
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return bySep.length > 0 ? bySep : [];
  }
  return [];
};

function getStartDate(e: Evento): Date {
  const d = e.fecha;
  const t = e.horaInicio ?? "00:00";
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

      setLoading(true);
      try {
        // 1) Referenciamos la colección directamente sobre firebaseDb
        const eventosCol = collection(firebaseDb, "Eventos");
        // 2) Construimos la query
        const q: Query = query(
          eventosCol,
          where("uid_usersWeb", "==", "/usersWeb/"+user.uid)
        );
        // 3) Ejecutamos
        const snap = await getDocs(q);

        const events: Evento[] = snap.docs.map((doc) => {
          const data = doc.data() as DocumentData;
          return {
            id_evento: doc.id,
            uid_usersWeb: data.uid,
            nombre: data.nombre,
            tipo: data.tipo,
            fecha: data.fecha,
            horaInicio: data.horaInicio ?? null,
            horaCierre: data.horaCierre ?? null,
            flyer: data.flyer ?? null,
            imgSec: data.imgSec ?? null,
            desc: data.desc ?? null,
            generos: data.generos ?? null,
          };
        });

        setEventos(events);
      } catch (err) {
        console.error("Error cargando eventos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventos();
  }, [user]);

  const now = new Date();
  const { upcoming, past } = useMemo(() => {
    const up: Evento[] = [];
    const pa: Evento[] = [];

    for (const e of eventos) {
      const start = getStartDate(e);
      if (isNaN(start.getTime()) || start <= now) {
        pa.push(e);
      } else {
        up.push(e);
      }
    }

    up.sort((a, b) => getStartDate(a).getTime() - getStartDate(b).getTime());
    pa.sort((a, b) => getStartDate(b).getTime() - getStartDate(a).getTime());

    return { upcoming: up, past: pa };
  }, [eventos]);

  const list = tab === "upcoming" ? upcoming : past;

  if (loading) {
    return <p className="text-white">Cargando eventos...</p>;
  }
  if (eventos.length === 0) {
    return <p className="text-white/80">No tienes eventos registrados.</p>;
  }

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

      <p className="text-white/70 mb-4">
        {tab === "upcoming"
          ? "Eventos posteriores a la fecha/hora actual."
          : "Eventos que ya se realizaron."}
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((evento) => {
          const generosList = normalizeGeneros(evento.generos);
          const start = getStartDate(evento);
          const fechaLegible = isNaN(start.getTime())
            ? evento.fecha
            : start.toLocaleString();

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
                  <p className="text-sm text-white/70 mt-1 line-clamp-2">
                    {evento.desc}
                  </p>
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