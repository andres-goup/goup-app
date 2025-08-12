// AddressMapInput.tsx
import React, { useState, useRef, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Helper para mover el mapa cuando cambian coords
function MapFlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (!lat || !lng) return;
    map.flyTo([lat, lng], 16, { duration: 0.7 });
  }, [lat, lng]);
  return null;
}

export function AddressMapInput({
  nameDireccion = "direccion",
  nameLat = "latitud",
  nameLng = "longitud",
  label = "Dirección *",
}: {
  nameDireccion?: string;
  nameLat?: string;
  nameLng?: string;
  label?: string;
}) {
  const { register, setValue, watch, formState: { errors } } = useFormContext();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSug, setShowSug] = useState(false);

  const direccion = watch(nameDireccion) as string;
  const lat = watch(nameLat) as number | null;
  const lng = watch(nameLng) as number | null;

  // Busca sugerencias en Nominatim vía CORS proxy
const fetchSuggestions = async (query: string) => {
  if (!query || query.length < 4) return setSuggestions([]);
  // Solo Chile: countrycodes=cl
  const url = `https://corsproxy.io/?https://nominatim.openstreetmap.org/search?format=json&countrycodes=cl&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network error");
    const data = await res.json();
    setSuggestions(data.slice(0, 6));
  } catch (err) {
    setSuggestions([]);
  }
};
  // Handle selecciona sugerencia
  const selectSuggestion = (sug: any) => {
    setValue(nameDireccion, sug.display_name, { shouldValidate: true });
    setValue(nameLat, parseFloat(sug.lat));
    setValue(nameLng, parseFloat(sug.lon));
    setSuggestions([]);
    setShowSug(false);
  };

  // Para limpiar sugerencias al perder foco
  const timeout = useRef<any>(null);
  const handleBlur = () => {
    timeout.current = setTimeout(() => setShowSug(false), 150);
  };

  return (
    <div className="space-y-2 relative">
      <label className="block text-white text-sm font-medium">{label}</label>
      <input
        {...register(nameDireccion, { required: true })}
        className="w-full bg-zinc-800 text-white rounded px-3 py-2"
        placeholder="Calle, ciudad..."
        autoComplete="off"
        value={direccion}
        onChange={e => {
          register(nameDireccion).onChange(e);
          fetchSuggestions(e.target.value);
          setShowSug(true);
        }}
        onFocus={() => setShowSug(true)}
        onBlur={handleBlur}
      />
      {errors[nameDireccion] && (
        <span className="text-red-500 text-sm">{(errors[nameDireccion] as any)?.message}</span>
      )}
      {/* Sugerencias */}
      {showSug && suggestions.length > 0 && (
        <ul className="bg-white text-black rounded shadow-lg absolute z-50 max-h-48 overflow-auto w-full mt-1">
          {suggestions.map(sug => (
            <li
              key={sug.place_id}
              className="px-3 py-2 cursor-pointer hover:bg-[#8e2afc] hover:text-white transition"
              onMouseDown={() => selectSuggestion(sug)}
            >
              {sug.display_name}
            </li>
          ))}
        </ul>
      )}
      {/* Map preview */}
      {(lat && lng) ? (
        <div className="mt-4 rounded overflow-hidden border border-[#8e2afc]/30 shadow-lg" style={{ height: 260 }}>
          <MapContainer center={[lat, lng]} zoom={16} style={{ height: "100%", width: "100%" }}>
            <MapFlyTo lat={lat} lng={lng} />
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[lat, lng]} icon={markerIcon}>
              <Popup>{direccion}</Popup>
            </Marker>
          </MapContainer>
        </div>
      ) : (
        <div className="mt-4 text-white/50 text-sm">Busca y selecciona una dirección para previsualizar el mapa.</div>
      )}
    </div>
  );
}