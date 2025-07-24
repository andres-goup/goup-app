import * as React from "react";

type Variant = "default" | "outline";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({
  variant = "default",
  className = "",
  ...props
}: ButtonProps) {
  const styles =
    "px-4 py-2 rounded-md transition-colors " +
    (variant === "default"
      ? "bg-[#8e2afc] hover:bg-[#7a25d8]"
      : "border border-[#8e2afc] text-[#8e2afc] hover:bg-[#8e2afc]/10");

  return <button {...props} className={`${styles} ${className}`} />;
}