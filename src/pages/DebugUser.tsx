import { useAuth } from "@/auth/AuthContext";

export default function DebugUser() {
  const { session, user, dbUser, rol, loading } = useAuth();

  if (loading) return <p>Cargando contexto...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h2>🔍 Diagnóstico de Usuario</h2>
      <pre><strong>Session:</strong> {JSON.stringify(session, null, 2)}</pre>
      <pre><strong>User (auth):</strong> {JSON.stringify(user, null, 2)}</pre>
      <pre><strong>dbUser (tabla users):</strong> {JSON.stringify(dbUser, null, 2)}</pre>
      <pre><strong>Rol (validado):</strong> {JSON.stringify(rol, null, 2)}</pre>
    </div>
  );
}