import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

type ClubData = {
  id: string;
  nombre: string;
  imagen: string;
};

export default function CarouselClubes() {
  const [clubes, setClubes] = useState<ClubData[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClubes = async () => {
      const querySnapshot = await getDocs(collection(db, "club"));
      const clubsData: ClubData[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        nombre: doc.data().nombre,
        imagen: doc.data().imagen,
      }));
      setClubes(clubsData);
    };

    fetchClubes();
  }, []);

  // Auto scroll lateral infinito cada 1.5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;

        if (scrollLeft + clientWidth >= scrollWidth) {
          scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          scrollRef.current.scrollBy({ left: 180, behavior: "smooth" });
        }
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full overflow-x-hidden">
      <div
        ref={scrollRef}
        className="flex gap-4 px-4 py-2 overflow-x-auto no-scrollbar scroll-smooth"
      >
        {clubes.map((club: ClubData) => (
          <div
            key={club.id}
            className="min-w-[160px] sm:min-w-[180px] cursor-pointer"
            onClick={() => {
              localStorage.setItem("adminSelectedClubId", club.id);
              navigate(`/miClub`);
            }}
          >
            <img
              src={club.imagen}
              alt={club.nombre}
              className="rounded-lg w-full h-[140px] object-cover"
            />
            <p className="mt-2 text-white text-sm text-center truncate">
              {club.nombre}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}