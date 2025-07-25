import { Link } from "react-router-dom";

type Rol = "cliente" | "productor" | "club" | "dj";

type Props = {
  rol: Rol | null;
};

const opcionesPorRol: Record<Rol, string[]> = {
  cliente: [],
  productor: ["Crear evento"],
  club: ["Panel de club", "Crear acceso"],
  dj: ["Mi perfil DJ"],
};

export default function MenuSuperior({ rol }: Props) {
  if (!rol) return null; // Si no hay rol, no se muestra nada

  return (
    <nav style={{ display: "flex", justifyContent: "center", gap: "20px", padding: "1rem" }}>
      {opcionesPorRol[rol]?.map((opcion) => (
        <Link
          key={opcion}
          to={`/${opcion.toLowerCase().replace(/\s/g, "_")}`}
        >
          {opcion}
        </Link>
      ))}
    </nav>
  );
}