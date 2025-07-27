import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "react-hot-toast";
import Unauthorized from "./Unauthorized";

/** Roles soportados */
type Rol = "admin" | "club_owner" | "productor" | "user";

/** Fila que mostramos en la tabla */
type Row = {
  id_usuario: string;
  nombre: string | null;
  correo: string | null;
  rol: Rol;            // rol principal (columna existente)
  rol_extra: Rol | null; // ⬅️ nuevo: segundo rol opcional (columna BD: rol_extra)
  can_create_event: boolean;
};

const ALL_ROLES: Rol[] = ["user", "productor", "club_owner", "admin"];

/** Utilidades para evitar duplicados y normalizar */
function sanitizePair(a: Rol, b: Rol | null): { r1: Rol; r2: Rol | null } {
  // Si ambos son iguales, quitamos el extra
  if (b && a === b) return { r1: a, r2: null };
  return { r1: a, r2: b ?? null };
}

export default function AdminUsersPage() {
  const { dbUser, loading: authLoading } = useAuth();

  const [rows, setRows] = useState<Row[]>([]);
  const [dirty, setDirty] = useState<Record<string, Row>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carga inicial
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("usuario")
        .select("id_usuario, nombre, correo, rol, rol_extra, can_create_event")
        .order("created_at", { ascending: true });

      if (!mounted) return;

      if (error) {
        console.error("load usuario:", error);
        setError(error.message);
        setRows([]);
      } else {
        setRows((data ?? []) as Row[]);
      }
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Sólo admin puede ver esta página (cuando ya cargó el auth context)
  if (!authLoading && dbUser && dbUser.rol !== "admin") {
    return <Unauthorized />;
  }

  const markDirty = (u: Row) =>
    setDirty((prev) => ({ ...prev, [u.id_usuario]: u }));

  /** Cambio del rol principal */
  const onChangeRol1 = (id_usuario: string, newRol: Rol) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id_usuario !== id_usuario) return r;
        const { r1, r2 } = sanitizePair(newRol, r.rol_extra);
        const updated = { ...r, rol: r1, rol_extra: r2 };
        markDirty(updated);
        return updated;
      })
    );
  };

  /** Cambio del rol secundario (puede ser "vacío" para limpiar) */
  const onChangeRol2 = (id_usuario: string, newRol2: string) => {
    const value = (newRol2 || "") as Rol | "";
    setRows((prev) =>
      prev.map((r) => {
        if (r.id_usuario !== id_usuario) return r;

        // Si el dropdown queda vacío, limpiamos el extra
        if (value === "") {
          const updated = { ...r, rol_extra: null };
          markDirty(updated);
          return updated;
        }

        // Evitar duplicados con el principal
        const candidate = value as Rol;
        const { r1, r2 } = sanitizePair(r.rol, candidate);
        const updated = { ...r, rol: r1, rol_extra: r2 };
        markDirty(updated);
        return updated;
      })
    );
  };

  /** Toggle de permiso extra */
  const onToggleCreateEvent = (id_usuario: string, can: boolean) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id_usuario === id_usuario ? { ...r, can_create_event: can } : r
      )
    );
    const found = rows.find((r) => r.id_usuario === id_usuario);
    if (found) markDirty({ ...found, can_create_event: can });
  };

  /** Guardar (UPDATE por fila; sin UPSERT) */
  const onSave = async () => {
    const updates = Object.values(dirty);
    if (updates.length === 0) return;

    try {
      setSaving(true);

      await Promise.all(
        updates.map((u) =>
          supabase
            .from("usuario")
            .update({
              rol: u.rol,
              rol_extra: u.rol_extra ?? null, // ⬅️ nuevo campo
              can_create_event: u.can_create_event,
            })
            .eq("id_usuario", u.id_usuario)
        )
      );

      toast.success("Cambios guardados");
      setDirty({});
    } catch (e: any) {
      console.error("update usuario:", e);
      toast.error(e?.message ?? "Error guardando cambios");
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

        {error && <p className="text-red-400">Error: {error}</p>}

        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-900/60 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Correo</th>
                <th className="px-4 py-3 font-semibold">Rol 1</th>
                <th className="px-4 py-3 font-semibold">Rol 2 (opcional)</th>
                <th className="px-4 py-3 font-semibold">Puede crear eventos</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                    No hay usuarios.
                  </td>
                </tr>
              ) : (
                rows.map((u) => {
                  // Opciones del rol2: todas menos la seleccionada en rol1
                  const rol2Options = ALL_ROLES.filter((r) => r !== u.rol);

                  return (
                    <tr
                      key={u.id_usuario}
                      className="border-t border-zinc-800 hover:bg-zinc-900/30"
                    >
                      <td className="px-4 py-3">{u.nombre ?? "—"}</td>
                      <td className="px-4 py-3">{u.correo ?? "—"}</td>

                      {/* Rol principal */}
                      <td className="px-4 py-3">
                        <select
                          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1"
                          value={u.rol}
                          onChange={(e) => onChangeRol1(u.id_usuario, e.target.value as Rol)}
                        >
                          {ALL_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Rol secundario (opcional) */}
                      <td className="px-4 py-3">
                        <select
                          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1"
                          value={u.rol_extra ?? ""}
                          onChange={(e) => onChangeRol2(u.id_usuario, e.target.value)}
                        >
                          <option value="">— ninguno —</option>
                          {rol2Options.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {thereAreChanges && (
          <p className="text-xs text-zinc-400">Tienes cambios sin guardar.</p>
        )}
      </div>
    </main>
  );
}