import { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Eye,
  Bike,
  User,
  Calendar,
  X,
  History,
  ClipboardList,
  Check
} from 'lucide-react';
import {
  getPendingQC,
  performQCInspection,
  getQCStats,
  getCycleChecklist,
  getQCHistory
} from '@services/adminService';
import { useAuth } from '@context/AuthContext';
import '../admin/AdminPages.css';

// ============================================================================
// QC DASHBOARD
// ============================================================================

function QCDashboard() {
  const { profile } = useAuth();
  const [pendingCycles, setPendingCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [stats, setStats] = useState({ passed: 0, failed: 0, total: 0 });
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [profile?.id]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [cyclesData, statsData] = await Promise.all([
        getPendingQC(),
        profile?.id ? getQCStats(profile.id) : getQCStats()
      ]);
      setPendingCycles(cyclesData || []);
      setStats(statsData || { passed: 0, failed: 0, total: 0 });
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    try {
      setHistoryLoading(true);
      const data = await getQCHistory(profile?.id);
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

  function handleInspect(cycle) {
    setSelectedCycle(cycle);
    setShowInspectionModal(true);
  }

  async function handleInspectionComplete() {
    setShowInspectionModal(false);
    setSelectedCycle(null);
    await loadData();
    // Refresh history if visible
    if (showHistory) {
      loadHistory();
    }
  }

  // Calculate priority stats
  const highPriority = pendingCycles.filter(c => c.priority === 'high' || c.priority === 'urgent').length;

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2 className="spinner" size={40} />
        <p>Loading pending inspections...</p>
      </div>
    );
  }

  return (
    <div className="admin-page dashboard">
      {/* Welcome Header */}
      <div className="dashboard-welcome" style={{ background: 'linear-gradient(135deg, #f97316, #eab308)' }}>
        <div>
          <h1>QC Inspector Dashboard</h1>
          <p>Review and inspect completed cycle assemblies.</p>
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
            <ClipboardCheck size={28} />
          </div>
          <div className="stats-content">
            <span className="stats-value">{pendingCycles.length}</span>
            <span className="stats-label">Pending Inspection</span>
            <span className="stats-sub">Awaiting QC review</span>
          </div>
        </div>

        <div className="stats-card stats-teal">
          <div className="stats-icon">
            <AlertCircle size={28} />
          </div>
          <div className="stats-content">
            <span className="stats-value">{highPriority}</span>
            <span className="stats-label">High Priority</span>
            <span className="stats-sub">Urgent cycles</span>
          </div>
        </div>

        <div className="stats-card stats-green">
          <div className="stats-icon">
            <CheckCircle size={28} />
          </div>
          <div className="stats-content">
            <span className="stats-value">{stats.passed}</span>
            <span className="stats-label">Passed Today</span>
            <span className="stats-sub">QC approved</span>
          </div>
        </div>

        <div className="stats-card stats-blue">
          <div className="stats-icon">
            <XCircle size={28} />
          </div>
          <div className="stats-content">
            <span className="stats-value">{stats.failed}</span>
            <span className="stats-label">Failed Today</span>
            <span className="stats-sub">Requires rework</span>
          </div>
        </div>
      </div>

      {/* Pending Inspections */}
      <div className="dashboard-card full-width">
        <div className="card-header">
          <h2>Pending Inspections</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn btn-sm ${showHistory ? 'btn-primary' : 'btn-secondary'}`}
              onClick={toggleHistory}
            >
              <History size={16} />
              History
            </button>
            <button className="btn btn-secondary btn-sm" onClick={loadData}>
              Refresh
            </button>
          </div>
        </div>

        {pendingCycles.length === 0 ? (
          <div className="empty-state-card" style={{ margin: 24 }}>
            <CheckCircle size={48} />
            <h3>All Caught Up!</h3>
            <p>No cycles are pending inspection at the moment.</p>
          </div>
        ) : (
          <div className="table-container" style={{ margin: '0 24px 24px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Serial Number</th>
                  <th>Model</th>
                  <th>Priority</th>
                  <th>Assembled By</th>
                  <th>Completed At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingCycles.map(cycle => {
                  const assignment = cycle.assignments?.[0];
                  const technician = assignment?.profiles;
                  return (
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
                        {technician ? (
                          <div className="user-cell">
                            <User size={16} />
                            <span>{technician.full_name}</span>
                            <small>({technician.user_code})</small>
                          </div>
                        ) : (
                          <span className="not-assigned">-</span>
                        )}
                      </td>
                      <td>
                        <span className="timestamp">
                          <Clock size={14} />
                          {formatDate(assignment?.completed_at)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleInspect(cycle)}
                        >
                          <Eye size={16} />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History Section */}
      {showHistory && (
        <div className="dashboard-card full-width" style={{ marginTop: 24 }}>
          <div className="card-header">
            <h2>Inspection History</h2>
          </div>

          {historyLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Loader2 className="spinner" size={32} />
            </div>
          ) : history.length === 0 ? (
            <div className="empty-state-card" style={{ margin: 24 }}>
              <History size={48} />
              <h3>No History</h3>
              <p>Your inspection history will appear here.</p>
            </div>
          ) : (
            <div className="table-container" style={{ margin: '0 24px 24px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Serial Number</th>
                    <th>Model</th>
                    <th>Result</th>
                    <th>Score</th>
                    <th>Defects</th>
                    <th>Inspected At</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(log => (
                    <tr key={log.id}>
                      <td>
                        <span className="cycle-code">{log.cycles?.serial_number}</span>
                      </td>
                      <td>{log.cycles?.model || '-'}</td>
                      <td>
                        <span className={`status-badge status-${log.result === 'passed' ? 'green' : 'red'}`}>
                          {log.result === 'passed' ? 'Passed' : 'Failed'}
                          {log.is_override && ' (Override)'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontWeight: 600,
                          color: log.overall_score >= 80 ? '#16a34a' :
                                 log.overall_score >= 50 ? '#f59e0b' : '#ef4444'
                        }}>
                          {log.overall_score ? `${log.overall_score}%` : '-'}
                        </span>
                      </td>
                      <td>
                        {log.defects_found?.length > 0 ? (
                          <span style={{ color: '#ef4444' }}>
                            {log.defects_found.length} found
                          </span>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>None</span>
                        )}
                      </td>
                      <td>{formatDate(log.inspected_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Inspection Modal */}
      {showInspectionModal && selectedCycle && (
        <InspectionModal
          cycle={selectedCycle}
          onClose={() => {
            setShowInspectionModal(false);
            setSelectedCycle(null);
          }}
          onComplete={handleInspectionComplete}
        />
      )}
    </div>
  );
}

// ============================================================================
// INSPECTION MODAL WITH CHECKLIST VIEW
// ============================================================================

function InspectionModal({ cycle, onClose, onComplete }) {
  const [result, setResult] = useState('');
  const [score, setScore] = useState(100);
  const [defects, setDefects] = useState([]);
  const [defectInput, setDefectInput] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [checklistLoading, setChecklistLoading] = useState(true);
  const [showChecklist, setShowChecklist] = useState(false);

  useEffect(() => {
    loadChecklist();
  }, [cycle.id]);

  async function loadChecklist() {
    try {
      setChecklistLoading(true);
      const data = await getCycleChecklist(cycle.id);
      setChecklist(data?.[0] || null);
    } catch (err) {
      console.error('Failed to load checklist:', err);
    } finally {
      setChecklistLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!result) {
      setError('Please select Pass or Fail');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await performQCInspection(cycle.id, {
        result,
        defects,
        notes,
        overallScore: score
      });
      onComplete();
    } catch (err) {
      console.error('Failed to submit inspection:', err);
      setError('Failed to submit inspection. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function addDefect() {
    if (defectInput.trim()) {
      setDefects([...defects, defectInput.trim()]);
      setDefectInput('');
    }
  }

  function removeDefect(index) {
    setDefects(defects.filter((_, i) => i !== index));
  }

  const checklistItems = checklist?.checklist_items || [];
  const completedCount = checklistItems.filter(i => i.is_completed).length;
  const totalCount = checklistItems.length;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h2>QC Inspection</h2>
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
                <div style={{ flex: 1 }}>
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

            {/* Technician Checklist Toggle */}
            <div style={{ marginBottom: 20 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowChecklist(!showChecklist)}
                style={{ width: '100%', justifyContent: 'space-between', display: 'flex' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ClipboardList size={16} />
                  Technician Checklist
                  {totalCount > 0 && (
                    <span style={{
                      background: completedCount === totalCount ? '#dcfce7' : '#fef3c7',
                      color: completedCount === totalCount ? '#16a34a' : '#92400e',
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600
                    }}>
                      {completedCount}/{totalCount}
                    </span>
                  )}
                </span>
                {showChecklist ? '▲' : '▼'}
              </button>

              {showChecklist && (
                <div style={{
                  marginTop: 12,
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  overflow: 'hidden'
                }}>
                  {checklistLoading ? (
                    <div style={{ padding: 24, textAlign: 'center' }}>
                      <Loader2 className="spinner" size={24} />
                    </div>
                  ) : totalCount === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>
                      No checklist found for this cycle.
                    </div>
                  ) : (
                    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                      {checklistItems
                        .sort((a, b) => a.item_order - b.item_order)
                        .map(item => (
                          <div
                            key={item.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '10px 16px',
                              borderBottom: '1px solid #f3f4f6',
                              background: item.is_completed ? '#f0fdf4' : '#fff'
                            }}
                          >
                            <div
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 4,
                                background: item.is_completed ? '#22c55e' : '#e5e7eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              {item.is_completed && <Check size={12} color="#fff" />}
                            </div>
                            <div style={{ flex: 1, fontSize: 14 }}>
                              <span style={{
                                color: item.is_completed ? '#16a34a' : '#1f2937',
                                textDecoration: item.is_completed ? 'line-through' : 'none'
                              }}>
                                {item.item_name}
                              </span>
                              {item.is_required && !item.is_completed && (
                                <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>
                              )}
                            </div>
                            {item.is_completed && (
                              <span style={{ fontSize: 12, color: '#9ca3af' }}>
                                {formatTime(item.completed_at)}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Result Selection */}
            <div className="form-group">
              <label>Inspection Result *</label>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  className={`btn ${result === 'passed' ? 'btn-success' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => setResult('passed')}
                >
                  <CheckCircle size={18} />
                  Pass
                </button>
                <button
                  type="button"
                  className={`btn ${result === 'failed' ? 'btn-danger' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => setResult('failed')}
                >
                  <XCircle size={18} />
                  Fail
                </button>
              </div>
            </div>

            {/* Overall Score */}
            <div className="form-group">
              <label>Overall Score: {score}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af' }}>
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Defects */}
            <div className="form-group">
              <label>Defects Found</label>
              <div className="input-with-actions">
                <input
                  type="text"
                  placeholder="Enter defect description..."
                  value={defectInput}
                  onChange={(e) => setDefectInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDefect())}
                />
                <button type="button" className="btn btn-secondary" onClick={addDefect}>
                  Add
                </button>
              </div>
              {defects.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {defects.map((defect, index) => (
                    <span
                      key={index}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        background: '#fee2e2',
                        color: '#dc2626',
                        borderRadius: 20,
                        fontSize: 13
                      }}
                    >
                      {defect}
                      <button
                        type="button"
                        onClick={() => removeDefect(index)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="form-group">
              <label>Inspector Notes</label>
              <textarea
                placeholder="Enter any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 size={18} className="spinner" /> : <ClipboardCheck size={18} />}
              Submit Inspection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

export default QCDashboard;
