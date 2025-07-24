// src/components/ui/button.tsx
import React from "react";

type Variant = "default" | "outline";

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({
  variant = "default",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "px-4 py-2 rounded-md transition-colors text-sm font-medium focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "default"
      ? "bg-[#8e2afc] hover:bg-[#7a25d8]"
      : "border border-[#8e2afc] text-[#8e2afc] hover:bg-[#8e2afc]/10";

  return <button {...props} className={`${base} ${styles} ${className}`} />;
}