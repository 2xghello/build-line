import { useState, useEffect } from 'react';
import {
  Users,
  Bike,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  UserPlus,
  X,
  Calendar,
  BarChart3,
  RefreshCw,
  CalendarDays,
  TrendingUp
} from 'lucide-react';
import {
  getCycles,
  getTechnicians,
  assignCycle,
  reassignCycle,
  updateDueDate,
  getTeamPerformance
} from '@services/adminService';
import { useAuth } from '@context/AuthContext';
import '../admin/AdminPages.css';

// ============================================================================
// SUPERVISOR DASHBOARD
// ============================================================================

function SupervisorDashboard() {
  const { profile } = useAuth();
  const [cycles, setCycles] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showDueDateModal, setShowDueDateModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [teamPerformance, setTeamPerformance] = useState([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [cyclesData, techData] = await Promise.all([
        getCycles(),
        getTechnicians()
      ]);
      setCycles(cyclesData || []);
      setTechnicians(techData || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function loadPerformance() {
    try {
      setPerformanceLoading(true);
      const data = await getTeamPerformance(profile?.id);
      setTeamPerformance(data || []);
    } catch (err) {
      console.error('Failed to load performance:', err);
    } finally {
      setPerformanceLoading(false);
    }
  }

  function handleAssign(cycle) {
    setSelectedCycle(cycle);
    setShowAssignModal(true);
  }

  function handleReassign(cycle, assignment) {
    setSelectedCycle(cycle);
    setSelectedAssignment(assignment);
    setShowReassignModal(true);
  }

  function handleSetDueDate(assignment) {
    setSelectedAssignment(assignment);
    setShowDueDateModal(true);
  }

  function handleShowPerformance() {
    if (teamPerformance.length === 0) {
      loadPerformance();
    }
    setShowPerformanceModal(true);
  }

  async function handleModalComplete() {
    setShowAssignModal(false);
    setShowReassignModal(false);
    setShowDueDateModal(false);
    setSelectedCycle(null);
    setSelectedAssignment(null);
    await loadData();
  }

  // Calculate stats
  const stats = {
    pending: cycles.filter(c => c.status === 'pending').length,
    assigned: cycles.filter(c => c.status === 'assigned').length,
    inProgress: cycles.filter(c => c.status === 'in_progress').length,
    qcPending: cycles.filter(c => c.status === 'qc_pending').length,
    activeTechnicians: technicians.filter(t => t.status === 'active').length
  };

  // Get pending cycles (not yet assigned)
  const pendingCycles = cycles.filter(c => c.status === 'pending');

  // Get active cycles (assigned or in progress)
  const activeCycles = cycles.filter(c => ['assigned', 'in_progress'].includes(c.status));

  // Calculate technician workloads
  const technicianWorkloads = technicians.map(tech => {
    const assignedCycles = cycles.filter(c =>
      c.assignments?.some(a => a.profiles?.id === tech.id) &&
      ['assigned', 'in_progress'].includes(c.status)
    );
    return {
      ...tech,
      activeAssignments: assignedCycles.length
    };
  });

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
      <div className="dashboard-welcome" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
        <div>
          <h1>Supervisor Dashboard</h1>
          <p>Manage cycle assignments and monitor team progress.</p>
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
        <div className="stats-card stats-orange">
          <div className="stats-icon">
            <Clock size={28} />
          </div>
          <div className="stats-content">
            <span className="stats-value">{stats.pending}</span>
            <span className="stats-label">Pending Assignment</span>
            <span className="stats-sub">Awaiting technician</span>
          </div>
        </div>

        <div className="stats-card stats-blue">
          <div className="stats-icon">
            <Bike size={28} />
          </div>
          <div className="stats-content">
            <span className="stats-value">{stats.assigned + stats.inProgress}</span>
            <span className="stats-label">Active Assemblies</span>
            <span className="stats-sub">In progress</span>
          </div>
        </div>

        <div className="stats-card stats-teal">
          <div className="stats-icon">
            <CheckCircle size={28} />
          </div>
          <div className="stats-content">
            <span className="stats-value">{stats.qcPending}</span>
            <span className="stats-label">Awaiting QC</span>
            <span className="stats-sub">Ready for inspection</span>
          </div>
        </div>

        <div className="stats-card stats-green">
          <div className="stats-icon">
            <Users size={28} />
          </div>
          <div className="stats-content">
            <span className="stats-value">{stats.activeTechnicians}</span>
            <span className="stats-label">Active Technicians</span>
            <span className="stats-sub">Available workforce</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Pending Assignments */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>Pending Assignments</h2>
            <button className="btn btn-secondary btn-sm" onClick={loadData}>
              Refresh
            </button>
          </div>

          {pendingCycles.length === 0 ? (
            <div className="empty-state-card" style={{ margin: 24 }}>
              <CheckCircle size={48} />
              <h3>All Cycles Assigned</h3>
              <p>No cycles are waiting for assignment.</p>
            </div>
          ) : (
            <div className="table-container" style={{ margin: '0 24px 24px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Serial Number</th>
                    <th>Model</th>
                    <th>Priority</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingCycles.map(cycle => (
                    <tr key={cycle.id}>
                      <td>
                        <span className="cycle-code">{cycle.serial_number}</span>
                      </td>
                      <td>{cycle.model || '-'}</td>
                      <td>
                        <span className={`priority-badge priority-${getPriorityColor(cycle.priority)}`}>
                          {cycle.priority || 'normal'}
                        </span>
                      </td>
                      <td>
                        <span className="timestamp">
                          <Calendar size={14} />
                          {formatDate(cycle.created_at)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAssign(cycle)}
                        >
                          <UserPlus size={16} />
                          Assign
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Technician Workloads */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>Team Workload</h2>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleShowPerformance}
            >
              <TrendingUp size={16} />
              Stats
            </button>
          </div>

          <div style={{ padding: '16px 24px' }}>
            {technicianWorkloads.length === 0 ? (
              <div className="empty-state-card">
                <Users size={48} />
                <h3>No Technicians</h3>
                <p>No active technicians available.</p>
              </div>
            ) : (
              technicianWorkloads.map(tech => (
                <div
                  key={tech.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 16,
                    background: '#f9fafb',
                    borderRadius: 12,
                    marginBottom: 12
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{tech.full_name}</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>{tech.user_code}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: tech.activeAssignments > 3 ? '#ef4444' :
                               tech.activeAssignments > 1 ? '#f59e0b' : '#22c55e'
                      }}
                    >
                      {tech.activeAssignments}
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>active</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Active Assemblies */}
      <div className="dashboard-card full-width" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h2>Active Assemblies</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="status-badge status-yellow">{stats.assigned} Assigned</span>
            <span className="status-badge status-blue">{stats.inProgress} In Progress</span>
          </div>
        </div>

        {activeCycles.length === 0 ? (
          <div className="empty-state-card" style={{ margin: 24 }}>
            <BarChart3 size={48} />
            <h3>No Active Work</h3>
            <p>No cycles are currently being assembled.</p>
          </div>
        ) : (
          <div className="table-container" style={{ margin: '0 24px 24px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Serial Number</th>
                  <th>Model</th>
                  <th>Technician</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeCycles.map(cycle => {
                  const assignment = cycle.assignments?.[0];
                  const technician = assignment?.profiles;
                  const isOverdue = assignment?.due_date && new Date(assignment.due_date) < new Date();
                  return (
                    <tr key={cycle.id}>
                      <td>
                        <span className="cycle-code">{cycle.serial_number}</span>
                      </td>
                      <td>{cycle.model || '-'}</td>
                      <td>
                        {technician ? (
                          <div className="user-cell">
                            <Users size={16} />
                            <span>{technician.full_name}</span>
                          </div>
                        ) : (
                          <span className="not-assigned">-</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge status-${getStatusColor(cycle.status)}`}>
                          {formatStatus(cycle.status)}
                        </span>
                      </td>
                      <td>
                        {assignment?.due_date ? (
                          <span
                            className="timestamp"
                            style={{ color: isOverdue ? '#ef4444' : undefined }}
                          >
                            <CalendarDays size={14} />
                            {formatDateShort(assignment.due_date)}
                            {isOverdue && ' (Overdue)'}
                          </span>
                        ) : (
                          <button
                            className="btn btn-secondary btn-xs"
                            style={{ fontSize: 12, padding: '4px 8px' }}
                            onClick={() => handleSetDueDate(assignment)}
                          >
                            Set Due Date
                          </button>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {assignment?.due_date && (
                            <button
                              className="btn btn-secondary btn-xs"
                              title="Change Due Date"
                              onClick={() => handleSetDueDate(assignment)}
                            >
                              <CalendarDays size={14} />
                            </button>
                          )}
                          <button
                            className="btn btn-secondary btn-xs"
                            title="Reassign"
                            onClick={() => handleReassign(cycle, assignment)}
                          >
                            <RefreshCw size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {showAssignModal && selectedCycle && (
        <AssignModal
          cycle={selectedCycle}
          technicians={technicianWorkloads}
          supervisorId={profile?.id}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedCycle(null);
          }}
          onComplete={handleModalComplete}
        />
      )}

      {/* Reassign Modal */}
      {showReassignModal && selectedCycle && selectedAssignment && (
        <ReassignModal
          cycle={selectedCycle}
          assignment={selectedAssignment}
          technicians={technicianWorkloads}
          onClose={() => {
            setShowReassignModal(false);
            setSelectedCycle(null);
            setSelectedAssignment(null);
          }}
          onComplete={handleModalComplete}
        />
      )}

      {/* Due Date Modal */}
      {showDueDateModal && selectedAssignment && (
        <DueDateModal
          assignment={selectedAssignment}
          onClose={() => {
            setShowDueDateModal(false);
            setSelectedAssignment(null);
          }}
          onComplete={handleModalComplete}
        />
      )}

      {/* Performance Modal */}
      {showPerformanceModal && (
        <PerformanceModal
          performance={teamPerformance}
          loading={performanceLoading}
          onClose={() => setShowPerformanceModal(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// ASSIGN MODAL
// ============================================================================

function AssignModal({ cycle, technicians, supervisorId, onClose, onComplete }) {
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedTechnician) {
      setError('Please select a technician');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await assignCycle(cycle.id, selectedTechnician, supervisorId, dueDate || null);
      onComplete();
    } catch (err) {
      console.error('Failed to assign cycle:', err);
      setError('Failed to assign cycle. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Get tomorrow's date for min value
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2>Assign Cycle</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Cycle Info */}
            <div style={{ background: '#f9fafb', padding: 16, borderRadius: 8, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Bike size={24} color="#3b82f6" />
                <div>
                  <div style={{ fontWeight: 600 }}>{cycle.serial_number}</div>
                  <div style={{ fontSize: 14, color: '#6b7280' }}>{cycle.model}</div>
                </div>
                {cycle.priority && cycle.priority !== 'normal' && (
                  <span className={`priority-badge priority-${getPriorityColor(cycle.priority)}`}>
                    {cycle.priority}
                  </span>
                )}
              </div>
            </div>

            {/* Technician Selection */}
            <div className="form-group">
              <label>Select Technician *</label>
              <select
                value={selectedTechnician}
                onChange={(e) => setSelectedTechnician(e.target.value)}
                required
              >
                <option value="">Choose a technician...</option>
                {technicians.map(tech => (
                  <option key={tech.id} value={tech.id}>
                    {tech.full_name} ({tech.user_code}) - {tech.activeAssignments} active
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div className="form-group">
              <label>Due Date (Optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={minDate}
              />
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                Set a deadline for this assembly
              </div>
            </div>

            {/* Selected Technician Info */}
            {selectedTechnician && (
              <div style={{
                background: '#dbeafe',
                padding: 12,
                borderRadius: 8,
                fontSize: 14,
                color: '#1d4ed8'
              }}>
                <strong>Note:</strong> This technician will be notified of the new assignment.
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 size={18} className="spinner" /> : <UserPlus size={18} />}
              Assign Cycle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// REASSIGN MODAL
// ============================================================================

function ReassignModal({ cycle, assignment, technicians, onClose, onComplete }) {
  const currentTechId = assignment?.profiles?.id;
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedTechnician) {
      setError('Please select a technician');
      return;
    }
    if (selectedTechnician === currentTechId) {
      setError('Please select a different technician');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await reassignCycle(assignment.id, selectedTechnician, reason || null);
      onComplete();
    } catch (err) {
      console.error('Failed to reassign cycle:', err);
      setError('Failed to reassign cycle. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2>Reassign Cycle</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Cycle Info */}
            <div style={{ background: '#f9fafb', padding: 16, borderRadius: 8, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Bike size={24} color="#3b82f6" />
                <div>
                  <div style={{ fontWeight: 600 }}>{cycle.serial_number}</div>
                  <div style={{ fontSize: 14, color: '#6b7280' }}>{cycle.model}</div>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 14 }}>
                <strong>Currently assigned to:</strong> {assignment?.profiles?.full_name || 'Unknown'}
              </div>
            </div>

            {/* New Technician Selection */}
            <div className="form-group">
              <label>Reassign To *</label>
              <select
                value={selectedTechnician}
                onChange={(e) => setSelectedTechnician(e.target.value)}
                required
              >
                <option value="">Choose a technician...</option>
                {technicians
                  .filter(tech => tech.id !== currentTechId)
                  .map(tech => (
                    <option key={tech.id} value={tech.id}>
                      {tech.full_name} ({tech.user_code}) - {tech.activeAssignments} active
                    </option>
                  ))}
              </select>
            </div>

            {/* Reason */}
            <div className="form-group">
              <label>Reason for Reassignment</label>
              <textarea
                placeholder="Enter reason for reassignment (optional)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>

            {/* Warning */}
            <div style={{
              background: '#fef3c7',
              border: '1px solid #fcd34d',
              padding: 12,
              borderRadius: 8,
              fontSize: 14,
              color: '#92400e'
            }}>
              <strong>Note:</strong> The current assignment will be marked as reassigned and a new assignment will be created.
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 size={18} className="spinner" /> : <RefreshCw size={18} />}
              Reassign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// DUE DATE MODAL
// ============================================================================

function DueDateModal({ assignment, onClose, onComplete }) {
  const [dueDate, setDueDate] = useState(assignment?.due_date?.split('T')[0] || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!dueDate) {
      setError('Please select a due date');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await updateDueDate(assignment.id, dueDate);
      onComplete();
    } catch (err) {
      console.error('Failed to update due date:', err);
      setError('Failed to update due date. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2>Set Due Date</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label>Due Date *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={today}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 size={18} className="spinner" /> : <CalendarDays size={18} />}
              Set Date
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// PERFORMANCE MODAL
// ============================================================================

function PerformanceModal({ performance, loading, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h2>Team Performance (Last 30 Days)</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Loader2 className="spinner" size={32} />
            </div>
          ) : performance.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
              <BarChart3 size={48} style={{ marginBottom: 12 }} />
              <p>No performance data available.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Technician</th>
                    <th>Total</th>
                    <th>Completed</th>
                    <th>In Progress</th>
                    <th>Avg Time</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.map((tech, index) => (
                    <tr key={index}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600 }}>{tech.technician?.full_name}</div>
                          <div style={{ fontSize: 12, color: '#9ca3af' }}>{tech.technician?.user_code}</div>
                        </div>
                      </td>
                      <td>{tech.total}</td>
                      <td>
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>{tech.completed}</span>
                      </td>
                      <td>
                        <span style={{ color: '#3b82f6' }}>{tech.inProgress}</span>
                      </td>
                      <td>
                        {tech.avgCompletionTimeHours ? (
                          <span style={{ fontWeight: 500 }}>{tech.avgCompletionTimeHours}h</span>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatStatus(status) {
  const statusMap = {
    pending: 'Pending',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    qc_pending: 'QC Pending',
    qc_passed: 'QC Passed',
    qc_failed: 'QC Failed',
    ready_for_dispatch: 'Ready',
    dispatched: 'Dispatched'
  };
  return statusMap[status] || status;
}

function getStatusColor(status) {
  const colorMap = {
    pending: 'orange',
    assigned: 'yellow',
    in_progress: 'blue',
    qc_pending: 'purple',
    qc_passed: 'green',
    qc_failed: 'red',
    ready_for_dispatch: 'teal',
    dispatched: 'gray'
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

function formatDateShort(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

export default SupervisorDashboard;
