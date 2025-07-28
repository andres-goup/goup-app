// src/pages/RoleRequestStatusPage.tsx
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
  solicitud_tipo: z.enum(["productor", "club_owner", "ambos"], {
    required_error: "Selecciona una opción",
  }),
});
type FormValues = z.infer<typeof schema>;

type DBUsuario = {
  id_usuario: string;
  auth_user_id: string;
  correo: string | null;
  nombre: string | null;
  fecha_nacimiento: string | null;
  calle: string | null;
  ciudad: string | null;
  comuna: string | null;
  pais: string | null;
  solicitud_tipo: "productor" | "club_owner" | "ambos" | null;
  solicitud_estado: "pendiente" | "aprobada" | "rechazada" | null;
  // Puede ser boolean o timestamp
  solicitud_enviada: boolean | string | null;
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
  disabled,
}: {
  name: keyof FormValues;
  register: any;
  options: Array<{ value: FormValues["solicitud_tipo"]; label: string }>;
  disabled?: boolean;
}) {
  return (
    <select
      disabled={disabled}
      className="w-full rounded-md bg-transparent border border-white/20 px-3 py-2 focus:outline-none focus:border-[#8e2afc] disabled:opacity-60"
      {...register(name)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-neutral-900">
          {o.label}
        </option>
      ))}
    </select>
  );
}

function fmtLong(dateish?: string | null): string {
  if (!dateish) return "—";
  const d = new Date(dateish);
  if (isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("es", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

function StatusBadge({ estado }: { estado: DBUsuario["solicitud_estado"] }) {
  const label =
    estado === "aprobada"
      ? "Aprobada"
      : estado === "rechazada"
      ? "Rechazada"
      : "Pendiente";

  const styles =
    estado === "aprobada"
      ? "bg-green-500/15 text-green-200 border-green-400/30"
      : estado === "rechazada"
      ? "bg-red-500/15 text-red-200 border-red-400/30"
      : "bg-yellow-500/15 text-yellow-200 border-yellow-400/30";

  return (
    <span className={`inline-flex items-center text-xs px-2 py-1 rounded border ${styles}`}>
      {label}
    </span>
  );
}

/* ===========================
   Página
   =========================== */
export default function RoleRequestStatusPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [record, setRecord] = useState<DBUsuario | null>(null);
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
      solicitud_tipo: "productor",
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = methods;

  useEffect(() => {
    (async () => {
      if (!user) return;
      setLoading(true);

      const { data, error } = await supabase
        .from("usuario")
        .select(
          "id_usuario, auth_user_id, correo, nombre, fecha_nacimiento, calle, ciudad, comuna, pais, solicitud_tipo, solicitud_estado, solicitud_enviada"
        )
        .eq("auth_user_id", user.id)
        .maybeSingle<DBUsuario>();

      if (error) {
        console.error("RoleRequestStatusPage load:", error.message);
        toast.error("No se pudo cargar la solicitud");
        setLoading(false);
        return;
      }

      if (data) {
        setRecord(data);
        reset({
          nombre: data.nombre ?? "",
          fecha_nacimiento: data.fecha_nacimiento ?? "",
          calle: data.calle ?? "",
          ciudad: data.ciudad ?? "",
          comuna: data.comuna ?? "",
          pais: data.pais ?? "",
          solicitud_tipo: (data.solicitud_tipo as any) ?? "productor",
        });
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const solicitudEnviadaFecha =
    typeof record?.solicitud_enviada === "string"
      ? fmtLong(record?.solicitud_enviada)
      : "—";

  const onReSend = async () => {
    if (!user || !record) return;

    try {
      setSaving(true);

      // Actualizamos estado → pendiente y fecha/toggle enviada
      const nowIso = new Date().toISOString();
      const { error: updErr } = await supabase
        .from("usuario")
        .update({
          solicitud_estado: "pendiente",
          solicitud_enviada: nowIso, // si tu columna es boolean y falla, cambia a true
        })
        .eq("auth_user_id", user.id);

      if (updErr) throw new Error(updErr.message);

      // Llamada a tu API de correo
      try {
        const resp = await fetch("/api/sendgrid-role-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: record.correo ?? user.email,
            nombre: record.nombre,
            fecha_nacimiento: record.fecha_nacimiento,
            calle: record.calle,
            ciudad: record.ciudad,
            comuna: record.comuna,
            pais: record.pais,
            tipo_solicitud: record.solicitud_tipo ?? "productor",
          }),
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          console.warn("sendgrid-role-request failed:", resp.status, text);
        }
      } catch (e) {
        console.warn("sendgrid-role-request error:", e);
      }

      toast.success("Solicitud reenviada");
      setRecord((prev) =>
        prev
          ? {
              ...prev,
              solicitud_estado: "pendiente",
              solicitud_enviada: nowIso,
            }
          : prev
      );
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo reenviar la solicitud");
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!user || !record) return;

    try {
      setSaving(true);

      const nowIso = new Date().toISOString();
      const payload = {
        nombre: values.nombre,
        fecha_nacimiento: values.fecha_nacimiento || null,
        calle: values.calle || null,
        ciudad: values.ciudad || null,
        comuna: values.comuna || null,
        pais: values.pais || null,
        solicitud_tipo: values.solicitud_tipo,
        solicitud_estado: "pendiente" as const,
        solicitud_enviada: nowIso, // si es boolean, usa true
      };

      const { error: updErr } = await supabase
        .from("usuario")
        .update(payload)
        .eq("auth_user_id", user.id);

      if (updErr) throw new Error(updErr.message);

      // Email tras guardar
      try {
        const resp = await fetch("/api/sendgrid-role-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: record.correo ?? user.email,
            nombre: payload.nombre,
            fecha_nacimiento: payload.fecha_nacimiento,
            calle: payload.calle,
            ciudad: payload.ciudad,
            comuna: payload.comuna,
            pais: payload.pais,
            tipo_solicitud: payload.solicitud_tipo,
          }),
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          console.warn("sendgrid-role-request failed:", resp.status, text);
        }
      } catch (e) {
        console.warn("sendgrid-role-request error:", e);
      }

      toast.success("Datos guardados y solicitud enviada");
      setEditMode(false);
      setRecord((prev) =>
        prev
          ? {
              ...prev,
              ...payload,
            }
          : prev
      );
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar la solicitud");
    } finally {
      setSaving(false);
    }
  });

  const solicitudOptions = useMemo(
    () => [
      { value: "productor" as const, label: "Soy productor y quiero crear eventos" },
      { value: "club_owner" as const, label: "Soy dueño de club y quiero crear eventos" },
      {
        value: "ambos" as const,
        label: "Soy dueño de club y productora, me interesa crear eventos",
      },
    ],
    []
  );

  if (loading) {
    return <div className="p-6 text-white">Cargando...</div>;
  }

  if (!record) {
    return (
      <div className="p-6 text-white">
        <p>No se encontró tu registro.</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold">
            Estado <span className="text-[#8e2afc]">de solicitud</span>
          </h1>
          <StatusBadge estado={record.solicitud_estado ?? "pendiente"} />
        </div>

        {/* Tarjeta resumen */}
        {!editMode && (
          <section className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur p-5 space-y-4">
            <div className="grid gap-2 text-sm">
              <Row k="Email" v={record.correo ?? "—"} />
              <Row k="Nombre" v={record.nombre ?? "—"} />
              <Row k="Tipo de solicitud" v={record.solicitud_tipo ?? "—"} />
              <Row k="Fecha de nacimiento" v={record.fecha_nacimiento ?? "—"} />
              <Row
                k="Dirección"
                v={[
                  record.calle,
                  record.comuna,
                  record.ciudad,
                  record.pais,
                ]
                  .filter(Boolean)
                  .join(", ") || "—"}
              />
              <Row k="Fecha de envío" v={solicitudEnviadaFecha} />
              <Row k="Estado" v={<StatusBadge estado={record.solicitud_estado ?? "pendiente"} />} />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="px-4 py-2 rounded bg-[#8e2afc] hover:bg-[#7b1fe0]"
              >
                Editar datos
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={onReSend}
                className="px-4 py-2 rounded border border-white/20 hover:bg-white/10 disabled:opacity-60"
              >
                Reenviar solicitud
              </button>
            </div>
          </section>
        )}

        {/* Modo edición */}
        {editMode && (
          <FormProvider {...methods}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
              }}
              className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur p-5 space-y-5"
              noValidate
            >
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Nombre completo *" error={errors.nombre?.message}>
                  <TextInput name="nombre" register={register} placeholder="Tu nombre" />
                </Field>
                <Field label="Correo">
                  <input
                    value={record.correo ?? ""}
                    readOnly
                    className="w-full rounded-md bg-transparent border border-white/20 px-3 py-2 text-white/80 cursor-not-allowed"
                  />
                </Field>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Fecha de nacimiento" error={errors.fecha_nacimiento?.message}>
                  <TextInput name="fecha_nacimiento" type="date" register={register} />
                </Field>
                <Field label="¿Qué necesitas?" error={errors.solicitud_tipo?.message}>
                  <SelectInput name="solicitud_tipo" register={register} options={solicitudOptions} />
                  <ul className="text-xs text-white/60 mt-2 space-y-1">
                    <li><b>productor</b>: Soy productor y quiero crear eventos</li>
                    <li><b>club_owner</b>: Soy dueño de club y quiero crear eventos</li>
                    <li><b>ambos</b>: Soy dueño de club y productora y me interesa crear eventos</li>
                  </ul>
                </Field>
              </div>

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
                  {saving ? "Guardando…" : "Guardar y enviar"}
                </button>
              </div>
            </form>
          </FormProvider>
        )}
      </div>
    </main>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <p className="text-sm text-white/80 flex items-baseline justify-between gap-3">
      <span className="text-white/60">{k}</span>
      <span className="text-right">{v ?? "—"}</span>
    </p>
  );
}