import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";

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

  // Prefill con DB o Google
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

  const onSubmit = async (data: ProfileForm) => {
    const payload = {
      id_usuario: dbUser?.id_usuario, // si lo tienes en tu tipo
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      const url = await uploadAvatar(file, user.id);
      setAvatarUrl(url);
      setValue("foto", url, { shouldValidate: true });
    } catch (err) {
      console.error(err);
      alert("No se pudo subir la imagen");
    } finally {
      setUploading(false);
      e.target.value = ""; // limpia el input
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
          {/* Campo oculto para foto */}
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
   Helper para subir avatar
   =========================== */
async function uploadAvatar(file: File, userId: string) {
  // Asegúrate que el bucket "avatars" exista
  const bucket = "avatars";
  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}