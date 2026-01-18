import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import Spinner from '../components/ui/Spinner';

// ============================================================================
// PROTECTED ROUTE
// ============================================================================
// Ensures user is authenticated before accessing protected pages
// Redirects to login if not authenticated
// ============================================================================

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="loading-screen">
        <Spinner size="large" />
        <p>Loading...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Save the attempted URL for redirecting after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
