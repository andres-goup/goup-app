// src/pages/Home.tsx
import React, { useState, useEffect } from "react";
import HeroLastEvent from "@/components/HeroLastEvent";
import CarouselClubes from "@/components/CarouselClubes";
import SearchBar from "@/components/SearchBar";
import ClubList from "@/components/ClubList";
import DistanceSlider from "@/components/DistanceSlider";
import { getDistanceFromLatLonInKm } from "@/lib/utils";
import { collection, getDocs } from "firebase/firestore";
import { db as firebaseDb } from "@/lib/firebase";

export default function Home() {
  const [allClubs, setAllClubs] = useState<any[]>([]);
  const [distance, setDistance] = useState(20); // Distancia inicial
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);

  // Obtener clubes de Firestore
  useEffect(() => {
    async function fetchClubs() {
      const clubsCol = collection(firebaseDb, "club");
      const snap = await getDocs(clubsCol);
      const clubs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllClubs(clubs);
      console.log("Clubes cargados:", clubs);
    }
    fetchClubs();
  }, []);

  // Obtener ubicación del usuario
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          console.log("Ubicación obtenida:", pos.coords.latitude, pos.coords.longitude);
        },
        (error) => {
          setUserLocation(null);
          console.error("Error obteniendo ubicación:", error);
        }
      );
    }
  }, []);

  // Filtro por distancia (con logs para depurar)
  const filteredClubs = React.useMemo(() => {
    if (!userLocation) {
      console.log("userLocation es null, mostrando todos los clubes");
      return allClubs;
    }
    return allClubs.filter(club => {
      if (!club.latitud || !club.longitud) {
        console.log("Club sin coordenadas:", club);
        return false;
      }
      const dist = getDistanceFromLatLonInKm(
        userLocation.lat,
        userLocation.lng,
        club.latitud,
        club.longitud
      );
      console.log(
        `Club ${club.nombre}: lat=${club.latitud} lng=${club.longitud} distancia=${dist}km filtro=${distance}km`
      );
      return dist <= distance;
    });
  }, [allClubs, userLocation, distance]);

  return (
    <div className="space-y-12">
      <HeroLastEvent />
      <div className="px-4 sm:px-8">
        <CarouselClubes />
        <SearchBar />
        <div className="mt-4">
          <DistanceSlider value={distance} setValue={setDistance} />
        </div>
        <ClubList clubs={filteredClubs} />
      </div>
    </div>
  );
}