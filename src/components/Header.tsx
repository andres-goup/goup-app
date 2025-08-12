// src/components/Header.tsx
import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useHasClub } from "@/hooks/useHasClub";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Home,
  PlusCircle,
  Shield,
  Users,
  Building2,
  LogIn,
  CalendarPlus,
  Briefcase,
  UserPlus,
  LogOut,
  User2,
} from "lucide-react";

export default function Header() {
  const { user, dbUser, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { loading: loadingClub, hasClub } = useHasClub();
  const [hasProducer, setHasProducer] = useState(false);

  function hasRole(r: "admin" | "club_owner" | "productor" | "user") {
    if (!dbUser) return false;
    return dbUser.rol === r || dbUser.rol_extra === r;
  }

  const isAdmin = hasRole("admin");
  const isClubOwner = hasRole("club_owner");
  const isProductor = hasRole("productor");
  const canCreateEvent = !!dbUser?.can_create_event || isAdmin || isClubOwner || isProductor;
  const shouldShowRoleRequest = !!user && !isAdmin && !isClubOwner && !isProductor;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const headerElement = document.querySelector("header");
      if (mobileOpen && headerElement && !headerElement.contains(event.target as Node)) {
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "auto";
  }, [mobileOpen]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) return;
      const ref = doc(db, "productoras", user.uid);
      const snap = await getDoc(ref);
      if (active) setHasProducer(snap.exists());
    })();
    return () => {
      active = false;
    };
  }, [user]);

  if (!dbUser && user) return null;

  function MobileNavItem({ to, children, icon }: { to: string; children: React.ReactNode; icon?: React.ReactNode }) {
    const handleClick = () => setMobileOpen(false);
    return (
      <NavLink
        to={to}
        onClick={handleClick}
        className={({ isActive }) =>
          `flex items-center gap-2 px-3 py-2 rounded ${
            isActive ? "bg-[#8e2afc]/20 text-[#8e2afc]" : "text-white/80 hover:bg-white/5"
          }`
        }
      >
        {icon} {children}
      </NavLink>
    );
  }

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-zinc-900 backdrop-blur border-b border-white/10">
      <div className="w-full px-4 h-14 flex items-center justify-between overflow-visible">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-white font-extrabold text-lg">
            Go<span className="text-[#8e2afc]">Up</span>
          </Link>

          <nav className="hidden md:flex items-center gap-4 ml-6 text-sm">
            <NavItem to="/inicio" icon={<Home className="w-4 h-4" />}>Inicio</NavItem>
            {isClubOwner && !loadingClub && (
              hasClub ? (
                <NavItem to="/dashboard/mi-club" icon={<Building2 className="w-4 h-4" />}>Mi club</NavItem>
              ) : (
                <NavItem to="/club/crear" icon={<Building2 className="w-4 h-4" />}>Crear club</NavItem>
              )
            )}
            {(isProductor || isAdmin) && (
              hasProducer ? (
                <NavItem to="/dashboard/productora" icon={<Briefcase className="w-4 h-4" />}>Mi productora</NavItem>
              ) : (
                <NavItem to="/productora/crear" icon={<Briefcase className="w-4 h-4" />}>Crear productora</NavItem>
              )
            )}
            {shouldShowRoleRequest && (
              <NavItem to="/solicitud-acceso" icon={<UserPlus className="w-4 h-4" />}>Solicitud de acceso</NavItem>
            )}
            {(isProductor || isAdmin || isClubOwner) && (
              <NavItem to="/mis-eventos" icon={<CalendarPlus className="w-4 h-4" />}>Mis eventos</NavItem>
            )}
            {canCreateEvent && (
              <NavItem to="/evento/crear" icon={<PlusCircle className="w-4 h-4" />}>Crear evento</NavItem>
            )}
            {isAdmin && <NavItem to="/admin" icon={<Shield className="w-4 h-4" />}>Admin</NavItem>}
            {isAdmin && <NavItem to="/club/crear" icon={<Building2 className="w-4 h-4" />}>Crear club</NavItem>}
            {isAdmin && <NavItem to="/adminClub" icon={<Users className="w-4 h-4" />}>Clubes Admin</NavItem>}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {!user && (
            <Link to="/login" className="hidden md:inline-block px-3 py-1.5 rounded-md bg-[#8e2afc] text-white text-sm hover:opacity-90">
              <LogIn className="inline w-4 h-4 mr-1" /> Iniciar sesión
            </Link>
          )}

          {user && (
            <div className="relative" ref={containerRef}>
              <button onClick={() => setOpen(o => !o)} className="w-9 h-9 rounded-full overflow-hidden border border-white/20">
                {dbUser?.photo_url ? (
                  <img src={dbUser.photo_url} alt={dbUser.nombre || user.email!} className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center bg-white/10 text-white text-sm">
                    {(dbUser?.nombre ?? user.email!)?.[0]}
                  </span>
                )}
              </button>

              {open && (
                <div className="absolute z-[70] right-0 top-full mt-2 w-48 bg-neutral-900 border border-white/10 rounded-md shadow-xl">
                  <div className="px-3 py-2 border-b border-white/10">
                    <p className="font-semibold truncate">{dbUser?.nombre}</p>
                    <p className="text-white/60 truncate">{user.email}</p>
                  </div>
                  <ul className="py-1">
                    <li>
                      <Link to="/perfil" className="block px-3 py-2 hover:bg-white/5" onClick={() => setOpen(false)}>
                        <User2 className="inline w-4 h-4 mr-1" /> Mi perfil
                      </Link>
                    </li>
                    {isAdmin && (
                      <li>
                        <Link to="/admin" className="block px-3 py-2 hover:bg-white/5" onClick={() => setOpen(false)}>
                          <Shield className="inline w-4 h-4 mr-1" /> Panel admin
                        </Link>
                      </li>
                    )}
                    <li>
                      <button className="w-full text-left px-3 py-2 rounded hover:bg-white/5 text-white/80" onClick={() => { signOut(); setMobileOpen(false); }}>
                        <LogOut className="inline w-4 h-4 mr-1" /> Cerrar sesión
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}

          <button className="md:hidden text-white text-2xl px-2 flex items-center" onClick={() => setMobileOpen(m => !m)}>
            ☰ <span className="ml-1 text-sm">Menú</span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed z-40 flex">
          <div className="fixed inset-0 bg-black opacity-50 z-40" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 w-72 max-w-xs bg-zinc-900 text-white p-4 shadow-lg animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-bold">Menú</span>
              <button className="text-white text-2xl" onClick={() => setMobileOpen(false)}>✕</button>
            </div>
            <nav className="space-y-2 text-sm">
              <MobileNavItem to="/inicio" icon={<Home className="w-4 h-4" />}>Inicio</MobileNavItem>
              {isClubOwner && !loadingClub && (
                hasClub ? (
                  <MobileNavItem to="/dashboard/mi-club" icon={<Building2 className="w-4 h-4" />}>Mi club</MobileNavItem>
                ) : (
                  <MobileNavItem to="/club/crear" icon={<Building2 className="w-4 h-4" />}>Crear club</MobileNavItem>
                )
              )}
              {(isProductor || isAdmin) && (
                hasProducer ? (
                  <MobileNavItem to="/dashboard/productora" icon={<Briefcase className="w-4 h-4" />}>Mi productora</MobileNavItem>
                ) : (
                  <MobileNavItem to="/productora/crear" icon={<Briefcase className="w-4 h-4" />}>Crear productora</MobileNavItem>
                )
              )}
              {shouldShowRoleRequest && <MobileNavItem to="/solicitud-acceso" icon={<UserPlus className="w-4 h-4" />}>Solicitud de acceso</MobileNavItem>}
              {(isProductor || isAdmin || isClubOwner) && <MobileNavItem to="/mis-eventos" icon={<CalendarPlus className="w-4 h-4" />}>Mis eventos</MobileNavItem>}
              {canCreateEvent && <MobileNavItem to="/evento/crear" icon={<PlusCircle className="w-4 h-4" />}>Crear evento</MobileNavItem>}
              {isAdmin && <MobileNavItem to="/club/crear" icon={<Building2 className="w-4 h-4" />}>Crear club</MobileNavItem>}
              {isAdmin && <MobileNavItem to="/admin" icon={<Shield className="w-4 h-4" />}>Admin</MobileNavItem>}
              {isAdmin && <MobileNavItem to="/adminClub" icon={<Users className="w-4 h-4" />}>Clubes Admin</MobileNavItem>}
              {(!user || !isProductor || !isAdmin || !isClubOwner) && <MobileNavItem to="/login" icon={<Users className="w-4 h-4" />}>Ingresar</MobileNavItem>}
              {user && (
                <>
                  <div className="h-px bg-white/10 my-2" />
                  <MobileNavItem to="/perfil" icon={<User2 className="w-4 h-4" />}>Mi perfil</MobileNavItem>
                  <button className="w-full text-left px-3 py-2 rounded hover:bg-white/5 text-white/80 flex items-center gap-2" onClick={signOut}>
                    <LogOut className="w-4 h-4" /> Cerrar sesión
                  </button>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

function NavItem({ to, children, icon }: { to: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative px-2 py-1 rounded flex items-center gap-1 transition-all duration-200 ${
          isActive ? "text-[#8e2afc]" : "text-white/80 hover:text-white"
        } after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-[#8e2afc] hover:after:w-full after:transition-all after:duration-300`
      }
    >
      {icon} {children}
    </NavLink>
  );
}