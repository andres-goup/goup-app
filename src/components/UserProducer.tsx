// src/components/UserProducer.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";
import { RHFInput, RHFFile } from "@/components/form/control";

type DBProductor = {
  id_productor: string;
  id_usuario: string;
  nombre: string | null;
  telefono: string | null;
  correo: string | null;
  imagen: string | null;
};

type State = { loading: boolean; hasProducer: boolean; producerId: string | null };



const editSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  telefono: z.string().optional().or(z.literal("")),
  correo: z.string().email("Correo inválido"),
  imagen: z.any().optional().nullable(),
});
type EditForm = z.infer<typeof editSchema>;

export default function UserProducer() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [producer, setProducer] = useState<DBProductor | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const originalRef = useRef<EditForm | null>(null);

  const methods = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: undefined,
    mode: "onChange",
  });

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: u, error: ue } = await supabase
        .from("usuario")
        .select("id_usuario")
        .eq("auth_user_id", user.id)
        .single();
      if (ue || !u) {
        toast.error("No se pudo obtener el usuario");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("productor")
        .select("id_productor, id_usuario, nombre, telefono, correo, imagen")
        .eq("id_usuario", u.id_usuario)
        .maybeSingle();

      if (error) {
        toast.error("No se pudo cargar la productora");
        setLoading(false);
        return;
      }

      setProducer((data as DBProductor) ?? null);

      if (data) {
        const defaults: EditForm = {
          nombre: data.nombre ?? "",
          telefono: data.telefono ?? "",
          correo: data.correo ?? (user.email ?? ""),
          imagen: null,
        };
        methods.reset(defaults);
        originalRef.current = defaults;
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const hasProducer = useMemo(() => !!producer, [producer]);

  const uploadImage = async (file: File | null): Promise<string | null> => {
    if (!file) return null;
    const path = `avatar/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage
      .from("productora")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw new Error(error.message);
    return supabase.storage.from("productora").getPublicUrl(path).data.publicUrl;
  };

  const handleCancel = () => {
    if (originalRef.current) methods.reset(originalRef.current);
    setEditMode(false);
  };

  const askSave = () => setConfirmOpen(true);

  const onConfirmSave = methods.handleSubmit(async (values) => {
    try {
      if (!producer) return;
      setSaving(true);

      const newImgUrl = await uploadImage(values.imagen as File | null);

      const payload: Partial<DBProductor> = {
        nombre: values.nombre,
        telefono: values.telefono || null,
        correo: values.correo,
        imagen: newImgUrl ?? producer.imagen ?? null,
      };

      const { error } = await supabase
        .from("productor")
        .update(payload)
        .eq("id_productor", producer.id_productor);

      if (error) throw new Error(error.message);

      toast.success("Datos guardados");

      const merged: DBProductor = { ...(producer as DBProductor), ...payload };
      setProducer(merged);

      const newDefaults: EditForm = {
        nombre: merged.nombre ?? "",
        telefono: merged.telefono ?? "",
        correo: merged.correo ?? "",
        imagen: null,
      };
      methods.reset(newDefaults);
      originalRef.current = newDefaults;

      setEditMode(false);
      setConfirmOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  });

  if (loading) return <div className="text-white">Cargando mi productora…</div>;

  if (!hasProducer) {
    return (
      <div className="text-white/80 bg-neutral-900/60 border border-white/10 rounded-xl p-6">
        <p className="mb-4">Aún no has creado tu productora.</p>
        <a
          href="/productora/crear"
          className="inline-flex items-center justify-center rounded-md bg-[#8e2afc] hover:bg-[#7b1fe0] px-4 py-2 text-sm font-semibold"
        >
          Crear productora
        </a>
      </div>
    );
  }

  /* =======================
   * VISTA (no edición)
   * ======================= */
  if (!editMode) {
    return (
      <div className="max-w-5xl mx-auto">
        {/* Card raíz con contexto de posicionamiento */}
        <div className="relative bg-neutral-900 rounded-lg overflow-hidden border border-white/10 shadow-md">
          {/* Banner mosaico */}
          <div className="relative w-full h-40 overflow-hidden">
            {producer?.imagen ? (
              <>
                <div
                  className="absolute inset-0 z-0"
                  style={{
                    backgroundImage: `url(${producer.imagen})`,
                    backgroundRepeat: "repeat",
                    backgroundSize: "clamp(64px, 10vw, 128px) clamp(64px, 10vw, 128px)",
                    backgroundPosition: "center",
                    filter: "saturate(1.1) contrast(1.05)",
                    opacity: 0.9,
                  }}
                />
                {/* veladura por debajo del contenido */}
                <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/10 via-black/25 to-black/35" />
              </>
            ) : (
              <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#2a1454] via-[#381a63] to-[#8e2afc]" />
            )}
          </div>
  
          {/* Contenido encabezado (avatar en la misma posición, pero por encima) */}
          <div className="px-6 pt-4 relative z-20">
            <div className="flex items-end justify-between">
              <div className="flex items-center gap-4">
                {/* ⬇️ MISMA POSICIÓN, PERO SOBRE EL BANNER Y EL CONTENIDO */}
                <div className="relative -mt-10 z-30 h-20 w-20 md:h-24 md:w-24 rounded-full overflow-hidden border-4 border-[#8e2afc] bg-white/10 shadow-2xl ring-2 ring-black/30 shrink-0">
                  {producer?.imagen ? (
                    <img src={producer.imagen} alt="logo" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-3xl">
                      {(producer?.nombre?.[0] ?? "P").toUpperCase()}
                    </div>
                  )}
                </div>
  
                <div className="text-white relative z-20">
                  <h1 className="text-2xl font-extrabold">{producer?.nombre}</h1>
                  <p className="text-white/70 text-sm">
                    {producer?.correo ?? "—"} {producer?.telefono ? `• ${producer.telefono}` : ""}
                  </p>
                </div>
              </div>
  
              <button
                onClick={() => setEditMode(true)}
                className="h-10 px-4 rounded-md bg-[#8e2afc] hover:bg-[#7b1fe0] relative z-20"
              >
                Editar datos
              </button>
            </div>
          </div>
  
          {/* Datos */}
          <div className="p-6 text-white grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
            <Info label="Correo" value={producer?.correo ?? "—"} />
            <Info label="Teléfono" value={producer?.telefono ?? "—"} />
          </div>
        </div>
      </div>
    );
  }

  /* =======================
   * EDICIÓN
   * ======================= */
  return (
    <div className="max-w-5xl mx-auto">
      <FormProvider {...methods}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setConfirmOpen(true);
          }}
          className="space-y-6"
          noValidate
        >
          <section className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur p-5">
            <h2 className="text-xl font-bold text-[#cbb3ff] mb-4">Editar productora</h2>
            <div className="space-y-4">
              <RHFInput name="nombre" label="Nombre de la productora *" />
              <RHFInput name="telefono" label="Teléfono" placeholder="+56 9 1234 5678" />
              <RHFInput name="correo" label="Correo" type="email" />
            </div>

            <div className="mt-6 grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-white/70 text-sm mb-2">Logo actual</div>
                <div className="rounded overflow-hidden border border-white/10 mb-3 h-40 grid place-items-center bg-white/5">
                  {producer?.imagen ? (
                    <img src={producer.imagen} alt="logo" className="h-40 object-contain" />
                  ) : (
                    <div className="text-white/40">Sin logo</div>
                  )}
                </div>
                <RHFFile name="imagen" label="Reemplazar logo (opcional)" />
              </div>
            </div>

            <div className="flex gap-3 pt-6">
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
          </section>
        </form>
      </FormProvider>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60">
          <div className="bg-neutral-900 rounded-md p-6 w-[92vw] max-w-md text-center border border-white/10">
            <h3 className="text-lg font-semibold mb-2">¿Guardar los cambios?</h3>
            <p className="text-white/70 mb-5">Se actualizarán los datos de la productora.</p>
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