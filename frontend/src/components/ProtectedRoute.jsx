import { Navigate, useLocation } from 'react-router-dom';

import FullScreenLoader from '@/components/FullScreenLoader';
import { useAuth } from '@/contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { token, user, isAuthLoading } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (isAuthLoading || !user) {
    return <FullScreenLoader label="Restoring session" />;
  }

  return children;
}
