// src/pages/EventDetail.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  RHFInput,
  RHFSelect,
  RHFTextarea,
  RHFCheckboxGroup,
  RHFFile,
} from "@/components/form/control";
import { LineupFields } from "@/components/form/LineupFields";

/* =========================
 * Helpers de normalización
 * ========================= */
const asBool = (v: unknown): boolean => {
  if (typeof v === "boolean") return v;
  if (v == null) return false;
  const s = String(v).toLowerCase();
  return s === "si" || s === "sí" || s === "true" || s === "1";
};
const vipToCount = (v: unknown): number => {
  const s = String(v ?? "");
  if (s.toLowerCase() === "no" || s === "" || s === "0") return 0;
  if (s.toLowerCase().includes("más de")) return 6; // ajustable
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
const countToVipSelect = (n: number | null | undefined): string => {
  if (!n || n <= 0) return "No";
  if (n > 5) return "Más de 5";
  return String(n);
};
const boolToSiNo = (b?: boolean | null) => (b ? "Sí" : "No");

const normalizeGeneros = (g: string[] | string | null): string[] => {
  if (Array.isArray(g)) return g;
  if (typeof g === "string") {
    const list = g.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
    return list.length ? list : g ? [g] : [];
  }
  return [];
};

/* =========================
 * Form schema (alineado con Event.tsx)
 * ========================= */
const editSchema = z.object({
  nombre: z.string().min(1),
  tipo: z.string().min(1),
  fecha: z.string().min(1),
  horaInicio: z.string().optional().or(z.literal("")),
  horaCierre: z.string().optional().or(z.literal("")),
  capacidad: z.string().min(1),
  presupuesto: z.string().optional().or(z.literal("")),
  promotor: z.string().min(1),
  telefono: z.string().min(1),
  email: z.string().email(),
  desc: z.string().optional().or(z.literal("")),
  generos: z.array(z.string()).optional().default([]),

  edad: z.coerce.number().int().min(18).max(70),
  dress_code: z.string().min(1),
  tieneVip: z.string().optional().default("No"),
  reservas: z.union([z.boolean(), z.string()]).default("No"),
  tieneLineup: z.union([z.boolean(), z.string()]).default("No"),
  djs: z.array(z.string()).optional().default([]),

  flyer: z.any().optional().nullable(),
  imgSec: z.any().optional().nullable(),
});
type EditForm = z.infer<typeof editSchema>;

type DBEvento = {
  id_evento: string;
  id_usuario: string;
  nombre: string;
  tipo: string;
  fecha: string;
  horaInicio?: string | null;
  horaCierre?: string | null;
  capacidad?: string | null;
  presupuesto?: string | null;
  promotor?: string | null;
  telefono?: string | null;
  email?: string | null;
  desc?: string | null;
  generos: string[] | string | null;

  edad?: number | null;
  dress_code?: string | null;

  tieneVip?: boolean | null;
  cantidadZonasVip?: number | null;
  aceptaReservas?: boolean | null;
  tieneLineup?: boolean | null;
  cantidadDJs?: number | null;
  djs?: string[] | null;

  flyer?: string | null;
  imgSec?: string | null;
};

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
] as const;

/* =========================
 * Helpers UI
 * ========================= */
const fmtDateLong = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("es", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};
const fmtTime = (t?: string | null) => (t ? t.slice(0, 5) : "");
const timeRange = (start?: string | null, end?: string | null) => {
  const a = fmtTime(start);
  const b = fmtTime(end);
  if (a && b) return `${a} – ${b}`;
  if (a) return a;
  if (b) return b;
  return "—";
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventData, setEventData] = useState<DBEvento | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const originalValuesRef = useRef<EditForm | null>(null);

  const methods = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: undefined,
    mode: "onChange",
  });

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("evento")
        .select("*")
        .eq("id_evento", id)
        .single<DBEvento>();
      if (error || !data) {
        toast.error("No se pudo cargar el evento");
        setLoading(false);
        return;
      }
      setEventData(data);

      const defaults: EditForm = {
        nombre: data.nombre ?? "",
        tipo: data.tipo ?? "",
        fecha: data.fecha ?? "",
        horaInicio: data.horaInicio ?? "",
        horaCierre: data.horaCierre ?? "",
        capacidad: data.capacidad ?? "",
        presupuesto: data.presupuesto ?? "",
        promotor: data.promotor ?? "",
        telefono: data.telefono ?? "",
        email: data.email ?? "",
        desc: data.desc ?? "",
        generos: normalizeGeneros(data.generos),

        edad: data.edad ?? 18,
        dress_code: data.dress_code ?? "",
        tieneVip: countToVipSelect(data.cantidadZonasVip ?? 0),
        reservas: boolToSiNo(data.aceptaReservas ?? false),
        tieneLineup: boolToSiNo(data.tieneLineup ?? false),
        djs: (data.djs ?? []) as string[],

        flyer: null,
        imgSec: null,
      };

      methods.reset(defaults);
      originalValuesRef.current = defaults;
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isPast = useMemo(() => {
    if (!eventData?.fecha) return false;
    const base = eventData.horaCierre || eventData.horaInicio || "00:00";
    const dt = new Date(`${eventData.fecha}T${base}`);
    return Date.now() > dt.getTime();
  }, [eventData]);

  /* =========================
   * Subir imágenes (edición)
   * ========================= */
  const uploadImage = async (file: File | null, folder: string): Promise<string | null> => {
    if (!file) return null;
    const filePath = `${folder}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("evento").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw new Error(error.message);
    return supabase.storage.from("evento").getPublicUrl(filePath).data.publicUrl;
  };

  /* =========================
   * Acciones edición (sin cambios)
   * ========================= */
  const handleCancel = () => {
    if (originalValuesRef.current) {
      methods.reset(originalValuesRef.current);
    }
    setEditMode(false);
  };
  const handleAskSave = () => setConfirmOpen(true);
  const onConfirmSave = methods.handleSubmit(async (values) => {
    try {
      setSaving(true);

      const newFlyerUrl = await uploadImage(values.flyer as File | null, "flyer");
      const newImgSecUrl = await uploadImage(values.imgSec as File | null, "imgSec");

      const cleanedDJs = (values.djs || [])
        .map((dj) => (dj ?? "").toString().trim())
        .filter(Boolean);

      const payload: Partial<DBEvento> = {
        nombre: values.nombre,
        tipo: values.tipo,
        fecha: values.fecha,
        horaInicio: values.horaInicio || null,
        horaCierre: values.horaCierre || null,
        capacidad: values.capacidad,
        presupuesto: values.presupuesto || null,
        promotor: values.promotor,
        telefono: values.telefono,
        email: values.email,
        desc: values.desc || null,
        generos: values.generos ?? [],

        edad: values.edad ?? 18,
        dress_code: values.dress_code,

        tieneVip: vipToCount(values.tieneVip) > 0,
        cantidadZonasVip: vipToCount(values.tieneVip),

        aceptaReservas: asBool(values.reservas),
        tieneLineup: asBool(values.tieneLineup),

        cantidadDJs: cleanedDJs.length,
        djs: cleanedDJs,

        flyer: newFlyerUrl ?? eventData?.flyer ?? null,
        imgSec: newImgSecUrl ?? eventData?.imgSec ?? null,
      };

      const { error: updateError } = await supabase
        .from("evento")
        .update(payload)
        .eq("id_evento", id!);

      if (updateError) throw new Error(updateError.message);

      toast.success("Datos guardados");

      const merged: DBEvento = { ...(eventData as DBEvento), ...payload };
      setEventData(merged);

      const newDefaults: EditForm = {
        ...values,
        flyer: null,
        imgSec: null,
        djs: cleanedDJs,
        tieneVip: countToVipSelect(payload.cantidadZonasVip ?? 0),
        reservas: boolToSiNo(payload.aceptaReservas ?? false),
        tieneLineup: boolToSiNo(payload.tieneLineup ?? false),
      };
      methods.reset(newDefaults);
      originalValuesRef.current = newDefaults;

      setEditMode(false);
      setConfirmOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  });

  if (loading) {
    return <div className="p-6 text-white">Cargando...</div>;
  }
  if (!eventData) {
    return (
      <div className="p-6 text-white">
        <p>No se encontró el evento.</p>
        <Link to="/mis-eventos" className="text-[#8e2afc] underline">
          Volver a mis eventos
        </Link>
      </div>
    );
  }

  const generos = normalizeGeneros(eventData.generos);
  const horarios = timeRange(eventData.horaInicio, eventData.horaCierre);

  return (
    <div className="text-white">
      {/* ---------- HERO ---------- */}
      <div className="relative w-full h-[320px] md:h-[420px] overflow-hidden">
        {eventData.flyer ? (
          <>
            <img
              src={eventData.flyer}
              alt="Flyer"
              className="absolute inset-0 w-full h-full object-cover scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#25123e] via-[#381a63] to-[#8e2afc]" />
        )}

        <div className="relative h-full max-w-6xl mx-auto px-4 flex flex-col justify-end pb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-1 rounded border ${isPast ? "bg-white/10 border-white/20" : "bg-[#8e2afc]/20 border-[#8e2afc]/40 text-[#e4d7ff]"}`}>
              {isPast ? "Realizado" : "Próximo"}
            </span>
            {eventData.dress_code && (
              <span className="text-xs px-2 py-1 rounded bg-white/10 border border-white/20">
                Dress code: {eventData.dress_code}
              </span>
            )}
            {!!eventData.edad && (
              <span className="text-xs px-2 py-1 rounded bg-white/10 border border-white/20">
                +{eventData.edad}
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold drop-shadow">
            {eventData.nombre}
          </h1>

          <p className="text-white/80 mt-1">
            {fmtDateLong(eventData.fecha)} • {horarios}
          </p>

          {generos.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {generos.map((g) => (
                <span
                  key={g}
                  className="text-xs px-2 py-1 rounded bg-[#8e2afc]/25 text-[#e3d6ff] border border-[#8e2afc]/40"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---------- CONTENIDO ---------- */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {!editMode && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Columna principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Descripción */}
              {eventData.desc && (
                <section className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur p-5">
                  <h2 className="text-lg font-bold text-[#cbb3ff] mb-2">Descripción</h2>
                  <p className="text-white/80 leading-relaxed">{eventData.desc}</p>
                </section>
              )}

              {/* Line-up */}
              <section className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#cbb3ff]">Line-up</h2>
                  <span className="text-xs text-white/60">
                    {eventData.tieneLineup ? "Con line-up" : "Sin line-up"}
                  </span>
                </div>

                {Array.isArray(eventData.djs) && eventData.djs.length > 0 ? (
                  <ul className="mt-3 grid sm:grid-cols-2 gap-2">
                    {eventData.djs.map((dj, i) => (
                      <li
                        key={`${dj}-${i}`}
                        className="px-3 py-2 rounded border border-white/10 bg-white/5 text-sm flex items-center gap-2"
                      >
                        <span className="inline-flex w-6 h-6 rounded-full bg-[#8e2afc]/30 border border-[#8e2afc]/50 text-center items-center justify-center text-xs">
                          {i + 1}
                        </span>
                        <span className="truncate">{dj}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-white/60 mt-2 text-sm">No se registraron DJs.</p>
                )}
              </section>

              {/* Galería */}
              <section className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur p-5">
                <h2 className="text-lg font-bold text-[#cbb3ff] mb-3">Galería</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <figure className="rounded-lg overflow-hidden border border-white/10">
                    {eventData.flyer ? (
                      <img src={eventData.flyer} className="w-full h-64 object-cover" alt="Flyer" />
                    ) : (
                      <div className="w-full h-64 grid place-items-center text-white/40 bg-white/5">
                        Sin flyer
                      </div>
                    )}
                  </figure>
                  <figure className="rounded-lg overflow-hidden border border-white/10">
                    {eventData.imgSec ? (
                      <img src={eventData.imgSec} className="w-full h-64 object-cover" alt="Imagen secundaria" />
                    ) : (
                      <div className="w-full h-64 grid place-items-center text-white/40 bg-white/5">
                        Sin imagen secundaria
                      </div>
                    )}
                  </figure>
                </div>
              </section>

              {/* Botón Editar (sólo próximos) */}
              {!isPast && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    className="px-5 py-2 rounded-md bg-[#8e2afc] hover:bg-[#7b1fe0] transition"
                  >
                    Editar datos
                  </button>
                </div>
              )}
            </div>

            {/* Columna lateral (todas las propiedades) */}
            <aside className="space-y-6">
              <Card title="Resumen">
                <KeyRow k="Tipo" v={eventData.tipo} />
                <KeyRow k="Fecha" v={fmtDateLong(eventData.fecha)} />
                <KeyRow k="Horario" v={horarios} />
                <KeyRow k="Capacidad" v={eventData.capacidad || "—"} />
                {eventData.presupuesto && <KeyRow k="Presupuesto" v={eventData.presupuesto} />}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge label={`+${eventData.edad ?? 18}`} />
                  <Badge label={`Dress code: ${eventData.dress_code || "—"}`} />
                </div>
              </Card>

              <Card title="Políticas">
                <KeyRow
                  k="Zonas VIP"
                  v={
                    eventData.tieneVip
                      ? `${eventData.cantidadZonasVip ?? 1} zona(s)`
                      : "No"
                  }
                />
                <KeyRow
                  k="Reservas"
                  v={eventData.aceptaReservas ? "Sí" : "No"}
                />
                <KeyRow
                  k="Line-up"
                  v={eventData.tieneLineup ? `Sí • ${eventData.cantidadDJs ?? 0} DJ(s)` : "No"}
                />
              </Card>

              <Card title="Contacto">
                <KeyRow k="Promotor" v={eventData.promotor || "—"} />
                <KeyRow
                  k="Teléfono"
                  v={
                    eventData.telefono ? (
                      <a href={`tel:${eventData.telefono}`} className="text-[#cbb3ff] hover:underline">
                        {eventData.telefono}
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
                <KeyRow
                  k="Email"
                  v={
                    eventData.email ? (
                      <a href={`mailto:${eventData.email}`} className="text-[#cbb3ff] hover:underline">
                        {eventData.email}
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
              </Card>
            </aside>
          </div>
        )}

        {/* ---------- EDICIÓN (sin cambios de lógica) ---------- */}
        {editMode && (
          <FormProvider {...methods}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setConfirmOpen(true); // preguntar solo al guardar
              }}
              className="space-y-6 mt-2"
              noValidate
            >
              <Section title="Información del Evento">
                <RHFInput
                  name="nombre"
                  label="Nombre del Evento *"
                  placeholder="Ej: PURPLE NIGHTS • MIDNIGHT VIBES"
                />
                <RHFSelect
                  name="tipo"
                  label="Tipo de Evento *"
                  options={["Club", "Festival", "After", "Privado", "Open Air", "Bar"]}
                  placeholder="Selecciona el tipo"
                />
              </Section>

              <Section title="Fecha & Horario">
                <RHFInput name="fecha" type="date" label="Fecha del Evento *" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <RHFInput name="horaInicio" type="time" label="Hora de Inicio *" />
                  <RHFInput name="horaCierre" type="time" label="Hora de Cierre *" />
                </div>
              </Section>

              <Section title="Capacidad & Contacto">
                <RHFSelect
                  name="capacidad"
                  label="Capacidad esperada *"
                  options={["0 a 200", "201 a 500", "501 a 1000", "1001 a 2000", "Más de 2000"]}
                  placeholder="Selecciona una opción"
                />
                <RHFInput name="promotor" label="Nombre del Promotor *" placeholder="Tu nombre o nombre artístico" />
                <RHFInput name="telefono" label="WhatsApp/Teléfono *" placeholder="+56 9 1234 5678" />
                <RHFInput name="email" type="email" label="Email *" placeholder="promotor@goup.com" />
                <RHFInput name="presupuesto" label="Presupuesto (opcional)" placeholder="USD/CLP/etc." />
              </Section>

              <Section title="Concepto & Experiencia">
                <RHFTextarea
                  name="desc"
                  label="Describe la atmósfera, música, efectos especiales, dress code, etc. *"
                  rows={5}
                  placeholder="Género musical, DJ lineup, luces, máquinas de humo, dress code, ..."
                />
                <RHFCheckboxGroup
                  name="generos"
                  label="Géneros musicales (puedes elegir varios) *"
                  options={[...generosMusicales]}
                />
              </Section>

              <Section title="Políticas del evento">
                <RHFSelect
                  name="edad"
                  label="Edad mínima para el ingreso *"
                  options={Array.from({ length: 53 }, (_, i) => `${i + 18}`)}
                  placeholder="Selecciona edad mínima"
                />
                <RHFSelect
                  name="dress_code"
                  label="Código de vestimenta *"
                  options={["Casual", "Formal", "Semi-formal", "Urbano", "Fiesta temática"]}
                  placeholder="Selecciona el código"
                />
                <RHFSelect name="tieneVip" label="¿Tiene zonas VIP?" options={["No", "1", "2", "3", "4", "5", "Más de 5"]} />
                <RHFSelect name="reservas" label="¿Acepta reservas?" options={["Sí", "No"]} />
                <RHFSelect name="tieneLineup" label="¿Tendrá DJs con line-up?" options={["Sí", "No"]} />
                <LineupFields />
              </Section>

              <Section title="Imágenes">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-white/70 text-sm mb-2">Flyer actual</div>
                    <div className="rounded overflow-hidden border border-white/10 mb-3">
                      {eventData.flyer ? (
                        <img src={eventData.flyer} alt="Flyer actual" className="w-full h-48 object-cover" />
                      ) : (
                        <div className="w-full h-48 bg-white/10 grid place-items-center text-white/40">Sin flyer</div>
                      )}
                    </div>
                    <RHFFile name="flyer" label="Reemplazar flyer (opcional)" />
                  </div>

                  <div>
                    <div className="text-white/70 text-sm mb-2">Imagen secundaria actual</div>
                    <div className="rounded overflow-hidden border border-white/10 mb-3">
                      {eventData.imgSec ? (
                        <img src={eventData.imgSec} alt="Imagen secundaria actual" className="w-full h-48 object-cover" />
                      ) : (
                        <div className="w-full h-48 bg-white/10 grid place-items-center text-white/40">Sin imagen secundaria</div>
                      )}
                    </div>
                    <RHFFile name="imgSec" label="Reemplazar imagen secundaria (opcional)" />
                  </div>
                </div>
              </Section>

              <div className="flex gap-3 pt-2">
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
            </form>
          </FormProvider>
        )}

        {/* Modal de confirmación al guardar */}
        {confirmOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60">
            <div className="bg-neutral-900 rounded-md p-6 w-[92vw] max-w-md text-center border border-white/10">
              <h3 className="text-lg font-semibold mb-2">¿Guardar los cambios?</h3>
              <p className="text-white/70 mb-5">Se actualizarán los datos del evento.</p>
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
    </div>
  );
}

/* ======= Componentes UI pequeños ======= */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur p-5">
      <h3 className="font-semibold text-[#cbb3ff] mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
function KeyRow({ k, v }: { k: string; v?: React.ReactNode }) {
  return (
    <p className="text-sm text-white/80 flex items-baseline justify-between gap-3">
      <span className="text-white/60">{k}</span>
      <span className="text-right">{v ?? "—"}</span>
    </p>
  );
}
function Badge({ label }: { label: string }) {
  return (
    <span className="text-xs px-2 py-1 rounded bg-[#8e2afc]/20 text-[#e4d7ff] border border-[#8e2afc]/30">
      {label}
    </span>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-[#cbb3ff]">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}