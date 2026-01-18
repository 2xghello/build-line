import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from '../Sidebar';
import Header from '../Header';
import './DashboardLayout.css';

// ============================================================================
// DASHBOARD LAYOUT
// ============================================================================
// Main layout wrapper for all dashboard pages
// Contains: Sidebar, Header, and main content area
// ============================================================================

function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  return (
    <div className={`dashboard-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile Overlay */}
      {mobileSidebarOpen && (
        <div className="mobile-overlay" onClick={closeMobileSidebar} />
      )}

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={closeMobileSidebar}
      />

      {/* Main Content Area */}
      <div className="dashboard-main">
        {/* Header */}
        <Header
          onToggleSidebar={toggleSidebar}
          onToggleMobileSidebar={toggleMobileSidebar}
          sidebarCollapsed={sidebarCollapsed}
        />

        {/* Page Content */}
        <main className="dashboard-content">
          <div className="content-wrapper">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
