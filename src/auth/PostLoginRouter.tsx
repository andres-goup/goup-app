import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "./useAuth";
import { roleHome } from "./roleHome";

export default function PostLoginRouter() {
  const { loading, session, dbUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    // Si no está logueado => login
    if (!session) {
      navigate("/login", { replace: true, state: { from: location } });
      return;
    }

    // Ya logueado: manda a su “home” por rol
    const path = dbUser ? roleHome[dbUser.rol] ?? "/" : "/";
    navigate(path, { replace: true });
  }, [loading, session, dbUser, navigate, location]);

  return null; // solo redirige
}