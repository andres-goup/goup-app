import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "@/auth/useAuth";
import { roleHome } from "@/auth/roleHome";
import { FcGoogle } from "react-icons/fc";
import logo from "../assets/goup_logo.png";
export default function LoginPage() {
  const { signInWithGoogle, loading, session, dbUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (session) {
      const dest =
        dbUser ? roleHome[dbUser.rol] ?? "/" : location.state?.from?.pathname ?? "/";
      navigate(dest, { replace: true });
    }
  }, [loading, session, dbUser, navigate, location]);

  if (loading) return null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <header className="max-w-3xl mx-auto space-y-2 mb-8 text-center">

        <img src={logo} alt="GoUp" className="mx-auto w-28" />

        <h1 className="text-3xl md:text-4xl font-extrabold">
          CONECTATE <span className="text-[#8e2afc]">Y</span> REGISTRATE
        </h1>
        <p className="text-white/70">
          CON NOSOTROS
        </p>
      
        <br/>
      <button
        onClick={signInWithGoogle}
        className="flex items-center max-w-3xl mx-auto space-y 0 gap-3 px-6 py-2 bg-white text-gray-800 rounded-lg shadow-md hover:shadow-lg transition duration-200"
      >
        <FcGoogle size={24} />
        <span className="text-sm font-medium">Continuar con Google</span>
      </button>
      </header>
    </main>
  );
}