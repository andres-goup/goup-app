// src/pages/ProducerCreate.tsx
import React, { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/goup_logo.png";

import { RHFInput, RHFFile } from "@/components/form/control";

const createSchema = z.object({
  nombre: z.string().min(1, "El nombre de la productora es obligatorio"),
  telefono: z.string().optional().or(z.literal("")),
  // correo lo tomamos del usuario pero por si lo quieres en form:
  correo: z.string().email("Correo inválido"),
  imagen: z.any().optional().nullable(),
});
type CreateForm = z.infer<typeof createSchema>;

export default function ProducerCreatePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasProducer, setHasProducer] = useState<boolean>(false);
  const navigate = useNavigate();

  const methods = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      nombre: "",
      telefono: "",
      correo: user?.email ?? "",
      imagen: null,
    },
    mode: "onChange",
  });

  useEffect(() => {
    (async () => {
      if (!user) return;
      // 1) Buscar id_usuario
      const { data: u, error: ue } = await supabase
        .from("usuario")
        .select("id_usuario")
        .eq("auth_user_id", user.id)
        .single();
      if (ue || !u) {
        toast.error("No se pudo obtener tu perfil");
        setLoading(false);
        return;
      }

      // 2) Revisar si ya existe productora
      const { data: p, error: pe } = await supabase
        .from("productor")
        .select("id_productor")
        .eq("id_usuario", u.id_usuario)
        .maybeSingle();

      if (pe) {
        console.error(pe);
      } else {
        setHasProducer(!!p);
      }
      setLoading(false);
    })();
  }, [user]);

  const uploadImage = async (file: File | null): Promise<string | null> => {
    if (!file) return null;
    // Asegúrate que exista el bucket "productora"
    const path = `avatar/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("productora").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw new Error(error.message);
    return supabase.storage.from("productora").getPublicUrl(path).data.publicUrl;
  };

  const onSubmit = methods.handleSubmit(async (values) => {
    try {
      if (!user) return;

      // 1) Revalidar que no exista una productora (por seguridad)
      const { data: u } = await supabase
        .from("usuario")
        .select("id_usuario")
        .eq("auth_user_id", user.id)
        .single();

      const { data: existing } = await supabase
        .from("productor")
        .select("id_productor")
        .eq("id_usuario", u?.id_usuario)
        .maybeSingle();

      if (existing) {
        toast("Ya tienes una productora creada");
        navigate("/dashboard/productora");
        return;
      }

      // 2) Subir imagen
      const imgUrl = await uploadImage(values.imagen as File | null);

      // 3) Insertar
      const payload = {
        id_usuario: u?.id_usuario,
        nombre: values.nombre,
        telefono: values.telefono || null,
        correo: values.correo, // puedes forzar user.email si prefieres
        imagen: imgUrl ?? null,
      };

      const { error: insertError } = await supabase.from("productor").insert([payload]);
      if (insertError) throw new Error(insertError.message);

      toast.success("¡Productora creada!");
      navigate("/dashboard/productora");
    } catch (err: any) {
      toast.error(err.message ?? "No se pudo crear la productora");
    }
  });

  if (loading) {
    return <div className="p-6 text-white">Cargando…</div>;
  }

  if (hasProducer) {
    return (
      <main className="min-h-screen text-white px-4 py-8">
        <div className="max-w-xl mx-auto rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <h2 className="text-xl font-bold mb-2">Ya tienes una productora</h2>
          <p className="text-white/70 mb-4">Puedes administrar tus datos desde “Mi productora”.</p>
          <button
            onClick={() => navigate("/dashboard/productora")}
            className="px-4 py-2 rounded bg-[#8e2afc] hover:bg-[#7b1fe0]"
          >
            Ir a mi productora
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen text-white px-4 py-8 overflow-x-hidden">
      <header className="max-w-3xl mx-auto space-y-2 mb-8 text-center">
        <img src={logo} alt="GoUp" className="mx-auto w-28" />
        <h1 className="text-3xl md:text-4xl font-extrabold">
          CREAR <span className="text-[#8e2afc]">PRODUCTORA</span>
        </h1>
        <p className="text-white/70">Publica tu productora para gestionar tus datos de contacto</p>
      </header>

      <FormProvider {...methods}>
        <form onSubmit={onSubmit} className="max-w-3xl mx-auto space-y-6" noValidate>
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#cbb3ff]">Información</h2>
            <RHFInput name="nombre" label="Nombre de la productora *" placeholder="Ej: Purple Nights Productions" />
            <RHFInput name="telefono" label="Teléfono" placeholder="+56 9 1234 5678" />
            <RHFInput name="correo" label="Correo" type="email" placeholder="productora@ejemplo.com" />
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#cbb3ff]">Imagen de perfil</h2>
            <RHFFile name="imagen" label="Logo / avatar" />
          </section>

          <div className="flex justify-end pt-2">
            <button type="submit" className="px-5 py-2 rounded-md bg-[#8e2afc] hover:bg-[#7b1fe0]">
              Crear productora
            </button>
          </div>
        </form>
      </FormProvider>
    </main>
  );
}