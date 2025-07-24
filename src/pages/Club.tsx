// src/pages/Club.tsx
import { useState } from "react";
import {
  FormProvider,
  useForm,
  type FieldPath,
  type Resolver,
  type DeepPartial,      // 👈 desde react-hook-form
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../assets/goup_logo.png";

import { clubSchema, type ClubData } from "@/lib/schemas";
import { useStepper } from "@/hooks/useStepper";
import { StepDots } from "@/components/Stepper";
import {
    EntityCard,
    Section,
    StepErrorBanner,
    RHFInput,
    RHFTextarea,
    RHFSelect,
    RHFServiceSwitch,
    RHFFile,
  } from "../components/form/control";
import { collectStepErrors } from "../utils/form";

export default function ClubPage() {
  return <ClubWizard />;
}

function ClubWizard() {
  type FormValues = ClubData;

  const defaultValues: DeepPartial<FormValues> = {
    servicios: {
      estacionamiento: false,
      guardarropia: false,
      terraza: false,
      accesibilidad: false,
      wifi: false,
      fumadores: false,
    },
  };

  const resolver = zodResolver(clubSchema) as Resolver<FormValues>;

  const methods = useForm<FormValues>({
    resolver,
    defaultValues,
    mode: "onChange",
  });

  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [loadingStep, setLoadingStep] = useState(false);

  const communes = [
    "Cerrillos","Cerro Navia","Conchalí","El Bosque","Estación Central","Huechuraba","La Cisterna","La Florida","La Granja","La Pintana","La Reina","Las Condes","Lo Barnechea","Lo Espejo","Lo Prado","Macul","Maipú","Ñuñoa","Pedro Aguirre Cerda","Peñalolén","Providencia","Pudahuel","Puente Alto","Quilicura","Quinta Normal","Recoleta","Renca","San Bernardo","San Joaquín","San Miguel","San Ramón","Santiago","Vitacura"
  ];

  const steps = [
    {
      icon: "🏢",
      title: "Información General",
      content: (
        <>
          <RHFInput name="nombre" label="Nombre *" placeholder="Ej: Club Prisma" />
          <RHFInput name="email" label="Correo" placeholder="contacto@club.cl" />
          <RHFInput name="tel" label="Teléfono" placeholder="+56 9 1234 5678" />
          <RHFTextarea
            name="desc"
            label="Descripción"
            rows={3}
            placeholder="Describe el club, su propuesta, estilo musical, etc."
          />
        </>
      ),
    },
    {
      icon: "📍",
      title: "Ubicación",
      content: (
        <>
          <RHFInput name="direccion" label="Dirección" placeholder="Av. Siempre Viva 123" />
          <RHFSelect
            name="comuna"
            label="Comuna"
            placeholder="Selecciona una comuna"
            options={communes}
          />
        </>
      ),
    },
    {
      icon: "👥",
      title: "Capacidad & Espacios",
      content: (
        <>
          <RHFInput name="aforo" type="number" label="Aforo *" placeholder="Ej: 500" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <RHFInput name="banos" type="number" label="Baños" placeholder="Ej: 6" />
          <RHFInput name="amb" type="number" label="Ambientes/Escenarios" placeholder="Ej: 2" />
          </div>
        </>
      ),
    },
    {
      icon: "🛠️",
      title: "Servicios",
      content: (
        <div className="space-y-2">
          <RHFServiceSwitch<FormValues> name="servicios.estacionamiento" label="Estacionamiento" />
          <RHFServiceSwitch<FormValues> name="servicios.guardarropia" label="Guardarropía" />
          <RHFServiceSwitch<FormValues> name="servicios.terraza" label="Terraza" />
          <RHFServiceSwitch<FormValues> name="servicios.accesibilidad" label="Accesibilidad (Movilidad reducida)" />
          <RHFServiceSwitch<FormValues> name="servicios.wifi" label="Wi-Fi" />
          <RHFServiceSwitch<FormValues> name="servicios.fumadores" label="Zona fumadores" />
        </div>
      ),
    },
    {
      icon: "🖼️",
      title: "Imágenes",
      content: (
        <>
          <RHFFile<FormValues> label="Imagen de Perfil" name="img_perfil" />
          <RHFFile<FormValues> label="Banner" name="img_banner" />
        </>
      ),
    },
    {
      icon: "✅",
      title: "Revisión & Envío",
      content: <p className="text-sm text-white/70">Revisa tus datos y envía el formulario.</p>,
    },
  ] as const;

  const stepFields: FieldPath<FormValues>[][] = [
    ["nombre", "email", "tel", "desc"],
    ["direccion", "comuna"],
    ["aforo", "banos", "amb"],
    [
      "servicios.estacionamiento",
      "servicios.guardarropia",
      "servicios.terraza",
      "servicios.accesibilidad",
      "servicios.wifi",
      "servicios.fumadores",
    ],
    ["img_perfil", "img_banner"],
    [],
  ];

  const { current, total, step, next, prev } = useStepper(steps);

  const onSubmitStep = async () => {
    setLoadingStep(true);
    const fields = stepFields[current];
    const ok = await methods.trigger(fields, { shouldFocus: true });
    if (!ok) {
      const msgs = collectStepErrors(methods.formState.errors, fields as string[]);
      setStepErrors(msgs);
      toast.error(msgs[0] ?? "Corrige los campos para continuar.");
      setLoadingStep(false);
      return;
    }
    setStepErrors([]);
    toast.success("Paso guardado ✅");
    next();
    setLoadingStep(false);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  };

  const onSubmit = async (data: FormValues) => {
    setLoadingStep(true);
    const toastId = toast.loading("Enviando…");
    try {
      await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "club", payload: data }),
      });
      toast.success("¡Club enviado!", { id: toastId });
      methods.reset(defaultValues);
    } catch (e) {
      console.error(e);
      toast.error("Error al enviar", { id: toastId });
    } finally {
      setLoadingStep(false);
    }
  };

  return (
    <main className="px-4 py-6 flex justify-center">
         <header className="max-w-3xl mx-auto space-y-2 mb-8 text-center">
        <img src={logo} alt="GoUp" className="mx-auto w-28" />
        <h1 className="text-3xl md:text-4xl font-extrabold">
          TRABAJA <span className="text-[#8e2afc]">CON</span> NOSOTROS
        </h1>
        <p className="text-white/70">
          Ingresa tu club para trabajar empezar con GoUp
        </p>
      </header>
      <EntityCard title="REGISTRO DE CLUB">
        {() => (
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)} className="flex flex-col gap-6 text-sm">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.22 }}
                >
                  <Section icon={step.icon} title={step.title}>
                    <StepErrorBanner errors={stepErrors} />
                    {step.content}
                  </Section>
                </motion.div>
              </AnimatePresence>

              <StepDots total={total} current={current} />

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => {
                    prev();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={current === 0 || loadingStep}
                  className="px-4 py-2 rounded border border-white/20"
                >
                  Atrás
                </button>

                {current < total - 1 ? (
                  <button
                    type="button"
                    onClick={onSubmitStep}
                    disabled={loadingStep}
                    className="px-4 py-2 rounded bg-[#8e2afc]"
                  >
                    {loadingStep ? "Validando..." : "Siguiente"}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loadingStep}
                    className="px-4 py-2 rounded bg-[#8e2afc]"
                  >
                    {loadingStep ? "Enviando..." : "Enviar"}
                  </button>
                )}
              </div>
            </form>
          </FormProvider>
        )}
      </EntityCard>
    </main>
  );
}