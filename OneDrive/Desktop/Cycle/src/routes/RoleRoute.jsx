

import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import Spinner from '../components/ui/Spinner';

// ============================================================================
// ROLE ROUTE
// ============================================================================
// Ensures user has the required role to access a route
// Redirects to user's default dashboard if role doesn't match
// ============================================================================

function RoleRoute({ children, allowedRoles }) {
  const { role, loading, isAuthenticated, getDefaultRoute } = useAuth();

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="loading-screen">
        <Spinner size="large" />
        <p>Verifying access...</p>
      </div>
    );
  }

  // Should be used inside ProtectedRoute, but double-check auth
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user's role is in the allowed roles list
  const hasAccess = Array.isArray(allowedRoles)
    ? allowedRoles.includes(role)
    : allowedRoles === role;

  // Redirect to user's default dashboard if not authorized
  if (!hasAccess) {
    console.warn(`Access denied: User role "${role}" not in allowed roles:`, allowedRoles);
    return <Navigate to={getDefaultRoute()} replace />;
  }

  return children;
}

export default RoleRoute;
