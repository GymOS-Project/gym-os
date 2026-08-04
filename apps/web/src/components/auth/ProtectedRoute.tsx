import { Navigate } from 'react-router-dom';
import { FeatureLockedPage } from '@/components/auth/FeatureLockedPage';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

function AuthRouteLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <LoadingSpinner />
    </div>
  );
}

export function ProtectedRoute({ children, allowedRoles, section, feature }: { children: React.ReactNode; allowedRoles?: SessionRole[]; section?: string; feature?: BillingFeatureKey }) {
  const { user, loading, role, hasSectionAccess, hasFeatureAccess } = useAuth();
  if (loading) return <AuthRouteLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && (!role || !allowedRoles.includes(role))) return <Navigate to="/" replace />;
  if (section && !hasSectionAccess(section)) return <Navigate to="/" replace />;
  if (feature && !hasFeatureAccess(feature)) return <FeatureLockedPage feature={feature} />;
  return <>{children}</>;
}

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <AuthRouteLoader />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
