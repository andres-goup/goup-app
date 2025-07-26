// src/components/form/LineupFields.tsx
import { useWatch, useFormContext } from "react-hook-form";
import { RHFInput } from "@/components/form/control";

export function LineupFields() {
  const { control } = useFormContext();
  const tieneLineup = useWatch({ control, name: "tieneLineup" });

  const djCount = 3; // Puedes hacerlo variable si quieres
  if (tieneLineup !== "Sí") return null;

  return (
    <div className="space-y-2">
      <p className="text-white/70 text-sm">Ingresa los nombres de los DJs</p>
      {[...Array(djCount)].map((_, i) => (
        <RHFInput
          key={i}
          name={`djs.${i}`}
          label={`DJ ${i === 0 ? "Principal" : `Secundario ${i}`}`}
        />
      ))}
    </div>
  );
}