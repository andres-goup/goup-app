// src/auth/PostLoginRouter.tsx
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { roleHome } from "./roleHome";

export default function PostLoginRouter() {
  const { loading, user, dbUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    // 1) Si no hay usuario de Firebase, lo mandamos al login
    if (!user) {
      navigate("/login", { replace: true, state: { from: location } });
      return;
    }

    // 2) Si sí hay user, calculamos su home según rol en dbUser
    const role = dbUser?.rol;
    const homePath = role ? roleHome[role] ?? "/" : "/";
    navigate(homePath, { replace: true });
  }, [loading, user, dbUser, navigate, location]);

  return null;
}