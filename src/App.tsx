// src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Home from "./pages/Home";
import ClubPage from "./pages/Club";
import ProducerPage from "./pages/Producer";
import EventPage from "./pages/Event";

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);
  return null;
}

function Nav() {
  return (
    <header className="w-full bg-black text-white border-b border-white/10">
      <nav className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3 text-sm">
        <Link to="/" className="font-semibold tracking-wide">
          Go<span className="text-[#8e2afc]">Up</span>
        </Link>

        <div className="flex gap-4">
          <Link to="/club" className="hover:text-[#8e2afc]">
            Club
          </Link>
          <Link to="/productora" className="hover:text-[#8e2afc]">
            Productora
          </Link>
          <Link to="/evento" className="hover:text-[#8e2afc]">
          Evento
          </Link>
        </div>
      </nav>
    </header>
  );
}

function NotFound() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 px-6">
      <h1 className="text-3xl font-bold">404</h1>
      <p className="text-white/70">La página que buscas no existe.</p>
      <Link to="/" className="text-[#8e2afc] underline">
        Volver al inicio
      </Link>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <ScrollToTop />
      <div className="min-h-screen bg-black text-white">
        <Nav />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/club" element={<ClubPage />} />
          <Route path="/productora" element={<ProducerPage />} />
          <Route path="/evento" element={<EventPage />} />

          {/* Redirecciones útiles */}
          <Route path="/producer" element={<Navigate to="/productora" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}