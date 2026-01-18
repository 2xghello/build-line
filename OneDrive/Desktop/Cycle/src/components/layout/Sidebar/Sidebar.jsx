import { NavLink } from 'react-router-dom';
import { useAuth } from '../../../store/AuthContext';
import {
  LayoutDashboard,
  Users,
  Bike,
  ClipboardList,
  CheckCircle,
  Truck,
  FileText,
  Settings,
  ChevronLeft,
  X,
} from 'lucide-react';
import './Sidebar.css';

// ============================================================================
// NAVIGATION CONFIG PER ROLE
// ============================================================================

const NAVIGATION = {
  admin: [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/users', label: 'User Management', icon: Users },
    { path: '/admin/cycles', label: 'All Cycles', icon: Bike },
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
// SIDEBAR COMPONENT
// ============================================================================

function Sidebar({ collapsed, mobileOpen, onCloseMobile }) {
  const { profile, role } = useAuth();

  // Get navigation items for current role
  const navItems = NAVIGATION[role] || [];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Bike className="logo-icon" />
          {!collapsed && <span className="logo-text">CycleAssembly</span>}
        </div>

        {/* Mobile Close Button */}
        <button className="mobile-close-btn" onClick={onCloseMobile}>
          <X size={24} />
        </button>
      </div>

      {/* User Info */}
      <div className="sidebar-user">
        <div className="user-avatar">
          {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
        </div>
        {!collapsed && (
          <div className="user-info">
            <span className="user-name">{profile?.full_name || 'User'}</span>
            <span className="user-role">{profile?.user_code || ''}</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.path} className="nav-item">
              <NavLink
                to={item.path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={onCloseMobile}
              >
                <item.icon className="nav-icon" size={20} />
                {!collapsed && <span className="nav-label">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div className="role-badge">
          {!collapsed && <span>{role?.toUpperCase()}</span>}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
