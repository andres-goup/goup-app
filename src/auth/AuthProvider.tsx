import type { ReactNode } from "react";
import { AuthProvider as InternalAuthProvider } from "./AuthContext";

type Props = {
  children: ReactNode;
};

export default function AuthProvider({ children }: Props) {
  return <InternalAuthProvider>{children}</InternalAuthProvider>;
}