// src/pages/ProfilePage.tsx
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";

/* ===========================
   Schema y tipos
   =========================== */
const profileSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  telefono: z.string().optional().or(z.literal("")),
  rut: z.string().optional().or(z.literal("")),
  direccion: z.string().optional().or(z.literal("")),
  foto: z.string().url().optional().or(z.literal("")),
});
type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, dbUser, loading, signOut } = useAuth();

  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nombre: "",
      telefono: "",
      rut: "",
      direccion: "",
      foto: "",
    },
  });

  /* Prefill con datos de DB o del proveedor (Google/GitHub) */
  useEffect(() => {
    if (loading) return;

    const google = user?.user_metadata ?? {};
    const initialAvatar =
      dbUser?.foto ?? google.picture ?? google.avatar_url ?? "";

    setAvatarUrl(initialAvatar);

    reset({
      nombre: dbUser?.nombre ?? google.full_name ?? "",
      telefono: dbUser?.telefono ?? user?.phone ?? "",
      rut: dbUser?.rut ?? "",
      direccion: dbUser?.direccion ?? "",
      foto: initialAvatar,
    });
  }, [dbUser, user, loading, reset]);

  /* Guardar perfil (sin imagen) */
  const onSubmit = async (data: ProfileForm) => {
    const payload = {
      id_usuario: dbUser?.id_usuario, // si lo tienes disponible en tu modelo
      auth_user_id: user?.id,
      correo: user?.email,
      ...data,
    };

    const { error } = await supabase
      .from("usuario")
      .upsert(payload, { onConflict: "auth_user_id" });

    if (error) {
      console.error(error);
      alert("No se pudo guardar el perfil");
      return;
    }

    alert("Perfil guardado");
  };

  const handlePickFile = () => fileRef.current?.click();

  /* Subir imagen y guardar URL en DB + form */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      const url = await uploadAvatarPublic(file, user.id);

      // Guarda la URL en tu tabla `usuario`
      const { error: updErr } = await supabase
        .from("usuario")
        .update({ foto: url })
        .eq("auth_user_id", user.id);

      if (updErr) throw updErr;

      // (Opcional) también en metadatos de auth, por si en otros lados usas user.user_metadata.avatar_url
      try {
        await supabase.auth.updateUser({ data: { avatar_url: url } });
      } catch (metaErr) {
        // no es crítico si falla
        console.warn("No se pudo actualizar metadata del usuario:", metaErr);
      }

      setAvatarUrl(url);                         // refresca UI
      setValue("foto", url, { shouldValidate: true }); // actualiza form para onSubmit
      alert("Foto actualizada");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "No se pudo subir la imagen");
    } finally {
      setUploading(false);
      e.target.value = ""; // permite volver a subir el mismo archivo si quieres
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-extrabold">
            Mi <span className="text-[#8e2afc]">perfil</span>
          </h1>

          <button
            type="button"
            onClick={signOut}
            className="text-sm text-white/70 hover:text-white underline"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Avatar grande */}
        <div className="flex flex-col items-center gap-4 mb-10">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="avatar"
              className="h-36 w-36 rounded-full object-cover border-4 border-[#8e2afc]"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-36 w-36 rounded-full bg-white/10 flex items-center justify-center text-4xl">
              {(dbUser?.nombre ??
                user?.user_metadata?.full_name ??
                "U")[0].toUpperCase()}
            </div>
          )}

          <button
            type="button"
            onClick={handlePickFile}
            disabled={uploading}
            className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 border border-white/10 text-sm disabled:opacity-60"
          >
            {uploading ? "Subiendo..." : "Cambiar foto"}
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleFileChange}
          />
        </div>

        {/* Formulario */}
        <div className="rounded-xl bg-white/5 backdrop-blur p-6 shadow-lg border border-white/10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Campo oculto para foto (mantiene la URL en el form) */}
            <input type="hidden" {...register("foto")} />

            <Field label="Nombre *" error={errors.nombre?.message}>
              <input
                className="w-full rounded-md bg-transparent border border-white/20 px-3 py-2 focus:outline-none focus:border-[#8e2afc]"
                {...register("nombre")}
              />
            </Field>

            <Field label="Teléfono" error={errors.telefono?.message}>
              <input
                className="w-full rounded-md bg-transparent border border-white/20 px-3 py-2 focus:outline-none focus:border-[#8e2afc]"
                {...register("telefono")}
              />
            </Field>

            <Field label="RUT" error={errors.rut?.message}>
              <input
                className="w-full rounded-md bg-transparent border border-white/20 px-3 py-2 focus:outline-none focus:border-[#8e2afc]"
                {...register("rut")}
              />
            </Field>

            <Field label="Dirección" error={errors.direccion?.message}>
              <input
                className="w-full rounded-md bg-transparent border border-white/20 px-3 py-2 focus:outline-none focus:border-[#8e2afc]"
                {...register("direccion")}
              />
            </Field>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto inline-flex items-center justify-center rounded-md bg-[#8e2afc] hover:bg-[#7a1ee6] transition px-5 py-2 font-semibold disabled:opacity-60"
            >
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

/* ===========================
   Componente Field reutilizable
   =========================== */
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block mb-1 text-sm font-medium text-white/80">
        {label}
      </span>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </label>
  );
}

/* ===========================
   Helper para subir avatar (bucket PÚBLICO)
   =========================== */
async function uploadAvatarPublic(file: File, userId: string) {
  const bucket = "avatars";

  // Validaciones básicas para evitar 400 del Storage
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo debe ser una imagen.");
  }
  if (file.size > 3 * 1024 * 1024) {
    throw new Error("La imagen no puede superar los 3MB.");
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  // Usamos un nombre estable y permitimos sobrescribir con upsert
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,            // evita errores si ya existía
      contentType: file.type,  // asegura el tipo correcto
    });

  if (uploadError) throw uploadError;

  // Para buckets públicos
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  // Cache-buster para ver cambios inmediatos
  return `${data.publicUrl}?v=${Date.now()}`;
}

/* =========================================================
   ALTERNATIVA: bucket PRIVADO (usar Signed URL)
   - Sustituye uploadAvatarPublic por esto si tu bucket es privado.
   =========================================================
async function uploadAvatarPrivate(file: File, userId: string) {
  const bucket = "avatars";
  if (!file.type.startsWith("image/")) throw new Error("El archivo debe ser una imagen.");
  if (file.size > 3 * 1024 * 1024) throw new Error("La imagen no puede superar los 3MB.");

  const ext = (file.name.split(\".\").pop() || "jpg").toLowerCase();
  const path = \`\${userId}/avatar.\${ext}\`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });
  if (uploadError) throw uploadError;

  const { data, error: signedErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24); // 1 día
  if (signedErr) throw signedErr;

  return \`\${data.signedUrl}&v=\${Date.now()}\`;
}
*/