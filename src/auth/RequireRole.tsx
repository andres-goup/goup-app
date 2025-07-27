// src/auth/RequireRole.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { hasAnyRole } from "./permissions";

type Role = "admin" | "club_owner" | "productor" | "user";

type Props = {
  roles: Role[];
  children: JSX.Element;
};

export default function RequireRole({ roles, children }: Props) {
  const { loading, dbUser } = useAuth();

  if (loading) return null;

  // Si no hay usuario, redirige
  if (!dbUser) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Rol principal + rol secundario (opcional)
  const primary = dbUser.rol as Role | undefined;
  const extra = (dbUser as any).rol_extra as Role | undefined;

  // Autorizado si cualquiera de los 2 coincide con los roles requeridos
  const authorized =
    (primary && hasAnyRole(primary, roles)) ||
    (extra && hasAnyRole(extra, roles));

  if (!authorized) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}