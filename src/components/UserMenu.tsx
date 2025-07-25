import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

export default function UserMenu() {
  const { user, dbUser, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  // Si no hay sesión, muestra botón de login y listo
  if (!user) {
    return (
      <Link
        to="/login"
        className="px-3 py-1.5 rounded-md bg-[#8e2afc] text-white text-sm hover:opacity-90"
      >
        Iniciar sesión
      </Link>
    );
  }

  const avatar =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    dbUser?.foto ||
    "";
  const name =
    dbUser?.nombre || user.user_metadata?.full_name || user.email || "Usuario";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-9 h-9 rounded-full overflow-hidden border border-white/20"
        aria-label="Abrir menú de usuario"
      >
        {avatar ? (
          <img src={avatar} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="w-full h-full flex items-center justify-center bg-white/10 text-white text-sm">
            {name[0]}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-md bg-neutral-900 border border-white/10 shadow-lg text-sm text-white">
          <div className="px-3 py-2 border-b border-white/10">
          <p className="font-semibold truncate">{name}</p>
          <p className="text-white/60 truncate">{user.email}</p>
          </div>

          <ul className="py-1">
            <li>
              <Link
                to="/profile"
                className="block px-3 py-2 hover:bg-white/5"
                onClick={() => setOpen(false)}
              >
                Mi perfil
              </Link>
            </li>

            {dbUser?.rol === "admin" && (
              <li>
                <Link
                  to="/admin"
                  className="block px-3 py-2 hover:bg-white/5"
                  onClick={() => setOpen(false)}
                >
                  Panel admin
                </Link>
              </li>
            )}

            <li>
              <button
                className="w-full text-left px-3 py-2 hover:bg-white/5"
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
              >
                Cerrar sesión
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}