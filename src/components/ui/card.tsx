// src/components/ui/card.tsx
import React from "react";

export function Card({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`rounded-xl bg-[#0f0f16] border border-[#2b2140] ${className}`}
    />
  );
}