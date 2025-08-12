// src/pages/Event.tsx
import React, { useState } from "react";
import {
  useForm,
  FormProvider,
  type FieldError,
  type FieldPath,
  type FieldErrors,
  type FieldValues,
  type Resolver,
} from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/goup_logo.png";
import { eventSchema } from "@/lib/schemas";
import { useStepper } from "@/hooks/useStepper";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { LineupFields } from "@/components/form/LineupFields";

import {
  RHFInput,
  RHFTextarea,
  RHFSelect,
  RHFCheckboxGroup,
  RHFFile,
  StepErrorBanner,
} from "@/components/form/control";

import {
  Firestore,
  collection,
  doc,
  setDoc,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { db as firebaseDb } from "@/lib/firebase";

export type EventFormValues = z.infer<typeof eventSchema>;
type Keys = FieldPath<EventFormValues>;

const defaultEventValues: EventFormValues = {
  nombre: "",
  tipo: "",
  fecha: "",
  horaInicio: "",
  horaCierre: "",
  capacidad: "",
  presupuesto: "",
  promotor: "",
  telefono: "",
  email: "",
  desc: "",
  generos: [],
  flyer: null,
  imgSec: null,
  edad: 18,
  tieneVip: "",
  vip: "",
  reservas: false,
  tieneLineup: false,
  cantidadDJs: "",
  djs: [],
  dress_code: "",
};

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
const vipToCount = (v: unknown): number => {
  const s = String(v);
  if (s.toLowerCase() === "no" || s === "" || s === "0") return 0;
  if (s.toLowerCase().includes("más de")) return 6;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
const vipToBool = (v: unknown): boolean => vipToCount(v) > 0;

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${
            i === step ? "bg-[#8e2afc]" : "bg-white/20"
          }`}
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
function SuccessModal({
  open,
  title,
  subtitle,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm">
      <div className="max-w-md rounded-md bg-neutral-900 p-6 text-center shadow-lg">
        <h2 className="mb-2 text-2xl font-semibold text-green-400">{title}</h2>
        {subtitle && <p className="text-white/70">{subtitle}</p>}
        <button
          className="mt-6 rounded bg-[#8e2afc] px-4 py-2 text-sm font-medium hover:bg-[#7b1fe0]"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

export default function EventPage() {
  return <EventWizard />;
}

function EventWizard() {
  const methods = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema) as unknown as Resolver<EventFormValues>,
    defaultValues: defaultEventValues,
    mode: "onChange",
  });

  const [loadingStep, setLoadingStep] = useState(false);
  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const [generosOtro, setGenerosOtro] = useState("");

  const steps = useSteps(methods, generosOtro, setGenerosOtro);
  const { current, total, next, prev } = useStepper(steps);
  const navigate = useNavigate();
  const { user } = useAuth();

  const stepFields: Keys[][] = [
    ["nombre", "tipo"],
    ["fecha", "horaInicio", "horaCierre"],
    ["capacidad"],
    ["promotor", "telefono", "email"],
    ["desc", "generos"],
    ["edad", "dress_code", "tieneVip", "reservas", "tieneLineup", "djs"],
    ["flyer", "imgSec"],
    [],
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmitFinal = async (data: EventFormValues) => {
    if (sent) return;
    if (!user?.uid) {
      toast.error("Debes iniciar sesión");
      return;
    }
    setLoadingStep(true);

    try {
      const upload = async (file: File | null, folder: string) => {
        if (!file) return null;
        const storage = getStorage();
        const ext = file.name.split(".").pop() || "jpg";
        const path = `Eventos/${user.uid}/${folder}/${Date.now()}.${ext}`;
        const ref = storageRef(storage, path);
        await uploadBytes(ref, file);
        return getDownloadURL(ref);
      };
      const flyerUrl = await upload(data.flyer as File | null, "flyer");
      const imgSecUrl = await upload(data.imgSec as File | null, "imgSec");

      const cleanedDJs = (data.djs || [])
        .map((dj) => (dj ?? "").toString().trim())
        .filter(Boolean);

      const generosFinal = data.generos.includes("Otros") && generosOtro.trim()
        ? [...data.generos.filter((g) => g !== "Otros"), generosOtro.trim()]
        : data.generos;

      const payload = {
        nombre: data.nombre,
        tipo: data.tipo,
        fecha: data.fecha,
        horaInicio: data.horaInicio,
        horaCierre: data.horaCierre,
        capacidad: data.capacidad,
        presupuesto: data.presupuesto,
        promotor: data.promotor,
        telefono: data.telefono,
        email: data.email,
        desc: data.desc,
        generos: generosFinal,
        edad: asInt(data.edad, 18),
        dress_code: data.dress_code,
        tieneVip: vipToBool(data.tieneVip),
        cantidadZonasVip: vipToCount(data.tieneVip),
        aceptaReservas: asBool(data.reservas),
        tieneLineup: asBool(data.tieneLineup),
        cantidadDJs: cleanedDJs.length,
        djs: cleanedDJs,
        flyer: flyerUrl,
        imgSec: imgSecUrl,
        uid_usersWeb: "/usersWeb/" + user.uid,
        createdAt: new Date().toISOString(),
      };

      const eventosCol = collection(firebaseDb as Firestore, "Eventos");
      const newDoc = doc(eventosCol);
      await setDoc(newDoc, payload);

      toast.success("¡Evento creado con éxito!");
      setSent(true);
      methods.reset(defaultEventValues);
      setTimeout(() => navigate("/mis-eventos"), 1500);
    } catch (err: any) {
      console.error("Error creando evento:", err);
      toast.error(err.message || "Error inesperado");
    } finally {
      setLoadingStep(false);
    }
  };

  return (
    <main className="relative text-white px-4 py-8 overflow-x-hidden">
      <header className="max-w-3xl mx-auto space-y-2 mb-8 text-center">
        <img src={logo} alt="GoUp" className="mx-auto w-28" />
        <h1 className="text-3xl md:text-4xl font-extrabold">
          CREAR <span className="text-[#8e2afc]">EVENTO</span>
        </h1>
        <p className="text-white/70">Organiza la experiencia perfecta con GoUp</p>
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
          noValidate
          className="max-w-3xl mx-auto space-y-8"
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
            <LoadingButton loading={loadingStep} type="submit">
              {current === total - 1 ? "Enviar formulario" : "Siguiente"}
            </LoadingButton>
          </div>
        </form>
      </FormProvider>

      <SuccessModal
        open={sent}
        title="¡Evento enviado!"
        subtitle="Nos pondremos en contacto contigo pronto."
        onClose={() => setSent(false)}
      />
    </main>
  );
}

function useSteps(
  methods: ReturnType<typeof useForm<EventFormValues>>,
  generosOtro: string,
  setGenerosOtro: React.Dispatch<React.SetStateAction<string>>
) {
  const generosMusicales = [
    "Reguetón",
    "Techno",
    "House",
    "Pop",
    "Salsa",
    "Hardstyle",
    "Trance",
    "Hip-Hop",
    "Urbano",
    "Guaracha",
    "Otros",
  ] as const;

  return [
    {
      icon: "🎵",
      title: "Información del Evento",
      content: (
        <LocalCard title="Información del Evento">
          <RHFInput
            name="nombre"
            label="Nombre del Evento *"
            placeholder="Ej: PURPLE NIGHTS • MIDNIGHT VIBES"
          />
          <RHFSelect
            name="tipo"
            label="Tipo de Evento *"
            options={["Club", "Festival", "After", "Privado", "Open Air", "Bar"]}
          />
        </LocalCard>
      ),
    },
    {
      icon: "🕒",
      title: "Fecha & Horario",
      content: (
        <LocalCard title="Fecha & Horario">
          <RHFInput name="fecha" type="date" label="Fecha *" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RHFInput name="horaInicio" type="time" label="Inicio *" />
            <RHFInput name="horaCierre" type="time" label="Cierre *" />
          </div>
        </LocalCard>
      ),
    },
    {
      icon: "👥",
      title: "Capacidad",
      content: (
        <LocalCard title="Capacidad">
          <RHFSelect
            name="capacidad"
            label="Capacidad esperada *"
            options={["0 a 200", "201 a 500", "501 a 1000", "Más de 1000"]}
          />
        </LocalCard>
      ),
    },
    {
      icon: "📞",
      title: "Contacto organizador",
      content: (
        <LocalCard title="Contacto organizador">
          <RHFInput name="promotor" label="Promotor *" />
          <RHFInput name="telefono" label="Teléfono *" />
          <RHFInput name="email" type="email" label="Email *" />
        </LocalCard>
      ),
    },
    {
      icon: "✨",
      title: "Concepto & Experiencia",
      content: (
        <LocalCard title="Concepto & Experiencia">
          <RHFTextarea name="desc" label="Descripción *" rows={4} />
          <RHFCheckboxGroup
            name="generos"
            label="Géneros musicales *"
            options={[...generosMusicales]}
          />
          {methods.watch("generos")?.includes("Otros") && (
            <RHFInput
              name="generosOtro"
              label="¿Cuál otro género?"
              value={generosOtro}
              onChange={(e) => setGenerosOtro(e.target.value)}
            />
          )}
        </LocalCard>
      ),
    },
    {
      icon: "🧾",
      title: "Políticas del evento",
      content: (
        <LocalCard title="Políticas del evento">
          <RHFSelect
            name="edad"
            label="Edad mínima *"
            options={Array.from({ length: 53 }, (_, i) => `${i + 18}`)}
          />
          <RHFSelect
            name="dress_code"
            label="Dress code *"
            options={["Casual", "Formal", "Semi-formal", "Urbano", "Temático"]}
          />
          <RHFSelect name="tieneVip" label="¿Zonas VIP?" options={["No", "1", "2", "Más de 5"]} />
          <RHFSelect name="reservas" label="¿Acepta reservas?" options={["Sí", "No"]} />
          <RHFSelect name="tieneLineup" label="¿Tendrá Lineup?" options={["Sí", "No"]} />
          <LineupFields />
        </LocalCard>
      ),
    },
    {
      icon: "🛡️",
      title: "Flyer & Seguridad",
      content: (
        <LocalCard title="Flyer & Seguridad">
          <RHFFile name="flyer" label="Flyer del evento" />
          <RHFFile name="imgSec" label="Imagen secundaria" />
        </LocalCard>
      ),
    },
    {
      icon: "✅",
      title: "Revisión",
      content: (
        <LocalCard title="Revisión final">
          <p className="text-white/70">Revisa todos los datos antes de enviar.</p>
        </LocalCard>
      ),
    },
  ] as const;
}