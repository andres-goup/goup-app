// src/components/DistanceSlider.tsx
import { MapPin } from "lucide-react"; // o cualquier icono de Lucide o Heroicons

export default function DistanceSlider({
  value,
  setValue,
  min = 1,
  max = 50,
  step = 1,
}: {
  value: number;
  setValue: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 my-6">
      <div className="flex items-center gap-2 text-white/70 font-medium">
        <MapPin className="w-5 h-5 text-[#8e2afc]" />
        <span>Buscar clubes en:</span>
      </div>
      <div className="flex-1 flex items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          step={step}
          onChange={e => setValue(Number(e.target.value))}
          className="distance-slider w-full accent-[#8e2afc] "
          style={{
            accentColor: "#8e2afc",
            background: `linear-gradient(90deg, #8e2afc ${((value - min)/(max - min))*100}%, #fff1 0%)`
          }}
        />
        <div
          className="w-20 flex flex-col items-center justify-center py-2 rounded-lg bg-gradient-to-br from-[#8e2afc] to-[#381a63] shadow-xl text-white font-bold text-lg ring-2 ring-[#8e2afc] animate-pulse"
          style={{ minWidth: 60 }}
        >
          <span>{value}</span>
          <span className="text-xs font-normal text-white/80">km</span>
        </div>
      </div>
    </div>
  );
}