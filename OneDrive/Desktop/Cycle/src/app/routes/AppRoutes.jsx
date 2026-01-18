import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';

// Auth Pages
import LoginPage from '@auth/LoginPage';

// Admin Pages
import {
  AdminDashboard,
  UserManagement,
  ChecklistManagement,
  CycleManagement,
  AuditLogs
} from '@dashboards/admin';

// Other Dashboard Pages
import { SupervisorDashboard } from '@dashboards/supervisor';
import { TechnicianDashboard } from '@dashboards/technician';
import { QCDashboard } from '@dashboards/qc';
import { SalesDashboard } from '@dashboards/sales';

// Layout
import DashboardLayout from '@components/layout/DashboardLayout';

// Route Guards
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';

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
// ROOT REDIRECT COMPONENT
// Redirects authenticated users to their dashboard
// ============================================================================

function RootRedirect() {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (isAuthenticated && role) {
    return <Navigate to={ROLE_REDIRECTS[role] || '/login'} replace />;
  }

  return <Navigate to="/login" replace />;
}

// ============================================================================
// APP ROUTES
// ============================================================================

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Admin Routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['admin']}>
              <DashboardLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="cycles" element={<CycleManagement />} />
        <Route path="checklists" element={<ChecklistManagement />} />
        <Route path="audit-logs" element={<AuditLogs />} />
      </Route>

      {/* Supervisor Routes */}
      <Route
        path="/supervisor/*"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['supervisor', 'admin']}>
              <DashboardLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SupervisorDashboard />} />
      </Route>

      {/* Technician Routes */}
      <Route
        path="/technician/*"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['technician', 'admin']}>
              <DashboardLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TechnicianDashboard />} />
      </Route>

      {/* QC Routes */}
      <Route
        path="/qc/*"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['qc', 'admin']}>
              <DashboardLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<QCDashboard />} />
      </Route>

      {/* Sales Routes */}
      <Route
        path="/sales/*"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['sales', 'admin']}>
              <DashboardLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SalesDashboard />} />
      </Route>

      {/* Root Redirect - sends to appropriate dashboard or login */}
      <Route path="/" element={<RootRedirect />} />

      {/* 404 - Redirect to root which handles auth state */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
