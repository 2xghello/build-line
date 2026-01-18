import { useState, useEffect } from 'react';
import {
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Loader2,
  ChevronRight,
  ChevronDown,
  Calendar,
  Bike,
  ClipboardList,
  Check,
  X,
  History
} from 'lucide-react';
import {
  getMyAssignments,
  startAssembly,
  completeAssembly,
  getAssignmentChecklist,
  updateChecklistItemCompletion,
  getAssignmentHistory
} from '@services/adminService';
import { useAuth } from '@context/AuthContext';
import '../admin/AdminPages.css';

// ============================================================================
// TECHNICIAN DASHBOARD
// ============================================================================

function TechnicianDashboard() {
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [expandedAssignment, setExpandedAssignment] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      loadAssignments();
    }
  }, [profile?.id]);

  async function loadAssignments() {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyAssignments(profile.id);
      setAssignments(data || []);
    } catch (err) {
      console.error('Failed to load assignments:', err);
      setError('Failed to load assignments. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleStartWork(assignmentId) {
    try {
      setActionLoading(assignmentId);
      await startAssembly(assignmentId);
      await loadAssignments();
    } catch (err) {
      console.error('Failed to start assembly:', err);
      setError('Failed to start work. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCompleteWork(assignmentId) {
    try {
      setActionLoading(assignmentId);
      await completeAssembly(assignmentId);
      await loadAssignments();
    } catch (err) {
      console.error('Failed to complete assembly:', err);
      setError('Failed to complete work. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }

  async function loadHistory() {
    if (!profile?.id) return;
    try {
      setHistoryLoading(true);
      const data = await getAssignmentHistory(profile.id);
      setHistory(data || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }

  function toggleHistory() {
    if (!showHistory && history.length === 0) {
      loadHistory();
    }
    setShowHistory(!showHistory);
  }

  // Calculate stats
  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => a.status === 'pending').length,
    inProgress: assignments.filter(a => a.status === 'in_progress').length,
    overdue: assignments.filter(a => a.due_date && new Date(a.due_date) < new Date() && a.status !== 'completed').length
  };

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2 className="spinner" size={40} />
        <p>Loading your assignments...</p>
      </div>
    );
  }

  return (
    <div className="admin-page dashboard">
      {/* Welcome Header */}
      <div className="dashboard-welcome" style={{ background: 'linear-gradient(135deg, #22c55e, #14b8a6)' }}>
        <div>
          <h1>Welcome, {profile?.full_name}</h1>
          <p>Here are your assigned cycles for assembly.</p>
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

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stats-card stats-blue">
          <div className="stats-icon">
            <Wrench size={28} />
          </div>
          <div className="stats-content">
            <span className="stats-value">{stats.total}</span>
            <span className="stats-label">Total Assigned</span>
            <span className="stats-sub">Active tasks</span>
          </div>
        </div>

        <div className="stats-card stats-orange">
          <div className="stats-icon">
            <Clock size={28} />
          </div>
          <div className="stats-content">
            <span className="stats-value">{stats.pending}</span>
            <span className="stats-label">Pending</span>
            <span className="stats-sub">Not started</span>
          </div>
        </div>

        <div className="stats-card stats-green">
          <div className="stats-icon">
            <Play size={28} />
          </div>
          <div className="stats-content">
            <span className="stats-value">{stats.inProgress}</span>
            <span className="stats-label">In Progress</span>
            <span className="stats-sub">Currently working</span>
          </div>
        </div>

        <div className="stats-card stats-teal">
          <div className="stats-icon">
            <AlertCircle size={28} />
          </div>
          <div className="stats-content">
            <span className="stats-value">{stats.overdue}</span>
            <span className="stats-label">Overdue</span>
            <span className="stats-sub">Past due date</span>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="dashboard-card full-width">
        <div className="card-header">
          <h2>My Assignments</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn btn-sm ${showHistory ? 'btn-primary' : 'btn-secondary'}`}
              onClick={toggleHistory}
            >
              <History size={16} />
              History
            </button>
            <button className="btn btn-secondary btn-sm" onClick={loadAssignments}>
              Refresh
            </button>
          </div>
        </div>

        {assignments.length === 0 ? (
          <div className="empty-state-card" style={{ margin: 24 }}>
            <CheckCircle size={48} />
            <h3>No Active Assignments</h3>
            <p>You don't have any pending assignments. Check back later!</p>
          </div>
        ) : (
          <div className="assignments-list" style={{ padding: '16px 24px' }}>
            {assignments.map(assignment => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                onStart={() => handleStartWork(assignment.id)}
                onComplete={() => handleCompleteWork(assignment.id)}
                isLoading={actionLoading === assignment.id}
                isExpanded={expandedAssignment === assignment.id}
                onToggleExpand={() => setExpandedAssignment(
                  expandedAssignment === assignment.id ? null : assignment.id
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* History Section */}
      {showHistory && (
        <div className="dashboard-card full-width" style={{ marginTop: 24 }}>
          <div className="card-header">
            <h2>Completed Assignments</h2>
          </div>

          {historyLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Loader2 className="spinner" size={32} />
            </div>
          ) : history.length === 0 ? (
            <div className="empty-state-card" style={{ margin: 24 }}>
              <History size={48} />
              <h3>No History</h3>
              <p>Your completed assignments will appear here.</p>
            </div>
          ) : (
            <div className="table-container" style={{ margin: '0 24px 24px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Serial Number</th>
                    <th>Model</th>
                    <th>Assigned</th>
                    <th>Completed</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(item => (
                    <tr key={item.id}>
                      <td>
                        <span className="cycle-code">{item.cycles?.serial_number}</span>
                      </td>
                      <td>{item.cycles?.model || '-'}</td>
                      <td>{formatDate(item.assigned_at)}</td>
                      <td>{formatDate(item.completed_at)}</td>
                      <td>{calculateDuration(item.started_at, item.completed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ASSIGNMENT CARD COMPONENT WITH CHECKLIST
// ============================================================================

function AssignmentCard({ assignment, onStart, onComplete, isLoading, isExpanded, onToggleExpand }) {
  const cycle = assignment.cycles;
  const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date();
  const [checklist, setChecklist] = useState(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [itemLoading, setItemLoading] = useState(null);

  useEffect(() => {
    if (isExpanded && assignment.status === 'in_progress' && !checklist) {
      loadChecklist();
    }
  }, [isExpanded, assignment.status]);

  async function loadChecklist() {
    if (!cycle?.id) return;
    try {
      setChecklistLoading(true);
      const data = await getAssignmentChecklist(cycle.id);
      setChecklist(data);
    } catch (err) {
      console.error('Failed to load checklist:', err);
    } finally {
      setChecklistLoading(false);
    }
  }

  async function handleToggleItem(itemId, currentStatus) {
    try {
      setItemLoading(itemId);
      await updateChecklistItemCompletion(itemId, !currentStatus);
      await loadChecklist();
    } catch (err) {
      console.error('Failed to update checklist item:', err);
    } finally {
      setItemLoading(null);
    }
  }

  const checklistItems = checklist?.checklist_items || [];
  const completedCount = checklistItems.filter(i => i.is_completed).length;
  const totalCount = checklistItems.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div
      className="assignment-card"
      style={{
        background: '#f9fafb',
        borderRadius: 12,
        marginBottom: 12,
        border: isOverdue ? '2px solid #ef4444' : '1px solid #e5e7eb',
        overflow: 'hidden'
      }}
    >
      {/* Main Card Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: 20,
          cursor: assignment.status === 'in_progress' ? 'pointer' : 'default'
        }}
        onClick={assignment.status === 'in_progress' ? onToggleExpand : undefined}
      >
        {/* Cycle Icon */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: assignment.status === 'in_progress' ? '#dcfce7' : '#dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: assignment.status === 'in_progress' ? '#16a34a' : '#2563eb'
          }}
        >
          <Bike size={24} />
        </div>

        {/* Cycle Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="cycle-code">{cycle?.serial_number}</span>
            <span className={`status-badge status-${getStatusColor(assignment.status)}`}>
              {formatStatus(assignment.status)}
            </span>
            {cycle?.priority && cycle.priority !== 'normal' && (
              <span className={`priority-badge priority-${getPriorityColor(cycle.priority)}`}>
                {cycle.priority}
              </span>
            )}
          </div>
          <div style={{ fontSize: 14, color: '#6b7280' }}>
            {cycle?.model || 'Unknown Model'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, fontSize: 13, color: '#9ca3af' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={14} />
              Assigned: {formatDate(assignment.assigned_at)}
            </span>
            {assignment.due_date && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: isOverdue ? '#ef4444' : '#9ca3af' }}>
                <Clock size={14} />
                Due: {formatDate(assignment.due_date)}
              </span>
            )}
            {assignment.status === 'in_progress' && totalCount > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <ClipboardList size={14} />
                {completedCount}/{totalCount} items
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div onClick={e => e.stopPropagation()}>
          {assignment.status === 'pending' && (
            <button
              className="btn btn-primary"
              onClick={onStart}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 size={18} className="spinner" /> : <Play size={18} />}
              Start Work
            </button>
          )}
          {assignment.status === 'in_progress' && (
            <button
              className="btn btn-success"
              onClick={onComplete}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 size={18} className="spinner" /> : <CheckCircle size={18} />}
              Complete
            </button>
          )}
        </div>

        {assignment.status === 'in_progress' ? (
          isExpanded ? <ChevronDown size={20} color="#9ca3af" /> : <ChevronRight size={20} color="#9ca3af" />
        ) : (
          <ChevronRight size={20} color="#9ca3af" />
        )}
      </div>

      {/* Expanded Checklist Section */}
      {isExpanded && assignment.status === 'in_progress' && (
        <div style={{ borderTop: '1px solid #e5e7eb', background: '#fff' }}>
          {/* Progress Bar */}
          {totalCount > 0 && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span style={{ fontWeight: 600 }}>Assembly Checklist</span>
                <span style={{ color: '#6b7280' }}>{progress}% complete</span>
              </div>
              <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: progress === 100 ? '#22c55e' : '#3b82f6',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          )}

          {/* Checklist Items */}
          <div style={{ padding: '12px 20px' }}>
            {checklistLoading ? (
              <div style={{ padding: 20, textAlign: 'center' }}>
                <Loader2 className="spinner" size={24} />
              </div>
            ) : totalCount === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>
                <ClipboardList size={32} style={{ marginBottom: 8 }} />
                <p>No checklist assigned for this cycle.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {checklistItems
                  .sort((a, b) => a.item_order - b.item_order)
                  .map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 16px',
                        background: item.is_completed ? '#f0fdf4' : '#f9fafb',
                        borderRadius: 8,
                        border: `1px solid ${item.is_completed ? '#86efac' : '#e5e7eb'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => handleToggleItem(item.id, item.is_completed)}
                    >
                      {/* Checkbox */}
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          border: item.is_completed ? 'none' : '2px solid #d1d5db',
                          background: item.is_completed ? '#22c55e' : '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {itemLoading === item.id ? (
                          <Loader2 size={14} className="spinner" color={item.is_completed ? '#fff' : '#6b7280'} />
                        ) : item.is_completed ? (
                          <Check size={14} color="#fff" />
                        ) : null}
                      </div>

                      {/* Item Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: 500,
                          color: item.is_completed ? '#16a34a' : '#1f2937',
                          textDecoration: item.is_completed ? 'line-through' : 'none'
                        }}>
                          {item.item_name}
                          {item.is_required && (
                            <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>
                          )}
                        </div>
                        {item.description && (
                          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                            {item.description}
                          </div>
                        )}
                      </div>

                      {/* Completed Time */}
                      {item.is_completed && item.completed_at && (
                        <div style={{ fontSize: 12, color: '#9ca3af' }}>
                          {formatTime(item.completed_at)}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatStatus(status) {
  const statusMap = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed'
  };
  return statusMap[status] || status;
}

function getStatusColor(status) {
  const colorMap = {
    pending: 'orange',
    in_progress: 'yellow',
    completed: 'green'
  };
  return colorMap[status] || 'gray';
}

function getPriorityColor(priority) {
  const colorMap = {
    low: 'gray',
    normal: 'blue',
    high: 'orange',
    urgent: 'red'
  };
  return colorMap[priority] || 'gray';
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatTime(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function calculateDuration(startDate, endDate) {
  if (!startDate || !endDate) return '-';
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end - start;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0) {
    return `${diffHours}h ${diffMins}m`;
  }
  return `${diffMins}m`;
}

export default TechnicianDashboard;
