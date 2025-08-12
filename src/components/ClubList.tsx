import { useEffect, useState } from "react";
import { getDocs, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";

interface Club {
  id: string;
  nombre: string;
  imagen: string;
  direccion?: string;
}

export default function ClubList({ clubs }: { clubs: any[] }) {
  const [clubes, setClubes] = useState<Club[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClubes = async () => {
      const snapshot = await getDocs(collection(db, "club"));
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Club));
      setClubes(data);
    };
    fetchClubes();
  }, []);

 
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 px-4 mb-10">
      {clubs.map((club) => (
        <div
          key={club.id}
          className="bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden cursor-pointer hover:scale-105 transition"
          onClick={() => {
            localStorage.setItem("adminSelectedClubId", club.id);
            navigate(`/miClub`);
          }}
        >
          <img src={club.imagen} alt={club.nombre} className="w-full h-36 object-cover" />
          <div className="p-3 text-white">
            <h3 className="font-semibold text-lg line-clamp-1">{club.nombre}</h3>
            {club.direccion && <p className="text-sm opacity-70 line-clamp-1">{club.direccion}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}