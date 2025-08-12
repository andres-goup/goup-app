import { useAuth } from "../auth/AuthContext";
import { Button } from "@/components/ui/button";
import logo from "../assets/goup_logo.png";
import { AlignCenter } from "lucide-react";


export default function Home() {
  const { rol, loading } = useAuth();

  if (loading) return <p>Cargando...</p>;
  if (!rol) return <p>No tienes acceso. Contacta al administrador.</p>;

  return (
    <main className="min-h-screen flex text-white">
      <header className="max-w-3xl mx-auto space-y-2 text-center">
  <img
    src={logo}
    alt="GoUp"
    className="mx-auto w-48"
    style={{ height: '200px', width: '450px', alignItems: 'center' }} // o '150px' si quieres menos espacio aún
  />
  <h1 className="text-3xl md:text-4xl font-extrabold">
    Bienvenido a <span className="text-[#8e2afc]">GOUP</span>
  </h1>
  <p className="text-white/100 font-bold">Estamos para ayudarte</p>
</header>
    </main>
  );
}