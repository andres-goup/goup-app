// src/AppRoutes.tsx
import { Routes, Route } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth";
import RequireRole from "./auth/RequireRole";
import AppLayout from "./layouts/AppLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import ProfilePage from "./pages/Profile";
import ClubPage from "./pages/Club";
import ProductoraPage from "./pages/Producer";
import EventPage from "./pages/Event";
import AdminUsersPage from "./pages/AdminUsers";
import DebugUser from "./pages/DebugUser";
import Dashboard from "./pages/Inicio";
import UserEvents from "./components/UserEvents";
import MisEventosPage from "./pages/mis-eventos";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
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
          path="dashboard/club"
          element={
            <RequireAuth>
              <RequireRole roles={["admin", "club_owner"]}>
                <ClubPage />
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
          path="admin"
          element={
            <RequireAuth>
              <RequireRole roles={["admin"]}>
                <AdminUsersPage />
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route path="/debug" element={<DebugUser />} />
        <Route path="/inicio" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}