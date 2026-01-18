import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Bike,
  ClipboardList,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { getDashboardStats, getAuditLogs } from '@services/adminService';
import { useAuth } from '@context/AuthContext';
import './AdminPages.css';

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================

function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [statsData, logsData] = await Promise.all([
        getDashboardStats(),
        getAuditLogs(5)
      ]);
      setStats(statsData);
      setRecentLogs(logsData || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2 className="spinner" size={40} />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-page dashboard">
      {/* Welcome Header */}
      <div className="dashboard-welcome">
        <div>
          <h1>Welcome back, {profile?.full_name}</h1>
          <p>Here's what's happening with your assembly system today.</p>
        </div>
        <span className="date-display">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </span>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <StatsCard
          icon={Users}
          label="Total Users"
          value={stats?.totalUsers || 0}
          subValue={`${stats?.activeUsers || 0} active`}
          color="blue"
          link="/admin/users"
        />
        <StatsCard
          icon={Bike}
          label="Total Cycles"
          value={stats?.totalCycles || 0}
          subValue={`${stats?.cyclesByStatus?.in_progress || 0} in progress`}
          color="green"
          link="/admin/cycles"
        />
        <StatsCard
          icon={AlertTriangle}
          label="Pending QC"
          value={stats?.pendingQC || 0}
          subValue="Awaiting inspection"
          color="orange"
          link="/admin/cycles"
        />
        <StatsCard
          icon={CheckCircle}
          label="Completed"
          value={stats?.cyclesByStatus?.dispatched || 0}
          subValue="Ready for dispatch"
          color="teal"
          link="/admin/cycles"
        />
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="dashboard-grid">
        {/* Quick Actions */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>Quick Actions</h2>
          </div>
          <div className="quick-actions">
            <Link to="/admin/users" className="action-link">
              <Users size={24} />
              <div>
                <span>User Management</span>
                <small>Create and manage users</small>
              </div>
              <ArrowRight size={20} />
            </Link>
            <Link to="/admin/cycles" className="action-link">
              <Bike size={24} />
              <div>
                <span>Cycle Management</span>
                <small>Add and assign cycles</small>
              </div>
              <ArrowRight size={20} />
            </Link>
            <Link to="/admin/checklists" className="action-link">
              <ClipboardList size={24} />
              <div>
                <span>Checklists</span>
                <small>Manage assembly checklists</small>
              </div>
              <ArrowRight size={20} />
            </Link>
            <Link to="/admin/audit-logs" className="action-link">
              <FileText size={24} />
              <div>
                <span>Audit Logs</span>
                <small>View system activity</small>
              </div>
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>Recent Activity</h2>
            <Link to="/admin/audit-logs" className="view-all">View All</Link>
          </div>
          <div className="activity-list">
            {recentLogs.length === 0 ? (
              <div className="empty-activity">
                <Clock size={32} />
                <p>No recent activity</p>
              </div>
            ) : (
              recentLogs.map(log => (
                <div key={log.id} className="activity-item">
                  <div className="activity-icon">
                    {getActionIcon(log.action)}
                  </div>
                  <div className="activity-content">
                    <span className="activity-action">{formatAction(log.action)}</span>
                    <span className="activity-meta">
                      {log.profiles?.full_name || 'System'} • {formatTimeAgo(log.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Cycle Status Overview */}
      <div className="dashboard-card full-width">
        <div className="card-header">
          <h2>Cycle Status Overview</h2>
        </div>
        <div className="status-overview">
          {Object.entries(stats?.cyclesByStatus || {}).map(([status, count]) => (
            <div key={status} className="status-bar-item">
              <div className="status-bar-label">
                <span>{formatStatus(status)}</span>
                <span>{count}</span>
              </div>
              <div className="status-bar">
                <div
                  className={`status-bar-fill status-${status}`}
                  style={{ width: `${(count / (stats?.totalCycles || 1)) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STATS CARD COMPONENT
// ============================================================================

function StatsCard({ icon: Icon, label, value, subValue, color, link }) {
  return (
    <Link to={link} className={`stats-card stats-${color}`}>
      <div className="stats-icon">
        <Icon size={28} />
      </div>
      <div className="stats-content">
        <span className="stats-value">{value}</span>
        <span className="stats-label">{label}</span>
        {subValue && <span className="stats-sub">{subValue}</span>}
      </div>
    </Link>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getActionIcon(action) {
  const icons = {
    create: <Users size={18} />,
    update: <TrendingUp size={18} />,
    delete: <AlertTriangle size={18} />,
    qc_override: <AlertTriangle size={18} />,
  };
  return icons[action] || <Clock size={18} />;
}

function formatAction(action) {
  const actions = {
    create: 'Created new record',
    update: 'Updated record',
    delete: 'Deleted record',
    qc_override: 'QC Override performed',
  };
  return actions[action] || action;
}

function formatStatus(status) {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default AdminDashboard;
