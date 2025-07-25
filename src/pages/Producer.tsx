// src/pages/Producer.tsx
import { useState } from "react";
import {
  FormProvider,
  useForm,
  type Resolver,
  type FieldPath,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../assets/goup_logo.png";
import { producerSchema, type ProducerData } from "@/lib/schemas";
import { useStepper } from "../hooks/useStepper";
import { StepDots } from "../components/Stepper";
import {
  EntityCard,
  Section,
  StepErrorBanner,
  RHFInput,
  RHFFile,
} from "../components/form/control";
import { collectStepErrors } from "@/utils/form";

export default function ProducerPage() {
  return <ProducerWizard />;
}

function ProducerWizard() {
  type FormValues = ProducerData;

  const methods = useForm<FormValues>({
    resolver: zodResolver(producerSchema) as Resolver<FormValues>,
    mode: "onChange",
  });

  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [loadingStep, setLoadingStep] = useState(false);

  const steps = [
    {
      icon: "🏢",
      title: "Datos de la Productora",
      content: (
        <>
          <RHFInput name="nombre" label="Nombre *" placeholder="Ej: Midnight Prod" />
          <RHFInput name="correo" label="Correo *" placeholder="contacto@prod.cl" />
          <RHFInput name="tel" label="Teléfono *" placeholder="+56 9 1234 5678" />
        </>
      ),
    },
    {
      icon: "📑",
      title: "Datos Legales",
      content: (
        <>
          <RHFInput name="rut" label="RUT *" placeholder="11.111.111-1" />
          <RHFInput name="rs" label="Razón Social *" placeholder="Productora Midnight SpA" />
        </>
      ),
    },
    {
      icon: "🌐",
      title: "Perfiles",
      content: (
        <>
          <RHFInput name="instagram" label="Instagram" placeholder="@midnightprod" />
          <RHFInput name="web" label="Sitio web" placeholder="https://midnightprod.cl" />
        </>
      ),
    },
    {
      icon: "🖼️",
      title: "Imágenes",
      content: (
        <>
          <RHFFile<FormValues> name="img_perfil_prod" label="Imagen de Perfil" />
          <RHFFile<FormValues> name="img_banner_prod" label="Banner" />
        </>
      ),
    },
    {
      icon: "✅",
      title: "Revisión & Envío",
      content: <p className="text-sm text-white/70">Revisa tus datos antes de enviar.</p>,
    },
  ] as const;

  const stepFields: FieldPath<FormValues>[][] = [
    ["nombre", "correo", "tel"],
    ["rut", "rs"],
    ["instagram", "web"],
    ["img_perfil_prod", "img_banner_prod"],
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
        body: JSON.stringify({ type: "producer", payload: data }),
      });
      toast.success("¡Productora enviada!", { id: toastId });
      methods.reset();
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
          Ingresa tu productora para empezar con GoUp
        </p>
      </header>
      <EntityCard title="REGISTRO DE PRODUCTORA">
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