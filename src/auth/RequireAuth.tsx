import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

type Props = {
  children: JSX.Element;
};

export default function RequireAuth({ children }: Props) {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) return null; // o spinner

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}