import { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Loader2,
  X,
  Filter,
  Clock,
  User,
  Database
} from 'lucide-react';
import { getAuditLogs } from '@services/adminService';
import './AdminPages.css';

// ============================================================================
// AUDIT LOGS PAGE
// ============================================================================

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      setLoading(true);
      const data = await getAuditLogs(200);
      setLogs(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.table_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  // Get unique actions for filter
  const uniqueActions = [...new Set(logs.map(log => log.action))];

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2 className="spinner" size={40} />
        <p>Loading audit logs...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">
          <FileText size={28} />
          <div>
            <h1>Audit Logs</h1>
            <p>View system activity and changes</p>
          </div>
        </div>
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
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
          <option value="all">All Actions</option>
          {uniqueActions.map(action => (
            <option key={action} value={action}>
              {action.charAt(0).toUpperCase() + action.slice(1).replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Logs Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Table</th>
              <th>Record ID</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state">
                  No audit logs found
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => (
                <tr key={log.id}>
                  <td className="timestamp">
                    <Clock size={14} />
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td>
                    <div className="user-cell">
                      <User size={14} />
                      {log.profiles?.full_name || 'System'}
                      {log.profiles?.user_code && (
                        <small>({log.profiles.user_code})</small>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`action-badge action-${log.action}`}>
                      {log.action?.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div className="table-cell">
                      <Database size={14} />
                      {log.table_name}
                    </div>
                  </td>
                  <td className="record-id">{log.record_id || '-'}</td>
                  <td className="details-cell">
                    {log.new_values ? (
                      <details>
                        <summary>View Changes</summary>
                        <pre>{JSON.stringify(log.new_values, null, 2)}</pre>
                      </details>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AuditLogs;
