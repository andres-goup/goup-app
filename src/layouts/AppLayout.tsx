// src/layouts/AppLayout.tsx
import { Outlet } from "react-router-dom";
import Header from "@/components/Header";

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />

      <main className="flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}