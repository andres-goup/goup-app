import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

export function LoadingButton({
  loading,
  children,
  className = "",
  ...props
}: Props) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`relative inline-flex items-center justify-center rounded-md px-4 py-2 transition-transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${className}`}
      aria-busy={loading}
    >
      {loading && (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}