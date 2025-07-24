import * as React from "react";

export function Card({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`bg-[#1f1b2e] p-6 rounded-md shadow-xl ${className}`}
    />
  );
}