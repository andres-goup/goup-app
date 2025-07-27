// src/components/Header.tsx
import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useHasClub } from "@/hooks/useHasClub"; // club
import { supabase } from "@/lib/supabase";       // productor

export default function Header() {
  const { user, dbUser, signOut } = useAuth();

  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { loading: loadingClub, hasClub } = useHasClub();
  const [hasProducer, setHasProducer] = useState<boolean>(false);

  const avatar =
    dbUser?.foto ||
    (user?.user_metadata?.picture as string | undefined) ||
    (user?.user_metadata?.avatar_url as string | undefined) ||
    "";

  const name =
    dbUser?.nombre ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    "Usuario";

  // === NUEVO: helper para dos roles (rol + rol_extra) ===
  type Role = "admin" | "club_owner" | "productor" | "user";
  const roleExtra = (dbUser as any)?.rol_extra as Role | undefined;
  const hasRole = (r: Role) => dbUser?.rol === r || roleExtra === r;

  // Reemplazo directo de flags usando hasRole
  const isAdmin = hasRole("admin");
  const isClubOwner = hasRole("club_owner");
  const isProductor = hasRole("productor");
  const canCreateEvent =
    !!dbUser?.can_create_event || isAdmin || isClubOwner || isProductor;

  // Cerrar menú al hacer click fuera o al presionar ESC
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  // 👇 ESTE useEffect debe ir ANTES de cualquier "return" condicional
  // para no romper el orden de hooks
  useEffect(() => {
    let active = true;

    (async () => {
      if (!user) return;

      // 1) id_usuario
      const { data: u } = await supabase
        .from("usuario")
        .select("id_usuario")
        .eq("auth_user_id", user.id)
        .single();

      if (!u) return;

      // 2) ¿existe productora?
      const { data: p } = await supabase
        .from("productor")
        .select("id_productor")
        .eq("id_usuario", u.id_usuario)
        .maybeSingle();

      if (!active) return;
      setHasProducer(!!p);
    })();

    return () => {
      active = false;
    };
  }, [user]);

  // Evitamos parpadeo del header mientras carga dbUser
  if (!dbUser && user) return null;

  return (
    <header className="sticky top-0 z-[60] w-full bg-black/70 backdrop-blur border-b border-white/10">
      <div className="w-full px-4 h-14 flex items-center justify-between overflow-visible">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Link to="/" className="text-white font-extrabold text-lg">
            Go<span className="text-[#8e2afc]">Up</span>
          </Link>

          {/* Navegación desktop */}
          <nav className="hidden md:flex items-center gap-4 ml-6 text-sm">
            <NavItem to="/">Inicio</NavItem>

            {/* Club: alterna Crear club / Mi club */}
            {(isClubOwner || isAdmin) && !loadingClub && (
              hasClub ? (
                <NavItem to="/dashboard/mi-club">Mi club</NavItem>
              ) : (
                <NavItem to="/club/crear">Crear club</NavItem>
              )
            )}

            {/* Productora: alterna Crear / Mi productora */}
            {(isProductor || isAdmin) &&
              (hasProducer ? (
                <NavItem to="/dashboard/productora">Mi productora</NavItem>
              ) : (
                <NavItem to="/productora/crear">Crear productora</NavItem>
              ))}

            {/* Mis eventos */}
            {(isProductor || isAdmin || isClubOwner) && (
              <NavItem to="/mis-eventos">Mis eventos</NavItem>
            )}

            {canCreateEvent && <NavItem to="/evento/crear">Crear evento</NavItem>}
            {isAdmin && <NavItem to="/admin">Admin</NavItem>}
          </nav>
        </div>

        {/* Acciones derecha */}
        <div className="flex items-center gap-3">
          {!user && (
            <Link
              to="/login"
              className="hidden md:inline-block px-3 py-1.5 rounded-md bg-[#8e2afc] text-white text-sm hover:opacity-90"
            >
              Iniciar sesión
            </Link>
          )}

          {user && (
            <div className="relative" ref={containerRef}>
              <button
                aria-label="Abrir menú de usuario"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className="w-9 h-9 rounded-full overflow-hidden border border-white/20"
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt={name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="w-full h-full flex items-center justify-center bg-white/10 text-white text-sm">
                    {name[0]}
                  </span>
                )}
              </button>

              {open && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 z-[70] w-56 rounded-md bg-neutral-900 border border-white/10 shadow-lg text-sm text-white"
                >
                  <div className="px-3 py-2 border-b border-white/10">
                    <p className="font-semibold truncate">{name}</p>
                    <p className="text-white/60 truncate">{user?.email}</p>
                  </div>

                  <ul className="py-1">
                    <li>
                      <Link
                        to="/perfil"
                        className="block px-3 py-2 hover:bg:white/5"
                        onClick={() => setOpen(false)}
                      >
                        Mi perfil
                      </Link>
                    </li>
                    {isAdmin && (
                      <li>
                        <Link
                          to="/admin"
                          className="block px-3 py-2 hover:bg:white/5"
                          onClick={() => setOpen(false)}
                        >
                          Panel admin
                        </Link>
                      </li>
                    )}
                    <li>
                      <button
                        className="w-full text-left px-3 py-2 hover:bg:white/5"
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
          )}

          {!user && (
            <Link
              to="/login"
              className="md:hidden inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-[#8e2afc] text-white text-sm hover:opacity-90"
            >
              Login
            </Link>
          )}

          <button
            className="md:hidden text-white text-2xl px-2"
            onClick={() => setMobileOpen((m) => !m)}
            aria-label="Abrir menú"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Menú mobile */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-black/90">
          <nav className="px-4 py-3 space-y-2 text-sm">
            <MobileNavItem to="/" onClick={() => setMobileOpen(false)}>
              Inicio
            </MobileNavItem>

            {/* Club (mobile): alterna */}
            {(isClubOwner || isAdmin) && !loadingClub && (
              hasClub ? (
                <MobileNavItem to="/dashboard/mi-club" onClick={() => setMobileOpen(false)}>
                  Mi club
                </MobileNavItem>
              ) : (
                <MobileNavItem to="/club/crear" onClick={() => setMobileOpen(false)}>
                  Crear club
                </MobileNavItem>
              )
            )}

            {/* Productora (mobile): alterna */}
            {(isProductor || isAdmin) &&
              (hasProducer ? (
                <MobileNavItem to="/dashboard/productora" onClick={() => setMobileOpen(false)}>
                  Mi productora
                </MobileNavItem>
              ) : (
                <MobileNavItem to="/productora/crear" onClick={() => setMobileOpen(false)}>
                  Crear productora
                </MobileNavItem>
              ))}

            {(isProductor || isAdmin || isClubOwner) && (
              <MobileNavItem to="/mis-eventos" onClick={() => setMobileOpen(false)}>
                Mis eventos
              </MobileNavItem>
            )}

            {canCreateEvent && (
              <MobileNavItem to="/evento/crear" onClick={() => setMobileOpen(false)}>
                Crear evento
              </MobileNavItem>
            )}

            {isAdmin && (
              <MobileNavItem to="/admin" onClick={() => setMobileOpen(false)}>
                Admin
              </MobileNavItem>
            )}

            {user && (
              <>
                <div className="h-px bg-white/10 my-2" />
                <MobileNavItem to="/perfil" onClick={() => setMobileOpen(false)}>
                  Mi perfil
                </MobileNavItem>
                <button
                  className="w-full text-left px-3 py-2 rounded hover:bg-white/5 text-white/80"
                  onClick={() => {
                    setMobileOpen(false);
                    signOut();
                  }}
                >
                  Cerrar sesión
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-2 py-1 rounded ${isActive ? "text-[#8e2afc]" : "text-white/80 hover:text-white"}`
      }
    >
      {children}
    </NavLink>
  );
}

function MobileNavItem({
  to,
  children,
  onClick,
}: {
  to: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `block px-3 py-2 rounded ${
          isActive ? "bg-[#8e2afc]/20 text-[#8e2afc]" : "text-white/80 hover:bg-white/5"
        }`
      }
    >
      {children}
    </NavLink>
  );
}