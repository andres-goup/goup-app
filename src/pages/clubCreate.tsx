import React, { useState } from "react";
import {
  useForm,
  FormProvider,
  type FieldPath,
  type FieldErrors,
  type FieldValues,
  type FieldError,
  type Resolver,
} from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/goup_logo.png";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useStepper } from "@/hooks/useStepper";

// Reutilizamos tus controles
import {
  RHFInput,
  RHFTextarea,
  RHFSelect,
  RHFFile,
  StepErrorBanner,
} from "@/components/form/control";

/* =========================================================================
 * Esquema (si ya lo tienes en "@/lib/schemas", importa desde ahí y borra esto)
 * ========================================================================= */
export const clubSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  descripcion: z.string().min(1, "La descripción es obligatoria"),
  direccion: z.string().min(1, "La dirección es obligatoria"),
  ciudad: z.string().min(1, "La ciudad es obligatoria"),
  pais: z.string().min(1, "El país es obligatorio"),
  telefono: z.string().optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  sitio_web: z.string().url("URL inválida").optional().or(z.literal("")),
  instagram: z.string().optional().or(z.literal("")),
  imagen: z.any().nullable(), // File | null
  banner: z.any().nullable(), // File | null
  accesibilidad: z.union([z.boolean(), z.enum(["Sí", "No"])]).default("No"),
  estacionamiento: z.union([z.boolean(), z.enum(["Sí", "No"])]).default("No"),
  guardarropia: z.union([z.boolean(), z.enum(["Sí", "No"])]).default("No"),
  terraza: z.union([z.boolean(), z.enum(["Sí", "No"])]).default("No"),
  fumadores: z.union([z.boolean(), z.enum(["Sí", "No"])]).default("No"),
  wi_fi: z.union([z.boolean(), z.enum(["Sí", "No"])]).default("No"),
  ambientes: z.union([z.number(), z.string()]).optional().or(z.literal("")),
  banos: z.union([z.number(), z.string()]).optional().or(z.literal("")),
});
export type ClubFormValues = z.infer<typeof clubSchema>;
type Keys = FieldPath<ClubFormValues>;

/* =========================================================
 * Defaults
 * =======================================================*/
const defaultClubValues: ClubFormValues = {
  nombre: "",
  descripcion: "",
  direccion: "",
  ciudad: "",
  pais: "",
  telefono: "",
  email: "",
  sitio_web: "",
  instagram: "",
  imagen: null,
  banner: null,
  accesibilidad: "No",
  estacionamiento: "No",
  guardarropia: "No",
  terraza: "No",
  fumadores: "No",
  wi_fi: "No",
  ambientes: "",
  banos: "",
};

/* =========================================================
 * Helpers de errores (como en Event)
 * =======================================================*/
function isFieldError(v: unknown): v is FieldError {
  return typeof v === "object" && v !== null && "message" in (v as any);
}
function flattenErrors<T extends FieldValues>(
  obj: FieldErrors<T>,
  prefix: FieldPath<T> | "" = ""
): Record<FieldPath<T>, string> {
  const out: Partial<Record<FieldPath<T>, string>> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = (prefix ? `${prefix}.${k}` : k) as FieldPath<T>;
    if (isFieldError(v) && typeof v.message === "string") {
      out[key] = v.message;
    } else if (v && typeof v === "object") {
      Object.assign(out, flattenErrors<T>(v as FieldErrors<T>, key));
    }
  }
  return out as Record<FieldPath<T>, string>;
}
function collectStepErrors<T extends FieldValues>(
  errors: FieldErrors<T>,
  fields: FieldPath<T>[]
): string[] {
  const flat = flattenErrors<T>(errors);
  return fields.map((f) => flat[f]).filter(Boolean) as string[];
}

/* =========================================================
 * UI genérica (igual que Event)
 * =======================================================*/
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${i === step ? "bg-[#8e2afc]" : "bg-white/20"}`}
        />
      ))}
    </div>
  );
}
type LoadingButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "solid" | "outline";
};
function LoadingButton({
  loading,
  variant = "solid",
  children,
  className = "",
  ...rest
}: LoadingButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50";
  const styles =
    variant === "outline"
      ? "border border-white/20 bg-transparent hover:bg-white/10"
      : "bg-[#8e2afc] hover:bg-[#7b1fe0]";
  return (
    <button className={`${base} ${styles} ${className}`} disabled={loading} {...rest}>
      {loading ? "..." : children}
    </button>
  );
}
function LocalCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight text-[#8e2afc] flex items-center gap-2">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/* =========================================================
 * Coerciones
 * =======================================================*/
const asBool = (v: unknown): boolean => {
  if (typeof v === "boolean") return v;
  if (v == null) return false;
  const s = String(v).toLowerCase();
  return s === "si" || s === "sí" || s === "true" || s === "1";
};
const asInt = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/* =========================================================
 * Página
 * =======================================================*/
export default function ClubCreatePage() {
  return <ClubWizard />;
}

function ClubWizard() {
  const methods = useForm<ClubFormValues>({
    resolver: zodResolver(clubSchema) as unknown as Resolver<ClubFormValues>,
    defaultValues: defaultClubValues,
    mode: "onChange",
  });

  const [loadingStep, setLoadingStep] = useState(false);
  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const steps = useSteps();
  const { current, total, next, prev } = useStepper(steps);

  // Campos que se validan por paso
  const stepFields: Keys[][] = [
    ["nombre", "descripcion", "direccion", "ciudad", "pais", "telefono", "email", "sitio_web", "instagram"],
    ["imagen", "banner"],
    ["accesibilidad", "estacionamiento", "guardarropia", "terraza", "fumadores", "wi_fi", "ambientes", "banos"],
    [], // review (si quisieras)
  ];

  const onSubmitStep = async () => {
    const fields = stepFields[current];
    const ok = await methods.trigger(fields, { shouldFocus: true });
    if (!ok) {
      const msgs = collectStepErrors(methods.formState.errors, fields);
      setStepErrors(msgs);
      toast.error(msgs[0] ?? "Corrige los campos para continuar.");
      return;
    }
    setStepErrors([]);
    toast.success("Paso guardado ✅");
    next();
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  };

  const onSubmitFinal = async (data: ClubFormValues) => {
    if (sent) return;
    try {
      setLoadingStep(true);

      // 1) usuario
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) throw new Error("No estás autenticado");

      // 2) id_usuario
      const { data: usuarioData, error: usuarioError } = await supabase
        .from("usuario")
        .select("id_usuario")
        .eq("auth_user_id", user.id)
        .single();
      if (usuarioError || !usuarioData) throw new Error("No se encontró tu perfil");
      const id_usuario = usuarioData.id_usuario;

      // 3) subir imágenes al bucket "club"
      const uploadImage = async (file: File | null, folder: string) => {
        if (!file) return null;
        const ext = file.name.split(".").pop();
        const filePath = `${user.id}/${folder}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from("club") // ← cambia si usas otro bucket
          .upload(filePath, file, { cacheControl: "3600", upsert: false });
        if (error) throw new Error(`Error al subir ${folder}: ${error.message}`);
        return supabase.storage.from("club").getPublicUrl(filePath).data.publicUrl;
      };

      const imagenUrl = await uploadImage(data.imagen as File | null, "imagen");
      const bannerUrl = await uploadImage(data.banner as File | null, "banner");
      // Verificar si el usuario ya tiene un club
// Verificar si el usuario ya tiene un club
const { data: existingClub, error: existErr } = await supabase
  .from("club")
  .select("id_club, id_usuario")
  .eq("id_usuario", id_usuario)
  .maybeSingle();

if (existErr && existErr.code !== "PGRST116") {
  // PGRST116 = No rows found for maybeSingle
  throw new Error(existErr.message);
}

if (existingClub) {
  // ya existe → no permitir crear otro
  toast.error("Ya tienes un club creado. Solo se permite uno por usuario.");
  // opcional: redirigir a Mi club
  setTimeout(() => navigate("/dashboard/club"), 800);
  setLoadingStep(false);
  return;
}
      // 4) payload normalizado
      const payload = {
        nombre: data.nombre,
        descripcion: data.descripcion,
        direccion: data.direccion,
        ciudad: data.ciudad,
        pais: data.pais,
        telefono: data.telefono,
        email: data.email,
        sitio_web: data.sitio_web,
        instagram: data.instagram,

        imagen: imagenUrl,
        banner: bannerUrl,

        accesibilidad: asBool(data.accesibilidad),
        estacionamiento: asBool(data.estacionamiento),
        guardarropia: asBool(data.guardarropia),
        terraza: asBool(data.terraza),
        fumadores: asBool(data.fumadores),
        wi_fi: asBool(data.wi_fi),

        ambientes: asInt(data.ambientes),
        banos: asInt(data.banos),

        id_usuario,
      };

      // 5) insertar
      const { error: insertError } = await supabase.from("club").insert([payload]);
      if (insertError) throw new Error(insertError.message);

      toast.success("¡Club creado con éxito!");
      setSent(true);
      methods.reset(defaultClubValues);
      setTimeout(() => navigate("/dashboard/club"), 1500);
    } catch (err) {
      toast.error((err as Error).message ?? "Error inesperado");
    } finally {
      setLoadingStep(false);
    }
  };

  return (
    <main className="relative min-h-screen text-white px-4 py-8 overflow-x-hidden">
      <header className="max-w-3xl mx-auto space-y-2 mb-8 text-center">
        <img src={logo} alt="GoUp" className="mx-auto w-28" />
        <h1 className="text-3xl md:text-4xl font-extrabold">
          CREAR <span className="text-[#8e2afc]">CLUB</span>
        </h1>
        <p className="text-white/70">Publica tu club con fotos, servicios y datos de contacto.</p>
      </header>

      <FormProvider {...methods}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (current === total - 1) {
              methods.handleSubmit(onSubmitFinal)();
            } else {
              onSubmitStep();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          className="max-w-3xl mx-auto space-y-8 mt-8"
          noValidate
        >
          <StepDots step={current} total={total} />
          <StepErrorBanner errors={stepErrors} />

          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {steps[current].content}
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-between pt-6">
            {current > 0 ? (
              <LoadingButton type="button" variant="outline" onClick={prev}>
                Atrás
              </LoadingButton>
            ) : (
              <span />
            )}

            <LoadingButton type="submit" loading={loadingStep}>
              {current === total - 1 ? "Crear club" : "Siguiente"}
            </LoadingButton>
          </div>
        </form>
      </FormProvider>
    </main>
  );
}

/* =========================================================
 * Pasos (misma estructura que Event.tsx)
 * =======================================================*/
function useSteps() {
  return [
    {
      icon: "🏷️",
      title: "Identidad & contacto",
      content: (
        <LocalCard title="Identidad & contacto">
          <RHFInput name="nombre" label="Nombre del club *" placeholder="Ej: Purple House" />
          <RHFTextarea
            name="descripcion"
            label="Descripción del club *"
            rows={4}
            placeholder="Concepto, ambiente, propuesta musical..."
          />
          <RHFInput name="direccion" label="Dirección *" placeholder="Calle y número" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RHFInput name="ciudad" label="Ciudad *" placeholder="Ej: Santiago" />
            <RHFInput name="pais" label="País *" placeholder="Ej: Chile" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RHFInput name="telefono" label="Teléfono" placeholder="+56 9 1234 5678" />
            <RHFInput name="email" type="email" label="Email" placeholder="contacto@club.com" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RHFInput name="sitio_web" label="Sitio web" placeholder="https://tusitio.com" />
            <RHFInput name="instagram" label="Instagram (URL)" placeholder="https://instagram.com/tuclub" />
          </div>
        </LocalCard>
      ),
    },
    {
      icon: "🖼️",
      title: "Medios",
      content: (
        <LocalCard title="Medios">
          {/* Aquí subes archivos, NO URLs */}
          <RHFFile name="imagen" label="Foto de perfil del club (imagen)" />
          <RHFFile name="banner" label="Banner del club (banner)" />
        </LocalCard>
      ),
    },
    {
      icon: "🧩",
      title: "Servicios & capacidades",
      content: (
        <LocalCard title="Servicios & capacidades">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RHFSelect name="accesibilidad" label="Accesibilidad" options={["Sí", "No"]} />
            <RHFSelect name="estacionamiento" label="Estacionamiento" options={["Sí", "No"]} />
            <RHFSelect name="guardarropia" label="Guardarropía" options={["Sí", "No"]} />
            <RHFSelect name="terraza" label="Terraza" options={["Sí", "No"]} />
            <RHFSelect name="fumadores" label="Zona de fumadores" options={["Sí", "No"]} />
            <RHFSelect name="wi_fi" label="Wi-Fi" options={["Sí", "No"]} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RHFInput name="ambientes" type="number" label="Ambientes (número)" placeholder="Ej: 3" />
            <RHFInput name="banos" type="number" label="Baños (número)" placeholder="Ej: 4" />
          </div>
        </LocalCard>
      ),
    },
  ] as const;
}