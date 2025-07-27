// src/pages/ProfilePage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";

import { RHFInput, RHFFile } from "@/components/form/control";
import goupLogo from "@/assets/goup_logo.png"; // ⬅️ para el mosaico del banner

/* ===========================
   Schema y tipos
   =========================== */
const profileSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  telefono: z.string().optional().or(z.literal("")),
  rut: z.string().optional().or(z.literal("")),
  direccion: z.string().optional().or(z.literal("")),
  // archivo opcional para reemplazar avatar
  foto: z.any().optional().nullable(),
});
type ProfileForm = z.infer<typeof profileSchema>;

type DBUsuario = {
  id_usuario: string;
  auth_user_id: string;
  correo: string | null;
  nombre: string | null;
  telefono: string | null;
  rut: string | null;
  direccion: string | null;
  foto: string | null;
};

type DBEventoLite = {
  id_evento: string;
  fecha: string;
  horaInicio?: string | null;
  horaCierre?: string | null;
};

export default function ProfilePage() {
  const { user, dbUser, loading, signOut } = useAuth();

  const [loadingPage, setLoadingPage] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [record, setRecord] = useState<DBUsuario | null>(null);
  const originalRef = useRef<ProfileForm | null>(null);

  // Contadores de eventos
  const [totalEventos, setTotalEventos] = useState<number>(0);
  const [realizados, setRealizados] = useState<number>(0);

  const methods = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: undefined,
    mode: "onChange",
  });

  /* ===========================
     Carga inicial del usuario
     =========================== */
  useEffect(() => {
    (async () => {
      if (loading) return;
      if (!user) {
        setLoadingPage(false);
        return;
      }

      try {
        // Traer registro de usuario
        const { data, error } = await supabase
          .from("usuario")
          .select(
            "id_usuario, auth_user_id, correo, nombre, telefono, rut, direccion, foto"
          )
          .eq("auth_user_id", user.id)
          .maybeSingle<DBUsuario>();

        if (error) throw error;

        const meta = user.user_metadata ?? {};
        const merged: DBUsuario = {
          id_usuario: data?.id_usuario ?? dbUser?.id_usuario ?? "",
          auth_user_id: user.id,
          correo: data?.correo ?? (user.email ?? null),
          nombre: data?.nombre ?? (meta.full_name ?? null),
          telefono: data?.telefono ?? (user.phone ?? null),
          rut: data?.rut ?? null,
          direccion: data?.direccion ?? null,
          foto: data?.foto ?? (meta.picture ?? meta.avatar_url ?? null),
        };

        setRecord(merged);

        const defaults: ProfileForm = {
          nombre: merged.nombre ?? "",
          telefono: merged.telefono ?? "",
          rut: merged.rut ?? "",
          direccion: merged.direccion ?? "",
          foto: null, // para reemplazo
        };
        methods.reset(defaults);
        originalRef.current = defaults;
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message ?? "No se pudo cargar tu perfil");
      } finally {
        setLoadingPage(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  /* ===========================
     Cargar eventos y contar
     =========================== */
  useEffect(() => {
    (async () => {
      if (!record?.id_usuario) return;
      const { data, error } = await supabase
        .from("evento")
        .select("id_evento, fecha, horaInicio, horaCierre")
        .eq("id_usuario", record.id_usuario)
        .order("fecha", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      const list = (data ?? []) as DBEventoLite[];
      setTotalEventos(list.length);

      const now = Date.now();
      const past = list.filter((ev) => {
        const base = ev.horaCierre || ev.horaInicio || "00:00";
        const dt = new Date(`${ev.fecha}T${base}`);
        return now > dt.getTime();
      }).length;

      setRealizados(past);
    })();
  }, [record?.id_usuario]);

  const avatarUrl = useMemo(() => record?.foto || "", [record]);

  /* ===========================
     Subir avatar (bucket público)
     =========================== */
  const uploadAvatarPublic = async (file: File, userId: string) => {
    const bucket = "avatars";
    if (!file.type.startsWith("image/")) {
      throw new Error("El archivo debe ser una imagen.");
    }
    if (file.size > 3 * 1024 * 1024) {
      throw new Error("La imagen no puede superar los 3MB.");
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return `${data.publicUrl}?v=${Date.now()}`; // cache-buster
  };

  /* ===========================
     Acciones edición
     =========================== */
  const handleCancel = () => {
    if (originalRef.current) methods.reset(originalRef.current);
    setEditMode(false);
  };

  const askSave = () => setConfirmOpen(true);

  const onConfirmSave = methods.handleSubmit(async (values) => {
    if (!record || !user) return;
    try {
      setSaving(true);

      // Si subió nueva imagen, súbela; si no, manten la actual
      let url = record.foto ?? null;
      if (values.foto instanceof File) {
        url = await uploadAvatarPublic(values.foto, user.id);
        // opcional: actualizar metadata de auth
        try {
          await supabase.auth.updateUser({ data: { avatar_url: url } });
        } catch {
          /* no crítico */
        }
      }

      const payload = {
        auth_user_id: user.id,
        correo: record.correo ?? user.email,
        nombre: values.nombre,
        telefono: values.telefono || null,
        rut: values.rut || null,
        direccion: values.direccion || null,
        foto: url,
      };

      // upsert por auth_user_id
      const { error } = await supabase
        .from("usuario")
        .upsert(payload, { onConflict: "auth_user_id" });

      if (error) throw error;

      // refrescar estado local
      const merged: DBUsuario = {
        ...(record as DBUsuario),
        nombre: payload.nombre,
        telefono: payload.telefono,
        rut: payload.rut,
        direccion: payload.direccion,
        foto: payload.foto,
      };
      setRecord(merged);

      const newDefaults: ProfileForm = {
        nombre: merged.nombre ?? "",
        telefono: merged.telefono ?? "",
        rut: merged.rut ?? "",
        direccion: merged.direccion ?? "",
        foto: null,
      };
      methods.reset(newDefaults);
      originalRef.current = newDefaults;

      toast.success("Datos guardados");
      setEditMode(false);
      setConfirmOpen(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  });

  /* ===========================
     Helpers de roles
     =========================== */
  const roles = useMemo<string[]>(() => {
    const raw = dbUser?.rol as unknown;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as string[];
    return [String(raw)];
  }, [dbUser?.rol]);

  const rolePills = useMemo(() => {
    const pills: string[] = [];
    if (roles.includes("admin")) pills.push("Eres administrador");
    if (roles.includes("club_owner")) pills.push("Eres creador de club");
    if (roles.includes("productor")) pills.push("Eres productor");
    // (opcional) si solo es "user" y nada más:
    if (pills.length === 0 && roles.includes("user")) pills.push("Eres usuario");
    return pills;
  }, [roles]);

  /* ===========================
     Render
     =========================== */
  if (loadingPage) {
    return (
      <main className="min-h-screen bg-black text-white px-4 py-10">
        <div className="max-w-3xl mx-auto">Cargando perfil…</div>
      </main>
    );
  }

  if (!record) {
    return (
      <main className="min-h-screen bg-black text-white px-4 py-10">
        <div className="max-w-3xl mx-auto">
          <p>No pudimos cargar tu perfil.</p>
        </div>
      </main>
    );
  }

  const displayName = record.nombre ?? "Usuario";
  const email = record.correo ?? "";

  const futuros = Math.max(0, totalEventos - realizados);

  return (
    <main className="min-h-screen bg-black text-white">
      {/* ---------- HERO con mosaico del logo + gradiente ---------- */}
      <div className="relative w-full h-40 md:h-48 overflow-hidden">
        {/* capa gradiente */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#2a1454] via-[#381a63] to-[#8e2afc]" />
        {/* capa mosaico del logo */}
        <div
          className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
          style={{
            backgroundImage: `url(${goupLogo})`,
            backgroundRepeat: "repeat",
            backgroundSize: "80px 80px",
            backgroundPosition: "center",
          }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {/* Avatar encima de todo */}
        <div className="-mt-10 md:-mt-12 relative z-10 flex items-end justify-between">
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 md:h-28 md:w-28 rounded-full overflow-hidden border-4 border-[#8e2afc] bg-white/10">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-full w-full grid place-items-center text-3xl">
                  {(displayName[0] ?? "U").toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">{displayName}</h1>
              <p className="text-white/70 text-sm">{email}</p>

              {/* Roles como frases */}
              {rolePills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {rolePills.map((txt) => (
                    <span
                      key={txt}
                      className="text-xs px-2 py-1 rounded bg-[#8e2afc]/20 text-[#e4d7ff] border border-[#8e2afc]/30"
                    >
                      {txt}
                    </span>
                  ))}
                </div>
              )}

              {/* Contadores de eventos (frase corta) */}
              <p className="text-xs text-white/70 mt-2">
                Has creado <span className="text-white font-semibold">{totalEventos}</span>{" "}
                evento(s) • Has realizado{" "}
                <span className="text-white font-semibold">{realizados}</span>{" "}
                {futuros > 0 && (
                  <>
                    • Próximos{" "}
                    <span className="text-white font-semibold">{futuros}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="h-10 px-4 rounded-md bg-white/10 hover:bg-white/20 border border-white/10 text-sm"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-12 pt-6">
        {/* ---------- MODO LECTURA ---------- */}
        {!editMode && (
          <div className="grid gap-6">
            <Card title="Información personal">
              <KeyRow k="Nombre" v={record.nombre || "—"} />
              <KeyRow k="Teléfono" v={record.telefono || "—"} />
              <KeyRow k="RUT" v={record.rut || "—"} />
              <KeyRow k="Dirección" v={record.direccion || "—"} />
            </Card>

            <Card title="Actividad">
              <KeyRow k="Eventos creados" v={String(totalEventos)} />
              <KeyRow k="Eventos realizados" v={String(realizados)} />
              <KeyRow k="Eventos próximos" v={String(futuros)} />
            </Card>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="px-5 py-2 rounded-md bg-[#8e2afc] hover:bg-[#7b1fe0] transition"
              >
                Editar datos
              </button>
            </div>
          </div>
        )}

        {/* ---------- MODO EDICIÓN ---------- */}
        {editMode && (
          <FormProvider {...methods}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setConfirmOpen(true); // preguntamos solo al guardar
              }}
              className="space-y-6"
              noValidate
            >
              <Section title="Información personal">
                <RHFInput name="nombre" label="Nombre *" />
                <RHFInput name="telefono" label="Teléfono" placeholder="+56 9 1234 5678" />
                <RHFInput name="rut" label="RUT" />
                <RHFInput name="direccion" label="Dirección" />
              </Section>

              <Section title="Imagen de perfil">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-white/70 text-sm mb-2">Avatar actual</div>
                    <div className="rounded overflow-hidden border border-white/10 mb-3 h-40 grid place-items-center bg-white/5">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="avatar" className="h-40 w-full object-cover" />
                      ) : (
                        <div className="text-white/40">Sin imagen</div>
                      )}
                    </div>
                  </div>
                  <div className="self-start">
                    <RHFFile name="foto" label="Reemplazar foto (opcional)" />
                    <p className="text-xs text-white/50 mt-2">JPG/PNG hasta 3MB.</p>
                  </div>
                </div>
              </Section>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded border border-white/20 hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded bg-[#8e2afc] hover:bg-[#7b1fe0] disabled:opacity-60"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </FormProvider>
        )}
      </div>

      {/* ---------- MODAL CONFIRMACIÓN ---------- */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60">
          <div className="bg-neutral-900 rounded-md p-6 w-[92vw] max-w-md text-center border border-white/10">
            <h3 className="text-lg font-semibold mb-2">¿Guardar los cambios?</h3>
            <p className="text-white/70 mb-5">Se actualizarán los datos de tu perfil.</p>
            <div className="flex justify-center gap-3">
              <button
                className="px-4 py-2 rounded border border-white/20 hover:bg-white/10"
                onClick={() => setConfirmOpen(false)}
              >
                No
              </button>
              <button
                className="px-4 py-2 rounded bg-[#8e2afc] hover:bg-[#7b1fe0]"
                disabled={saving}
                onClick={() => onConfirmSave()}
              >
                Sí, guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ===========================
   UI pequeñas reutilizables
   =========================== */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur p-5">
      <h3 className="font-semibold text-[#cbb3ff] mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
function KeyRow({ k, v }: { k: string; v?: React.ReactNode }) {
  return (
    <p className="text-sm text-white/80 flex items-baseline justify-between gap-3">
      <span className="text-white/60">{k}</span>
      <span className="text-right">{v ?? "—"}</span>
    </p>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-[#cbb3ff]">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}