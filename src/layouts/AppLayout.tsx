import { Outlet } from "react-router-dom";
import Header from "@/components/Header";

export default function AppLayout() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-black text-white px-4 py-6">
        <Outlet />
      </main>
    </>
  );
}