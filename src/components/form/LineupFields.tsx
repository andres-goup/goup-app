// src/components/form/LineupFields.tsx
import { useWatch, useFormContext } from "react-hook-form";
import { RHFInput, RHFSelect } from "@/components/form/control";

export function LineupFields() {
  const { control } = useFormContext();
  const tieneLineup = useWatch({ control, name: "tieneLineup" });
  const rawCantidad = useWatch({ control, name: "cantidadDJs" });
const cantidadDJs =
  rawCantidad === "Más de 5" ? 6 : parseInt(rawCantidad || "0", 10);

  if (tieneLineup !== "Sí" && tieneLineup !== true) return null;

  return (
    <div className="space-y-4 mt-4">
      <RHFSelect
        name="cantidadDJs"
        label="Cantidad de DJs"
        options={["1", "2", "3", "4", "5", "Más de 5"]}
      />

      {[...Array(isNaN(cantidadDJs) ? 0 : cantidadDJs > 5 ? 6 : cantidadDJs)].map((_, i) => (
        <RHFInput
          key={i}
          name={`djs.${i}`}
          label={`DJ ${i === 0 ? "Principal" : `Secundario ${i}`}`}
        />
      ))}
    </div>
  );
}