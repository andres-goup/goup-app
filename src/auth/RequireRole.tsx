// src/auth/RequireRole.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export type Role = "admin" | "club_owner" | "productor" | "user";

type Props = {
  roles: Role[];
  children: JSX.Element;
};

const inAllowed = (r: unknown, allowed: Role[]) =>
  typeof r === "string" && (allowed as string[]).includes(r);

export default function RequireRole({ roles, children }: Props) {
  const { loading, dbUser } = useAuth();

  if (loading) return null;

  // Sin sesión o sin datos → fuera
  if (!dbUser) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Chequea rol principal y, si existe, el rol secundario
  const okMain = inAllowed(dbUser.rol, roles);
  const okExtra = inAllowed((dbUser as any).rol_extra, roles);

  if (!okMain && !okExtra) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}