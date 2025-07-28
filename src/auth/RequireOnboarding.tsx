// src/auth/RequireOnboarding.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireOnboarding({ children }: { children: JSX.Element }) {
  const { dbUser, loading } = useAuth();
  if (loading) return null;

  const needs = !!dbUser && dbUser.rol === "user" ;
  if (needs) return <Navigate to="/solicitud-rol" replace />;

  return children;
}