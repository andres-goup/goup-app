import * as React from "react";

export function Switch({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      {...props}
      className={`relative w-11 h-6 appearance-none rounded-full bg-gray-600 checked:bg-[#8e2afc] transition-colors cursor-pointer ${className}`}
    />
  );
}