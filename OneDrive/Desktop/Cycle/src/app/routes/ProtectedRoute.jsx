import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { Loader2 } from 'lucide-react';

// ============================================================================
// PROTECTED ROUTE
// Redirects unauthenticated users to login page
// ============================================================================

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="route-loading">
        <Loader2 className="spinner" size={40} />
        <p>Loading...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
