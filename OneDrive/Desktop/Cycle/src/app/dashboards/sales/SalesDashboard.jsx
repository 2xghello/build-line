import { useState, useEffect } from 'react';
import {
  Truck,
  Package,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  Bike,
  User,
  X,
  Send,
  TrendingUp,
  History,
  FileText,
  Eye,
  XCircle,
  Check
} from 'lucide-react';
import {
  getReadyForDispatch,
  dispatchCycle,
  getQCReport,
  getDispatchHistory,
  getDispatchStats
} from '@services/adminService';
import { useAuth } from '@context/AuthContext';
import '../admin/AdminPages.css';

// ============================================================================
// SALES DASHBOARD
// ============================================================================

function SalesDashboard() {
  const { profile } = useAuth();
  const [readyCycles, setReadyCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showQCReportModal, setShowQCReportModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [dispatchedToday, setDispatchedToday] = useState(0);
  const [weeklyStats, setWeeklyStats] = useState({ total: 0, byDay: {} });
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [qcReport, setQCReport] = useState(null);
  const [qcReportLoading, setQCReportLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [cyclesData, statsData] = await Promise.all([
        getReadyForDispatch(),
        getDispatchStats(7)
      ]);
      setReadyCycles(cyclesData || []);
      setWeeklyStats(statsData || { total: 0, byDay: {} });
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
      const data = await getDispatchHistory(50);
      setHistory(data || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadQCReport(cycleId) {
    try {
      setQCReportLoading(true);
      const data = await getQCReport(cycleId);
      setQCReport(data);
    } catch (err) {
      console.error('Failed to load QC report:', err);
    } finally {
      setQCReportLoading(false);
    }
  }

  function handleDispatch(cycle) {
    setSelectedCycle(cycle);
    setShowDispatchModal(true);
  }

  function handleViewQCReport(cycle) {
    setSelectedCycle(cycle);
    loadQCReport(cycle.id);
    setShowQCReportModal(true);
  }

  function handleShowHistory() {
    if (history.length === 0) {
      loadHistory();
    }
    setShowHistoryModal(true);
  }

  async function handleDispatchComplete() {
    setShowDispatchModal(false);
    setSelectedCycle(null);
    setDispatchedToday(prev => prev + 1);
    await loadData();
  }

  // Calculate stats
  const stats = {
    ready: readyCycles.length,
    dispatchedToday: dispatchedToday,
    highPriority: readyCycles.filter(c => c.priority === 'high' || c.priority === 'urgent').length,
    weeklyTotal: weeklyStats.total
  };

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2 className="spinner" size={40} />
        <p>Loading dispatch queue...</p>
      </div>
    );
  }

  return (
    <div className="admin-page dashboard">
      {/* Welcome Header */}
      <div className="dashboard-welcome" style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)' }}>
        <div>
          <h1>Sales Dashboard</h1>
          <p>Manage cycle dispatch and deliveries.</p>
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
        <div className="stats-card stats-green">
          <div className="stats-icon">
            <Package size={28} />
          </div>
          <div className="stats-content">
            <span className="stats-value">{stats.ready}</span>
            <span className="stats-label">Ready for Dispatch</span>
            <span className="stats-sub">QC approved cycles</span>
          </div>
        </div>

        <div className="stats-card stats-blue">
          <div className="stats-icon">
            <Truck size={28} />
          </div>
          <div className="stats-content">
            <span className="stats-value">{stats.dispatchedToday}</span>
            <span className="stats-label">Dispatched Today</span>
            <span className="stats-sub">This session</span>
          </div>
        </div>

        <div className="stats-card stats-orange">
          <div className="stats-icon">
            <AlertCircle size={28} />
          </div>
          <div className="stats-content">
            <span className="stats-value">{stats.highPriority}</span>
            <span className="stats-label">High Priority</span>
            <span className="stats-sub">Urgent dispatch</span>
          </div>
        </div>

        <div className="stats-card stats-teal">
          <div className="stats-icon">
            <TrendingUp size={28} />
          </div>
          <div className="stats-content">
            <span className="stats-value">{stats.weeklyTotal}</span>
            <span className="stats-label">Weekly Total</span>
            <span className="stats-sub">Last 7 days</span>
          </div>
        </div>
      </div>

      {/* Ready for Dispatch */}
      <div className="dashboard-card full-width">
        <div className="card-header">
          <h2>Ready for Dispatch</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleShowHistory}
            >
              <History size={16} />
              History
            </button>
            <button className="btn btn-secondary btn-sm" onClick={loadData}>
              Refresh
            </button>
          </div>
        </div>

        {readyCycles.length === 0 ? (
          <div className="empty-state-card" style={{ margin: 24 }}>
            <CheckCircle size={48} />
            <h3>All Caught Up!</h3>
            <p>No cycles are pending dispatch at the moment.</p>
          </div>
        ) : (
          <div className="table-container" style={{ margin: '0 24px 24px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Serial Number</th>
                  <th>Model</th>
                  <th>Variant</th>
                  <th>Color</th>
                  <th>QC Inspector</th>
                  <th>QC Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {readyCycles.map(cycle => {
                  const qcLog = cycle.qc_logs?.[0];
                  const inspector = qcLog?.profiles;
                  return (
                    <tr key={cycle.id}>
                      <td>
                        <span className="cycle-code">{cycle.serial_number}</span>
                      </td>
                      <td>{cycle.model || '-'}</td>
                      <td>{cycle.variant || '-'}</td>
                      <td>
                        {cycle.color ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: 4,
                                background: cycle.color.toLowerCase(),
                                border: '1px solid #e5e7eb'
                              }}
                            />
                            {cycle.color}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        {inspector ? (
                          <div className="user-cell">
                            <User size={16} />
                            <span>{inspector.full_name}</span>
                          </div>
                        ) : (
                          <span className="not-assigned">-</span>
                        )}
                      </td>
                      <td>
                        <span className="timestamp">
                          <Clock size={14} />
                          {formatDate(qcLog?.inspected_at)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn btn-secondary btn-xs"
                            title="View QC Report"
                            onClick={() => handleViewQCReport(cycle)}
                          >
                            <FileText size={14} />
                          </button>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleDispatch(cycle)}
                          >
                            <Send size={16} />
                            Dispatch
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

      {/* Recent Dispatches Info */}
      {dispatchedToday > 0 && (
        <div
          style={{
            background: '#dcfce7',
            border: '1px solid #86efac',
            borderRadius: 12,
            padding: 20,
            marginTop: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}
        >
          <CheckCircle size={24} color="#16a34a" />
          <div>
            <div style={{ fontWeight: 600, color: '#166534' }}>
              {dispatchedToday} cycle{dispatchedToday > 1 ? 's' : ''} dispatched this session
            </div>
            <div style={{ fontSize: 14, color: '#15803d' }}>
              Keep up the great work!
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Modal */}
      {showDispatchModal && selectedCycle && (
        <DispatchModal
          cycle={selectedCycle}
          onClose={() => {
            setShowDispatchModal(false);
            setSelectedCycle(null);
          }}
          onComplete={handleDispatchComplete}
        />
      )}

      {/* QC Report Modal */}
      {showQCReportModal && selectedCycle && (
        <QCReportModal
          cycle={selectedCycle}
          report={qcReport}
          loading={qcReportLoading}
          onClose={() => {
            setShowQCReportModal(false);
            setSelectedCycle(null);
            setQCReport(null);
          }}
        />
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <HistoryModal
          history={history}
          loading={historyLoading}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// DISPATCH MODAL
// ============================================================================

function DispatchModal({ cycle, onClose, onComplete }) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);
      await dispatchCycle(cycle.id, notes || null);
      onComplete();
    } catch (err) {
      console.error('Failed to dispatch cycle:', err);
      setError('Failed to dispatch cycle. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2>Dispatch Cycle</h2>
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
                <Bike size={24} color="#22c55e" />
                <div>
                  <div style={{ fontWeight: 600 }}>{cycle.serial_number}</div>
                  <div style={{ fontSize: 14, color: '#6b7280' }}>
                    {cycle.model} {cycle.variant ? `- ${cycle.variant}` : ''}
                  </div>
                </div>
                <span className="status-badge status-green" style={{ marginLeft: 'auto' }}>
                  QC Passed
                </span>
              </div>
            </div>

            {/* Cycle Details */}
            <div className="form-group">
              <label>Cycle Details</label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                padding: 12,
                background: '#f3f4f6',
                borderRadius: 8
              }}>
                <div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>Model</div>
                  <div style={{ fontWeight: 500 }}>{cycle.model || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>Variant</div>
                  <div style={{ fontWeight: 500 }}>{cycle.variant || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>Color</div>
                  <div style={{ fontWeight: 500 }}>{cycle.color || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>Serial</div>
                  <div style={{ fontWeight: 500 }}>{cycle.serial_number}</div>
                </div>
              </div>
            </div>

            {/* Dispatch Notes */}
            <div className="form-group">
              <label>Dispatch Notes (Optional)</label>
              <textarea
                placeholder="Enter any dispatch notes, delivery instructions, or customer information..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Confirmation Notice */}
            <div style={{
              background: '#fef3c7',
              border: '1px solid #fcd34d',
              padding: 12,
              borderRadius: 8,
              fontSize: 14,
              color: '#92400e'
            }}>
              <strong>Confirm Dispatch:</strong> This action will mark the cycle as dispatched and cannot be undone.
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? <Loader2 size={18} className="spinner" /> : <Truck size={18} />}
              Confirm Dispatch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// QC REPORT MODAL
// ============================================================================

function QCReportModal({ cycle, report, loading, onClose }) {
  const qcLogs = report?.qcLogs || [];
  const latestLog = qcLogs[0];

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>QC Report</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Loader2 className="spinner" size={32} />
            </div>
          ) : !latestLog ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
              <FileText size={48} style={{ marginBottom: 12 }} />
              <p>No QC report available.</p>
            </div>
          ) : (
            <>
              {/* Cycle Info */}
              <div style={{ background: '#f9fafb', padding: 16, borderRadius: 8, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Bike size={24} color="#3b82f6" />
                  <div>
                    <div style={{ fontWeight: 600 }}>{cycle.serial_number}</div>
                    <div style={{ fontSize: 14, color: '#6b7280' }}>
                      {cycle.model} {cycle.variant ? `- ${cycle.variant}` : ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* QC Result */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                padding: 24,
                background: latestLog.result === 'passed' ? '#f0fdf4' : '#fef2f2',
                borderRadius: 12,
                marginBottom: 20
              }}>
                {latestLog.result === 'passed' ? (
                  <CheckCircle size={48} color="#16a34a" />
                ) : (
                  <XCircle size={48} color="#ef4444" />
                )}
                <div style={{ textAlign: 'left' }}>
                  <div style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: latestLog.result === 'passed' ? '#16a34a' : '#ef4444'
                  }}>
                    QC {latestLog.result === 'passed' ? 'Passed' : 'Failed'}
                  </div>
                  {latestLog.overall_score && (
                    <div style={{ fontSize: 16, color: '#6b7280' }}>
                      Score: {latestLog.overall_score}%
                    </div>
                  )}
                </div>
              </div>

              {/* Inspection Details */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ marginBottom: 12 }}>Inspection Details</h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  padding: 12,
                  background: '#f3f4f6',
                  borderRadius: 8
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>Inspector</div>
                    <div style={{ fontWeight: 500 }}>
                      {latestLog.profiles?.full_name || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>Date</div>
                    <div style={{ fontWeight: 500 }}>
                      {formatDate(latestLog.inspected_at)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>Type</div>
                    <div style={{ fontWeight: 500 }}>
                      {latestLog.is_override ? 'Admin Override' : 'Standard Inspection'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>Score</div>
                    <div style={{
                      fontWeight: 600,
                      color: latestLog.overall_score >= 80 ? '#16a34a' :
                             latestLog.overall_score >= 50 ? '#f59e0b' : '#ef4444'
                    }}>
                      {latestLog.overall_score ? `${latestLog.overall_score}%` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Defects */}
              {latestLog.defects_found?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ marginBottom: 12 }}>Defects Found</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {latestLog.defects_found.map((defect, index) => (
                      <span
                        key={index}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 12px',
                          background: '#fee2e2',
                          color: '#dc2626',
                          borderRadius: 20,
                          fontSize: 13
                        }}
                      >
                        {defect}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {latestLog.notes && (
                <div>
                  <h4 style={{ marginBottom: 12 }}>Inspector Notes</h4>
                  <div style={{
                    padding: 12,
                    background: '#f9fafb',
                    borderRadius: 8,
                    fontSize: 14,
                    color: '#4b5563'
                  }}>
                    {latestLog.notes}
                  </div>
                </div>
              )}
            </>
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
// HISTORY MODAL
// ============================================================================

function HistoryModal({ history, loading, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 800 }}>
        <div className="modal-header">
          <h2>Dispatch History</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Loader2 className="spinner" size={32} />
            </div>
          ) : history.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
              <History size={48} style={{ marginBottom: 12 }} />
              <p>No dispatch history available.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Serial Number</th>
                    <th>Model</th>
                    <th>Variant</th>
                    <th>Color</th>
                    <th>QC Score</th>
                    <th>Dispatched</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(cycle => {
                    const qcLog = cycle.qc_logs?.[0];
                    return (
                      <tr key={cycle.id}>
                        <td>
                          <span className="cycle-code">{cycle.serial_number}</span>
                        </td>
                        <td>{cycle.model || '-'}</td>
                        <td>{cycle.variant || '-'}</td>
                        <td>
                          {cycle.color ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span
                                style={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: 3,
                                  background: cycle.color.toLowerCase(),
                                  border: '1px solid #e5e7eb'
                                }}
                              />
                              {cycle.color}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          <span style={{
                            fontWeight: 600,
                            color: qcLog?.overall_score >= 80 ? '#16a34a' :
                                   qcLog?.overall_score >= 50 ? '#f59e0b' : '#ef4444'
                          }}>
                            {qcLog?.overall_score ? `${qcLog.overall_score}%` : '-'}
                          </span>
                        </td>
                        <td>
                          <span className="timestamp">
                            <Clock size={14} />
                            {formatDate(cycle.updated_at)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default SalesDashboard;
