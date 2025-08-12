// src/AppRoutes.tsx
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import RequireAuth from "./auth/RequireAuth";
import RequireRole from "./auth/RequireRole";
import AppLayout from "./layouts/AppLayout";
import Home from "./pages/Home";
import LoginPage from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import ProfilePage from "./pages/Profile";
import ClubCreatePage from "./pages/clubCreate";
import ProductoraPage from "./pages/Producer";
import EventPage from "./pages/Event";
import AdminUsersPage from "./pages/AdminUsers";
import DebugUser from "./pages/DebugUser";
import Dashboard from "./pages/Inicio";
import MisEventosPage from "./pages/mis-eventos";
import EventDetailPage from "./pages/EventDetail";
import MiClubPage from "./pages/mi-club";
import ProducerCreatePage from "./pages/ProducerCreate";
import RoleRequestPage from "./pages/RoleRequestPage";
import ClubesAdmin from "./pages/ClubAdminDetail";
import ClubAdmin from "./pages/ClubesAdmin";
import ClubVer from "./pages/ClubVer";

export default function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="unauthorized" element={<Unauthorized />} />

          <Route
            path="perfil"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="club"
            element={
              <RequireAuth>
                <ClubVer />
              </RequireAuth>
            }
          />

          <Route
            path="dashboard/mi-club"
            element={
              <RequireAuth>
                <RequireRole roles={["admin", "club_owner"]}>
                  <MiClubPage />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route path="/solicitud-estado" element={<RoleRequestPage />} />
          <Route
            path="/solicitud-acceso"
            element={
              <RequireRole roles={["user", "productor", "club_owner", "admin"]}>
                <RoleRequestPage />
              </RequireRole>
            }
          />

          <Route
            path="productora/crear"
            element={
              <RequireAuth>
                <RequireRole roles={["admin", "productor"]}>
                  <ProducerCreatePage />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path="club/crear"
            element={
              <RequireAuth>
                <RequireRole roles={["admin", "club_owner"]}>
                  <ClubCreatePage />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path="dashboard/productora"
            element={
              <RequireAuth>
                <RequireRole roles={["admin", "productor"]}>
                  <ProductoraPage />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path="evento/crear"
            element={
              <RequireAuth>
                <RequireRole roles={["admin", "club_owner", "productor"]}>
                  <EventPage />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path="/mis-eventos"
            element={
              <RequireAuth>
                <RequireRole roles={["admin", "productor", "club_owner"]}>
                  <MisEventosPage />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path="/mis-eventos/:id"
            element={
              <RequireAuth>
                <RequireRole roles={["admin", "productor", "club_owner"]}>
                  <EventDetailPage />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path="admin"
            element={
              <RequireAuth>
                <RequireRole roles={["admin"]}>
                  <AdminUsersPage />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path="/miClub"
            element={
              <RequireAuth>
                <RequireRole roles={["admin"]}>
                  <ClubAdmin />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path="/adminClub"
            element={
              <RequireAuth>
                <RequireRole roles={["admin"]}>
                  <ClubesAdmin />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route path="/debug" element={<DebugUser />} />
          <Route path="/inicio" element={<Dashboard />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}