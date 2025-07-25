import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { hasAnyRole } from "./permissions";

type Props = {
  roles: Array<"admin" | "club_owner" | "productor" | "user">;
  children: JSX.Element;
};

export default function RequireRole({ roles, children }: Props) {
  const { loading, dbUser } = useAuth();

  if (loading) return null;

  if (!dbUser || !hasAnyRole(dbUser.rol, roles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}