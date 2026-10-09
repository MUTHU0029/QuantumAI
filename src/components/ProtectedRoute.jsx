import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function homeForRole(role) {
  return role === 'admin' ? '/admin' : '/dashboard';
}

export function ProtectedRoute({ requiredRole }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user } = useAuth();
  return user ? <Navigate to={homeForRole(user.role)} replace /> : <Outlet />;
}

export function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? homeForRole(user.role) : '/login'} replace />;
}
