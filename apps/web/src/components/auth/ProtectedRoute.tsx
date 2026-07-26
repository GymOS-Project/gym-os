import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

function AuthRouteLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children, allowedRoles, section }: { children: React.ReactNode; allowedRoles?: SessionRole[]; section?: string }) {
  const { user, loading, role, hasSectionAccess } = useAuth();
  if (loading) return <AuthRouteLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && (!role || !allowedRoles.includes(role))) return <Navigate to="/" replace />;
  if (section && !hasSectionAccess(section)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <AuthRouteLoader />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
