// src/pages/EventDetail.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FormProvider, useForm, useWatch } from "react-hook-form";
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

import {
  Firestore,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { db as firebaseDb } from "@/lib/firebase";

// ---------- Helpers ----------
const asBool = (v: unknown): boolean => {
  if (typeof v === "boolean") return v;
  if (v == null) return false;
  const s = String(v).toLowerCase();
  return s === "si" || s === "sí" || s === "true" || s === "1";
};
const vipToCount = (v: unknown): number => {
  const s = String(v ?? "");
  if (s.toLowerCase() === "no" || s === "" || s === "0") return 0;
  if (s.toLowerCase().includes("más de")) return 6;
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

// ---------- Form schema ----------
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
  edad: z.string().refine(
    (val) => {
      const num = Number(val);
      return Number.isInteger(num) && num >= 18 && num <= 70;
    },
    { message: "Selecciona una edad válida" }
  ),
  dress_code: z.string().min(1),
  tieneVip: z.string().optional().default("No"),
  reservas: z.union([z.boolean(), z.string()]).default("No"),
  tieneLineup: z.union([z.boolean(), z.string()]).default("No"),
  djs: z.array(z.string()).optional().default([]),
  flyer: z.any().optional().nullable(),
  imgSec: z.any().optional().nullable(),
  generosOtro: z.string().optional(),
  cantidadDJs: z.number(),
});
type EditForm = z.infer<typeof editSchema>;

// ---------- Firestore event type ----------
type DBEvento = {
  id_evento: string;
  uid_usersWeb: string;
  nombre: string;
  tipo: string;
  fecha: string;
  horaInicio: string | null;
  horaCierre: string | null;
  capacidad: string | null;
  presupuesto: string | null;
  promotor: string | null;
  telefono: string | null;
  email: string | null;
  desc: string | null;
  generos: string[] | string | null;
  edad: number | null;
  dress_code?: string | null;
  vip?: boolean | null;
  cantidadZonasVip: number | null;
  aceptaReservas: boolean | null;
  lineup: boolean | null;
  cantidadDJs: number | null;
  djs: string[] | null;
  flyer: string | null;
  imgSec: string | null;
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
  "Guaracha",
  "Otros",
] as const;

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
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [eventData, setEventData] = useState<DBEvento | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const originalValuesRef = useRef<EditForm | null>(null);

  const formRef = useRef<HTMLFormElement>(null);

  const methods = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: undefined,
    mode: "onChange",
  });

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      const docRef = doc(firebaseDb as Firestore, "Eventos", id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        toast.error("No se pudo cargar el evento");
        setLoading(false);
        return;
      }
      const data = snap.data() as DBEvento;
      data.id_evento = id;
      setEventData(data);

      const lineupString =
        data.lineup || (Array.isArray(data.djs) && data.djs.length > 0)
          ? "Sí"
          : "No";

      const edadString =
        data.edad !== null && data.edad !== undefined
          ? String(data.edad)
          : "18";

      const genArr = normalizeGeneros(data.generos);

      const defaults: EditForm = {
        nombre: data.nombre,
        tipo: data.tipo,
        fecha: data.fecha,
        horaInicio: data.horaInicio ?? "",
        horaCierre: data.horaCierre ?? "",
        capacidad: data.capacidad ?? "",
        presupuesto: data.presupuesto ?? "",
        promotor: data.promotor ?? "",
        telefono: data.telefono ?? "",
        email: data.email ?? "",
        desc: data.desc ?? "",
        generos: genArr,
        edad: edadString,
        dress_code: data.dress_code ?? "",
        tieneVip: countToVipSelect(data.cantidadZonasVip),
        reservas: boolToSiNo(data.aceptaReservas),
        tieneLineup: lineupString,
        djs: Array.isArray(data.djs) ? data.djs : [],
        flyer: "",
        imgSec: "",
        generosOtro: "",
        cantidadDJs: Number(data.cantidadDJs),
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
    return Date.now() > new Date(`${eventData.fecha}T${base}`).getTime();
  }, [eventData]);

  const selectedGeneros = useWatch({ name: "generos", control: methods.control });
  const showOtroGenero = selectedGeneros?.includes("Otros") ?? false;

  const uploadImage = async (file: File | null, folder: string): Promise<string | null> => {
    if (!file) return null;
    const storage = getStorage();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `Eventos/${id}/${folder}/${Date.now()}.${ext}`;
    const ref = storageRef(storage, path);
    await uploadBytes(ref, file);
    return getDownloadURL(ref);
  };

  const onConfirmSave = async (values: EditForm) => {
    if (!eventData) return;
    setSaving(true);
    try {
      let generosFinal = [...(values.generos ?? [])];
      if (values.generos.includes("Otros") && values.generosOtro?.trim()) {
        generosFinal = generosFinal.filter((g) => g !== "Otros");
        generosFinal.push(values.generosOtro.trim());
      }

      const newFlyer = values.flyer instanceof File ? await uploadImage(values.flyer, "flyer") : null;
      const newImgSec = values.imgSec instanceof File ? await uploadImage(values.imgSec, "imgSec") : null;

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
        generos: generosFinal,
        edad: Number(values.edad),
        dress_code: values.dress_code,
        cantidadZonasVip: vipToCount(values.tieneVip),
        aceptaReservas: asBool(values.reservas),
        lineup: values.tieneLineup === "Sí",
        cantidadDJs: Number(values.cantidadDJs),
        djs: values.djs,
        flyer: newFlyer ?? eventData.flyer ?? null,
        imgSec: newImgSec ?? eventData.imgSec ?? null,
      };

      const docRef = doc(firebaseDb as Firestore, "Eventos", id!);
      await updateDoc(docRef, payload);

      toast.success("Datos guardados");
      const merged = { ...eventData, ...payload } as DBEvento;
      setEventData(merged);

      const newDefaults: EditForm = { ...values };
      methods.reset(newDefaults);
      originalValuesRef.current = newDefaults;
      setEditMode(false);
      setConfirmOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const onConfirmDelete = async () => {
    setDeleting(true);
    try {
      const docRef = doc(firebaseDb as Firestore, "Eventos", id!);
      await deleteDoc(docRef);
      toast.success("Evento eliminado");
      setConfirmDeleteOpen(false);
      navigate("/mis-eventos");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "No se pudo eliminar el evento");
    } finally {
      setDeleting(false);
    }
  };

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
  const askDelete = () => setConfirmDeleteOpen(true);
  const handleCancel = () => {
    if (originalValuesRef.current) {
      methods.reset(originalValuesRef.current);
    }
    setEditMode(false);
  };

  // ------ RENDER (continúa en parte 2) ------
  return (
    <div className="text-white">
      {/* HERO */}
      <div className="relative w-full h-[320px] md:h-[420px] overflow-hidden">
        {eventData.flyer ? (
          <>
            <img
              src={eventData.flyer}
              alt="Flyer"
              className="absolute w-full h-full object-cover scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black" />
          </>
        ) : (
          <div className="absolute bg-gradient-to-br from-[#25123e] via-[#381a63] to-[#8e2afc]" />
        )}
        <div className="relative h-full max-w-6xl mx-auto px-4 flex flex-col justify-end pb-6">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs px-2 py-1 rounded ${
                isPast
                  ? "bg-white/20 border border-white/20 text-Black/80"
                  : "bg-[#8e2afc]/60 border-[#8e2afc]/40 text-[#e4d7ff]"
              }`}
            >
              {isPast ? "Realizado" : "Próximo"}
            </span>
            {!!eventData.dress_code && (
              <span className="text-xs px-2 py-1 rounded bg-[#151515]/80 border border-white/10">
                Dress code: {eventData.dress_code}
              </span>
            )}
            {!!eventData.edad && (
              <span className="text-xs px-2 py-1 rounded bg-[#151515]/80 border border-white/10">
                +{eventData.edad}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold drop-shadow">
            {eventData.nombre}
          </h1>
          <p className="text-white mt-1">
            {fmtDateLong(eventData.fecha)} • {horarios}
          </p>
          {generos.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {generos.map((g) => (
                <span
                  key={g}
                  className="text-xs px-2 py-1 rounded bg-[#8e2afc]/60 text-[#e3d6ff] border border-[#8e2afc]/40"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {!isPast && (
        <div className="max-w-6xl mx-auto px-4 py-6">
          <button
            type="button"
            onClick={() => setEditMode(true)}
            className=" px-5 py-2 rounded-md bg-[#8e2afc]/40 hover:bg-[#7b1fe0] transition"
          >
            Editar datos
          </button>
        </div>
      )}
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
                    {eventData.lineup ? "Con line-up" : "Sin line-up"}
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
                  v={eventData.cantidadZonasVip + " zona(s)"}
                />
                <KeyRow
                  k="Reservas"
                  v={eventData.aceptaReservas ? "Sí" : "No"}
                />
                <KeyRow
                  k="Line-up"
                  v={eventData.lineup ? `Sí • ${eventData.cantidadDJs ?? 0} DJ(s)` : "No"}
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

        {/* ---------- EDICIÓN ---------- */}
        {editMode && (
          <FormProvider {...methods}>
            <form
              ref={formRef}
              onSubmit={methods.handleSubmit(() => setConfirmOpen(true))}
              className="space-y-6 mt-2"
              noValidate
            >
              {/* ZONA PELIGROSA: Eliminar evento */}
              <section className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
                <h3 className="text-sm font-semibold text-rose-300 mb-1">Zona peligrosa</h3>
                <p className="text-white/70 text-sm mb-3">
                  Eliminar este evento es <b>irreversible</b>. Se borrarán sus datos y no hay vuelta atrás.
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={askDelete}
                    disabled={deleting}
                    className="px-4 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-60"
                  >
                    {deleting ? "Eliminando…" : "Eliminar evento"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 rounded bg-[#8e2afc] hover:bg-[#7b1fe0] disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                </div>
              </section>
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
                {showOtroGenero && (
                  <RHFInput
                    name="generosOtro"
                    label="Especifica el otro género musical"
                    placeholder="Ej: Funk Carioca, Experimental, Indie, etc."
                  />
                )}
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
          <div className="fixed z-50 inset-0 grid place-items-center bg-black/60">
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
                  onClick={methods.handleSubmit(onConfirmSave)}
                >
                  Sí, guardar
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal de confirmación de borrado */}
        {confirmDeleteOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70">
            <div className="bg-neutral-900 rounded-md p-6 w-[92vw] max-w-md text-center border border-rose-500/30">
              <h3 className="text-lg font-semibold text-rose-300 mb-2">¿Borrar este evento?</h3>
              <p className="text-white/70 mb-5">
                Esta acción es <b>permanente</b> y no hay vuelta atrás.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  className="px-4 py-2 rounded border border-white/20 hover:bg-white/10"
                  onClick={() => setConfirmDeleteOpen(false)}
                  disabled={deleting}
                >
                  No, cancelar
                </button>
                <button
                  className="px-4 py-2 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-60"
                  onClick={onConfirmDelete}
                  disabled={deleting}
                >
                  {deleting ? "Eliminando…" : "Sí, borrar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ======= Componentes UI pequeños =======
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


