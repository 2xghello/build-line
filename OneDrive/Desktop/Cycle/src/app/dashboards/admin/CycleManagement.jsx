import { useState, useEffect } from 'react';
import {
  Bike,
  Plus,
  Search,
  UserPlus,
  Loader2,
  X,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck
} from 'lucide-react';
import {
  getCycles,
  createCycle,
  updateCycleStatus,
  assignCycle,
  getTechnicians,
  qcOverride,
  getQCLogs
} from '@services/adminService';
import { useAuth } from '@context/AuthContext';
import './AdminPages.css';

// ============================================================================
// STATUS CONFIGS
// ============================================================================

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'gray', icon: Clock },
  assigned: { label: 'Assigned', color: 'blue', icon: UserPlus },
  in_progress: { label: 'In Progress', color: 'yellow', icon: Loader2 },
  qc_pending: { label: 'Pending QC', color: 'orange', icon: AlertTriangle },
  qc_passed: { label: 'QC Passed', color: 'green', icon: CheckCircle },
  qc_failed: { label: 'QC Failed', color: 'red', icon: X },
  ready_for_dispatch: { label: 'Ready', color: 'purple', icon: Truck },
  dispatched: { label: 'Dispatched', color: 'teal', icon: Truck }
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'gray' },
  normal: { label: 'Normal', color: 'blue' },
  high: { label: 'High', color: 'orange' },
  urgent: { label: 'Urgent', color: 'red' }
};

// ============================================================================
// CYCLE MANAGEMENT PAGE
// ============================================================================

function CycleManagement() {
  const { profile } = useAuth();
  const [cycles, setCycles] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [assigningCycle, setAssigningCycle] = useState(null);
  const [overrideCycle, setOverrideCycle] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [cyclesData, techData] = await Promise.all([
        getCycles(),
        getTechnicians()
      ]);
      setCycles(cyclesData || []);
      setTechnicians(techData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Filter cycles
  const filteredCycles = cycles.filter(cycle => {
    const matchesSearch =
      cycle.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cycle.model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || cycle.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || cycle.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  async function handleCycleCreated() {
    setShowCreateModal(false);
    loadData();
  }

  async function handleAssign(cycleId, technicianId) {
    try {
      await assignCycle(cycleId, technicianId, profile?.id);
      setAssigningCycle(null);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2 className="spinner" size={40} />
        <p>Loading cycles...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">
          <Bike size={28} />
          <div>
            <h1>Cycle Management</h1>
            <p>Add, assign, and manage cycles</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={20} />
          Add Cycle
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={18} /></button>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by code or model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="all">All Priority</option>
          {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="stats-row">
        {Object.entries(STATUS_CONFIG).slice(0, 5).map(([key, config]) => {
          const count = cycles.filter(c => c.status === key).length;
          const Icon = config.icon;
          return (
            <div key={key} className={`stat-card stat-${config.color}`}>
              <Icon size={24} />
              <div>
                <span className="stat-value">{count}</span>
                <span className="stat-label">{config.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cycles Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Cycle Code</th>
              <th>Model</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Assigned To</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCycles.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-state">
                  No cycles found
                </td>
              </tr>
            ) : (
              filteredCycles.map(cycle => {
                const statusConfig = STATUS_CONFIG[cycle.status] || STATUS_CONFIG.pending;
                const priorityConfig = PRIORITY_CONFIG[cycle.priority] || PRIORITY_CONFIG.normal;
                const assignment = cycle.assignments?.[0];

                return (
                  <tr key={cycle.id}>
                    <td className="cycle-code">{cycle.serial_number}</td>
                    <td>{cycle.model}</td>
                    <td>
                      <span className={`status-badge status-${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td>
                      <span className={`priority-badge priority-${priorityConfig.color}`}>
                        {priorityConfig.label}
                      </span>
                    </td>
                    <td>
                      {assignment?.profiles ? (
                        <span className="assigned-user">
                          {assignment.profiles.full_name}
                          <small>({assignment.profiles.user_code})</small>
                        </span>
                      ) : (
                        <span className="not-assigned">Not assigned</span>
                      )}
                    </td>
                    <td>{new Date(cycle.created_at).toLocaleDateString()}</td>
                    <td className="actions-cell">
                      {cycle.status === 'pending' && (
                        <button
                          className="btn-icon btn-primary"
                          onClick={() => setAssigningCycle(cycle)}
                          title="Assign"
                        >
                          <UserPlus size={18} />
                        </button>
                      )}
                      {(cycle.status === 'qc_failed' || cycle.status === 'pending_qc') && (
                        <button
                          className="btn-icon btn-warning"
                          onClick={() => setOverrideCycle(cycle)}
                          title="QC Override"
                        >
                          <AlertTriangle size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateCycleModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCycleCreated}
        />
      )}

      {/* Assign Modal */}
      {assigningCycle && (
        <AssignCycleModal
          cycle={assigningCycle}
          technicians={technicians}
          onClose={() => setAssigningCycle(null)}
          onAssign={handleAssign}
        />
      )}

      {/* QC Override Modal */}
      {overrideCycle && (
        <QCOverrideModal
          cycle={overrideCycle}
          inspectorId={profile?.id}
          onClose={() => setOverrideCycle(null)}
          onSuccess={() => {
            setOverrideCycle(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// CREATE CYCLE MODAL
// ============================================================================

function CreateCycleModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    cycleCode: '',
    modelName: '',
    priority: 'normal'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!formData.cycleCode || !formData.modelName) {
      setError('All fields are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await createCycle({
        cycleCode: formData.cycleCode,
        modelName: formData.modelName,
        priority: formData.priority
      });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Add New Cycle</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label>Cycle Code</label>
              <input
                type="text"
                value={formData.cycleCode}
                onChange={(e) => setFormData(prev => ({ ...prev, cycleCode: e.target.value.toUpperCase() }))}
                placeholder="e.g., CYC001"
                required
              />
            </div>

            <div className="form-group">
              <label>Model Name</label>
              <input
                type="text"
                value={formData.modelName}
                onChange={(e) => setFormData(prev => ({ ...prev, modelName: e.target.value }))}
                placeholder="Enter model name"
                required
              />
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
              >
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 className="spinner" size={20} /> : <Plus size={20} />}
              Add Cycle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// ASSIGN CYCLE MODAL
// ============================================================================

function AssignCycleModal({ cycle, technicians, onClose, onAssign }) {
  const [selectedTech, setSelectedTech] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedTech) return;

    setLoading(true);
    await onAssign(cycle.id, selectedTech);
    setLoading(false);
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Assign Cycle</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="info-row">
              <label>Cycle:</label>
              <span>{cycle.serial_number} - {cycle.model}</span>
            </div>

            <div className="form-group">
              <label>Assign to Technician</label>
              <select
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
                required
              >
                <option value="">Select technician...</option>
                {technicians.map(tech => (
                  <option key={tech.id} value={tech.id}>
                    {tech.full_name} ({tech.user_code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !selectedTech}>
              {loading ? <Loader2 className="spinner" size={20} /> : <UserPlus size={20} />}
              Assign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// QC OVERRIDE MODAL
// ============================================================================

function QCOverrideModal({ cycle, inspectorId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    result: 'pass',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!formData.reason.trim()) {
      setError('Override reason is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await qcOverride(cycle.id, {
        result: formData.result,
        reason: formData.reason,
        inspectorId
      });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>QC Override</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="alert alert-warning">
              <AlertTriangle size={20} />
              <span>This action will be logged in the audit trail.</span>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="info-row">
              <label>Cycle:</label>
              <span>{cycle.serial_number} - {cycle.model}</span>
            </div>

            <div className="info-row">
              <label>Current Status:</label>
              <span className={`status-badge status-${STATUS_CONFIG[cycle.status]?.color}`}>
                {STATUS_CONFIG[cycle.status]?.label}
              </span>
            </div>

            <div className="form-group">
              <label>Override Result</label>
              <select
                value={formData.result}
                onChange={(e) => setFormData(prev => ({ ...prev, result: e.target.value }))}
              >
                <option value="passed">Pass (Approve)</option>
                <option value="failed">Fail (Reject)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Reason for Override</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Enter detailed reason for this override..."
                rows={4}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-warning" disabled={loading}>
              {loading ? <Loader2 className="spinner" size={20} /> : <AlertTriangle size={20} />}
              Confirm Override
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CycleManagement;
