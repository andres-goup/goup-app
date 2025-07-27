// src/components/UserClub.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";

type Club = {
  id_club?: string; // si tu PK es id
  id?: string;      // si usas id
  nombre: string;
  descripcion: string | null;
  direccion: string | null;
  ciudad: string | null;
  pais: string | null;
  telefono: string | null;
  email: string | null;
  sitio_web: string | null;
  instagram: string | null;
  imagen: string | null; // avatar
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

export default function UserClub() {
  const { user } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClub = async () => {
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

      // 2) traer único club del usuario
      const { data, error } = await supabase
        .from("club")
        .select(
          "id_club, id_usuario, nombre, descripcion, direccion, ciudad, pais, telefono, email, sitio_web, instagram, imagen, banner, accesibilidad, estacionamiento, guardarropia, terraza, fumadores, wi_fi, ambientes, banos"
        )
        .eq("id_usuario", id_usuario)
        .maybeSingle();

      if (error) {
        console.error("Error obteniendo club:", error);
        setLoading(false);
        return;
      }

      setClub((data as Club) ?? null);
      setLoading(false);
    };

    fetchClub();
  }, [user]);

  if (loading) {
    return <p className="text-white">Cargando mi club...</p>;
  }

  if (!club) {
    return (
      <div className="text-white/80 bg-neutral-900/60 border border-white/10 rounded-xl p-6">
        <p className="mb-4">
          Aún no has creado tu club. Puedes publicarlo para gestionar tu perfil y datos de contacto.
        </p>
        <Link
          to="/club/crear"
          className="inline-flex items-center justify-center rounded-md bg-[#8e2afc] hover:bg-[#7b1fe0] px-4 py-2 text-sm font-semibold"
        >
          Crear club
        </Link>
      </div>
    );
  }

  const clubId = (club.id_club ?? club.id) as string;

  const services = [
    { k: "accesibilidad", label: "Accesibilidad" },
    { k: "estacionamiento", label: "Estacionamiento" },
    { k: "guardarropia", label: "Guardarropía" },
    { k: "terraza", label: "Terraza" },
    { k: "fumadores", label: "Zona fumadores" },
    { k: "wi_fi", label: "Wi-Fi" },
  ].filter((s) => (club as any)[s.k]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-neutral-900 rounded-lg overflow-hidden border border-white/10 shadow-md">
        {/* Banner */}
        {club.banner ? (
          <div className="relative">
            <img src={club.banner} alt="banner" className="w-full h-48 object-cover" />
            {/* Avatar flotante */}
            <div className="absolute -bottom-10 left-6">
              {club.imagen ? (
                <img
                  src={club.imagen}
                  alt={club.nombre}
                  className="h-20 w-20 rounded-full object-cover border-4 border-[#8e2afc]"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center text-xl border-4 border-[#8e2afc]">
                  {club.nombre?.[0]?.toUpperCase() ?? "C"}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-48 bg-white/10" />
        )}

        <div className="p-6 pt-12 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-2xl font-extrabold">{club.nombre}</h3>
              <p className="text-white/70 text-sm">
                {[club.ciudad, club.pais].filter(Boolean).join(", ")}
              </p>
            </div>
            <Link
              to={`/dashboard/mi-club`}
              className="inline-flex items-center justify-center rounded-md bg-[#8e2afc] hover:bg-[#7b1fe0] px-4 py-2 text-sm font-semibold"
            >
              Ir a mi club
            </Link>
          </div>

          {club.descripcion && (
            <p className="text-white/80 mt-4">{club.descripcion}</p>
          )}

          {/* Servicios */}
          {services.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {services.map((s) => (
                <span
                  key={s.k}
                  className="text-xs px-2 py-1 rounded bg-[#8e2afc]/20 text-[#cbb3ff] border border-[#8e2afc]/30"
                >
                  {s.label}
                </span>
              ))}
            </div>
          )}

          {/* Datos rápidos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6 text-sm text-white/80">
            {club.direccion && (
              <Info label="Dirección" value={club.direccion} />
            )}
            {club.telefono && <Info label="Teléfono" value={club.telefono} />}
            {club.email && <Info label="Email" value={club.email} />}
            {club.sitio_web && <Info label="Sitio web" value={club.sitio_web} />}
            {club.instagram && <Info label="Instagram" value={club.instagram} />}
            {typeof club.ambientes === "number" && (
              <Info label="Ambientes" value={String(club.ambientes)} />
            )}
            {typeof club.banos === "number" && (
              <Info label="Baños" value={String(club.banos)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/5 border border-white/10 px-3 py-2">
      <p className="text-white/60 text-xs">{label}</p>
      <p className="text-white break-words">{value}</p>
    </div>
  );
}