import { Navigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';

// ============================================================================
// ROLE-BASED REDIRECT PATHS
// ============================================================================

const ROLE_REDIRECTS = {
  admin: '/admin/dashboard',
  supervisor: '/supervisor/dashboard',
  technician: '/technician/dashboard',
  qc: '/qc/dashboard',
  sales: '/sales/dashboard',
};

// ============================================================================
// ROLE ROUTE
// Redirects users without proper role to their own dashboard
// ============================================================================

function RoleRoute({ children, allowedRoles }) {
  const { role, isAuthenticated } = useAuth();

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  const hasAccess = Array.isArray(allowedRoles)
    ? allowedRoles.includes(role)
    : allowedRoles === role;

  // Redirect to user's own dashboard if unauthorized
  if (!hasAccess) {
    const redirectPath = ROLE_REDIRECTS[role] || '/login';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

export default RoleRoute;
