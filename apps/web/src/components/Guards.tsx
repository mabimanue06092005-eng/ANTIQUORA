import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EmptyState, PageLoader } from './ui';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}

/** UI-level guard only — every admin API endpoint is independently protected on the server. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== 'ADMIN')
    return (
      <EmptyState icon={<ShieldAlert className="h-6 w-6" />} title="Administrators only" action={<Link to="/" className="btn-primary">Return to the store</Link>}>
        Your account does not have access to the admin dashboard.
      </EmptyState>
    );
  return <>{children}</>;
}
