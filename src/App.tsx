import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminUsersPage from "./pages/AdminUsers";
import AuthProvider from "./auth/AuthProvider";
import RequireAuth from "./auth/RequireAuth";
import RequireRole from "./auth/RequireRole";

import AppLayout from "./layouts/AppLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ProfilePage from "./pages/Profile";
import ClubPage from "./pages/Club";
import ProductoraPage from "./pages/Producer";
import EventPage from "./pages/Event";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Agrupamos todo bajo el layout que pinta el Header */}
          <Route element={<AppLayout />}>
            {/* Pública */}
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="unauthorized" element={<Unauthorized />} />

            {/* Autenticadas */}
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
  path="/admin"
  element={
    <RequireAuth>
      <RequireRole roles={["admin"]}>
        <AdminUsersPage />
      </RequireRole>
    </RequireAuth>
  }
/>
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
     
  );
}

export default App;