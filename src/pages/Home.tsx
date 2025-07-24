import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="max-w-lg mx-auto p-6 text-center">
      <h1 className="text-3xl font-bold mb-6">GoUp – Formularios</h1>
      <p className="text-white/70 mb-8">
        Selecciona el formulario que quieres completar:
      </p>

      <div className="flex flex-col gap-4">
        <Link className="bg-[#8e2afc] py-3 rounded font-semibold" to="/club">
          Registrar Club
        </Link>
        <Link className="bg-[#8e2afc] py-3 rounded font-semibold" to="/productora">
          Registrar Productora
        </Link>
        <Link className="bg-[#8e2afc] py-3 rounded font-semibold" to="/evento">
          Crear Evento
        </Link>
      </div>
    </main>
  );
}