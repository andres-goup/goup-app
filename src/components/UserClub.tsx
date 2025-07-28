// src/pages/UserClub.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";
import toast from "react-hot-toast";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  RHFInput,
  RHFTextarea,
  RHFSelect,
  RHFFile,
} from "@/components/form/control";

/* =========================
 * Tipos y helpers
 * ========================= */
type DBClub = {
  id_club?: string;
  id?: string;
  id_usuario: string;
  nombre: string;
  descripcion: string | null;
  direccion: string | null;
  ciudad: string | null;
  pais: string | null;
  telefono: string | null;
  email: string | null;
  sitio_web: string | null;
  instagram: string | null;
  imagen: string | null;  // avatar/url
  banner: string | null;  // url
  accesibilidad: boolean | null;
  estacionamiento: boolean | null;
  guardarropia: boolean | null;
  terraza: boolean | null;
  fumadores: boolean | null;
  wi_fi: boolean | null;
  ambientes: number | null;
  banos: number | null;
};

const asSiNo = (b?: boolean | null) => (b ? "Sí" : "No");
const asBool = (v: unknown): boolean => {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").toLowerCase();
  return s === "si" || s === "sí" || s === "true" || s === "1";
};
const asIntOrNull = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* =========================
 * Schema del formulario de edición
 * ========================= */
const editSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional().or(z.literal("")),
  direccion: z.string().optional().or(z.literal("")),
  ciudad: z.string().optional().or(z.literal("")),
  pais: z.string().optional().or(z.literal("")),
  telefono: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  sitio_web: z.string().optional().or(z.literal("")),
  instagram: z.string().optional().or(z.literal("")),

  accesibilidad: z.union([z.boolean(), z.string()]).default("No"),
  estacionamiento: z.union([z.boolean(), z.string()]).default("No"),
  guardarropia: z.union([z.boolean(), z.string()]).default("No"),
  terraza: z.union([z.boolean(), z.string()]).default("No"),
  fumadores: z.union([z.boolean(), z.string()]).default("No"),
  wi_fi: z.union([z.boolean(), z.string()]).default("No"),

  ambientes: z.union([z.coerce.number(), z.string()]).optional().or(z.literal("")),
  banos: z.union([z.coerce.number(), z.string()]).optional().or(z.literal("")),

  // archivos de reemplazo
  imagenFile: z.any().optional().nullable(),
  bannerFile: z.any().optional().nullable(),
});
type EditForm = z.infer<typeof editSchema>;

/* =========================
 * UI helpers
 * ========================= */

/** Botones consistentes con el resto de la app */
const BTN_PRIMARY =
  "inline-flex items-center justify-center rounded-md bg-[#8e2afc] hover:bg-[#7b1fe0] px-4 py-2 text-sm font-semibold disabled:opacity-60 transition " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8e2afc]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black";
const BTN_SECONDARY =
  "inline-flex items-center justify-center px-4 py-2 rounded border border-white/20 hover:bg-white/10 text-sm font-semibold " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-black";
const BTN_GHOST =
  "px-4 py-2 rounded border border-white/20 hover:bg-white/10 transition";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="section-title"> {title} </h2>
      <div className="space-y-4">{children}</div>
    </section>
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

/* =========================
 * Componente principal
 * ========================= */
export default function UserClub() {
  const { user } = useAuth();
  const [club, setClub] = useState<DBClub | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const originalValuesRef = useRef<EditForm | null>(null);

  const methods = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: undefined,
    mode: "onChange",
  });

  // Cargar club del usuario
  useEffect(() => {
    (async () => {
      if (!user) return;
      setLoading(true);

      const { data: usuarioData, error: userError } = await supabase
        .from("usuario")
        .select("id_usuario")
        .eq("auth_user_id", user.id)
        .single();

      if (userError || !usuarioData) {
        console.error(userError);
        setLoading(false);
        return;
      }

      const { id_usuario } = usuarioData;

      const { data, error } = await supabase
        .from("club")
        .select("*")
        .eq("id_usuario", id_usuario)
        .maybeSingle<DBClub>();

      if (error) {
        console.error(error);
        toast.error("Error cargando club");
        setLoading(false);
        return;
      }

      setClub(data ?? null);

      if (data) {
        // defaults
        const defaults: EditForm = {
          nombre: data.nombre ?? "",
          descripcion: data.descripcion ?? "",
          direccion: data.direccion ?? "",
          ciudad: data.ciudad ?? "",
          pais: data.pais ?? "",
          telefono: data.telefono ?? "",
          email: data.email ?? "",
          sitio_web: data.sitio_web ?? "",
          instagram: data.instagram ?? "",

          accesibilidad: asSiNo(data.accesibilidad),
          estacionamiento: asSiNo(data.estacionamiento),
          guardarropia: asSiNo(data.guardarropia),
          terraza: asSiNo(data.terraza),
          fumadores: asSiNo(data.fumadores),
          wi_fi: asSiNo(data.wi_fi),

          ambientes: data.ambientes ?? "",
          banos: data.banos ?? "",

          imagenFile: null,
          bannerFile: null,
        };

        methods.reset(defaults);
        originalValuesRef.current = defaults;
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const clubId = useMemo(() => (club?.id_club ?? club?.id) as string | undefined, [club]);

  /* =========================
   * Subida de imágenes
   * ========================= */
  const uploadImage = async (file: File | null, folder: "avatar" | "banner") => {
    if (!file) return null;
    const path = `${folder}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage
      .from("club")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw new Error(error.message);
    return supabase.storage.from("club").getPublicUrl(path).data.publicUrl;
  };

  /* =========================
   * Acciones edición
   * ========================= */
  const handleCancel = () => {
    if (originalValuesRef.current) methods.reset(originalValuesRef.current);
    setEditMode(false);
  };

  const askSave = () => setConfirmOpen(true);

  const onConfirmSave = methods.handleSubmit(async (values) => {
    if (!club || !clubId) return;
    try {
      setSaving(true);

      const newAvatar = await uploadImage(values.imagenFile as File | null, "avatar");
      const newBanner = await uploadImage(values.bannerFile as File | null, "banner");

      const payload: Partial<DBClub> = {
        nombre: values.nombre,
        descripcion: values.descripcion || null,
        direccion: values.direccion || null,
        ciudad: values.ciudad || null,
        pais: values.pais || null,
        telefono: values.telefono || null,
        email: values.email || null,
        sitio_web: values.sitio_web || null,
        instagram: values.instagram || null,

        accesibilidad: asBool(values.accesibilidad),
        estacionamiento: asBool(values.estacionamiento),
        guardarropia: asBool(values.guardarropia),
        terraza: asBool(values.terraza),
        fumadores: asBool(values.fumadores),
        wi_fi: asBool(values.wi_fi),

        ambientes: asIntOrNull(values.ambientes),
        banos: asIntOrNull(values.banos),

        imagen: newAvatar ?? club.imagen ?? null,
        banner: newBanner ?? club.banner ?? null,
      };

      const { error } = await supabase
        .from("club")
        .update(payload)
        .eq("id_club", clubId);

      if (error) throw new Error(error.message);

      toast.success("Datos guardados");

      const merged: DBClub = { ...(club as DBClub), ...payload };
      setClub(merged);

      const newDefaults: EditForm = {
        ...values,
        imagenFile: null,
        bannerFile: null,
        accesibilidad: asSiNo(payload.accesibilidad),
        estacionamiento: asSiNo(payload.estacionamiento),
        guardarropia: asSiNo(payload.guardarropia),
        terraza: asSiNo(payload.terraza),
        fumadores: asSiNo(payload.fumadores),
        wi_fi: asSiNo(payload.wi_fi),
        ambientes: merged.ambientes ?? "",
        banos: merged.banos ?? "",
      };
      methods.reset(newDefaults);
      originalValuesRef.current = newDefaults;
      setEditMode(false);
      setConfirmOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  });

  /* =========================
   * Render
   * ========================= */
  if (loading) {
    return <div className="p-6 text-white">Cargando mi club…</div>;
  }

  if (!club) {
    return (
      <div className="text-white/80 panel">
        <p className="mb-4">Aún no has creado tu club.</p>
        <Link to="/club/crear" className={BTN_PRIMARY}>
          Crear club
        </Link>
      </div>
    );
  }

  const backHref = "/mis-eventos";

  return (
    <div className="text-white">
      {/* ---------- HERO ---------- */}
      <div className="relative w-full h-[280px] md:h-[360px] overflow-hidden">
        {club.banner ? (
          <>
            <img
              src={club.banner}
              alt="Banner del club"
              className="absolute inset-0 w-full h-full object-cover scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/55 to-black" />
            <div className="absolute inset-0 backdrop-blur-[1px]" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#25123e] via-[#381a63] to-[#8e2afc]" />
        )}

        {/* Avatar flotante (por encima de todo) */}
        <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 flex items-end gap-4 z-20">
          <div className="h-20 w-20 md:h-24 md:w-24 rounded-full overflow-hidden border-4 border-[#8e2afc] shadow-lg">
            {club.imagen ? (
              <img src={club.imagen} alt="Avatar del club" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center bg-white/10 text-xl">
                {club.nombre?.[0]?.toUpperCase() ?? "C"}
              </div>
            )}
          </div>

          <div className="pb-1">
            <h1 className="text-2xl md:text-3xl font-extrabold drop-shadow">{club.nombre}</h1>
            <p className="text-white/80">
              {[club.ciudad, club.pais].filter(Boolean).join(", ")}
            </p>
          </div>
        </div>
      </div>

      {/* ---------- CONTENIDO ---------- */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Acciones superiores */}
        {!editMode && (
          <div className="mb-6 flex items-center justify-between">
            <Link to={backHref} className={BTN_SECONDARY}>
              ← Ir a Mis Eventos
            </Link>
            <button type="button" onClick={() => setEditMode(true)} className={BTN_PRIMARY}>
              Editar club
            </button>
          </div>
        )}

        {!editMode && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Descripción */}
              {club.descripcion && (
                <section className="panel">
                  <h2 className="section-title">Descripción</h2>
                  <p className="text-white/80 leading-relaxed">{club.descripcion}</p>
                </section>
              )}

              {/* Servicios */}
              <section className="panel">
                <h2 className="section-title mb-2">Servicios</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  {club.accesibilidad && <span className="text-xs px-2 py-1 rounded bg-[#8e2afc]/20 text-[#cbb3ff] border border-[#8e2afc]/30">Accesibilidad</span>}
                  {club.estacionamiento && <span className="text-xs px-2 py-1 rounded bg-[#8e2afc]/20 text-[#cbb3ff] border border-[#8e2afc]/30">Estacionamiento</span>}
                  {club.guardarropia && <span className="text-xs px-2 py-1 rounded bg-[#8e2afc]/20 text-[#cbb3ff] border border-[#8e2afc]/30">Guardarropía</span>}
                  {club.terraza && <span className="text-xs px-2 py-1 rounded bg-[#8e2afc]/20 text-[#cbb3ff] border border-[#8e2afc]/30">Terraza</span>}
                  {club.fumadores && <span className="text-xs px-2 py-1 rounded bg-[#8e2afc]/20 text-[#cbb3ff] border border-[#8e2afc]/30">Zona fumadores</span>}
                  {club.wi_fi && <span className="text-xs px-2 py-1 rounded bg-[#8e2afc]/20 text-[#cbb3ff] border border-[#8e2afc]/30">Wi-Fi</span>}
                  {!club.accesibilidad && !club.estacionamiento && !club.guardarropia &&
                   !club.terraza && !club.fumadores && !club.wi_fi && (
                    <span className="text-xs px-2 py-1 rounded bg-[#8e2afc]/20 text-[#cbb3ff] border border-[#8e2afc]/30">No se registraron servicios.</span>
                  )}
                </div>
              </section>

              {/* Galería */}
              <section className="panel">
                <h2 className="section-title mb-3">Galería</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <figure className="rounded-lg overflow-hidden border border-white/10">
                    {club.imagen ? (
                      <img
                        src={club.imagen}
                        alt="Avatar"
                        loading="lazy"
                        decoding="async"
                        className="w-full aspect-[4/3] md:aspect-[16/10] object-cover"
                      />
                    ) : (
                      <div className="w-full h-64 grid place-items-center text-white/40 bg-white/5">
                        Sin avatar
                      </div>
                    )}
                  </figure>
                  <figure className="rounded-lg overflow-hidden border border-white/10">
                    {club.banner ? (
                      <img
                        src={club.banner}
                        alt="Banner"
                        loading="lazy"
                        decoding="async"
                        className="w-full aspect-[4/3] md:aspect-[16/10] object-cover"
                      />
                    ) : (
                      <div className="w-full h-64 grid place-items-center text-white/40 bg-white/5" >
                        Sin banner
                      </div>
                    )}
                  </figure>
                </div>
              </section>
            </div>

            {/* Lateral */}
            <aside className="space-y-6">
              <section className="panel">
                <h3 className="font-semibold text-[#cbb3ff] mb-3">Contacto</h3>
                <div className="space-y-2 text-sm text-white/80">
                  {club.telefono && <Info label="Teléfono" value={club.telefono} />}
                  {club.email && <Info label="Email" value={club.email} />}
                  {club.sitio_web && <Info label="Sitio web" value={club.sitio_web} />}
                  {club.instagram && <Info label="Instagram" value={club.instagram} />}
                </div>
              </section>

              <section className="panel">
                <h3 className="font-semibold text-[#cbb3ff] mb-3">Ubicación</h3>
                <div className="space-y-2 text-sm text-white/80">
                  {club.direccion && <Info label="Dirección" value={club.direccion} />}
                  {[club.ciudad, club.pais].filter(Boolean).join(", ") && (
                    <Info label="Ciudad / País" value={[club.ciudad, club.pais].filter(Boolean).join(", ")} />
                  )}
                </div>
              </section>

              <section className="panel">
                <h3 className="font-semibold text-[#cbb3ff] mb-3">Infraestructura</h3>
                <div className="space-y-2 text-sm text-white/80">
                  {typeof club.ambientes === "number" && <Info label="Ambientes" value={String(club.ambientes)} />}
                  {typeof club.banos === "number" && <Info label="Baños" value={String(club.banos)} />}
                </div>
              </section>
            </aside>
          </div>
        )}

        {/* ---------- EDICIÓN ---------- */}
        {editMode && (
          <FormProvider {...methods}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setConfirmOpen(true); // confirmamos al guardar
              }}
              className="space-y-6 mt-2"
              noValidate
            >
              <div className="mb-2 flex items-center justify-between">
                <Link to={backHref} className={BTN_SECONDARY}>
                  ← Volver a Mi club
                </Link>
              </div>

              <Section title="Identidad">
                <RHFInput name="nombre" label="Nombre del club *" placeholder="Ej: Club Eclipse" />
                <RHFTextarea name="descripcion" label="Descripción" rows={4} placeholder="Describe el concepto del club…" />
                <div className="grid md:grid-cols-2 gap-4">
                  <RHFInput name="ciudad" label="Ciudad" placeholder="Santiago" />
                  <RHFInput name="pais" label="País" placeholder="Chile" />
                </div>
                <RHFInput name="direccion" label="Dirección" placeholder="Calle / número / sector" />
              </Section>

              <Section title="Contacto">
                <div className="grid md:grid-cols-2 gap-4">
                  <RHFInput name="telefono" label="Teléfono" placeholder="+56 9 ..." />
                  <RHFInput name="email" type="email" label="Email" placeholder="contacto@club.com" />
                  <RHFInput name="sitio_web" label="Sitio web" placeholder="https://tuclub.com" />
                  <RHFInput name="instagram" label="Instagram" placeholder="https://instagram.com/tuclub" />
                </div>
              </Section>

              <Section title="Servicios & espacios">
                <div className="grid md:grid-cols-3 gap-4">
                  <RHFSelect name="accesibilidad" label="Accesibilidad" options={["Sí", "No"]} />
                  <RHFSelect name="estacionamiento" label="Estacionamiento" options={["Sí", "No"]} />
                  <RHFSelect name="guardarropia" label="Guardarropía" options={["Sí", "No"]} />
                  <RHFSelect name="terraza" label="Terraza" options={["Sí", "No"]} />
                  <RHFSelect name="fumadores" label="Zona fumadores" options={["Sí", "No"]} />
                  <RHFSelect name="wi_fi" label="Wi-Fi" options={["Sí", "No"]} />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <RHFInput name="ambientes" type="number" label="Ambientes" placeholder="0" />
                  <RHFInput name="banos" type="number" label="Baños" placeholder="0" />
                </div>
              </Section>

              <Section title="Imágenes">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-white/70 text-sm mb-2">Avatar actual</div>
                    <div className="rounded overflow-hidden border border-white/10 mb-3">
                      {club.imagen ? (
                        <img src={club.imagen} alt="Avatar actual" className="w-full h-48 object-cover" />
                      ) : (
                        <div className="w-full h-48 bg-white/10 grid place-items-center text-white/40">Sin avatar</div>
                      )}
                    </div>
                    <RHFFile name="imagenFile" label="Reemplazar avatar (opcional)" />
                  </div>

                  <div>
                    <div className="text-white/70 text-sm mb-2">Banner actual</div>
                    <div className="rounded overflow-hidden border border-white/10 mb-3">
                      {club.banner ? (
                        <img src={club.banner} alt="Banner actual" className="w-full h-48 object-cover" />
                      ) : (
                        <div className="w-full h-48 bg-white/10 grid place-items-center text-white/40">Sin banner</div>
                      )}
                    </div>
                    <RHFFile name="bannerFile" label="Reemplazar banner (opcional)" />
                  </div>
                </div>
              </Section>

              {/* Toolbar sticky (acciones) */}
              <div className="sticky bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/60 backdrop-blur px-4 py-3 flex gap-3 justify-end">
                <button type="button" onClick={handleCancel} className={BTN_SECONDARY}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                  Guardar cambios
                </button>
              </div>
            </form>
          </FormProvider>
        )}

        {/* Modal de confirmación */}
        {confirmOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60">
            <div className="panel w-[92vw] max-w-md text-center">
              <h3 className="text-lg font-semibold mb-1">¿Guardar los cambios?</h3>
              <p className="text-white/70 mb-5">Se actualizarán los datos del club.</p>
              <div className="flex justify-center gap-3">
                <button className={BTN_SECONDARY} onClick={() => setConfirmOpen(false)}>
                  No
                </button>
                <button className={BTN_PRIMARY} disabled={saving} onClick={() => onConfirmSave()}>
                  Sí, guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}