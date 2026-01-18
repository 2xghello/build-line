import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import {
  Bike,
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  CheckCircle,
  Truck,
  LogOut,
  Menu,
  X,
  ChevronLeft
} from 'lucide-react';
import './DashboardLayout.css';

// ============================================================================
// NAVIGATION CONFIG PER ROLE
// ============================================================================

const NAVIGATION = {
  admin: [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/users', label: 'User Management', icon: Users },
    { path: '/admin/cycles', label: 'Cycle Management', icon: Bike },
    { path: '/admin/checklists', label: 'Checklists', icon: ClipboardList },
    { path: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
  ],
  supervisor: [
    { path: '/supervisor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/supervisor/assign', label: 'Assign Cycles', icon: ClipboardList },
    { path: '/supervisor/monitor', label: 'Monitor Progress', icon: CheckCircle },
  ],
  technician: [
    { path: '/technician/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/technician/tasks', label: 'My Tasks', icon: ClipboardList },
  ],
  qc: [
    { path: '/qc/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/qc/pending', label: 'Pending Inspections', icon: CheckCircle },
  ],
  sales: [
    { path: '/sales/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/sales/ready', label: 'Ready for Dispatch', icon: Truck },
  ],
};

// ============================================================================
// DASHBOARD LAYOUT
// ============================================================================

function DashboardLayout() {
  const { profile, role, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = NAVIGATION[role] || [];

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className={`dashboard-layout ${sidebarCollapsed ? 'collapsed' : ''}`}>
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Bike size={28} />
            {!sidebarCollapsed && <span>CycleAssembly</span>}
          </div>
          <button
            className="sidebar-toggle desktop-only"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className="sidebar-toggle mobile-only"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        <div className="sidebar-user">
          <div className="user-avatar">
            {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          {!sidebarCollapsed && (
            <div className="user-info">
              <span className="user-name">{profile?.full_name || 'User'}</span>
              <span className="user-code">{profile?.user_code || ''}</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <item.icon size={20} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {!sidebarCollapsed && (
            <div className="role-badge">
              {role?.toUpperCase()}
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Header */}
        <header className="dashboard-header">
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="header-right">
            <span className="header-user">
              {profile?.full_name}
              <small>{profile?.user_code}</small>
            </span>
          </div>
        </header>

        {/* Content */}
        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default DashboardLayout;
