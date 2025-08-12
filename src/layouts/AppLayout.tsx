import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen overflow-x-hidden flex flex-col bg-[#090909]">
      <Header />

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          className="pt-48 flex-1"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
         
          transition={{ duration: 1.5, ease: "easeInOut" }}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>

      <Footer />
    </div>
  );
}