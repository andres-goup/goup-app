// src/pages/AdminUsers.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "react-hot-toast";
import Unauthorized from "./Unauthorized";

/** Tipos */
type Rol = "admin" | "club_owner" | "productor" | "user";
type TipoSolicitud = "productor" | "club_owner" | "ambos";
type EstadoSolicitud = "pendiente" | "aprobada" | "rechazada";

const ALL_ROLES: Rol[] = ["user", "productor", "club_owner", "admin"];

/** Fila UI normalizada (nombres exactos de columnas en BD) */
type Row = {
  id_usuario: string;
  nombre: string | null;
  correo: string | null;

  rol: Rol;              // rol principal
  rol_extra: Rol | null; // segundo rol opcional

  can_create_event: boolean;

  solicitud_tipo: TipoSolicitud | null;
  solicitud_estado: EstadoSolicitud | null;
  solicitud_enviada_at: string | null; // timestamp string o null
};

/* =========================
   Normalizadores / type-guards
   ========================= */
const ROLES: readonly Rol[] = ["admin", "club_owner", "productor", "user"] as const;
const TIPOS: readonly TipoSolicitud[] = ["productor", "club_owner", "ambos"] as const;
const ESTADOS: readonly EstadoSolicitud[] = ["pendiente", "aprobada", "rechazada"] as const;

function asRol(x: unknown): Rol {
  return (ROLES as readonly string[]).includes(String(x)) ? (x as Rol) : "user";
}
function asRolOrNull(x: unknown): Rol | null {
  if (x == null || x === "") return null;
  return (ROLES as readonly string[]).includes(String(x)) ? (x as Rol) : null;
}
function asTipo(x: unknown): TipoSolicitud | null {
  if (x == null || x === "") return null;
  return (TIPOS as readonly string[]).includes(String(x)) ? (x as TipoSolicitud) : null;
}
function asEstado(x: unknown): EstadoSolicitud | null {
  if (x == null || x === "") return null;
  return (ESTADOS as readonly string[]).includes(String(x)) ? (x as EstadoSolicitud) : null;
}

/** Normaliza una fila cruda de Supabase al tipo Row */
function normalizeRow(r: any): Row {
  return {
    id_usuario: String(r.id_usuario),
    nombre: r?.nombre ?? null,
    correo: r?.correo ?? null,

    rol: asRol(r?.rol),
    rol_extra: asRolOrNull(r?.rol_extra),

    can_create_event: Boolean(r?.can_create_event),

    solicitud_tipo: asTipo(r?.solicitud_tipo),
    solicitud_estado: asEstado(r?.solicitud_estado),
    solicitud_enviada_at: r?.solicitud_enviada_at ?? null,
  };
}

/* =========================
   Utilidades para roles/estados
   ========================= */
function sanitizePair(a: Rol, b: Rol | null): { r1: Rol; r2: Rol | null } {
  if (b && a === b) return { r1: a, r2: null };
  return { r1: a, r2: b ?? null };
}

function ensureRolePairFor(
  current: { rol: Rol; rol_extra: Rol | null },
  want: Rol[]
): { rol: Rol; rol_extra: Rol | null } {
  const keepAdmin = current.rol === "admin" || current.rol_extra === "admin";
  const out: Rol[] = [];

  if (keepAdmin) out.push("admin");
  for (const w of want) {
    if (out.length >= 2) break;
    if (!out.includes(w)) out.push(w);
  }
  const existing = [current.rol, ...(current.rol_extra ? [current.rol_extra] : [])];
  for (const ex of existing) {
    if (out.length >= 2) break;
    if (!out.includes(ex)) out.push(ex);
  }

  if (out.length === 0) out.push("user");
  if (out.length === 1 && !out.includes("user")) out.push("user");

  const uniq = Array.from(new Set(out)).slice(0, 2);
  const [r1, r2] = uniq;
  return { rol: r1, rol_extra: r2 ?? null };
}

function applyApprovalRoles(row: Row): { rol: Rol; rol_extra: Rol | null } {
  const current = { rol: row.rol, rol_extra: row.rol_extra };
  const t = row.solicitud_tipo;
  if (!t) return current;

  if (t === "productor") return ensureRolePairFor(current, ["productor"]);
  if (t === "club_owner") return ensureRolePairFor(current, ["club_owner"]);
  return ensureRolePairFor(current, ["productor", "club_owner"]);
}

function hasElevatedRole(row: Pick<Row, "rol" | "rol_extra">): boolean {
  const elev: Rol[] = ["admin", "productor", "club_owner"];
  return elev.includes(row.rol) || (!!row.rol_extra && elev.includes(row.rol_extra));
}

function isSent(dt: string | null): boolean {
  return !!dt;
}

/* =========================
   Ordenamiento (mejorado)
   ========================= */
type SortMode = "none" | "pending-first" | "approved-first";

function isApprovedRow(u: Row): boolean {
  return hasElevatedRole(u) || u.solicitud_estado === "aprobada";
}
function isPendingRow(u: Row): boolean {
  // Pendiente = enviada, sin rechazar ni aprobar, y sin roles elevados
  return (
    isSent(u.solicitud_enviada_at) &&
    !isApprovedRow(u) &&
    u.solicitud_estado !== "rechazada"
  );
}
function tsToMs(ts: string | null): number {
  if (!ts) return 0;
  const t = new Date(ts).getTime();
  return Number.isFinite(t) ? t : 0;
}

/* =========================
   Página
   ========================= */
export default function AdminUsersPage() {
  const { dbUser, loading: authLoading } = useAuth();

  const [rows, setRows] = useState<Row[]>([]);
  const [dirty, setDirty] = useState<Record<string, Row>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selector de orden
  const [sortMode, setSortMode] = useState<SortMode>("none");

  // Carga inicial
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("usuario")
        .select(
          [
            "id_usuario",
            "nombre",
            "correo",
            "rol",
            "rol_extra",
            "can_create_event",
            "solicitud_tipo",
            "solicitud_estado",
            "solicitud_enviada_at",
          ].join(", ")
        )
        .order("created_at", { ascending: true });

    if (!mounted) return;

      if (error) {
        console.error("load usuario:", error);
        setError(error.message);
        setRows([]);
      } else {
        const safe: Row[] = Array.isArray(data) ? data.map(normalizeRow) : [];
        setRows(safe);
      }
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Sólo admin puede ver esta página
  if (!authLoading && dbUser && dbUser.rol !== "admin") {
    return <Unauthorized />;
  }

  const markDirty = (u: Row) =>
    setDirty((prev) => ({ ...prev, [u.id_usuario]: u }));

  /** Cambios de roles y permisos */
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

  const onChangeRol2 = (id_usuario: string, newRol2: string) => {
    const value = (newRol2 || "") as Rol | "";
    setRows((prev) =>
      prev.map((r) => {
        if (r.id_usuario !== id_usuario) return r;

        if (value === "") {
          const updated = { ...r, rol_extra: null };
          markDirty(updated);
          return updated;
        }

        const candidate = value as Rol;
        const { r1, r2 } = sanitizePair(r.rol, candidate);
        const updated = { ...r, rol: r1, rol_extra: r2 };
        markDirty(updated);
        return updated;
      })
    );
  };

  const onToggleCreateEvent = (id_usuario: string, can: boolean) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id_usuario === id_usuario ? { ...r, can_create_event: can } : r
      )
    );
    const found = rows.find((r) => r.id_usuario === id_usuario);
    if (found) markDirty({ ...found, can_create_event: can });
  };

  /** Aprobar/Rechazar solicitud (UI) */
  const onApprove = (id_usuario: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id_usuario !== id_usuario) return r;
        const rolePair = applyApprovalRoles(r);
        const updated: Row = {
          ...r,
          ...rolePair,
          can_create_event: true,
          solicitud_estado: "aprobada",
        };
        markDirty(updated);
        return updated;
      })
    );
    toast.success("Solicitud aprobada (recuerda Guardar cambios).");
  };

  const onReject = (id_usuario: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id_usuario !== id_usuario) return r;
        const updated: Row = { ...r, solicitud_estado: "rechazada" };
        markDirty(updated);
        return updated;
      })
    );
    toast("Solicitud rechazada (recuerda Guardar cambios).", { icon: "⚠️" });
  };

  /** Guardar cambios con AUTO-SYNC de estado aprobado si hay roles elevados */
  const onSave = async () => {
    const updates = Object.values(dirty);
    if (updates.length === 0) return;

    try {
      setSaving(true);

      await Promise.all(
        updates.map((u) => {
          const autoEstado: EstadoSolicitud | null =
            hasElevatedRole(u) ? "aprobada" : (u.solicitud_estado ?? null);

          return supabase
            .from("usuario")
            .update({
              rol: u.rol,
              rol_extra: u.rol_extra ?? null,
              can_create_event: u.can_create_event,
              solicitud_estado: autoEstado,
              // No tocamos solicitud_tipo ni solicitud_enviada_at desde admin
            })
            .eq("id_usuario", u.id_usuario);
        })
      );

      // Ajustar localmente el estado por coherencia
      setRows((prev) =>
        prev.map((r) => {
          const change = updates.find((u) => u.id_usuario === r.id_usuario);
          if (!change) return r;
          const autoEstado: EstadoSolicitud | null =
            hasElevatedRole(change) ? "aprobada" : (change.solicitud_estado ?? null);
          return { ...r, ...change, solicitud_estado: autoEstado };
        })
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

  const pendingCount = useMemo(
    () =>
      rows.filter(
        (r) =>
          isSent(r.solicitud_enviada_at) &&
          !hasElevatedRole(r) &&
          r.solicitud_estado !== "aprobada" &&
          r.solicitud_estado !== "rechazada"
      ).length,
    [rows]
  );

  /** ORDENAMIENTO MEJORADO */
  const sortedRows = useMemo(() => {
    const copy = [...rows];

    if (sortMode === "pending-first") {
      // 1) Pendiente arriba
      // 2) Dentro de pendientes: fecha de envío DESC (más nuevas primero)
      // 3) Empate: nombre ASC
      copy.sort((a, b) => {
        const ap = isPendingRow(a) ? 1 : 0;
        const bp = isPendingRow(b) ? 1 : 0;
        if (bp !== ap) return bp - ap; // pendientes (1) sobre no pendientes (0)

        if (ap === 1 && bp === 1) {
          const ad = tsToMs(a.solicitud_enviada_at);
          const bd = tsToMs(b.solicitud_enviada_at);
          if (bd !== ad) return bd - ad; // más nuevas primero
        }

        const an = (a.nombre ?? "").toLowerCase();
        const bn = (b.nombre ?? "").toLowerCase();
        return an.localeCompare(bn);
      });
    } else if (sortMode === "approved-first") {
      // Aprobados arriba; empate por nombre
      copy.sort((a, b) => {
        const aa = isApprovedRow(a) ? 1 : 0;
        const ba = isApprovedRow(b) ? 1 : 0;
        if (ba !== aa) return ba - aa;
        const an = (a.nombre ?? "").toLowerCase();
        const bn = (b.nombre ?? "").toLowerCase();
        return an.localeCompare(bn);
      });
    } else {
      // Sin orden especial: alfabético por nombre
      copy.sort((a, b) =>
        (a.nombre ?? "").toLowerCase().localeCompare((b.nombre ?? "").toLowerCase())
      );
    }

    return copy;
  }, [rows, sortMode]);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-black text-white px-4 py-16">
        <div className="max-w-5xl mx-auto">Cargando…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-16">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold">
              Panel <span className="text-[#8e2afc]">de usuarios</span>
            </h1>
            {pendingCount > 0 && (
              <p className="text-sm text-amber-300 mt-1">
                Hay {pendingCount} solicitud(es) pendientes de revisión.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Selector de orden */}
            <label className="text-sm text-white/80">
              Ordenar:&nbsp;
              <select
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
              >
                <option value="none">Sin orden especial</option>
                <option value="pending-first">Pendientes primero</option>
                <option value="approved-first">Aprobados primero</option>
              </select>
            </label>

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
          </div>
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
                <th className="px-4 py-3 font-semibold">Solicitud</th>
                <th className="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-zinc-400">
                    No hay usuarios.
                  </td>
                </tr>
              ) : (
                sortedRows.map((u) => {
                  const rol2Options = ALL_ROLES.filter((r) => r !== u.rol);

                  const approved = isApprovedRow(u);
                  const rejected = u.solicitud_estado === "rechazada";

                  const estadoBadge = approved
                    ? "text-emerald-300 bg-emerald-500/15 border-emerald-400/30"
                    : rejected
                    ? "text-rose-300 bg-rose-500/15 border-rose-400/30"
                    : isSent(u.solicitud_enviada_at)
                    ? "text-amber-300 bg-amber-500/15 border-amber-400/30"
                    : "text-white/60 bg-white/10 border-white/20";

                  const estadoLabel = approved
                    ? "aprobada"
                    : rejected
                    ? "rechazada"
                    : isSent(u.solicitud_enviada_at)
                    ? "pendiente"
                    : "—";

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

                      {/* Permiso crear evento */}
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

                      {/* Solicitud (estado + tipo + fecha) */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] ${estadoBadge}`}
                          >
                            {estadoLabel}
                          </span>
                          <span className="text-xs text-white/70">
                            {u.solicitud_tipo ? `Tipo: ${u.solicitud_tipo}` : "Tipo: —"}
                          </span>
                          <span className="text-xs text-white/50">
                            {u.solicitud_enviada_at
                              ? new Date(u.solicitud_enviada_at).toLocaleString()
                              : "Sin envío"}
                          </span>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        {approved ? (
                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-emerald-300 bg-emerald-500/15 border-emerald-400/30">
                            Aprobado
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              className="px-3 py-1.5 rounded bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs"
                              onClick={() => onApprove(u.id_usuario)}
                            >
                              Aprobar
                            </button>
                            <button
                              className="px-3 py-1.5 rounded bg-rose-600/90 hover:bg-rose-600 text-white text-xs"
                              onClick={() => onReject(u.id_usuario)}
                            >
                              Rechazar
                            </button>
                          </div>
                        )}
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