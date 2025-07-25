import { useAuth } from "../auth/AuthContext";
import { Button } from "@/components/ui/button";
import logo from "../assets/goup_logo.png";
import { AlignCenter } from "lucide-react";


export default function Home() {
  const { rol, loading } = useAuth();

  if (loading) return <p>Cargando...</p>;
  if (!rol) return <p>No tienes acceso. Contacta al administrador.</p>;

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <header className="max-w-3xl mx-auto space-y-2 mb-8 text-center">
        <img src={logo} alt="GoUp" className="mx-auto w-28" style={{ width: '400px', height: '400px', alignItems: 'center'}}/>
        <h1 className="text-3xl md:text-4xl font-extrabold">
          Bienvenido a <span className="text-[#8e2afc]"> GOUP</span> 
        </h1>
        <p className="text-white/100 font-bold">Estamos para ayudarte</p>
      
      </header>
    </main>
  );
}