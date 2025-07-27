// src/pages/ClubDetail.tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type Club = {
  id_club?: string;
  id?: string;
  nombre: string;
  descripcion: string | null;
  direccion: string | null;
  ciudad: string | null;
  pais: string | null;
  telefono: string | null;
  email: string | null;
  sitio_web: string | null;
  instagram: string | null;
  imagen: string | null;
  banner: string | null;
  accesibilidad: boolean | null;
  estacionamiento: boolean | null;
  guardarropia: boolean | null;
  terraza: boolean | null;
  fumadores: boolean | null;
  wi_fi: boolean | null;
  ambientes: number | null;
  banos: number | null;
};

export default function ClubDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase
        .from("club")
        .select(
          "id_club, id, nombre, descripcion, direccion, ciudad, pais, telefono, email, sitio_web, instagram, imagen, banner, accesibilidad, estacionamiento, guardarropia, terraza, fumadores, wi_fi, ambientes, banos"
        )
        .or(`id_club.eq.${id},id.eq.${id}`) // soporta ambas PK
        .maybeSingle();

      if (error) {
        console.error(error);
      }
      setClub((data as Club) ?? null);
      setLoading(false);
    };
    run();
  }, [id]);

  if (loading) return <p className="text-white p-6">Cargando club...</p>;
  if (!club) return <p className="text-white p-6">Club no encontrado.</p>;

  const services = [
    { k: "accesibilidad", label: "Accesibilidad" },
    { k: "estacionamiento", label: "Estacionamiento" },
    { k: "guardarropia", label: "Guardarropía" },
    { k: "terraza", label: "Terraza" },
    { k: "fumadores", label: "Zona fumadores" },
    { k: "wi_fi", label: "Wi-Fi" },
  ].filter((s) => (club as any)[s.k]);

  return (
    <main className="min-h-screen text-white">
      {/* Hero */}
      <div className="relative">
        {club.banner ? (
          <img src={club.banner} alt="banner" className="w-full h-64 object-cover" />
        ) : (
          <div className="w-full h-64 bg-white/10" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-6 right-6 flex items-end gap-4">
          {club.imagen ? (
            <img
              src={club.imagen}
              alt={club.nombre}
              className="h-24 w-24 rounded-full object-cover border-4 border-[#8e2afc]"
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-white/10 flex items-center justify-center text-3xl border-4 border-[#8e2afc]">
              {club.nombre?.[0]?.toUpperCase() ?? "C"}
            </div>
          )}
          <div className="pb-1">
            <h1 className="text-3xl font-extrabold">{club.nombre}</h1>
            <p className="text-white/70">
              {[club.ciudad, club.pais].filter(Boolean).join(", ")}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <Link to="/dashboard/club" className="text-white/70 hover:text-white text-sm underline">
            ← Volver a Mi club
          </Link>
        </div>

        {club.descripcion && (
          <section className="space-y-2">
            <h2 className="text-xl font-bold">Descripción</h2>
            <p className="text-white/80">{club.descripcion}</p>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-bold">Información</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <Info label="Dirección" value={club.direccion} />
            <Info label="Teléfono" value={club.telefono} />
            <Info label="Email" value={club.email} />
            <Info label="Sitio web" value={club.sitio_web} />
            <Info label="Instagram" value={club.instagram} />
            <Info label="Ambientes" value={club.ambientes != null ? String(club.ambientes) : ""} />
            <Info label="Baños" value={club.banos != null ? String(club.banos) : ""} />
          </div>
        </section>

        {services.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-bold">Servicios</h2>
            <div className="flex flex-wrap gap-2">
              {services.map((s) => (
                <span
                  key={s.k}
                  className="text-xs px-2 py-1 rounded bg-[#8e2afc]/20 text-[#cbb3ff] border border-[#8e2afc]/30"
                >
                  {s.label}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="rounded-md bg-white/5 border border-white/10 px-3 py-2">
      <p className="text-white/60 text-xs">{label}</p>
      <p className="text-white break-words">{value}</p>
    </div>
  );
}