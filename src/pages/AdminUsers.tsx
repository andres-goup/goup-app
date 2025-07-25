// src/pages/AdminUsers.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "react-hot-toast";
import Unauthorized from "./Unauthorized";

type Rol = "admin" | "club_owner" | "productor" | "user";

type Row = {
  id_usuario: string;
  nombre: string | null;
  correo: string | null;
  rol: Rol;
  can_create_event: boolean;
};

export default function AdminPage() {
  // ↓↓↓ Hooks SIEMPRE arriba
  const { dbUser, loading: authLoading } = useAuth();

  const [rows, setRows] = useState<Row[]>([]);
  const [dirty, setDirty] = useState<Record<string, Row>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carga usuario
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("usuario")
        .select("id_usuario, nombre, correo, rol, can_create_event")
        .order("created_at", { ascending: true });

      if (!isMounted) return;

      if (error) {
        console.error(error);
        setError(error.message);
        setRows([]);
      } else {
        setRows((data ?? []) as Row[]);
      }
      setLoading(false);
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // ✅ Ahora SÍ podemos bloquear si no es admin, pero
  // solo cuando ya terminó de cargar el auth context
  if (!authLoading && dbUser && dbUser.rol !== "admin") {
    return <Unauthorized />;
  }

  const markDirty = (u: Row) =>
    setDirty((prev) => ({
      ...prev,
      [u.id_usuario]: u,
    }));

  const onChangeRol = (id_usuario: string, rol: Rol) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id_usuario === id_usuario ? { ...r, rol } : r
      )
    );
    const updated = rows.find((r) => r.id_usuario === id_usuario);
    if (updated) {
      markDirty({ ...updated, rol });
    }
  };

  const onToggleCreateEvent = (id_usuario: string, value: boolean) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id_usuario === id_usuario ? { ...r, can_create_event: value } : r
      )
    );
    const updated = rows.find((r) => r.id_usuario === id_usuario);
    if (updated) {
      markDirty({ ...updated, can_create_event: value });
    }
  };

  const onSave = async () => {
    try {
      const updates = Object.values(dirty);
      if (updates.length === 0) return;

      setSaving(true);

      const { error } = await supabase
        .from("usuario")
        .upsert(
            updates.map((u) => ({
                id_usuario: u.id_usuario,
                nombre: u.nombre,          // 👈 agregar esto
                correo: u.correo,          // 👈 y esto
                rol: u.rol,
                can_create_event: u.can_create_event,
              })),
          { onConflict: "id_usuario" }
        );

      if (error) throw error;

      toast.success("Cambios guardados");
      setDirty({});
    } catch (e: unknown) {
      console.error(e);
      const msg =
        e instanceof Error ? e.message : "Error guardando cambios";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const thereAreChanges = Object.keys(dirty).length > 0;

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-black text-white px-4 py-16">
        <div className="max-w-5xl mx-auto">Cargando…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-16">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold">
            Panel <span className="text-[#8e2afc]">de usuarios</span>
          </h1>

          <button
          className={`rounded-md px-4 py-2 font-semibold transition ${
              thereAreChanges
                ? "bg-[#8e2afc] text-white hover:opacity-90"
                : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
            }`}
            disabled={!thereAreChanges || saving}
            onClick={onSave}
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </header>

        {error && (
          <p className="text-red-400">
            Error cargando usuarios: {error}
          </p>
        )}

        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-900/60 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Correo</th>
                <th className="px-4 py-3 font-semibold">Rol</th>
                <th className="px-4 py-3 font-semibold">
                  Puede crear eventos
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-zinc-400"
                  >
                    No hay usuarios aún.
                  </td>
                </tr>
              )}

              {rows.map((u) => (
                <tr
                  key={u.id_usuario}
                  className="border-t border-zinc-800 hover:bg-zinc-900/30"
                >
                  <td className="px-4 py-3">{u.nombre ?? "—"}</td>
                  <td className="px-4 py-3">{u.correo ?? "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1"
                      value={u.rol}
                      onChange={(e) =>
                        onChangeRol(u.id_usuario, e.target.value as Rol)
                      }
                    >
                      <option value="user">user</option>
                      <option value="productor">productor</option>
                      <option value="club_owner">club_owner</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#8e2afc]"
                        checked={u.can_create_event}
                        onChange={(e) =>
                          onToggleCreateEvent(u.id_usuario, e.target.checked)
                        }
                      />
                      <span className="text-sm text-zinc-300">Sí</span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {thereAreChanges && (
          <p className="text-xs text-zinc-400">
            Tienes cambios sin guardar.
          </p>
        )}
      </div>
    </main>
  );
}