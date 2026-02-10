import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  children: React.ReactNode;
  allowedRole?: "landlord" | "tenant";
}

export default function ProtectedRoute({ children, allowedRole }: Props) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRole && role !== allowedRole) {
    return <Navigate to={role === "tenant" ? "/tenant-portal" : "/dashboard"} replace />;
  }

  return <>{children}</>;
}
