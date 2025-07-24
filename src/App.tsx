import {
  useState,
  type Dispatch,
  type SetStateAction,
  type ReactElement,
  type ReactNode,
} from "react";

import {
  useForm,
  FormProvider,
  Controller,
  type DeepPartial,
  type Resolver,
  useFormContext,
  get,
  type FieldValues,
  type FieldPath,
  type FieldPathValue,
  type FieldErrors,
} from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { UploadCloud, CheckCircle2 } from "lucide-react";
import logo from "@/assets/goup_logo.png";

import {
  clubSchema,
  producerSchema,
  eventSchema,
  type ClubData,
  type ProducerData,
  type EventData,
} from "@/lib/schemas";
import { useStepper } from "@/hooks/useStepper";
import { StepDots } from "@/components/Stepper";
import { LoadingButton } from "@/components/LoadingButton";
import { collectStepErrors } from "@/utils/form";

/* -------------------------------------------------------
 *                     ROOT APP
 * ----------------------------------------------------- */
export default function App() {
  const [mode, setMode] = useState<"club" | "prod" | "evt">("club");

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6 flex flex-col gap-6 items-center">
      <img src={logo} alt="GoUp" className="w-44" />

      <div className="flex gap-2 flex-wrap justify-center">
        {([
          { k: "club", t: "Club" },
          { k: "prod", t: "Productora" },
          { k: "evt", t: "Evento" },
        ] as const).map(({ k, t }) => (
          <Button
            key={k}
            variant={mode === k ? "default" : "outline"}
            className="w-32 transition-all active:scale-95"
            onClick={() => setMode(k)}
          >
            {t}
          </Button>
        ))}
      </div>

      {mode === "club" && <ClubWizard />}
      {mode === "prod" && <ProducerWizard />}
      {mode === "evt" && <EventWizard />}
    </div>
  );
}

/* -------------------------------------------------------
 *                 WIZARD: CLUB
 * ----------------------------------------------------- */
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
          <RHFInput name="nombre" label="Nombre *" placeholder="Ej: Club Prisma" required />
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
          <RHFInput
            name="aforo"
            type="number"
            label="Aforo *"
            placeholder="Ej: 500"
            required
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <RHFInput
              name="banos"
              type="number"
              label="Cantidad de baños"
              placeholder="Ej: 6"
            />
            <RHFInput
              name="amb"
              type="number"
              label="Ambientes"
              placeholder="Ej: 2"
            />
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
      content: <ReviewBlock />,
    },
  ] as const;

  // 👇 CLAVE: tipado con FieldPath<FormValues>[][].
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
    <EntityCard title="REGISTRO DE CLUB">
      {() => (
        <FormProvider {...methods}>
          <form
            onSubmit={methods.handleSubmit(onSubmit)}
            className="flex flex-col gap-6 text-sm"
          >
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
              <LoadingButton
                type="button"
                onClick={() => {
                  prev();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={current === 0 || loadingStep}
                className="border border-white/20"
              >
                Atrás
              </LoadingButton>

              {current < total - 1 ? (
                <LoadingButton
                  type="button"
                  onClick={onSubmitStep}
                  loading={loadingStep}
                  className="bg-[#8e2afc] hover:bg-[#7a25d8]"
                >
                  Siguiente
                </LoadingButton>
              ) : (
                <LoadingButton
                  type="submit"
                  loading={loadingStep}
                  className="bg-[#8e2afc] hover:bg-[#7a25d8]"
                >
                  Enviar
                </LoadingButton>
              )}
            </div>
          </form>
        </FormProvider>
      )}
    </EntityCard>
  );
}

/* -------------------------------------------------------
 *               WIZARD: PRODUCTORA
 * ----------------------------------------------------- */
function ProducerWizard() {
  type FormValues = ProducerData;

  const defaultValues: DeepPartial<FormValues> = {};
  const resolver = zodResolver(producerSchema) as Resolver<FormValues>;
  const methods = useForm<FormValues>({ resolver, defaultValues, mode: "onChange" });

  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [loadingStep, setLoadingStep] = useState(false);

  const steps = [
    {
      icon: "🎛️",
      title: "Datos de la Productora",
      content: (
        <>
          <RHFInput
            name="nombre"
            label="Nombre Productora *"
            placeholder="Ej: Midnight Corp"
            required
          />
          <RHFInput
            name="correo"
            label="Correo *"
            type="email"
            placeholder="contacto@productora.cl"
            required
          />
          <RHFInput name="tel" label="Teléfono" placeholder="+56 9 1234 5678" />
        </>
      ),
    },
    {
      icon: "🖼️",
      title: "Imágenes",
      content: (
        <>
          <RHFFile<FormValues> label="Imagen de Perfil" name="img_perfil_prod" />
          <RHFFile<FormValues> label="Banner" name="img_banner_prod" />
        </>
      ),
    },
    {
      icon: "💳",
      title: "Facturación (opcional)",
      content: (
        <>
          <RHFInput name="rut" label="RUT" placeholder="11.111.111-1" />
          <RHFInput name="rs" label="Razón Social" placeholder="Productora Midnight SpA" />
        </>
      ),
    },
    {
      icon: "✅",
      title: "Revisión & Envío",
      content: <ReviewBlock />,
    },
  ] as const;

  const stepFields: FieldPath<FormValues>[][] = [
    ["nombre", "correo", "tel"],
    ["img_perfil_prod", "img_banner_prod"],
    ["rut", "rs"],
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
      methods.reset(defaultValues);
    } catch (e) {
      console.error(e);
      toast.error("Error al enviar", { id: toastId });
    } finally {
      setLoadingStep(false);
    }
  };

  return (
    <EntityCard title="REGISTRO DE PRODUCTORA">
      {() => (
        <FormProvider {...methods}>
          <form
            onSubmit={methods.handleSubmit(onSubmit)}
            className="flex flex-col gap-6 text-sm"
          >
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
              <LoadingButton
                type="button"
                onClick={() => {
                  prev();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={current === 0 || loadingStep}
                className="border border-white/20"
              >
                Atrás
              </LoadingButton>

              {current < total - 1 ? (
                <LoadingButton
                  type="button"
                  onClick={onSubmitStep}
                  loading={loadingStep}
                  className="bg-[#8e2afc] hover:bg-[#7a25d8]"
                >
                  Siguiente
                </LoadingButton>
              ) : (
                <LoadingButton
                  type="submit"
                  loading={loadingStep}
                  className="bg-[#8e2afc] hover:bg-[#7a25d8]"
                >
                  Enviar
                </LoadingButton>
              )}
            </div>
          </form>
        </FormProvider>
      )}
    </EntityCard>
  );
}

/* -------------------------------------------------------
 *                 WIZARD: EVENTO
 * ----------------------------------------------------- */
function EventWizard() {
  type FormValues = EventData;

  const defaultValues: DeepPartial<FormValues> = { generos: [] };

  const resolver = zodResolver(eventSchema) as Resolver<FormValues>;

  const methods = useForm<FormValues>({
    resolver,
    defaultValues,
    mode: "onChange",
  });

  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [loadingStep, setLoadingStep] = useState(false);

  const genres = [
    "Techno",
    "House",
    "Reguetón",
    "Pop",
    "Salsa",
    "Trap",
    "Rock",
    "Electro",
    "Funk",
  ];

  const steps = [
    {
      icon: "🎵",
      title: "Información del Evento",
      content: (
        <>
          <RHFInput
            name="nombre"
            label="Nombre del Evento *"
            placeholder="Ej: PURPLE NIGHTS • MIDNIGHT VIBES"
            required
          />
          <RHFSelect
            name="tipo"
            label="Tipo de Evento *"
            placeholder="Selecciona el tipo"
            options={["Club", "Festival", "After", "Privado", "Otro"]}
            required
          />
        </>
      ),
    },
    {
      icon: "📅",
      title: "Fecha & Horario",
      content: (
        <div className="grid sm:grid-cols-2 gap-4">
          <RHFInput name="fecha" label="Fecha del Evento *" type="date" required />
          <RHFInput name="inicio" label="Hora de Inicio *" type="time" required />
          <RHFInput name="fin" label="Hora de Cierre *" type="time" required />
          <RHFInput name="edad" label="Edad mínima *" type="number" placeholder="Ej: 18" required />
        </div>
      ),
    },
    {
      icon: "👥",
      title: "Capacidad",
      content: (
        <>
          <RHFSelect
            name="capacidad"
            label="Capacidad Esperada *"
            placeholder="Selecciona capacidad"
            options={["<100", "100-300", "300-700", "700-1500", "1500+"]}
            required
          />
        </>
      ),
    },
    {
      icon: "📞",
      title: "Contacto Organizador",
      content: (
        <>
          <RHFInput
            name="promotor"
            label="Nombre del Promotor *"
            placeholder="Tu nombre o nombre artístico"
            required
          />
          <RHFInput
            name="telefono"
            label="WhatsApp/Teléfono *"
            placeholder="(+569) 1111 2222"
            required
          />
          <RHFInput
            name="email"
            label="Email de Contacto *"
            type="email"
            placeholder="promotor@goup.com"
            required
          />
        </>
      ),
    },
    {
      icon: "✨",
      title: "Concepto & Experiencia",
      content: (
        <>
          <RHFTextarea
            name="desc"
            label="Descripción general"
            rows={4}
            placeholder="Género musical, DJ lineup, visuales, luces, máquinas de humo, dress code..."
          />
          <RHFCheckboxGroup<FormValues, "generos">
            name="generos"
            label="Géneros musicales (opcional)"
            options={genres}
          />
        </>
      ),
    },
    {
      icon: "🖼️",
      title: "Imágenes / Media",
      content: (
        <>
          <RHFFile<FormValues> label="Flyer / Banner" name="flyer" />
          <RHFFile<FormValues> label="Imagen secundaria (opcional)" name="img_sec" />
        </>
      ),
    },
    {
      icon: "✅",
      title: "Revisión & Envío",
      content: <ReviewBlock />,
    },
  ] as const;

  const stepFields: FieldPath<FormValues>[][] = [
    ["nombre", "tipo"],
    ["fecha", "inicio", "fin", "edad"],
    ["capacidad", "presupuesto"],
    ["promotor", "telefono", "email"],
    ["desc", "generos"],
    ["flyer", "img_sec"],
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
        body: JSON.stringify({ type: "event", payload: data }),
      });
      toast.success("¡Evento enviado!", { id: toastId });
      methods.reset(defaultValues);
    } catch (e) {
      console.error(e);
      toast.error("Error al enviar", { id: toastId });
    } finally {
      setLoadingStep(false);
    }
  };

  return (
    <EntityCard title="CREAR EVENTO NOCTURNO">
      {() => (
        <FormProvider {...methods}>
          <form
            onSubmit={methods.handleSubmit(onSubmit)}
            className="flex flex-col gap-6 text-sm"
          >
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
              <LoadingButton
                type="button"
                onClick={() => {
                  prev();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={current === 0 || loadingStep}
                className="border border-white/20"
              >
                Atrás
              </LoadingButton>

              {current < total - 1 ? (
                <LoadingButton
                  type="button"
                  onClick={onSubmitStep}
                  loading={loadingStep}
                  className="bg-[#8e2afc] hover:bg-[#7a25d8]"
                >
                  Siguiente
                </LoadingButton>
              ) : (
                <LoadingButton
                  type="submit"
                  loading={loadingStep}
                  className="bg-[#8e2afc] hover:bg-[#7a25d8]"
                >
                  Enviar
                </LoadingButton>
              )}
            </div>
          </form>
        </FormProvider>
      )}
    </EntityCard>
  );
}

/* -------------------------------------------------------
 *             COMPONENTES RHF (inputs)
 * ----------------------------------------------------- */

function RHFInput({
  name,
  label,
  helper,
  ...props
}: React.ComponentProps<"input"> & { name: string; label: string; helper?: string }) {
  const {
    register,
    formState: { errors },
  } = useFormContextSafe();

  const node = get(errors, name) as { message?: string } | undefined;
  const err = node?.message;

  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        {...register(name)}
        {...props}
        className={`rounded-md px-3 py-2 bg-[#0f0f16] border ${
          err ? "border-red-500" : "border-[#3a3357]"
        } focus:outline-none focus:border-[#8e2afc] placeholder:text-white/30`}
      />
      {helper && <span className="text-xs text-white/40">{helper}</span>}
      {err && <span className="text-xs text-red-500">{err}</span>}
    </label>
  );
}

function RHFTextarea({
  name,
  label,
  helper,
  ...props
}: React.ComponentProps<"textarea"> & { name: string; label: string; helper?: string }) {
  const {
    register,
    formState: { errors },
  } = useFormContextSafe();

  const node = get(errors, name) as { message?: string } | undefined;
  const err = node?.message;

  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <textarea
        {...register(name)}
        {...props}
        className={`rounded-md px-3 py-2 bg-[#0f0f16] border ${
          err ? "border-red-500" : "border-[#3a3357]"
        } focus:outline-none focus:border-[#8e2afc] placeholder:text-white/30 resize-none`}
      />
      {helper && <span className="text-xs text-white/40">{helper}</span>}
      {err && <span className="text-xs text-red-500">{err}</span>}
    </label>
  );
}

type RHFSelectProps = React.ComponentProps<"select"> & {
  name: string;
  label: string;
  helper?: string;
  options: string[];
  placeholder?: string;
};

function RHFSelect({
  name,
  label,
  helper,
  options,
  placeholder,
  ...props
}: RHFSelectProps) {
  const {
    register,
    formState: { errors },
  } = useFormContextSafe();
  const node = get(errors, name) as { message?: string } | undefined;
  const err = node?.message;

  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <select
        {...register(name)}
        defaultValue=""
        {...props}
        className={`rounded-md px-3 py-2 bg-[#0f0f16] border ${
          err ? "border-red-500" : "border-[#3a3357]"
        } focus:outline-none focus:border-[#8e2afc] text-white`}
      >
        {placeholder && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {helper && <span className="text-xs text-white/40">{helper}</span>}
      {err && <span className="text-xs text-red-500">{err}</span>}
    </label>
  );
}

function RHFServiceSwitch<TFieldValues extends FieldValues>({
  name,
  label,
}: {
  name: FieldPath<TFieldValues>;
  label: string;
}) {
  const { control } = useFormContext<TFieldValues>();

  return (
    <Controller<TFieldValues>
      name={name}
      control={control}
      render={({ field: { value, onChange } }) => (
        <div className="flex items-center justify-between">
          <span>{label}</span>
          <Switch
            checked={Boolean(value)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange(e.target.checked)
            }
          />
        </div>
      )}
    />
  );
}

function RHFFile<
  TFieldValues extends FieldValues,
  P extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  label,
}: {
  name: P;
  label: string;
}) {
  const {
    setValue,
    formState: { errors },
  } = useFormContext<TFieldValues>();

  const node = get(errors, name as string) as { message?: string } | undefined;
  const err = node?.message;

  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <div
        className={`flex items-center gap-2 bg-[#0f0f16] border ${
          err ? "border-red-500" : "border-[#3a3357]"
        } rounded-md p-2`}
      >
        <UploadCloud size={18} className="text-[#8e2afc]" />
        <input
          type="file"
          accept="image/*"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            setValue(name, file as FieldPathValue<TFieldValues, P>, {
              shouldDirty: true,
            });
          }}
          className="flex-1 bg-transparent focus:outline-none text-white file:mr-2 file:rounded file:border-0 file:bg-[#8e2afc] file:px-2 file:py-1 file:text-white"
        />
      </div>
      {err && <span className="text-xs text-red-500">{err}</span>}
    </label>
  );
}

function RHFCheckboxGroup<
  TFieldValues extends FieldValues,
  P extends FieldPath<TFieldValues>
>({
  name,
  label,
  options,
}: {
  name: P;
  label: string;
  options: string[];
}) {
  const { watch, setValue } = useFormContext<TFieldValues>();
  const current = watch(name);
  const values = Array.isArray(current) ? (current as string[]) : [];

  const toggle = (v: string) => {
    const updated = values.includes(v)
      ? values.filter((x) => x !== v)
      : [...values, v];

    setValue(name, updated as FieldPathValue<TFieldValues, P>, {
      shouldDirty: true,
    });
  };

  return (
    <div className="mt-2">
      <p className="text-sm font-medium mb-2">{label}</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {options.map((g) => (
          <label key={g} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={values.includes(g)}
              onChange={() => toggle(g)}
            />
            <span>{g}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------
 *                    HELPERS / UI
 * ----------------------------------------------------- */

function StepErrorBanner({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300 mb-4">
      <p className="font-semibold mb-2">Corrige estos campos para continuar:</p>
      <ul className="list-disc pl-5 space-y-1">
        {errors.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </div>
  );
}

function useFormContextSafe<TFieldValues extends FieldValues>() {
  const ctx = useFormContext<TFieldValues>();
  if (!ctx) {
    throw new Error("useFormContextSafe debe usarse dentro de <FormProvider />");
  }
  return ctx;
}

function EntityCard({
  title,
  children,
}: {
  title: string;
  children: (sent: boolean, setSent: Dispatch<SetStateAction<boolean>>) => ReactElement;
}) {
  const [sent, setSent] = useState(false);
  return (
    <Card className="w-full max-w-lg bg-[#101018] border border-[#8e2afc33] rounded-2xl p-6 shadow-xl">
      <h1 className="text-2xl font-extrabold text-center mb-4 text-white">
        {title}
      </h1>
      {sent ? <SuccessMsg /> : children(sent, setSent)}
    </Card>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-extrabold tracking-tight text-[#b388ff] flex items-center gap-2">
        <span className="text-2xl">{icon}</span> {title}
      </h2>
      {children}
    </div>
  );
}

function ReviewBlock() {
  return (
    <p className="text-sm text-white/70">
      Revisa tus datos. Si todo está OK, presiona <strong>Enviar</strong>.
    </p>
  );
}

function SuccessMsg() {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <CheckCircle2 size={56} className="text-[#8e2afc]" />
      <p className="text-lg text-center">
        ¡Registro enviado!
        <br />
        Nos pondremos en contacto.
      </p>
    </div>
  );
}