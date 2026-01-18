import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  UserCheck,
  UserX,
  Loader2,
  X,
  Eye,
  EyeOff,
  Copy,
  Check
} from 'lucide-react';
import {
  getUsers,
  getRoles,
  createUser,
  updateUserStatus,
  updateUserRole
} from '@services/adminService';
import './AdminPages.css';

// ============================================================================
// USER MANAGEMENT PAGE
// ============================================================================

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [newUserCredentials, setNewUserCredentials] = useState(null);

  // Load users and roles
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [usersData, rolesData] = await Promise.all([
        getUsers(),
        getRoles()
      ]);
      setUsers(usersData || []);
      setRoles(rolesData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.user_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.roles?.name === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Handle user creation success
  function handleUserCreated(credentials) {
    setNewUserCredentials(credentials);
    setShowCreateModal(false);
    setShowCredentialsModal(true);
    loadData();
  }

  // Handle status toggle
  async function handleToggleStatus(user) {
    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      await updateUserStatus(user.id, newStatus);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2 className="spinner" size={40} />
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">
          <Users size={28} />
          <div>
            <h1>User Management</h1>
            <p>Create and manage system users</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={20} />
          Create User
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
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="all">All Roles</option>
          {roles.map(role => (
            <option key={role.id} value={role.name}>
              {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
            </option>
          ))}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id}>
                  <td className="user-code">{user.user_code}</td>
                  <td>{user.full_name}</td>
                  <td>
                    <span className={`role-badge role-${user.roles?.name}`}>
                      {user.roles?.name?.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${user.status}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="actions-cell">
                    <button
                      className={`btn-icon ${user.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => handleToggleStatus(user)}
                      title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                    >
                      {user.status === 'active' ? <UserX size={18} /> : <UserCheck size={18} />}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          roles={roles}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleUserCreated}
        />
      )}

      {/* Credentials Modal */}
      {showCredentialsModal && newUserCredentials && (
        <CredentialsModal
          credentials={newUserCredentials}
          onClose={() => {
            setShowCredentialsModal(false);
            setNewUserCredentials(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// CREATE USER MODAL
// ============================================================================

function CreateUserModal({ roles, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    fullName: '',
    roleName: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate random password
  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!formData.fullName || !formData.roleName || !formData.password) {
      setError('All fields are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await createUser({
        fullName: formData.fullName,
        roleName: formData.roleName,
        password: formData.password
      });
      onSuccess({
        userCode: result.user_code,
        password: formData.password,
        fullName: formData.fullName,
        role: formData.roleName
      });
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
          <h2>Create New User</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error">{error}</div>
            )}

            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <select
                value={formData.roleName}
                onChange={(e) => setFormData(prev => ({ ...prev, roleName: e.target.value }))}
                required
              >
                <option value="">Select role...</option>
                {roles.map(role => (
                  <option key={role.id} value={role.name}>
                    {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                  </option>
                ))}
              </select>
              <span className="form-hint">
                User ID will be auto-generated based on role
              </span>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-with-actions">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={generatePassword}
                >
                  Generate
                </button>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 className="spinner" size={20} /> : <Plus size={20} />}
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// CREDENTIALS MODAL
// ============================================================================

function CredentialsModal({ credentials, onClose }) {
  const [copiedField, setCopiedField] = useState(null);

  async function copyToClipboard(text, field) {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>User Created Successfully</h2>
        </div>

        <div className="modal-body">
          <div className="credentials-card">
            <p className="credentials-warning">
              Please save these credentials. The password cannot be retrieved later.
            </p>

            <div className="credential-row">
              <label>User ID</label>
              <div className="credential-value">
                <span>{credentials.userCode}</span>
                <button
                  className="btn-icon"
                  onClick={() => copyToClipboard(credentials.userCode, 'userId')}
                >
                  {copiedField === 'userId' ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            <div className="credential-row">
              <label>Password</label>
              <div className="credential-value">
                <span>{credentials.password}</span>
                <button
                  className="btn-icon"
                  onClick={() => copyToClipboard(credentials.password, 'password')}
                >
                  {copiedField === 'password' ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            <div className="credential-row">
              <label>Name</label>
              <span>{credentials.fullName}</span>
            </div>

            <div className="credential-row">
              <label>Role</label>
              <span className={`role-badge role-${credentials.role}`}>
                {credentials.role?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;
