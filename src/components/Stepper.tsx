export function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex justify-center gap-2 my-2">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${
            i === current ? "bg-[#8e2afc]" : "bg-white/20"
          }`}
        />
      ))}
    </div>
  );
}