// ✅ Versión mejorada y estilizada de `ProfilePage.tsx` con avatar centrado y el doble de grande
import MenuItem from "@mui/material/MenuItem";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  Firestore,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { useFormContext } from "react-hook-form";
import { useAuth } from "@/auth/AuthContext";
import { db as firebaseDb, auth as firebaseAuth } from "@/lib/firebase";

import { RHFInput, RHFFile } from "@/components/form/control";
import RHFSelect from "@/components/form/control/RHFSelect";
import ModalConfirm from "@/components/ModalConfirm";
import goupLogo from "@/assets/goup_logo.png";

const profileSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  phone_number: z.string().optional().or(z.literal("")),
  rut: z.string().optional().or(z.literal("")),
  direccion: z.string().optional().or(z.literal("")),
  sexo: z.string().optional().or(z.literal("")),
  fecha_nacimiento: z.string().optional().or(z.literal("")),
  photo_url: z.any().optional().nullable(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, dbUser, loading: authLoading, signOut } = useAuth();
  const [loadingPage, setLoadingPage] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const originalRef = useRef<ProfileForm | null>(null);
  const [totalEventos, setTotalEventos] = useState(0);
  const [realizados, setRealizados] = useState(0);

  const methods = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: undefined,
    mode: "onChange",
  });
  

  useEffect(() => {
    (async () => {
      if (authLoading) return;
      if (!user?.uid) {
        setLoadingPage(false);
        return;
      }
      try {
        const userRef = doc(firebaseDb as Firestore, "usersWeb", user.uid);
        const snap = await getDoc(userRef);
        const data = snap.exists()
          ? snap.data()
          : {
              uid: user.uid,
              email: user.email,
              nombre: user.displayName,
              phone_number: "",
              rut: "",
              direccion: "",
              sexo: "",
              fecha_nacimiento: "",
              photo_url: user.photoURL,
            };
        setRecord(data);
        const defaults: ProfileForm = {
          nombre: data.nombre ?? "",
          phone_number: data.phone_number ?? "",
          rut: data.rut ?? "",
          direccion: data.direccion ?? "",
          sexo: typeof data.sexo === "string" ? data.sexo : "",
          fecha_nacimiento: data.fecha_nacimiento?.seconds
            ? new Date(data.fecha_nacimiento.seconds * 1000)
                .toISOString()
                .split("T")[0]
            : data.fecha_nacimiento ?? "",
          photo_url: null,
        };
        methods.reset(defaults);
        originalRef.current = defaults;
      } catch (e) {
        toast.error("No se pudo cargar tu perfil");
      } finally {
        setLoadingPage(false);
      }
    })();
  }, [authLoading, user, methods]);

  useEffect(() => {
    (async () => {
      if (!record?.uid) return;
      const q = query(
        collection(firebaseDb as Firestore, "Eventos"),
        where("uid_usersWeb", "==", "/usersWeb/" + record.uid)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => d.data());
      setTotalEventos(list.length);
      const now = Date.now();
      const pastCount = list.filter((ev) => {
        const t = ev.horaCierre || ev.horaInicio || "00:00";
        return now > new Date(`${ev.fecha}T${t}`).getTime();
      }).length;
      setRealizados(pastCount);
    })();
  }, [record]);

  const avatarUrl = useMemo(() => record?.photo_url ?? "", [record]);

  const uploadAvatar = async (file: File): Promise<string> => {
    const storage = getStorage();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `avatars/${user!.uid}/avatar.${ext}`;
    const ref = storageRef(storage, path);
    await uploadBytes(ref, file);
    return await getDownloadURL(ref);
  };

  const handleCancel = () => {
    if (originalRef.current) methods.reset(originalRef.current);
    setEditMode(false);
  };
  function RHFCustomSelect({
    name,
    label,
    options,
  }: {
    name: string;
    label: string;
    options: { value: string; label: string }[];
  }) {
    const {
      register,
      formState: { errors },
    } = useFormContext();
  
    return (
      <div>
        <label className="block text-white text-sm font-medium mb-1">
          {label}
        </label>
        <select
          {...register(name)}
          className="bg-zinc-800 border border-zinc-600 text-white rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#8e2afc]"
        >
          <option value="">Selecciona una opción</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors[name] && (
          <p className="text-red-500 text-sm mt-1">
            {(errors[name] as any)?.message}
          </p>
        )}
      </div>
    );
  }

  const onConfirmSave = methods.handleSubmit(async (values) => {
    if (!user?.uid || !record) return;
    setSaving(true);
    try {
      let photoURL = record.photo_url;
      // Sube la foto solo si es un File nuevo
      if (values.photo_url instanceof File) {
        photoURL = await uploadAvatar(values.photo_url);
        await updateProfile(firebaseAuth.currentUser!, { photoURL });
      }
      // Genera el payload, omitiendo sexo y foto si están vacíos
      const payload = {
        ...record,
        ...values,
        ...(values.sexo && values.sexo !== "" ? { sexo: values.sexo } : {}),
        photo_url: photoURL || null,
      };
  
      // Elimina del payload el campo photo_url si está vacío (opcional)
      if (!payload.photo_url) delete payload.photo_url;
      // Elimina sexo si está vacío (opcional redundante)
      if (!payload.sexo) delete payload.sexo;
  
      const userRef = doc(firebaseDb as Firestore, "usersWeb", user.uid);
      const exists = (await getDoc(userRef)).exists();
      if (exists) {
        await updateDoc(userRef, payload);
      } else {
        await setDoc(userRef, payload);
      }
      await updateProfile(firebaseAuth.currentUser!, { displayName: values.nombre });
  
      setRecord(payload);
      methods.reset({ ...values, photo_url: null });
      originalRef.current = { ...values, photo_url: null };
      toast.success("Perfil actualizado");
      setEditMode(false);
      setConfirmOpen(false);
    } catch (err) {
      // Muestra el error si ocurre
      console.error(err);
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  });
  const displayName = record?.nombre || "Usuario";
  const email = record?.email || "";
  const futuros = Math.max(0, totalEventos - realizados);
  const fechaNacimientoFormateada = record?.fecha_nacimiento?.seconds
    ? new Date(record.fecha_nacimiento.seconds * 1000).toISOString().split("T")[0]
    : record?.fecha_nacimiento || "";

  const displayRol = (rol: string) => {
    switch (rol) {
      case "admin": return "Administrador";
      case "club_owner": return "Administrador de Club";
      case "productor": return "Administrador de Productora";
      default: return "Usuario pendiente de evaluación";
    }
  };

  if (loadingPage || !record) return <p className="text-white text-center mt-8">Cargando perfil...</p>;

  
  return (
    <main className="text-white">
      <div className="relative md:h-40 overflow-hidden">
     
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-28 relative z-10 text-center">
        <div className="mx-auto h-48 w-48 rounded-full overflow-hidden border-4 border-[#8e2afc] bg-white/10">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="grid place-items-center h-full text-4xl">
              {displayName[0].toUpperCase()}
            </div>
          )}
        </div>
        <h1 className="text-3xl font-extrabold mt-4">{displayName}</h1>
        <p className="text-white/70">{email}</p>
        <p className="bg-[#8e2afc]/20 border border-[#8e2afc]/50 rounded-full px-3 py-0.5 text-sm inline-block mt-2">
          Eventos: <strong>{totalEventos}</strong>  
        </p>
        <p className="bg-[#8e2afc]/20 border border-[#8e2afc]/50 rounded-full px-3 py-0.5 text-sm inline-block mt-2">
        Realizados: <strong>{realizados}</strong>
        </p>

        <p className="bg-[#8e2afc]/20 border border-[#8e2afc]/50 rounded-full px-3 py-0.5 text-sm inline-block mt-2">
        Próximos: <strong>{futuros}</strong>
        </p>




        <div className="mt-4 flex justify-center gap-3">
          {!editMode && <button onClick={() => setEditMode(true)} className="text-sm px-3 py-1 rounded bg-[#8e2afc] hover:bg-[#7b1fe0] transition">Editar datos</button>}
          <button onClick={signOut} className="text-sm px-3 py-1 rounded bg-[#8e2afc] hover:bg-[#7b1fe0] transition">Cerrar sesión</button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {!editMode ? (
          <Card title="Información personal">
            <KeyRow k="Nombre" v={record.nombre} />
            <KeyRow k="Teléfono" v={record.phone_number} />
            <KeyRow k="RUT" v={record.rut} />
            <KeyRow k="Dirección" v={record.direccion} />
            <KeyRow k="Sexo" v={record.sexo} />
            <KeyRow k="Fecha de nacimiento" v={fechaNacimientoFormateada} />
            <KeyRow k="Rol" v={<Chip text={displayRol(dbUser?.rol ?? "")} />} />
          </Card>
        ) : (
          <FormProvider {...methods}>
            <form onSubmit={(e) => { e.preventDefault(); setConfirmOpen(true); }} className="space-y-6" noValidate>
              <Section title="Información personal">
                <RHFInput name="nombre" label="Nombre *" />
                <RHFInput name="phone_number" label="Teléfono" />
                <RHFInput name="rut" label="RUT" />
                <RHFInput name="direccion" label="Dirección" />
                <RHFCustomSelect
           name="sexo"
  label="Sexo"
  options={[
    { value: "Femenino", label: "Femenino" },
    { value: "Masculino", label: "Masculino" },
    { value: "No binario", label: "No binario" },
    { value: "Prefiero no decirlo", label: "Prefiero no decirlo" },
    { value: "Otro", label: "Otro" },
  ]}
/>

                <RHFInput name="fecha_nacimiento" label="Fecha de nacimiento" type="date" />
              </Section>
              <Section title="Avatar">
                <RHFFile name="photo_url" label="Reemplazar avatar (opcional)" />
              </Section>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={handleCancel} className="text-sm px-3 py-1 rounded bg-[#8e2afc] hover:bg-[#7b1fe0] transition">Cancelar</button>
                <button type="submit" disabled={saving} className="text-sm px-3 py-1 rounded bg-[#8e2afc] hover:bg-[#7b1fe0] transition">Guardar cambios</button>
              </div>
            </form>
          </FormProvider>
        )}
      </div>

      {confirmOpen && (
        <ModalConfirm title="¿Guardar los cambios?" description="Se actualizarán los datos de tu perfil." loading={saving} onConfirm={onConfirmSave} onCancel={() => setConfirmOpen(false)} />
      )}
    </main>
  );
}

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
    <p className="flex justify-between text-sm text-white/80 border-b border-white/10 py-2">
      <span className="text-white/60">{k}</span>
      <span>{v || "—"}</span>
    </p>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-[#cbb3ff]">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Chip({ text }: { text: string }) {
  return <span className="bg-[#8e2afc]/20 border border-[#8e2afc]/50 rounded-full px-3 py-0.5 text-sm text-white">{text || "—"}</span>;
}
function Chip2({ number }: { number: number }) {
  return <span className="bg-[#8e2afc]/20 border border-[#8e2afc]/50 rounded-full px-3 py-0.5 text-sm text-white">{number || "—"}</span>;
}