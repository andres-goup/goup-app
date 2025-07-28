// src/pages/RoleRequestPage.tsx
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";

/* ===========================
   Schema y tipos
   =========================== */
const schema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  fecha_nacimiento: z.string().optional().or(z.literal("")),
  calle: z.string().optional().or(z.literal("")),
  ciudad: z.string().optional().or(z.literal("")),
  comuna: z.string().optional().or(z.literal("")),
  pais: z.string().optional().or(z.literal("")),
  tipo_solicitud: z.enum(["productor", "club_owner", "ambos"], {
    required_error: "Selecciona una opción",
  }),
});
type FormValues = z.infer<typeof schema>;

type UsuarioRow = {
  id_usuario: string;
  correo: string | null;
  nombre: string | null;
  fecha_nacimiento: string | null;
  calle: string | null;
  ciudad: string | null;
  comuna: string | null;
  pais: string | null;
  solicitud_tipo: "productor" | "club_owner" | "ambos" | null;
  solicitud_estado: "pendiente" | "aprobada" | "rechazada" | null;
  solicitud_enviada_at?: string | null;
  updated_at?: string | null;
};

/* ===========================
   Helpers UI locales
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
      <span className="block mb-1 text-sm font-medium text-white/80">{label}</span>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </label>
  );
}

function TextInput({
  name,
  register,
  type = "text",
  placeholder,
  disabled,
}: {
  name: keyof FormValues;
  register: any;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-md bg-transparent border border-white/20 px-3 py-2 focus:outline-none focus:border-[#8e2afc] disabled:opacity-60"
      {...register(name)}
    />
  );
}

function SelectInput({
  name,
  register,
  options,
  placeholder,
  disabled,
}: {
  name: keyof FormValues;
  register: any;
  options: Array<{ value: FormValues["tipo_solicitud"]; label: string }>;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <select
      disabled={disabled}
      className="w-full rounded-md bg-transparent border border-white/20 px-3 py-2 focus:outline-none focus:border-[#8e2afc] disabled:opacity-60"
      {...register(name)}
    >
      {placeholder && (
        <option value="" className="bg-neutral-900">
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-neutral-900">
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Badge({ status }: { status: UsuarioRow["solicitud_estado"] }) {
  const map: Record<string, string> = {
    pendiente:
      "text-xs px-2 py-1 rounded bg-[#8e2afc]/20 border border-[#8e2afc]/40 text-[#e4d7ff]",
    aprobada:
      "text-xs px-2 py-1 rounded bg-green-500/20 border border-green-500/40 text-green-200",
    rechazada:
      "text-xs px-2 py-1 rounded bg-red-500/20 border border-red-500/40 text-red-200",
  };
  const cls = status ? map[status] : "text-xs px-2 py-1 rounded bg-white/10 border border-white/20";
  const label = status ? status[0].toUpperCase() + status.slice(1) : "—";
  return <span className={cls}>{label}</span>;
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-md bg-white/5 border border-white/10 px-3 py-2">
      <p className="text-white/60 text-xs">{label}</p>
      <p className="text-white break-words">{value || "—"}</p>
    </div>
  );
}

const fmtDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("es", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso;
  }
};

/* ===========================
   Página
   =========================== */
export default function RoleRequestPage() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [idUsuario, setIdUsuario] = useState<string | null>(null);
  const [userRow, setUserRow] = useState<UsuarioRow | null>(null);
  const [editMode, setEditMode] = useState(false);

  const methods = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      nombre: "",
      fecha_nacimiento: "",
      calle: "",
      ciudad: "",
      comuna: "",
      pais: "",
      tipo_solicitud: "productor",
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = methods;

  // Cargar fila de `usuario`
  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("usuario")
        .select(
          "id_usuario, correo, nombre, fecha_nacimiento, calle, ciudad, comuna, pais, solicitud_tipo, solicitud_estado, solicitud_enviada_at, updated_at"
        )
        .eq("auth_user_id", user.id)
        .maybeSingle<UsuarioRow>();

      if (error) {
        console.warn("Error obteniendo usuario:", error.message);
        return;
      }
      if (!data) return;

      setUserRow(data);
      setIdUsuario(data.id_usuario);

      // prefill form con los datos actuales
      setValue("nombre", data.nombre ?? "");
      setValue(
        "fecha_nacimiento",
        data.fecha_nacimiento ? String(data.fecha_nacimiento).slice(0, 10) : ""
      );
      setValue("calle", data.calle ?? "");
      setValue("ciudad", data.ciudad ?? "");
      setValue("comuna", data.comuna ?? "");
      setValue("pais", data.pais ?? "");
      setValue(
        "tipo_solicitud",
        (data.solicitud_tipo as FormValues["tipo_solicitud"]) ?? "productor"
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const solicitudOptions: Array<{
    value: FormValues["tipo_solicitud"];
    label: string;
  }> = [
    { value: "productor", label: "Soy productor y quiero crear eventos" },
    { value: "club_owner", label: "Soy dueño de club y quiero crear eventos" },
    { value: "ambos", label: "Soy dueño de club y productora, me interesa crear eventos" },
  ];

  const hasRequest = Boolean(userRow?.solicitud_tipo); // si hay solicitud guardada, muestra 'Estado'
  const sentAt = userRow?.solicitud_enviada_at ?? userRow?.updated_at ?? null;

  // Enviar correo por tu API en Vercel (no expone claves en el cliente)
  const sendEmail = async () => {
    if (!user?.email) return;
    const v = getValues();
    try {
      const resp = await fetch("/api/sendgrid-role-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          nombre: v.nombre,
          fecha_nacimiento: v.fecha_nacimiento || null,
          calle: v.calle || null,
          ciudad: v.ciudad || null,
          comuna: v.comuna || null,
          pais: v.pais || null,
          tipo_solicitud: v.tipo_solicitud,
        }),
      });
      if (!resp.ok) {
        const detail = await resp.text().catch(() => "");
        console.warn("sendgrid-role-request falló:", resp.status, detail);
      }
    } catch (e) {
      console.warn("sendgrid-role-request error:", e);
    }
  };

  const saveToUsuario = async (values: FormValues, markSent: boolean) => {
    if (!idUsuario || !user?.email) throw new Error("Usuario no identificado");

    const nowISO = new Date().toISOString();

    const updatePayload: Partial<UsuarioRow> = {
      nombre: values.nombre,
      fecha_nacimiento: values.fecha_nacimiento || null,
      calle: values.calle || null,
      ciudad: values.ciudad || null,
      comuna: values.comuna || null,
      pais: values.pais || null,
      solicitud_tipo: values.tipo_solicitud,
      solicitud_estado: "pendiente",
      correo: user.email,
      ...(markSent ? { solicitud_enviada_at: nowISO } : {}),
    };

    const { error: updErr } = await supabase
      .from("usuario")
      .update(updatePayload)
      .eq("id_usuario", idUsuario);

    if (updErr) throw new Error(updErr.message);

    // Refrescar estado local
    setUserRow((prev) => ({ ...(prev as UsuarioRow), ...updatePayload }));
  };

  const onSubmitForm = handleSubmit(async (values) => {
    try {
      setSaving(true);
      await saveToUsuario(values, true);
      await sendEmail();
      toast.success("Solicitud enviada. Te contactaremos pronto.");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo enviar la solicitud");
    } finally {
      setSaving(false);
    }
  });

  const onSaveAndResend = handleSubmit(async (values) => {
    try {
      setSaving(true);
      await saveToUsuario(values, true);
      await sendEmail();
      setEditMode(false);
      toast.success("Solicitud actualizada y reenviada.");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo reenviar la solicitud");
    } finally {
      setSaving(false);
    }
  });

  /* ===========================
     RENDER
     =========================== */
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold mb-6">
          {hasRequest && !editMode ? (
            <>Estado de <span className="text-[#8e2afc]">solicitud</span></>
          ) : (
            <>Solicitud <span className="text-[#8e2afc]">de acceso</span></>
          )}
        </h1>

        {/* ---------- ESTADO (vista por defecto cuando ya hay una solicitud) ---------- */}
        {hasRequest && !editMode && (
          <section className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur p-5 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-white/70 text-sm">Estado:</span>
                  <Badge status={userRow?.solicitud_estado ?? null} />
                </div>
                <p className="text-white/70 text-sm">
                  Enviada: <span className="text-white">{fmtDateTime(sentAt)}</span>
                </p>
                <p className="text-white/70 text-sm">
                  Correo: <span className="text-white">{user?.email ?? "—"}</span>
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 rounded border border-white/20 hover:bg-white/10"
                >
                  Editar datos
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    const v = getValues();
                    try {
                      setSaving(true);
                      await saveToUsuario(v, true); // solo marca reenviado con datos actuales
                      await sendEmail();
                      toast.success("Solicitud reenviada.");
                    } catch (e: any) {
                      toast.error(e?.message ?? "No se pudo reenviar");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="px-4 py-2 rounded bg-[#8e2afc] hover:bg-[#7b1fe0] disabled:opacity-60"
                >
                  Reenviar
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Info label="Nombre completo" value={userRow?.nombre ?? ""} />
              <Info label="Tipo de solicitud" value={userRow?.solicitud_tipo ?? ""} />
              <Info label="Fecha de nacimiento" value={userRow?.fecha_nacimiento ?? ""} />
              <Info label="Calle y número" value={userRow?.calle ?? ""} />
              <Info label="Comuna" value={userRow?.comuna ?? ""} />
              <Info label="Ciudad" value={userRow?.ciudad ?? ""} />
              <Info label="País" value={userRow?.pais ?? ""} />
            </div>
          </section>
        )}

        {/* ---------- FORMULARIO (crear primera solicitud) ---------- */}
        {!hasRequest && (
          <section className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur p-5">
            <p className="text-white/70 mb-4">
              Completa este formulario para habilitar tu acceso como productor y/o dueño de club.
            </p>

            <FormProvider {...methods}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSubmitForm();
                }}
                className="space-y-5"
                noValidate
              >
                {/* Nombre + Correo (readonly) */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Nombre completo *" error={errors.nombre?.message}>
                    <TextInput name="nombre" register={register} placeholder="Tu nombre" />
                  </Field>

                  <Field label="Correo">
                    <input
                      value={user?.email ?? ""}
                      readOnly
                      className="w-full rounded-md bg-transparent border border-white/20 px-3 py-2 text-white/80 cursor-not-allowed"
                    />
                  </Field>
                </div>

                {/* Fecha + Tipo solicitud */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Fecha de nacimiento" error={errors.fecha_nacimiento?.message}>
                    <TextInput name="fecha_nacimiento" type="date" register={register} />
                  </Field>

                  <Field label="¿Qué necesitas?" error={errors.tipo_solicitud?.message}>
                    <SelectInput name="tipo_solicitud" register={register} options={solicitudOptions} />
                    <ul className="text-xs text-white/60 mt-2 space-y-1">
                      <li><b>productor</b>: Soy productor y quiero crear eventos</li>
                      <li><b>club_owner</b>: Soy dueño de club y quiero crear eventos</li>
                      <li><b>ambos</b>: Soy dueño de club y productora y me interesa crear eventos</li>
                    </ul>
                  </Field>
                </div>

                {/* Dirección */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Dirección (calle y número)" error={errors.calle?.message}>
                    <TextInput name="calle" register={register} placeholder="Ej: Av. Siempre Viva 742" />
                  </Field>
                  <Field label="Comuna" error={errors.comuna?.message}>
                    <TextInput name="comuna" register={register} placeholder="Ej: Providencia" />
                  </Field>
                  <Field label="Ciudad" error={errors.ciudad?.message}>
                    <TextInput name="ciudad" register={register} placeholder="Ej: Santiago" />
                  </Field>
                  <Field label="País" error={errors.pais?.message}>
                    <TextInput name="pais" register={register} placeholder="Ej: Chile" />
                  </Field>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded bg-[#8e2afc] hover:bg-[#7b1fe0] disabled:opacity-60"
                  >
                    {saving ? "Enviando…" : "Enviar solicitud"}
                  </button>
                </div>
              </form>
            </FormProvider>
          </section>
        )}

        {/* ---------- EDICIÓN (cuando existe solicitud) ---------- */}
        {hasRequest && editMode && (
          <section className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur p-5">
            <h2 className="text-xl font-bold text-[#cbb3ff] mb-4">Editar solicitud</h2>
            <FormProvider {...methods}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSaveAndResend();
                }}
                className="space-y-5"
                noValidate
              >
                {/* Nombre + Correo (readonly) */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Nombre completo *" error={errors.nombre?.message}>
                    <TextInput name="nombre" register={register} />
                  </Field>
                  <Field label="Correo">
                    <input
                      value={user?.email ?? ""}
                      readOnly
                      className="w-full rounded-md bg-transparent border border-white/20 px-3 py-2 text-white/80 cursor-not-allowed"
                    />
                  </Field>
                </div>

                {/* Fecha + Tipo solicitud */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Fecha de nacimiento" error={errors.fecha_nacimiento?.message}>
                    <TextInput name="fecha_nacimiento" type="date" register={register} />
                  </Field>

                  <Field label="¿Qué necesitas?" error={errors.tipo_solicitud?.message}>
                    <SelectInput name="tipo_solicitud" register={register} options={solicitudOptions} />
                  </Field>
                </div>

                {/* Dirección */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Dirección (calle y número)" error={errors.calle?.message}>
                    <TextInput name="calle" register={register} />
                  </Field>
                  <Field label="Comuna" error={errors.comuna?.message}>
                    <TextInput name="comuna" register={register} />
                  </Field>
                  <Field label="Ciudad" error={errors.ciudad?.message}>
                    <TextInput name="ciudad" register={register} />
                  </Field>
                  <Field label="País" error={errors.pais?.message}>
                    <TextInput name="pais" register={register} />
                  </Field>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 rounded border border-white/20 hover:bg-white/10"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded bg-[#8e2afc] hover:bg-[#7b1fe0] disabled:opacity-60"
                  >
                    {saving ? "Guardando…" : "Guardar y reenviar"}
                  </button>
                </div>
              </form>
            </FormProvider>
          </section>
        )}
      </div>
    </main>
  );
}