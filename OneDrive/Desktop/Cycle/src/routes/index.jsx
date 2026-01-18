import { createBrowserRouter, Navigate } from 'react-router-dom';

// Auth
import LoginPage from '../features/auth/pages/LoginPage';

// Route Guards
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';

// Layouts
import DashboardLayout from '../components/layout/DashboardLayout';

// Admin Pages
import AdminDashboard from '../features/admin/pages/AdminDashboard';
import UsersPage from '../features/admin/pages/UsersPage';
import AdminCyclesPage from '../features/admin/pages/CyclesPage';
import AuditLogsPage from '../features/admin/pages/AuditLogsPage';

// Supervisor Pages
import SupervisorDashboard from '../features/supervisor/pages/SupervisorDashboard';
import AssignCyclePage from '../features/supervisor/pages/AssignCyclePage';
import MonitorProgressPage from '../features/supervisor/pages/MonitorProgressPage';

// Technician Pages
import TechnicianDashboard from '../features/technician/pages/TechnicianDashboard';
import MyTasksPage from '../features/technician/pages/MyTasksPage';
import ChecklistPage from '../features/technician/pages/ChecklistPage';

// QC Pages
import QCDashboard from '../features/qc/pages/QCDashboard';
import PendingInspections from '../features/qc/pages/PendingInspections';
import InspectionPage from '../features/qc/pages/InspectionPage';

// Sales Pages
import SalesDashboard from '../features/sales/pages/SalesDashboard';
import ReadyForDispatch from '../features/sales/pages/ReadyForDispatch';
import DispatchPage from '../features/sales/pages/DispatchPage';

// Error Pages
import NotFoundPage from '../components/shared/NotFoundPage';

// ============================================================================
// ROUTER CONFIGURATION
// ============================================================================

const router = createBrowserRouter([
  // --------------------------------------------------------------------------
  // PUBLIC ROUTES
  // --------------------------------------------------------------------------
  {
    path: '/login',
    element: <LoginPage />,
  },

  // --------------------------------------------------------------------------
  // ADMIN ROUTES
  // --------------------------------------------------------------------------
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <RoleRoute allowedRoles={['admin']}>
          <DashboardLayout />
        </RoleRoute>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/admin/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <AdminDashboard />,
      },
      {
        path: 'users',
        element: <UsersPage />,
      },
      {
        path: 'cycles',
        element: <AdminCyclesPage />,
      },
      {
        path: 'audit-logs',
        element: <AuditLogsPage />,
      },
    ],
  },

  // --------------------------------------------------------------------------
  // SUPERVISOR ROUTES
  // --------------------------------------------------------------------------
  {
    path: '/supervisor',
    element: (
      <ProtectedRoute>
        <RoleRoute allowedRoles={['supervisor', 'admin']}>
          <DashboardLayout />
        </RoleRoute>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/supervisor/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <SupervisorDashboard />,
      },
      {
        path: 'assign',
        element: <AssignCyclePage />,
      },
      {
        path: 'monitor',
        element: <MonitorProgressPage />,
      },
    ],
  },

  // --------------------------------------------------------------------------
  // TECHNICIAN ROUTES
  // --------------------------------------------------------------------------
  {
    path: '/technician',
    element: (
      <ProtectedRoute>
        <RoleRoute allowedRoles={['technician', 'admin']}>
          <DashboardLayout />
        </RoleRoute>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/technician/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <TechnicianDashboard />,
      },
      {
        path: 'tasks',
        element: <MyTasksPage />,
      },
      {
        path: 'checklist/:assignmentId',
        element: <ChecklistPage />,
      },
    ],
  },

  // --------------------------------------------------------------------------
  // QC ROUTES
  // --------------------------------------------------------------------------
  {
    path: '/qc',
    element: (
      <ProtectedRoute>
        <RoleRoute allowedRoles={['qc', 'admin']}>
          <DashboardLayout />
        </RoleRoute>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/qc/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <QCDashboard />,
      },
      {
        path: 'pending',
        element: <PendingInspections />,
      },
      {
        path: 'inspect/:cycleId',
        element: <InspectionPage />,
      },
    ],
  },

  // --------------------------------------------------------------------------
  // SALES ROUTES
  // --------------------------------------------------------------------------
  {
    path: '/sales',
    element: (
      <ProtectedRoute>
        <RoleRoute allowedRoles={['sales', 'admin']}>
          <DashboardLayout />
        </RoleRoute>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/sales/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <SalesDashboard />,
      },
      {
        path: 'ready',
        element: <ReadyForDispatch />,
      },
      {
        path: 'dispatch/:cycleId',
        element: <DispatchPage />,
      },
    ],
  },

  // --------------------------------------------------------------------------
  // ROOT REDIRECT
  // --------------------------------------------------------------------------
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },

  // --------------------------------------------------------------------------
  // 404 NOT FOUND
  // --------------------------------------------------------------------------
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export default router;
